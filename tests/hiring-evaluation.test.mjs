import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeHiringProtocol, evaluateHiringBaselines, scoreAlignedPredictions} from '../lib/ml/hiring-evaluation.ts';
import {syntheticHiringManifest as manifest, syntheticHiringRow as row, syntheticHiringHistory as history} from './fixtures/hiring-evaluation.mjs';
const evaluate = (rows, patch = {}) => evaluateHiringBaselines({...manifest, ...patch}, rows);
const firstAudit = result => result.localAudit.folds[0];

test('protocol freezes exact calendar windows before any labels are supplied', () => {
  const protocol = freezeHiringProtocol(manifest);
  assert.deepEqual(protocol.development.map(f => [f.trainBefore, f.scoreBefore, f.observeThrough]), [
    ['2025-07-01', '2025-10-01', '2026-01-01'], ['2025-10-01', '2026-01-01', '2026-04-01'], ['2026-01-01', '2026-04-01', '2026-07-01'],
  ]);
  assert.equal(protocol.holdout.trainBefore, '2026-04-01'); assert.equal(protocol.holdout.scoreBefore, '2026-07-01');
  assert.equal(protocol.holdout.observeThrough, '2026-10-03');
  assert.ok(Object.isFrozen(protocol) && Object.isFrozen(protocol.manifest) && Object.isFrozen(protocol.development));
  assert.throws(() => {protocol.development[0].scoreBefore = '2099-01-01'});
});
test('month arithmetic crosses years and leap days without day-count approximations', () => {
  const protocol = freezeHiringProtocol({...manifest, asOf: '2024-02-29'});
  assert.equal(protocol.holdout.trainBefore, '2023-08-01'); assert.equal(protocol.holdout.scoreBefore, '2023-11-01');
  assert.equal(protocol.development[0].trainBefore, '2022-11-01');
  assert.throws(() => freezeHiringProtocol({...manifest, asOf: '2025-02-29'}));
  assert.throws(() => freezeHiringProtocol({...manifest, openingCoverageStart: '2022-01-02'}));
});
test('synthetic fixture exercises all count gates without training or deployment claims', () => {
  const result = evaluate(history());
  assert.equal(result.report.coverageMonths, 57);
  assert.equal(result.report.candidateReviewGatesPassed, true);
  assert.equal(result.report.openingCalendarCoverageEligible, true);
  assert.equal(result.report.modelTrained, false); assert.equal(result.report.deploymentValidated, false);
  for (const fold of result.report.folds) {
    assert.equal(fold.cohortCount, 36); assert.equal(fold.scoredCount, 36); assert.equal(fold.observedFraction, 1);
    assert.equal(fold.expanding.metrics.count, fold.rolling.metrics.count); assert.equal(fold.rolling.metrics.count, 36);
  }
  assert.notEqual(result.report.folds[0].expanding.medianDays, result.report.folds[0].rolling.medianDays);
});
test('training requires opening before cutoff and label observable at the exact cutoff', () => {
  const result = evaluate([
    row({requisitionId: 'known-at-cutoff', startDate: '2025-07-01', labelFirstObservedAt: '2025-07-01T00:00:00.000Z'}),
    row({requisitionId: 'one-ms-late', startDate: '2025-07-01', labelFirstObservedAt: '2025-07-01T00:00:00.001Z'}),
    row({requisitionId: 'cutoff-opening', openedDate: '2025-07-01', closedDate: '2025-07-01', startDate: '2025-07-01', timeToFillDays: 0, labelFirstObservedAt: '2025-07-01T00:00:00.000Z'}),
  ]);
  assert.deepEqual(firstAudit(result).trainIds, ['known-at-cutoff']);
  assert.deepEqual(firstAudit(result).unavailableTrainingIds, ['one-ms-late']);
  assert.deepEqual(firstAudit(result).scoreIds, ['cutoff-opening']);
  assert.equal(result.report.folds[0].unavailableTrainingCount, 1);
});
test('opening cohorts are half-open and later folds may train on earlier observed cohorts', () => {
  const result = evaluate([
    row({requisitionId: 'last-september', openedDate: '2025-09-30', closedDate: '2025-09-30', startDate: '2025-09-30', timeToFillDays: 0, labelFirstObservedAt: '2025-09-30T00:00:00.000Z'}),
    row({requisitionId: 'first-october', openedDate: '2025-10-01', closedDate: '2025-10-01', startDate: '2025-10-01', timeToFillDays: 0, labelFirstObservedAt: '2025-10-01T00:00:00.000Z'}),
  ]);
  assert.deepEqual(firstAudit(result).scoreIds, ['last-september']);
  assert.deepEqual(result.localAudit.folds[1].scoreIds, ['first-october']);
  assert.ok(result.localAudit.folds[1].trainIds.includes('last-september'));
  for (const fold of result.localAudit.folds) assert.ok(fold.trainIds.every(id => !fold.scoreIds.includes(id)));
});
test('development observation stops at its frozen boundary and holdout includes the extraction day', () => {
  const result = evaluate([
    row({requisitionId: 'late-development', openedDate: '2025-07-01', closedDate: '2025-07-10', startDate: '2025-07-20', labelFirstObservedAt: '2026-01-01T00:00:00.001Z'}),
    row({requisitionId: 'holdout-day-end', openedDate: '2026-04-01', closedDate: '2026-04-10', startDate: '2026-04-20', labelFirstObservedAt: '2026-10-03T23:59:59.999Z'}),
    row({requisitionId: 'after-extract', openedDate: '2026-04-01', closedDate: '2026-04-10', startDate: '2026-04-20', labelFirstObservedAt: '2026-10-04T00:00:00.000Z'}),
  ]);
  assert.equal(firstAudit(result).scoreIds.length, 0);
  assert.deepEqual(firstAudit(result).unscored, [{id: 'late-development', reason: 'not-observed-by-boundary'}]);
  assert.deepEqual(result.localAudit.folds[3].scoreIds, ['holdout-day-end']);
  assert.equal(result.report.auditCounts.futureLabelObservationTime, 1);
});
test('rolling baseline uses closure window boundaries, never a full-history fallback', () => {
  const result = evaluate([
    row({requisitionId: 'old', openedDate: '2024-06-01', closedDate: '2024-06-30', startDate: '2024-07-01', labelFirstObservedAt: '2024-07-02T00:00:00.000Z'}),
    row({requisitionId: 'window-start', openedDate: '2024-06-01', closedDate: '2024-07-01', startDate: '2024-07-02', labelFirstObservedAt: '2024-07-03T00:00:00.000Z'}),
    row({requisitionId: 'cutoff-closure', openedDate: '2025-06-01', closedDate: '2025-07-01', startDate: '2025-07-01', labelFirstObservedAt: '2025-07-01T00:00:00.000Z'}),
  ]);
  assert.deepEqual(firstAudit(result).rollingTrainIds, ['window-start']);
  const empty = evaluate([row({openedDate: '2022-01-01', closedDate: '2022-01-10', startDate: '2022-01-20', labelFirstObservedAt: '2022-01-21T00:00:00.000Z'})]);
  assert.equal(empty.report.folds[0].rolling.medianDays, null); assert.equal(empty.report.folds[0].rolling.metrics, null);
  assert.equal(empty.report.folds[0].expanding.medianDays, 19);
  assert.ok(empty.report.folds[0].failedGates.includes('rollingBaselineAvailable'));
});
test('future or missing starts remain unscored and never become zero targets', () => {
  const result = evaluate([
    row({requisitionId: 'future', openedDate: '2026-04-01', closedDate: '2026-04-10', startDate: '2026-12-01', labelFirstObservedAt: '2026-12-02T00:00:00.000Z'}),
    row({requisitionId: 'missing', openedDate: '2026-04-01', closedDate: '2026-04-10', startDate: null, labelFirstObservedAt: null}),
    row({requisitionId: 'open', openedDate: '2026-04-01', status: 'open', closedDate: null, startDate: null, labelFirstObservedAt: null, timeToFillDays: null}),
  ]);
  assert.equal(result.report.auditCounts.futureStart, 1); assert.equal(result.report.auditCounts.missingStart, 2);
  const fold = result.report.folds[3];
  assert.equal(fold.cohortCount, 3); assert.equal(fold.scoredCount, 0); assert.equal(fold.observedFraction, 0);
  assert.equal(fold.unscoredCount, 3); assert.equal(fold.expanding.metrics, null);
});
test('duplicates are all excluded and prevent a misleading observation-rate gate', () => {
  const base = row();
  for (const duplicate of [base, {...base, startDate: '2025-06-22'}]) {
    const result = evaluate([base, duplicate]);
    assert.equal(result.report.auditCounts.duplicateIdsExcluded, 1); assert.equal(result.report.auditCounts.duplicateId, 2);
    assert.equal(firstAudit(result).trainIds.length, 0); assert.equal(result.report.folds[0].observedFraction, null);
    assert.ok(result.report.folds[0].failedGates.includes('cohortIntegrity'));
  }
});
test('invalid dates, missing IDs and out-of-period openings are audited without silent denominator repair', () => {
  const result = evaluate([row({requisitionId: null}), row({requisitionId: 'bad-date', openedDate: '2025-02-30'}), row({requisitionId: 'missing-date', openedDate: null}), row({requisitionId: 'future-opening', openedDate: '2027-01-01'})]);
  assert.equal(result.report.auditCounts.missingId, 1); assert.equal(result.report.auditCounts.invalidOpening, 1);
  assert.equal(result.report.auditCounts.missingOpening, 1); assert.equal(result.report.auditCounts.outsideOpeningCoverage, 1);
  assert.equal(result.localAudit.excluded.length, 4); assert.equal(result.report.candidateReviewGatesPassed, false);
});
test('scope and acceptance/start chronology are validated before labels are eligible', () => {
  const result = evaluate([
    row({requisitionId: 'internal', externalInternal: 'internal'}), row({requisitionId: 'other-role', jobProfileCode: 'OTHER'}),
    row({requisitionId: 'before-accepted', startDate: '2025-06-02'}), row({requisitionId: 'observed-too-early', labelFirstObservedAt: '2025-06-19T00:00:00.000Z'}),
    row({requisitionId: 'bad-acceptance', timeToFillDays: -1}),
  ]);
  assert.equal(result.report.auditCounts.outsideScope, 2); assert.equal(result.report.auditCounts.invalidChronology, 2);
  assert.equal(result.report.auditCounts.missingOrInvalidAcceptance, 1); assert.equal(firstAudit(result).trainIds.length, 0);
});
test('missing label availability and unverifiable cohort provenance explicitly block review', () => {
  const rows = history(); rows[0].labelFirstObservedAt = null;
  assert.ok(evaluate(rows).report.folds.every(f => f.failedGates.includes('timestampedLabelHistory')));
  for (const patch of [{cohortCoverage: 'completed-fills-only'}, {statusHistoryVerified: false}]) {
    const result = evaluate(history(), patch);
    assert.ok(result.report.folds.every(f => f.observedFraction === null && f.failedGates.includes('completeOpeningCohort')));
  }
  assert.ok(evaluate(history(), {openingScopeVerified: false}).report.folds[0].failedGates.includes('verifiedOpeningScope'));
});
test('the 90 percent observation gate uses all distinct cohort openings including unresolved cases', () => {
  const rows = history();
  for (let i = 0; i < 5; i++) rows.push(row({requisitionId: 'unresolved-' + i, openedDate: '2026-04-15', status: 'cancelled', closedDate: '2026-04-20', startDate: null, labelFirstObservedAt: null}));
  const fold = evaluate(rows).report.folds[3];
  assert.equal(fold.cohortCount, 41); assert.equal(fold.scoredCount, 36); assert.equal(fold.observedFraction, 36 / 41);
  assert.ok(fold.failedGates.includes('sufficientObservation'));
});
test('sample and coverage gates fail rather than widening population or windows', () => {
  const result = evaluate([row()]);
  assert.ok(result.report.folds[0].failedGates.includes('enoughTrainingLabels'));
  assert.ok(result.report.folds[0].failedGates.includes('enoughScoredLabels'));
  assert.equal(result.report.openingCalendarCoverageEligible, false);
  const short = evaluate(history().filter(r => r.openedDate >= '2025-01-01'), {openingCoverageStart: '2025-01-01'});
  assert.ok(short.report.folds[0].failedGates.includes('sufficientOpeningCoverage'));
  assert.equal(short.report.protocol.holdout.trainBefore, '2026-04-01');
});
test('metric contract uses aligned IDs, signed prediction error and interpolated p90 without MAPE', () => {
  const actual = [{id: 'zero', days: 0}, {id: 'ten', days: 10}, {id: 'twenty', days: 20}];
  const predictions = [{id: 'twenty', days: 14}, {id: 'zero', days: 2}, {id: 'ten', days: 10}];
  const metrics = scoreAlignedPredictions(actual, predictions);
  assert.equal(metrics.count, 3); assert.equal(metrics.maeDays, 8 / 3); assert.equal(metrics.medianAbsoluteErrorDays, 2);
  assert.equal(metrics.p90AbsoluteErrorDays, 5.2); assert.equal(metrics.meanSignedErrorDays, -4 / 3);
  assert.deepEqual(Object.keys(metrics), ['count', 'maeDays', 'medianAbsoluteErrorDays', 'p90AbsoluteErrorDays', 'meanSignedErrorDays']);
});
test('metric scoring refuses duplicates, missing/extra IDs, nonfinite and negative predictions', () => {
  const actual = [{id: 'a', days: 10}, {id: 'b', days: 20}];
  for (const predicted of [[{id: 'a', days: 2}], [{id: 'a', days: 2}, {id: 'a', days: 3}], [{id: 'a', days: 2}, {id: 'c', days: 3}], [{id: 'a', days: NaN}, {id: 'b', days: 3}], [{id: 'a', days: -1}, {id: 'b', days: 3}]]) assert.throws(() => scoreAlignedPredictions(actual, predicted));
  assert.throws(() => scoreAlignedPredictions([], []));
});
test('holdout target changes cannot alter frozen windows or any training baseline', () => {
  const rows = history(), before = evaluate(rows);
  const changed = rows.map(r => r.openedDate >= '2026-04-01' && r.openedDate < '2026-07-01' ? {...r, startDate: '2026-09-01', labelFirstObservedAt: '2026-09-02T00:00:00.000Z'} : r);
  const after = evaluate(changed);
  assert.deepEqual(after.report.protocol, before.report.protocol);
  assert.deepEqual(after.report.folds.map(f => [f.rolling.medianDays, f.expanding.medianDays]), before.report.folds.map(f => [f.rolling.medianDays, f.expanding.medianDays]));
  assert.notEqual(after.report.folds[3].rolling.metrics.maeDays, before.report.folds[3].rolling.metrics.maeDays);
});
test('output is deterministic, immutable, and keeps local IDs outside aggregate results', () => {
  const rows = history(), copy = structuredClone(rows), first = evaluate(rows), reversed = evaluate([...rows].reverse());
  assert.deepEqual(rows, copy); assert.deepEqual(first, reversed);
  assert.match(first.report.datasetFingerprint, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(first.report).includes(rows[0].requisitionId));
  assert.ok(JSON.stringify(first.localAudit).includes(rows[0].requisitionId));
  assert.ok(Object.isFrozen(first.report.folds[0].gates));
});
test('real provenance and unsolicited post-opening or employee fields are rejected', () => {
  assert.throws(() => evaluate([row()], {provenance: 'real'}));
  assert.throws(() => evaluate([row()], {purpose: 'production-prediction'}));
  for (const field of ['applicants', 'acceptedOffers', 'employeeId', 'country', 'features']) assert.throws(() => evaluate([{...row(), [field]: 'not accepted'}]));
});
test('target outliers outside the training observation boundary cannot change baselines', () => {
  const rows = history(), cutoff = '2025-07-01';
  const late = row({requisitionId: 'historically-unavailable', openedDate: '2024-01-01', closedDate: '2024-01-10', startDate: '2025-06-20', labelFirstObservedAt: cutoff + 'T00:00:00.001Z'});
  const before = evaluate(rows).report.folds[0], after = evaluate([...rows, late]).report.folds[0];
  assert.equal(after.expanding.medianDays, before.expanding.medianDays);
  assert.equal(after.rolling.medianDays, before.rolling.medianDays);
});
test('calendar candidate remains gated when only one month of year varies across years', () => {
  const januaryOnly = history().filter(r => r.openedDate.slice(5, 7) === '01');
  const result = evaluate(januaryOnly);
  assert.ok(result.report.folds.every(f => f.distinctTrainingCalendarMonths === 1));
  assert.equal(result.report.openingCalendarCoverageEligible, false);
  assert.equal(result.report.candidateReviewGatesPassed, false);
});
test('audit order and fingerprints remain deterministic for exclusions and property order', () => {
  const rows = [row({requisitionId: 'z', openedDate: 'invalid'}), row({requisitionId: 'a', openedDate: null})];
  const reordered = rows.reverse().map(item => Object.fromEntries(Object.entries(item).reverse()));
  assert.deepEqual(evaluate(reordered), evaluate([...reordered].reverse()));
  assert.deepEqual(freezeHiringProtocol(Object.fromEntries(Object.entries(manifest).reverse())), freezeHiringProtocol(manifest));
});
test('nonfinite input cannot collide with missing numeric values in the dataset fingerprint', () => {
  assert.throws(() => evaluate([row({timeToFillDays: NaN})]));
  assert.throws(() => evaluate([row({timeToFillDays: Infinity})]));
  assert.throws(() => scoreAlignedPredictions([{id: 'a', days: 1}], [{id: 'a', days: Number.MAX_VALUE}]));
});
test('sample and observation thresholds include their exact boundary values', () => {
  const all = history(), training = all.filter(r => r.openedDate < '2025-07-01' && r.labelFirstObservedAt <= '2025-07-01T00:00:00.000Z').slice(0, 60);
  const scoring = all.filter(r => r.openedDate >= '2025-07-01' && r.openedDate < '2025-10-01').slice(0, 20);
  let fold = evaluate([...training, ...scoring]).report.folds[0];
  assert.equal(fold.gates.enoughTrainingLabels, true); assert.equal(fold.gates.enoughScoredLabels, true);
  fold = evaluate([...training.slice(1), ...scoring.slice(1)]).report.folds[0];
  assert.equal(fold.gates.enoughTrainingLabels, false); assert.equal(fold.gates.enoughScoredLabels, false);
  const unresolved = Array.from({length: 4}, (_, index) => row({requisitionId: 'unresolved-boundary-' + index, openedDate: '2026-04-15', status: 'open', closedDate: null, startDate: null, labelFirstObservedAt: null}));
  fold = evaluate([...all, ...unresolved]).report.folds[3];
  assert.equal(fold.observedFraction, 0.9); assert.equal(fold.gates.sufficientObservation, true);
  const noHoldout = all.filter(r => r.openedDate < '2026-04-01' || r.openedDate >= '2026-07-01');
  const holdout = all.filter(r => r.openedDate >= '2026-04-01' && r.openedDate < '2026-07-01');
  assert.equal(evaluate([...noHoldout, ...holdout.slice(0, 30)]).report.folds[3].gates.enoughScoredLabels, true);
  assert.equal(evaluate([...noHoldout, ...holdout.slice(0, 29)]).report.folds[3].gates.enoughScoredLabels, false);
});
