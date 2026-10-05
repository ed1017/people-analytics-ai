import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateAggregateExitDemo } from '../lib/ml/aggregate-exit-forecast.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/aggregate-exit-history.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(fixture);
const evaluate = () => evaluateAggregateExitDemo(fresh());
const sum = values => values.reduce((total, value) => total + value, 0);
const predictionOnly = fold => ({
  method: fold.method, historyWindow: fold.historyWindow, origin: fold.origin, trainStart: fold.trainStart,
  effectiveLookbackMonths: fold.effectiveLookbackMonths,
  trainMonths: fold.trainMonths, alpha: fold.alpha, expectedTotal: fold.expectedTotal,
  points: fold.points.map(({ month, horizon, expectedExits }) => ({ month, horizon, expectedExits })),
});
const freezeDeep = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};
const assertFrozenDeep = value => {
  if (value && typeof value === 'object') {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozenDeep);
  }
};
const patchedRow = patch => {
  const input = fresh();
  Object.assign(input.months[1], patch);
  return input;
};

test('actual aggregate fixture retains 32 months and does not upgrade qualification declarations', () => {
  const result = evaluate();
  assert.equal(result.status, 'conditional-retrospective-synthetic-demo');
  assert.equal(result.qualification.extractedMonths, 33);
  assert.equal(result.qualification.usableMonths, 32);
  assert.equal(result.qualification.historyStart, '2024-02');
  assert.equal(result.qualification.historyEnd, '2026-09');
  assert.deepEqual(result.qualification.excluded, [{ month: '2024-01', reason: 'unverified-join-zero' }]);
  for (const key of ['countForecastQualified', 'rateForecastQualified', 'pointInTimeValidated', 'completenessVerified', 'generatorProvenanceVerified']) {
    assert.equal(result.qualification[key], false, key);
  }
  assert.equal(result.productIntegrationEnabled, false);
  assert.match(result.protocol.assessment, /visible during source qualification/);
  assert.match(result.protocol.assessment, /not an untouched/);
  assert.equal(result.qualification.manifest.sourceInsertedAt, '2026-09-28T01:50:05.925Z');
});

test('calendar protocol separates development, final assessment and year-end forecast horizons', () => {
  const result = evaluate();
  assert.deepEqual(result.protocol.developmentOrigins, ['2026-01', '2026-02', '2026-03']);
  assert.equal(result.protocol.holdoutOrigin, '2026-06');
  assert.equal(result.protocol.forecastOrigin, '2026-09');
  for (const method of result.development) {
    assert.deepEqual(method.folds.map(fold => fold.trainMonths), [24, 25, 26]);
    assert.equal(method.metrics.origins, 3);
    assert.equal(method.metrics.distinctTargetMonths, 5);
    assert.equal(method.metrics.overall.count, 9);
    assert.deepEqual(method.metrics.byHorizon.map(item => [item.horizon, item.count]), [[1, 3], [2, 3], [3, 3]]);
    for (const fold of method.folds) {
      assert.ok(fold.points.every(point => point.month > fold.origin && point.month < '2026-07'));
      assert.deepEqual(fold.points.map(point => point.horizon), [1, 2, 3]);
    }
  }
  for (const method of result.holdout) {
    assert.equal(method.fold.trainMonths, 29);
    assert.deepEqual(method.fold.points.map(point => point.month), ['2026-07', '2026-08', '2026-09']);
    assert.equal(method.metrics.origins, 1);
  }
  assert.deepEqual(result.forecast.points.map(point => point.month), ['2026-10', '2026-11', '2026-12']);
});

