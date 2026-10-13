import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {predict, errors, evaluate, select, protocol} from '../experiments/swp-headcount/baselines.mjs';
import {swpBacktestWindows} from '../lib/swp-history-qualification.ts';
const months = Array.from({length: 33}, (_, i) => new Date(Date.UTC(2024, i, 1)).toISOString().slice(0, 7));
const points = months.map((month, i) => ({month, value: 100 + i * 2}));

test('known constant, linear and annual patterns have exact baseline forecasts', () => {
  for (const model of protocol.models) assert.deepEqual(predict(model, Array(12).fill(7)), Array(6).fill(7));
  for (const model of ['drift', 'linear-trend']) assert.deepEqual(predict(model, points.slice(0, 12).map(p => p.value)), [124, 126, 128, 130, 132, 134]);
  assert.deepEqual(predict('seasonal-naive', Array.from({length: 18}, (_, i) => i % 12)), [6, 7, 8, 9, 10, 11]);
  assert.deepEqual(predict('drift', Array.from({length: 12}, (_, i) => 11 - i)), Array(6).fill(0));
  assert.throws(() => predict('linear-trend', [1, 2]));
});
test('error metrics use signed prediction minus actual and equal weights', () => {
  assert.deepEqual(errors([{prediction: 4, actual: 1}, {prediction: 1, actual: 2}]), {n: 2, mae: 2, rmse: Math.sqrt(5), bias: 1});
});
test('ten origins use only past training and exclude every holdout observation', () => {
  const windows = swpBacktestWindows(months, 12, 6, 6);
  const result = evaluate(points.slice(0, 27), windows.development);
  for (const model of protocol.models) {
    assert.equal(result[model].overall.n, 60);
    assert.equal(result[model].byOrigin.length, 10);
    assert.ok(result[model].rows.every(r => r.origin < r.month && r.month < '2026-04'));
  }
  const changed = points.map((p, i) => ({...p, value: i >= 27 ? 999999 : p.value}));
  assert.deepEqual(evaluate(changed, windows.development), result);
  const changedTarget = points.map((p, i) => ({...p, value: i >= 12 ? 999999 : p.value}));
  const first = evaluate(changedTarget, [windows.development[0]]);
  for (const model of protocol.models) assert.deepEqual(first[model].rows.map(r => r.prediction), result[model].rows.slice(0, 6).map(r => r.prediction));
});
test('fixed selection rule prefers simpler models within 1%, with no holdout input', () => {
  const scores = values => Object.fromEntries(protocol.models.map((m, i) => [m, {overall: {mae: values[i]}}]));
  assert.equal(select(scores([10.05, 10.02, 10, 9.99])), 'last-value');
  assert.equal(select(scores([12, 11, 10, 9])), 'linear-trend');
  assert.equal(select(scores([1, 0, 2, 0])), 'drift');
});
test('two-stage runner freezes selection before holdout and rejects altered provenance', () => {
  const dir = mkdtempSync(join(tmpdir(), 'swp-baseline-'));
  try {
    const verified = {status: 'verified', references: ['authored-test-only']}, unknown = {status: 'unverified', references: []};
    const history = {scope: {dimension: 'company', id: 'test', population: 'test'}, metric: {kind: 'headcount', unit: 'people', definition: verified}, sourceId: 'test', sourceVersion: 'fixture', populationReconciliation: verified, historicalMembership: verified, completion: unknown, historicalVintages: unknown, points: points.slice(0, 27)};
    const dev = join(dir, 'dev.json'), frozen = join(dir, 'frozen.json'), holdout = join(dir, 'holdout.json'), result = join(dir, 'result.json');
    writeFileSync(dev, JSON.stringify(history));
    const run = (...args) => spawnSync(process.execPath, ['experiments/swp-headcount/run.mjs', ...args], {encoding: 'utf8'});
    assert.equal(run('develop', dev, frozen).status, 0); // Holdout does not exist yet.
    assert.notEqual(run('develop', dev, frozen).status, 0); // Freeze cannot be overwritten.
    writeFileSync(holdout, JSON.stringify({sourceId: 'test', sourceVersion: 'fixture', points: points.slice(27)}));
    assert.equal(run('holdout', holdout, frozen, result).status, 0);
    const r = JSON.parse(readFileSync(result));
    assert.equal(r.selected, 'drift'); assert.equal(r.holdout.drift.overall.mae, 0);
    assert.equal(r.operationalForecastAvailable, false); assert.equal(r.intervalAvailable, false);
    const original = JSON.parse(readFileSync(frozen));
    const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const mutations = {
      selection: f => {f.selected = 'last-value';},
      protocol: f => {f.protocol.simplicityTolerance = 1;},
      protocolRehashed: f => {f.protocol.horizonMonths = 3; f.protocolHash = digest(f.protocol);},
      history: f => {f.history.points[0].value += 1;},
      historyRehashed: f => {f.history.points[0].value += 1; f.inputHash = digest(f.history);},
      scopeRehashed: f => {f.history.scope.dimension = 'business-unit'; f.inputHash = digest(f.history);},
      calendarRehashed: f => {f.history.points[0].month = '2023-12'; f.inputHash = digest(f.history);},
      window: f => {f.windows.development[0].targets[0] = '2026-04';},
      holdoutWindow: f => {f.windows.holdout.origin = '2026-04';},
    };
    for (const [name, mutate] of Object.entries(mutations)) {
      const altered = structuredClone(original); mutate(altered); writeFileSync(frozen, JSON.stringify(altered));
      assert.notEqual(run('holdout', holdout, frozen, join(dir, name + '.json')).status, 0, name);
    }
  } finally {rmSync(dir, {recursive: true, force: true});}
});
