import { canonicalJson, FIXTURE_CONTRACT, parsePublicFixture, sha256 } from './read-provider.mjs';

const fail = code => { throw new Error(`Company fixture import rejected: ${code}`); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, expected) {
  if (!object(value) || canonicalJson(Object.keys(value).sort()) !== canonicalJson([...expected].sort())) fail('object keys');
}
function parse(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 1024 * 1024) fail('input size');
  try { return JSON.parse(text); } catch { fail('JSON'); }
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('snapshot date');
}
function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail('headcount');
  return value;
}
function centiFte(value, unit) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail('FTE');
  // Percent sums already represent integer hundredths; no conversion tolerance applies.
  if (unit === 'fte-percent-sum') {
    if (!Number.isSafeInteger(value)) fail('FTE precision');
    return value;
  }
  // Limit precision explicitly; binary floating point representations of 1.13 are valid.
  const scaled = value * 100;
  const integer = Math.round(scaled);
  if (!Number.isSafeInteger(integer) || Math.abs(scaled - integer) > 1e-8) fail('FTE precision');
  return integer;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Offline aggregate importer for invented fixtures only. No IO, source selection,
 * runtime wiring, arbitrary transforms, or publication approval is performed here.
 * Reconciliation controls must be reviewed independently of the exported rows.
 */
export function importCompanyFixture(configText, rowsText) {
  const config = parse(configText);
  keys(config, ['schemaVersion', 'companyKey', 'dataClass', 'grain', 'fields', 'fteUnit', 'units', 'controls']);
  if (config.schemaVersion !== 1 || config.dataClass !== 'invented-test-only' ||
      config.grain !== 'nonoverlapping-leaf-unit-snapshot' ||
      typeof config.companyKey !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(config.companyKey)) fail('identity or grain');
  keys(config.fields, ['snapshot_date', 'org_code', 'headcount', 'fte']);
  const sourceFields = Object.values(config.fields);
  if (sourceFields.some(field => typeof field !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(field)) ||
      new Set(sourceFields).size !== 4 || sourceFields.some(field => ['constructor', 'prototype', '__proto__'].includes(field))) fail('field mapping');
  if (!['fte', 'fte-percent-sum'].includes(config.fteUnit)) fail('FTE unit');
  if (!Array.isArray(config.units) || config.units.length < 1 || config.units.length > 100) fail('units');
  const units = new Map(); const destinations = new Set();
  for (const unit of config.units) {
    keys(unit, ['source', 'org_code']);
    if (typeof unit.source !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(unit.source) ||
        typeof unit.org_code !== 'string' || !/^[A-Z][A-Z0-9_-]{0,63}$/.test(unit.org_code) ||
        units.has(unit.source) || destinations.has(unit.org_code)) fail('unit crosswalk');
    units.set(unit.source, unit.org_code); destinations.add(unit.org_code);
  }
  if (!Array.isArray(config.controls) || config.controls.length < 1 || config.controls.length > 120) fail('controls');
  const snapshots = new Map(); let previous = '';
  for (const control of config.controls) {
    keys(control, ['snapshot_date', 'headcount', 'fte']); date(control.snapshot_date);
    const hc = count(control.headcount); const fte = centiFte(control.fte, 'fte');
    if (control.snapshot_date <= previous || fte / 100 > hc) fail('control order or FTE');
    previous = control.snapshot_date;
    snapshots.set(control.snapshot_date, { expected: control, headcount: 0, centiFte: 0, units: new Set() });
  }
  const rows = parse(rowsText);
  if (!Array.isArray(rows) || rows.length !== units.size * snapshots.size) fail('row coverage');
  for (const row of rows) {
    keys(row, sourceFields);
    const snapshot = row[config.fields.snapshot_date]; date(snapshot);
    const total = snapshots.get(snapshot); const org = units.get(row[config.fields.org_code]);
    if (!total || !org) fail('unmapped snapshot or unit');
    if (total.units.has(org)) fail('duplicate unit snapshot');
    const hc = count(row[config.fields.headcount]); const fte = centiFte(row[config.fields.fte], config.fteUnit);
    if (fte / 100 > hc) fail('FTE exceeds headcount');
    total.units.add(org); total.headcount += hc; total.centiFte += fte;
    if (!Number.isSafeInteger(total.headcount) || !Number.isSafeInteger(total.centiFte)) fail('aggregate overflow');
  }
  const trend = [...snapshots].map(([snapshot_date, total]) => {
    if (total.units.size !== units.size) fail('unit coverage');
    if (total.headcount !== total.expected.headcount || total.centiFte !== centiFte(total.expected.fte, 'fte')) fail('reconciliation');
    return { snapshot_date, headcount: total.headcount, fte: total.centiFte / 100 };
  });
  const bodies = [['/api/headcount', { headcount: trend.at(-1).headcount }], ['/api/headcount-trend', trend]];
  const manifest = { schemaVersion: 1, contract: FIXTURE_CONTRACT, dataClass: 'invented-test-only', parity: 'none',
    documents: bodies.map(([target, body]) => ({ target, body, sha256: sha256(canonicalJson(body)) })) };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestSha256 = sha256(manifestText);
  // Reuse the existing executable contract, including immutable output and bounds.
  parsePublicFixture(manifestText, manifestSha256);
  return freeze({ manifestText, manifestSha256, report: {
    contract: 'invented-company-import-v1', companyKey: config.companyKey, parity: 'none',
    sourceSha256: sha256(rowsText), configSha256: sha256(configText),
    rowCount: rows.length, unitCount: units.size, snapshotCount: trend.length,
    reconciled: true, mapping: { ...config.fields }, fteUnit: config.fteUnit,
  } });
}
