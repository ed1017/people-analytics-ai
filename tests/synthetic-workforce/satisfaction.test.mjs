import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateSatisfaction } from '../../lib/ml/synthetic-workforce/satisfaction.mjs';
import { monthsFor } from '../../lib/ml/synthetic-workforce/common.mjs';
const config = JSON.parse(readFileSync(new URL('../../lib/ml/synthetic-workforce/protocol.json', import.meta.url), 'utf8'));
// Explicit constructed monthly stock, not a company extract or recovered history.
const workforce = monthsFor(config).map((month, index) => ({ month, startHeadcount: 8400 + index * 10, endHeadcount: 8410 + index * 10 }));
const make = (family = 'stationary', seed = 17, stock = workforce) => generateSatisfaction(config, { seed, family, workforce: stock });
const asOf = (rows, cutoff) => {
  const selected = new Map();
  for (const row of rows) if (row.simulatedAvailableAt <= cutoff && (!selected.has(row.recordKey) || selected.get(row.recordKey).revision < row.revision)) selected.set(row.recordKey, row);
  return [...selected.values()];
};

test('synthetic satisfaction: frozen seeds/families reproducible, with 24 new quarterly waves', () => {
  for (const family of config.families) for (const seed of config.seeds) {
    const result = make(family, seed);
    assert.deepEqual(result, make(family, seed));
    assert.equal(result.truth.length, 24);
    assert.equal(result.truth[0].month, '2021-03'); assert.equal(result.truth.at(-1).month, '2026-12');
    assert.ok(result.releases.every(row => row.sourceObservedAt === null));
  }
});
test('synthetic satisfaction: eligible stock, respondent and item denominators reconcile', () => {
  const result = make();
  for (const row of result.truth) {
    const value = row.value;
    assert.equal(value.eligible, workforce.find(stock => stock.month === row.month).endHeadcount);
    assert.equal(value.submitted + value.nonrespondents, value.eligible);
    assert.equal(value.respondents + value.invalidRespondents, value.submitted);
    assert.equal(value.validAnswerCount + value.invalidAnswerCount + value.missingAnswerCount, value.submitted * 5);
    assert.ok(value.invalidRespondents > 0 && value.invalidAnswerCount > 0 && value.nonrespondents > 0);
    assert.ok(value.scoredAnswerCount >= value.respondents * 2 && value.scoredAnswerCount <= value.respondents * 5);
    assert.ok(value.favorableAnswerCount <= value.scoredAnswerCount);
    assert.equal(value.scorePct, 100 * value.shareSum / value.respondents);
    assert.equal(value.participationPct, 100 * value.respondents / value.eligible);
    assert.ok(value.scorePct >= 0 && value.scorePct <= 100);
  }
  // Varying numbers of valid answers: averaging respondent shares differs from item pooling.
  assert.ok(result.truth.some(({ value }) => Math.abs(value.scorePct - 100 * value.favorableAnswerCount / value.scoredAnswerCount) > 1e-5));
});
test('synthetic satisfaction: genuine zero distinct from unknown, partial and suppressed', () => {
  const result = make();
  const zero = result.releases[0];
  assert.equal(zero.status, 'complete'); assert.equal(zero.value.scorePct, 0); assert.equal(zero.value.shareSum, 0);
  assert.ok(zero.value.respondents > 0);
  for (const state of ['partial', 'missing', 'suppressed']) {
    const row = result.releases.find(release => release.status === state);
    for (const field of ['scorePct', 'shareSum', 'respondents', 'eligible', 'participationPct']) assert.equal(row.value[field], null);
    assert.equal(result.coverage.find(c => c.recordKey === row.recordKey && c.revision === row.revision).complete, false);
  }
  const empty = make('stationary', 17, workforce.map(row => ({ ...row, endHeadcount: 0 })));
  assert.equal(empty.truth[0].value.respondents, 0); assert.equal(empty.truth[0].value.scorePct, null);
});
test('synthetic satisfaction: late corrections preserve earlier vintages across frozen cutoffs', () => {
  const result = make('reporting-stress');
  for (const row of result.releases) {
    assert.ok(row.simulatedAvailableAt > row.effectiveAt);
    assert.equal(row.supersedes, row.revision === 1 ? null : row.revision - 1);
  }
  const key = 'satisfaction:2026-06';
  const initial = result.releases.find(row => row.recordKey === key && row.revision === 1);
  const correction = result.releases.find(row => row.recordKey === key && row.revision === 2);
  assert.ok(initial.simulatedAvailableAt > config.windows.assessmentOrigin);
  assert.ok(correction.simulatedAvailableAt > initial.simulatedAvailableAt);
  assert.equal(initial.value.eligible - correction.value.eligible, 20);
  const before = asOf(result.releases, initial.simulatedAvailableAt).find(row => row.recordKey === key);
  assert.equal(before.revision, 1);
  assert.equal(asOf(result.releases, correction.simulatedAvailableAt).find(row => row.recordKey === key).revision, 2);
  assert.equal(asOf(result.releases, config.windows.assessmentOrigin).some(row => row.recordKey === key), false);
  const clone = structuredClone(result.releases); clone.find(row => row.recordKey === key && row.revision === 2).value.scorePct = 99;
  assert.deepEqual(asOf(clone, initial.simulatedAvailableAt), asOf(result.releases, initial.simulatedAvailableAt));
  assert.ok(result.releases.every(row => row.simulatedAvailableAt < config.finalScoringCutoff));
});
test('synthetic satisfaction: July instrument break explicitly forbids cross-instrument comparisons', () => {
  const broken = make('survey-break');
  const before = broken.truth.find(row => row.month === '2026-06').value;
  const after = broken.truth.find(row => row.month === '2026-09').value;
  assert.notEqual(before.instrumentVersion, after.instrumentVersion);
  assert.equal(after.comparability, 'blocked-instrument-break');
  assert.equal(before.scoringVersion, after.scoringVersion);
  assert.equal(new Set(make().truth.map(row => row.value.instrumentVersion)).size, 1);
  assert.deepEqual(broken.definitions.reverseItems, []); assert.deepEqual(broken.definitions.excludedItems, []);
  assert.equal(broken.definitions.itemWeighting, 'equal');
  assert.match(broken.definitions.assumptionBasis, /not recovered/);
  assert.match(broken.definitions.releaseClaim, /not a privacy/);
});
test('synthetic satisfaction: no person identity or truth parameters leak into releases', () => {
  const result = make();
  for (const row of result.releases) {
    assert.equal(row.value.favorableProbability, undefined); assert.equal(row.value.responseProbability, undefined);
    assert.equal(row.value.employeeId, undefined); assert.equal(row.value.personId, undefined);
  }
  const snapshot = structuredClone(result.releases);
  result.truth[0].value.scorePct = 99;
  assert.deepEqual(result.releases, snapshot);
  assert.throws(() => make('unknown'), /Unsupported/);
  assert.throws(() => make('stationary', 999), /Unsupported/);
  assert.throws(() => make('stationary', 17, workforce.slice(1)), /Missing/);
  assert.throws(() => make('stationary', 17, [...workforce, workforce[0]]), /Invalid/);
});

test('synthetic satisfaction: numeric assumptions are explicit new generation rules', () => {
  const assumptions = make().definitions.generationAssumptions;
  assert.deepEqual(assumptions.submissionProbability, { ordinary: 0.73, reportingStress: 0.48 });
  assert.equal(assumptions.cadenceMonths, 3); assert.equal(assumptions.itemsPerSubmission, 5);
  assert.equal(assumptions.unusableSubmissionProbability, 0.025);
  assert.equal(assumptions.missingItemProbabilityConditionalOnUsableSubmission, 0.12);
  assert.equal(assumptions.invalidAnswerProbabilityConditionalOnNonmissingItem, 0.025);
  assert.equal(assumptions.correctionLagDaysFromClose, 130);
  assert.match(assumptions.responseSampling, /not recovery/);
  assert.match(assumptions.nonresponseAssumption, /does not prove/);
});
