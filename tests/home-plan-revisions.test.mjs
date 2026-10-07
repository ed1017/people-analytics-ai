import test from 'node:test';
import assert from 'node:assert/strict';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft,reconcileBundle,reviseBundleDraft,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {bundleChatEditIntent} from '../lib/home-bundle-chat-edit.ts';
import {proposePlanRevision,readPlanRevisions,currentPlanRevision,discardPlanRevision,planBudgetText} from '../lib/home-plan-revisions.ts';
import {saveBundleCalculationPatch,attachBundlePatch,readBundleWorkspace} from '../lib/home-bundle-records.ts';
import {actionBindingKey} from '../lib/home-action-drafts.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const binding=await actionBinding('goal-a','Reduce turnover',{sources:[]},{}),selection={option:1,count:3};
function base(){
 const bundle=bundleProposalFixture(binding.goal).bundles[0];
 bundle.components=[bundle.components[0],{...bundle.components[5],id:'c2',dependsOn:['c1']}];
 return prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-06T12:00:00Z',{includeDeliveryEstimate:true});
}
test('exact budget example inherits all context and recalculates the existing engine without inventing benefits',()=>{
 const draft=base(),before=structuredClone(draft),{record}=proposePlanRevision(undefined,draft,'have a budget of 6000',selection);
 assert.equal(bundleChatEditIntent(record.request).edit,true);
 assert.deepEqual(record.draft.inputs.scope,draft.inputs.scope);assert.deepEqual(record.draft.inputs.timing,draft.inputs.timing);assert.deepEqual(record.draft.inputs.expenses,draft.inputs.expenses);assert.deepEqual(record.draft.inputs.whatIf,draft.inputs.whatIf);
 assert.equal(record.result.deliveryEstimate.participants,10);assert.equal(record.result.deliveryEstimate.hours,36);assert.equal(record.result.deliveryEstimate.employeeTime,null);assert.equal(record.result.deliveryEstimate.finish,'2026-11-28');
 assert.deepEqual(record.result.budget,{limit:6000,basis:'cash',cash:3500,employeeTime:null,comparedCost:3500,headroom:null,status:'unknown',assumed:true});
 assert.deepEqual(record.result,reconcileBundle(record.draft));assert.deepEqual(draft,before);assert.equal(record.draft.inputs.budget.amount.kind,'user-entered');assert.equal(record.draft.inputs.budget.basis.kind,'illustrative');
 assert.match(planBudgetText(record.result),/cash only; staff hours are separate/);
});
test('sequential changes inherit the latest proposal, all budget wording compares cash, and staff estimates recompute',()=>{
 const draft=base(),one=proposePlanRevision(undefined,draft,'I have a budget of $6,000 including staff time',selection);
 assert.equal(one.record.result.budget.headroom,null);
 const two=proposePlanRevision(one.history,draft,'use 20 participants',selection);
 assert.equal(two.record.result.deliveryEstimate.hours,56);assert.equal(two.record.result.budget.employeeTime,null);assert.equal(two.record.result.budget.headroom,null);assert.equal(two.record.result.budget.status,'unknown');
 const three=proposePlanRevision(two.history,draft,'our budget is 7k',selection);
 assert.equal(three.record.result.budget.basis,'cash');assert.equal(three.record.result.budget.headroom,null);assert.equal(three.history.revisions.length,3);assert.equal(three.history.revisions[0].result.deliveryEstimate.hours,36);
 assert.deepEqual(currentPlanRevision(readPlanRevisions(JSON.parse(JSON.stringify(three.history)),binding.goalId),draft),three.record);
});
test('zero limits, incomplete estimates, unsupported currency and ambiguous changes stay honest',()=>{
 const draft=base();assert.equal(proposePlanRevision(undefined,draft,'set budget to 0',selection).record.result.budget.headroom,-3500);
 const unknown=structuredClone(draft.inputs);unknown.expenses[0].amount={value:null,kind:'unknown',basis:null};
 assert.equal(proposePlanRevision(undefined,reviseBundleDraft(draft,unknown),'have a budget of 6000',selection).record.result.budget.status,'unknown');
 for(const text of ['have a budget of EUR 6000','have a budget of 6000 or 7000','have a budget of 6000 per month','set budget to 6000; use about 20 participants','set budget to 6000; set budget to 7000','do not set budget to 6000'])assert.throws(()=>proposePlanRevision(undefined,draft,text,selection));
 for(const statement of ['we can spend $6000','we can afford 6000','we have 20 participants']){assert.equal(bundleChatEditIntent(statement).edit,true);assert.ok(proposePlanRevision(undefined,draft,statement,selection));}
 for(const question of ['What is the budget?','How would a budget of 6000 change this?','Can we afford 20 participants?','Why is the cash separate?'])assert.equal(bundleChatEditIntent(question).edit,false);
});
test('Apply and explicit Attach preserve earlier attached versions; proposals alone change neither',()=>{
 const draft=base(),result=reconcileBundle(draft),saved=saveBundleCalculationPatch(undefined,draft,result).value;
 const confirm=d=>({confirmed:true,bindingKey:actionBindingKey(d.binding),inputKey:bundleInputKey(d),acknowledgeUnknowns:true});
 const attached=attachBundlePatch(saved,draft,confirm(draft),'attachment-a','2026-10-06T12:00:00Z').value,before=JSON.stringify(attached);
 const proposed=proposePlanRevision(undefined,draft,'have a budget of 6000',selection);assert.equal(JSON.stringify(attached),before);
 const applied=saveBundleCalculationPatch(attached,proposed.record.draft,proposed.record.result).value;
 assert.deepEqual(applied.attachments,attached.attachments);assert.equal(currentPlanRevision(proposed.history,applied.drafts[0]),null);
 assert.throws(()=>attachBundlePatch(applied,proposed.record.draft,confirm(proposed.record.draft),'attachment-b','2026-10-06T12:01:00Z'),/Explicitly replace/);
 const replaced=attachBundlePatch(applied,proposed.record.draft,confirm(proposed.record.draft),'attachment-b','2026-10-06T12:01:00Z','attachment-a').value;
 assert.equal(replaced.attachments.length,2);assert.deepEqual(replaced.attachments[0],attached.attachments[0]);assert.ok(readBundleWorkspace(replaced,binding.goalId));
});
test('Reset closes pending proposals without deleting versions; other goals and tampered records cannot restore',()=>{
 const draft=base(),one=proposePlanRevision(undefined,draft,'have a budget of 6000',selection);
 const discarded=discardPlanRevision(one.history,draft);assert.equal(currentPlanRevision(discarded,draft),null);assert.equal(discarded.revisions.length,1);
 assert.equal(currentPlanRevision(one.history,{...draft,binding:{...binding,goalId:'other'}}),null);assert.equal(readPlanRevisions(one.history,'other'),null);
 const changed=structuredClone(draft);changed.inputs.groups[0].count.value=11;assert.equal(currentPlanRevision(one.history,changed),null);
 const tampered=structuredClone(one.history);tampered.revisions[0].result.budget.headroom=999;assert.equal(readPlanRevisions(tampered,binding.goalId),null);
 assert.equal(proposePlanRevision(discarded,draft,'use 12 participants',selection).record.draft.inputs.budget,undefined);
});

