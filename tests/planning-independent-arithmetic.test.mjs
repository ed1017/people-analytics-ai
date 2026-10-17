/** Audit oracles are worked constants, never computed by another production calculator. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo,prepareSwpSelection,readSwpSaveReview,swpDemoField} from '../lib/swp-demo.ts';
import {guidedWorkloadResult} from '../lib/guided-workload.ts';
import {guidedOptionEffort,guidedPlanSummary,optionMonthlyCoverage} from '../lib/guided-plan-summary.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {reviewBundleProposal,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {emptyWorkforcePlanInput,calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
import {readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {goalProgressField} from '../lib/goal-progress.ts';
import {readProgressSnapshot} from '../lib/goal-progress-summary.ts';
const at='2026-10-16T12:00:00Z';
const change=(d,text)=>acceptBundleChatEdit(d,previewBundleChatEdit(d,text));

test('independent demand matrix: fractions, allocation/proficiency once, zero and unknown',async()=>{
 const base=await createSwpDemo('guided-independent-demand',at);
 // [volume, hours/unit, productive hours, people, FTE/person, allocation%, proficiency%, expected outputs]
 const cases=[
  [1200,1,160,10,1,50,60,[14400,3,5760,8640,4.5,5]],
  [1281,1,160,10,1,50,60,[15372,3,5760,9612,5.00625,6]],
  [960,1.5,120,8,0.5,75,50,[17280,1.5,2160,15120,10.5,11]],
  [480,1,160,10,1,50,60,[5760,3,5760,0,0,0]],
  [100,1,160,10,1,50,60,[1200,3,5760,0,0,0]],
  [0,1,160,10,1,50,60,[0,3,5760,0,0,0]],
  [1200,1,160,0,1,50,60,[14400,0,0,14400,7.5,8]],
  [1200,1,160,10,1,0,60,[14400,0,0,14400,7.5,8]],
  [1200,1,160,10,1,50,0,[14400,0,0,14400,7.5,8]],
 ];
 for(const row of cases){const input=structuredClone(base.inputs);['volume','hoursPerUnit','productiveHours','existingPeople','ftePerPerson','allocationPct','skillCoveragePct'].forEach((key,i)=>input.guidedWorkload[key].value=row[i]);const r=guidedWorkloadResult(input);
  assert.equal(r.status,'calculated');assert.deepEqual([r.workloadHours,r.availableFte,r.capacityHours,r.gapHours,r.additionalFte,r.additionalRoles],row[7]);
 }
 for(const key of ['productiveHours','ftePerPerson']){const input=structuredClone(base.inputs);input.guidedWorkload[key].value=0;assert.equal(guidedWorkloadResult(input).status,'needs-inputs','zero denominator is not zero capacity');}
 const input=structuredClone(base.inputs);input.guidedWorkload.skillCoveragePct={value:null,kind:'unknown',basis:null};assert.equal(guidedWorkloadResult(input).status,'needs-inputs');
});

test('independent readiness/cash matrix keeps partial-month effort distinct from paid days',async()=>{
 const base=change(await createSwpDemo('guided-independent-readiness',at),'Set Service units per month to 1200'),compared=await compareSwpDemo(base),mixed=compared.options.find(o=>o.candidate.mix.buy===3&&o.candidate.mix.move===2);
 // Nov30: 1/30 * $24,000 + 11 * $24,000 payroll; fees $9,000; uplift $22,000.
 // Dec15: 17/31 * $24,000 + 10 * $24,000 payroll; fees $9,000; uplift $22,000.
 for(const [arrival,coverage,shortfall,cash] of [
  ['2026-11-01',[3,5,5],240,319000],
  ['2026-11-30',[0,5,5],720,295800],
  ['2026-12-01',[0,5,5],720,295000],
  ['2026-12-15',[0,2,5],1120,284161.29],
 ]){const draft=change(mixed.draft,`Set Hire arrival date to ${arrival}`),option={draft,coverage:reviewBundleProposal(draft).conditionalCoverage};assert.deepEqual(optionMonthlyCoverage(option).slice(0,3),coverage);assert.equal(guidedOptionEffort(option).shortfallHours,shortfall);assert.equal(guidedPlanSummary(draft).cash,cash);}
 // Paid November hire cannot supply work before a December 15 prerequisite is complete.
 const input=structuredClone(mixed.draft.inputs),flow=input.capacity.flows.find(f=>f.path==='buy');
 for(const id of flow.componentIds)input.timing.find(t=>t.componentId===id).finish.value='2026-12-15';
 const delayed=reviseBundleDraft(mixed.draft,input),option={draft:delayed,coverage:reviewBundleProposal(delayed).conditionalCoverage};
 assert.deepEqual(optionMonthlyCoverage(option).slice(0,3),[0,2,5]);assert.equal(guidedOptionEffort(option).shortfallHours,1120);assert.equal(guidedPlanSummary(delayed).cash,319000,'paid payroll is not delayed by readiness');
});

test('independent leap-month cash ledger includes each component once and separates staff time',()=>{
 const input={...emptyWorkforcePlanInput(),businessUnit:'TECH',jobProfile:'ENGINEER',intent:'additional',roles:'3',build:'1',move:'1',buy:'1',backfills:'1',planningMonth:'2028-02',months:'3',recruitingStart:'2028-02-01',arrivalMode:'explicit',arrivalDate:'2028-02-29',buildMonth:'2028-03',moveMonth:'2028-02',backfillDate:'2028-03-01',annualHireCost:'120000',hireFee:'2000',annualBackfillCost:'60000',backfillFee:'1000',internalAnnualCostChange:'12000',trainingCash:'3000',trainingHours:'20',loadedHourlyCost:'50',budget:'40000',maxAddedEmployees:'2',deadlineMonth:'2028-04'};
 const r=calculateWorkforceIncrement(input,null);
 assert.deepEqual(r.rows.map(x=>[x.hireStaffingCost,x.backfillStaffingCost,x.internalSalaryUplift,x.recruitingFees,x.trainingCash,x.incrementalCash]),[[344.83,0,500,2000,3000,5844.83],[10000,5000,1000,1000,0,17000],[10000,5000,1000,0,0,16000]]);
 assert.equal(r.totalCash,38844.83);assert.equal(r.totalTime,1000);assert.equal(r.totalWithTime,39844.83);assert.equal(r.maxAddedEmployees,2);assert.equal(r.checks[0].status,'met');
 const unknown=calculateWorkforceIncrement({...input,annualHireCost:''},null);assert.equal(unknown.totalCash,null);assert.equal(unknown.checks[0].status,'unknown');
});

test('both options retain independent expected values through review, save, reopen and Track projection',async()=>{
 const base=change(await createSwpDemo('guided-independent-save',at),'Set Service units per month to 1200'),comparison=await compareSwpDemo(base);
 for(const [build,buy,cash,shortfall,additionalHours,totalHours,ready] of [[3,0,26800,1120,8320,14080,'2027-01-01'],[0,3,319000,240,9280,15040,'2026-12-01']]){
  const choice=comparison.options.find(o=>o.candidate.mix.build===build&&o.candidate.mix.buy===buy&&o.candidate.mix.move===2);assert.ok(choice);
  const expectedEffort={additionalHours,totalHours,shortfallHours:shortfall};assert.deepEqual(guidedOptionEffort(choice),expectedEffort);assert.equal(choice.candidate.cash.complete,cash);
  const assertSummary=draft=>{const s=guidedPlanSummary(draft);assert.deepEqual(s.effort,expectedEffort);assert.equal(s.cash,cash);assert.equal(s.ready,ready);assert.equal(s.target.roles,5);assert.equal(s.target.fteGap,4.5);assert.equal(s.target.deadline,'2027-10-31');};assertSummary(choice.draft);
  const values=new Map(),port={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},store=new DecisionStore();store.initialize(port);
  const prepared=await prepareSwpSelection(store,base,comparison.evaluation,choice.id,at,()=>true);store.commitGoalSelection(prepared.goal.id,prepared.goal.statement,prepared.revision,at,()=>prepared.fields,true);
  const reopened=new DecisionStore();reopened.initialize(port);const fields=reopened.getSnapshot().data.workspaces[prepared.goal.id].fields,review=readSwpSaveReview(fields[swpDemoField]),catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:prepared.goal.id,goal:prepared.goal.statement});assertSummary(catalog.plans.find(p=>p.id===review.selectedPlanId).draft);
  const progress=readProgressSnapshot(fields[goalProgressField],prepared.goal.id,'2026-10-16');assert.equal(progress.context.measurement.target.value,5);assert.equal(progress.context.measurement.target.date,'2027-10-31');assert.equal(progress.baseline,null);assert.equal(progress.latest,null);
 }
});

import {calculateMonthlyWorkload,monthlyWorkloadVersion} from '../lib/swp-monthly-workload.ts';
test('standalone monthly planner keeps movement stocks and signed surplus separate from guided staffing',()=>{
 const q=(value,unit)=>({value,unit,basis:{kind:'user-assumption',note:'Independent arithmetic audit'}}),move=(people=0,fte=0,mode='explicit')=>({people:q(people,'people'),fte:{mode,quantity:q(fte,mode==='explicit'?'FTE':'FTE/person')}});
 const month=date=>({month:date,scopeId:'audit',hires:move(),exits:move(),transfersIn:move(),transfersOut:move(),volume:q(1200,'work-units/month'),hoursPerUnit:q(0.5,'hours/work-unit'),productiveHoursPerFte:q(160,'hours/FTE/month'),allocation:q(0.5,'fraction'),productivityUplift:q(0,'fraction')});
 const first=month('2026-11'),second=month('2026-12');first.hires=move(2,0.5,'per-person');first.exits=move(1,0.5);first.transfersIn=move(1,0.75);first.transfersOut=move(2,0.75,'per-person');second.volume.value=960;second.hoursPerUnit.value=1;second.allocation.value=0.4;second.productivityUplift.value=0.25;
 const result=calculateMonthlyWorkload({version:monthlyWorkloadVersion,scope:{id:'audit',label:'Audit service',kind:'workload-group',workUnit:'request'},accounting:{timing:'start-of-month-outflows-from-opening',exits:'all-separations-including-retirement',movements:'disjoint',workload:'before-productivity',productiveHours:'net-of-non-work-time-before-allocation'},opening:{scopeId:'audit',asOf:'2026-10-31',headcount:q(10,'people'),contractedFte:q(8,'FTE')},months:[first,second]});
 // Month1: 8 + 1 - .5 + .75 - 1.5 = 7.75 FTE; .5 allocation = 3.875; 620h capacity vs600h.
 // Month2: 7.75 * .4 = 3.1 allocated FTE; 160 * 1.25 =200h/FTE; 620h capacity vs960h.
 assert.equal(result.status,'calculated');
 for(const [i,expected] of [[0,[10,7.75,3.875,600,620,3.75,-0.125,-20]],[1,[10,7.75,3.1,960,620,4.8,1.7,340]]]){const p=result.points[i],actual=[p.headcount,p.contractedFte,p.allocatedFte,p.workloadHours,p.capacityHours,p.requiredFte,p.gapFte,p.gapHours];actual.forEach((n,k)=>assert.ok(Math.abs(n-expected[k])<1e-9));}
});
