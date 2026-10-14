/** Actual runtime/server module bodies with synthetic credentials and SDK only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { DatasetRouter } from '../lib/dataset-router.mjs';
import { createDatasetRequestBoundary } from '../lib/dataset-request-boundary.mjs';
import { createDeferredLegacyClient } from '../lib/dataset-legacy-client.mjs';
import { DATASET_HEADER, LEGACY_DATASET_TOKEN } from '../lib/dataset-identity.mjs';

function evaluate(file, imports, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../lib/${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, ...globals, require(name) {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

function fixture({ configured = true, creationFailure = false } = {}) {
  const runtime = evaluate('dataset-runtime.ts', {
    './dataset-router.mjs': { DatasetRouter },
    './dataset-request-boundary.mjs': { createDatasetRequestBoundary },
    './dataset-legacy-client.mjs': { createDeferredLegacyClient },
  });
  const credentialReads = [], creations = [], calls = [];
  const client = {
    auth: { synthetic: true },
    from(table) { assert.equal(this, client); calls.push(['from', table]); return { synthetic: true }; },
    rpc(name) { assert.equal(this, client); calls.push(['rpc', name]); return { synthetic: true }; },
  };
  const { supabaseServer } = evaluate('supabase-server.ts', {
    './dataset-runtime': runtime,
    '@supabase/supabase-js': { createClient(...args) {
      creations.push(args);
      if (creationFailure) throw Error('synthetic-private-key-and-endpoint');
      return client;
    } },
  }, { process: { env: new Proxy({}, { get(_target, key) {
    credentialReads.push(key);
    if (!configured) return undefined;
    return { SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_SECRET_KEY: 'synthetic-secret' }[key];
  } }) } });
  return { ...runtime, supabaseServer, credentialReads, creations, calls, client };
}

function request(token = LEGACY_DATASET_TOKEN) {
  return new Request('http://synthetic.invalid/api/overview', { headers: { [DATASET_HEADER]: token } });
}

test('import, bootstrap, stale rejection, and missing request context never read credentials or construct a client', async () => {
  const f = fixture({ configured: false });
  assert.equal(await f.datasetRouter.bootstrapToken(), LEGACY_DATASET_TOKEN);
  assert.throws(() => f.supabaseServer.from('synthetic'), /context required/);
  const response = await f.withDatasetRequest(request('legacy-v1:1'), async () => {
    assert.fail('stale request must not reach its handler');
  });
  assert.equal(response.status, 409);
  assert.equal(response.headers.get(DATASET_HEADER), LEGACY_DATASET_TOKEN);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(f.credentialReads, []);
  assert.deepEqual(f.creations, []);
});

test('valid and nested legacy requests create one client with unchanged auth configuration and method binding', async () => {
  const f = fixture();
  const responses = await Promise.all(Array.from({ length: 4 }, () => f.withDatasetRequest(request(), async () => {
    const from = f.supabaseServer.from;
    assert.deepEqual(from('synthetic_table'), { synthetic: true });
    assert.equal(f.supabaseServer.auth, f.client.auth);
    return f.withDatasetRequest(undefined, async () => {
      const rpc = f.supabaseServer.rpc;
      rpc('synthetic_rpc');
      return Response.json({ headcount: 10000, synthetic: true });
    });
  })));
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get(DATASET_HEADER), LEGACY_DATASET_TOKEN);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).headcount, 10000);
  }
  assert.deepEqual(f.credentialReads, ['SUPABASE_URL', 'SUPABASE_SECRET_KEY']);
  assert.deepEqual(JSON.parse(JSON.stringify(f.creations)), [['https://synthetic.invalid', 'synthetic-secret', {
    auth: { persistSession: false, autoRefreshToken: false },
  }]]);
  assert.equal(f.calls.length, 8);
  assert.throws(() => f.supabaseServer.rpc('synthetic_rpc'), /context required/);
  assert.equal(await f.datasetRouter.bootstrapToken(), LEGACY_DATASET_TOKEN);
});

for (const options of [{ configured: false }, { creationFailure: true }]) {
  test(`legacy initialization failures stay redacted without implicit retry: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    for (let i = 0; i < 2; i++) await assert.rejects(f.withDatasetRequest(request(), async () => {
      f.supabaseServer.from('synthetic');
      return Response.json({});
    }), error => {
      assert.equal(error.message, 'Legacy source client unavailable');
      assert.equal(error.cause, undefined);
      assert.doesNotMatch(error.stack, /synthetic-private/);
      return true;
    });
    assert.equal(f.credentialReads.length, 2);
    assert.equal(f.creations.length, options.configured === false ? 0 : 1);
    assert.equal(f.calls.length, 0);
  });
}

test('the production runtime still has only legacy generation zero and rejects selector changes', async () => {
  const f = fixture();
  for (const target of ['legacy-v1', 'synthetic-candidate']) await assert.rejects(f.datasetRouter.select({
    expected: { datasetId: 'legacy-v1', generation: 0 }, target,
    approval: { reference: 'synthetic', implementationCommit: 'synthetic', configurationFingerprint: 'synthetic',
      bundleDigest: 'uncertified-live-v1', preservationCertificate: 'synthetic' },
  }), /Reviewed complete binding/);
  assert.equal(await f.datasetRouter.bootstrapToken(), LEGACY_DATASET_TOKEN);
  assert.equal(f.creations.length, 0);
  assert.deepEqual(f.credentialReads, []);
});
