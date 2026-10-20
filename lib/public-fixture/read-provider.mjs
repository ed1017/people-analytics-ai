import { createHash } from 'node:crypto';

// Deliberately separate from the 9,037 release: these are invented scaffold inputs.
export const FIXTURE_CONTRACT = 'invented-public-read-fixture-v1';
const ROUTES = ['/api/headcount', '/api/headcount-trend'];
const MAX_BYTES = 1024 * 1024;
const fail = (message) => { throw new Error(`Invalid public fixture: ${message}`); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, expected) {
  if (!isObject(value) || Object.keys(value).sort().join('|') !== [...expected].sort().join('|')) fail('object keys');
}
function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail('count');
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('date');
}
export function validateReadBody(route, body) {
  if (!ROUTES.includes(route)) fail('route allowlist');
  if (route === '/api/headcount') {
    keys(body, ['headcount']); count(body.headcount); return;
  }
  if (!Array.isArray(body) || body.length > 120) fail('trend rows');
  let previous = '';
  for (const row of body) {
    keys(row, ['snapshot_date', 'headcount', 'fte']);
    date(row.snapshot_date); count(row.headcount);
    if (typeof row.fte !== 'number' || !Number.isFinite(row.fte) || row.fte < 0 || row.fte > row.headcount) fail('fte');
    if (row.snapshot_date <= previous) fail('trend order');
    previous = row.snapshot_date;
  }
}
export const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
// Only call for JSON-compatible values. Validation precedes use on input bodies.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}

/** Parse a bounded public-only manifest. expectedDigest is a separately trusted SHA-256
 * of its exact UTF-8 text, not a digest read from inside the manifest itself.
 * Integrity and schema checks do not constitute publication approval.
 */
export function parsePublicFixture(text, expectedDigest) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_BYTES) fail('size');
  if (typeof expectedDigest !== 'string' || !/^[a-f0-9]{64}$/.test(expectedDigest) || sha256(text) !== expectedDigest) fail('manifest digest');
  let manifest;
  try { manifest = JSON.parse(text); } catch { fail('JSON'); }
  keys(manifest, ['schemaVersion', 'contract', 'dataClass', 'parity', 'documents']);
  if (manifest.schemaVersion !== 1 || manifest.contract !== FIXTURE_CONTRACT ||
      manifest.dataClass !== 'invented-test-only' || manifest.parity !== 'none') fail('identity');
  if (!Array.isArray(manifest.documents) || manifest.documents.length !== ROUTES.length) fail('document coverage');
  const seen = new Set();
  for (const document of manifest.documents) {
    keys(document, ['target', 'sha256', 'body']);
    if (!ROUTES.includes(document.target) || seen.has(document.target)) fail('route allowlist or duplicate');
    seen.add(document.target);
    validateReadBody(document.target, document.body);
    if (typeof document.sha256 !== 'string' || document.sha256 !== sha256(canonicalJson(document.body))) fail('content digest');
  }
  return freeze(manifest);
}

/** Pure in-memory read provider; performs no filesystem, network, private binding,
 * environment, calculator, or production-route access. Canonical targets are exact
 * absolute paths, with no query parameters supported in this schema version.
 */
export function createPublicFixtureProvider(text, expectedDigest) {
  const manifest = parsePublicFixture(text, expectedDigest);
  const documents = new Map(manifest.documents.map(document => [document.target, document.body]));
  return Object.freeze({
    contract: FIXTURE_CONTRACT,
    parity: 'none',
    read(target, { method = 'GET' } = {}) {
      const reply = (status, body) => freeze({ status, headers: {
        'content-type': 'application/json', 'cache-control': 'no-store',
        'x-fixture-contract': FIXTURE_CONTRACT,
      }, body });
      if (method !== 'GET') return reply(405, { error: 'method_not_supported' });
      // Reject normalization aliases, encodings, fragments and even an empty query.
      if (typeof target !== 'string' || !/^\/api\/[a-z]+(?:-[a-z]+)*$/.test(target)) return reply(400, { error: 'noncanonical_target' });
      if (!documents.has(target)) return reply(404, { error: 'unsupported_fixture_target' });
      return reply(200, documents.get(target));
    },
  });
}
