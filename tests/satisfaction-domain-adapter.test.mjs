import test from 'node:test';
import assert from 'node:assert/strict';
import { satisfactionDomainEvidence } from '../lib/ml/satisfaction-domain-adapter.mjs';
import { fixture, at } from './fixtures/predictive-readiness.mjs';

// Explicitly constructed fixture scoring declaration, never company provenance.
const definition = () => ({ version: 'score1', responseScale: [1, 2, 3, 4, 5], favorableValues: [4, 5],
  respondentAggregation: 'mean-of-respondent-answered-item-shares', missingItemPolicy: 'answered-items-only',
  minimumAnsweredItems: 1, itemWeighting: 'equal', reverseItems: [], excludedItems: [], evidenceRef: 'constructed-scoring-fixture-v1' });
const run = input => satisfactionDomainEvidence(input, definition());
function secondWave(input) {
  const row = structuredClone(input.records[0]);
  Object.assign(row, { recordKey: 'aggregate-2', effectiveAt: at('2026-03-31'), observedAt: at('2026-04-01') });
  Object.assign(row.value, { waveId: 'wave-2', launchAt: at('2026-03-01'), closeAt: at('2026-03-30') });
  input.records.push(row); return row;
}

test('satisfaction: declared synthetic waves expose score and coverage separately, never forecast accuracy', () => {
  const input = fixture('satisfaction'); secondWave(input);
  const result = run(input);
  assert.equal(result.status, 'unqualified'); assert.equal(result.contractStatus, 'passed');
  assert.equal(result.evidenceKind, 'synthetic-mechanics-only');
  assert.deepEqual(result.waves.map(row => [row.scorePct, row.respondents, row.eligible, row.participationPct]), [[75, 60, 100, 60], [75, 60, 100, 60]]);
  assert.equal(result.forecast, null); assert.equal(result.causalEffect, null);
  assert.equal(result.forecastingPerformanceValidated, false); assert.equal(result.sourceTruthVerified, false);
});
test('satisfaction: missing completeness and observation cannot become qualified', () => {
  const input = fixture('satisfaction'); delete input.manifest.completion; delete input.records[0].observedAt;
  const result = run(input);
  assert.equal(result.status, 'unqualified'); assert.deepEqual(result.waves, []);
  for (const reason of ['completeness-unknown', 'availability-unknown', 'no-available-history']) assert.ok(result.missingInputs.includes(reason));
});
test('satisfaction: scoring version alone is insufficient, incompatible declared version blocks', () => {
  const input = fixture('satisfaction');
  assert.ok(satisfactionDomainEvidence(input).missingInputs.includes('score-definition-unavailable-or-unsupported'));
  const score = definition(); score.version = 'different';
  assert.ok(satisfactionDomainEvidence(input, score).missingInputs.includes('score-definition-version-mismatch'));
  score.version = 'score1'; score.favorableValues = [6];
  assert.ok(satisfactionDomainEvidence(input, score).missingInputs.includes('score-definition-unavailable-or-unsupported'));
});
test('satisfaction: instrument, scoring and eligibility breaks prevent wave comparison', () => {
  for (const field of ['instrumentVersion', 'itemSetVersion', 'scoringVersion', 'eligibilityVersion']) {
    const input = fixture('satisfaction'); secondWave(input).value[field] = 'changed';
    assert.ok(run(input).missingInputs.includes('incomparable-survey-waves'));
    assert.deepEqual(run(input).waves, []);
  }
});
test('satisfaction: eligibility is a participation denominator, not score denominator', () => {
  const input = fixture('satisfaction'); input.records[0].value.eligible = 200;
  assert.equal(run(input).waves[0].scorePct, 75); assert.equal(run(input).waves[0].participationPct, 30);
  input.records[0].value.eligible = null;
  assert.ok(run(input).missingInputs.includes('survey-outcome-unavailable'));
});
test('satisfaction: true zero survives; null and suppression are never zero', () => {
  const input = fixture('satisfaction'); Object.assign(input.records[0].value, { metric: 0, shareSum: 0 });
  assert.equal(run(input).waves[0].scorePct, 0);
  input.records[0].value.metric = null; assert.deepEqual(run(input).waves, []);
  input.records[0].value.metric = 0; input.records[0].value.release.status = 'suppressed';
  assert.deepEqual(run(input).waves, []); assert.ok(run(input).missingInputs.includes('release-withheld'));
});
test('satisfaction: small or reconstructible releases withheld', () => {
  for (const mode of ['small', 'reconstructible']) {
    const input = fixture('satisfaction');
    if (mode === 'small') Object.assign(input.records[0].value, { respondents: 4, shareSum: 3 });
    else input.records[0].value.release.reconstructible = true;
    assert.ok(run(input).missingInputs.includes('release-withheld')); assert.deepEqual(run(input).waves, []);
  }
});
test('satisfaction: no employee-satisfaction relabel, monthly interpolation, eNPS substitution or complement', () => {
  for (const [field, value, reason] of [['measure', 'percent-satisfied-employees', 'metric-relabeling'], ['measure', 'unfavorable-share', 'metric-relabeling'], ['cadence', 'monthly', 'wave-interpolation-forbidden']]) {
    const input = fixture('satisfaction'); input.target[field] = value;
    assert.ok(run(input).missingInputs.includes(reason)); assert.deepEqual(run(input).waves, []);
  }
  const input = fixture('satisfaction'); input.records[0].value.sourceKind = 'independent-exit-enps';
  assert.ok(run(input).missingInputs.includes('source-substitution')); assert.deepEqual(run(input).waves, []);
});
test('satisfaction: late correction stays excluded until available; selected correction replaces prior wave', () => {
  const input = fixture('satisfaction'), row = structuredClone(input.records[0]);
  Object.assign(row, { revision: 2, supersedes: 1, observedAt: at('2026-04-02') });
  Object.assign(row.value, { metric: 0, shareSum: 0 }); input.records.push(row);
  assert.equal(run(input).waves[0].scorePct, 75); assert.equal(run(input).excludedLateRecords, 1);
  input.cutoff = at('2026-04-03');
  assert.equal(run(input).waves[0].scorePct, 0); assert.equal(run(input).waves[0].revision, 2);
});
test('satisfaction: duplicate or overlapping waves cannot be counted as independent observations', () => {
  const input = fixture('satisfaction'); secondWave(input).value.waveId = 'wave-1';
  assert.ok(run(input).missingInputs.includes('duplicate-wave-population'));
  input.records[1].value.waveId = 'wave-2'; input.records[1].value.launchAt = at('2026-01-15');
  assert.ok(run(input).missingInputs.includes('overlapping-survey-waves'));
});
test('satisfaction: wrong domain and contradictory arithmetic fail closed', () => {
  assert.ok(run(fixture('turnover')).missingInputs.includes('satisfaction-domain-required'));
  const input = fixture('satisfaction'); input.records[0].value.shareSum = 40;
  assert.ok(run(input).missingInputs.includes('survey-denominator-mismatch'));
  assert.deepEqual(run(null).waves, []);
});

