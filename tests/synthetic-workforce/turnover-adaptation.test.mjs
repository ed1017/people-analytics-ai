import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleVariance, adaptationDiagnostics, evaluateAdaptationCase, intervalScore, summarizeAdaptation, adaptationProtocol as protocol } from '../../lib/ml/turnover-adaptation/evaluation.mjs';
import { evaluateGroupCase } from '../../lib/ml/group-turnover/evaluation.mjs';
import { generateHiring } from '../../lib/ml/synthetic-workforce/hiring.mjs';
import { generateTurnover } from '../../lib/ml/synthetic-workforce/turnover.mjs';
import { partitionTurnoverGroups } from '../../lib/ml/synthetic-workforce/groups.mjs';
import { replaySynthetic } from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import { monthEnd } from '../../lib/ml/synthetic-workforce/common.mjs';
const config = JSON.parse(readFileSync(new URL('../../lib/ml/synthetic-workforce/protocol.json', import.meta.url)));
const extended = { ...config, seeds: [...config.seeds, 2001] };
const make = family => {
  const hiring = generateHiring(extended, { family, seed: 2001 });
  const turnover = generateTurnover(extended, { family, seed: 2001, startEvents: hiring.startEvents });
  return partitionTurnoverGroups(turnover, { family, seed: 2001 }).releases;
};
const releases = make('stationary');
const original = evaluateAdaptationCase(releases, { family: 'stationary', seed: 2001 });
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
// Pairwise squared differences yield sample variance without duplicating the evaluator's centered sum.
const independentVariance = values => {
  let squares = 0;
  for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) squares += (values[i] - values[j]) ** 2;
  return squares / (values.length * (values.length - 1));
};
const caseA = rows => rows.find(row => row.groupId === 'group-a');

