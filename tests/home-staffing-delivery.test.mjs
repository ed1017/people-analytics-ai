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
 assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});assert.deepEqual(fixture.request,before,'caller state unchanged');
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
 const fixture=setup(prompt+' Also explain the cost horizon.'),answer=final('Review the comparison.');answer.constraintUpdates=[{action:'set',field:'horizon_months',number:12,text:null,unit:'months',turnId:fixture.request.message.id}];
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

test('only an unambiguous affirmative instruction removes the deadline',async()=>{
 const first=await run(setup());
 for(const text of ['Never remove the delivery deadline.','Can we remove the delivery deadline?','What happens if we remove the deadline?',"Don't remove the deadline.",'We should remove the deadline.','Maybe remove the deadline.','Remove the deadline?','If there is no deadline, what changes?','Explain how to remove the deadline.']){
  assert.equal(captureStaffingDelivery({id:'user-2',text},true),null,text);
  const request=solutionRequest(text,false,first.state,2),runtime=fixtureRuntime([final('The existing deadline remains in place.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);
  assert.deepEqual(reply.state.staffingDeliveryTarget,first.state.staffingDeliveryTarget,text);
  assert.equal(resolveStaffingDeliveryTarget(reply.state).months,3,text);
  assert.throws(()=>readStaffingDeliveryCapture({months:null,turnId:'user-2',quote:text,issue:null}),/does not match/,text);
 }
 for(const text of ['Remove the delivery deadline.','Please clear the staffing deadline.','Drop our deadline!','No delivery deadline.']){
  assert.deepEqual(captureStaffingDelivery({id:'user-2',text},true),{months:null,turnId:'user-2',quote:text,issue:null},text);
 }
});
test('captured target can be corrected or removed before a calculator review exists',async()=>{
 const initial=setup('We need 10 people within 3 months.');initial.runtime=fixtureRuntime([final('Which role should the staffing plan cover?')]);initial.runtime.natural={datasetToken:'legacy-v1:0'};
 const first=await run(initial);assert.equal(first.state.requiredStaffing,undefined);assert.equal(resolveStaffingDeliveryTarget(first.state).months,3);
 for(const [text,months] of [['Actually, within four months.',4],['Remove the delivery deadline.',null]]){
  const request=solutionRequest(text,false,first.state,2),runtime=fixtureRuntime([final('The delivery target is updated.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);
  assert.equal(resolveStaffingDeliveryTarget(reply.state).months,months,text);assert.equal(reply.state.staffingDeliveryTarget.quote,text);
 }
});
test('pending clarification does not intercept unrelated messages or topic switches',async()=>{
 const first=await run(setup('We need 10 people within 3 or 6 months. Compare hiring and training.'));
 for(const text of ['Explain the cash calculation.','Switch topics: help me understand employee retention.']){
  const request=solutionRequest(text,false,first.state,2),runtime=fixtureRuntime([final('We can discuss the requested topic.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);
  assert.equal(runtime.rounds,1,text);assert.equal(reply.usage.modelRounds,1,text);
  assert.deepEqual(reply.state.staffingDeliveryTarget,first.state.staffingDeliveryTarget,'unresolved staffing issue remains available to eligibility checks');
 }
});

 test('cost-only staffing follow-ups cannot replace the delivery deadline',async()=>{
 const first=await run(setup());
 for(const text of ['Staff costs in the next 12 months are USD 100000.','We need to budget salaries in 12 months.','We need to pay invoices in 12 months.','Staff training is ready in 6 months.']){
  assert.equal(captureStaffingDelivery({id:'user-2',text},true),null,text);
  const request=solutionRequest(text,false,first.state,2),runtime=fixtureRuntime([final('Review the cost assumption.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);
  assert.deepEqual(reply.state.staffingDeliveryTarget,first.state.staffingDeliveryTarget,text);assert.equal(reply.state.requiredStaffing.inputs.months,12);
 }
});

test('capture round-trips with a later cost-review clause before and after model execution',async()=>{
 const text='We need 10 people within 3 months. In 6 months we will review costs.';
 const capture=captureStaffingDelivery({id:'user-1',text});assert.equal(capture.months,3);assert.deepEqual(readStaffingDeliveryCapture(capture),capture);
 const fixture=setup(text);fixture.runtime=fixtureRuntime([final('Which role should the staffing plan cover?')]);fixture.runtime.natural={datasetToken:'legacy-v1:0'};
 const reply=await run(fixture);assert.equal(fixture.runtime.rounds,1);assert.equal(resolveStaffingDeliveryTarget(reply.state).months,3);assert.deepEqual(readSolutionState(reply.state),reply.state);
});

test('legacy horizon-only targets survive discussion and support explicit edits without a calculator',async()=>{
 const request=solutionRequest('We need 10 people within 3 months.',false,undefined,1),state=request.state;
 state.constraints=[{action:'set',field:'horizon_months',number:3,text:null,unit:'months',turnId:request.message.id}];state.turns=[{...request.message,role:'user'}];
 for(const [text,months] of [['Never remove the delivery deadline.',3],['Can we remove the delivery deadline?',3],['What happens if we remove the deadline?',3],['Staff costs in the next 12 months are USD 100000.',3],['We need to budget salaries in 12 months.',3],['Actually, within four months.',4],['Remove the delivery deadline.',null]]){
  const follow=solutionRequest(text,false,state,2),runtime=fixtureRuntime([final('Review the requested topic.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(follow,runtime,new AbortController().signal);assert.equal(resolveStaffingDeliveryTarget(reply.state).months,months,text);
 }
});

test('question and uncertain modal deadlines require clarification before model execution',async()=>{
 for(const text of ['Do we need 10 people within 3 months?','We might need 10 people within 3 months.','We may need 10 people within 3 months.']){
  const capture=captureStaffingDelivery({id:'user-1',text});assert.equal(capture.months,null,text);assert.ok(capture.issue,text);assert.deepEqual(readStaffingDeliveryCapture(capture),capture);
  const fixture=setup(text),reply=await run(fixture);assert.equal(fixture.runtime.rounds,0,text);assert.equal(reply.usage.modelRounds,0,text);assert.ok(resolveStaffingDeliveryTarget(reply.state).issue,text);
 }
});

test('unrelated plan horizons can change while a staffing deadline is unresolved or removed',async()=>{
 const unresolved=await run(setup('We need 10 people within 3 or 6 months. Compare hiring and training.'));
 const ready=await run(setup()),remove=setup('Remove the delivery deadline.',ready.state);remove.runtime=fixtureRuntime([final('The delivery deadline is removed.')]);remove.runtime.natural={datasetToken:'legacy-v1:0'};
 const removed=await run(remove);
 for(const prior of [unresolved,removed]){
  const request=solutionRequest('Switch topics: create a retention plan with a six-month horizon.',false,prior.state,3),answer=final('Review the retention plan over six months.');
  answer.constraintUpdates=[{action:'set',field:'horizon_months',number:6,text:null,unit:'months',turnId:request.message.id}];
  const runtime=fixtureRuntime([answer]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);
  assert.equal(runtime.rounds,1);assert.equal(reply.state.constraints.find(c=>c.field==='horizon_months').number,6);
  assert.deepEqual(reply.state.staffingDeliveryTarget,prior.state.staffingDeliveryTarget);
  assert.deepEqual(resolveStaffingDeliveryTarget(reply.state),resolveStaffingDeliveryTarget(prior.state),'staffing eligibility is unchanged by another plan horizon');
 }
});

test('legacy deadline correction removes stale generic interpretation from model context',async()=>{
 const first=solutionRequest('We need 10 people within 3 months.',false,undefined,1),state=first.state;
 state.constraints=[{action:'set',field:'horizon_months',number:3,text:null,unit:'months',turnId:first.message.id}];state.turns=[{...first.message,role:'user'}];
 for(const text of ['Actually, within four months.','Remove the delivery deadline.']){
  const request=solutionRequest(text,false,state,2),runtime=fixtureRuntime([final('Review the updated delivery target.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal),context=JSON.parse(runtime.contexts[0][0].content.split('\n').slice(1).join('\n'));
  assert.deepEqual(context.currentConstraints,[],text);assert.deepEqual(reply.state.constraints,[],text);
  assert.equal(context.staffingDeliveryTarget.months,text.startsWith('Actually')?4:null,text);
 }
});

test('a later strategy question does not make an explicit deadline uncertain',async()=>{
 const text='We need 10 people within 3 months. Should we hire or train?';
 const capture=captureStaffingDelivery({id:'user-1',text});assert.equal(capture.months,3);assert.equal(capture.issue,null);assert.deepEqual(readStaffingDeliveryCapture(capture),capture);
 const fixture=setup(text);fixture.runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(fixture.request,{requiredRoles:10})}},final('Review the hiring and training choices.')]);fixture.runtime.natural={datasetToken:'legacy-v1:0'};
 const reply=await run(fixture);assert.equal(fixture.runtime.rounds,2);assert.equal(resolveStaffingDeliveryTarget(reply.state).months,3);assert.equal(resolveStaffingDeliveryTarget(reply.state).issue,null);
});

test('a new staffing capture preserves an unrelated legacy retention-plan horizon',async()=>{
 const first=solutionRequest('Create a retention plan with a six-month horizon.',false,undefined,1),state=first.state;
 state.constraints=[{action:'set',field:'horizon_months',number:6,text:null,unit:'months',turnId:first.message.id}];state.turns=[{...first.message,role:'user'}];
 for(const text of ['Do we need 10 people within 3 months?','We need 10 people within 3 months.']){
  const request=solutionRequest(text,false,state,2),runtime=fixtureRuntime([final('Review the staffing request.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);assert.deepEqual(reply.state.constraints,state.constraints,text);
  assert.equal(runtime.rounds,text.endsWith('?')?0:1,text);
 }
});

test('a generic retention delivery deadline does not establish legacy staffing ownership',async()=>{
 for(const originalText of ['Deliver the retention plan within 6 months.','We need 10 people. Deliver the retention plan within 6 months.']){
 const first=solutionRequest(originalText,false,undefined,1),state=first.state;
 state.constraints=[{action:'set',field:'horizon_months',number:6,text:null,unit:'months',turnId:first.message.id}];state.turns=[{...first.message,role:'user'}];
 for(const text of ['Do we need 10 people within 3 months?','We need 10 people within 3 months.']){
  const request=solutionRequest(text,false,state,2),runtime=fixtureRuntime([final('Review the staffing request.')]);runtime.natural={datasetToken:'legacy-v1:0'};
  const reply=await converseSolutions(request,runtime,new AbortController().signal);assert.deepEqual(reply.state.constraints,state.constraints,text);
  assert.equal(runtime.rounds,text.endsWith('?')?0:1,text);
 }
 }
});