test('shared evidence identifies baseline and fitted-model methods without upgrading provenance or validation', () => {
  const result = evaluate(), evidence = result.evidence;
  assert.equal(evidence.domain, 'voluntary-exits');
  assert.equal(evidence.unit, 'events');
  assert.deepEqual(evidence.methods.map(({ id, kind }) => ({ id, kind })), [
    { id: 'recent-mean-3', kind: 'baseline' },
    { id: 'seasonal-naive-12', kind: 'baseline' },
    { id: 'simple-exponential-smoothing', kind: 'fitted-statistical-model' },
  ]);
  assert.match(evidence.methods[2].fitting, /Training-only SSE/);
  assert.deepEqual(evidence.provenance.sources, ['public.attrition_monthly_trend']);
  assert.equal(evidence.provenance.dataClass, 'user-declared-synthetic');
  assert.equal(evidence.provenance.completeness, 'unverified');
  assert.equal(evidence.provenance.temporalAvailability, 'retrospective-final-data');
  assert.equal(evidence.provenance.generatorVersion, null);
  assert.equal(evidence.provenance.exposureDefinition, null);
  assert.equal(evidence.provenance.datasetFingerprint, result.datasetFingerprint);
  assert.equal(evidence.evaluation.basis, 'retrospective-final-data');
  assert.equal(evidence.evaluation.protocolVersion, result.protocol.methodVersion);
  assert.equal(evidence.evaluation.protocolFingerprint, result.protocolFingerprint);
  assert.equal(evidence.evaluation.selectionUsesAssessmentOutcomes, false);
  assert.equal(evidence.evaluation.assessmentCustody, 'not-untouched');
  assert.equal(evidence.evaluation.realWorldPerformanceValidated, false);
  assert.equal(evidence.evaluation.deploymentValidated, false);
  assert.equal(evidence.uncertainty.status, 'unavailable');
  assert.deepEqual(evidence.uncertainty, result.forecast.uncertainty);
  assert.throws(() => evaluateAggregateExitDemo({ ...fresh(), evidence: { deploymentValidated: true } }), /fields/);
});

test('12-month, 24-month and full-history comparisons use identical origins with exact training windows', () => {
  const result = evaluate();
  assert.equal(result.protocol.minimumTrainingMonths, 12);
  assert.equal(result.protocol.comparisonOriginMinimumMonths, 24);
  assert.deepEqual(result.protocol.historyWindows, ['last-12-months', 'last-24-months', 'all-available']);
  assert.match(result.protocol.historyComparison, /no window selection/);
  const expectations = {
    'last-12-months': { starts: ['2025-02', '2025-03', '2025-04'], sizes: [12, 12, 12], assessmentStart: '2025-07', assessmentSize: 12, forecastStart: '2025-10', forecastSize: 12 },
    'last-24-months': { starts: ['2024-02', '2024-03', '2024-04'], sizes: [24, 24, 24], assessmentStart: '2024-07', assessmentSize: 24, forecastStart: '2024-10', forecastSize: 24 },
    'all-available': { starts: ['2024-02', '2024-02', '2024-02'], sizes: [24, 25, 26], assessmentStart: '2024-02', assessmentSize: 29, forecastStart: '2024-02', forecastSize: 32 },
  };
  assert.deepEqual(result.historyWindowComparisons.map(item => item.historyWindow), Object.keys(expectations));
  for (const window of result.historyWindowComparisons) {
    const expected = expectations[window.historyWindow];
    for (const method of window.development) {
      assert.deepEqual(method.folds.map(fold => fold.origin), ['2026-01', '2026-02', '2026-03']);
      assert.deepEqual(method.folds.map(fold => fold.trainStart), expected.starts);
      assert.deepEqual(method.folds.map(fold => fold.trainMonths), expected.sizes);
      assert.ok(method.folds.every(fold => fold.historyWindow === window.historyWindow));
      assert.equal(method.metrics.origins, 3);
      assert.equal(method.metrics.distinctTargetMonths, 5);
      assert.equal(method.metrics.overall.count, 9);
      const main = result.development.find(item => item.method === method.method);
      assert.deepEqual(method.folds.map(fold => fold.points.map(({ month, horizon, actualExits }) => ({ month, horizon, actualExits }))), main.folds.map(fold => fold.points.map(({ month, horizon, actualExits }) => ({ month, horizon, actualExits }))));
    }
    for (const { fold } of window.assessment) {
      assert.equal(fold.origin, '2026-06');
      assert.equal(fold.trainStart, expected.assessmentStart);
      assert.equal(fold.trainMonths, expected.assessmentSize);
      assert.deepEqual(fold.points.map(point => point.month), ['2026-07', '2026-08', '2026-09']);
    }
    for (const forecast of window.forecasts) {
      assert.equal(forecast.origin, '2026-09');
      assert.equal(forecast.trainStart, expected.forecastStart);
      assert.equal(forecast.trainMonths, expected.forecastSize);
      assert.equal(forecast.effectiveLookbackMonths, forecast.method === 'recent-mean-3' ? 3 : forecast.method === 'seasonal-naive-12' ? 12 : expected.forecastSize);
    }
  }
  const full = result.historyWindowComparisons.find(item => item.historyWindow === 'all-available');
  assert.deepEqual(full.development, result.development);
  assert.deepEqual(full.assessment, result.holdout);
  assert.deepEqual(full.forecasts, result.forecastComparisons);
  assert.equal(result.forecast.historyWindow, 'all-available');
});

