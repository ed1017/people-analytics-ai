import test from 'node:test';
import assert from 'node:assert/strict';
import {pinnedGoalPlanStatus,preferredSavedBundleId,restoredBundleDraft,restoredBundleResult} from '../lib/home-pinned-goals.ts';
import {actionBinding,actionBindingKey,actionUsage} from '../lib/home-action-drafts.ts';
import {createBundleDraft,bundleInputKey,reconcileBundle,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {saveBundleCalculationPatch,attachBundlePatch,readBundleWorkspace} from '../lib/home-bundle-records.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';

const packet={sources:[{id:'W1',status:'loaded',facts:{headcount:20}}]},goal='Review coordinated workforce options';
const binding=await actionBinding('goal-a',goal,packet,{}),proposal=bundleProposalFixture(goal);
const preparation={version:1,binding,proposal,preparedAt:'2026-10-05T00:00:00.000Z',usage:actionUsage(null,0)};
const draft=createBundleDraft(proposal.bundles[1],binding);
const entered=value=>({value,kind:'user-entered',basis:'Reviewed fixture.'});
Object.assign(draft.inputs.scope,{population:entered('Saved cohort'),startMonth:entered('2027-01'),months:entered(6),capacityRequired:entered(false)});
const saved=saveBundleCalculationPatch(undefined,draft,reconcileBundle(draft)).value;
const confirmation=value=>({confirmed:true,bindingKey:actionBindingKey(value.binding),inputKey:bundleInputKey(value),acknowledgeUnknowns:true});
const attached=attachBundlePatch(saved,draft,confirmation(draft),'first','2026-10-05T00:00:00.000Z').value;

test('rail distinguishes absent, stored and unverifiable plans without changing records',()=>{
 const fields={homeBundlePreparationV1:preparation,homeSolutionBundlesV1:attached},before=JSON.stringify(fields);
 assert.equal(pinnedGoalPlanStatus('goal-a',undefined,packet),'none');
 assert.equal(pinnedGoalPlanStatus('goal-a',fields,packet),'saved');
 assert.equal(pinnedGoalPlanStatus('goal-a',{homeSolutionBundlesV1:attached},packet),'review');
 assert.equal(pinnedGoalPlanStatus('goal-a',{homeBundlePreparationV1:{broken:true}},packet),'review');
 assert.equal(JSON.stringify(fields),before);
});
test('a foreign goal record cannot be represented as this goal’s saved plan',()=>{
 assert.equal(pinnedGoalPlanStatus('goal-b',{homeBundlePreparationV1:preparation},packet),'review');
 assert.equal(pinnedGoalPlanStatus('goal-b',{homeSolutionBundlesV1:attached},packet),'review');
});
test('empty proposals have no plan and missing source evidence needs review',()=>{
 const empty={...preparation,proposal:{...proposal,bundles:[],unavailableReason:'Evidence is unavailable.'}};
 assert.equal(pinnedGoalPlanStatus('goal-a',{homeBundlePreparationV1:empty},packet),'none');
 assert.equal(pinnedGoalPlanStatus('goal-a',{homeBundlePreparationV1:preparation},{sources:[]}),'review');
});
test('a saved option B opens directly and does not silently select option A',()=>{
 const workspace=readBundleWorkspace(attached,'goal-a');
 assert.equal(preferredSavedBundleId(workspace,binding,['A','B','C']),'B');
 assert.equal(preferredSavedBundleId(readBundleWorkspace(saved,'goal-a'),binding,['A','B','C']),'B');
 assert.equal(preferredSavedBundleId(null,binding,['A','B','C']),'A');
});
test('replacement keeps old attachments and selects only a matching current binding',async()=>{
 const inputs=structuredClone(draft.inputs);inputs.scope.population={value:'Updated cohort',kind:'user-entered',basis:'Reviewed fixture.'};
 const revised=reviseBundleDraft(draft,inputs),next=attachBundlePatch(saveBundleCalculationPatch(attached,revised,reconcileBundle(revised)).value,revised,confirmation(revised),'second','2026-10-05T01:00:00.000Z','first').value;
 const before=JSON.stringify(next);
 assert.equal(preferredSavedBundleId(next,binding,['A','B','C']),'B');
 const other=await actionBinding('goal-b',goal,packet,{});
 assert.equal(preferredSavedBundleId(next,other,['A','B','C']),'A');
 const changed=await actionBinding('goal-a',goal,{sources:[{id:'W1',status:'loaded',facts:{headcount:21}}]},{});
 assert.equal(preferredSavedBundleId(next,changed,['A','B','C']),'A');
 assert.equal(preferredSavedBundleId(next,binding,['A','C']),'A');
 assert.equal(JSON.stringify(next),before);
 assert.deepEqual(next.attachments[0],attached.attachments[0]);
});

test('restoration preserves saved unknowns and can recover an attachment without a separate draft',()=>{
 const attachmentOnly={...attached,drafts:[],calculations:[]},before=JSON.stringify(attachmentOnly);
 const restored=restoredBundleDraft(attachmentOnly,binding,'B');
 assert.deepEqual(restored,draft);
 assert.deepEqual(restoredBundleResult(attachmentOnly,restored),attached.attachments[0].result);
 assert.equal(restored.inputs.expenses.length,0);
 assert.equal(JSON.stringify(attachmentOnly),before);
});
test('newer unsaved input revisions retain historical results as stale without borrowing another option',()=>{
 const inputs=structuredClone(draft.inputs);inputs.scope.population=entered('Unsaved revised cohort');
 const revised=reviseBundleDraft(draft,inputs);
 const result=restoredBundleResult(attached,revised);
 assert.equal(result.inputKey,bundleInputKey(draft));
 assert.notEqual(result.inputKey,bundleInputKey(revised));
 assert.equal(restoredBundleDraft(attached,binding,'A'),null);
 assert.equal(restoredBundleResult(attached,createBundleDraft(proposal.bundles[0],binding)),null);
});
