import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { importCompanyFixture } from '../lib/public-fixture/company-import.mjs';
import { createPublicFixtureProvider, sha256 } from '../lib/public-fixture/read-provider.mjs';

const configUrl = new URL('./fixtures/company-import/lantern-config.json', import.meta.url);
const rowsUrl = new URL('./fixtures/company-import/lantern-rows.json', import.meta.url);
const configText = readFileSync(configUrl, 'utf8');
const rowsText = readFileSync(rowsUrl, 'utf8');
const config = JSON.parse(configText); const rows = JSON.parse(rowsText);
const clone = value => structuredClone(value);
function changed(edit) {
  const c = clone(config); const r = clone(rows); edit(c, r);
  return () => importCompanyFixture(JSON.stringify(c), JSON.stringify(r));
}

test('second company renamed fields and percent-sum FTE reconcile into existing provider', () => {
  const result = importCompanyFixture(configText, rowsText);
  const provider = createPublicFixtureProvider(result.manifestText, result.manifestSha256);
  assert.deepEqual(provider.read('/api/headcount').body, { headcount: 9 });
  assert.deepEqual(provider.read('/api/headcount-trend').body, [
    { snapshot_date: '2026-08-31', headcount: 7, fte: 6 },
    { snapshot_date: '2026-09-30', headcount: 9, fte: 7.75 },
  ]);
  assert.equal(provider.parity, 'none');
  assert.equal(provider.read('/api/headcount?org=OPS').status, 400);
  assert.deepEqual(result.report, {
    contract: 'invented-company-import-v1', companyKey: 'lantern-invented', parity: 'none',
    sourceSha256: sha256(rowsText), configSha256: sha256(configText), rowCount: 4,
    unitCount: 2, snapshotCount: 2, reconciled: true, mapping: config.fields, fteUnit: 'fte-percent-sum',
  });
  assert.throws(() => { result.report.mapping.fte = 'other'; }, TypeError);
  assert.equal(result.manifestText.includes('division_key'), false);
  assert.equal(result.manifestText.includes('workshop'), false);
  assert.equal(result.manifestText.includes('lantern'), false);
});

test('row order is immaterial; standard FTE source units require explicit configuration', () => {
  const result = importCompanyFixture(configText, rowsText);
  const c = clone(config); c.fteUnit = 'fte';
  const r = rows.toReversed().map(row => ({ ...row, capacity_percent_total: row.capacity_percent_total / 100 }));
  assert.equal(importCompanyFixture(JSON.stringify(c), JSON.stringify(r)).manifestText, result.manifestText);
  assert.throws(changed(c => { c.fteUnit = 'fte'; }), /FTE exceeds/);
});

test('hundredth-FTE binary representation is accepted without changing the reconciled total', () => {
  const c = clone(config); c.fteUnit = 'fte'; c.controls[1].fte = 5.63;
  const r = rows.map(row => ({ ...row, capacity_percent_total: row.capacity_percent_total / 100 }));
  r[0].capacity_percent_total = 1.13;
  const result = importCompanyFixture(JSON.stringify(c), JSON.stringify(r));
  assert.equal(createPublicFixtureProvider(result.manifestText, result.manifestSha256).read('/api/headcount-trend').body[1].fte, 5.63);
});

test('percent-sum source values reject fractional precision without rounding into matching controls', () => {
  for (const value of [325.000000001, 324.999999999, 0.000000001]) {
    assert.throws(changed((c, r) => { r[0].capacity_percent_total = value; }), /FTE precision/);
  }
});

