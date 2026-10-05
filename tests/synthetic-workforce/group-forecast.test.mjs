import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { forecastGroup, calibrateGroup, candidateRange, wilson95, validateIntervalGate, evaluateGroupCase, publishGroupCase, groupTurnoverProtocol as protocol } from '../../lib/ml/group-turnover/evaluation.mjs';
import { generateTurnover } from '../../lib/ml/synthetic-workforce/turnover.mjs';
import { partitionTurnoverGroups } from '../../lib/ml/synthetic-workforce/groups.mjs';
import { monthsFor, monthEnd, monthAdd, firstDay } from '../../lib/ml/synthetic-workforce/common.mjs';
import { replaySynthetic } from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import { evaluateTurnoverReadinessSnapshots } from '../../lib/ml/turnover-vintage-evaluation.mjs';
import { generateTurnoverVintages } from '../fixtures/turnover-vintage-generator.mjs';
const config = JSON.parse(readFileSync(new URL('../../lib/ml/synthetic-workforce/protocol.json', import.meta.url)));
// Constructed starts keep stocks sufficiently large for count-baseline comparisons.
const company = generateTurnover(config, { seed: 17, family: 'stationary', startEvents: monthsFor(config).map(month => ({ at: firstDay(month), count: 100 })) });
const releases = partitionTurnoverGroups(company, { seed: 17, family: 'stationary' }).releases;
const snapshot = () => replaySynthetic('turnover', releases, protocol.assessmentOrigin);
const groupId = 'group-a';
const mask = (row, status) => {
  row.status = status; row.value.countStatus = status;
  for (const key of ['startHeadcount', 'starts', 'voluntaryExits', 'otherExits', 'endHeadcount']) row.value[key] = null;
  Object.assign(row.value.exposure, { status, personDays: null, days: null, meanHeadcount: null });
};
const gateRows = (covered = 100) => Array.from({ length: 100 }, (_, index) => ({
  family: 'stationary', groupId, method: protocol.primaryMethod, seed: 1001 + index,
  range: { lower: 10, upper: 20 }, actual: index < covered ? 15 : 21,
}));
const gateFor = rows => validateIntervalGate(rows, { family: 'stationary', groupId });

