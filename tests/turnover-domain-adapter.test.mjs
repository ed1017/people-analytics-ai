import test from 'node:test';
import assert from 'node:assert/strict';
import { assessTurnoverDomain as assess } from '../lib/ml/turnover-domain-adapter.mjs';
import { evaluateTurnoverReadinessSnapshots as evaluate } from '../lib/ml/turnover-vintage-evaluation.mjs';
import { generateTurnoverVintages as generate } from './fixtures/turnover-vintage-generator.mjs';

test('turnover adapter reuses complete constructed vintages without promoting them to source validation', () => {
  const snapshots = generate(), sourceContract = snapshots[0], before = structuredClone(snapshots);
  const r = assess({ sourceContract, constructedSnapshots: snapshots });
  assert.equal(r.contractStatus, 'passed'); assert.equal(r.status, 'unqualified');
  assert.deepEqual(r.mechanicsBenchmark, evaluate(snapshots)); assert.deepEqual(snapshots, before);
  assert.equal(r.coverage.selectedMonths, 24); assert.deepEqual(r.coverage.recordedZeroMonths, ['2023-08']);
  assert.equal(r.selectedHistory[7].count, 0); assert.equal(r.operationalForecast, null);
  assert.equal(r.sourceTruthVerified, false); assert.equal(r.realWorldPerformanceValidated, false);
  assert(Object.isFrozen(r.selectedHistory));
});
test('missing source availability and completeness remain blocked beside a passing benchmark', () => {
  const snapshots = generate(), sourceContract = structuredClone(snapshots[0]);
  Object.assign(sourceContract.manifest, { dataClass: 'company-extract', observationBasis: 'unknown', generatorVersion: null, generatedAt: null, sourceEvidence: 'prior-local-audit-only', completion: null });
  sourceContract.records.forEach(row => { row.observedAt = null; });
  const r = assess({ sourceContract, constructedSnapshots: snapshots });
  assert.equal(r.contractStatus, 'blocked'); assert.equal(r.mechanicsBenchmark.status, 'evaluated-constructed-fixture');
  assert.deepEqual(r.selectedHistory, []);
  for (const code of ['availability-unverified', 'availability-unknown', 'completeness-unknown', 'no-history']) assert(r.reasonCodes.includes(code));
  assert(r.missingInputs.find(x => x.code === 'availability-unverified').requirement.includes('bulk insertion'));
});
test('a late correction changes only history at or after its observation boundary', () => {
  const snapshots = generate();
  assert.equal(assess({ sourceContract: snapshots[1] }).selectedHistory.find(x => x.period === '2024-11').revision, 1);
  assert.equal(assess({ sourceContract: snapshots[2] }).selectedHistory.find(x => x.period === '2024-11').revision, 2);
  const before = assess({ sourceContract: snapshots[1] }); snapshots[1].records.at(-1).value.voluntaryExits += 100;
  assert.deepEqual(assess({ sourceContract: snapshots[1] }), before);
});
test('missing, duplicated or partial months cannot pass density/completion checks', () => {
  for (const [mutate, code] of [
    [s => { s.records.splice(2, 1); }, 'monthly-history-gap'],
    [s => { const copy = structuredClone(s.records[0]); copy.recordKey = 'duplicate'; s.records.push(copy); }, 'duplicate-calendar-month'],
    [s => { s.records[0].effectiveAt = '2023-01-15T00:00:00.000Z'; }, 'month-not-complete'],
    [s => { s.manifest.completion.through = '2024-12-31T00:00:00.000Z'; }, 'month-not-complete'],
  ]) { const sourceContract = generate()[0]; mutate(sourceContract); assert(assess({ sourceContract }).reasonCodes.includes(code)); }
});
test('unknown counts stay null; recorded zero stays numeric', () => {
  const sourceContract = generate()[0]; sourceContract.records[0].value.countStatus = 'unknown';
  const r = assess({ sourceContract }); assert.equal(r.selectedHistory[0].count, null);
  assert.equal(r.selectedHistory[7].count, 0); assert(r.reasonCodes.includes('count-unavailable'));
});
test('malformed, wrong-domain and rate contracts cannot masquerade as count history', () => {
  assert.equal(assess().contractStatus, 'blocked');
  const sourceContract = generate()[0]; sourceContract.target.measure = 'voluntary-rate';
  const r = assess({ sourceContract }); assert(r.reasonCodes.includes('count-target-required')); assert.deepEqual(r.selectedHistory, []);
  sourceContract.records[0].value.privateFeature = 2;
  assert(assess({ sourceContract }).reasonCodes.includes('unexpected-field'));
});
test('malformed benchmark inputs fail closed while retaining independent source audit', () => {
  const r = assess({ sourceContract: generate()[0], constructedSnapshots: [] });
  assert.equal(r.contractStatus, 'passed'); assert.equal(r.mechanicsBenchmark.status, 'blocked');
  assert.equal(r.mechanicsBenchmark.comparisons, null); assert.equal(r.operationalForecast, null);
});
test('company source declarations cannot enter the constructed-only benchmark', () => {
  const snapshots = generate();
  for (const s of snapshots) Object.assign(s.manifest, { dataClass: 'company-extract', observationBasis: 'source-evidenced', sourceEvidence: 'illustrative-attestation' });
  const r = assess({ sourceContract: snapshots[0], constructedSnapshots: snapshots });
  assert.equal(r.contractStatus, 'passed'); assert.equal(r.sourceTruthVerified, false);
  assert.equal(r.mechanicsBenchmark.status, 'blocked'); assert.equal(r.mechanicsBenchmark.comparisons, null);
  assert(r.mechanicsBenchmark.folds[0].predictionReasons.includes('constructed-fixture-required'));
});