test('explicit zero populations work; missing or null values never become zero', () => {
  const c = clone(config); const r = clone(rows);
  for (const row of r) { row.staffed_people = 0; row.capacity_percent_total = 0; }
  for (const control of c.controls) { control.headcount = 0; control.fte = 0; }
  const result = importCompanyFixture(JSON.stringify(c), JSON.stringify(r));
  assert.deepEqual(createPublicFixtureProvider(result.manifestText, result.manifestSha256).read('/api/headcount').body, { headcount: 0 });
  for (const value of [null, '', '4', -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(changed((c, r) => { r[0].staffed_people = value; }), /headcount/);
  }
  for (const value of [null, '', '325', -1, 325.1]) {
    assert.throws(changed((c, r) => { r[0].capacity_percent_total = value; }), /FTE/);
  }
});

test('rejects incomplete coverage, duplicate grains and unknown units/dates before producing artifacts', () => {
  for (const edit of [
    (c, r) => r.pop(),
    (c, r) => r.push(clone(r[0])),
    (c, r) => { r[0] = clone(r[1]); },
    (c, r) => { r[0].division_key = 'parent-total'; },
    (c, r) => { r[0].period_end = '2026-07-31'; },
    (c, r) => { r[0].period_end = '2026-09-31'; },
    (c, r) => { r[0].period_end = '09/30/2026'; },
  ]) assert.throws(changed(edit), /Company fixture import rejected/);
});

test('independent totals detect dropped counts, wrong FTE basis and stale controls', () => {
  assert.throws(changed((c, r) => { r[0].staffed_people = 5; }), /reconciliation/);
  assert.throws(changed((c, r) => { r[0].capacity_percent_total = 300; }), /reconciliation/);
  assert.throws(changed(c => { c.controls[0].headcount = 8; }), /reconciliation/);
  assert.throws(changed((c, r) => { r[0].capacity_percent_total = 401; }), /exceeds headcount/);
});

test('closed config and row schemas reject extra fields and ambiguous mapping contracts', () => {
  for (const edit of [
    c => { c.schemaVersion = 2; }, c => { c.dataClass = 'private'; },
    c => { c.grain = 'person'; }, c => { c.companyKey = '../company'; },
    c => { c.transform = 'eval(code)'; }, c => { c.fteUnit = 'hours'; },
    c => { c.fields.fte = c.fields.headcount; }, c => { c.fields.fte = '__proto__'; },
    c => { c.fields.salary = 'pay'; }, c => { c.units = []; },
    c => { c.units[1].source = c.units[0].source; },
    c => { c.units[1].org_code = c.units[0].org_code; },
    c => { c.units[0].parent = 'ALL'; }, c => { c.controls = []; },
    c => { c.controls.reverse(); }, c => { c.controls[0].fte = 7.01; },
    c => { c.controls[0].fte = 6.001; }, c => { c.controls[0].headcount = '7'; },
    (c, r) => { r[0].person_name = 'REJECTED_SOURCE_MARKER'; },
    (c, r) => { delete r[0].staffed_people; },
    (c, r) => { r[0] = null; },
  ]) assert.throws(changed(edit), /Company fixture import rejected/);
});

test('malformed, oversized and invalid top-level inputs fail without leaking payloads', () => {
  for (const input of [null, '{REJECTED_SOURCE_MARKER', ' '.repeat(1024 * 1024 + 1), '[]']) {
    assert.throws(() => importCompanyFixture(input, rowsText), error => !error.message.includes('REJECTED_SOURCE_MARKER'));
  }
  for (const input of ['null', '{}', '"string"', '{', ' '.repeat(1024 * 1024 + 1)]) {
    assert.throws(() => importCompanyFixture(configText, input), /Company fixture import rejected/);
  }
  assert.throws(changed(c => { c.units = Array(101).fill(c.units[0]); }), /units/);
  assert.throws(changed(c => { c.controls = Array(121).fill(c.controls[0]); }), /controls/);
});

test('aggregate count overflow is rejected even when each source count is safe', () => {
  assert.throws(changed((c, r) => {
    r[0].staffed_people = Number.MAX_SAFE_INTEGER;
  }), /aggregate overflow/);
});

test('CLI produces an import artifact without application dependencies and fails closed', () => {
  const cli = new URL('../tools/import-company-fixture.mjs', import.meta.url);
  const result = spawnSync(process.execPath, [cli, configUrl, rowsUrl].map(fileURLToPath), { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), importCompanyFixture(configText, rowsText));
  const rejected = spawnSync(process.execPath, [fileURLToPath(cli), 'REJECTED_SOURCE_MARKER'], { encoding: 'utf8' });
  assert.equal(rejected.status, 1); assert.equal(rejected.stdout, '');
  assert.equal(rejected.stderr.includes('REJECTED_SOURCE_MARKER'), false);
  const invalidRows = spawnSync(process.execPath, [cli, configUrl, configUrl].map(fileURLToPath), { encoding: 'utf8' });
  assert.equal(invalidRows.status, 1); assert.equal(invalidRows.stdout, '');
  assert.equal(invalidRows.stderr.includes('lantern'), false);
});
