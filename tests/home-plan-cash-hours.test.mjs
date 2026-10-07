import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBundleDraft,reconcileBundle,reviseBundleDraft,unknownAssumption} from '../lib/home-bundle-reconciliation.ts';
import {readBundleWorkspace} from '../lib/home-bundle-records.ts';
import {proposePlanRevision,readPlanRevisions,planBudgetText} from '../lib/home-plan-revisions.ts';
import {planStaffHours} from '../lib/home-plan-delivery-estimate.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
const legacy=JSON.parse(readFileSync(new URL('./fixtures/home-plan-legacy-costs.json',import.meta.url))),selection={option:1,count:3};
const entered=value=>({value,kind:'user-entered',basis:'Explicit synthetic test input.'});
const fresh=()=>prepareIllustrativePilot(createBundleDraft(legacy.base.bundle,legacy.base.binding),'2026-10-06T12:00:00Z',{includeDeliveryEstimate:true});
test('frozen published legacy history and attachments validate byte-for-byte, including original all-in math',()=>{
 const before=JSON.stringify(legacy),goalId=legacy.base.binding.goalId;
 assert.deepEqual(readPlanRevisions(legacy.history,goalId),legacy.history);
 assert.deepEqual(readBundleWorkspace(legacy.workspace,goalId),legacy.workspace);
 assert.equal(legacy.workspace.attachments[0].result.budget.headroom,-200);
 assert.match(planBudgetText(legacy.workspace.attachments[0].result),/\$2,500 USD headroom/);
 assert.doesNotMatch(planBudgetText(legacy.workspace.attachments[0].result),/\$2,700|\$6,200|staff time/);
 assert.equal(JSON.stringify(legacy),before);
});
test('new revision upgrades an active legacy all-in budget without modifying saved history or attachments',()=>{
 const before=JSON.stringify(legacy),next=proposePlanRevision(legacy.history,legacy.base,'use 20 participants',selection);
 assert.equal(next.record.draft.inputs.costPolicy,'cash-hours-v2');
 assert.equal(next.record.draft.inputs.budget.basis.value,'cash');
 assert.equal(next.record.result.deliveryEstimate.hours,56);
 assert.equal(next.record.result.deliveryEstimate.employeeTime,null);
 assert.equal(next.record.result.budget.comparedCost,3500);assert.equal(next.record.result.budget.headroom,null);assert.equal(next.record.result.budget.status,'unknown');
 assert.equal(next.record.result.employeeTimeTotal,null);
 assert.deepEqual(readPlanRevisions(next.history,legacy.base.binding.goalId),next.history);
 assert.equal(JSON.stringify(legacy),before);
});
test('new estimates never price staff hours, even with retained rate and manual time-money inputs',()=>{
 const draft=fresh();assert.equal(draft.inputs.deliveryEstimate.hourlyRate.value,null);
 const inputs=structuredClone(draft.inputs);inputs.deliveryEstimate.hourlyRate=entered(999);
 inputs.expenses.push({id:'old-time',label:'Former time valuation',kind:'employee_time',amount:unknownAssumption(),months:entered(1),startMonth:entered('2026-11')});
 inputs.expenseLinks.push({expenseId:'old-time',componentIds:['c1'],allocations:null});
 const result=reconcileBundle(reviseBundleDraft(draft,inputs));
 assert.equal(result.deliveryEstimate.cash,3500);assert.equal(result.deliveryEstimate.hours,36);
 assert.equal(result.deliveryEstimate.employeeTime,null);assert.equal(result.employeeTimeTotal,null);
 assert.ok(result.ledger.every(line=>line.kind==='cash'));
 const changed=proposePlanRevision(undefined,reviseBundleDraft(draft,inputs),'I have a budget of 6000 including staff time',selection);
 assert.equal(changed.record.result.budget.comparedCost,3500);assert.equal(changed.record.result.budget.headroom,null);assert.equal(changed.record.result.budget.status,'unknown');
});
test('explicit zero allowance subtotal stays zero but unreviewed coverage cannot establish headroom',()=>{
 const draft=fresh();draft.inputs.expenses.forEach(row=>row.amount=entered(0));
 const result=proposePlanRevision(undefined,draft,'budget is 0',selection).record.result;
 assert.equal(result.budget.cash,0);assert.equal(result.budget.headroom,null);assert.equal(result.budget.status,'unknown');
 assert.equal(result.deliveryEstimate.hours,36);
});
test('unentered cash, empty unreviewed costs and overlapping costs never become a free plan',()=>{
 for(const change of [d=>d.inputs.expenses[0].amount=unknownAssumption(),d=>{d.inputs.expenses=[];d.inputs.expenseLinks=[];},d=>d.inputs.costsDistinct=entered(false)]){
  const draft=fresh();change(draft);const result=proposePlanRevision(undefined,draft,'budget is 6000',selection).record.result;
  assert.equal(result.budget.cash,null);assert.equal(result.budget.status,'unknown');assert.equal(result.budget.headroom,null);
  assert.equal(result.deliveryEstimate.hours,36);
 }
});
test('reviewed no-additional-cash plan remains valid with unknown staff hours',()=>{
 const draft=fresh();draft.inputs.expenses=[];draft.inputs.expenseLinks=[];
 draft.inputs.costsDistinct=entered(true);draft.inputs.scope.capacityRequired=entered(false);
 draft.inputs.costReviews.forEach(row=>row.complete=entered(true));draft.inputs.deliveryEstimate.hoursPerParticipant=unknownAssumption();
 const result=proposePlanRevision(undefined,draft,'budget is 0',selection).record.result;
 assert.equal(result.cashTotal,0);assert.equal(result.budget.headroom,0);assert.equal(result.budget.status,'within');assert.equal(planStaffHours(draft),null);
});
test('hours edits preserve cash allowances and capacity constraints; rates cannot be edited',()=>{
 const draft=fresh(),before=JSON.stringify(draft.inputs.expenses);
 const next=proposePlanRevision(undefined,draft,'Set hours per participant to 4; set coordination hours to 8',selection);
 assert.equal(next.record.result.deliveryEstimate.hours,48);assert.equal(JSON.stringify(next.record.draft.inputs.expenses),before);
 assert.deepEqual(next.record.draft.inputs.capacity,draft.inputs.capacity);
 assert.throws(()=>proposePlanRevision(undefined,draft,'Set staff hourly rate to 90',selection),/track staff effort in hours/);
});