test('fixed-lookback baseline predictions and errors do not change across available history windows', () => {
  const result = evaluate();
  for (const window of result.historyWindowComparisons) {
    for (const method of ['recent-mean-3', 'seasonal-naive-12']) {
      const actual = window.development.find(item => item.method === method);
      const expected = result.development.find(item => item.method === method);
      assert.deepEqual(actual.folds.map(fold => fold.points), expected.folds.map(fold => fold.points));
      assert.deepEqual(actual.metrics, expected.metrics);
      const assessment = window.assessment.find(item => item.method === method);
      const mainAssessment = result.holdout.find(item => item.method === method);
      assert.deepEqual(assessment.fold.points, mainAssessment.fold.points);
      assert.deepEqual(assessment.metrics, mainAssessment.metrics);
      const forecast = window.forecasts.find(item => item.method === method);
      assert.equal(forecast.alpha, null);
      assert.deepEqual(forecast.points, result.forecastComparisons.find(item => item.method === method).points);
    }
  }
});

test('observations outside a requested fitting window cannot alter its smoothing forecasts', () => {
  const before = evaluate();
  const candidate = (report, window) => report.historyWindowComparisons.find(item => item.historyWindow === window).forecasts.find(item => item.method === 'simple-exponential-smoothing');
  const olderThan24 = fresh();
  olderThan24.months[1].voluntaryExits += 10000;
  olderThan24.months[1].totalExits += 10000;
  const afterOld = evaluateAggregateExitDemo(olderThan24);
  for (const window of ['last-12-months', 'last-24-months']) {
    assert.deepEqual(candidate(afterOld, window), candidate(before, window));
  }
  assert.notDeepEqual(candidate(afterOld, 'all-available'), candidate(before, 'all-available'));
  const olderThan12 = fresh();
  const row = olderThan12.months.find(item => item.month === '2024-10');
  row.voluntaryExits += 10000;
  row.totalExits += 10000;
  const afterMiddle = evaluateAggregateExitDemo(olderThan12);
  assert.deepEqual(candidate(afterMiddle, 'last-12-months'), candidate(before, 'last-12-months'));
  assert.notDeepEqual(candidate(afterMiddle, 'last-24-months'), candidate(before, 'last-24-months'));
});

test('baseline forecasts use only their historical count definitions and exact calendar lags', () => {
  const result = evaluate();
  const values = new Map(fixture.months.map(row => [row.month, row.voluntaryExits]));
  const recent = result.forecastComparisons.find(item => item.method === 'recent-mean-3');
  assert.equal(recent.points[0].expectedExits, (70 + 65 + 66) / 3);
  assert.ok(recent.points.every(point => point.expectedExits === recent.points[0].expectedExits));
  const seasonal = result.forecastComparisons.find(item => item.method === 'seasonal-naive-12');
  assert.deepEqual(seasonal.points.map(point => point.expectedExits), [70, 66, 71]);
  for (const fold of result.development.find(item => item.method === 'seasonal-naive-12').folds) {
    for (const point of fold.points) {
      const priorYear = `${Number(point.month.slice(0, 4)) - 1}${point.month.slice(4)}`;
      assert.equal(point.expectedExits, values.get(priorYear));
    }
  }
});

