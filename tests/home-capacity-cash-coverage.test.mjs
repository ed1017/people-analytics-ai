import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {actionBinding,actionBindingKey} from '../lib/home-action-drafts.ts';
import {createBundleDraft,reconcileBundle,reviseBundleDraft,unknownAssumption,bundleInputKey,compareBundleDrafts} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {calculatePlanWhatIf} from '../lib/home-plan-what-if.ts';
import {planCashEstimate} from '../lib/home-plan-cash.ts';
import {planStaffEffort,planStaffHours,withDeliveryAssumptions} from '../lib/home-plan-delivery-estimate.ts';
import {proposePlanRevision,readPlanRevisions,planBudgetText} from '../lib/home-plan-revisions.ts';
import {saveBundleCalculationPatch,attachBundlePatch,readBundleWorkspace} from '../lib/home-bundle-records.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {capacityFixture} from './fixtures/home-plan-integration.mjs';
import {calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
const entered=value=>({value,kind:'user-entered',basis:'Explicit synthetic test assumption.'}),selection={option:1,count:3};
const goal='Add 5 engineering roles over 12 months';
async function fresh(text=goal){return prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(text).bundles[0],await actionBinding('capacity',text,{sources:[{id:'W1',status:'loaded',facts:{headcount:100}}]},{})),'2026-10-07T01:00:00Z',{includeDeliveryEstimate:true});}
const budget=(d,amount=10000)=>proposePlanRevision(undefined,d,`set budget to ${amount}`,selection);
test('five engineering roles stay five and 487500 cash exceeds 10000 by 477500 across revisions and attachments',async()=>{
 const d=await fresh(),before=JSON.stringify(d),{record,history}=budget(d);
 assert.equal(d.inputs.whatIf.target.value,5);assert.equal(d.inputs.whatIf.target.kind,'user-entered');
 assert.equal(record.result.whatIf.roleCash,480000);assert.equal(record.result.cashEstimate.cash,487500);
 assert.equal(record.result.cashEstimate.coverage,'partial');assert.equal(record.result.budget.comparedCost,487500);
 assert.equal(record.result.budget.headroom,-477500);assert.equal(record.result.budget.status,'over');
 assert.match(planBudgetText(record.result),/\$477,500 USD over/);assert.doesNotMatch(planBudgetText(record.result),/headroom/);
 assert.deepEqual(planCashEstimate(record.draft),record.result.cashEstimate);assert.deepEqual(readPlanRevisions(history,'capacity'),history);
 let workspace=saveBundleCalculationPatch(undefined,record.draft,record.result).value;
 workspace=attachBundlePatch(workspace,record.draft,{confirmed:true,bindingKey:actionBindingKey(d.binding),inputKey:bundleInputKey(record.draft),acknowledgeUnknowns:true},'cash','2026-10-07T01:00:00Z').value;
 assert.deepEqual(readBundleWorkspace(JSON.parse(JSON.stringify(workspace)),'capacity'),workspace);
 assert.equal(workspace.attachments[0].result.budget.cash,487500);assert.equal(JSON.stringify(d),before);
});
test('known allowance subtotal below budget is not headroom with unknown overlap, cost review or capacity coverage',async()=>{
 for(const mutate of [()=>{},d=>d.inputs.costsDistinct=entered(true),d=>{d.inputs.costsDistinct=entered(true);d.inputs.costReviews.forEach(row=>row.complete=entered(true));}]){
  const d=await fresh();mutate(d);const {result}=budget(d,500000).record;
  assert.equal(result.budget.cash,487500);assert.equal(result.budget.headroom,null);assert.equal(result.budget.status,'unknown');
  assert.match(planBudgetText(result),/feasibility is unresolved/);assert.doesNotMatch(planBudgetText(result),/\$12,500.*headroom/);
 }
});
test('missing amount, funding date, role price, stale horizon and known overlap never fall back to allowances',async()=>{
 for(const mutate of [d=>d.inputs.expenses[0].amount=unknownAssumption(),d=>d.inputs.expenses[0].startMonth=unknownAssumption(),d=>d.inputs.whatIf.unitCost=unknownAssumption(),d=>d.inputs.scope.months=entered(13),d=>d.inputs.costsDistinct=entered(false)]){
  const d=await fresh();mutate(d);const {result}=budget(d).record;
  assert.equal(result.budget.cash,null);assert.equal(result.budget.status,'unknown');assert.equal(result.budget.headroom,null);
  assert.equal(planCashEstimate(d).cash,null);assert.equal(result.cashEstimate.cash,null);
 }
});
test('overlap gates scenario and comparison cash too, without hiding outcome units',async()=>{
 const d=await fresh();d.inputs.costsDistinct=entered(false);const scenario=calculatePlanWhatIf(d.inputs);
 assert.equal(scenario.status,'ready');assert.equal(scenario.targetCount,5);assert.equal(scenario.cash,null);assert.equal(scenario.listedCash,null);
});
test('explicit unsupported currency, annual cost and unknown price stay unresolved instead of demo USD',async()=>{
 for(const suffix of ['at CAD $7,000 per role per month','at EUR €7000 per role per month','at GBP 7000 per role per month','at $100,000 per role per year','at USD 100000 per role per year','with monthly role cost unknown']){
  const d=await fresh(goal+' '+suffix);assert.equal(d.inputs.whatIf.unitCost.value,null,suffix);assert.equal(budget(d).record.result.budget.cash,null,suffix);
 }
 for(const currency of ['$7,000','USD 7000','USD $7000']){const d=await fresh(goal+` at ${currency} per role per month`);assert.equal(d.inputs.whatIf.unitCost.value,7000);assert.equal(budget(d).record.result.budget.cash,427500);}
 const d=await fresh(goal+' at CAD $7,000 per role per month');assert.throws(()=>proposePlanRevision(undefined,d,'set monthly cost per role to CAD 7000',selection),/USD/);
 const revised=proposePlanRevision(undefined,d,'set monthly cost per role to USD 6000; set budget to 10000',selection);assert.equal(revised.record.result.budget.cash,367500);
});
test('fractional counts and competing targets cannot silently become three positions',async()=>{
 for(const text of ['Add 2.5 engineering roles over 12 months','Add 2.5 roles over 12 months','Add 5 roles and add 7 roles over 12 months','Add 3 to 5 engineering roles over 12 months']){
  const d=await fresh(text);assert.equal(d.inputs.whatIf.target.value,null,text);assert.equal(budget(d).record.result.budget.cash,null,text);
 }
 const d=await fresh('Add five engineering roles over twelve months');assert.equal(d.inputs.whatIf.target.value,5);assert.equal(calculatePlanWhatIf(d.inputs).roleCash,480000);
});
test('part-time, FTE, phased arrivals and internal development need a staffing schedule instead of full hire payroll',async()=>{
 for(const text of ['Add 5 part-time engineering roles over 12 months','Add 5 roles at 50% FTE over 12 months','Add 5 roles over 12 months starting January 2027','Add 5 roles over 12 months through internal moves','Add 5 roles over 12 months with phased hiring']){
  const d=await fresh(text);assert.equal(d.inputs.whatIf.capacityBasis,'needs-staffing-schedule',text);
  assert.equal(budget(d).record.result.budget.cash,null,text);assert.match(planCashEstimate(d).reason,/staffing mix/);
 }
});
test('six-month horizon pays six months and an entered vendor obligation is included once',async()=>{
 const d=await fresh('Add 5 engineering roles over 6 months');
 d.inputs.expenses.push({id:'vendor',label:'One-time vendor contract',kind:'cash',amount:entered(12000),startMonth:entered(d.inputs.scope.startMonth.value),months:entered(1)});
 d.inputs.expenseLinks.push({expenseId:'vendor',componentIds:['c1'],allocations:null});
 const {result}=budget(d).record;assert.equal(result.whatIf.roleCash,240000);assert.equal(result.budget.cash,259500);
});
test('published v1 records replay byte-for-byte while a new revision receives the corrected cash policy',()=>{
 const saved=JSON.parse(readFileSync(new URL('./fixtures/home-capacity-cash-v1.json',import.meta.url))),before=JSON.stringify(saved);
 assert.deepEqual(readPlanRevisions(saved.history,'capacity-v1'),saved.history);assert.deepEqual(readBundleWorkspace(saved.workspace,'capacity-v1'),saved.workspace);
 assert.equal(saved.history.revisions[0].result.budget.cash,7500);assert.equal(saved.history.revisions[0].result.budget.headroom,2500);
 const next=proposePlanRevision(saved.history,saved.base,'set budget to 10001',selection);
 assert.equal(next.record.result.costPolicy,'cash-hours-v2');assert.equal(next.record.result.budget.cash,487500);assert.equal(next.record.result.budget.headroom,-477499);
 assert.deepEqual(readPlanRevisions(next.history,'capacity-v1'),next.history);assert.equal(JSON.stringify(saved),before);
});
test('like-for-like comparison checks scenario target, baseline, denominator and rate period',async()=>{
 for(const text of [goal,'Reduce turnover']){const a=await fresh(text);a.inputs.scope.comparisonConfirmed=entered(true);a.inputs.scope.requirements=entered('Same scope');
  assert.equal(compareBundleDrafts(a,structuredClone(a)).comparable,true);
  for(const key of ['target','baseline','population']){const b=structuredClone(a);b.inputs.whatIf[key]=entered((b.inputs.whatIf[key].value??0)+1);assert.equal(compareBundleDrafts(a,b).comparable,false,key);}
  if(text==='Reduce turnover'){const b=structuredClone(a);b.inputs.whatIf.ratePeriod='ytd';assert.equal(compareBundleDrafts(a,b).comparable,false);}
 }
});
test('reviewed mix preserves arrival-day payroll, one-time fees and vendor cash without generic full-horizon role costs',async()=>{
 const {draft}=await capacityFixture();const i=draft.inputs.capacity.input;
 i.arrivalDate=i.planningMonth+'-16';i.arrivalMode='explicit';i.recruitingStart=i.planningMonth+'-01';
 for(const [field,value] of Object.entries(i))draft.inputs.capacity.origins[field]={kind:value?'user-entered':'unknown',basis:value?'Explicit synthetic assumption':null};
 draft.inputs.costsDistinct=entered(true);draft.inputs.costReviews.forEach(row=>row.complete=entered(true));
 draft.inputs.expenseLinks=['hireStaffingCost','backfillStaffingCost','internalSalaryUplift','recruitingFees','trainingCash'].map(field=>({expenseId:'capacity:'+field,componentIds:['c5'],allocations:null}));
 const d=reviseBundleDraft(draft,draft.inputs),result=reconcileBundle(d),expected=calculateWorkforceIncrement(i,null);
 assert.equal(expected.rows[0].hireStaffingCost,5161.29);assert.equal(expected.totalCash,32661.29);
 assert.equal(result.cashTotal,expected.totalCash);assert.equal(result.cashEstimate.cash,expected.totalCash);
 assert.equal(result.ledger.find(row=>row.id==='capacity:hireStaffingCost').monthly[0],expected.rows[0].hireStaffingCost);
 assert.ok(result.ledger.every(row=>row.kind==='cash'));assert.equal(result.employeeTimeTotal,null);
 assert.equal(result.ledger.find(row=>row.id==='capacity:recruitingFees').total,expected.rows.reduce((n,row)=>n+row.recruitingFees,0));
 const incomplete=structuredClone(d);incomplete.inputs.capacity.input.annualHireCost='';incomplete.inputs.capacity.origins.annualHireCost={kind:'unknown',basis:null};
 assert.equal(reconcileBundle(incomplete).cashEstimate.cash,null);
});
test('staffing training and delivery hours remain separately visible without double counting',async()=>{
 const {draft}=await capacityFixture();draft.inputs.capacity.input.trainingHours='24';draft.inputs=withDeliveryAssumptions(draft.inputs,draft.bundle.components.length);
 const effort=planStaffEffort(draft);assert.equal(effort.trainingHours,24);assert.ok(effort.deliveryHours>0);assert.equal(effort.totalHours,null);assert.equal(planStaffHours(draft),null);
 draft.inputs.deliveryEstimate.hoursPerParticipant=entered(0);draft.inputs.deliveryEstimate.coordinationHours=entered(0);assert.equal(planStaffHours(draft),24);
});
