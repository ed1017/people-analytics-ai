import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePairedPrefix } from '../../lib/ml/paired-prefix-turnover/generator.mjs';
import { evaluatePairedPrefix, summarizePairedPrefix, pairedPrefixProtocol as protocol } from '../../lib/ml/paired-prefix-turnover/evaluation.mjs';
import { evaluateGroupCase } from '../../lib/ml/group-turnover/evaluation.mjs';
import { digest, rng } from '../../lib/ml/synthetic-workforce/common.mjs';
const pair = generatePairedPrefix(3001);
const evaluated = evaluatePairedPrefix(pair);

test('paired-prefix evaluation: shared forecast, calibration and range exactly preserve the original baseline', () => {
  assert.equal(evaluated.invariants.identicalObservedPrefixes, true);
  assert.equal(evaluated.invariants.identicalGroupForecasts, 4);
  assert.equal(evaluated.invariants.identicalCalibrations, 4);
  assert.equal(evaluated.invariants.identicalCandidateRanges, 4);
  for (const branch of protocol.branches) {
    const original = evaluateGroupCase(pair.branches[branch].groups.releases, { family: 'stationary', seed: 3001 });
    for (const row of evaluated.rows) {
      const baseline = original.find(item => item.groupId === row.groupId);
      assert.equal(row.forecast.fingerprint, digest(baseline.forecast));
      assert.equal(row.calibration.fingerprint, digest(baseline.calibration));
      assert.deepEqual(row.candidateInterval, baseline.range);
      assert.equal(row.potentialOutcomes[branch].actualTotal, baseline.actual);
      assert.equal(row.forecast.cutoff, protocol.origin);
      assert.equal(row.forecast.trainingEnd, '2026-05');
      assert.deepEqual(row.forecast.targets, ['2026-07', '2026-08', '2026-09']);
    }
  }
  const large = evaluated.rows.find(row => row.groupId === 'group-a');
  assert.notEqual(large.potentialOutcomes.shock.actualTotal, large.potentialOutcomes['no-shock'].actualTotal);
});
test('paired-prefix evaluation: even an accounting-consistent historical prefix difference rejects', () => {
  const altered = structuredClone(pair);
  const row = altered.branches.shock.groups.releases.find(item => item.value.groupId === 'group-a' && item.value.month === '2025-05');
  row.value.starts += 5; row.value.voluntaryExits += 5;
  assert.throws(() => evaluatePairedPrefix(altered), /Paired observed prefixes differ/);
});
test('paired-prefix evaluation: assignment stream and assigned label never influence the forecast', () => {
  const expected = rng(3001, protocol.assignment.stream)() < 0.5 ? 'shock' : 'no-shock';
  assert.equal(pair.assignment.branch, expected);
  assert.equal(pair.assignment.assignedAt, '2026-07-01T00:00:00.000Z');
  const altered = structuredClone(pair);
  altered.assignment.branch = expected === 'shock' ? 'no-shock' : 'shock';
  const opposite = evaluatePairedPrefix(altered);
  for (let index = 0; index < evaluated.rows.length; index++) {
    const first = evaluated.rows[index], second = opposite.rows[index];
    assert.notEqual(first.assignedBranch, second.assignedBranch);
    assert.deepEqual(first.forecast, second.forecast);
    assert.deepEqual(first.calibration, second.calibration);
    assert.deepEqual(first.candidateInterval, second.candidateInterval);
    assert.deepEqual(first.potentialOutcomes, second.potentialOutcomes);
    assert.equal(first.prefixSha256, second.prefixSha256);
  }
  // A boundary test of stream separation, not empirical proof of statistical independence.
});
// Exactly 100 copied mechanics rows below test weighted arithmetic only. They are
// not 100 independently generated experiments or evidence of predictive coverage.
function mechanicsRows() {
  return Array.from({ length: 100 }, (_, index) => ({ seed: 3001 + index, groupId: 'group-a',
    assignedBranch: index < 30 ? 'shock' : 'no-shock', forecast: { expectedTotal: 10, reasonCodes: [] },
    candidateInterval: { lower: 8, upper: 12 }, potentialOutcomes: {
      'no-shock': { actualTotal: 10, error: 0, covered: true }, shock: { actualTotal: 20, error: -10, covered: false },
    },
  }));
}
test('paired-prefix evaluation: mixture RMSE takes square root after weighting squared losses', () => {
  const result = summarizePairedPrefix(mechanicsRows(), 'group-a');
  assert.equal(result.pairedHistories, 100); assert.equal(result.potentialContinuations, 200);
  assert.equal(result.conditional['no-shock'].rmse, 0); assert.equal(result.conditional.shock.rmse, 10);
  assert.equal(result.designWeightedMixture.intendedHistoryWeight, 100);
  assert.equal(result.designWeightedMixture.forecastScoredWeight, 100);
  assert.equal(result.designWeightedMixture.rmse, Math.sqrt(50));
  assert.notEqual(result.designWeightedMixture.rmse, 5);
  assert.equal(result.designWeightedMixture.mae, 5); assert.equal(result.designWeightedMixture.bias, -5);
  assert.equal(result.designWeightedMixture.coverage, 0.5);
  assert.equal(result.designWeightedMixture.meanWidth, 4);
  assert.equal(result.designWeightedMixture.meanIntervalScore, 84);
  assert.equal(result.designWeightedMixture.missesAboveWeight, 50);
  assert.equal(result.realized.rmse, Math.sqrt(30)); assert.equal(result.realized.coverage, 0.7);
  assert.equal(result.pairedContrast.completePairs, 100);
  assert.equal(result.pairedContrast.meanActualDifference, 10);
  assert.equal(result.pairedContrast.meanAbsoluteErrorDifference, 10);
  assert.equal(result.pairedContrast.ordinaryCoveredShockMissed, 100);
});
test('paired-prefix evaluation: missing potential labels and unavailable forecasts keep fractional denominators visible', () => {
  const rows = mechanicsRows();
  for (let index = 0; index < 20; index++) rows[index].potentialOutcomes.shock = { actualTotal: null, error: null, covered: null };
  for (let index = 0; index < 10; index++) {
    rows[index].forecast = { expectedTotal: null, reasonCodes: ['history-has-withheld-or-incomplete-month'] };
    rows[index].candidateInterval = null;
  }
  const result = summarizePairedPrefix(rows, 'group-a'), mixture = result.designWeightedMixture;
  assert.equal(mixture.intendedHistoryWeight, 100);
  assert.equal(mixture.forecastAvailableWeight, 90); assert.equal(mixture.forecastUnavailableWeight, 10);
  assert.equal(mixture.forecastScoredWeight, 85); assert.equal(mixture.missingOutcomeWeight, 5);
  assert.equal(mixture.intervalIssuedWeight, 90); assert.equal(mixture.intervalScoredWeight, 85);
  assert.equal(mixture.coveredWeight, 45); assert.equal(mixture.coverage, 45 / 85);
  assert.equal(mixture.issuanceAndCoverageRate, 0.45);
  assert.equal(mixture.rmse, Math.sqrt(4000 / 85));
  assert.equal(result.conditional.shock.forecastScoredWeight, 80);
  assert.equal(result.pairedContrast.completePairs, 80);
  assert.equal(result.reasonCounts['history-has-withheld-or-incomplete-month'], 10);
});
test('paired-prefix evaluation: suppression and unavailable results never become zero metrics or published intervals', () => {
  for (const id of ['group-c', 'group-d']) {
    const row = evaluated.rows.find(item => item.groupId === id);
    assert.equal(row.forecast.expectedTotal, null); assert.equal(row.candidateInterval, null);
    assert.ok(row.forecast.reasonCodes.includes('history-has-withheld-or-incomplete-month'));
    for (const outcome of Object.values(row.potentialOutcomes)) { assert.equal(outcome.error, null); assert.equal(outcome.covered, null); }
  }
  for (const row of evaluated.rows) {
    assert.equal(row.reservedScore, null); assert.equal(row.publishedInterval, null);
    assert.equal(row.causalEffect, null); assert.equal(row.operationallyQualified, false);
  }
  const rows = mechanicsRows();
  for (const row of rows) {
    row.forecast.expectedTotal = null; row.candidateInterval = null;
    for (const outcome of Object.values(row.potentialOutcomes)) Object.assign(outcome, { actualTotal: null, error: null, covered: null });
  }
  const summary = summarizePairedPrefix(rows, 'group-a');
  for (const metrics of [summary.conditional['no-shock'], summary.conditional.shock, summary.realized, summary.designWeightedMixture]) {
    assert.equal(metrics.forecastScoredWeight, 0); assert.equal(metrics.intervalScoredWeight, 0);
    for (const key of ['mae', 'rmse', 'bias', 'coverage', 'meanWidth', 'meanIntervalScore']) assert.equal(metrics[key], null);
    assert.equal(metrics.forecastUnavailableWeight, 100);
  }
  assert.equal(summary.pairedContrast.completePairs, 0); assert.equal(summary.pairedContrast.meanActualDifference, null);
  assert.equal(summary.publishedInterval, null); assert.equal(summary.causalEffect, null); assert.equal(summary.operationallyQualified, false);
});
test('paired-prefix evaluation: summary requires every unique frozen seed and correct group', () => {
  assert.throws(() => summarizePairedPrefix(mechanicsRows().slice(1), 'group-a'), /All frozen paired seeds/);
  assert.throws(() => summarizePairedPrefix([...mechanicsRows().slice(1), mechanicsRows()[1]], 'group-a'), /All frozen paired seeds/);
  assert.throws(() => summarizePairedPrefix(mechanicsRows().map(row => ({ ...row, seed: row.seed - 1000 })), 'group-a'), /All frozen paired seeds/);
  assert.throws(() => summarizePairedPrefix(mechanicsRows(), 'group-b'));
  for (const seed of [3000, 3101, 3001.5]) assert.throws(() => generatePairedPrefix(seed), /outside frozen/);
});
