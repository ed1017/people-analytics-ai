import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleProviderPreviewReceipt} from '../lib/home-provider-preview-receipt.ts';
import {editRequiredStaffing} from '../lib/home-required-staffing.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedChanges} from './fixtures/required-staffing.mjs';
const secret='PRIVATE_AUTH_EMPLOYEE_PROMPT_SENTINEL';
const context={requestId:'11111111-1111-4111-8111-111111111111',endpoint:'/api/home-solution-conversation',status:200,startedAt:'2026-10-10T15:00:00.000Z',receivedAt:'2026-10-10T15:00:02.000Z',elapsedMs:2000};
const round=attempt=>({attempt,elapsedMs:500,model:'gpt-6.1-sol',serviceTier:'default',inputTokens:100,cachedInputTokens:0,outputTokens:20,reasoningTokens:5,totalTokens:120,raw:secret});
const response=()=>({providerReceipt:{version:1,correlationId:'22222222-2222-4222-8222-222222222222',modelAttempts:2,providerRounds:[round(1),round(2)],authorization:secret},usage:{modelRounds:2,toolCalls:1},answer:secret,state:{employee:secret},headers:{cookie:secret}});
function state(){const request=solutionRequest(fixedMessages.start),review=editRequiredStaffing(request,'legacy-v1:0',fixedChanges(request));review.inputs.role=secret;review.origins.trainingCostPerPerson.explanation=secret;return {...request.state,requiredStaffing:review};}
test('ordinary responses have no Preview receipt panel data',()=>{
 assert.equal(visibleProviderPreviewReceipt({answer:'Ordinary reply.'},context),null);
});
test('complete provider usage and validated calculator quantities survive without raw content',()=>{
 const reply=response(),before=JSON.stringify(reply),receipt=visibleProviderPreviewReceipt(reply,context,state());
 assert.equal(receipt.applicationOutcome,'validated');assert.equal(receipt.providerUsageComplete,true);assert.equal(receipt.modelAttempts,2);assert.equal(receipt.toolCalls,1);
 assert.deepEqual(receipt.rounds.map(r=>[r.inputTokens,r.cachedInputTokens,r.outputTokens,r.reasoningTokens,r.totalTokens]),[[100,0,20,5,120],[100,0,20,5,120]]);
 assert.deepEqual(receipt.calculator.options.map(o=>o.listedCash),[1600000,30000,495000]);
 assert.equal(receipt.calculator.inputs.hireTrainingHoursPerPerson,null);assert.equal(receipt.calculator.options[0].totalTrainingHours,null);assert.equal(receipt.calculator.options[2].newHireTrainingUnspecified,true);
 assert.equal(receipt.calculator.origins.trainingCostPerPerson,'user-supplied');assert.equal(receipt.calculator.inputs.role,undefined);
 assert.doesNotMatch(JSON.stringify(receipt),new RegExp(secret));assert.equal(JSON.stringify(reply),before);
});
test('failed second attempt preserves earlier reported usage without inventing missing counters',()=>{
 const reply=response();reply.providerReceipt.providerRounds=[round(1)];delete reply.usage;
 const receipt=visibleProviderPreviewReceipt(reply,{...context,status:422});
 assert.equal(receipt.applicationOutcome,'failed');assert.equal(receipt.modelAttempts,2);assert.equal(receipt.providerUsageComplete,false);assert.equal(receipt.rounds[0].inputTokens,100);assert.equal(receipt.modelRounds,null);assert.equal(receipt.calculator,null);
 const missing=response();delete missing.providerReceipt.providerRounds[1].inputTokens;
 const projected=visibleProviderPreviewReceipt(missing,context);assert.equal(projected.applicationOutcome,'unverified');assert.equal(projected.providerUsageComplete,false);assert.equal(projected.rounds[1].inputTokens,null);assert.equal(projected.rounds[1].cachedInputTokens,0);
});
test('malformed, inconsistent, unexpected or oversized receipts cannot appear complete',()=>{
 for(const mutate of [r=>r.providerReceipt.version=2,r=>r.providerReceipt.modelAttempts=3,r=>r.providerReceipt.providerRounds.push(round(3)),r=>r.providerReceipt.providerRounds[1].model=secret,r=>r.providerReceipt.providerRounds[1].serviceTier='priority',r=>r.providerReceipt.providerRounds[1].totalTokens=119,r=>r.providerReceipt.providerRounds[1].cachedInputTokens=101,r=>r.providerReceipt.providerRounds[1].outputTokens=-1]){
  const reply=response();mutate(reply);const receipt=visibleProviderPreviewReceipt(reply,context);assert.equal(receipt.providerUsageComplete,false);assert.ok(receipt.rounds.length<=2);assert.doesNotMatch(JSON.stringify(receipt),new RegExp(secret));
 }
 const receipt=visibleProviderPreviewReceipt({providerReceipt:null},{...context,requestId:secret,endpoint:secret,startedAt:secret});assert.equal(receipt.providerUsageComplete,false);assert.equal(receipt.requestId,null);assert.equal(receipt.endpoint,null);assert.equal(receipt.startedAt,null);
});
