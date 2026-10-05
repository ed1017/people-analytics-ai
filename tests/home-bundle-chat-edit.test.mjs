import test from 'node:test';
import assert from 'node:assert/strict';
import {previewBundleChatEdit,acceptBundleChatEdit,bundleChatEditExamples} from '../lib/home-bundle-chat-edit.ts';
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
test('everyday start, duration and participant phrases produce the same reviewed edits',()=>{
 const draft=base(),before=structuredClone(draft);
 for(const phrase of ['start in December 2026','Please start the plan in Dec 2026.','Could we move the start to 2026-12?']){
  const preview=previewBundleChatEdit(draft,phrase);assert.equal(preview.inputs.scope.startMonth.value,'2026-12');assert.equal(preview.inputs.scope.startMonth.kind,'user-entered');assert.deepEqual(preview.inputs.timing,draft.inputs.timing);assert.deepEqual(preview.inputs.expenses,draft.inputs.expenses);
 }
 for(const phrase of ['make it three months','run the plan for 3 months','Can you make the plan six months?'])assert.equal(previewBundleChatEdit(draft,phrase).inputs.scope.months.value,phrase.includes('six')?6:3);
 for(const phrase of ['use 20 participants','please use twenty participants','use zero participants','change participants to 14'])assert.equal(previewBundleChatEdit(draft,phrase).inputs.groups[0].count.value,phrase.includes('zero')?0:phrase.includes('14')?14:20);
 const combined=previewBundleChatEdit(draft,'start in December 2026 and make it three months and use 20 participants');assert.equal(combined.changes.length,3);assert.equal(combined.inputs.scope.comparisonConfirmed.value,null);assert.deepEqual(draft,before);
});
test('vague and total budgets ask for clarification without converting a ceiling into an expense',()=>{
 const draft=base(),before=structuredClone(draft);
 for(const phrase of ['budget20k','budget 20k','make the budget $20,000','Set budget to 20000','use 20 participants; budget20k','change total budget ceiling to 20000','use $20000 for the total budget'])assert.throws(()=>previewBundleChatEdit(draft,phrase),/total spending limit or a specific allowance/);
 const inputs=structuredClone(draft.inputs);inputs.expenses.push({...structuredClone(inputs.expenses[0]),id:'custom-budget',label:'Budget'});const named=reviseBundleDraft(draft,inputs);assert.throws(()=>previewBundleChatEdit(named,'Set budget to 20000'),/total spending limit/);
 assert.deepEqual(draft,before);
});
test('negation, exceptions, approximate values and multi-plan requests never create partial edits',()=>{
 const draft=base(),before=structuredClone(draft);
 for(const phrase of ["don't start in December 2026",'do not use 20 participants','use 20 participants instead of 10','use 20 participants unless staffing changes','start in December 2026; do not make it six months','use about 20 participants','make it three or six months','use 20 participants for both plans','change plan 2 participants to 20','use 20 participants; start the other plan in December 2026','use 20 participants and hire three people','start in December 2026, but keep the current dates'])assert.throws(()=>previewBundleChatEdit(draft,phrase),phrase);
 assert.deepEqual(draft,before);
});
test('missing years and ambiguous groups ask focused questions; named groups resolve independently',()=>{
 const draft=base();for(const phrase of ['start in December','start in next December','start in 2026-13'])assert.throws(()=>previewBundleChatEdit(draft,phrase),/Which month and year/);
 const inputs=structuredClone(draft.inputs);inputs.groups[0].label='Managers';inputs.groups.push({...structuredClone(inputs.groups[0]),id:'engineers',label:'Engineers'});const multi=reviseBundleDraft(draft,inputs);
 assert.throws(()=>previewBundleChatEdit(multi,'use 20 participants'),/Which participant group.*Managers.*Engineers/);
 const next=previewBundleChatEdit(multi,'use 20 participants for Engineers');assert.equal(next.inputs.groups[1].count.value,20);assert.deepEqual(next.inputs.groups[0],multi.inputs.groups[0]);
 const empty=createBundleDraft(bundleProposalFixture(binding.goal).bundles[0],binding);assert.throws(()=>previewBundleChatEdit(empty,'use 20 participants'),/Add a group/);
});
test('everyday edits preserve illustrative and unknown provenance and reject stale scope or another plan',()=>{
 const draft=base(),preview=previewBundleChatEdit(draft,'use illustrative twenty participants; start in Unknown');assert.equal(preview.inputs.groups[0].count.kind,'illustrative');assert.equal(preview.inputs.scope.startMonth.kind,'unknown');
 const inputs=structuredClone(draft.inputs);inputs.scope.population={value:'Other population',kind:'user-entered',basis:'Explicit new scope'};const changed=reviseBundleDraft(draft,inputs);
 assert.throws(()=>acceptBundleChatEdit(changed,preview),/changed/);const other=prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(binding.goal).bundles[1],binding),'2026-10-05T00:00:00Z');assert.throws(()=>acceptBundleChatEdit(other,preview),/changed/);
 assert.equal(acceptBundleChatEdit(draft,preview).revision,draft.revision+1);
});

test('selected-plan examples roundtrip through the parser without mutating known or unknown drafts',()=>{
 for(const draft of [base(),createBundleDraft(bundleProposalFixture(binding.goal).bundles[0],binding)]){
  const before=structuredClone(draft),examples=bundleChatEditExamples(draft);
  assert.ok(examples.length>0);assert.ok(examples.length<=4);
  for(const example of examples){const preview=previewBundleChatEdit(draft,example.command);assert.equal(preview.changes.length,1);assert.deepEqual(preview.changes[0].before,example.current);assert.equal(preview.changes[0].field,example.field);}
  assert.deepEqual(draft,before);
 }
 assert.ok(bundleChatEditExamples(base()).some(example=>example.unit==='USD per occurrence'));
});
test('multiple groups use exact names, ambiguous labels are omitted, and no-group plans invent none',()=>{
 const draft=base();draft.inputs.groups[0].label='Engineers';draft.inputs.groups.push({...structuredClone(draft.inputs.groups[0]),id:'another',label:'Designers'});
 const examples=bundleChatEditExamples(draft),group=examples.find(item=>item.unit==='participants');assert.match(group.command,/Engineers participants/);
 const next=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,group.command));assert.equal(next.inputs.groups[1].count.value,draft.inputs.groups[1].count.value);
 draft.inputs.groups[1].label='Engineers';assert.equal(bundleChatEditExamples(draft).filter(item=>item.unit==='participants').length,0);
 draft.inputs.groups=[];assert.equal(bundleChatEditExamples(draft).filter(item=>item.unit==='participants').length,0);
});