test('satisfaction: missing or unsupported weighting, reverse and exclusion rules block', () => {
  for (const field of ['itemWeighting', 'reverseItems', 'excludedItems']) {
    const missing = definition(); delete missing[field];
    assert.equal(satisfactionDomainEvidence(fixture('satisfaction'), missing).contractStatus, 'blocked');
    const unsupported = definition(); unsupported[field] = field === 'itemWeighting' ? 'weighted' : ['item1'];
    assert.equal(satisfactionDomainEvidence(fixture('satisfaction'), unsupported).contractStatus, 'blocked');
  }
});
test('satisfaction: accessor and sparse scoring arrays fail closed without executing getters', () => {
  for (const field of ['responseScale', 'favorableValues', 'reverseItems', 'excludedItems']) {
    for (const mode of ['sparse', 'accessor', 'extra']) {
      const score = definition();
      const values = mode === 'extra' ? [1] : new Array(1);
      if (mode === 'accessor') Object.defineProperty(values, 0, { enumerable: true, get() { throw new Error('getter executed'); } });
      if (mode === 'extra') values.extra = 1;
      score[field] = values;
      const result = satisfactionDomainEvidence(fixture('satisfaction'), score);
      assert.equal(result.contractStatus, 'blocked'); assert.deepEqual(result.waves, []);
    }
  }
  const score = definition();
  Object.defineProperty(score, 'responseScale', { enumerable: true, get() { throw new Error('getter executed'); } });
  assert.equal(satisfactionDomainEvidence(fixture('satisfaction'), score).contractStatus, 'blocked');
  const proxy = Proxy.revocable({}, {}); proxy.revoke();
  assert.equal(satisfactionDomainEvidence(fixture('satisfaction'), proxy.proxy).contractStatus, 'blocked');
});
