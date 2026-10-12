import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hiringFixture,conditionalHiringAnswer} from './fixtures/underspecified-planning.mjs';
import {solutionRequest,final,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
import {editHiringBudget,editHiringBudgetLocally} from '../lib/home-hiring-budget.ts';
import {prepareConditionalHiringPlan,prepareHiringPlan,hiringPlanFields} from '../lib/home-hiring-plan-save.ts';
import {hiringPlanFacts,hiringPlanIdentity} from '../lib/home-hiring-plan.ts';
import {readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {readBundleDraft,reviseBundleDraft,reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
import {actionPlanQuickSummary} from '../lib/action-plan-quick-summary.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
const goal={id:'hiring-goal',statement:'Cover ten engineering roles.'},at='2026-10-12T00:00:00Z';
const review=()=>{const {request,changes}=hiringFixture();return editHiringBudget(request,'fixture:0',changes);};
const save=(selection,catalog=null,id='pin-1')=>readPlanAlternatives(hiringPlanFields(selection,catalog,id,at)[planAlternativesField],{goalId:goal.id,goal:goal.statement});


test('count-and-budget receipt pins and reloads exact unknown currency/period without USD cash or feasibility',async()=>{
 const input=review(),before=JSON.stringify(input),selected=await prepareConditionalHiringPlan(input,goal),catalog=save(selected),restored=readPlanAlternatives(JSON.parse(JSON.stringify(catalog)),{goalId:goal.id,goal:goal.statement});
 assert.ok(restored);const plan=restored.plans[0],quick=actionPlanQuickSummary(plan.draft,plan.result);
 assert.equal(plan.draft.inputs.hiringPlan.version,2);assert.equal(plan.draft.inputs.scope.currency,null);assert.equal(plan.draft.inputs.scope.months.value,null);assert.equal(plan.result.cashEstimate.cash,null);assert.equal(plan.result.cashEstimate.coverage,'unknown');assert.deepEqual(plan.result.ledger,[]);
 assert.equal(quick.conditionalHiring.allowance,100000);assert.equal(quick.conditionalHiring.requiredRoles,10);assert.equal(quick.conditionalHiring.affordability,null);assert.equal(quick.conditionalHiring.availability,null);assert.equal(quick.hiring,null);
 assert.deepEqual(plan.draft.inputs.hiringPlan.review,input);assert.equal(catalog.attachments[0].purpose,'proposal-selection');assert.equal(plan.applied,false);assert.equal(JSON.stringify(input),before);
 assert.throws(()=>reconcileBundle(plan.draft),/cannot enter operational/);await assert.rejects(prepareHiringPlan(input,10,goal),/supported USD/);
});
test('native non-USD and partial or zero costs preserve their own units without complete cash',async()=>{
 for(const amount of [null,0,10000]){
  const r=review(),edited=editHiringBudgetLocally(r,{...r.inputs,currency:'EUR',startMonth:'2027-01',months:6,arrivalDate:'2027-01-01',recruitingFeePerHire:amount});
  const s=await prepareConditionalHiringPlan(edited,goal),plan=save(s).plans[0],f=actionPlanQuickSummary(plan.draft,plan.result).conditionalHiring;
  assert.equal(f.currency,'EUR');assert.equal(f.allowance,100000);assert.equal(f.result.knownSubtotal,amount===null?null:amount*10);assert.equal(f.result.maxAffordableHires,null);assert.equal(plan.result.cashEstimate.cash,null);assert.equal(plan.draft.inputs.scope.currency,'EUR');
 }
});
test('identical requests reuse the immutable receipt; edits and promotion link to prior snapshots',async()=>{
 const initial=review(),first=await prepareConditionalHiringPlan(initial,goal),catalog=save(first),before=JSON.stringify(catalog.plans[0]);
 const repeat=structuredClone(initial);repeat.revision++;repeat.basisTurns.push({id:'repeat-turn',text:'Repeat the recommendation.'});
 const again=await prepareConditionalHiringPlan(repeat,goal);assert.equal(hiringPlanIdentity(again.receipt),hiringPlanIdentity(first.receipt));assert.equal(save(again,catalog,'pin-repeat').plans.length,1);
 const changed=editHiringBudgetLocally(initial,{...initial.inputs,budget:2000000}),second=await prepareConditionalHiringPlan(changed,goal),revised=save(second,catalog,'pin-edit');
 assert.equal(revised.plans.length,2);assert.deepEqual(revised.plans[1].sourceRefs,[{id:catalog.plans[0].id,revision:1}]);assert.equal(revised.plans[1].draft.revision,2);assert.equal(JSON.stringify(revised.plans[0]),before);
 const costed=editHiringBudgetLocally(changed,{...changed.inputs,currency:'USD',startMonth:'2027-01',months:12,arrivalDate:'2027-01-01',ftePerHire:1,annualBasePay:120000,payBasis:'per_hire',annualAdditionalCostPerHire:24000,recruitingFeePerHire:10000});
 const promoted=await prepareHiringPlan(costed,10,goal),saved=save(promoted,revised,'pin-promoted');assert.equal(saved.plans[2].draft.inputs.hiringPlan.version,1);assert.equal(saved.plans[2].draft.revision,3);assert.equal(actionPlanQuickSummary(saved.plans[2].draft,saved.plans[2].result).hiring.externalSubtotal,1540000);assert.equal(JSON.stringify(saved.plans[0]),before);assert.equal(saved.plans[2].result.budget.status,'unknown');
});
test('receipt-bound edits, foreign goals and scope/dataset lineage fail closed',async()=>{
 const selected=await prepareConditionalHiringPlan(review(),goal),catalog=save(selected);
 for(const edit of [i=>i.scope.currency='USD',i=>i.scope.months={value:12,kind:'illustrative',basis:'invented'},i=>i.budget={amount:{value:1000000,kind:'illustrative',basis:'Injected cash budget'},basis:{value:'cash',kind:'illustrative',basis:'Not a native receipt'}},i=>i.hiringPlan.review.inputs.budget=2,i=>delete i.hiringPlan]){const inputs=structuredClone(selected.draft.inputs);edit(inputs);assert.throws(()=>reviseBundleDraft(selected.draft,inputs),/Hiring plan|hiring receipt|currency/i);}
 assert.throws(()=>hiringPlanFields({...selected,goal:{id:'foreign',statement:'Different goal'}},null,'bad',at),/another goal/);
 const forged=structuredClone(selected.draft);forged.inputs.hiringPlan.review.inputs.currency='EUR';assert.equal(readBundleDraft(forged),null);
 for(const field of ['datasetToken','scopeKey']){const r=review();r[field]='different';const next=await prepareConditionalHiringPlan(r,goal),saved=save(next,catalog,'new-'+field);assert.deepEqual(saved.plans[1].sourceRefs,[]);}
 assert.throws(()=>hiringPlanFacts(selected.receipt),/Invalid hiring plan receipt/);
});
test('known over-budget costs still block a conditional plan',async()=>{
 const r=review(),over=editHiringBudgetLocally(r,{...r.inputs,currency:'USD',startMonth:'2027-01',months:6,arrivalDate:'2027-01-01',recruitingFeePerHire:200000});
 await assert.rejects(prepareConditionalHiringPlan(over,goal),/exceed.*budget/);
});
test('typed conditional outcome binds to this turn and avoids a duplicate prose plan',async()=>{
 const {request,changes}=hiringFixture(),steps=[{name:'review_hiring_budget',args:{changes}},conditionalHiringAnswer],runtime=fixtureRuntime(steps);runtime.natural={datasetToken:'fixture:0'};
 const reply=await converseSolutions(request,runtime,new AbortController().signal);assert.equal(reply.state.conditionalHiringPlan,true);assert.deepEqual(reply.state.currentCalculationKinds,['hiring']);assert.deepEqual(reply.candidateIds,[]);assert.doesNotMatch(reply.answer,/Recommended Action Plan/);assert.match(reply.answer,/allowance is not salary/);
 const bad=fixtureRuntime([steps[0],input=>{const a=conditionalHiringAnswer(input);a.answer.conditionalHiringPlan.calculationRefs=['hiring-foreign'];return a;}]);bad.natural={datasetToken:'fixture:0'};await assert.rejects(converseSolutions(request,bad,new AbortController().signal),/current count-and-budget calculation/);
 const follow=solutionRequest('Explain only; no new plan.',false,reply.state,2),factual=await converseSolutions(follow,fixtureRuntime([final('The native proposal is still unconfirmed.')]),new AbortController().signal);assert.deepEqual(factual.state.currentCalculationKinds,[]);assert.deepEqual(factual.state.hiringBudget,reply.state.hiringBudget);
});
test('Baseline copy states unverified reconciliation; constructed-dataset override still removes that generic statement',()=>{
 const ui=fs.readFileSync(new URL('../components/workforce-planning/scenario-plan-summary.tsx',import.meta.url),'utf8'),engine=fs.readFileSync(new URL('../lib/scenario-engine.ts',import.meta.url),'utf8'),adapter=fs.readFileSync(new URL('../lib/dataset-planning-adapters.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(ui+engine,/do not fully explain/);assert.match(ui,/completeness and reconciliation with the aligned Baseline headcount curve remain unverified/);assert.match(adapter,/startsWith\('Modeled hires and exits are engine-implied gross flows'\)/);
});

test('weaker-group planning request yields a concrete measurement pilot without inventing a team ranking',async()=>{
 const {proposedPilot}=await import('./fixtures/model-proposed-pilot.mjs'),{evaluate}=await import('./fixtures/home-solution-conversation.mjs'),{buildHomePack}=await import('../lib/home-pack.mjs');
 const request=solutionRequest('Help us improve weaker teams. Recommend a small measurement pilot, using only supported named metrics.');
 request.evidence=buildHomePack({skills:{status:'loaded',data:{summary:{current_workforce:100},largest_gaps:[{skill_name:'Coaching',requirement_met_pct:45,profile_coverage_pct:80}]}}},'All company','');
 const candidate=proposedPilot('measurement-pilot');candidate.goal.statement='Improve team support using measured needs';candidate.name='Define and test a team measurement';candidate.activities[0].step='Ask the People Analytics owner to define team membership, a named outcome metric and a comparable measurement period; secure an approved aggregate release before selecting a cohort.';candidate.activities[0].ownerRole='People Analytics owner';candidate.activities[0].limitation='Skills are not teams. No released team ranking is supplied; survey and turnover populations cannot be substituted.';candidate.successMeasure='Review release eligibility and comparable metric coverage before judging team outcomes.';
 const reply=await converseSolutions(request,fixtureRuntime([evaluate(candidate),final('Coaching requirement met is 45% in the supplied skill row, with 80% profile coverage. [T1] This does not identify a weakest team; define the metric and release boundary first.',[candidate.id])]),new AbortController().signal);
 assert.deepEqual(reply.candidateIds,[candidate.id]);assert.deepEqual(reply.state.working[0].blocking,[]);assert.match(reply.state.working[0].candidate.activities[0].step,/approved aggregate release/);assert.match(reply.state.working[0].candidate.activities[0].limitation,/Skills are not teams/);assert.equal(actionPlanQuickSummary(reply.state.working[0].draft,reply.state.working[0].result).planning.months,2);
});

test('actual offline POST accepts the native conditional channel with its original two-round budget',async()=>{
 const {offlineBusinessRoute}=await import('./helpers/offline-business-route.mjs'),{responseForStep}=await import('./fixtures/natural-business-planning.mjs');
 const route=await offlineBusinessRoute(),{request,changes}=hiringFixture();route.sandbox.__replies.push(responseForStep({name:'review_hiring_budget',args:{changes}},0),r=>responseForStep(conditionalHiringAnswer(r.input),1));
 const response=await route.post(new Request('http://fixture/api/home-solution-conversation',{method:'POST',body:JSON.stringify(request)})),reply=await response.json();
 assert.equal(response.status,200,JSON.stringify(reply));assert.equal(reply.state.conditionalHiringPlan,true);assert.doesNotMatch(reply.answer,/Recommended Action Plan/);assert.equal(route.sandbox.__requests.length,2);for(const options of route.sandbox.__requestOptions)assert.equal(options.maxRetries,0);
});
test('a conditional answer cannot bind an earlier revision after editing the hiring assumptions',async()=>{
 const {request,changes}=hiringFixture();let old;
 const runtime=fixtureRuntime([{name:'review_hiring_budget',args:{changes}},input=>{old=conditionalHiringAnswer(input);return {name:'review_hiring_budget',args:{changes:[{field:'months',value:6,basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'A clearly proposed six-month planning window, not a user commitment.'}}]}};},()=>old]);runtime.natural={datasetToken:'fixture:0'};
 await assert.rejects(converseSolutions(request,runtime,new AbortController().signal),/current checked inputs/);
});
