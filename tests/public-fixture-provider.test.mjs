import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalJson, sha256, parsePublicFixture, createPublicFixtureProvider } from '../lib/public-fixture/read-provider.mjs';
const text = readFileSync(new URL('./fixtures/public-provider/invented.json', import.meta.url), 'utf8');
const pin = readFileSync(new URL('./fixtures/public-provider/invented.sha256', import.meta.url), 'utf8').trim();
const provider = createPublicFixtureProvider(text, pin);
function changed(edit, rehash = true) {
  const manifest = JSON.parse(text); edit(manifest);
  if (rehash) for (const document of manifest.documents) document.sha256 = sha256(canonicalJson(document.body));
  const value = JSON.stringify(manifest);
  return () => parsePublicFixture(value, sha256(value));
}
test('invented reads have exact bodies and explicitly no parity claim', () => {
  assert.equal(provider.parity, 'none');
  assert.deepEqual(provider.read('/api/headcount').body, {headcount: 12});
  assert.deepEqual(provider.read('/api/headcount-trend').body.map(row => row.headcount), [10, 12]);
  assert.equal(provider.read('/api/headcount').headers['cache-control'], 'no-store');
});
test('rejects normalization aliases and all query scopes rather than falling back', () => {
  for (const target of ['/api/headcount?', '/api/headcount?country=all', '/api/headcount?country=A&country=B',
    '/api/headcount?unknown=x', '/api/headcount#x', '/api/%68eadcount', '/api/x/../headcount',
    'https://example.com/api/headcount', '//api/headcount', '/api/headcount/', '/api/Headcount',
    '/api/headcount\n', null, {}, '']) {
    assert.equal(provider.read(target).status, 400, String(target));
  }
  assert.equal(provider.read('/api/dashboard').status, 404);
  for (const method of ['POST', 'HEAD', 'get', 'DELETE']) assert.equal(provider.read('/api/headcount', {method}).status, 405);
});
test('pin and per-document hashes independently reject tampering', () => {
  assert.throws(() => parsePublicFixture(text.replace('12', '13'), pin), /manifest digest/);
  assert.throws(changed(m => {m.documents[0].body.headcount = 13;}, false), /content digest/);
  assert.throws(() => parsePublicFixture(text, ''), /manifest digest/);
  assert.equal(canonicalJson({b: 2, a: 1}), canonicalJson({a: 1, b: 2}));
});
test('closed schemas reject private metadata, unreviewed fields and bad scalar values even with valid hashes', () => {
  for (const edit of [
    m => {m.private = 'anything';},
    m => {m.dataClass = 'constructed-synthetic';},
    m => {m.parity = 'production';},
    m => {m.schemaVersion = 2;},
    m => {m.documents[0].body.data_meta = {};},
    m => {m.documents[0].body.headcount = '12';},
    m => {m.documents[0].body.headcount = -1;},
    m => {m.documents[0].body.headcount = 1.5;},
    m => {m.documents[0].body.headcount = Number.MAX_SAFE_INTEGER + 1;},
    m => {m.documents[0].body = null;},
    m => {m.documents[0].body = JSON.parse('{"headcount":12,"__proto__":{}}');},
    m => {m.documents[1].body[0].snapshot_date = '2025-02-30';},
    m => {m.documents[1].body[0].snapshot_date = '.private-9037';},
    m => {m.documents[1].body[0].fte = 11;},
    m => {m.documents[1].body.reverse();},
  ]) assert.throws(changed(edit), /Invalid public fixture/);
});
test('coverage, duplicate targets, oversized inputs and malformed JSON fail closed', () => {
  assert.throws(changed(m => {m.documents.pop();}), /coverage/);
  assert.throws(changed(m => {m.documents[1] = m.documents[0];}), /duplicate/);
  assert.throws(changed(m => {m.documents[0].target = '/api/headcount?country=all';}), /allowlist/);
  assert.throws(changed(m => {m.documents[1].body = Array(121).fill(m.documents[1].body[0]);}), /trend rows/);
  const huge = ' '.repeat(1024 * 1024 + 1);
  assert.throws(() => parsePublicFixture(huge, sha256(huge)), /size/);
  assert.throws(() => parsePublicFixture('{', sha256('{')), /JSON/);
});
test('known empty trend stays distinct from unsupported routes; returned data cannot mutate later reads', () => {
  const m = JSON.parse(text); m.documents[1].body = []; m.documents[1].sha256 = sha256('[]');
  const empty = JSON.stringify(m); const p = createPublicFixtureProvider(empty, sha256(empty));
  assert.deepEqual(p.read('/api/headcount-trend').body, []);
  assert.equal(p.read('/api/dashboard').status, 404);
  assert.throws(() => { provider.read('/api/headcount').body.headcount = 999; }, TypeError);
  assert.throws(() => { provider.read('/api/headcount-trend').body.push({}); }, TypeError);
  assert.equal(provider.read('/api/headcount').body.headcount, 12);
});
