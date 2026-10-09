/** Actual POST + pinned SDK, synthetic in-memory HTTP responses only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {createSolutionDiagnostics} from '../lib/home-solution-diagnostics.ts';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';

const secret='PRIVATE_REQUEST_RESPONSE_HEADER_ERROR_SENTINEL';
const network=()=>{throw Error('Live network forbidden');};
const headers={'content-type':'application/json','x-request-id':'req_offline_only','x-private':secret};
const firstOutput=[
 {id:'rs_offline',type:'reasoning',summary:[]},
 {id:'fc_offline',type:'function_call',status:'completed',call_id:'call_offline',name:'read_evidence',arguments:'{"sourceIds":["A1"]}'},
];
const response=output=>new Response(JSON.stringify({id:'resp_offline',object:'response',status:'completed',model:'gpt-6.1-sol',service_tier:'default',output}),{status:200,headers});

test('native SDK error identity fixes inherited Error.name; logs remain bounded',t=>{
 t.mock.timers.enable({apis:['Date'],now:100000});
 const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
 for(const [error,kind,code,causeCode] of [
  [new OpenAI.APIConnectionTimeoutError({message:secret}),'timeout','provider_timeout',null],
  [new OpenAI.APIConnectionError({message:secret,cause:Object.assign(Error(secret),{code:'ECONNRESET'})}),'connection','provider_connection','ECONNRESET'],
  [new OpenAI.APIUserAbortError({message:secret}),'aborted','provider_aborted',null],
 ]){
  assert.equal(error.name,'Error');
  const diagnostic=createSolutionDiagnostics();diagnostic.modelAttempt();
  t.mock.timers.tick(11984);diagnostic.stage('response_validation');diagnostic.modelAttempt();t.mock.timers.tick(30000);
  assert.equal(diagnostic.failure(error,null,false,false).code,code);
  const event=logs.at(-1)[1];assert.equal(event.version,2);assert.equal(event.elapsedMs,41984);assert.equal(event.providerElapsedMs,30000);
  assert.equal(event.modelAttempts,2);assert.equal(event.providerKind,kind);assert.equal(event.providerErrorClass,error.constructor.name);assert.equal(event.providerCauseCode,causeCode);
 }
 const renamed=new OpenAI.APIConnectionTimeoutError({message:secret});
 Object.defineProperty(renamed,'constructor',{value:{name:'a'}});
 const renamedDiagnostic=createSolutionDiagnostics();renamedDiagnostic.modelAttempt();
 assert.equal(renamedDiagnostic.failure(renamed,null,false,false).code,'provider_timeout');
 assert.equal(logs.at(-1)[1].providerErrorClass,'APIConnectionTimeoutError','SDK identity takes precedence over a minified constructor name');
 assert.doesNotMatch(JSON.stringify(logs),new RegExp(secret));
});

test('unknown properties/getters and caller cancellation cannot expand or replace diagnostics',t=>{
 const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
 for(const error of [new Proxy({},{get(){throw Error(secret);},getPrototypeOf(){throw Error(secret);}}),
  {constructor:{name:secret},name:secret,message:secret,code:secret,status:secret,cause:{code:secret}},null]){
  const diagnostic=createSolutionDiagnostics();diagnostic.modelAttempt();
  assert.equal(diagnostic.failure(error,null,false,false).code,'provider_failed');
  assert.equal(logs.at(-1)[1].providerErrorClass,null);assert.equal(logs.at(-1)[1].providerCauseCode,null);
 }
 const diagnostic=createSolutionDiagnostics();diagnostic.modelAttempt();
 assert.equal(diagnostic.failure(new OpenAI.APIUserAbortError({message:secret}),null,true,true).code,'conversation_cancelled');
 assert.doesNotMatch(JSON.stringify(logs),new RegExp(secret));
});

test('second SDK invocation preserves tool exchange and separates timeout, connection, parsing and HTTP failures',async t=>{
 t.mock.method(globalThis,'fetch',network);
 const isolated=await offlineBusinessRoute(),logs=[],summary=[];
 isolated.sandbox.console={error:(...args)=>logs.push(args)};
 const body=solutionRequest(secret),sources={attrition:{status:'loaded',data:{as_of:'2026-09-30',summary:{total_exits:4,voluntary_exits:3}}}};
 body.evidence=buildHomePack(sources,body.scope);isolated.sandbox.__aggregateSources=sources;
 for(const [scenario,expectedCode,expectedClass,expectedStatus] of [
  ['timeout','provider_timeout','APIConnectionTimeoutError',null],
  ['connection','provider_connection','APIConnectionError',null],
  ['invalid_json','provider_failed','SyntaxError',null],
  ['body_read','provider_failed','TypeError',null],
  ['http_400','provider_http_error','BadRequestError',400],
  ['success',null,null,null],
 ]){
  logs.length=0;isolated.sandbox.__requests.length=0;isolated.sandbox.__requestOptions.length=0;
  const payloads=[];let dispatches=0;
  const client=new OpenAI({apiKey:'synthetic-sdk-only',maxRetries:0,logLevel:'off',fetch:async(url,init)=>{
   dispatches++;assert.equal(String(url),'https://api.openai.com/v1/responses');assert.equal(init.method,'POST');
   assert.equal(new Headers(init.headers).get('x-stainless-retry-count'),'0');payloads.push(JSON.parse(init.body));
   if(dispatches===1)return response(firstOutput);
   assert.equal(dispatches,2,'No third invocation or SDK retry');
   if(scenario==='timeout')throw Object.assign(Error(secret),{name:'AbortError'});
   if(scenario==='connection')throw new TypeError(secret,{cause:Object.assign(Error(secret),{code:'ECONNRESET'})});
   if(scenario==='invalid_json')return new Response('{'+secret,{status:200,headers});
   if(scenario==='body_read')return new Response(new ReadableStream({start(controller){controller.error(new TypeError(secret));}}),{status:200,headers});
   if(scenario==='http_400')return new Response(JSON.stringify({error:{message:secret,type:secret,code:secret}}),{status:400,headers});
   return response([{type:'message',id:'msg_offline',role:'assistant',status:'completed',content:[{type:'output_text',annotations:[],text:JSON.stringify(final('Review current evidence before selecting a plan.'))}]}]);
  }});
  // Existing route seam forwards unchanged payload/options into the real SDK.
  let sdkError;
  isolated.sandbox.__replies.shift=()=>client.responses.create(isolated.sandbox.__requests.at(-1),isolated.sandbox.__requestOptions.at(-1)).catch(error=>{sdkError={name:error.name,constructor:error.constructor.name};throw error;});
  const result=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':'legacy-v1:0'},body:JSON.stringify(body)})),reply=await result.json();
  assert.equal(dispatches,2);assert.equal(isolated.sandbox.__requests.length,2);
  assert.deepEqual(payloads[1].input.slice(0,1),payloads[0].input);assert.deepEqual(payloads[1].input.slice(1,3),firstOutput);
  assert.equal(payloads[1].input.length,4);const toolOutput=payloads[1].input[3];assert.equal(toolOutput.type,'function_call_output');assert.equal(toolOutput.call_id,'call_offline');
  assert.equal(JSON.parse(toolOutput.output)[0].id,'A1');assert.equal(JSON.parse(toolOutput.output)[0].facts.total_exits,4);
  assert.ok(new TextEncoder().encode(JSON.stringify(payloads[1].input)).length<=120000);
  for(const payload of payloads){assert.equal(payload.model,'gpt-6.1-sol');assert.equal(payload.reasoning.effort,'medium');assert.equal(payload.service_tier,'default');assert.equal(payload.max_output_tokens,5000);assert.equal(payload.parallel_tool_calls,false);}
  assert.ok(isolated.sandbox.__requestOptions.every(value=>value.maxRetries===0&&value.timeout===30000));
  if(expectedCode){
   assert.equal(result.status,422);assert.equal(reply.code,expectedCode,JSON.stringify({logs,sdkError}));assert.equal(logs.length,1);
   const event=logs[0][1];assert.equal(event.stage,'provider');assert.equal(event.modelAttempts,2);assert.equal(event.providerErrorClass,expectedClass);assert.equal(event.providerHttpStatus,expectedStatus);
   assert.equal(event.grounding,null);assert.ok(event.providerElapsedMs>=0);assert.doesNotMatch(JSON.stringify([logs,reply]),new RegExp(secret));
   summary.push({scenario,stage:event.stage,modelAttempts:event.modelAttempts,providerKind:event.providerKind,errorClass:event.providerErrorClass,status:event.providerHttpStatus,syntheticDispatches:dispatches});
  }else{
   assert.equal(result.status,200);assert.equal(reply.usage.modelRounds,2);assert.equal(reply.usage.toolCalls,1);assert.equal(logs.length,0);
   summary.push({scenario,modelRounds:reply.usage.modelRounds,syntheticDispatches:dispatches});
  }
 }
 console.log('OFFLINE_PROVIDER_CLASSIFICATION '+JSON.stringify({realProviderCalls:0,liveDatabaseCalls:0,retries:0,summary}));
});