test('final assessment target mutations cannot change development, method selection or assessment predictions', () => {
  const input = fresh(), before = evaluateAggregateExitDemo(input);
  for (const row of input.months.filter(row => row.month >= '2026-07')) {
    row.voluntaryExits += 100;
    row.totalExits += 100;
  }
  const after = evaluateAggregateExitDemo(input);
  assert.deepEqual(after.protocol, before.protocol);
  assert.equal(after.protocolFingerprint, before.protocolFingerprint);
  assert.deepEqual(after.development, before.development);
  assert.deepEqual(after.selection, before.selection);
  assert.deepEqual(after.holdout.map(item => predictionOnly(item.fold)), before.holdout.map(item => predictionOnly(item.fold)));
  for (const beforeWindow of before.historyWindowComparisons) {
    const afterWindow = after.historyWindowComparisons.find(item => item.historyWindow === beforeWindow.historyWindow);
    assert.deepEqual(afterWindow.development, beforeWindow.development);
    assert.deepEqual(afterWindow.assessment.map(item => predictionOnly(item.fold)), beforeWindow.assessment.map(item => predictionOnly(item.fold)));
    assert.notDeepEqual(afterWindow.assessment.map(item => item.metrics), beforeWindow.assessment.map(item => item.metrics));
  }
  assert.deepEqual(after.evidence.evaluation, before.evidence.evaluation);
  assert.notDeepEqual(after.holdout.map(item => item.metrics), before.holdout.map(item => item.metrics));
  assert.notDeepEqual(after.forecastComparisons, before.forecastComparisons);
  assert.notEqual(after.datasetFingerprint, before.datasetFingerprint);
});

test('later observations cannot alter earlier rolling forecasts or fitted smoothing parameters', () => {
  const before = evaluate();
  for (const origin of before.protocol.developmentOrigins) {
    const input = fresh();
    for (const row of input.months.filter(row => row.month > origin)) {
      row.voluntaryExits += 200;
      row.totalExits += 200;
    }
    const after = evaluateAggregateExitDemo(input);
    for (const method of before.development) {
      const matching = after.development.find(item => item.method === method.method);
      assert.deepEqual(
        matching.folds.filter(fold => fold.origin <= origin).map(predictionOnly),
        method.folds.filter(fold => fold.origin <= origin).map(predictionOnly),
      );
    }
    for (const beforeWindow of before.historyWindowComparisons) {
      const afterWindow = after.historyWindowComparisons.find(item => item.historyWindow === beforeWindow.historyWindow);
      for (const method of beforeWindow.development) {
        const matching = afterWindow.development.find(item => item.method === method.method);
        assert.deepEqual(matching.folds.filter(fold => fold.origin <= origin).map(predictionOnly), method.folds.filter(fold => fold.origin <= origin).map(predictionOnly));
      }
    }
  }
});

test('forecast sums retain fractional expected counts and add only the current-year observed counts', () => {
  const result = evaluate();
  assert.equal(result.forecast.observedYtdExits, 605);
  assert.equal(result.forecast.observedYtdExits, sum(fixture.months.filter(row => row.month.startsWith('2026-')).map(row => row.voluntaryExits)));
  for (const method of result.forecastComparisons) {
    assert.equal(method.expectedTotal, sum(method.points.map(point => point.expectedExits)));
    assert.ok(method.points.every(point => Number.isFinite(point.expectedExits) && point.expectedExits >= 0));
  }
  assert.equal(result.forecast.expectedYearEndExits, 605 + result.forecast.expectedTotal);
  const recent = result.forecastComparisons.find(item => item.method === 'recent-mean-3');
  assert.equal(recent.expectedTotal, 201);
  const fractionalInput = fresh();
  fractionalInput.months.at(-1).voluntaryExits = 67;
  const fractional = evaluateAggregateExitDemo(fractionalInput);
  const fractionalRecent = fractional.forecastComparisons.find(item => item.method === 'recent-mean-3');
  assert.equal(fractionalRecent.points[0].expectedExits, 202 / 3);
  assert.equal(fractionalRecent.expectedTotal, 202);
  assert.equal(fractional.forecast.expectedYearEndExits, 606 + fractional.forecast.expectedTotal);
});

