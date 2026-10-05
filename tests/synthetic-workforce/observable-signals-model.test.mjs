import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSignalHistory } from '../../lib/ml/observable-turnover-signals/generator.mjs';
import { selectSignal, trainingRows, fitSignalModels, forecastWithSignal, summarizeSignalRows, signalProtocol as protocol } from '../../lib/ml/observable-turnover-signals/model.mjs';
import { replaySynthetic } from '../../lib/ml/synthetic-workforce/pipeline.mjs';

// Only training seed 4001 is generated. No test-seed history or outcome is generated here.
const history = generateSignalHistory(4001, 'training');
const snapshots = history.branches['no-shock'].groups.releases;
const snapshot = () => replaySynthetic('turnover', snapshots, protocol.training.origin);
// Explicit earlier-clock mechanics fit, not the frozen experiment's trained model.
const mechanicsFit = (groupId = 'group-a') => ({ groupId, trainingLabelsAsOf: '2024-10-31T23:59:59.999Z', n: 100,
  intercept: 10, cells: [{ value: 0, n: 50, meanResidual: 2 }, { value: 1, n: 50, meanResidual: 18 }],
  signalSupported: true, trainingRowsSha256: 'hand-built-mechanics-only' });
const signal = () => structuredClone(history.signalRelease);

test('observable signals: strict record schema rejects labels, metadata, invalid values and source-clock claims', () => {
  for (const field of ['seed', 'scenario', 'assignment', 'branch', 'truth', 'shockSchedule', 'target', 'actualTotal']) {
    const record = signal(); record[field] = 1;
    assert.throws(() => selectSignal([record], protocol.training.origin), /Unexpected offline signal fields/);
  }
  for (const alter of [record => { record.value = 2; }, record => { record.sourceObservedAt = record.simulatedAvailableAt; },
    record => { record.dataClass = 'company-extract'; }, record => { record.name = 'future-exits'; },
    record => { record.simulatedAvailableAt = '2025-01-01T00:00:00.000Z'; }]) {
    const record = signal(); alter(record); assert.throws(() => selectSignal([record], protocol.training.origin));
  }
  assert.throws(() => selectSignal([signal(), signal()], protocol.training.origin), /One synthetic signal/);
});
test('observable signals: future-effective and late-available records cannot be selected; boundary and zero remain valid', () => {
  for (const record of [
    { ...signal(), effectiveAt: '2025-07-01T00:00:00.000Z', simulatedAvailableAt: '2025-07-01T00:00:00.000Z' },
    { ...signal(), simulatedAvailableAt: '2025-07-01T00:00:00.000Z' },
  ]) assert.deepEqual(selectSignal([record], protocol.training.origin), { status: 'unavailable', value: null, fingerprint: null });
  const atBoundary = { ...signal(), value: 0, simulatedAvailableAt: protocol.training.origin };
  assert.equal(selectSignal([atBoundary], protocol.training.origin).value, 0);
});
test('observable signals: missing, delayed and unsupported signals fall back exactly to intercept correction', () => {
  for (const records of [[], [{ ...signal(), simulatedAvailableAt: '2025-07-01T00:00:00.000Z' }]]) {
    const result = forecastWithSignal(snapshot(), records, mechanicsFit());
    assert.equal(result.signalUsed, false); assert.equal(result.signalFallback, 'signal-unavailable');
    assert.equal(result.predictions['signal-adjusted'], result.predictions['intercept-only']);
    assert.equal(result.predictions['intercept-only'], result.predictions['recent-mean-3'] + 10);
  }
  const available = forecastWithSignal(snapshot(), [{ ...signal(), value: 0 }], mechanicsFit());
  assert.equal(available.signalUsed, true);
  assert.equal(available.predictions['signal-adjusted'], available.predictions['recent-mean-3'] + 2);
  const unsupported = mechanicsFit(); Object.assign(unsupported, { n: 18, signalSupported: false });
  unsupported.cells.forEach(cell => { cell.n = 9; });
  const result = forecastWithSignal(snapshot(), [signal()], unsupported);
  assert.equal(result.signalFallback, 'insufficient-training-cell-support');
  assert.equal(result.predictions['signal-adjusted'], result.predictions['intercept-only']);
});
test('observable signals: post-origin outcome mutation changes training labels, never snapshot features or point forecasts', () => {
  const altered = structuredClone(history);
  for (const branch of Object.values(altered.branches)) for (const row of branch.groups.releases) {
    if (row.status === 'complete' && row.value.month >= '2025-07') { row.value.voluntaryExits += 100; row.value.starts += 100; }
  }
  const afterSnapshot = replaySynthetic('turnover', altered.branches['no-shock'].groups.releases, protocol.training.origin);
  assert.deepEqual(afterSnapshot, snapshot());
  assert.deepEqual(forecastWithSignal(afterSnapshot, [altered.signalRelease], mechanicsFit()), forecastWithSignal(snapshot(), [signal()], mechanicsFit()));
  assert.notEqual(trainingRows(altered, 'informative')[0].actual, trainingRows(history, 'informative')[0].actual);
});

