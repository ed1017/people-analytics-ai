import test from 'node:test';
import assert from 'node:assert/strict';
import {captureStaffingDelivery,readStaffingDeliveryCapture} from '../lib/home-staffing-delivery.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {resolveStaffingDeliveryTarget,retainStaffingDeliveryTarget} from '../lib/home-required-staffing.ts';
import {readSolutionState} from '../lib/home-solution-conversation.ts';
import {prepareRequiredStaffingPlan,requiredStaffingPlanFields} from '../lib/home-required-staffing-plan-save.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {fixedChanges} from './fixtures/required-staffing.mjs';
import {staffingDeliveryPrompt,syntheticDeliveryChanges} from './fixtures/staffing-delivery-prompt.mjs';
// Exact prompt recovered from rendered UI; provider output is explicitly synthetic.
// This is NOT a captured request/response or a replay of live model arguments.
const prompt=staffingDeliveryPrompt;
function setup(text=prompt,state){
 const request=solutionRequest(text,false,state,state?2:1),runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:text===prompt?syntheticDeliveryChanges(request):fixedChanges(request)}},final('Review delivery within 3 months; listed costs use 12 months.')]);
 runtime.natural={datasetToken:'legacy-v1:0'};return {request,runtime};
}
const run=({request,runtime})=>converseSolutions(request,runtime,new AbortController().signal);
test('explicit equivalent deadlines are captured, never annual costs or path readiness',()=>{
 for(const text of ['We need 10 people within 3 months.','We need 10 people in three months.','We need 10 people three months from now.','Deliver by the end of three months.','We need 10 people in the next three months.','Deliver within the next 3 months.','Deliver by 3 months.','Deliver no later than three months.','Delivery target: 3 months.','Delivery deadline is 3 months.','Deliver by the end of month 3.','We need a three-month delivery deadline.']){
  const d=captureStaffingDelivery({id:'user-1',text});assert.equal(d?.months,3,text);assert.equal(d.issue,null);assert.equal(d.quote,text);assert.deepEqual(readStaffingDeliveryCapture(d),d);
 }
 for(const text of ['Each hire costs USD 160000 for 12 months.','We need 10 people over 12 months.','Training is ready in 6 months.','The cost horizon is 12 months.'])assert.equal(captureStaffingDelivery({id:'user-1',text},true),null,text);
});
test('synthetic observed missing-constraint response retains explicit delivery before the first model call',async()=>{
 const fixture=setup(),before=structuredClone(fixture.request),reply=await run(fixture);
 const context=JSON.parse(fixture.runtime.contexts[0][0].content.split('\n').slice(1).join('\n'));
 assert.equal(context.staffingDeliveryTarget.months,3);assert.equal(context.staffingDeliveryTarget.quote,prompt);
 assert.deepEqual(reply.state.constraints,[],'provider omitted the generic constraint, as observed');
 assert.equal(reply.state.requiredStaffing.inputs.months,12);assert.equal(resolveStaffingDeliveryTarget(reply.state).months,3);
 assert.deepEqual(reply.usage,{modelRounds:2,toolCalls:1});assert.deepEqual(fixture.request,before,'caller state unchanged');
 const option=reply.state.requiredStaffing;assert.equal(option.inputs.hireCostPerPerson,160000);assert.equal(option.origins.redeploymentCostPerPerson.kind,'model-proposed');assert.equal(option.inputs.costsComplete,null);
});
test('capture survives reload, aged chat and pin identity without changing cost horizon',async()=>{
 const reply=await run(setup());retainStaffingDeliveryTarget(reply.state);reply.state.turns=[];
 const state=readSolutionState(JSON.parse(JSON.stringify(reply.state))),target=resolveStaffingDeliveryTarget(state).target;
 assert.equal(target.months,3);assert.equal(target.quote,prompt);
 const receipt={version:1,review:state.requiredStaffing,optionId:'train-3-redeploy-4-hire-3',deliveryTarget:target};
 const selected=await prepareRequiredStaffingPlan(receipt,{id:'goal-1',statement:'Cover ten roles.'});
 const fields=requiredStaffingPlanFields(selected,null,'pin-1','2026-10-13T00:00:00Z');
 assert.equal(fields.homePlanAlternativesV1.plans[0].draft.inputs.requiredStaffingPlan.deliveryTarget.months,3);
 assert.equal(fields.homePlanAlternativesV1.plans[0].draft.inputs.requiredStaffingPlan.review.inputs.months,12);
});
test('contradictory, negated, conditional and unsupported timing asks clarification without model execution',async()=>{
 for(const timing of ['within 3 months and within 6 months','within 3 months and 6 months','not within 3 months','within 3 or 6 months','within 3–6 months','within 2.5 months','within 30 months','within 6 weeks','in 6 weeks','by June','by Friday','within 3 months if the budget is approved']){
  const fixture=setup('We need 10 people '+timing+'. Compare hiring, training and redeployment.');
  const reply=await run(fixture);assert.match(reply.answer,/clarify/,timing);assert.equal(reply.usage.modelRounds,0,timing);assert.equal(fixture.runtime.rounds,0);assert.equal(reply.state.staffingDeliveryTarget.months,null);
 }
});
test('a clarification replaces ambiguity with exact user provenance and an ordinary cost edit preserves the target',async()=>{
 const first=await run(setup('We need 10 people within 3 months and within 6 months. Compare hiring, training and redeployment.'));
 // First clarification occurs before a calculator review exists.
 const clarified=setup('3 months.',first.state);clarified.request.message.id='user-2';
 clarified.runtime=fixtureRuntime([final('Review the clarified delivery deadline.')]);clarified.runtime.natural={datasetToken:'legacy-v1:0'};
 const next=await run(clarified);assert.equal(resolveStaffingDeliveryTarget(next.state).months,3);assert.equal(next.state.staffingDeliveryTarget.quote,'3 months.');
 const ready=await run(setup()),follow=solutionRequest('Change the cash allowance only.',false,ready.state,2),runtime=fixtureRuntime([final('The deadline is unchanged.')]);runtime.natural={datasetToken:'legacy-v1:0'};
 const result=await converseSolutions(follow,runtime,new AbortController().signal);assert.equal(resolveStaffingDeliveryTarget(result.state).months,3);
});
test('explicit correction and removal do not overwrite the twelve-month cost basis',async()=>{
 const first=await run(setup());
 for(const [text,months] of [['Actually, within four months.',4],['Remove the delivery deadline.',null]]){
  const request=solutionRequest(text,false,first.state,2),runtime=fixtureRuntime([final('Review the changed delivery target.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);assert.equal(resolveStaffingDeliveryTarget(reply.state).months,months);assert.equal(reply.state.requiredStaffing.inputs.months,12);
 }
});
test('provider constraints cannot replace the explicit deadline with the cost horizon',async()=>{
 const fixture=setup(),answer=final('Review the comparison.');answer.constraintUpdates=[{action:'set',field:'horizon_months',number:12,text:null,unit:'months',turnId:fixture.request.message.id}];
 fixture.runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(fixture.request)}},answer]);fixture.runtime.natural={datasetToken:'legacy-v1:0'};
 await assert.rejects(run(fixture),/conflicts with the explicit staffing deadline/);
});
test('tampered saved target cannot borrow a different user quote',()=>{
 assert.ok(captureStaffingDelivery({id:'user-1',text:'Can we deliver within three months?'})?.issue);
 assert.ok(captureStaffingDelivery({id:'user-1',text:'Remove the deadline and set it to 4 months.'})?.issue);
 const d=captureStaffingDelivery({id:'user-1',text:prompt});assert.throws(()=>readStaffingDeliveryCapture({...d,months:6}),/does not match/);
});

test('cancelled clarification cannot return or persist a new target',async()=>{
 const fixture=setup('We need 10 people within 3 or 6 months. Compare hiring and training.'),before=structuredClone(fixture.request),controller=new AbortController();controller.abort();
 await assert.rejects(converseSolutions(fixture.request,fixture.runtime,controller.signal));assert.deepEqual(fixture.request,before);assert.equal(fixture.runtime.rounds,0);
});
