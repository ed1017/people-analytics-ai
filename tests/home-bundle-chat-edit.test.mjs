import test from 'node:test';
import assert from 'node:assert/strict';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {createBundleDraft,reviseBundleDraft,reconcileBundle,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {emptyWorkforcePlanInput} from '../lib/workforce-increment.ts';
const binding=await actionBinding('goal-a','Build skills without adding headcount',{sources:[{id:'W1',status:'loaded',facts:{headcount:20}}]},{});
const base=()=>prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(binding.goal).bundles[0],binding),'2026-10-05T00:00:00Z');
test('preview is nonmutating and acceptance changes only named assumptions with a new revision',()=>{
 const draft=base(),before=structuredClone(draft),preview=previewBundleChatEdit(draft,'Set pilot participants to 12; Set manager facilitation and materials to $1,500');
 assert.deepEqual(draft,before);assert.equal(preview.changes.length,2);const accepted=acceptBundleChatEdit(draft,preview);
 assert.equal(accepted.revision,draft.revision+1);assert.equal(accepted.inputs.groups[0].count.value,12);assert.equal(accepted.inputs.expenses[0].amount.value,1500);assert.equal(accepted.inputs.expenses[0].amount.kind,'user-entered');
 assert.deepEqual(accepted.pilot,draft.pilot);assert.deepEqual(accepted.bundle,draft.bundle);assert.deepEqual(accepted.inputs.timing,draft.inputs.timing);assert.deepEqual(accepted.inputs.expenses.slice(1),draft.inputs.expenses.slice(1));assert.deepEqual(draft,before);
});
test('unknown, explicit zero and illustrative provenance remain distinct after adoption',()=>{
 const draft=base(),preview=previewBundleChatEdit(draft,'Set pilot participants to 0; Set manager facilitation and materials to Unknown; Set unallocated learning pilot to Illustrative $750');
 const next=acceptBundleChatEdit(draft,preview);assert.equal(next.inputs.groups[0].count.value,0);assert.equal(next.inputs.groups[0].count.kind,'user-entered');assert.deepEqual(next.inputs.expenses[0].amount,{value:null,kind:'unknown',basis:null});assert.equal(next.inputs.expenses[1].amount.value,750);assert.equal(next.inputs.expenses[1].amount.kind,'illustrative');
});
test('unsupported, duplicate or invalid clauses reject the whole proposal without a partial edit',()=>{
 const draft=base(),before=structuredClone(draft);
 for(const request of ['Set pilot participants to 12; Set budget to $50000','Set pilot participants to 12; set pilot participants to 13','Set pilot participants to -1','Set pilot participants to 1.5','Set pilot participants to 1000001','Set shared horizon to 0 months','Set shared horizon to 25 months','Set shared start month to 2027-13','Set c1 finish to 2026-02-30','Set c1 finish to 2026-01-01','Set deadline to 2027-01-01','Set hiring to 3','Reduce expenses by 20%','Set pilot participants to 12 and hire 3'])assert.throws(()=>previewBundleChatEdit(draft,request),request);
 assert.deepEqual(draft,before);
});
test('goal, plan, evidence and revision changes invalidate an old preview; tampered patches are rejected',async()=>{
 const draft=base(),preview=previewBundleChatEdit(draft,'Set pilot participants to 12');
 const edits=[reviseBundleDraft(draft,draft.inputs),{...draft,binding:await actionBinding('goal-b',binding.goal,{sources:[]},{})},{...draft,binding:await actionBinding('goal-a',binding.goal,{sources:[{id:'W1',facts:{headcount:21}}]},{})},prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(binding.goal).bundles[1],binding),'2026-10-05T00:00:00Z')];
 for(const changed of edits)assert.throws(()=>acceptBundleChatEdit(changed,preview),/changed/);
 const tampered=structuredClone(preview);tampered.inputs.groups[0].count.value=99;assert.throws(()=>acceptBundleChatEdit(draft,tampered),/proposal changed/);
});
test('acceptance stales earlier results and never shifts dates or recalculates implicitly',()=>{
 const draft=base(),result=reconcileBundle(draft),next=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set shared horizon to 6 months'));
 assert.notEqual(result.inputKey,bundleInputKey(next));assert.equal(next.inputs.scope.comparisonConfirmed.value,null);assert.deepEqual(next.inputs.timing,draft.inputs.timing);assert.deepEqual(next.inputs.expenses,draft.inputs.expenses);assert.equal(result.scope.months.value,3);assert.equal(reconcileBundle(next).scope.months.value,6);
 const shifted=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set shared start month to 2027-01'));assert.throws(()=>reconcileBundle(shifted),/horizon/);assert.deepEqual(shifted.inputs.timing,draft.inputs.timing);
});
test('date edits require exact valid dates and preserve hypothetical values unless explicitly adopted',()=>{
 const draft=base(),next=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set c1 finish to Illustrative 2026-11-14; Set c2 start to 2026-11-15'));
 assert.equal(next.inputs.timing[0].finish.kind,'illustrative');assert.equal(next.inputs.timing[1].start.kind,'user-entered');assert.equal(next.inputs.timing[1].start.value,'2026-11-15');
});
test('shared horizon edits keep an existing staffing horizon aligned without inferring staffing values',()=>{
 const draft=base(),inputs=structuredClone(draft.inputs),input=emptyWorkforcePlanInput();input.planningMonth=inputs.scope.startMonth.value;input.months=String(inputs.scope.months.value);
 inputs.capacity={input,origins:Object.fromEntries(Object.entries(input).map(([key,value])=>[key,value?{kind:'user-entered',basis:'Existing reviewed assumption.'}:{kind:'unknown',basis:null}])),flows:[]};
 const withCapacity=reviseBundleDraft(draft,inputs),next=acceptBundleChatEdit(withCapacity,previewBundleChatEdit(withCapacity,'Set shared horizon to 6 months; Set start month to Unknown'));
 assert.equal(next.inputs.capacity.input.months,'6');assert.equal(next.inputs.capacity.origins.months.kind,'user-entered');assert.equal(next.inputs.capacity.input.planningMonth,'');assert.deepEqual(next.inputs.capacity.origins.planningMonth,{kind:'unknown',basis:null});
 for(const key of Object.keys(input).filter(key=>!['months','planningMonth'].includes(key)))assert.equal(next.inputs.capacity.input[key],input[key]);assert.equal(next.inputs.scope.capacityRequired.value,null);
});
test('ambiguous names and oversized requests fail closed with no mutation',()=>{
 const draft=base(),inputs=structuredClone(draft.inputs);inputs.groups[0].label='Reviewed group';inputs.groups.push({...structuredClone(inputs.groups[0]),id:'second'});const ambiguous=reviseBundleDraft(draft,inputs),before=structuredClone(ambiguous);
 assert.throws(()=>previewBundleChatEdit(ambiguous,'Set '+inputs.groups[0].label+' participants to 12'),/more than one/);
 assert.throws(()=>previewBundleChatEdit(ambiguous,'Set pilot participants to 12'),/not a supported/);
 assert.throws(()=>previewBundleChatEdit(ambiguous,'x'.repeat(1201)),/1,200/);assert.deepEqual(ambiguous,before);
});
