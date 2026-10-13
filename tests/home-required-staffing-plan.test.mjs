import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRequiredStaffingPlan,requiredStaffingPlanFields} from '../lib/home-required-staffing-plan-save.ts';
import {requiredStaffingPlanFacts,requiredStaffingPlanIdentity} from '../lib/home-required-staffing-plan.ts';
import {editRequiredStaffing,resolveStaffingDeliveryTarget,retainStaffingDeliveryTarget} from '../lib/home-required-staffing.ts';
import {calculateRequiredStaffing} from '../lib/required-staffing.ts';
import {reviewBundleProposal,reviseBundleDraft,reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
import {readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedChanges} from './fixtures/required-staffing.mjs';
function receipt(currency='USD'){
 const request=solutionRequest(fixedMessages.start),review=editRequiredStaffing(request,'fixture:0',fixedChanges(request));
 if(currency!=='USD'){review.inputs.currency=currency;review.origins.currency={kind:'model-proposed',turnId:null,quote:null,explanation:'Explicit hypothetical native currency for this fixture.'};}
 return {version:1,review,optionId:calculateRequiredStaffing(review.inputs).recommendation.optionId,deliveryTarget:{months:3,turnId:'delivery-target',quote:'Deliver within 3 months.'}};
}
test('checked staffing pin and reload preserve native costs, provenance, unknowns and independent horizons',async()=>{
 for(const currency of ['USD','EUR']){
  const input=receipt(currency),original=JSON.stringify(input),goal={id:'goal-1',statement:'Cover 10 engineering roles.'},selection=await prepareRequiredStaffingPlan(input,goal);
  const fields=requiredStaffingPlanFields(selection,null,'selection-1','2026-10-13T00:00:00Z'),saved=readPlanAlternatives(JSON.parse(JSON.stringify(fields[planAlternativesField])),{goalId:goal.id,goal:goal.statement});
  assert.ok(saved);const plan=saved.plans[0],f=requiredStaffingPlanFacts(plan.draft.inputs.requiredStaffingPlan);
  assert.equal(f.option.listedCash,30000);assert.equal(f.option.completeCash,null);assert.equal(f.option.totalTrainingHours,480);assert.equal(f.option.readyAfterMonths,null);assert.equal(f.review.inputs.months,12);assert.equal(f.deliveryTarget.months,3);assert.equal(f.review.inputs.currency,currency);assert.deepEqual(f.review.origins,input.review.origins);
  assert.equal(plan.result.cashEstimate.cash,null);assert.equal(plan.result.scope.months.value,null);assert.deepEqual(plan.result,reviewBundleProposal(plan.draft));assert.throws(()=>reconcileBundle(plan.draft),/native staffing receipt/);
  const twice=requiredStaffingPlanFields(selection,saved,'selection-2','2026-10-13T00:01:00Z');assert.equal(twice[planAlternativesField].plans.length,1);assert.equal(JSON.stringify(input),original);
 }
});
test('receipt cannot be silently edited, removed, attached to another goal or used for an over-budget option',async()=>{
 const input=receipt(),selection=await prepareRequiredStaffingPlan(input,{id:'goal-1',statement:'Cover engineering roles.'});
 for(const edit of [i=>i.scope.months.value=3,i=>i.scope.currency='EUR',i=>i.requiredStaffingPlan.review.inputs.trainingCostPerPerson=1,i=>delete i.requiredStaffingPlan]){const inputs=structuredClone(selection.draft.inputs);edit(inputs);assert.throws(()=>reviseBundleDraft(selection.draft,inputs),/staffing|Staffing/);}
 const wrongGoal=structuredClone(selection);wrongGoal.goal.id='different';assert.throws(()=>requiredStaffingPlanFields(wrongGoal,null,'bad','2026-10-13T00:00:00Z'),/current goal/);
 input.optionId=calculateRequiredStaffing(input.review.inputs).options.find(o=>o.budgetStatus==='over').id;await assert.rejects(prepareRequiredStaffingPlan(input,selection.goal),/constraints/);
});

test('delivery provenance survives the rolling chat window, reload and identical pin without losing its target',async()=>{
 const input=receipt(),request=solutionRequest('Deliver within 3 months.'),state=request.state;request.message.id='delivery-target-turn';
 state.requiredStaffing=input.review;state.constraints=[{action:'set',field:'horizon_months',number:3,text:null,unit:'months',turnId:request.message.id}];state.turns=[{...request.message,role:'user'}];
 retainStaffingDeliveryTarget(state);const before=resolveStaffingDeliveryTarget(state);assert.equal(before.issue,null);assert.equal(before.target.months,3);
 input.deliveryTarget=before.target;input.review=state.requiredStaffing;
 const selected=await prepareRequiredStaffingPlan(input,{id:'goal-1',statement:'Cover engineering roles.'}),fields=requiredStaffingPlanFields(selected,null,'selected-1','2026-10-13T00:00:00Z'),catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:'goal-1',goal:selected.goal.statement});
 state.turns=Array.from({length:32},(_,i)=>({id:'later-'+i,role:i%2?'assistant':'user',text:'Later discussion '+i}));
 const reloaded=JSON.parse(JSON.stringify(state)),after=resolveStaffingDeliveryTarget(reloaded,catalog);assert.deepEqual(after,before);assert.equal(requiredStaffingPlanIdentity({...input,review:reloaded.requiredStaffing,deliveryTarget:after.target}),requiredStaffingPlanIdentity(input));
 const repeated=await prepareRequiredStaffingPlan({...input,review:reloaded.requiredStaffing,deliveryTarget:after.target},selected.goal);assert.equal(requiredStaffingPlanFields(repeated,catalog,'selected-2','2026-10-13T00:01:00Z')[planAlternativesField].plans.length,1);
 reloaded.requiredStaffing.basisTurns=reloaded.requiredStaffing.basisTurns.filter(t=>t.id!==request.message.id);assert.deepEqual(resolveStaffingDeliveryTarget(reloaded,catalog).target,before.target,'old saved receipt can recover its exact target source');
 assert.ok(resolveStaffingDeliveryTarget(reloaded).issue,'missing provenance is explicit, never silently saved as targetless');
 reloaded.constraints[0].number=4;assert.ok(resolveStaffingDeliveryTarget(reloaded,catalog).issue,'a changed target cannot borrow the old target quote');
});
test('known six-month readiness misses a three-month target despite a twelve-month cost horizon',async()=>{
 const input=receipt();for(const field of ['trainingReadyAfterMonths','redeployReadyAfterMonths']){input.review.inputs[field]=6;input.review.origins[field]={kind:'model-proposed',turnId:null,quote:null,explanation:'Hypothetical six-month readiness.'};}
 assert.equal(input.review.inputs.months,12);await assert.rejects(prepareRequiredStaffingPlan(input,{id:'goal-1',statement:'Cover engineering roles.'}),/misses.*delivery target/);
 input.review.inputs.redeployReadyAfterMonths=null;delete input.review.origins.redeployReadyAfterMonths;assert.equal(calculateRequiredStaffing(input.review.inputs).options.find(o=>o.id===input.optionId).readyAfterMonths,null);await assert.rejects(prepareRequiredStaffingPlan(input,{id:'goal-1',statement:'Cover engineering roles.'}),/misses.*delivery target/,'a known late training path remains infeasible when another path readiness is unknown');
 input.deliveryTarget=null;assert.equal((await prepareRequiredStaffingPlan(input,{id:'goal-1',statement:'Cover engineering roles.'})).receipt.review.inputs.months,12);
});

test('conversation completion retains a newly interpreted delivery source before chat history is trimmed',async()=>{
 const request=solutionRequest('Deliver within 3 months.');request.message.id='new-target-turn';request.state.requiredStaffing=receipt().review;
 request.state.turns=Array.from({length:32},(_,i)=>({id:'older-'+i,role:i%2?'assistant':'user',text:'Earlier discussion '+i}));
 const answer=final('The delivery target is an unconfirmed planning constraint.');answer.constraintUpdates=[{action:'set',field:'horizon_months',number:3,text:null,unit:'months',turnId:request.message.id}];
 const reply=await converseSolutions(request,fixtureRuntime([answer]),new AbortController().signal);
 assert.ok(reply.state.requiredStaffing.basisTurns.some(t=>t.id==='new-target-turn'&&t.text===request.message.text));
 reply.state.turns=[];assert.equal(resolveStaffingDeliveryTarget(reply.state).target.months,3);
});
