import test from 'node:test';
import assert from 'node:assert/strict';
import {SWP_DEMAND_MODE,illustrativeServiceReview,readDemandReview} from '../lib/swp-demand.ts';
import {demandInputSourceLabel,demandEditorIntent,createDemandEditorDraft,reviewDemandEditor} from '../lib/swp-demand-editor.ts';
const context={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-editor-fixture',datasetToken:'legacy-v1:0',boundGoal:{id:'',statement:''},revision:1};
const review=()=>illustrativeServiceReview(context,'2026-10-08T12:00:00Z');

test('only explicit editor requests are intercepted; normal corrections, quotes and negations stay in chat',()=>{
 for(const text of ['Open Planning Calculator','Show me the Planning Calculator','Open the assumption editor','Show me an edit box','Can you show me an editor for these assumptions?','Please open the editor.','I’d like an assumption editor','Could you give me an edit box, please?'])assert.equal(demandEditorIntent(text),'open',text);
 for(const text of ['Make that nine months','Assume 25% available','Can I edit assumptions?','Explain the editor','Do not open the editor','I do not want an editor','"open the editor"','Someone said open the editor','Open the editor and set availability to 50%','Review these assumptions'])assert.equal(demandEditorIntent(text),null,text);
 assert.equal(demandEditorIntent('Cancel the assumption editor'),'close');assert.equal(demandEditorIntent('Cancel Planning Calculator'),'close');for(const text of ['Do not open Planning Calculator','Open Planning Calculator and set availability to 50%'])assert.equal(demandEditorIntent(text),null);
});
test('months-only review preserves all untouched values and provenance, without mutating accepted input',()=>{
 const base=review(),before=structuredClone(base),draft=createDemandEditorDraft(base);draft.months='9';
 const next=reviewDemandEditor(base,draft,context,'editor-months');
 assert.deepEqual(base,before);assert.equal(next.spec.months,9);assert.equal(next.result.workloadHours,6000);
 const {months,monthsBasis,...rest}=next.spec,{months:oldMonths,monthsBasis:oldBasis,...oldRest}=base.spec;
 assert.equal(months,9);assert.equal(oldMonths,12);assert.equal(oldBasis.kind,'illustrative');assert.deepEqual(rest,oldRest);
 assert.equal(monthsBasis.kind,'user-supplied');assert.equal(monthsBasis.turnId,'editor-months');
 assert.equal(next.basisTurns.at(-1).text,monthsBasis.quote);assert.deepEqual(readDemandReview(next,context),next);
});
test('repeated reviews retain prior edits and recalculate capacity using existing math',()=>{
 let base=review(),draft=createDemandEditorDraft(base);draft.months='9';base=reviewDemandEditor(base,draft,context,'first');
 draft=createDemandEditorDraft(base);draft.values.existingRoles='4';draft.values.availabilityPct='25';
 const next=reviewDemandEditor(base,draft,context,'second');
 assert.equal(next.spec.months,9);assert.deepEqual(next.spec.monthsBasis,base.spec.monthsBasis);
 assert.equal(next.result.availableFte,1);assert.equal(next.result.capacityHours,1200);assert.equal(next.result.gapHours,4800);assert.equal(next.result.additionalRoles,4);
 assert.deepEqual(next.spec.hoursPerContract,base.spec.hoursPerContract);assert.equal(next.spec.budgetUsd.value,null);assert.equal(next.spec.budgetUsd.basis.kind,'unknown');
 assert.throws(()=>reviewDemandEditor(next,draft,context,'replay'),/changed/);
});
test('explicit rate period changes use the existing conversion, while the other rate stays exact',()=>{
 const base=review(),draft=createDemandEditorDraft(base);draft.values.hoursPerContract='500';draft.periods.hoursPerContract='month';
 const next=reviewDemandEditor(base,draft,context,'period');
 assert.equal(next.result.workloadHours,12000);assert.deepEqual(next.spec.productiveHoursPerFte,base.spec.productiveHoursPerFte);
 assert.equal(next.spec.hoursPerContract.basis.quote,'Role hours per contract: 500 per month.');
});
test('stale key, stale dataset/context and forged calculations cannot be applied',()=>{
 const base=review(),draft=createDemandEditorDraft(base);draft.months='9';
 assert.throws(()=>reviewDemandEditor(base,{...draft,baseKey:'stale'},context,'stale'),/changed/);
 assert.throws(()=>reviewDemandEditor(base,draft,{...context,datasetToken:'other-v2:1'},'dataset'),/another decision/);
 assert.throws(()=>reviewDemandEditor(base,draft,{...context,revision:2},'revision'),/another decision/);
 const forged=structuredClone(base);forged.result.additionalRoles=0;
 assert.throws(()=>reviewDemandEditor(forged,draft,context,'forged'),/calculation changed/);
});
test('no-op formatting keeps original provenance; cancelling draft edits requires no mutation',()=>{
 const base=review(),before=structuredClone(base),draft=createDemandEditorDraft(base);
 draft.values.contracts='2.0';assert.throws(()=>reviewDemandEditor(base,draft,context,'noop'),/No planning input values changed/);
 draft.values.contracts='4';draft.months='9';assert.deepEqual(base,before);
 assert.deepEqual(createDemandEditorDraft(base).values.contracts,'2');
});
test('existing validation rejects invalid months, whole-role counts, percentages, FTE and periods',()=>{
 for(const change of [d=>d.months='0',d=>d.months='25',d=>d.months='1.5',d=>d.startMonth='2027-13',d=>d.values.availabilityPct='101',d=>d.values.existingRoles='4.5',d=>d.values.ftePerRole='1.1',d=>d.periods.hoursPerContract='week',d=>d.values.contracts='NaN',d=>d.values.contracts='',d=>d.values.productiveHoursPerFte='100000']){
  const base=review(),before=structuredClone(base),draft=createDemandEditorDraft(base);change(draft);
  assert.throws(()=>reviewDemandEditor(base,draft,context,'invalid'));assert.deepEqual(base,before);
 }
});
test('unknown optional inputs remain unknown unless explicitly supplied; missing units do not create a calculation',()=>{
 const base=review(),draft=createDemandEditorDraft(base);draft.values.budgetUsd='0';
 const next=reviewDemandEditor(base,draft,context,'zero');assert.equal(next.spec.budgetUsd.value,0);assert.equal(next.spec.budgetUsd.basis.kind,'user-supplied');assert.deepEqual(next.spec.explicitAdditionalRoles,base.spec.explicitAdditionalRoles);
 const incomplete=createDemandEditorDraft(base);incomplete.periods.hoursPerContract='';
 const blocked=reviewDemandEditor(base,incomplete,context,'unknown-period');assert.equal(blocked.result.status,'needs-inputs');assert.equal(blocked.result.additionalRoles,null);
});

test('source labels distinguish fictional and proposed assumptions from unverified manual inputs',()=>{
 assert.equal(demandInputSourceLabel('illustrative'),'Fictional example assumption');
 assert.equal(demandInputSourceLabel('model-proposed'),'Model-proposed planning assumption · not verified actual');
 assert.equal(demandInputSourceLabel('user-supplied'),'User-supplied input · not verified actual');
 assert.equal(demandInputSourceLabel('unknown'),'Unknown');
});
