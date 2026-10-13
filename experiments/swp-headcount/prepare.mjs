// Extract headcount only from the previously captured aggregate source; no DB calls.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source = new URL('../../tests/fixtures/aggregate-exit-history.json', import.meta.url);
const bytes = readFileSync(source), captured = JSON.parse(bytes);
const sourceVersion = createHash('sha256').update(bytes).digest('hex');
const points = captured.months.map(p => ({month: p.month, value: p.monthEndHeadcount}));
if (points.length !== 33 || points.reduce((s, p) => s + p.value, 0) !== 304203) throw Error('Captured aggregate differs from qualification checkpoint.');
const verified = {status: 'verified', references: ['docs/swp-history-qualification.md', 'docs/aggregate-exit-qualification.sql']};
const unknown = {status: 'unverified', references: []};
const sourceId = 'public.employee_snapshots:company-month-end:captured-2026-10-05';
const history = {
  scope: {dimension: 'company', id: 'all-company', population: 'Distinct active employees present at month end; hire_date <= snapshot_date and termination_date absent or > snapshot_date'},
  metric: {kind: 'headcount', unit: 'people', definition: verified},
  sourceId, sourceVersion, populationReconciliation: verified, historicalMembership: verified,
  completion: unknown, historicalVintages: unknown, points: points.slice(0, 27),
};
for (const [name, data] of [['development-history.json', history], ['holdout.json', {sourceId, sourceVersion, points: points.slice(27)}]]) {
  const path = new URL(name, import.meta.url);
  if (existsSync(path)) throw Error('Refusing to overwrite prepared source.');
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
console.log(JSON.stringify({sourceId, sourceVersion, developmentMonths: 27, sealedEvaluationMonths: 6}));
