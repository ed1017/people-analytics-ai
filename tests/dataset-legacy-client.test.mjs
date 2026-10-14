import test from 'node:test';
import assert from 'node:assert/strict';
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
