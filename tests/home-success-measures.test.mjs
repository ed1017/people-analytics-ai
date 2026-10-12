import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestSuccessMeasure,reviewSuccessMeasure,successMeasureText,measurementScope} from '../lib/home-success-measures.ts';
import {createBundleDraft,readBundleDraft,reviseBundleDraft,reviseBundleProposal,reconcileBundle,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {saveBundleDraftPatch,readBundleWorkspace,saveBundleCalculationPatch,attachBundlePatch} from '../lib/home-bundle-records.ts';
const pack={sources:[{id:'R1',status:'loaded',date:'2026-09-30',facts:{median_time_to_fill_days:0}}]},goal='Improve hiring',binding=await actionBinding('measure-goal',goal,pack,{});
const base=()=>prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),'2026-10-05T00:00:00Z');
const suggestion=()=>suggestSuccessMeasure(goal,pack,binding.evidenceDigest);
test('historical zero retains source/date while no domain aggregate becomes an adoptable baseline',()=>{
 const s=suggestion();assert.equal(s.baseline,null);assert.deepEqual(s.history.observations,[{metric:'median_time_to_fill_days',value:0,asOf:'2026-09-30'}]);
 for(const goal of ['Improve satisfaction','Improve employee support','Add three roles'])assert.equal(suggestSuccessMeasure(goal,pack).baseline,null);
 for(const status of ['unavailable','invalid','timeout'])assert.equal(suggestSuccessMeasure('Improve hiring',{sources:[{...pack.sources[0],status}]},binding.evidenceDigest).history,undefined);
});
test('review preserves explicit baseline provenance and never adopts even a forged aggregate suggestion',()=>{
 const draft=base(),before=structuredClone(draft),s=suggestion();
 assert.throws(()=>reviewSuccessMeasure(draft,s.name,'','5 days','user-entered',{...s,baseline:{value:'0 days',kind:'adopted',basis:'R1.median_time_to_fill_days'}},true),/context only/);
 const next=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,'2 days in fictional cohort','5 days by Dec 2027','user-entered',s,false));assert.deepEqual(draft,before);
 assert.equal(next.inputs.successMeasure.baseline.kind,'user-entered');assert.equal(next.inputs.successMeasure.target.kind,'user-entered');assert.match(successMeasureText(next.inputs.successMeasure),/Targets are not predicted effects/);assert.notEqual(bundleInputKey(draft),bundleInputKey(next));assert.equal(next.inputs.scope.comparisonConfirmed.value,null);
});
test('unknown and illustrative values persist through save/reload without upgrading provenance',()=>{
 const draft=base(),s=suggestion();let next=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,'','Unknown','illustrative',s,false));assert.equal(next.inputs.successMeasure.baseline.value,null);assert.equal(next.inputs.successMeasure.target.value,null);
 next=reviseBundleDraft(next,reviewSuccessMeasure(next,s.name,'2 days in Q3','3 days in Q4','illustrative',s,false));const stored=saveBundleDraftPatch(undefined,next).value,reloaded=readBundleWorkspace(JSON.parse(JSON.stringify(stored)),binding.goalId).drafts[0];assert.deepEqual(reloaded,next);assert.equal(reloaded.inputs.successMeasure.baseline.kind,'illustrative');assert.equal(reloaded.inputs.successMeasure.target.kind,'illustrative');assert.ok(readBundleDraft(base()));
});
test('target revisions preserve immutable attachments and reject mismatched goal or adopted target',()=>{
 const s=suggestion();let draft=base();draft=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,'2 days','5 days','user-entered',s,false));const result=reconcileBundle(draft);let store=saveBundleCalculationPatch(undefined,draft,result).value;store=attachBundlePatch(store,draft,{confirmed:true,bindingKey:JSON.stringify(Object.fromEntries(Object.entries(binding).sort(([a],[b])=>a.localeCompare(b)))),inputKey:bundleInputKey(draft),acknowledgeUnknowns:true},'measurement-attachment','2026-10-05T00:00:00Z').value;
 const before=JSON.stringify(store.attachments[0]);const next=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,'2 days','4 days','illustrative',s,false));store=saveBundleDraftPatch(store,next).value;assert.equal(JSON.stringify(store.attachments[0]),before);assert.notEqual(result.inputKey,bundleInputKey(next));assert.equal(next.inputs.successMeasure.baseline.kind,'user-entered');
 const bad=structuredClone(next);bad.inputs.successMeasure.goal='Another goal';assert.equal(readBundleDraft(bad),null);bad.inputs.successMeasure.goal=goal;bad.inputs.successMeasure.target.kind='adopted';assert.equal(readBundleDraft(bad),null);
 const revised=reviseBundleProposal(next,{...next.bundle,objective:'Review the existing pilot'});assert.deepEqual(revised.inputs.successMeasure,next.inputs.successMeasure);
});
test('population/horizon changes require renewed review without replacing the saved baseline',()=>{
 const draft=base(),s=suggestion(),next=reviseBundleDraft(draft,reviewSuccessMeasure(draft,s.name,'2 days','','user-entered',s,false));next.inputs.scope.population.value='Different population';assert.notEqual(next.inputs.successMeasure.scopeKey,measurementScope(next.inputs));assert.match(successMeasureText(next.inputs.successMeasure,false),/renewed review/);assert.ok(reconcileBundle(next).issues.some(issue=>issue.includes('Success measure')));
});