test('a constructed trend exercises smoothing fit and development-only candidate selection', () => {
  const input = fresh();
  input.months.slice(1).forEach((row, index) => {
    row.voluntaryExits = (index + 1) * 10;
    row.totalExits = row.voluntaryExits + 20;
  });
  const result = evaluateAggregateExitDemo(input);
  assert.equal(result.selection.method, 'simple-exponential-smoothing');
  assert.equal(result.selection.candidateSelected, true);
  const candidate = result.development.find(item => item.method === 'simple-exponential-smoothing');
  assert.ok(candidate.folds.every(fold => fold.alpha === 0.8));
  // On a +10-per-month ramp, alpha=.8 approaches a level 2.5 below the last count.
  assert.ok(Math.abs(candidate.folds[0].points[0].expectedExits - 237.5) < 1e-9);
  assert.ok(Math.abs(candidate.metrics.overall.mae - 22.5) < 1e-9);
  assert.ok(Math.abs(candidate.metrics.overall.bias + 22.5) < 1e-9);
  assert.ok(Math.abs(candidate.metrics.threeMonthTotal.mae - 67.5) < 1e-9);
  const recent = result.development.find(item => item.method === 'recent-mean-3');
  assert.deepEqual(recent.metrics.overall, { count: 9, mae: 30, rmse: Math.sqrt((20 ** 2 + 30 ** 2 + 40 ** 2) / 3), bias: -30 });
  assert.equal(recent.metrics.threeMonthTotal.mae, 90);
  assert.equal(result.forecast.alpha, 0.8);
  assert.ok(Math.abs(result.forecast.points[0].expectedExits - 317.5) < 1e-9);
  assert.equal(result.qualification.countForecastQualified, false);
});

test('zero voluntary exits remain valid when all-exit calendar evidence exists', () => {
  const result = evaluateAggregateExitDemo(patchedRow({ voluntaryExits: 0 }));
  assert.equal(result.qualification.usableMonths, 32);
  assert.deepEqual(result.qualification.excluded, [{ month: '2024-01', reason: 'unverified-join-zero' }]);
});

test('an all-zero voluntary series produces finite zero forecasts and deterministic baseline ties', () => {
  const input = fresh();
  input.months.forEach(row => { row.voluntaryExits = 0; });
  const result = evaluateAggregateExitDemo(input);
  assert.equal(result.selection.method, 'recent-mean-3');
  assert.equal(result.selection.candidateSelected, false);
  assert.equal(result.forecast.observedYtdExits, 0);
  assert.equal(result.forecast.expectedYearEndExits, 0);
  for (const method of result.forecastComparisons) {
    assert.equal(method.expectedTotal, 0);
    assert.ok(method.points.every(point => point.expectedExits === 0));
  }
  assert.equal(result.forecastComparisons.find(item => item.method === 'simple-exponential-smoothing').alpha, 0.2);
  for (const method of result.development) {
    assert.deepEqual(method.metrics.overall, { count: 9, mae: 0, rmse: 0, bias: 0 });
  }
  assert.equal(result.forecast.uncertainty.interval, null);
});

test('headcount changes cannot change count fits or create rate or probability outputs', () => {
  const before = evaluate(), input = fresh();
  input.months.forEach(row => { row.monthEndHeadcount = 1; });
  const after = evaluateAggregateExitDemo(input);
  assert.deepEqual(after.development, before.development);
  assert.deepEqual(after.holdout, before.holdout);
  assert.deepEqual(after.forecast, before.forecast);
  assert.notEqual(after.datasetFingerprint, before.datasetFingerprint);
  assert.equal(after.forecast.rate, null);
  assert.equal(after.forecast.uncertainty.interval, null);
  assert.match(after.forecast.uncertainty.reason, /Insufficient independent calibration/);
  for (const point of after.forecast.points) {
    assert.deepEqual(Object.keys(point).sort(), ['expectedExits', 'horizon', 'month']);
  }
});

