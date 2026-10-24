import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo,prepareSwpSelection,readSwpSaveReview,swpDemoField} from '../lib/swp-demo.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
import {goalProgressField,readGoalProgressLedger} from '../lib/goal-progress.ts';
const at='2026-10-16T12:00:00Z';
test('guided scenario compares quantified options, reviews coupled edits, saves and reopens with a target but no invented outcome',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('No network permitted in deterministic demo')};
 try {
 const values=new Map(),port={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},store=new DecisionStore();store.initialize(port);
 const draft=await createSwpDemo('guided-release',at),key=bundleInputKey(draft),initial=await compareSwpDemo(draft);
 assert.ok(initial.options.length>=2);assert.ok(initial.options.every(o=>Number.isFinite(o.candidate.cash.complete)));
 const preview=previewBundleChatEdit(draft,'Set Service units per month to 1120; Set budget to 500000; Set annual hire cost to 65000; Set training cash to 12000; Set training hours to 120');
 assert.equal(bundleInputKey(draft),key,'review must not mutate original');
 const revised=acceptBundleChatEdit(draft,preview);assert.notEqual(bundleInputKey(revised),initial.inputKey);
 assert.equal(revised.inputs.budget.amount.value,500000);assert.equal(revised.inputs.capacity.input.budget,'500000');
 const comparison=await compareSwpDemo(revised),selected=comparison.options.find(o=>o.candidate.status==='met');assert.ok(selected);
 const prepared=await prepareSwpSelection(store,revised,comparison.evaluation,selected.id,at,()=>true);
 assert.equal(store.getSnapshot().data.goals.goals.length,0,'review does not save');
 store.commitGoalSelection(prepared.goal.id,prepared.goal.statement,prepared.revision,at,()=>prepared.fields,true);
 const reopened=new DecisionStore();reopened.initialize(port);const fields=reopened.getSnapshot().data.workspaces[prepared.goal.id].fields;
 assert.equal(bundleInputKey(readSwpSaveReview(fields[swpDemoField]).draft),bundleInputKey(revised));
 const ledger=readGoalProgressLedger(fields[goalProgressField],prepared.goal.id);
 assert.ok(ledger.events.some(e=>e.kind==='measurement'&&e.data.target.value===4));
 assert.ok(!ledger.events.some(e=>e.kind==='observed'),'saved target is not a measured outcome');
 } finally {globalThis.fetch=originalFetch;}
});

