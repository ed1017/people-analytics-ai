import test from 'node:test';
import assert from 'node:assert/strict';
import {solutionRequest,fixtureRuntime,final,candidate,evaluate} from './fixtures/home-solution-conversation.mjs';
import {fixedChanges,fixedValues} from './fixtures/required-staffing.mjs';
for(const prefix of ['../releases/2026-10-21/source/']){
 const {requiredStaffingAnswer,editRequiredStaffing,resolveStaffingDeliveryTarget}=await import(prefix+'lib/home-required-staffing.ts');
 const {converseSolutions}=await import(prefix+'lib/home-solution-conversation-service.ts');
 const {calculateRequiredStaffing}=await import(prefix+'lib/required-staffing.ts');
 const {requiredStaffingPlanFacts}=await import(prefix+'lib/home-required-staffing-plan.ts');
 const label='release';
 const request=solutionRequest('We need 10 engineering roles within 3 months. Compare hiring, training and redeployment. Use a 12-month cost horizon and USD 1000000 budget. Each hire costs USD 160000 for the entire period.');
 const review=editRequiredStaffing(request,'legacy-v1:0',fixedChanges(request,{...fixedValues,hireReadyAfterMonths:2,trainingReadyAfterMonths:4,redeployReadyAfterMonths:1}));
 test(label+' deadline conflict suppresses cheapest recommendation without changing period cash',()=>{
  const before=structuredClone(review),answer=requiredStaffingAnswer(review,{months:3,issue:null});
  assert.match(answer,/Delivery target: 3 months. Cost horizon: 12 months/);
  assert.match(answer,/Coverage: not-met\. Misses the 3-month delivery target/);
  assert.doesNotMatch(answer,/Recommendation:/);assert.match(answer,/deadline has not been relaxed/);
  assert.match(answer,/30000 USD/);assert.deepEqual(review,before);
  assert.match(requiredStaffingAnswer(review,{months:4,issue:null}),/Recommendation:/);
  assert.match(requiredStaffingAnswer(review),/Recommendation:/);
 });
 test(label+' a known late active path remains a conflict when another readiness is unknown',()=>{
  const partial=structuredClone(review);partial.inputs.redeployReadyAfterMonths=null;
  assert.match(requiredStaffingAnswer(partial,{months:3,issue:null}),/Readiness: Unknown\. Coverage: not-met\. Misses/);
  const unknown=structuredClone(review);unknown.inputs.trainingReadyAfterMonths=null;
  const answer=requiredStaffingAnswer(unknown,{months:3,issue:null});
  assert.match(answer,/Readiness: Unknown/);assert.doesNotMatch(answer,/Misses/);assert.match(answer,/remains conditional/);
  assert.doesNotMatch(requiredStaffingAnswer(review,{months:4,issue:'Restate the target.'}),/Recommendation:/);
 });
 test(label+' a late path with unknown combined readiness remains unpinnable without changing listed cash',()=>{
  const partial=editRequiredStaffing(request,'legacy-v1:0',fixedChanges(request,{...fixedValues,hireReadyAfterMonths:2,trainingReadyAfterMonths:4,redeployReadyAfterMonths:null}));
  const before=structuredClone(partial),result=calculateRequiredStaffing(partial.inputs),option=result.options.find(o=>o.id===result.recommendation.optionId);
  assert.equal(option.readyAfterMonths,null);assert.equal(option.listedCash,30000);
  const receipt={version:1,review:partial,optionId:option.id,deliveryTarget:{months:3,turnId:request.message.id,quote:request.message.text}};
  assert.throws(()=>requiredStaffingPlanFacts(receipt),/misses the stated delivery target/);
  const afterReview=requiredStaffingPlanFacts({...receipt,deliveryTarget:{...receipt.deliveryTarget,months:4}});
  assert.equal(afterReview.option.listedCash,30000);assert.equal(afterReview.option.readyAfterMonths,null);
  assert.ok(afterReview.option.unknowns.includes('Readiness and coverage timing are unknown.'));
  assert.doesNotMatch(requiredStaffingAnswer(partial,{months:3,issue:null}),/Recommendation:/);
  assert.deepEqual(partial,before);
 });
 test(label+' mixed requests cannot retain a contradictory provider recommendation',async()=>{
  const mixed=solutionRequest(request.message.text+' Also explain the tradeoffs for the leadership team.'),port=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(mixed,review.inputs)}},final('I recommend training for delivery on time.')]);port.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(mixed,port,new AbortController().signal);
  assert.doesNotMatch(reply.answer,/I recommend training for delivery on time/);assert.match(reply.answer,/Misses the 3-month delivery target/);assert.match(reply.answer,/Ask the other parts separately/);assert.deepEqual(reply.state.questions,[]);
  const before=structuredClone(mixed),material=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(mixed,review.inputs)}},final('I recommend training for delivery on time.',['proposal-1'])]);material.natural={datasetToken:'legacy-v1:0'};
  await assert.rejects(converseSolutions(mixed,material,new AbortController().signal),/deadline needs review before combining/);assert.deepEqual(mixed,before);
  const hidden=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(mixed,review.inputs)}},evaluate(candidate()),items=>{
   const result=JSON.parse(items.filter(i=>i.type==='function_call_output').at(-1).output);assert.notEqual(result.ok,false,'The hidden candidate must actually be evaluated.');return final('I recommend training for delivery on time.');
  }]);hidden.natural={datasetToken:'legacy-v1:0'};
  await assert.rejects(converseSolutions(mixed,hidden,new AbortController().signal),/deadline needs review before combining/);assert.deepEqual(mixed,before);
 });
 test(label+' conversational reply and retained answer apply captured delivery target on recalculation',async()=>{
  const runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(request,review.inputs)}},final('This is conditional.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const first=await converseSolutions(request,runtime,new AbortController().signal);
  assert.match(first.answer,/Misses the 3-month delivery target/);assert.doesNotMatch(first.answer,/Recommendation:/);
  assert.equal(first.state.turns.at(-1).text,first.answer);assert.equal(first.state.requiredStaffing.inputs.months,12);
  const next=solutionRequest('Give me the numerical totals for the three options again.',false,first.state,2);
  const follow=fixtureRuntime([{name:'compare_required_staffing',args:{changes:[]}},final('This is conditional.')]);follow.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(next,follow,new AbortController().signal);
  assert.match(reply.answer,/Misses the 3-month delivery target/);assert.doesNotMatch(reply.answer,/Recommendation:/);
  assert.equal(resolveStaffingDeliveryTarget(reply.state).months,3);
  for(const [text,months] of [['Actually, within four months.',4],['Remove the delivery deadline.',null]]){
   const correction=solutionRequest(text,false,reply.state,3),port=fixtureRuntime([{name:'compare_required_staffing',args:{changes:[]}},final('Review the comparison.')]);port.natural={datasetToken:'legacy-v1:0'};
   const changed=await converseSolutions(correction,port,new AbortController().signal);
   assert.equal(resolveStaffingDeliveryTarget(changed.state).months,months);assert.doesNotMatch(changed.answer,/Misses/);assert.match(changed.answer,/Recommendation:/);assert.equal(changed.state.requiredStaffing.inputs.months,12);
  }
 });
}