test('input order and property order do not change report identity or mutate callers', () => {
  const input = fresh(), original = structuredClone(input);
  const expected = evaluateAggregateExitDemo(freezeDeep(input));
  assert.deepEqual(input, original);
  const reverseObject = value => Object.fromEntries(Object.entries(value).reverse());
  const reordered = reverseObject({
    ...original,
    manifest: reverseObject(original.manifest),
    months: [...original.months].reverse().map(reverseObject),
  });
  assert.deepEqual(evaluateAggregateExitDemo(reordered), expected);
  assert.match(expected.datasetFingerprint, /^[a-f0-9]{64}$/);
  assert.match(expected.protocolFingerprint, /^[a-f0-9]{64}$/);
  assertFrozenDeep(expected);
  assert.throws(() => { expected.forecast.points[0].expectedExits = 999; }, TypeError);
});

test('strict aggregate shapes reject employee fields at every boundary', () => {
  const examples = [
    { ...fresh(), employeeId: 'not-permitted' },
    { ...fresh(), manifest: { ...fixture.manifest, employeeId: 'not-permitted' } },
    patchedRow({ employeeId: 'not-permitted' }),
    patchedRow({ riskScore: 0.7 }),
    patchedRow({ voluntaryTurnoverRate: 0.02 }),
  ];
  for (const input of examples) assert.throws(() => evaluateAggregateExitDemo(input), /fields/);
  for (const value of [null, [], 'aggregate', 33]) assert.throws(() => evaluateAggregateExitDemo(value));
  const missing = fresh();
  delete missing.manifest.generatorVersion;
  assert.throws(() => evaluateAggregateExitDemo(missing), /fields/);
  assert.throws(() => evaluateAggregateExitDemo({ ...fresh(), schemaVersion: '1' }), /version/);
});

test('accessors, inherited contracts and symbol fields are rejected before execution', () => {
  const input = fresh();
  let accessed = false;
  Object.defineProperty(input.months[1], 'voluntaryExits', { enumerable: true, get() { accessed = true; return 60; } });
  assert.throws(() => evaluateAggregateExitDemo(input), /plain values/);
  assert.equal(accessed, false);
  assert.throws(() => evaluateAggregateExitDemo(Object.create(fixture)), /plain aggregate/);
  const symbolInput = fresh();
  symbolInput[Symbol('employee')] = 'not-permitted';
  assert.throws(() => evaluateAggregateExitDemo(symbolInput), /fields/);
});

test('month arrays reject hidden person fields, indexed accessors and sparse entries', () => {
  const extra = fresh();
  extra.months.employeeIds = ['not-permitted'];
  assert.throws(() => evaluateAggregateExitDemo(extra));
  const getterInput = fresh();
  const secondMonth = getterInput.months[1];
  let accessed = false;
  Object.defineProperty(getterInput.months, '1', { enumerable: true, get() { accessed = true; return secondMonth; } });
  assert.throws(() => evaluateAggregateExitDemo(getterInput));
  assert.equal(accessed, false);
  const sparse = fresh();
  delete sparse.months[1];
  assert.throws(() => evaluateAggregateExitDemo(sparse));
});

test('provenance and exposure declarations cannot be promoted by callers', () => {
  for (const patch of [
    { provenance: 'real' }, { provenance: ['user-declared-synthetic'] },
    { population: 'current-employees' }, { source: 'employees' },
    { vintageHistory: true }, { completionEvidence: 'verified' },
    { denominatorBasis: 'average-headcount' }, { generatorVersion: 'verified-generator' },
  ]) {
    const input = fresh();
    Object.assign(input.manifest, patch);
    assert.throws(() => evaluateAggregateExitDemo(input));
  }
});

