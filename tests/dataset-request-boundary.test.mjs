import test from 'node:test';
import assert from 'node:assert/strict';
import { DatasetRouter } from '../lib/dataset-router.mjs';
import { createDatasetRequestBoundary } from '../lib/dataset-request-boundary.mjs';
import { DatasetSession } from '../lib/dataset-client.mjs';
import { DATASET_HEADER, DATASET_ROUTES } from '../lib/dataset-identity.mjs';

// Small invented fixtures only. No application data, database or model transport.
const before = { datasetId: 'original-fixture', digest: 'a'.repeat(64), generation: 0 };
const token = value => `${value.datasetId}:${value.generation}`;
const request = (path, selected = before) => new Request(`https://fixture.invalid${path}`, {
  headers: { [DATASET_HEADER]: token(selected) },
});
function fixture() {
  let selected = { ...before }, available = true, failGuard = false;
  const calls = { original: 0, candidate: 0, guard: 0 };
  const originalClient = Object.freeze({ fixture: 'original' });
  const provider = (digest, client) => ({ digest, client, approved: true, complete: true, certificate: `test:${digest}` });
  const providers = {
    'original-fixture': provider(before.digest, originalClient),
    'candidate-fixture': provider('b'.repeat(64), Object.freeze({ fixture: 'candidate' })),
    'unregistered-fixture': provider('c'.repeat(64), Object.freeze({ fixture: 'unregistered' })),
  };
  const selector = { read: async () => ({ ...selected }), compareAndSwap: async (expected, next) => {
    if (JSON.stringify(expected) !== JSON.stringify(selected)) return false;
    selected = { ...next }; return true;
  } };
  const router = new DatasetRouter(providers, selector);
  const boundary = createDatasetRequestBoundary({ router,
    retained: { 'original-fixture': { assertAvailable: async () => {
      calls.guard++; if (failGuard) throw Error('Private source failure'); return available;
    } } },
    candidate: { datasetId: 'candidate-fixture', handle: async req => {
      calls.candidate++; assert.equal(router.client().fixture, 'candidate');
      const path = new URL(req.url).pathname;
      if (path === '/unsupported') return Response.json({ error: 'Unavailable' }, { status: 503 });
      if (path === '/failed') throw Error('Candidate read failed');
      return Response.json({ headcount: 5 });
    } },
  });
  const original = async () => { calls.original++; assert.equal(router.client(), originalClient); return Response.json({ headcount: 7 }); };
  const select = async target => router.select({ expected: await selector.read(), target,
    approval: { reference: 'local-test', implementationCommit: 'local-test', configurationFingerprint: 'local-test',
      bundleDigest: providers[target].digest, preservationCertificate: providers[target].certificate } });
  return { boundary, router, selector, original, select, calls,
    unavailable: () => { available = false; }, brokenGuard: () => { failGuard = true; } };
}

test('all retained entrypoints preserve the original callback and client before and after rollback', async () => {
  const f = fixture();
  for (const path of DATASET_ROUTES) {
    const response = await f.boundary(request(path), f.original);
    assert.equal((await response.json()).headcount, 7);
    assert.equal(response.headers.get(DATASET_HEADER), token(before));
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(f.calls.original, DATASET_ROUTES.length);
  await f.select('candidate-fixture');
  const rolled = await f.select('original-fixture');
  assert.equal(rolled.generation, 2);
  for (const path of DATASET_ROUTES) {
    const response = await f.boundary(request(path, rolled), f.original);
    assert.equal(response.headers.get(DATASET_HEADER), token(rolled));
    assert.equal((await response.json()).headcount, 7);
  }
  assert.equal(f.calls.original, 2 * DATASET_ROUTES.length);
  assert.equal(f.calls.candidate, 0);
});

test('candidate dispatch never invokes an original callback, including unavailable and failed reads', async () => {
  const f = fixture(), selected = await f.select('candidate-fixture');
  for (const path of DATASET_ROUTES) {
    const response = await f.boundary(request(path, selected), f.original);
    assert.equal((await response.json()).headcount, 5);
    assert.equal(response.headers.get(DATASET_HEADER), token(selected));
  }
  assert.equal((await f.boundary(request('/unsupported', selected), f.original)).status, 503);
  await assert.rejects(f.boundary(request('/failed', selected), f.original), /Candidate read failed/);
  assert.equal(f.calls.original, 0); assert.equal(f.calls.guard, 0);
});

test('unregistered serving bindings and failed original-source guards return 503 without a read', async () => {
  const f = fixture(); f.unavailable();
  assert.equal((await f.boundary(request('/api/workforce'), f.original)).status, 503);
  f.brokenGuard();
  const failed = await f.boundary(request('/api/workforce'), f.original);
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /Private source failure/);
  const selected = await f.select('unregistered-fixture');
  assert.equal((await f.boundary(request('/api/workforce', selected), f.original)).status, 503);
  assert.equal(f.calls.original, 0); assert.equal(f.calls.candidate, 0);
});

