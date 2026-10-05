import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestSuccessMeasure,reviewSuccessMeasure,successMeasureText,measurementScope} from '../lib/home-success-measures.ts';
import {createBundleDraft,readBundleDraft,reviseBundleDraft,reviseBundleProposal,reconcileBundle,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {saveBundleDraftPatch,readBundleWorkspace,saveBundleCalculationPatch,attachBundlePatch} from '../lib/home-bundle-records.ts';
const pack={sources:[{id:'A1',status:'loaded',date:'2026-09-30',facts:{voluntary_turnover_ytd_pct:0}}]},goal='Reduce turnover',binding=await actionBinding('measure-goal',goal,pack,{});
const base=()=>prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),'2026-10-05T00:00:00Z');
test('suggestions retain observed zero, source/date/scope and do not invent a target or fallback baseline',()=>{
 const suggestion=suggestSuccessMeasure(goal,pack);assert.equal(suggestion.baseline.value,'0%');assert.match(suggestion.baseline.basis,/A1.voluntary_turnover_ytd_pct/);assert.match(suggestion.baseline.basis,/2026-09-30/);assert.match(suggestion.baseline.basis,/Company-wide/);
 for(const goal of ['Improve satisfaction','Improve employee support','Add three roles']){const next=suggestSuccessMeasure(goal,pack);assert.ok(next.name);assert.equal(next.baseline,null);assert.match(next.status,/no matching observed baseline/);}
 for(const status of ['unavailable','invalid','timeout'])assert.equal(suggestSuccessMeasure('Reduce turnover',{sources:[{...pack.sources[0],status}]}).baseline,null);
});
test('review separates recorded baseline from user target and stages no mutation',()=>{
 const draft=base(),before=structuredClone(draft),suggestion=suggestSuccessMeasure(goal,pack),inputs=reviewSuccessMeasure(draft,suggestion.name,'','5% by Dec 2027','user-entered',suggestion,true);assert.deepEqual(draft,before);
 const next=reviseBundleDraft(draft,inputs);assert.equal(next.inputs.successMeasure.baseline.kind,'adopted');assert.equal(next.inputs.successMeasure.target.kind,'user-entered');assert.match(successMeasureText(next.inputs.successMeasure),/Targets are not predicted effects/);assert.notEqual(bundleInputKey(draft),bundleInputKey(next));assert.equal(next.inputs.scope.comparisonConfirmed.value,null);
 assert.throws(()=>reviewSuccessMeasure(draft,'Different metric','','','user-entered',suggestion,true),/must match/);
});
test('unknown and illustrative baseline/targets persist through save and reload without upgrading provenance',()=>{
 const draft=base(),suggestion=suggestSuccessMeasure('Improve support',{});let next=reviseBundleDraft(draft,reviewSuccessMeasure(draft,suggestion.name,'','Unknown','illustrative',suggestion,false));assert.equal(next.inputs.successMeasure.baseline.value,null);assert.equal(next.inputs.successMeasure.target.value,null);
 next=reviseBundleDraft(next,reviewSuccessMeasure(next,suggestion.name,'2 milestones in Q3','3 milestones in Q4','illustrative',suggestion,false));const stored=saveBundleDraftPatch(undefined,next).value,reloaded=readBundleWorkspace(JSON.parse(JSON.stringify(stored)),binding.goalId).drafts[0];assert.deepEqual(reloaded,next);assert.equal(reloaded.inputs.successMeasure.baseline.kind,'illustrative');assert.equal(reloaded.inputs.successMeasure.target.kind,'illustrative');assert.ok(readBundleDraft(base()));
});
test('measurement revisions preserve immutable attachments and reject a mismatched goal or adopted target',()=>{
 let draft=base(),suggestion=suggestSuccessMeasure(goal,pack);draft=reviseBundleDraft(draft,reviewSuccessMeasure(draft,suggestion.name,'','5%','user-entered',suggestion,true));const result=reconcileBundle(draft);let store=saveBundleCalculationPatch(undefined,draft,result).value;store=attachBundlePatch(store,draft,{confirmed:true,bindingKey:JSON.stringify(Object.fromEntries(Object.entries(binding).sort(([a],[b])=>a.localeCompare(b)))),inputKey:bundleInputKey(draft),acknowledgeUnknowns:true},'measurement-attachment','2026-10-05T00:00:00Z').value;
 const before=JSON.stringify(store.attachments[0]);const next=reviseBundleDraft(draft,reviewSuccessMeasure(draft,suggestion.name,'0%','4%','illustrative',suggestion,false));store=saveBundleDraftPatch(store,next).value;assert.equal(JSON.stringify(store.attachments[0]),before);assert.notEqual(result.inputKey,bundleInputKey(next));assert.equal(next.inputs.successMeasure.baseline.kind,'adopted');
 const bad=structuredClone(next);bad.inputs.successMeasure.goal='Another goal';assert.equal(readBundleDraft(bad),null);bad.inputs.successMeasure.goal=goal;bad.inputs.successMeasure.target.kind='adopted';assert.equal(readBundleDraft(bad),null);
 const revised=reviseBundleProposal(next,{...next.bundle,objective:'Review the existing pilot'});assert.deepEqual(revised.inputs.successMeasure,next.inputs.successMeasure);
});
test('population/horizon changes require renewed measure review, without replacing the saved baseline',()=>{
 const draft=base(),suggestion=suggestSuccessMeasure(goal,pack),next=reviseBundleDraft(draft,reviewSuccessMeasure(draft,suggestion.name,'','','user-entered',suggestion,true));next.inputs.scope.population.value='Different population';assert.notEqual(next.inputs.successMeasure.scopeKey,measurementScope(next.inputs));assert.match(successMeasureText(next.inputs.successMeasure,false),/renewed review/);assert.ok(reconcileBundle(next).issues.some(issue=>issue.includes('Success measure')));
});
