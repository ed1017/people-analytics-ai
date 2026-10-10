import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {currentRequiredStaffing,editRequiredStaffing,readRequiredStaffingReview,requiredStaffingView} from '../lib/home-required-staffing.ts';
import {solutionRequest,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedValues,fixedChanges,fixedBasis,fixedSteps} from './fixtures/required-staffing.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {initialSpec} from './fixtures/natural-business-planning.mjs';
import {runBusinessPlanningTool} from '../lib/home-business-planning.ts';
const token='legacy-v1:0';
async function ask(text,state,sequence=1){const request=solutionRequest(text,false,state,sequence),runtime=fixtureRuntime(fixedSteps(request));runtime.natural={datasetToken:token};return {reply:await converseSolutions(request,runtime,new AbortController().signal),runtime};}
test('actual conversation calculates the fixed requirement and returns numbers on follow-up without population or workload lookup',async()=>{
 const {reply,runtime}=await ask(fixedMessages.start);assert.equal(runtime.reads,0);assert.equal(reply.state.businessPlanning,undefined);assert.equal(reply.state.hiringBudget,undefined);assert.equal(requiredStaffingView(reply.state.requiredStaffing).enumerated,35);assert.match(reply.answer,/1600000 USD/);assert.match(reply.answer,/30000 USD/);assert.match(reply.answer,/495000 USD/);assert.match(reply.answer,/new-hire training not specified/);
 assert.deepEqual(reply.candidateIds,[]);assert.deepEqual(reply.analysisIds,[]);assert.deepEqual(reply.state.verifiedMetrics,[]);assert.equal(reply.state.working.length,0);
 const next=await ask(fixedMessages.followup,reply.state,2);assert.match(next.reply.answer,/495000 USD/);assert.equal(next.runtime.reads,0);assert.deepEqual(next.reply.state.requiredStaffing.origins,reply.state.requiredStaffing.origins);assert.deepEqual(next.reply.state.requiredStaffing.inputs,reply.state.requiredStaffing.inputs);
});
test('current-user correction recalculates all comparisons while preserving other inputs and explicit unknowns',async()=>{
 const initial=(await ask(fixedMessages.start)).reply,next=(await ask(fixedMessages.correction,initial.state,2)).reply;
 assert.match(next.answer,/42000 USD/);assert.match(next.answer,/501000 USD/);assert.match(next.answer,/240 planned training hours/);
 const before=initial.state.requiredStaffing,after=next.state.requiredStaffing;
 for(const field of Object.keys(fixedValues))if(field!=='trainingCostPerPerson'){assert.equal(after.inputs[field],before.inputs[field]);assert.deepEqual(after.origins[field],before.origins[field]);}
 assert.equal(after.origins.trainingCostPerPerson.turnId,'user-2');assert.equal(after.inputs.internalRelease,null);assert.equal(after.inputs.hireTrainingHoursPerPerson,null);
});
test('a prior incomplete workload review cannot force the fixed requirement back through workload inputs',async()=>{
 const body=solutionRequest(fixedMessages.start),spec={...initialSpec(body),objective:'Fill ten required engineering roles.'};
 const businessPlanning=await runBusinessPlanningTool(body,token,null,'review_scoped_service_demand',{spec},0);
 assert.equal(businessPlanning.review.result.status,'needs-inputs');
 const {reply}=await ask(fixedMessages.start,{...body.state,businessPlanning},2);
 assert.equal(requiredStaffingView(reply.state.requiredStaffing).enumerated,35);assert.deepEqual(reply.state.businessPlanning,businessPlanning);assert.match(reply.answer,/495000 USD/);
});
test('forged source rates, stale scopes, unsupported inputs and silent premise changes are refused',()=>{
 const request=solutionRequest(fixedMessages.start),s=editRequiredStaffing(request,token,fixedChanges(request));
 assert.throws(()=>readRequiredStaffingReview({...s,result:{listedCash:1}}));assert.throws(()=>readRequiredStaffingReview({...s,origins:{...s.origins,hireCostPerPerson:{...s.origins.hireCostPerPerson,kind:'company-source'}}}));
 const next=solutionRequest('Change a premise.',false,{...request.state,requiredStaffing:s},2);
 assert.throws(()=>currentRequiredStaffing(next,'other:0'),/another goal/);assert.throws(()=>currentRequiredStaffing({...next,scope:'Changed'},token),/another goal/);
 const change={field:'trainingCostPerPerson',value:1,basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'Unapproved rewrite.'}};assert.throws(()=>editRequiredStaffing(next,token,[change]),/user correction/);
 assert.throws(()=>editRequiredStaffing(next,token,[{...change,basis:{...fixedBasis(next),quote:'fabricated'}}]),/exact user quote/);
 assert.throws(()=>editRequiredStaffing(next,token,fixedChanges(next,{currency:'EUR'})),/restating or clearing/);assert.throws(()=>editRequiredStaffing(next,token,fixedChanges(next,{months:6})),/restating or clearing/);assert.throws(()=>editRequiredStaffing(next,token,fixedChanges(next,{role:'Another role'})),/restating or clearing/);
 const withdrawn=editRequiredStaffing(next,token,fixedChanges(next,{hireCostPerPerson:null}));assert.equal(requiredStaffingView(withdrawn).options[0].listedCash,null);
});
test('actual POST offers the direct tool and preserves numerical initial/follow-up/correction replies through offline transport',async()=>{
 const route=await offlineBusinessRoute();route.sandbox.console={info(){},error(){}};let state;
 for(const [i,message] of Object.values(fixedMessages).entries()){
  const body=solutionRequest(message,false,state,i+1),steps=fixedSteps(body);
  route.sandbox.__replies.push(responseForStep(steps[0],0));
  route.sandbox.__replies.push(null);
  const originalShift=route.sandbox.__replies.shift.bind(route.sandbox.__replies);
  route.sandbox.__replies.shift=()=>{const r=originalShift();return r??responseForStep(steps[1](route.sandbox.__requests.at(-1).input),1);};
  const response=await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));
  assert.equal(response.status,200);const reply=await response.json();state=reply.state;
  assert.match(reply.answer,i===2?/501000 USD/:/495000 USD/);assert.equal(state.requiredStaffing.inputs.requiredRoles,10);assert.equal(state.businessPlanning,undefined);
  route.sandbox.__replies.shift=originalShift;
 }
 assert.equal(route.sandbox.__requests.length,6);assert.ok(route.sandbox.__requests[0].tools.some(t=>t.name==='compare_required_staffing'));assert.match(route.sandbox.__requests[0].instructions,/does not require ticket volume/);assert.equal(route.sandbox.__requests[0].parallel_tool_calls,false);
});
