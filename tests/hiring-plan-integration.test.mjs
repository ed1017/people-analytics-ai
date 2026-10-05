import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {planForecastContext,readCachedPlanForecastContext} from './manual/plan-forecast-context.mjs';
import {composePlanForecastContext} from '../lib/ml/plan-forecast-context.mjs';
import {exitForecastForConsumer} from './manual/forecast-consumer.mjs';
import {benchmarkHiringSelection} from './manual/benchmark-hiring-selection.mjs';
import {projectExperimentalHiringArtifact,unavailableExperimentalHiring} from '../lib/ml/hiring-experimental-domain.mjs';
const fresh=await benchmarkHiringSelection();
const artifact=JSON.parse(await readFile(new URL('../docs/evidence/hiring-selection-benchmark-v1.json',import.meta.url),'utf8'));
const consumer=await exitForecastForConsumer(),implementation='a'.repeat(64);
async function draft(){const goal='Add 5 additional roles over 12 months',binding=await actionBinding('scenario',goal,{sources:[]},{});
 return prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),'2026-10-05T00:00:00Z');}
test('artifact → experimental domain adapter → plan context preserves all cases and identities',async()=>{
 const d=await draft(),domain=projectExperimentalHiringArtifact(artifact,fresh,implementation);
 const context=composePlanForecastContext(d,'hiring',consumer,implementation,domain);
 assert.equal(domain.kind,'experimental-synthetic-result');assert.equal(domain.status,'benchmarked');
 assert.deepEqual(context.experimentalSynthetic,domain);assert.equal(domain.benchmark.cases.length,9);
 assert.equal(domain.benchmark.abstentions.length,7);assert.equal(domain.benchmark.planBaselineEligible,false);
 for(const c of domain.benchmark.cases){assert.match(c.model.identity,/^[a-f0-9]{64}$/);assert.equal(c.sample.trainingCohorts,51);
  assert.ok(c.sample.trainingOpenings>0);assert.equal(c.sample.testCohorts,3);assert.ok(c.sample.testOpenings>0);
  assert.equal(c.dates.trainingEnd,'2025-03');assert.equal(c.dates.origin,'2025-07-01T00:00:00.000Z');
  assert.deepEqual(c.dates.testMonths,['2025-07','2025-08','2025-09']);assert.equal(c.interval,null);
  assert.ok(c.baselineComparison.recent.brier>0);assert.ok(c.baselineComparison.logistic.brier>0);}
});
test('sole producer regenerates the artifact without adopting baseline or changing assumptions',async()=>{
 const d=await draft(),before=structuredClone(d),context=await planForecastContext(d,'hiring');
 assert.equal(context.experimentalSynthetic.status,'benchmarked');assert.equal(context.status,'unavailable');
 assert.equal(context.source.status,'unqualified');assert.equal(context.source.evaluation.status,'unavailable');
 assert.equal(context.forecastBaseline,null);assert.equal(context.reference,null);assert.equal(context.operationallyQualified,false);
 assert.deepEqual(context.planAssumptions.whatIf,d.inputs.whatIf);assert.deepEqual(d,before);
 assert.equal(context.interventionEffect.estimate,null);assert.equal(context.experimentalSynthetic.interval,null);
 assert.equal(context.experimentalSynthetic.benchmark.scopeRelationship,'separate-fixture-not-plan-population');
});
test('all abstentions retain reasons and null predictions; missing intervals remain explicit',async()=>{
 const context=await planForecastContext(await draft(),'hiring'),demo=context.experimentalSynthetic;
 assert.equal(demo.forecastBaseline,null);assert.equal(demo.interval,null);assert.equal(demo.causalEffect,null);
 for(const c of demo.benchmark.abstentions){assert.equal(c.status,'abstained');assert.ok(c.reason.length>0);
  assert.equal(c.predictions,null);assert.equal(c.interval,null);}
 assert.match(demo.benchmark.uncertaintyReason,/missing intervals remain unknown/);
 assert.equal('targetProbability' in demo,false);
 assert.ok(demo.benchmark.cases.some(c=>c.baselineComparison.selectedMinusLogisticBrier>0));
});
test('missing, stale, or tampered artifact exposes unavailable context without cached predictions',async()=>{
 const changed=structuredClone(artifact);changed.cases[0].prepared.selected[0].fraction=.99;
 for(const cached of [null,{},changed]){
  const domain=projectExperimentalHiringArtifact(cached,fresh,implementation);
  const context=composePlanForecastContext(await draft(),'hiring',consumer,implementation,domain);
  assert.equal(context.experimentalSynthetic.status,'unavailable');assert.equal(context.experimentalSynthetic.benchmark,null);
  assert.ok(context.experimentalSynthetic.reasonCodes.includes('artifact-does-not-match-current-benchmark'));
  assert.equal(context.forecastBaseline,null);
 }
 for(const reason of ['benchmark-artifact-missing-or-invalid','benchmark-regeneration-failed']){
  const domain=unavailableExperimentalHiring(reason,implementation);
  assert.deepEqual(composePlanForecastContext(await draft(),'hiring',consumer,implementation,domain).experimentalSynthetic.reasonCodes,[reason]);
 }
});
test('contradictory qualification or invented intervals are rejected instead of promoted',async()=>{
 const invalid=structuredClone(fresh);invalid.operationallyQualified=true;
 assert.equal(projectExperimentalHiringArtifact(invalid,invalid,implementation).status,'unavailable');
 const badInterval=structuredClone(artifact);badInterval.cases[0].prepared.interval=[.2,.8];
 assert.equal(projectExperimentalHiringArtifact(badInterval,fresh,implementation).status,'unavailable');
 const domain=structuredClone(projectExperimentalHiringArtifact(artifact,fresh,implementation));domain.forecastBaseline=.5;
 assert.throws(()=>composePlanForecastContext({},'hiring',consumer,implementation,domain));
 assert.throws(()=>composePlanForecastContext({version:1},'hiring',consumer,implementation,domain));
 const d=await draft();assert.throws(()=>composePlanForecastContext(d,'hiring',consumer,implementation,domain),/Contradictory/);
});
test('cached plan context invalidates on experiment or plan changes and clears experiment data',async()=>{
 const d=await draft(),current=await planForecastContext(d,'hiring');
 const cache=structuredClone(current);cache.experimentalSynthetic.benchmark.cases[0].model.identity='old';
 const stale=await readCachedPlanForecastContext(cache,d,'hiring');assert.equal(stale.status,'stale');assert.equal(stale.experimentalSynthetic,null);
 d.revision++;assert.equal((await readCachedPlanForecastContext(current,d,'hiring')).status,'stale');
});
test('satisfaction and turnover do not inherit a hiring benchmark',async()=>{
 const d=await draft();for(const domain of ['turnover','satisfaction'])assert.equal((await planForecastContext(d,domain)).experimentalSynthetic,null);
});
