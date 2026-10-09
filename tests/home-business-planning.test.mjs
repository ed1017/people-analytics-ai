import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {currentBusinessPlanning,readBusinessPlanning,runBusinessPlanningTool} from '../lib/home-business-planning.ts';
import {calculateServiceStaffing,editStaffingInputs} from '../lib/home-service-staffing.ts';
import {prepareBusinessPlanningSelection,businessPlanningSelectionFields,businessPlanningReceiptField} from '../lib/home-business-planning-save.ts';
import {readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {solutionRequest,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
import {messages,naturalSteps,initialSpec,unknownBasis,supplied} from './fixtures/natural-business-planning.mjs';
const token='legacy-v1:0';
async function journey(steps=3){let reply;for(const [index,text] of Object.values(messages).slice(0,steps).entries()){const request=solutionRequest(text,false,reply?.state,index+1),runtime=fixtureRuntime(naturalSteps(request));runtime.natural={datasetToken:token};reply=await converseSolutions(request,runtime,new AbortController().signal);}return reply;}
test('ordinary requests create and retain code-bound demand without a mode, example or goal',async()=>{
 const first=await journey(1),state=first.state.businessPlanning;
 assert.match(state.context.intakeId,/^swp-demand-[a-f0-9]{40}$/);assert.deepEqual(state.context.boundGoal,{id:'',statement:''});assert.equal(state.review.spec.scope,null);assert.equal(state.review.result.status,'needs-inputs');assert.equal(state.staffing,null);assert.equal(first.demandReview,undefined);
 const complete=await journey(),s=complete.state.businessPlanning;
 assert.equal(s.review.result.workloadHours,3600);assert.equal(s.review.result.capacityHours,1200);assert.equal(s.review.result.additionalRoles,2);assert.equal(s.staffing.result.enumerated,4);assert.equal(s.staffing.result.options.length,4);
 const allHire=s.staffing.result.options[0];assert.deepEqual(allHire.mix,{build:0,move:0,buy:2});assert.equal(allHire.cash,117000);assert.ok(Math.abs(allHire.shortfallHours-2400/9)<1e-8);assert.equal(s.staffing.result.accepted,false);assert.equal(s.staffing.result.operationalFeasibilityVerified,false);assert.deepEqual(readBusinessPlanning(s),s);
});
test('quoted correction changes only named premises and recalculates every option',async()=>{
 const before=(await journey()).state.businessPlanning,after=(await journey(4)).state.businessPlanning;
 assert.equal(after.review.result.additionalRoles,1);assert.equal(after.review.result.capacityHours,2400);assert.equal(after.staffing.inputs.values.trainingCash.value,7000);
 for(const [field,atom] of Object.entries(before.staffing.inputs.values))if(field!=='trainingCash')assert.deepEqual(after.staffing.inputs.values[field],atom);
 for(const [field,value] of Object.entries(before.review.spec))if(field!=='availabilityPct')assert.deepEqual(after.review.spec[field],value);
 assert.equal(after.staffing.result.enumerated,3);assert.equal(after.staffing.result.options[0].cash,58500);assert.equal(after.staffing.inputs.values.trainingCash.basis.turnId,'user-4');
});
test('scope, dataset and current-reference guards keep stale inputs from being repurposed',async()=>{
 const reply=await journey(),request=solutionRequest('Review another option',false,reply.state,4),s=reply.state.businessPlanning;
 assert.throws(()=>currentBusinessPlanning(request,'other-v1:0'),/changed/);
 assert.throws(()=>currentBusinessPlanning({...request,scope:'Another department'},token),/changed/);
 await assert.rejects(runBusinessPlanningTool(request,token,s,'compare_service_staffing',{reviewRef:'stale',changes:[]},0),/reference/);
 const changed=structuredClone(s);changed.staffing.result.options[0].cash=1;assert.throws(()=>readBusinessPlanning(changed),/calculation changed/);
 const demo=initialSpec(request);demo.scope={ref:'illustrative-service-role'};await assert.rejects(runBusinessPlanningTool(request,token,null,'review_scoped_service_demand',{spec:demo},0));
});
test('unknowns remain unknown, internal pools require explicit premises and active backfills use supplied costs',async()=>{
 const s=(await journey()).state.businessPlanning,inputs=structuredClone(s.staffing.inputs),missing=field=>inputs.values[field]={value:null,basis:unknownBasis()};
 missing('costsCompleteAndDistinct');let result=calculateServiceStaffing(s.review,inputs);assert.ok(result.options.every(o=>o.cash===null));assert.equal(result.options[0].listedCash,117000);
 missing('internalRelease');result=calculateServiceStaffing(s.review,inputs);assert.equal(result.enumerated,1);assert.match(result.missing.join(' '),/excluded/);
 const backfills=structuredClone(s.staffing.inputs),b=backfills.values.backfills.basis;Object.assign(backfills.values,{backfills:{value:1,basis:b},annualBackfillCost:{value:60000,basis:b},backfillFee:{value:1000,basis:b},backfillDate:{value:'2026-11-01',basis:b}});result=calculateServiceStaffing(s.review,backfills);
 assert.equal(result.options[0].cash,117000);const internal=result.options.find(o=>o.mix.move===1&&o.mix.build===1);assert.equal(internal.addedEmployees,1);assert.equal(internal.status,'met');assert.ok(internal.cash>50000);
 const body=solutionRequest('Change the staffing assumption',false,undefined,9),atom={field:'trainingCash',value:1,basis:{kind:'model-proposed',turnId:null,quote:null,explanation:'New model premise.'}};
 assert.throws(()=>editStaffingInputs(s.review,s.staffing.inputs,[atom],body.message,[body.message]),/current-user correction/);
});
test('explicit selection reconciles costs and saves a proposal snapshot without changing the discussion',async()=>{
 const state=(await journey()).state.businessPlanning,before=JSON.stringify(state);
 for(const option of state.staffing.result.options){
  const selected=await prepareBusinessPlanningSelection(state,option.id);assert.equal(selected.result.cashEstimate.cash,option.cash);
  const fields=businessPlanningSelectionFields(selected,null,'choice-'+option.id,'2026-10-09T08:00:00Z',undefined),catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:selected.goal.id,goal:selected.goal.statement});
  assert.equal(catalog.order.length,1);assert.deepEqual(fields[businessPlanningReceiptField][0].state,state);assert.equal(fields[businessPlanningReceiptField][0].optionId,option.id);
 }
 assert.equal(JSON.stringify(state),before);
 const unknown=structuredClone(state);unknown.staffing.inputs.values.costsCompleteAndDistinct={value:null,basis:unknownBasis()};unknown.staffing.result=calculateServiceStaffing(unknown.review,unknown.staffing.inputs);assert.equal((await prepareBusinessPlanningSelection(unknown,unknown.staffing.result.options[0].id)).result.cashEstimate.cash,null);
});
test('topic change clears only the provisional business state and retains conversation history',async()=>{
 const reply=await journey(5);assert.equal(reply.state.businessPlanning,null);assert.equal(reply.state.turns.length,10);assert.equal(reply.state.working.length,0);assert.equal(reply.candidateIds.length,0);
});

test('a current-user withdrawal restores an unknown without filling it from a previous value',async()=>{
 const s=(await journey()).state.businessPlanning,body=solutionRequest('The hire cost is unknown now; withdraw the earlier rate.',false,undefined,9);
 const inputs=editStaffingInputs(s.review,s.staffing.inputs,[{field:'annualHireCost',value:null,basis:supplied(body)}],body.message,[body.message]);
 const result=calculateServiceStaffing(s.review,inputs);assert.equal(result.options[0].cash,null);assert.equal(inputs.values.annualHireCost.value,null);assert.equal(inputs.values.annualHireCost.basis.turnId,body.message.id);assert.deepEqual(inputs.values.hireFee,s.staffing.inputs.values.hireFee);
});