test('group forecast: ordinary lag ends at May but forecasts exact July–September calendar months', () => {
  const result = forecastGroup(snapshot(), { groupId });
  assert.equal(result.status, 'forecasted-synthetic-count');
  assert.equal(result.trainingEnd, '2026-05'); assert.equal(result.trainingMonths, 65);
  assert.equal(result.reportingGapMonths, 1);
  assert.deepEqual(result.targets, ['2026-07', '2026-08', '2026-09']);
  for (const method of result.methods) assert.deepEqual(method.points.map(p => p.leadFromLastReleasedMonth), [2, 3, 4]);
  assert.throws(() => forecastGroup(snapshot(), { groupId, targets: ['2026-06', '2026-07', '2026-08'] }), /calendar targets/);
  assert.equal(result.rate, null); assert.equal(result.individualRisk, null); assert.equal(result.operationallyQualified, false);
});
test('group forecast: true zero survives, incomplete or suppressed months block instead of being dropped', () => {
  const current = snapshot();
  const zero = current.records.find(row => row.value.groupId === groupId && row.value.month === '2021-08');
  assert.equal(zero.status, 'complete'); assert.equal(zero.value.voluntaryExits, 0);
  assert.equal(forecastGroup(current, { groupId }).trainingMonths, 65);
  for (const status of ['partial', 'missing', 'suppressed']) {
    const input = snapshot(); mask(input.records.find(row => row.value.groupId === groupId && row.value.month === '2024-01'), status);
    const result = forecastGroup(input, { groupId });
    assert.equal(result.status, 'blocked'); assert.equal(result.trainingMonths, 65); assert.deepEqual(result.methods, []);
    assert.ok(result.reasons.includes('history-has-withheld-or-incomplete-month'));
  }
  const dropped = snapshot(); dropped.records = dropped.records.filter(row => !(row.value.groupId === groupId && row.value.month === '2024-01'));
  assert.ok(forecastGroup(dropped, { groupId }).reasons.includes('history-not-dense-from-frozen-start'));
});
test('group forecast: source-observed clocks, arbitrary features and stock/count disclosure violations reject', () => {
  const changes = [
    row => { row.sourceObservedAt = row.simulatedAvailableAt; },
    row => { row.value.managerRating = 5; },
    row => { row.value.voluntaryExits = 1; row.value.endHeadcount = row.value.startHeadcount + row.value.starts - 1 - row.value.otherExits; },
  ];
  for (const change of changes) {
    const input = snapshot(); change(input.records.find(row => row.value.groupId === groupId));
    assert.throws(() => forecastGroup(input, { groupId }));
  }
});
test('group forecast: assessment score and future revision changes cannot rewrite June predictions or calibration', () => {
  const before = evaluateGroupCase(releases, { family: 'stationary', seed: 17 });
  const changed = structuredClone(releases);
  for (const row of changed) if (row.status === 'complete' && row.simulatedAvailableAt > protocol.assessmentOrigin) {
    row.value.voluntaryExits += 100;
    row.value.starts += 100; // Preserve the aggregate accounting contract for changed synthetic labels.
  }
  const after = evaluateGroupCase(changed, { family: 'stationary', seed: 17 });
  for (let index = 0; index < before.length; index++) {
    assert.deepEqual(after[index].forecast, before[index].forecast);
    assert.deepEqual(after[index].calibration, before[index].calibration);
  }
  assert.notEqual(after[0].actual, before[0].actual);
  assert.notDeepEqual(after[0].comparisons, before[0].comparisons);
});
test('group forecast: an after-cutoff revision cannot enter earlier training or calibration', () => {
  const changed = structuredClone(releases);
  const original = changed.find(row => row.recordKey === 'turnover:group-a:2024-01');
  const revision = structuredClone(original);
  Object.assign(revision, { revision: 2, supersedes: 1, simulatedAvailableAt: '2026-07-01T00:00:00.000Z' });
  revision.value.voluntaryExits += 50; revision.value.starts += 50; changed.push(revision);
  assert.deepEqual(forecastGroup(replaySynthetic('turnover', changed, protocol.assessmentOrigin), { groupId }), forecastGroup(snapshot(), { groupId }));
  assert.deepEqual(calibrateGroup(changed, { groupId }), calibrateGroup(releases, { groupId }));
});
test('group forecast: normalized quarter-error order statistic uses all 11 frozen calibration quarters', () => {
  const result = calibrateGroup(releases, { groupId });
  assert.equal(result.status, 'calibrated-candidate'); assert.equal(result.completeQuarters, 11);
  assert.equal(result.quantileRank, 11);
  const independentScores = result.folds.map(fold => Math.abs(fold.predictedTotal - fold.actualTotal) / Math.sqrt(Math.max(1, fold.predictedTotal)));
  assert.equal(result.q, Math.max(...independentScores));
  assert.equal(result.coverageGuarantee, false);
  const resultRange = candidateRange(100, { status: 'calibrated-candidate', q: 2.5 });
  assert.equal(resultRange.lower, 75); assert.equal(resultRange.upper, 125);
  assert.equal(resultRange.target, 'three-month-total-only');
  assert.deepEqual([candidateRange(0, { status: 'calibrated-candidate', q: 2.5 }).lower, candidateRange(0, { status: 'calibrated-candidate', q: 2.5 }).upper], [0, 3]);
  const missing = structuredClone(releases);
  for (const row of missing) if (row.value.groupId === groupId && row.value.month === '2023-07') mask(row, 'missing');
  const blocked = calibrateGroup(missing, { groupId });
  assert.equal(blocked.status, 'unavailable'); assert.equal(blocked.q, null);
  assert.equal(blocked.folds.length, 11); assert.ok(blocked.folds.some(fold => fold.status === 'unavailable'));
  assert.equal(candidateRange(100, blocked), null);
});
test('group forecast: Wilson gate independently distinguishes 95/100 from 96/100 coverage', () => {
  assert.ok(wilson95(95, 100).lower < 0.9);
  assert.ok(wilson95(96, 100).lower > 0.9);
  assert.equal(gateFor(gateRows(95)).status, 'unavailable');
  assert.equal(gateFor(gateRows(96)).status, 'qualified-conditional-simulation');
  assert.ok(gateFor(gateRows(89)).reasons.includes('empirical-coverage-below-frozen-minimum'));
  assert.deepEqual(wilson95(0, 0), { lower: null, upper: null });
});
test('group forecast: every frozen seed must be scored; missing and all unavailable cannot pass', () => {
  for (const rows of [[], gateRows().slice(1), gateRows().map(row => ({ ...row, range: null, actual: null }))]) {
    const result = gateFor(rows);
    assert.equal(result.status, 'unavailable');
    assert.ok(result.reasons.includes('not-all-frozen-seeds-forecastable-and-scored'));
    assert.equal(result.intendedSeeds, 100);
  }
  const all = gateFor(gateRows().map(row => ({ ...row, range: null, actual: null })));
  assert.equal(all.available, 0); assert.equal(all.unavailable, 100); assert.equal(all.empiricalCoverage, null);
  assert.throws(() => gateFor([...gateRows(), gateRows()[0]]), /Unexpected validation seed/);
});
test('group forecast: failed qualification hides candidate range; reserved year end stays unscored with no interval', () => {
  const result = evaluateGroupCase(releases, { family: 'stationary', seed: 17, includeYearEnd: true }).find(row => row.groupId === groupId);
  assert.notEqual(result.range, null);
  const published = publishGroupCase(result, gateFor(gateRows(95)));
  assert.equal(published.predictionInterval, null); assert.equal(published.intervalStatus, 'unavailable');
  const permitted = publishGroupCase(result, gateFor(gateRows(100)));
  assert.equal(permitted.intervalStatus, 'qualified-retrospective-conditional-simulation');
  for (const output of [published, permitted]) {
    assert.equal(output.yearEnd.actual, null); assert.equal(output.yearEnd.scoringStatus, 'reserved-unscored');
    assert.equal(output.yearEnd.predictionInterval, null);
    assert.deepEqual(output.yearEnd.forecast.targets, ['2026-10', '2026-11', '2026-12']);
    assert.equal(output.qualificationAvailableAt, protocol.scoringCutoff); assert.equal(output.operationallyQualified, false);
  }
});
test('group forecast: existing count-baseline implementation parity under translated fixture calendars', () => {
  const early = replaySynthetic('turnover', releases, monthEnd('2023-01'));
  early.records = early.records.filter(row => row.value.groupId === groupId && row.value.month <= '2022-12');
  early.cutoff = monthEnd('2022-12');
  // Separate count-only parity fixture: copy generated counts into a new revision-1,
  // immediate-release snapshot. This does not test/relabel original reporting clocks.
  early.records = early.records.map(row => ({ ...row, revision: 1, supersedes: null, simulatedAvailableAt: row.effectiveAt }));
  assert.equal(early.records.length, 24);
  const snapshots = generateTurnoverVintages();
  for (const contract of snapshots) for (const row of contract.records) {
    const newMonth = monthAdd(row.value.period, -24);
    const source = early.records.find(item => item.value.month === newMonth);
    if (source) row.value.voluntaryExits = source.value.voluntaryExits;
  }
  const old = evaluateTurnoverReadinessSnapshots(snapshots).folds[0];
  const current = forecastGroup(early, { groupId });
  assert.equal(old.status, 'evaluated-constructed-fixture'); assert.equal(current.status, 'forecasted-synthetic-count');
  for (const method of current.methods) {
    const baseline = old.methods.find(item => item.method === method.method);
    assert.deepEqual(method.points.map(p => p.expectedExits), baseline.points.map(p => p.prediction));
    assert.equal(method.expectedTotal, baseline.points.reduce((sum, p) => sum + p.prediction, 0));
  }
});

