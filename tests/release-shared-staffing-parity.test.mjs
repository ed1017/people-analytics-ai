import test from 'node:test';import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo,prepareSwpSelection,swpDemoField} from '../releases/2026-10-21/source/lib/swp-demo.ts';
import {guidedBusinessPlanning} from '../releases/2026-10-21/source/lib/guided-business-planning.ts';
import {guidedOptionEffort,optionMonthlyCoverage,guidedPlanSummary} from '../releases/2026-10-21/source/lib/guided-plan-summary.ts';
import {prepareBusinessPlanningSelection,businessPlanningSelectionFields,businessPlanningReceiptField} from '../releases/2026-10-21/source/lib/home-business-planning-save.ts';
import {readPlanAlternatives,planAlternativesField} from '../releases/2026-10-21/source/lib/home-plan-alternatives.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../releases/2026-10-21/source/lib/home-bundle-chat-edit.ts';
import {staffingChoiceSummary} from '../releases/2026-10-21/source/lib/staffing-choice-summary.ts';
import {scenarioRecommendation} from '../releases/2026-10-21/source/lib/scenario-planning-parity.ts';
import {unavailableMonthFraction} from '../releases/2026-10-21/source/lib/staffing-monthly-capacity.ts';
import {DecisionStore} from '../releases/2026-10-21/source/lib/local-decisions.ts';
const at='2026-10-21T00:00:00Z';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const edits=['','Set budget to 100000','Set Hire arrival date to 2026-11-16','Set Service units per month to 1200; Set Hire arrival date to 2026-12-16'];
for(const edit of edits)test('same options, dates, effort and saved contents: '+(edit||'base'),async()=>{
 let d=await createSwpDemo('guided-shared-save',at);if(edit)d=acceptBundleChatEdit(d,previewBundleChatEdit(d,edit));
 const store=new DecisionStore(),port=memory();store.initialize(port);
 const ordinary=guidedBusinessPlanning(d,store.getDatasetToken()),guide=await compareSwpDemo(d);
 const rows=guide.options.map(o=>({id:o.id,mix:o.candidate.mix,cash:o.candidate.cash.complete,date:o.candidate.metrics.fullCoverageDate,shortfall:guidedOptionEffort(o).shortfallHours,hours:guidedOptionEffort(o).additionalHours,status:o.candidate.status}));
 assert.deepEqual(rows,ordinary.staffing.result.options.map(o=>({id:o.id,mix:o.mix,cash:o.cash,date:o.coverageDate,shortfall:o.shortfallHours,hours:o.additionalHours,status:o.status})));
 assert.equal(rows.length,6);assert.ok(scenarioRecommendation(d,guide).includes(staffingChoiceSummary(ordinary.staffing.result.options)));
 if(edit==='Set Hire arrival date to 2026-11-16'){const allHire=guide.options[0];assert.equal(optionMonthlyCoverage(allHire)[0],2.5);assert.equal(guidedOptionEffort(allHire).shortfallHours,400);}
 if(edit.includes('2026-12-16')){const allHire=guide.options[0];assert.equal(guidedOptionEffort(allHire).shortfallHours,720+(720-5*16/31*160));assert.ok(guidedOptionEffort(allHire).shortfallHours>720);}
 const id='build-3-move-2-buy-0',selection=await prepareBusinessPlanningSelection(ordinary,id),direct=businessPlanningSelectionFields(selection,null,'swp-choice-0',at,undefined);
 const guided=await prepareSwpSelection(store,d,guide.evaluation,id,at,()=>true);
 const canonical=fields=>{const c=readPlanAlternatives(fields[planAlternativesField],{goalId:guided.goal.id,goal:guided.goal.statement});const receipt=fields[businessPlanningReceiptField].at(-1);return c.plans.find(p=>p.id===receipt.planId)};
 assert.deepEqual(canonical(guided.fields).draft,canonical(direct).draft);
 assert.deepEqual(guided.fields[businessPlanningReceiptField],direct[businessPlanningReceiptField]);
 store.commitGoalSelection(guided.goal.id,guided.goal.statement,guided.revision,at,()=>guided.fields,true);
 const reopened=new DecisionStore();reopened.initialize(port);const fields=reopened.getSnapshot().data.workspaces[guided.goal.id].fields;
 assert.deepEqual(canonical(fields).draft,selection.draft);assert.equal(fields[swpDemoField].candidateId,id);
 assert.equal(guidedPlanSummary(canonical(fields).draft).cash,26800);
 // Tampering remains rejected and no save is performed by preparation itself.
 const stale=structuredClone(guide.evaluation);stale.report.results[0].cash.complete=0;
 await assert.rejects(prepareSwpSelection(reopened,d,stale,'build-0-move-2-buy-3',at,()=>true));
});
test('calendar-day proration handles leap months and rejects invalid dates',()=>{assert.equal(unavailableMonthFraction('2028-02-15'),14/29);assert.equal(unavailableMonthFraction('2027-02-01'),0);assert.throws(()=>unavailableMonthFraction('2027-02-30'));});

test('guide adapter rejects narrower hiring bounds instead of inventing alternatives',async()=>{
 const d=await createSwpDemo('guided-narrow-buy',at),store=new DecisionStore();store.initialize(memory());
 d.inputs.mixScenario.bounds.buy.value.max=0;
 assert.throws(()=>guidedBusinessPlanning(d,store.getDatasetToken()),/hiring maximum/);
 const result=await compareSwpDemo(d);assert.equal(result.options.length,1);assert.equal(result.options[0].candidate.mix.buy,0);
});