import {guidedPlanSummary,applicablePlanComponents} from '../lib/guided-plan-summary.ts';
import {guidedOptionEffort} from '../lib/swp-demo.ts';
import {readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {planDirections} from '../lib/plan-directions.ts';
test('every offered choice retains exact computed summary and active actions after save, including revised inputs',async()=>{
 const original=await createSwpDemo('guided-choice-summary',at);
 const changed=acceptBundleChatEdit(original,previewBundleChatEdit(original,'Set Service units per month to 1120; Set budget to 500000; Set training cash to 12000; Set annual hire cost to 65000'));
 for(const draft of [original,changed]){
  const compared=await compareSwpDemo(draft);
  for(const choice of compared.options.filter(o=>o.candidate.status==='met')){
   const store=new DecisionStore(),values=new Map();store.initialize({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)});
   const summary=guidedPlanSummary(choice.draft);
   assert.deepEqual(summary.mix,choice.candidate.mix);
   assert.equal(summary.cash,choice.candidate.cash.complete);
   assert.equal(summary.ready,choice.candidate.metrics.fullCoverageDate);
   assert.deepEqual(summary.effort,guidedOptionEffort(choice));
   const prepared=await prepareSwpSelection(store,draft,compared.evaluation,choice.id,at,()=>true);
   store.commitGoalSelection(prepared.goal.id,prepared.goal.statement,prepared.revision,at,()=>prepared.fields,true);
   const fields=store.getSnapshot().data.workspaces[prepared.goal.id].fields;
   const review=readSwpSaveReview(fields[swpDemoField]);
   const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:prepared.goal.id,goal:prepared.goal.statement});
   const saved=catalog.plans.find(p=>p.id===review.selectedPlanId);
   const reopenedSummary=guidedPlanSummary(saved.draft);
   for(const key of ['mix','cash','ready','effort'])assert.deepEqual(reopenedSummary[key],summary[key]);
   for(const key of ['baselineFte','roles','deadline','population','fteGap'])assert.deepEqual(reopenedSummary.target[key],summary.target[key]);
   const actions=applicablePlanComponents(saved.draft),directions=planDirections(saved.draft);
   assert.deepEqual(directions.map(d=>d.id).sort(),actions.map(c=>c.id).sort());
   for(const [path,domain] of [['buy','hiring'],['build','learning'],['move','mobility']]){
    if(choice.candidate.mix[path]===0)assert.ok(!actions.some(c=>c.domain===domain));
   }
   assert.equal(saved.draft.bundle.components.length,Object.values(choice.candidate.mix).filter(n=>n>0).length,'ordinary save adapter retains only active actions');
  }
 }
 const stale=await compareSwpDemo(original),store=new DecisionStore();store.initialize({getItem:()=>null,setItem:()=>{},removeItem:()=>{}});
 await assert.rejects(prepareSwpSelection(store,changed,stale.evaluation,stale.options[0].id,at,()=>true));
});
import {guidedPlanTarget,staffingCashBreakdown} from '../lib/guided-plan-summary.ts';
import {homePlanSummary} from '../lib/home-plan-summary.ts';
import {readProgressSnapshot} from '../lib/goal-progress-summary.ts';
test('capacity target and cash components agree across every choice, saved plan and Track after demand, cost and horizon edits',async()=>{
 const original=await createSwpDemo('guided-outcome-cost',at);
 const changed=acceptBundleChatEdit(original,previewBundleChatEdit(original,'Set Service units per month to 1200; Set budget to 500000; Set training cash to 12000; Set annual hire cost to 65000; Set shared horizon to 6 months'));
 for(const draft of [original,changed]){
  const compared=await compareSwpDemo(draft),target=guidedPlanTarget(draft);assert.ok(target);
  if(draft===changed){assert.equal(target.fteGap,4.5);assert.equal(target.roles,5);assert.equal(target.deadline,'2027-10-31');}
  for(const choice of compared.options.filter(o=>o.candidate.status==='met')){
   const key=bundleInputKey(choice.draft),cost=staffingCashBreakdown(choice.draft,choice.candidate.cash);
   assert.equal(Math.round(cost.lines.reduce((n,l)=>n+l.total,0)*100),Math.round(cost.total*100));
   assert.equal(cost.end,draft===changed?'2027-04-30':'2027-10-31');assert.equal(cost.start,draft.inputs.scope.startMonth.value);
   assert.equal(cost.lines.find(l=>l.id==='capacity:trainingCash').total,choice.candidate.cash.ledger.find(l=>l.id==='capacity:trainingCash').total);
   const store=new DecisionStore(),values=new Map(),port={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};store.initialize(port);
   const prepared=await prepareSwpSelection(store,draft,compared.evaluation,choice.id,at,()=>true);store.commitGoalSelection(prepared.goal.id,prepared.goal.statement,prepared.revision,at,()=>prepared.fields,true);
   const reopened=new DecisionStore();reopened.initialize(port);const fields=reopened.getSnapshot().data.workspaces[prepared.goal.id].fields,review=readSwpSaveReview(fields[swpDemoField]);
   const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:prepared.goal.id,goal:prepared.goal.statement}),saved=catalog.plans.find(p=>p.id===review.selectedPlanId);
   assert.deepEqual(guidedPlanSummary(saved.draft).effort,guidedOptionEffort(choice));
   assert.equal(guidedPlanSummary(saved.draft).effort.shortfallHours,guidedOptionEffort(choice).shortfallHours);
   const measure=homePlanSummary(saved.draft,saved.result).find(s=>s.heading==='How success is measured').items.join(' '),progress=readProgressSnapshot(fields[goalProgressField],prepared.goal.id,'2026-10-16');
   assert.ok(measure.includes(`Scenario target: ${target.roles} whole roles by ${target.deadline}`));assert.ok(measure.includes(target.population));assert.match(measure,/1 qualified, allocated FTE per additional role/);assert.match(measure,/Measured baseline and later outcome.*remain unknown/);assert.doesNotMatch(measure,/Completion of agreed delivery milestones|Target: Unknown/);
   assert.equal(progress.context.measurement.target.value,target.roles);assert.equal(progress.context.measurement.target.date,target.deadline);assert.equal(progress.context.measurement.unit,'roles');assert.equal(progress.latest,null);assert.equal(progress.baseline,null);assert.match(progress.nextAction,/proficiency\/work-sample validation/);assert.doesNotMatch(progress.nextAction,/no supported measurement summary/);
   assert.deepEqual(staffingCashBreakdown(saved.draft,guidedPlanSummary(saved.draft).cashBreakdown),cost);assert.equal(bundleInputKey(choice.draft),key,'presentation must not rewrite assumptions');
  }
 }
 const compared=await compareSwpDemo(original),cash=structuredClone(compared.options[0].candidate.cash);cash.complete=null;cash.ledger[0].total=null;cash.ledger[1].total=0;
 const view=staffingCashBreakdown(original,cash);assert.equal(view.total,null);assert.equal(view.lines[0].total,null);assert.equal(view.lines[1].total,0);
});
