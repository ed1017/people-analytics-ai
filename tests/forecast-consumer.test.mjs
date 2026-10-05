import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastReadiness, composeForecastConsumer, resolveForecastConsumerCache } from '../lib/ml/forecast-consumer.mjs';
import { fixture, revision, at } from './fixtures/predictive-readiness.mjs';
import { evidenceCheckpoint } from './manual/predictive-evidence-checkpoint.mjs';
import { exitDemoPresentation } from './manual/generate-exit-demo-presentation.mjs';
import { exitForecastForConsumer, readCachedExitForecast } from './manual/forecast-consumer.mjs';
test('supported metadata means contract pass only, preserving confirmed zero', () => {
  const f = fixture(); f.records[0].value.voluntaryExits = 0;
  const result = forecastReadiness(f); assert.equal(result.contractStatus, 'passed'); assert.equal(result.selectedHistory[0].outcome, 0);
  assert.equal(result.status, 'unqualified'); assert.equal(result.operationalForecast, null); assert.equal(result.sourceTruthVerified, false);
});
test('missing and contradictory availability/completeness fail closed', () => {
  for (const mutate of [f => { f.manifest.completion = null; }, f => { f.records[0].observedAt = null; }, f => { f.manifest.completion.populationVersion = 'another'; }, f => { f.records[0].observedAt = at('2025-01-01'); }]) {
    const f = fixture(); mutate(f); const r = forecastReadiness(f); assert.equal(r.contractStatus, 'blocked'); assert(r.reasonCodes.length); assert.equal(r.operationalForecast, null);
  }
});
test('null is not zero; late revisions become known only at their cutoff', () => {
  const f = revision(fixture(), 9); assert.equal(forecastReadiness(f).selectedHistory[0].outcome, 3);
  f.cutoff = at('2026-04-03'); assert.equal(forecastReadiness(f).selectedHistory[0].outcome, 9);
  f.records[1].value.voluntaryExits = null; const r = forecastReadiness(f); assert.equal(r.selectedHistory[0].outcome, null); assert.equal(r.contractStatus, 'blocked');
});
test('actual workflow reports precise source gaps beside the unchanged preview', async () => {
  const result = await exitForecastForConsumer();
  assert.deepEqual(result.conditionalDemo.preview, await exitDemoPresentation());
  for (const domain of ['turnover', 'satisfaction', 'hiring']) { assert.equal(result.domains[domain].contractStatus, 'blocked'); assert(result.domains[domain].missingInputs.length >= 3); assert(result.domains[domain].reasonCodes.includes('completeness-unknown')); }
  assert.equal(result.operationalForecast, null); assert.equal(result.evaluation.constructedFixture, 'evaluated-constructed-fixture');
});
test('contradictory qualified flags and mismatched preview identities are rejected', async () => {
  const c = await evidenceCheckpoint(), p = await exitDemoPresentation();
  for (const mutate of [p => { p.operationallyQualified = true; }, p => { p.qualification.pointInTimeValidated = true; }, p => { p.identities.datasetFingerprint = 'stale'; }, p => { p.identities.fixtureSha256 = 'stale'; }, p => { delete p.qualification.completenessVerified; }]) {
    const copy = structuredClone(p); mutate(copy); assert.throws(() => composeForecastConsumer(c, copy, 'a'.repeat(64)));
  }
  c.sourceEvidence.turnover.checks.forecast = { status: 'contract-pass', reasons: [] };
  assert.throws(() => composeForecastConsumer(c, p, 'a'.repeat(64)));
});
test('re-evaluated cache accepts exact result and withholds stale or tampered values', async () => {
  const fresh = await exitForecastForConsumer(); assert.deepEqual(await readCachedExitForecast(JSON.parse(JSON.stringify(fresh))), fresh);
  for (const mutate of [r => { r.identity = 'old'; }, r => { r.conditionalDemo.preview.conditional.remainingTotal = 0; }, r => { r.domains.turnover.contractStatus = 'passed'; }, r => { r.implementationIdentity = 'old'; }]) {
    const cached = structuredClone(fresh); mutate(cached); const r = resolveForecastConsumerCache(cached, fresh);
    assert.equal(r.status, 'stale'); assert.equal(r.conditionalDemo, null); assert.equal(r.operationalForecast, null);
  }
  assert.equal(resolveForecastConsumerCache(null, fresh).status, 'stale');
});
test('new source-evidence identity invalidates an earlier result even with identical predictions', async () => {
  const c = await evidenceCheckpoint(), p = await exitDemoPresentation();
  const before = composeForecastConsumer(c, p, 'a'.repeat(64));
  c.files['docs/predictive-readiness-proposal.md'] = 'b'.repeat(64);
  const after = composeForecastConsumer(c, p, 'a'.repeat(64));
  assert.deepEqual(before.conditionalDemo, after.conditionalDemo); assert.equal(resolveForecastConsumerCache(before, after).status, 'stale');
});
test('actual adapter path keeps unavailable histories and metrics null across domains', async () => {
  const checkpoint = await evidenceCheckpoint(), consumer = await exitForecastForConsumer();
  assert(checkpoint.sourceEvidence.turnover.domainEvaluation.reasonCodes.includes('no-history'));
  assert(checkpoint.sourceEvidence.hiring.domainEvaluation.reasons.includes('opening-and-followup-coverage-required'));
  assert(checkpoint.sourceEvidence.satisfaction.domainEvaluation.missingInputs.includes('score-definition-unavailable-or-unsupported'));
  for (const domain of ['turnover', 'hiring', 'satisfaction']) {
    const result = consumer.domains[domain].evaluation;
    assert.equal(result.status, 'unavailable'); assert.equal(result.history, null); assert.equal(result.metrics, null);
    assert(result.reasonCodes.length); assert.equal(consumer.domains[domain].operationalForecast, null);
    assert(checkpoint.files[`lib/ml/${domain}-domain-adapter.mjs`]);
  }
  assert.equal(checkpoint.sourceEvidence.turnover.domainEvaluation.mechanicsBenchmark, null);
});
test('missing or promoted domain evaluations and changed hiring horizon fail closed', async () => {
  const source = await evidenceCheckpoint(), preview = await exitDemoPresentation();
  for (const change of [
    c => { delete c.sourceEvidence.turnover.domainEvaluation; },
    c => { c.sourceEvidence.turnover.domainEvaluation.contractStatus = 'passed'; },
    c => { c.sourceEvidence.hiring.domainEvaluation.operationallyQualified = true; },
    c => { c.sourceEvidence.hiring.domainEvaluation.horizonDays = 180; },
    c => { c.sourceEvidence.satisfaction.domainEvaluation.forecast = 0; },
  ]) { const copy = structuredClone(source); change(copy); assert.throws(() => composeForecastConsumer(copy, preview, 'a'.repeat(64))); }
});
test('adapter implementation change invalidates a cached consumer without changing demo totals', async () => {
  const source = await evidenceCheckpoint(), preview = await exitDemoPresentation();
  const before = composeForecastConsumer(source, preview, 'a'.repeat(64));
  source.files['lib/ml/hiring-domain-adapter.mjs'] = 'b'.repeat(64);
  const after = composeForecastConsumer(source, preview, 'a'.repeat(64));
  assert.deepEqual(before.conditionalDemo, after.conditionalDemo);
  assert.equal(resolveForecastConsumerCache(before, after).status, 'stale');
});