test('compound participants and budget statement creates one atomic reviewed revision without spending the cap',()=>{
 const draft=base(),before=JSON.stringify(draft);
 for(const request of ['i have 20 participants and a budget of $8000','I have a budget of $8,000 and 20 participants','use 20 participants and our budget is 8k','I have twenty participants and a cash budget of USD 8000']){
  assert.equal(bundleChatEditIntent(request).edit,true);
  const proposed=proposePlanRevision(undefined,draft,request,selection),{record}=proposed;
  assert.equal(proposed.history.revisions.length,1);assert.equal(record.draft.revision,draft.revision+1);
  assert.equal(record.result.deliveryEstimate.participants,20);assert.equal(record.result.deliveryEstimate.hours,56);
  assert.equal(record.result.budget.limit,8000);assert.equal(record.result.budget.cash,3500);assert.equal(record.result.budget.employeeTime,null);assert.equal(record.result.budget.headroom,null);
  assert.deepEqual(record.draft.inputs.expenses,draft.inputs.expenses);assert.deepEqual(record.draft.inputs.scope,draft.inputs.scope);assert.deepEqual(record.draft.inputs.timing,draft.inputs.timing);
  assert.equal(record.draft.inputs.groups[0].count.kind,'user-entered');assert.equal(record.draft.inputs.budget.amount.kind,'user-entered');
  assert.deepEqual(readPlanRevisions(proposed.history,draft.binding.goalId),proposed.history);
  assert.equal(JSON.stringify(draft),before);
 }
 const allIn=proposePlanRevision(undefined,draft,'i have 20 participants and a budget of $8000 including staff time',selection);
 assert.equal(allIn.record.result.budget.basis,'cash');assert.equal(allIn.record.result.budget.headroom,null);
});

test('invalid or ambiguous compound values never partly change the plan or turn a limit into an expense',()=>{
 const draft=base(),before=JSON.stringify(draft);
 for(const request of ['i have 20 participants and a budget of EUR 8000','i have 20 participants and a budget of $8000 or $9000','i have 20 participants and a budget of $8000 per month','i have about 20 participants and a budget of $8000','i have 20 participants and a budget of $8000 and use 30 participants'])assert.throws(()=>proposePlanRevision(undefined,draft,request,selection));
 assert.equal(JSON.stringify(draft),before);
 const inputs=structuredClone(draft.inputs);inputs.groups.push({...inputs.groups[0],id:'another',label:'Another group'});
 const multi=reviseBundleDraft(draft,inputs);
 assert.throws(()=>proposePlanRevision(undefined,multi,'i have 20 participants and a budget of $8000',selection),/Which participant group/);
});
