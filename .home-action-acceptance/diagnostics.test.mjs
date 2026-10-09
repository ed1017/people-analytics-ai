import {offlinePrivateReview} from './offline-private.mjs';
/** Real pinned SDK + actual app route, with in-memory dispatch only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import OpenAI from 'openai';
import {compileRoute} from './route.mjs';
import {createBuildClient} from './build.mjs';
import {runDiagnostic,limits} from './run.mjs';
import {aggregateDispatch,syntheticAggregateSha256} from './offline-aggregate.mjs';
import {safeFailure,recordReceipt,ReceiptWriteError,observeResponse} from './diagnostics.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
assert.equal(JSON.parse(readFileSync(join(root,'node_modules/openai/package.json'))).version,'7.23.0');
let networkCalls=0;
globalThis.fetch=()=>{networkCalls++;throw Error('offline_network_forbidden');};
const code=await compileRoute(root);
const secret='SENTINEL_PRIVATE_EXCEPTION_TEXT',results=[];
const headers={'content-type':'application/json','x-request-id':'req_synthetic_failure','x-private-secret':secret};
async function fault(scenario,override={}){
 let boundary,wire=0;const events=[];
 const client=createBuildClient({OpenAI,apiKey:'synthetic-sdk-key',getBoundary:()=>boundary,dispatch:async()=>{
  wire++;
  if(scenario==='connection_failure'||scenario==='stop_receipt_failure')throw new TypeError(secret,{cause:Object.assign(new Error(secret),{code:'ECONNRESET'})});
  if(scenario==='transport_timeout')throw Object.assign(new Error(secret),{name:'AbortError'});
  if(scenario==='response_body_failure')return new Response(new ReadableStream({start(controller){controller.error(new TypeError(secret));}}),{status:200,headers});
  if(scenario==='invalid_json_response')return new Response('{'+secret,{status:200,headers});
  if(scenario==='null_json_response')return new Response('null',{status:200,headers});
  if(scenario.startsWith('http_'))return new Response(JSON.stringify({error:{message:secret,type:secret,code:secret}}),{status:Number(scenario.slice(5)),headers});
  return new Response(JSON.stringify({id:'resp_synthetic_failure',object:'response',status:'completed',model:'gpt-6.1-sol',service_tier:'default',
   output:[{type:'message',id:'msg_synthetic',role:'assistant',content:[{type:'output_text',text:'{invalid final',annotations:[]}]}],
   usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}},...override}),{status:200,headers});
 }});
 const privateCapture=offlinePrivateReview();
 const report=await runDiagnostic({code,client,privateReview:privateCapture.sink,phase:'model-assessment',aggregateDispatch,approvedAggregateSha256:syntheticAggregateSha256,runId:'offline-safe-diagnostic',expiresAt:Date.now()+60000,requireWireProof:true,bindBoundary:value=>{boundary=value;},record:(stage,value)=>{
  if((scenario==='generation_receipt_failure'&&stage==='generation-1')||
     (scenario==='usage_receipt_failure'&&stage==='usage-1')||
     (scenario==='stop_receipt_failure'&&stage==='attempt-stop-1')||
     (scenario==='result_receipt_failure'&&stage==='result'))throw Object.assign(new Error(secret),{code:'EIO'});
  events.push({stage,...structuredClone(value)});
 }});
 assert.equal(wire,1);assert.equal(report.generationAttempts,1);assert.equal(report.wireAttempts,1);
 assert.equal(report.countAttempts,0);assert.equal(report.sdkRetries,0);assert.equal(report.databaseAttempts,0);
 assert.deepEqual(report.completedTurns,[]);assert.equal(report.executionComplete,false);
 assert.equal(report.reservationRetainedMicrousd,limits.reservationMicrousd);
 assert.equal(events.find(e=>e.stage==='route-reply-1').httpStatus,422);
 assert.ok(!JSON.stringify({report,events}).includes(secret));
 results.push({scenario,syntheticOnly:true,dispatchStubCalls:wire,realNetworkRequests:0,
  lastAttemptFailure:report.lastAttemptFailure,receiptFailures:report.receiptFailures,
  usage:report.validatedUsage,attemptAmbiguous:report.attemptAmbiguous,
  usageReceiptCount:events.filter(e=>e.stage==='usage-1').length,
  generationReceiptCount:events.filter(e=>e.stage==='generation-1').length});
 return {report,events,failure:report.lastAttemptFailure};
}
for(const [scenario,errorClass,stage,status,timeout,causeCode] of [
 ['connection_failure','APIConnectionError','dispatch',null,false,'ECONNRESET'],
 ['transport_timeout','APIConnectionTimeoutError','dispatch',null,true,null],
 ['response_body_failure','TypeError','response_read',200,false,null],
 ['invalid_json_response','SyntaxError','json_validation',200,false,null],
 ['null_json_response','TypeError','json_validation',200,false,null],
 ['http_400','BadRequestError','response_read',400,false,null],
 ['http_429','RateLimitError','response_read',429,false,null],
 ['http_503','InternalServerError','response_read',503,false,null],
])test(scenario+' preserves safe diagnostic stage/class without retry or exception text',async()=>{
 const {report,failure}=await fault(scenario),d=failure.diagnostic;
 assert.equal(d.errorClass,errorClass);assert.equal(d.stage,stage);assert.equal(d.timeout,timeout);assert.equal(d.causeCode,causeCode);
 assert.equal(failure.httpStatus,status);assert.equal(failure.requestId,status?'req_synthetic_failure':null);
 assert.equal(d.source,status>=400?'provider_http':stage==='dispatch'?'transport_or_sdk':'response_processing');
 assert.ok(Number.isInteger(d.elapsedMs)&&d.elapsedMs>=0);assert.equal(report.attemptAmbiguous,true);
 assert.equal(report.inputTokens,0);assert.equal(report.outputTokens,0);assert.equal(report.validatedUsage.length,0);
});
test('generation receipt I/O failure retains validated usage independently',async()=>{
 const {report,events,failure}=await fault('generation_receipt_failure');
 assert.equal(failure.code,'receipt_write_failed');assert.equal(failure.httpStatus,200);assert.equal(failure.requestId,'req_synthetic_failure');
 assert.deepEqual({...failure.diagnostic,elapsedMs:null},{errorClass:'ReceiptWriteError',underlyingClass:'Error',causeCode:'EIO',source:'local_receipt',stage:'receipt_write',timeout:false,elapsedMs:null,receiptStage:'generation-1'});
 assert.equal(report.attemptAmbiguous,false);assert.equal(report.inputTokens,100);assert.equal(report.outputTokens,20);
 assert.equal(report.knownUsageUpperEstimateMicrousd,880);assert.equal(report.validatedUsage.length,1);
 assert.equal(report.validatedUsage[0].usageReceiptRecorded,true);assert.equal(report.validatedUsage[0].usageKnown,true);assert.equal(report.validatedUsage[0].priceIdentityVerified,true);assert.equal(report.validatedUsage[0].pricedUpperEstimateMicrousd,880);
 assert.equal(events.filter(e=>e.stage==='usage-1').length,1);assert.equal(events.filter(e=>e.stage==='generation-1').length,0);
 // Known usage is evidence, never automatic budget release or permission for another attempt.
 assert.equal(report.budgetClosure,'pending-external-review');assert.equal(report.reservationRetainedMicrousd,11715000);
});
test('usage receipt failure keeps usage in final report but leaves durable usage evidence ambiguous',async()=>{
 const {report,events,failure}=await fault('usage_receipt_failure');
 assert.equal(failure.diagnostic.receiptStage,'usage-1');assert.equal(failure.diagnostic.source,'local_receipt');
 assert.equal(report.inputTokens,100);assert.equal(report.outputTokens,20);assert.equal(report.attemptAmbiguous,true);
 assert.equal(report.validatedUsage[0].usageReceiptRecorded,false);assert.equal(events.filter(e=>e.stage==='usage-1').length,0);
 assert.equal(events.filter(e=>e.stage==='generation-1').length,0);
});
test('attempt-stop receipt failure cannot mask the original transport failure',async()=>{
 const {report,failure}=await fault('stop_receipt_failure');
 assert.equal(failure.diagnostic.errorClass,'APIConnectionError');assert.equal(failure.diagnostic.stage,'dispatch');
 assert.equal(report.receiptFailures.length,1);assert.equal(report.receiptFailures[0].diagnostic.receiptStage,'attempt-stop-1');
 assert.equal(report.receiptFailures[0].diagnostic.errorClass,'ReceiptWriteError');
});
test('final receipt write failure is classified locally without leaking its cause text',async()=>{
 await assert.rejects(fault('result_receipt_failure'),error=>{
  assert.ok(error instanceof ReceiptWriteError);const result=safeFailure(error);
  assert.equal(result.diagnostic.receiptStage,'result');assert.equal(result.diagnostic.source,'local_receipt');
  assert.equal(result.diagnostic.causeCode,'EIO');assert.ok(!JSON.stringify(result).includes(secret));return true;
 });
});
test('diagnostic output is allowlisted for arbitrary provider messages, classes, codes and getters',()=>{
 for(const error of [Object.assign(new Error(secret),{code:secret,status:secret,requestID:'req_sk-privatecredential'}),
  {constructor:{name:secret},name:secret,message:secret,code:secret,status:2000,request_id:secret},
  new Proxy({},{get(){throw Error(secret);}})]){
  const result=safeFailure(error);assert.equal(result.code,'provider_or_runtime_failure');
  assert.equal(result.httpStatus,null);assert.equal(result.requestId,null);assert.equal(result.diagnostic.causeCode,null);
  assert.ok(!JSON.stringify(result).includes(secret));assert.ok(!JSON.stringify(result).includes('privatecredential'));
 }
 assert.equal(safeFailure(new DOMException(secret,'TimeoutError')).diagnostic.timeout,true);
 assert.equal(safeFailure(Object.assign(new Error(secret),{name:'AbortError'})).diagnostic.errorClass,'AbortError');
 assert.equal(safeFailure(new Error('reply_contract')).code,'reply_contract');
 assert.equal(safeFailure(new Error('arbitrary_lowercase_private_text')).code,'provider_or_runtime_failure');
 let calls=0;assert.throws(()=>recordReceipt(()=>{calls++;throw new Error(secret);},'generation-1',{}),ReceiptWriteError);assert.equal(calls,1);
});
test('the response observer preserves bytes and native response behavior while dropping unsafe metadata',async()=>{
 const context={stage:'dispatch'},body='{"original":"exact bytes"}';
 const response=observeResponse(new Response(body,{status:200,headers:{'x-request-id':'req_sk-privatecredential'}}),context);
 assert.equal(response.status,200);assert.equal(response.ok,true);assert.equal(response.bodyUsed,false);
 assert.equal(context.stage,'response_read');assert.equal(context.requestId,null);
 assert.equal(await response.text(),body);assert.equal(response.bodyUsed,true);assert.equal(context.stage,'json_validation');
});
for(const override of [{model:undefined},{model:null},{model:'different-model'},{service_tier:undefined},{service_tier:null},{service_tier:'priority'}])test('known usage retains liability when price identity cannot be verified: '+JSON.stringify(override),async()=>{
 const {report,events,failure}=await fault('price_identity_mismatch',override);
 assert.equal(failure.code,'model_tier_or_completion_mismatch');assert.equal(report.attemptAmbiguous,true);
 assert.equal(report.inputTokens,100);assert.equal(report.outputTokens,20);assert.equal(report.knownUsageUpperEstimateMicrousd,null);
 assert.deepEqual(report.unpricedUsageAttempts,[1]);assert.equal(report.reservationRetainedMicrousd,limits.reservationMicrousd);assert.equal(report.budgetClosure,'pending-external-review');
 const usage=report.validatedUsage[0],receipt=events.find(event=>event.stage==='usage-1');
 for(const value of [usage,receipt]){assert.equal(value.usageKnown,true);assert.equal(value.priceIdentityVerified,false);assert.equal(value.pricedUpperEstimateMicrousd,null);assert.equal(value.usageReceiptRecorded,true);}
 assert.equal(events.find(event=>event.stage==='attempt-stop-1').attemptAmbiguous,true);
});
test('all fault cases used only synthetic dispatch and retained safe bounded evidence',()=>{
 assert.equal(networkCalls,0);assert.equal(results.length,17);
 console.log('OFFLINE_DIAGNOSTIC_RESULTS '+JSON.stringify({sdkVersion:'7.23.0',providerCalls:0,networkCalls,results}));
});
