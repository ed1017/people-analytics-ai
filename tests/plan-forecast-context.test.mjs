import test from 'node:test';
import assert from 'node:assert/strict';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {planForecastContext,readCachedPlanForecastContext} from './manual/plan-forecast-context.mjs';
import {composePlanForecastContext} from '../lib/ml/plan-forecast-context.mjs';
import {exitForecastForConsumer} from './manual/forecast-consumer.mjs';
const assumed=value=>({value,kind:'user-entered',basis:'Explicit review assumption; not verified source evidence.'});
async function countPlan(){
 const goal='Review voluntary exits',binding=await actionBinding('scenario',goal,{sources:[]},{});
 const d=createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),s=d.inputs.scope;
 s.population=assumed('all-recorded-voluntary-separations');s.startMonth=assumed('2026-10');s.months=assumed(3);
 d.inputs.successMeasure={goal,scopeKey:JSON.stringify([s.population.value,s.startMonth.value,s.months.value]),
  name:'Voluntary exits (count)',baseline:assumed('200'),target:assumed('150')};
 return d;
}
test('exact count scope permits only a conditional demo reference and preserves assumptions',async()=>{
 const d=await countPlan(),before=structuredClone(d),r=await planForecastContext(d,'turnover');
 assert.equal(r.status,'conditional-reference-only');assert.equal(r.reference.total,201);
 assert.equal(r.reference.method,'recent-mean-3');assert.equal(r.forecastBaseline,null);
 assert.equal(r.operationallyQualified,false);assert.equal(r.reference.operationallyQualified,false);
 assert.equal(r.source.status,'unqualified');assert.equal(r.source.evaluation.status,'unavailable');
 assert.ok(r.reference.baselineComparisons.length>=2);assert.deepEqual(d,before);
 assert.deepEqual(r.planAssumptions.successMeasure,d.inputs.successMeasure);
 assert.ok(Object.isFrozen(r.reference.points));
});
test('no interval means unknown uncertainty, never zero-width bounds or probabilities',async()=>{
 const r=await planForecastContext(await countPlan(),'turnover');
 assert.equal(r.reference.uncertainty.interval,null);assert.equal(r.reference.uncertainty.status,'unavailable');
 assert.equal(r.interventionEffect.estimate,null);assert.equal(r.interventionEffect.interval,null);
 assert.equal('targetProbability' in r,false);assert.equal('avoidedExits' in r,false);
});
test('changing targets never changes the demo or generates a causal effect',async()=>{
 const d=await countPlan(),a=await planForecastContext(d,'turnover');
 d.inputs.successMeasure.target=assumed('0');const b=await planForecastContext(d,'turnover');
 assert.deepEqual(a.reference,b.reference);assert.deepEqual(a.interventionEffect,b.interventionEffect);
 assert.notEqual(a.inputKey,b.inputKey);assert.equal(b.interventionEffect.status,'not-estimated');
});
test('actual Home rate and capacity scenarios cannot receive count baselines',async()=>{
 for(const [goal,reason] of [['Reduce turnover','count-is-not-turnover-rate'],['Add 5 additional roles over 12 months','count-is-not-capacity']]){
  const binding=await actionBinding('scenario',goal,{sources:[]},{});
  const d=prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),'2026-10-05T00:00:00Z');
  const r=await planForecastContext(d,'turnover');assert.equal(r.reference,null);assert.equal(r.forecastBaseline,null);
  assert.ok(r.reasonCodes.includes(reason));assert.deepEqual(r.planAssumptions.whatIf,d.inputs.whatIf);
 }
});
test('hiring and satisfaction stay unavailable with their domain-specific evaluation reasons',async()=>{
 for(const domain of ['hiring','satisfaction']){const r=await planForecastContext(await countPlan(),domain);
  assert.equal(r.status,'unavailable');assert.equal(r.reference,null);assert.equal(r.source.evaluation.metrics,null);
  assert.ok(r.reasonCodes.includes('no-domain-forecast-reference'));assert.ok(r.source.missingInputs.length>0);
 }
});
test('population, BU, job, horizon and measurement mismatches reject reference',async()=>{
 const edits=[d=>d.inputs.scope.population=assumed('Managed Services'),d=>d.inputs.scope.businessUnit=assumed('Managed Services'),
  d=>d.inputs.scope.jobProfile=assumed('Engineer'),d=>d.inputs.scope.months=assumed(12),
  d=>d.inputs.scope.startMonth=assumed('2026-11'),d=>d.inputs.successMeasure.name='Voluntary turnover (YTD %)',
  d=>delete d.inputs.successMeasure];
 for(const edit of edits){const d=await countPlan();edit(d);const r=await planForecastContext(d,'turnover');
  assert.equal(r.status,'unavailable');assert.equal(r.reference,null);}
});
test('cache rejects changed plan, evidence, implementation, values, or fabricated intervals',async()=>{
 const d=await countPlan(),fresh=await planForecastContext(d,'turnover');
 assert.deepEqual(await readCachedPlanForecastContext(structuredClone(fresh),d,'turnover'),fresh);
 for(const edit of [r=>r.evidenceIdentity='old',r=>r.implementationIdentity='old',r=>r.reference.total=1,
  r=>r.reference.uncertainty.interval=[190,210],r=>r.forecastBaseline=201]){
  const cache=structuredClone(fresh);edit(cache);const r=await readCachedPlanForecastContext(cache,d,'turnover');
  assert.equal(r.status,'stale');assert.equal(r.reference,null);assert.equal(r.forecastBaseline,null);
 }
 d.revision++;assert.equal((await readCachedPlanForecastContext(fresh,d,'turnover')).status,'stale');
});
test('invalid draft, unknown domain and contradictory or tampered producer metadata fail closed',async()=>{
 await assert.rejects(()=>planForecastContext({},'turnover'));
 await assert.rejects(()=>planForecastContext({},'unknown'));
 const d=await countPlan(),consumer=structuredClone(await exitForecastForConsumer());
 consumer.domains.turnover.sourceTruthVerified=true;
 assert.throws(()=>composePlanForecastContext(d,'turnover',consumer,'a'.repeat(64)),/Unsupported/);
 consumer.domains.turnover.sourceTruthVerified=false;consumer.conditionalDemo.preview.conditional.remainingTotal=1;
 assert.throws(()=>composePlanForecastContext(d,'turnover',consumer,'a'.repeat(64)),/identity mismatch/);
});
