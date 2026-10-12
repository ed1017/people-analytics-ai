import test from 'node:test';
import assert from 'node:assert/strict';
import {hiringFixture,hiringRecommendation,turnoverFixture,planningPrompts} from './fixtures/underspecified-planning.mjs';
import {solutionRequest,evaluate,final,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {hiringBudgetView,editHiringBudget,editHiringBudgetLocally} from '../lib/home-hiring-budget.ts';
import {proposedPlanningEstimate} from '../lib/home-proposed-planning.ts';
import {solutionConversationInstructions} from '../lib/home-solution-conversation-schema.ts';
import {guidedConversationInstructions} from '../lib/chat-answer-style.ts';
import {buildHomePack} from '../lib/home-pack.mjs';

test('a count and cap expose a useful allowance with unknown currency/period; no salary or availability inference',()=>{
 const {request,changes}=hiringFixture(),view=hiringBudgetView(editHiringBudget(request,'fixture:0',changes));
 assert.deepEqual(view.planningSummary.cost,{kind:'allowance',amount:100000,currency:null});
 assert.equal(view.planningSummary.months,null);assert.equal(view.planningSummary.hires,10);
 assert.equal(view.annualBasePerHire,null);assert.equal(view.annualBasePayCeiling,null);assert.equal(view.periodCost,null);assert.equal(view.maxAffordableHires,null);
 assert.equal(view.input.annualBasePay,null);assert.equal(view.input.ftePerHire,null);assert.equal(view.input.currency,null);
});
test('supplied period and currency qualify the allowance without inventing arrival, pay or full costs',()=>{
 const {request,changes}=hiringFixture(true),review=editHiringBudget(request,'fixture:0',changes),view=hiringBudgetView(review);
 assert.deepEqual(view.planningSummary.cost,{kind:'allowance',amount:100000,currency:'USD'});assert.equal(view.planningSummary.months,6);
 assert.equal(view.planningSummary.startMonth,null);assert.equal(view.planningSummary.arrivalDate,null);assert.equal(view.annualBasePayCeiling,null);
 assert.equal(review.origins.months.kind,'user-supplied');assert.equal(view.input.annualBasePay,null);
});
test('local edits promote only supported cost results and preserve source provenance',()=>{
 const {request,changes}=hiringFixture(true),original=editHiringBudget(request,'fixture:0',changes),before=JSON.stringify(original);
 const timed={...original.inputs,startMonth:'2027-01',arrivalDate:'2027-01-01',ftePerHire:1,annualBasePay:120000,payBasis:'per_hire'};
 const partial=editHiringBudgetLocally(original,timed),subtotal=hiringBudgetView(partial);
 assert.deepEqual(subtotal.planningSummary.cost,{kind:'subtotal',amount:600000,currency:'USD'});assert.equal(subtotal.periodCost,null);assert.equal(subtotal.budgetStatus,'unknown');
 const listed=editHiringBudgetLocally(partial,{...timed,annualAdditionalCostPerHire:20000,recruitingFeePerHire:10000});
 assert.deepEqual(hiringBudgetView(listed).planningSummary.cost,{kind:'listed',amount:800000,currency:'USD'});
 const complete=editHiringBudgetLocally(listed,{...listed.inputs,otherCostsComplete:true});
 assert.deepEqual(hiringBudgetView(complete).planningSummary.cost,{kind:'complete',amount:800000,currency:'USD'});
 assert.equal(complete.origins.annualBasePay.kind,'user-entry');assert.deepEqual(complete.origins.hires,original.origins.hires);assert.equal(JSON.stringify(original),before);
 const cleared=editHiringBudgetLocally(complete,{...complete.inputs,annualBasePay:null,annualAdditionalCostPerHire:null,recruitingFeePerHire:null});
 assert.equal(hiringBudgetView(cleared).planningSummary.cost.kind,'allowance');assert.equal(hiringBudgetView(cleared).periodCost,null);
});
test('general turnover request without a target or timetable can produce one checked editable pilot',async()=>{
 const {request,candidate}=turnoverFixture(),before=JSON.stringify(request),runtime=fixtureRuntime([evaluate(candidate),final('A small voluntary pilot can test the workload hypothesis; the effect on turnover is unproven.',[candidate.id])]);
 const reply=await converseSolutions(request,runtime,new AbortController().signal),item=reply.state.working[0],estimate=proposedPlanningEstimate(item.draft);
 assert.deepEqual(item.blocking,[]);assert.deepEqual(reply.candidateIds,[candidate.id]);assert.equal(item.candidate.goal.statement,'Reduce turnover');assert.equal(estimate.months,2);assert.equal(estimate.cash,500);assert.deepEqual(estimate.hours,{min:28,max:28});assert.equal(estimate.laborCost,null);
 assert.equal(item.draft.inputs.scope.population.value,null);assert.equal(item.draft.inputs.scope.startMonth.value,null);assert.equal(JSON.stringify(request),before);assert.equal(runtime.reads,0);
});
test('explicit no-assumptions followup preserves the existing pilot and creates no replacement',async()=>{
 const {request,candidate}=turnoverFixture(),first=await converseSolutions(request,fixtureRuntime([evaluate(candidate),final('Review the proposed pilot.',[candidate.id])]),new AbortController().signal);
 const follow=solutionRequest('Explain only. Do not add assumptions or another plan.',false,first.state,2),before=JSON.stringify(first.state.working),reply=await converseSolutions(follow,fixtureRuntime([final('The existing pilot is a hypothesis, with no demonstrated turnover effect.')]),new AbortController().signal);
 assert.equal(JSON.stringify(reply.state.working),before);assert.deepEqual(reply.candidateIds,[]);assert.equal(reply.state.focusCandidateId,candidate.id);
});
test('shared guidance covers underspecified requests on general Home and other chat paths, independent of starters',()=>{
 for(const instructions of [solutionConversationInstructions,guidedConversationInstructions(false),guidedConversationInstructions(true)]){
  assert.match(instructions,/target or timetable/);assert.match(instructions,/named metric/);assert.match(instructions,/business units.*teams/i);assert.match(instructions,/at most two/);
 }
});
test('actual Home POST accepts partial hiring recommendation with no salary or extra model rounds',async()=>{
 const {offlineBusinessRoute}=await import('./helpers/offline-business-route.mjs'),{responseForStep}=await import('./fixtures/natural-business-planning.mjs');
 const route=await offlineBusinessRoute(),{request,changes}=hiringFixture();route.sandbox.__replies.push(responseForStep({name:'review_hiring_budget',args:{changes}},0),r=>responseForStep(hiringRecommendation(r.input),1));
 const response=await route.post(new Request('http://fixture/api/home-solution-conversation',{method:'POST',body:JSON.stringify(request)})),reply=await response.json();
 assert.equal(response.status,200,JSON.stringify(reply));assert.match(reply.answer,/Recommended Action Plan/);assert.equal(reply.state.hiringBudget.inputs.annualBasePay,null);assert.equal(reply.state.hiringBudget.inputs.months,null);assert.deepEqual(reply.candidateIds,[]);assert.equal(route.sandbox.__requests.length,2);
 for(const r of route.sandbox.__requests)assert.match(r.instructions,/target or timetable/);
 for(const o of route.sandbox.__requestOptions)assert.equal(o.maxRetries,0);
});
test('named supplied skill measures remain useful without releasing legacy team or BU survey rankings',async()=>{
 const pack=buildHomePack({skills:{status:'loaded',data:{summary:{current_workforce:100},largest_gaps:[{skill_name:'Coaching',requirement_met_pct:45,profile_coverage_pct:80},{skill_name:'Analysis',requirement_met_pct:70,profile_coverage_pct:85}]}},'survey-sentiment':{status:'loaded',data:{summary:{engagement_respondents:100},by_business_unit:[{org_name:'Engineering',favorable_pct:20,respondents:15}]}}},'All company','');
 assert.equal(pack.sources.find(s=>s.id==='S1').facts.rows.length,0);
 const rows=pack.sources.find(s=>s.id==='T1').facts.rows;assert.equal(rows[0].requirement_met_pct,45);assert.equal(rows[1].requirement_met_pct,70);
 const request={...solutionRequest(planningPrompts.metric),evidence:pack},runtime=fixtureRuntime([final('Among the supplied skill rows, Coaching has 45% requirement met and Analysis has 70%; their profile coverage is 80% and 85%, respectively. [T1] These are skill measures, not team performance. The supplied packet cannot identify weaker teams.')]);
 const reply=await converseSolutions(request,runtime,new AbortController().signal);assert.deepEqual(reply.candidateIds,[]);assert.match(reply.answer,/45%/);assert.match(reply.answer,/not team performance/);assert.equal(runtime.reads,0);
});