test('group publication: promoting an empty gate cannot create qualified interval evidence', () => {
  const result = evaluateGroupCase(releases, { family: 'stationary', seed: 17 }).find(row => row.groupId === groupId);
  const empty = structuredClone(gateFor([]));
  empty.status = 'qualified-conditional-simulation'; empty.reasons = [];
  assert.throws(() => publishGroupCase(result, empty), /Gate status conflicts/);
  const valid = gateFor(gateRows(96));
  assert.deepEqual(publishGroupCase(result, valid).predictionInterval, result.range);
});
test('group publication: corrupted gate evidence, targets, method or qualification clock rejects', () => {
  const result = evaluateGroupCase(releases, { family: 'stationary', seed: 17 }).find(row => row.groupId === groupId);
  const corruptions = [
    gate => { gate.covered = 95; },
    gate => { gate.wilson95.lower = 1; },
    gate => { gate.available = 101; },
    gate => { gate.receivedSeeds = 99; },
    gate => { gate.intendedSeeds = 99; },
    gate => { gate.unavailable = 1; },
    gate => { gate.empiricalCoverage = 1; },
    gate => { gate.targets = ['2026-10', '2026-11', '2026-12']; },
    gate => { gate.target = 'monthly-count'; },
    gate => { gate.qualificationAvailableAt = protocol.assessmentOrigin; },
    gate => { gate.timing = 'available-at-origin'; },
    gate => { gate.method = 'seasonal-naive-12'; },
    gate => { gate.reasons = ['retained-failure']; },
  ];
  for (const corrupt of corruptions) {
    const gate = structuredClone(gateFor(gateRows(96))); corrupt(gate);
    assert.throws(() => publishGroupCase(result, gate));
  }
});
test('group publication: altered case range and forecast timing cannot inherit a valid gate', () => {
  const result = evaluateGroupCase(releases, { family: 'stationary', seed: 17 }).find(row => row.groupId === groupId);
  const gate = gateFor(gateRows(100));
  for (const corrupt of [
    value => { value.range.upper += 1; },
    value => { value.range.target = 'monthly-count'; },
    value => { value.range.nominalCoverage = 0.99; },
    value => { value.range = null; },
    value => { value.forecast.targets = ['2026-10', '2026-11', '2026-12']; },
    value => { value.forecast.cutoff = protocol.yearEndOrigin; },
  ]) {
    const altered = structuredClone(result); corrupt(altered);
    assert.throws(() => publishGroupCase(altered, gate));
  }
});