test('counts reject coercion, invalid numbers, unsafe bounds and impossible voluntary totals', () => {
  for (const key of ['voluntaryExits', 'totalExits', 'monthEndHeadcount']) {
    for (const value of [null, '', '60', true, [], NaN, Infinity, -1, 0.5, 1000001, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => evaluateAggregateExitDemo(patchedRow({ [key]: value })), `${key}: ${String(value)}`);
    }
  }
  assert.throws(() => evaluateAggregateExitDemo(patchedRow({ monthEndHeadcount: 0 })), /count/);
  assert.throws(() => evaluateAggregateExitDemo(patchedRow({ voluntaryExits: 80 })), /exceed/);
  assert.throws(() => evaluateAggregateExitDemo(patchedRow({ voluntaryExits: 0, totalExits: 1 })));
});

test('calendar validation rejects malformed months, wrong snapshots and missing boundary evidence', () => {
  for (const patch of [
    { month: '2024-2' }, { month: '2024-13' }, { month: '2024-02-01' },
    { snapshotDate: '2024-02-28' }, { snapshotDate: '2024-02-30' },
    { firstEvent: null }, { lastEvent: null },
    { firstEvent: '2024-02-02' }, { lastEvent: '2024-02-28' },
    { firstEvent: '2024-01-01' }, { lastEvent: '2024-03-01' },
    { firstEvent: '2024-02-29', lastEvent: '2024-02-01' },
  ]) assert.throws(() => evaluateAggregateExitDemo(patchedRow(patch)));
  assert.equal(evaluate().qualification.historyStart, '2024-02');
});

test('extraction and source timestamps reject invalid dates and future chronology', () => {
  for (const patch of [
    { extractedOn: '2026-02-29' }, { extractedOn: '2026-09-29' },
    { sourceDefinitionVersion: 'inspected-2026-10-06' },
    { sourceDefinitionVersion: 'inspected-2026-02-30' },
    { sourceInsertedAt: '2026-10-06T00:00:00.000Z' },
    { sourceInsertedAt: '2026-02-30T00:00:00.000Z' },
    { sourceInsertedAt: '2026-09-28T01:50:05Z' },
  ]) {
    const input = fresh();
    Object.assign(input.manifest, patch);
    assert.throws(() => evaluateAggregateExitDemo(input));
  }
  const input = fresh();
  input.manifest.extractedOn = '2026-09-29';
  input.manifest.sourceDefinitionVersion = 'inspected-2026-09-29';
  assert.throws(() => evaluateAggregateExitDemo(input), /future snapshot/);
});

test('duplicate or omitted months cannot silently change a calendar lag or training window', () => {
  const duplicate = fresh();
  duplicate.months[2] = structuredClone(duplicate.months[1]);
  assert.throws(() => evaluateAggregateExitDemo(duplicate), /Duplicate or missing/);
  const gap = fresh();
  gap.months.splice(5, 1);
  assert.throws(() => evaluateAggregateExitDemo(gap), /Duplicate or missing/);
  const short = fresh();
  short.months.splice(0, 2);
  assert.throws(() => evaluateAggregateExitDemo(short), /32/);
});

test('unverified interior or trailing all-event zeros remain unknown and cannot train', () => {
  for (const index of [1, 12, 32]) {
    const input = fresh();
    Object.assign(input.months[index], { voluntaryExits: 0, totalExits: 0, firstEvent: null, lastEvent: null });
    assert.throws(() => evaluateAggregateExitDemo(input), /32 event-bearing|Interior or trailing/);
  }
  assert.throws(() => evaluateAggregateExitDemo(patchedRow({ voluntaryExits: 0, totalExits: 0 })), /contradictory/);
  const empty = fresh();
  empty.months.forEach(row => Object.assign(row, { voluntaryExits: 0, totalExits: 0, firstEvent: null, lastEvent: null }));
  assert.throws(() => evaluateAggregateExitDemo(empty), /No event-bearing/);
});

test('removing the final month cannot silently shift the bounded year-end forecast origin', () => {
  const input = fresh();
  input.months.pop();
  // Give January event evidence so the September-origin guard is tested with 32 usable months.
  Object.assign(input.months[0], { voluntaryExits: 0, totalExits: 2, firstEvent: '2024-01-01', lastEvent: '2024-01-31' });
  assert.throws(() => evaluateAggregateExitDemo(input), /September origin/);
});
