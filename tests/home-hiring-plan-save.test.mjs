import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareHiringPlan,hiringPlanFields} from '../lib/home-hiring-plan-save.ts';
import {hiringPlanBrief} from '../lib/home-hiring-plan.ts';
import {editHiringBudget,hiringBudgetView} from '../lib/home-hiring-budget.ts';
import {actionPlanQuickSummary} from '../lib/action-plan-quick-summary.ts';
import {readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
export function fullHiringReview(){const r=solutionRequest('10 engineers, USD1000000, Jan-Dec2027, Jan1 arrival, 1FTE each, annual salary120000, recurring24000 and recruiting10000 each.'),basis={kind:'user-supplied',turnId:r.message.id,quote:r.message.text,explanation:'Explicit fictional test inputs.'};return editHiringBudget(r,'fixture:0',Object.entries({role:'engineer',hires:10,budget:1000000,currency:'USD',startMonth:'2027-01',months:12,arrivalDate:'2027-01-01',ftePerHire:1,annualBasePay:120000,payBasis:'per_hire',annualAdditionalCostPerHire:24000,recruitingFeePerHire:10000}).map(([field,value])=>({field,value,basis})));}
test('checked hiring subtotal, required roles, period, FTE and unknowns survive plan review, pin and reopen',async()=>{
 const review=fullHiringReview(),before=JSON.stringify(review),all=hiringBudgetView(review);assert.equal(all.listedCost,1540000);assert.equal(all.budgetStatus,'over');
 const selected=await prepareHiringPlan(review,6,{id:'goal-1',statement:'Cover 10 engineering roles within the reviewed budget.'});assert.equal(selected.facts.externalSubtotal,924000);assert.equal(selected.facts.remainingBeforeUnknownCosts,76000);assert.equal(selected.facts.requiredRoles,10);assert.equal(selected.facts.remainingRoles,4);assert.equal(selected.facts.externalFte,6);assert.equal(selected.facts.fullCost,null);assert.equal(selected.result.ledger.reduce((total,row)=>total+(row.monthly[0]??0),0),132000);assert.equal(selected.result.ledger.reduce((total,row)=>total+(row.monthly[1]??0),0),72000);
 const fields=hiringPlanFields(selected,null,'selected-1','2026-10-11T00:00:00Z'),saved=readPlanAlternatives(JSON.parse(JSON.stringify(fields[planAlternativesField])),{goalId:'goal-1',goal:selected.goal.statement});assert.ok(saved);
 const plan=saved.plans[0],summary=actionPlanQuickSummary(plan.draft,plan.result);assert.equal(summary.hiring.externalSubtotal,924000);assert.equal(summary.hiring.start,'2027-01');assert.equal(summary.hiring.end,'2027-12-31');assert.equal(summary.hiring.requiredRoles,10);assert.equal(summary.hiring.ftePerHire,1);assert.equal(plan.result.cashEstimate.coverage,'partial');assert.equal(plan.result.budget.status,'unknown');assert.equal(plan.result.budget.headroom,null);
 assert.equal(plan.draft.inputs.hiringPlan.review.origins.annualBasePay.kind,'user-supplied');assert.match(hiringPlanBrief(plan.draft.inputs.hiringPlan),/924000 USD/);assert.match(plan.notes.join(' '),/76000 USD/);assert.match(plan.notes.join(' '),/availability, release, backfill, payroll/);assert.equal(JSON.stringify(review),before);
 const repeated=hiringPlanFields(selected,saved,'second-click','2026-10-11T00:01:00Z');assert.equal(repeated[planAlternativesField].plans.length,1,'same checked route is reused even with a new click token');
 assert.throws(()=>hiringPlanFields({...selected,goal:{id:'another',statement:'Another goal'}},saved,'wrong-goal','2026-10-11T00:02:00Z'),/another goal/);
 const forged=structuredClone(saved);forged.plans[0].draft.inputs.hiringPlan.externalHires=7;assert.equal(readPlanAlternatives(forged,{goalId:'goal-1',goal:selected.goal.statement}),null);
});
