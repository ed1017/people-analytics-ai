/** Synthetic data and provider seams only. No live database, BLS or model requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack} from '../lib/home-pack.mjs';
import {verifySolutionEvidence,SolutionEvidenceError,AggregateEvidenceReadError,solutionGroundingLimits} from '../lib/home-solution-grounding.mjs';
import {createSolutionDiagnostics,groundingFailureDetails} from '../lib/home-solution-diagnostics.ts';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';

const secret='PRIVATE_PROMPT_ANSWER_NAME_PAY_KEY_HEADER_SENTINEL',token='legacy-v1:0';
const source=data=>({status:'loaded',data}),signal=()=>new AbortController().signal,drain=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const results={attrition:source({as_of:'2026-09-30',summary:{total_exits:4,voluntary_exits:3}}),bls:source({latest_date:'2026-09-01',metrics:[{series_id:'LNS14000000',raw_value:4,observation_date:'2026-09-01'}]})};
 const body=solutionRequest(secret);body.evidence=buildHomePack(results,body.scope);return {body,results};
}
async function failure(task){try{await task;assert.fail('Expected evidence failure');}catch(error){assert.ok(error instanceof SolutionEvidenceError);return error.diagnostic;}}

test('deadline records active readers and bounded timing; cancellation is distinct and first trigger wins',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1791565569407});
 const {body,results}=fixture(),pending=Promise.withResolvers();let blsSignal;
 const task=verifySolutionEvidence(body,{datasetToken:token,read:async(key,_filters,s)=>{
  if(key==='bls'){blsSignal=s;return pending.promise;}return results[key];
 }},signal()),checked=failure(task);
 await drain();t.mock.timers.tick(solutionGroundingLimits.timeoutMs);
 const diagnostic=await checked;
 assert.deepEqual(diagnostic,{trigger:'deadline',reader:null,elapsedMs:solutionGroundingLimits.timeoutMs,readerElapsedMs:null,readersStarted:2,readersCompleted:1,readFailure:null,httpStatus:null,activeReaders:[{reader:'bls',elapsedMs:solutionGroundingLimits.timeoutMs}]});
 assert.equal(blsSignal.aborted,true);pending.reject(Error(secret));await drain();assert.equal(diagnostic.trigger,'deadline');
 const controller=new AbortController(),cancelled=verifySolutionEvidence(body,{datasetToken:token,read:async()=>new Promise(()=>{})},controller.signal),cancelledCheck=failure(cancelled);
 t.mock.timers.tick(123);controller.abort(secret);const cancellation=await cancelledCheck;
 assert.equal(cancellation.trigger,'cancelled');assert.equal(cancellation.elapsedMs,123);assert.equal(cancellation.activeReaders.length,2);
});

test('reader error, unavailable result, token mismatch and changed facts keep distinct safe diagnostics',async()=>{
 for(const readFailure of ['http_error','mixed_dataset','invalid_json']){
  const {body,results}=fixture();const diagnostic=await failure(verifySolutionEvidence(body,{datasetToken:token,read:async key=>{
   if(key==='attrition')throw new AggregateEvidenceReadError(readFailure,readFailure==='http_error'?503:null);return results[key];
  }},signal()));
  assert.equal(diagnostic.trigger,'reader_failed');assert.equal(diagnostic.reader,'attrition');assert.equal(diagnostic.readFailure,readFailure);assert.equal(diagnostic.httpStatus,readFailure==='http_error'?503:null);
 }
 const {body,results}=fixture();
 const unavailable=await failure(verifySolutionEvidence(body,{datasetToken:token,read:async()=>({status:'unavailable',data:null})},signal()));
 assert.equal(unavailable.readFailure,'unavailable_result');
 let reads=0;const mixed=await failure(verifySolutionEvidence(body,{datasetToken:'legacy-v1:1',read:async()=>{reads++;throw Error(secret);}},signal()));
 assert.equal(mixed.trigger,'dataset_mismatch');assert.equal(reads,0);
 body.evidence.sources.find(s=>s.id==='A1').facts.total_exits=999;
 const changed=await failure(verifySolutionEvidence(body,{datasetToken:token,read:async key=>results[key]},signal()));
 assert.equal(changed.trigger,'facts_changed');assert.equal(changed.reader,'attrition');assert.equal(changed.readersCompleted,2);assert.ok(changed.readerElapsedMs>=0);
});

test('diagnostic projection ignores raw fields and bounds all dimensions; failed logging cannot change response metadata',t=>{
 const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
 const diagnostic=createSolutionDiagnostics();diagnostic.stage('provider');diagnostic.modelAttempt();
 const error=Object.assign(Error(secret),{name:'RateLimitError',status:429,headers:{authorization:secret},body:secret,code:secret});
 const result=diagnostic.failure(error,null,false,false);diagnostic.failure(error,null,false,false);
 assert.equal(logs.length,1);assert.equal(result.code,'provider_http_error');assert.match(result.correlationId,/^[0-9a-f-]{36}$/);
 assert.equal(logs[0][1].modelAttempts,1);assert.equal(logs[0][1].providerHttpStatus,429);assert.doesNotMatch(JSON.stringify(logs),new RegExp(secret));
 const projected=groundingFailureDetails({trigger:secret,reader:secret,elapsedMs:1e20,readerElapsedMs:-50,readersStarted:999,readersCompleted:999,readFailure:secret,httpStatus:999,activeReaders:Array(30).fill({reader:'bls',elapsedMs:1e20,body:secret}),raw:secret});
 assert.equal(projected.trigger,'verification_failed');assert.equal(projected.reader,null);assert.equal(projected.elapsedMs,600000);assert.equal(projected.readerElapsedMs,0);assert.equal(projected.readersStarted,14);assert.equal(projected.activeReaders.length,2);assert.equal(projected.httpStatus,null);assert.doesNotMatch(JSON.stringify(projected),new RegExp(secret));
 t.mock.method(console,'error',()=>{throw Error(secret);});assert.equal(createSolutionDiagnostics().failure(error,null,false,false).code,'invalid_request');
});

test('actual POST separates pre-provider, provider and output failures without logging request or model content',async()=>{
 const isolated=await offlineBusinessRoute(),logs=[];
 isolated.sandbox.console={error:(...args)=>logs.push(args)};
 const {body,results}=fixture();isolated.sandbox.__aggregateSources=results;
 const post=(value,header=token)=>isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':header,'x-correlation-id':secret,authorization:secret},body:JSON.stringify(value)}));
 const check=async(value,code,stage,attempts,status=422)=>{
  logs.length=0;isolated.sandbox.__requests.length=0;
  const response=await post(value),payload=await response.json();assert.equal(response.status,status);assert.equal(payload.code,code);
  assert.equal(response.headers.get('x-correlation-id'),payload.correlationId);assert.notEqual(payload.correlationId,secret);
  assert.equal(logs.length,1);const event=logs[0][1];assert.equal(event.correlationId,payload.correlationId);assert.equal(event.stage,stage);assert.equal(event.modelAttempts,attempts);assert.equal(isolated.sandbox.__requests.length,attempts);
  assert.doesNotMatch(JSON.stringify([logs,payload]),new RegExp(secret));return event;
 };
 await check({message:secret},'invalid_request','request_validation',0);
 delete isolated.sandbox.process.env.OPENAI_API_KEY;
 await check(body,'configuration_unavailable','configuration',0);
 isolated.sandbox.process.env.OPENAI_API_KEY=secret;
 const forged=structuredClone(body);forged.evidence.sources.find(s=>s.id==='A1').facts.total_exits=999;
 const grounding=await check(forged,'evidence_facts_changed','grounding',0,503);assert.equal(grounding.grounding.reader,'attrition');
 const originalShift=isolated.sandbox.__replies.shift;
 isolated.sandbox.__replies.shift=()=>{throw Object.assign(Error(secret),{name:'APIConnectionTimeoutError',headers:{authorization:secret},body:secret});};
 await check(body,'provider_timeout','provider',1);
 isolated.sandbox.__replies.shift=()=>{throw Object.assign(Error(secret),{status:429,headers:{authorization:secret},body:secret});};
 const provider=await check(body,'provider_http_error','provider',1);assert.equal(provider.providerHttpStatus,429);
 isolated.sandbox.__replies.shift=originalShift;
 isolated.sandbox.__replies.push({status:'incomplete',output:[],output_text:secret});
 await check(body,'response_validation_failed','response_validation',1);
 isolated.sandbox.__replies.push({status:'completed',output:[],output_text:secret});
 await check(body,'response_validation_failed','response_validation',1);
 let turn=0;isolated.sandbox.__replies.shift=()=>{if(turn++===0)return responseForStep({name:'read_evidence',args:{sourceIds:['A1']}});throw Error(secret);};
 await check(body,'provider_failed','provider',2);
 assert.ok(isolated.sandbox.__requestOptions.every(options=>options.maxRetries===0&&options.timeout===60000));
 isolated.sandbox.__replies.shift=originalShift;logs.length=0;isolated.sandbox.__requests.length=0;
 assert.equal((await post(body,'legacy-v1:1')).status,409);assert.equal(isolated.sandbox.__requests.length,0);assert.equal(logs.length,0);
 isolated.sandbox.__replies.push(responseForStep(final('Review the company-wide evidence before proposing changes.')));
 assert.equal((await post(body)).status,200);assert.equal(logs.length,0);
});