test('turnover adaptation: sample variance and scale independently agree at every as-of origin', () => {
  assert.equal(sampleVariance([1, 2, 3]), 1); assert.equal(sampleVariance([7, 7]), 0);
  const calibration = caseA(original).calibration;
  assert.equal(calibration.adaptiveCompleteQuarters, 11); assert.equal(calibration.rank, 11);
  for (const fold of calibration.folds) assert.equal(fold.score, Math.abs(fold.actualTotal - fold.predictedTotal) / fold.scale);
  assert.equal(calibration.q, Math.max(...calibration.folds.map(fold => fold.score)));
  assert.throws(() => sampleVariance([1])); assert.throws(() => sampleVariance([1, NaN]));
  for (const cutoff of [protocol.assessmentOrigin, ...protocol.calibrationOrigins.map(monthEnd)]) {
    const snapshot = replaySynthetic('turnover', releases, cutoff);
    const result = adaptationDiagnostics(snapshot, 'group-a');
    const counts = snapshot.records.filter(row => row.value.groupId === 'group-a').slice(-12).map(row => row.value.voluntaryExits);
    assert.equal(counts.length, 12); assert.equal(result.status, 'available');
    const expectedMultiplier = Math.sqrt(Math.max(1, independentVariance(counts) / Math.max(1, average(counts))));
    const predictedQuarter = counts.slice(-3).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(result.multiplier - expectedMultiplier) < 1e-12);
    assert.ok(Math.abs(result.scale - Math.sqrt(Math.max(1, predictedQuarter)) * expectedMultiplier) < 1e-12);
    const previous = counts.slice(0, 9), recent = counts.slice(-3);
    const expectedThreshold = 3 * Math.sqrt(Math.max(1, independentVariance(previous)) * (1 / 3 + 1 / 9));
    assert.ok(Math.abs(result.shift.threshold - expectedThreshold) < 1e-12);
    assert.equal(result.shiftFlag, Math.abs(average(recent) - average(previous)) > expectedThreshold);
  }
});
test('turnover adaptation: future outcomes cannot alter June methods, bounds, issuance, diagnostics or calibration', () => {
  const changed = structuredClone(releases);
  for (const row of changed) if (row.status === 'complete' && row.simulatedAvailableAt > protocol.assessmentOrigin) {
    row.value.voluntaryExits += 100; row.value.starts += 100;
  }
  const after = evaluateAdaptationCase(changed, { family: 'stationary', seed: 2001 });
  for (let index = 0; index < original.length; index++) {
    assert.deepEqual(after[index].methods, original[index].methods);
    assert.deepEqual(after[index].diagnostics, original[index].diagnostics);
    assert.deepEqual(after[index].calibration, original[index].calibration);
  }
  assert.notEqual(caseA(after).actual, caseA(original).actual);
});
test('turnover adaptation: observed recent shift abstains only in the abstaining comparison', () => {
  const changed = structuredClone(releases);
  for (const row of changed) if (row.status === 'complete' && row.value.groupId === 'group-a' && ['2026-03', '2026-04', '2026-05'].includes(row.value.month)) {
    row.value.voluntaryExits += 300; row.value.starts += 300;
  }
  const result = caseA(evaluateAdaptationCase(changed, { family: 'stationary', seed: 2001 }));
  assert.equal(result.diagnostics.shiftFlag, true); assert.equal(result.calibration.adaptiveCompleteQuarters, 11);
  const adaptive = result.methods.find(row => row.method === 'volatility-adaptive');
  const abstain = result.methods.find(row => row.method === 'volatility-adaptive-abstain');
  assert.equal(adaptive.status, 'candidate'); assert.notEqual(adaptive.interval, null);
  assert.equal(abstain.status, 'abstained'); assert.equal(abstain.interval, null);
  assert.equal(adaptive.expectedTotal, abstain.expectedTotal);
  assert.deepEqual(abstain.reasonCodes, ['observed-past-change-heuristic']);
  const radius = result.calibration.q * result.diagnostics.scale;
  assert.equal(adaptive.interval.lower, Math.floor(Math.max(0, adaptive.expectedTotal - radius)));
  assert.equal(adaptive.interval.upper, Math.ceil(adaptive.expectedTotal + radius));
});
test('turnover adaptation: incomplete calibration remains visible and small groups remain suppressed', () => {
  const stress = evaluateAdaptationCase(make('reporting-stress'), { family: 'reporting-stress', seed: 2001 });
  const row = caseA(stress);
  assert.equal(row.calibration.folds.length, 11); assert.equal(row.calibration.adaptiveCompleteQuarters, 7);
  assert.equal(row.calibration.q, null);
  assert.equal(row.calibration.folds.filter(fold => fold.score === null).length, 4);
  assert.ok(row.methods.every(method => method.interval === null && method.status === 'unavailable'));
  for (const id of ['group-c', 'group-d']) {
    const small = original.find(item => item.groupId === id);
    assert.equal(small.diagnostics.status, 'unavailable');
    assert.ok(small.methods.every(method => method.interval === null));
    assert.equal(small.calibration.q, null);
  }
});
test('turnover adaptation: baseline exactly preserves the original evaluator and no reserve is scored', () => {
  const base = evaluateGroupCase(releases, { family: 'stationary', seed: 2001 });
  for (let index = 0; index < original.length; index++) {
    const result = original[index], baseline = result.methods.find(method => method.method === 'baseline');
    assert.deepEqual(baseline.interval, base[index].range);
    assert.equal(baseline.expectedTotal, base[index].forecast.methods.find(method => method.method === 'recent-mean-3')?.expectedTotal ?? null);
    assert.equal(result.actual, base[index].actual);
    assert.equal(result.reservedScore, null); assert.equal(result.publishedInterval, null); assert.equal(result.operationallyQualified, false);
    assert.deepEqual(result.targets, ['2026-07', '2026-08', '2026-09']);
    for (const method of result.methods) { assert.equal(method.publishedInterval, null); assert.equal(method.operationallyQualified, false); }
  }
  for (const seed of [17, 1001, 2000, 2101, 2001.5]) assert.throws(() => evaluateAdaptationCase(releases, { family: 'stationary', seed }), /Fresh frozen seed/);
});
test('turnover adaptation: integer clipped ranges and interval score retain tail penalties', () => {
  assert.equal(intervalScore({ lower: 0, upper: 3 }, 0), 3);
  assert.equal(intervalScore({ lower: 0, upper: 3 }, 5), 43);
  assert.equal(intervalScore({ lower: 10, upper: 21 }, 7), 71);
  assert.equal(intervalScore({ lower: 10, upper: 21 }, 15), 11);
  assert.throws(() => intervalScore({ lower: -1, upper: 3 }, 0));
  for (const row of original) for (const method of row.methods) if (method.interval) {
    assert.ok(Number.isInteger(method.interval.lower) && Number.isInteger(method.interval.upper));
    assert.ok(method.interval.lower >= 0);
    const width = method.interval.upper - method.interval.lower;
    const distance = Math.max(method.interval.lower - row.actual, row.actual - method.interval.upper, 0);
    assert.equal(intervalScore(method.interval, row.actual), width + 20 * distance);
  }
});
// Copied labels below test summary arithmetic ONLY: these are not 100 independent generated histories.
function summaryFixture() {
  return Array.from({ length: 100 }, (_, index) => ({ family: 'stationary', groupId: 'group-a', seed: 2001 + index,
    actual: index >= 90 ? null : index < 10 ? 25 : 15,
    methods: protocol.methods.map(method => {
      const withheld = method === 'volatility-adaptive' ? index < 20 : method === 'volatility-adaptive-abstain' ? index < 30 : false;
      return { method, expectedTotal: 15, interval: withheld ? null : method === 'baseline' ? { lower: 10, upper: 20 } : { lower: 0, upper: 30 },
        status: withheld ? method === 'volatility-adaptive-abstain' ? 'abstained' : 'unavailable' : 'candidate',
        reasonCodes: withheld ? [method === 'volatility-adaptive-abstain' ? 'observed-past-change-heuristic' : 'incomplete-calibration-quarters'] : [] };
    }),
  }));
}
test('turnover adaptation: summary separates conditional coverage, issuance, missing labels and abstention', () => {
  const result = summarizeAdaptation(summaryFixture(), { family: 'stationary', groupId: 'group-a' });
  const [base, adaptive, abstain] = result.methods;
  assert.deepEqual([base.intended, base.issued, base.issuedAndScored, base.covered], [100, 100, 90, 80]);
  assert.equal(base.conditionalCoverage, 80 / 90); assert.equal(base.issuanceAndCoverageRate, 0.8);
  assert.equal(base.meanWidth, 10); assert.equal(base.missesAbove, 10); assert.equal(base.missesBelow, 0);
  assert.ok(Math.abs(base.meanIntervalScore - (80 * 10 + 10 * 110) / 90) < 1e-12);
  assert.deepEqual([adaptive.issued, adaptive.issuedAndScored, adaptive.conditionalCoverage, adaptive.issuanceAndCoverageRate, adaptive.unavailable], [80, 70, 1, 0.7, 20]);
  assert.deepEqual([abstain.issued, abstain.issuedAndScored, abstain.conditionalCoverage, abstain.issuanceAndCoverageRate, abstain.detectorAbstentions], [70, 60, 1, 0.6, 30]);
  assert.equal(adaptive.meanWidth, 30); assert.equal(adaptive.meanRelativeWidth, 2);
  assert.deepEqual(result.paired.map(row => row.commonIssuedScored), [70, 60]);
  for (const paired of result.paired) { assert.equal(paired.coverageDifference, 0); assert.equal(paired.meanWidthDifference, 20); assert.equal(paired.meanIntervalScoreDifference, 20); }
  for (const method of result.methods) { assert.equal(method.diagnosticGate.status, 'failed-or-unavailable'); assert.equal(method.diagnosticGate.publishedInterval, null); }
});
test('turnover adaptation: summary requires every unique frozen seed and unavailable metrics remain null', () => {
  const options = { family: 'stationary', groupId: 'group-a' };
  for (const rows of [summaryFixture().slice(1), [...summaryFixture().slice(1), summaryFixture()[1]], summaryFixture().map((row, index) => ({ ...row, seed: index + 1001 }))]) {
    assert.throws(() => summarizeAdaptation(rows, options), /Every frozen seed/);
  }
  const missing = summaryFixture();
  for (const row of missing) for (const method of row.methods) { method.interval = null; method.status = 'unavailable'; }
  const result = summarizeAdaptation(missing, options);
  for (const method of result.methods) {
    assert.equal(method.issued, 0); assert.equal(method.conditionalCoverage, null);
    assert.equal(method.meanWidth, null); assert.equal(method.meanIntervalScore, null);
    assert.equal(method.issuanceAndCoverageRate, 0);
  }
  for (const paired of result.paired) { assert.equal(paired.commonIssuedScored, 0); assert.equal(paired.coverageDifference, null); }
});