// 800 hand-built rows verify fit mechanics and frozen index coverage, not 100 simulated training histories.
function fitRows() {
  return protocol.models.trainingScenarios.flatMap(scenario => ['group-a', 'group-b', 'group-c', 'group-d'].flatMap(groupId =>
    Array.from({ length: 100 }, (_, index) => ({ seed: 4001 + index, scenario, groupId, signal: index % 2,
      signalFingerprint: 'mechanics', origin: protocol.training.origin, labelsAsOf: protocol.training.labelsAsOf,
      trainingEnd: '2025-05', inputFingerprint: 'mechanics', baseline: groupId === 'group-a' || groupId === 'group-b' ? 10 : null,
      actual: groupId === 'group-a' || groupId === 'group-b' ? 10 + 20 * (index % 2) : null,
      labelAvailableAt: groupId === 'group-a' || groupId === 'group-b' ? '2025-10-03T23:59:59.999Z' : null,
      reasonCodes: [] }))));
}
test('observable signals: fitting requires exactly 800 frozen training cells and valid label clocks', () => {
  const fit = fitSignalModels(fitRows());
  assert.equal(fit.informative['group-a'].intercept, 10);
  assert.deepEqual(fit.informative['group-a'].cells, [{ value: 0, n: 50, meanResidual: 0 }, { value: 1, n: 50, meanResidual: 20 }]);
  assert.equal(fit.informative['group-c'].n, 0); assert.equal(fit.informative['group-c'].intercept, null);
  assert.equal(fit.informative['group-c'].signalSupported, false);
  assert.throws(() => fitSignalModels(fitRows().slice(1)), /Every training seed/);
  for (const alter of [row => { row.seed = 5001; }, row => { row.seed = 4002; }, row => { row.scenario = 'reversed'; },
    row => { row.groupId = 'group-z'; }, row => { row.origin = protocol.test.origin; }, row => { row.labelsAsOf = protocol.test.labelsAsOf; },
    row => { row.labelAvailableAt = protocol.test.origin; }, row => { row.labelAvailableAt = null; }, row => { row.signal = null; }]) {
    const rows = fitRows(); alter(rows[0]); assert.throws(() => fitSignalModels(rows));
  }
  assert.throws(() => trainingRows({ ...history, split: 'test' }, 'informative'));
  assert.throws(() => trainingRows(history, 'reversed'));
});
test('observable signals: unsupported groups and invalid fit contracts never reveal predictions', () => {
  for (const groupId of ['group-c', 'group-d']) {
    const result = forecastWithSignal(snapshot(), [signal()], mechanicsFit(groupId));
    assert.ok(Object.values(result.predictions).every(value => value === null));
    assert.equal(result.publishedInterval, null); assert.equal(result.causalEffect, null);
    assert.equal(result.rate, null); assert.equal(result.individualRisk, null); assert.equal(result.operationallyQualified, false);
  }
  for (const alter of [fit => { fit.trainingLabelsAsOf = protocol.training.origin; }, fit => { fit.assignment = 'shock'; },
    fit => { fit.n = 99; }, fit => { fit.cells[0].meanResidual = NaN; }, fit => { fit.signalSupported = false; }]) {
    const fit = mechanicsFit(); alter(fit); assert.throws(() => forecastWithSignal(snapshot(), [signal()], fit));
  }
});
// Test-ID labels here are arithmetic row keys only; NO seed5001–5100 data generation.
function scoreRows() {
  return Array.from({ length: 100 }, (_, index) => ({ seed: 5001 + index, scenario: 'informative',
    assignedBranch: index < 50 ? 'no-shock' : 'shock', actual: index < 10 ? null : 15,
    forecast: { groupId: 'group-a', signal: { value: index % 2 }, predictions: {
      'recent-mean-3': index >= 20 && index < 30 ? null : 10, 'seasonal-naive-12': 14,
      'intercept-only': 12, 'signal-adjusted': index >= 10 && index < 20 ? null : 15,
    } }, delayedSignalControl: { equalsIntercept: true } }));
}
test('observable signals: summary separates common paired support, missing labels, strata and null metrics', () => {
  const result = summarizeSignalRows(scoreRows(), 'informative', 'group-a');
  assert.equal(result.intendedHistories, 100);
  assert.deepEqual([result.methods['recent-mean-3'].forecasted, result.methods['recent-mean-3'].scored, result.methods['recent-mean-3'].missingOutcome], [90, 80, 10]);
  assert.equal(result.methods['recent-mean-3'].mae, 5); assert.equal(result.methods['recent-mean-3'].rmse, 5); assert.equal(result.methods['recent-mean-3'].bias, -5);
  assert.equal(result.methods['signal-adjusted'].scored, 80); assert.equal(result.methods['signal-adjusted'].mae, 0);
  assert.deepEqual([result.comparisons['recent-mean-3'].commonScored, result.comparisons['recent-mean-3'].unpaired], [70, 30]);
  assert.equal(result.comparisons['recent-mean-3'].meanAbsoluteErrorDelta, -5);
  assert.equal(result.comparisons['recent-mean-3'].wins, 70); assert.equal(result.comparisons['recent-mean-3'].relativeMaeReduction, 1);
  assert.equal(result.comparisons['intercept-only'].commonScored, 80);
  assert.equal(result.strata.signal[0]['signal-adjusted'].intended, 50);
  assert.equal(result.strata.branch.shock['recent-mean-3'].intended, 50);
  assert.equal(result.informativeDescriptiveCriterion, false);
  assert.equal(result.delayedSignalFallbacks, 100); assert.equal(result.publishedInterval, null); assert.equal(result.operationallyQualified, false);
  const missing = scoreRows();
  for (const row of missing) for (const method of Object.keys(row.forecast.predictions)) row.forecast.predictions[method] = null;
  const empty = summarizeSignalRows(missing, 'informative', 'group-a');
  for (const method of Object.values(empty.methods)) { assert.equal(method.scored, 0); assert.equal(method.mae, null); assert.equal(method.rmse, null); }
  for (const comparison of Object.values(empty.comparisons)) { assert.equal(comparison.commonScored, 0); assert.equal(comparison.meanAbsoluteErrorDelta, null); assert.equal(comparison.relativeMaeReduction, null); }
});
test('observable signals: summaries reject missing, duplicate, training-seed and mismatched scenario rows', () => {
  for (const rows of [scoreRows().slice(1), [...scoreRows().slice(1), scoreRows()[1]], scoreRows().map(row => ({ ...row, seed: row.seed - 1000 }))]) {
    assert.throws(() => summarizeSignalRows(rows, 'informative', 'group-a'));
  }
  assert.throws(() => summarizeSignalRows(scoreRows(), 'no-signal', 'group-a'));
  assert.throws(() => summarizeSignalRows(scoreRows(), 'informative', 'group-b'));
});
