import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createDeferredLegacyClient } from '../lib/dataset-legacy-client.mjs';

test('registration defers creation and concurrent callers reuse the same synchronous client', async () => {
  const slot = createDeferredLegacyClient(), client = {};
  let calls = 0;
  const factory = () => { calls++; return client; };
  slot.registerFactory(factory);
  slot.registerFactory(factory);
  assert.equal(calls, 0);
  const results = await Promise.all(Array.from({ length: 8 }, async () => slot.read()));
  assert.ok(results.every(value => value === client));
  assert.equal(calls, 1);
  assert.throws(() => slot.register({}), /already registered/);
  assert.throws(() => slot.registerFactory(() => ({})), /already registered/);
});

test('direct registration remains available without allowing replacement', () => {
  const slot = createDeferredLegacyClient(), client = {};
  assert.throws(() => slot.read(), /unavailable/);
  slot.register(client);
  slot.register(client);
  assert.equal(slot.read(), client);
  assert.throws(() => slot.register({}), /already registered/);
  assert.throws(() => slot.registerFactory(() => client), /already registered/);
});

test('source failures are redacted, cached, and cannot be replaced', () => {
  const slot = createDeferredLegacyClient();
  let calls = 0;
  slot.registerFactory(() => { calls++; throw Error('synthetic-private-key-and-endpoint'); });
  for (let i = 0; i < 2; i++) assert.throws(() => slot.read(), error => {
    assert.equal(error.message, 'Legacy source client unavailable');
    assert.equal(error.cause, undefined);
    assert.doesNotMatch(error.stack, /synthetic-private/);
    return true;
  });
  assert.equal(calls, 1);
  assert.throws(() => slot.register({}), /already registered/);
  assert.throws(() => slot.registerFactory(() => ({})), /already registered/);
});

for (const value of [null, undefined, 0, 'client', Promise.resolve({}), { then() {} }]) {
  test(`invalid or asynchronous source result is rejected: ${String(value)}`, () => {
    const slot = createDeferredLegacyClient();
    let calls = 0;
    slot.registerFactory(() => { calls++; return value; });
    assert.throws(() => slot.read(), /unavailable/);
    assert.throws(() => slot.read(), /unavailable/);
    assert.equal(calls, 1);
  });
}

test('reentrant initialization fails even if the factory catches the inner error', () => {
  const slot = createDeferredLegacyClient();
  slot.registerFactory(() => { assert.throws(() => slot.read(), /unavailable/); return {}; });
  assert.throws(() => slot.read(), /unavailable/);
  assert.throws(() => slot.read(), /unavailable/);
});

for (const kind of ['rejected-promise', 'async-factory', 'rejecting-thenable', 'reentrant-rejected-promise']) {
  test(`${kind} stays synchronous and cached without unhandled rejection or private output`, () => {
    const script = `
      import assert from 'node:assert/strict';
      import { createDeferredLegacyClient } from ${JSON.stringify(new URL('../lib/dataset-legacy-client.mjs', import.meta.url).href)};
      const slot = createDeferredLegacyClient();
      const privateMarker = 'SYNTHETIC_PRIVATE_FACTORY_FAILURE';
      let calls = 0, unhandled = 0;
      process.on('unhandledRejection', () => { unhandled++; });
      const kind = ${JSON.stringify(kind)};
      const result = () => {
        calls++;
        if (kind === 'reentrant-rejected-promise') assert.throws(() => slot.read(), /unavailable/);
        if (kind === 'rejecting-thenable') return { then(_resolve, reject) { reject(Error(privateMarker)); } };
        return Promise.reject(Error(privateMarker));
      };
      slot.registerFactory(kind === 'async-factory' ? async () => result() : result);
      const readFailure = () => assert.throws(() => slot.read(), error => {
        assert.equal(error.message, 'Legacy source client unavailable');
        assert.equal(error.cause, undefined);
        assert.ok(!error.stack.includes(privateMarker));
        return true;
      });
      readFailure();
      readFailure();
      await new Promise(setImmediate);
      await new Promise(setImmediate);
      readFailure();
      assert.equal(calls, 1);
      assert.equal(unhandled, 0);
      assert.throws(() => slot.registerFactory(() => ({})), /already registered/);
      console.log(JSON.stringify({ calls, unhandled, cached: true }));
    `;
    const child = spawnSync(process.execPath, ['--unhandled-rejections=strict', '--input-type=module', '-e', script], {
      encoding: 'utf8', env: {}, timeout: 10000,
    });
    assert.ifError(child.error);
    assert.equal(child.signal, null);
    // Check redaction before reporting child diagnostics in a failed assertion.
    assert.equal((child.stdout + child.stderr).includes('SYNTHETIC_PRIVATE_FACTORY_FAILURE'), false);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stderr, '');
    assert.deepEqual(JSON.parse(child.stdout), { calls: 1, unhandled: 0, cached: true });
  });
}
