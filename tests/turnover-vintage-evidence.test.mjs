import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateTurnoverReadinessSnapshots as evaluate, vintageProtocol } from '../lib/ml/turnover-vintage-evaluation.mjs';
import { generateTurnoverVintages as generate } from './fixtures/turnover-vintage-generator.mjs';
import { evidenceCheckpoint } from './manual/predictive-evidence-checkpoint.mjs';
const predictions = fold => fold.methods.map(m => ({ method: m.method, values: m.points.map(p => p.prediction) }));
test('fixed rolling origins, aligned baselines and independent metric arithmetic', () => {
  const report = evaluate(generate()); assert.equal(report.status, 'evaluated-constructed-fixture');
  assert.deepEqual(report.folds.map(f => f.trainingMonths), [24, 27, 30, 33]);
  assert.equal(new Set(report.folds.flatMap(f => f.targets)).size, 12);
  for (const fold of report.folds) assert.deepEqual(fold.methods[0].points.map(p => p.month), fold.methods[1].points.map(p => p.month));
  for (const comparison of report.comparisons) {
    const errors = report.folds.flatMap(f => f.methods.find(m => m.method === comparison.method).points.map(p => p.prediction - p.actual));
    const totals = report.folds.map(f => f.methods.find(m => m.method === comparison.method).points.reduce((n, p) => n + p.prediction - p.actual, 0));
    assert.equal(comparison.monthly.mae, errors.reduce((n, e) => n + Math.abs(e), 0) / 12);
    assert.equal(comparison.monthly.rmse, Math.sqrt(errors.reduce((n, e) => n + e ** 2, 0) / 12));
    assert(Math.abs(comparison.quarterly.mae - totals.reduce((n, e) => n + Math.abs(e), 0) / 4) < 1e-10);
  }
});
test('future label mutation changes scores but not earlier-origin predictions', () => {
  const snapshots = generate(), before = evaluate(snapshots);
  for (const snapshot of snapshots) for (const row of snapshot.records) if (row.value.period >= '2025-01') row.value.voluntaryExits += 100;
  const after = evaluate(snapshots);
  assert.deepEqual(predictions(after.folds[0]), predictions(before.folds[0]));
  assert.equal(after.folds[0].trainingFingerprint, before.folds[0].trainingFingerprint);
  assert.notDeepEqual(after.comparisons, before.comparisons);
});
test('scoring snapshot cannot affect predictions at any origin', () => {
  const snapshots = generate(), before = evaluate(snapshots);
  for (const row of snapshots[4].records) row.value.voluntaryExits += 50;
  const after = evaluate(snapshots);
  assert.deepEqual(after.folds.map(predictions), before.folds.map(predictions));
  assert.notDeepEqual(after.comparisons, before.comparisons);
});
test('one-millisecond-late correction does not rewrite earlier training vintage', () => {
  const snapshots = generate(), before = evaluate(snapshots);
  for (const snapshot of snapshots) snapshot.records.at(-1).value.voluntaryExits += 100;
  const after = evaluate(snapshots);
  for (const i of [0, 1]) { assert.deepEqual(predictions(after.folds[i]), predictions(before.folds[i])); assert.equal(after.folds[i].trainingFingerprint, before.folds[i].trainingFingerprint); }
  assert.notEqual(after.folds[2].trainingFingerprint, before.folds[2].trainingFingerprint);
  // The seasonal lag uses the revised November count at the later September origin.
  assert.notDeepEqual(predictions(after.folds[3]), predictions(before.folds[3]));
});
test('missing completion or availability blocks rather than imputes or silently drops folds', () => {
  for (const change of [s => { s.manifest.completion = null; }, s => { s.records[0].observedAt = null; }, s => { s.records.splice(5, 1); }, s => { s.records[5].value.voluntaryExits = null; }]) {
    const snapshots = generate(); change(snapshots[0]); const report = evaluate(snapshots);
    assert.equal(report.status, 'blocked'); assert.equal(report.comparisons, null); assert.deepEqual(report.folds[0].methods, []);
    assert.equal(report.folds[1].status, 'evaluated-constructed-fixture');
  }
});
test('unknown scoring maturity keeps predictions but withholds errors and aggregate comparison', () => {
  const snapshots = generate(); snapshots[4].manifest.completion = null;
  const report = evaluate(snapshots); assert.equal(report.comparisons, null);
  for (const fold of report.folds) for (const method of fold.methods) for (const point of method.points) { assert.equal(typeof point.prediction, 'number'); assert.equal(point.actual, null); assert.equal(point.error, null); }
});
test('source or target scope mismatch cannot produce a scored comparison', () => {
  const snapshots = generate(); snapshots[4].manifest.generatorVersion = 'another-generator';
  assert(evaluate(snapshots).folds.every(f => f.scoringReasons.includes('snapshot-scope-mismatch')));
  const wrong = generate(); wrong[0].target.measure = 'voluntary-rate';
  assert(evaluate(wrong).folds[0].predictionReasons.includes('count-target-required'));
});
test('existing-source declarations, arbitrary features and shifted cutoffs fail closed', () => {
  for (const change of [s => { s.manifest.dataClass = 'company-extract'; }, s => { s.records[0].value.managerRating = 5; }, s => { s.cutoff = '2025-01-02T00:00:00.000Z'; }]) {
    const snapshots = generate(); change(snapshots[0]); assert.equal(evaluate(snapshots).status, 'blocked');
  }
});
test('duplicate calendar periods, including distinct record keys, are rejected', () => {
  const snapshots = generate(); const duplicate = structuredClone(snapshots[0].records[0]); duplicate.recordKey = 'duplicate-month'; snapshots[0].records.push(duplicate);
  assert(evaluate(snapshots).folds[0].predictionReasons.includes('protocol-history-incomplete'));
});
test('generator is repeatable without guaranteeing a winner; zero counts survive', () => {
  assert.deepEqual(generate(), generate()); assert.notDeepEqual(generate(), generate(43));
  assert.equal(generate()[0].records[7].value.voluntaryExits, 0);
  const snapshots = generate(), copy = structuredClone(snapshots), result = evaluate(snapshots); assert.deepEqual(snapshots, copy);
  assert.equal(result.realWorldPerformanceValidated, false); assert.equal(result.predictionInterval, null); assert.equal(result.causalEffect, null); assert.equal(result.rate, null);
  assert(Object.isFrozen(result.folds[0].methods[0].points)); assert.equal(vintageProtocol.selection, 'none; paired baseline comparison only');
});
test('offline checkpoint reproduces tracked evidence and preserves preview benchmark', async () => {
  const report = await evidenceCheckpoint();
  assert.deepEqual(report, JSON.parse(await readFile(new URL('../docs/evidence/predictive-evidence-checkpoint.json', import.meta.url))));
  for (const domain of ['turnover', 'satisfaction', 'hiring']) { const checks = report.sourceEvidence[domain].checks; assert.equal(checks.forecast.status, 'blocked'); assert.equal(checks.causalEffect.status, 'blocked'); assert.equal(checks.availableHistoryRows, 0); }
  assert.deepEqual(report.existingPreviewBenchmark.previewAgreement, { selectedMethod: true, protocolFingerprint: true });
  assert.equal(report.existingPreviewBenchmark.selection.method, 'recent-mean-3');
  assert.equal(report.existingPreviewBenchmark.assessment[0].metrics.overall.mae, 7 / 3);
  assert.equal(report.constructedVintageEvaluation.status, 'evaluated-constructed-fixture');
});

test('same revision cannot silently change between training and scoring snapshots', () => { const snapshots = generate(); snapshots[4].records[0].value.voluntaryExits += 1; const r = evaluate(snapshots); assert.equal(r.comparisons, null); assert(r.folds.every(f => f.scoringReasons.includes('snapshot-revision-conflict'))); });
test('recorded zero is scored and contributes to the next origin instead of being dropped', () => {
  const snapshots = generate();
  for (const snapshot of snapshots) for (const row of snapshot.records) row.value.voluntaryExits = row.value.period === '2025-01' ? 0 : 10;
  const report = evaluate(snapshots); assert.equal(report.status, 'evaluated-constructed-fixture');
  assert.equal(report.folds[0].methods[0].points[0].actual, 0);
  assert.equal(report.folds[0].methods[0].points[0].error, 10);
  assert.equal(report.folds[1].methods[0].points[0].prediction, 20 / 3);
  assert.equal(report.folds[1].methods[1].points[0].prediction, 10);
});