test('stale and headerless requests cannot execute a handler after either selection', async () => {
  const f = fixture(), candidate = await f.select('candidate-fixture'), rolled = await f.select('original-fixture');
  for (const old of [before, candidate]) {
    const response = await f.boundary(request('/api/workforce', old), f.original);
    assert.equal(response.status, 409); assert.equal(response.headers.get(DATASET_HEADER), token(rolled));
  }
  assert.equal((await f.boundary(new Request('https://fixture.invalid/api/workforce'), f.original)).status, 409);
  assert.deepEqual(f.calls, { original: 0, candidate: 0, guard: 0 });
});

test('nested in-flight original work remains bound while subsequent work sees the candidate', async () => {
  const f = fixture(); let release, entered;
  const ready = new Promise(resolve => { entered = resolve; }), gate = new Promise(resolve => { release = resolve; });
  const pending = f.boundary(request('/api/workforce'), async () => {
    entered(); await gate;
    assert.equal(f.router.assertAIContext(), token(before));
    return f.boundary(undefined, f.original);
  });
  await ready; const selected = await f.select('candidate-fixture'); release();
  const old = await pending; assert.equal(old.headers.get(DATASET_HEADER), token(before));
  assert.equal((await old.json()).headcount, 7);
  assert.equal((await (await f.boundary(request('/api/workforce', selected), f.original)).json()).headcount, 5);
});

test('candidate request omission fails closed even inside an inherited request context', async () => {
  const f = fixture(), selected = await f.select('candidate-fixture');
  await f.router.request(request('/api/workforce', selected), async () => {
    assert.equal((await f.boundary(undefined, f.original)).status, 503); return Response.json({});
  });
  assert.equal(f.calls.original, 0); assert.equal(f.calls.candidate, 0);
});

test('client bootstrap advances through rollback and rejects delayed bodies from the previous generation', async () => {
  const f = fixture(), session = new DatasetSession(token(before), { requireBootstrap: true });
  session.bootstrap(token(before));
  const transport = (_path, init) => f.boundary(new Request('https://fixture.invalid/api/workforce', init), f.original);
  const candidate = await f.select('candidate-fixture');
  await assert.rejects(session.fetch('/api/workforce', {}, transport), /Dataset changed/);
  session.bootstrap(token(candidate));
  let release;
  const body = new ReadableStream({ start(controller) { release = () => {
    controller.enqueue(new TextEncoder().encode('{"headcount":5}')); controller.close();
  }; } });
  const old = await session.fetch('/api/workforce', {}, async () => new Response(body, { headers: { [DATASET_HEADER]: token(candidate) } }));
  const pending = old.json(), rolled = await f.select('original-fixture');
  await assert.rejects(session.fetch('/api/workforce', {}, transport), /Dataset changed/);
  session.bootstrap(token(rolled)); session.bootstrap(token(candidate)); release();
  await assert.rejects(pending, /Superseded dataset response body/);
  assert.equal(session.current(), token(rolled));
  assert.equal((await (await session.fetch('/api/workforce', {}, transport)).json()).headcount, 7);
});

test('boundary construction rejects overlapping registries and missing source guards', () => {
  const f = fixture();
  assert.throws(() => createDatasetRequestBoundary({ router: f.router, retained: { 'original-fixture': {} } }), /Explicit serving bindings/);
  assert.throws(() => createDatasetRequestBoundary({ router: f.router, retained: { 'original-fixture': { assertAvailable: async () => true } }, candidate: { datasetId: 'original-fixture', handle: async () => Response.json({}) } }), /Explicit serving bindings/);
});
