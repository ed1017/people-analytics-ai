/** Synthetic data and provider seams only. No live database, BLS or model requests. */
import test from 'node:test';
import {Console} from 'node:console';
import {Writable} from 'node:stream';
import assert from 'node:assert/strict';
import {buildHomePack} from '../lib/home-pack.mjs';
import {verifySolutionEvidence,SolutionEvidenceError,AggregateEvidenceReadError,solutionGroundingLimits} from '../lib/home-solution-grounding.mjs';
import {createSolutionDiagnostics,groundingFailureDetails,groundingReadDetails} from '../lib/home-solution-diagnostics.ts';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';

const secret='PRIVATE_PROMPT_ANSWER_NAME_PAY_KEY_HEADER_SENTINEL',token='legacy-v1:0';
const source=data=>({status:'loaded',data}),signal=()=>new AbortController().signal,drain=()=>new Promise(resolve=>setImmediate(resolve));
test('successful requests record bounded stage and per-round usage counters without content or inferred usage',t=>{
 t.mock.timers.enable({apis:['Date'],now:1000});const logs=[];t.mock.method(console,'info',(...args)=>logs.push(args));t.mock.method(console,'error',(...args)=>logs.push(args));
 const diagnostic=createSolutionDiagnostics(),tick=ms=>t.mock.timers.tick(ms);
 tick(2);diagnostic.stage('configuration');tick(3);diagnostic.stage('grounding');tick(11);diagnostic.stage('conversation_preparation');tick(5);
 diagnostic.modelAttempt({inputBytes:123,instructionsBytes:456,toolSchemaBytes:789,body:secret});tick(20);
 const response={model:'gpt-6.1-sol',service_tier:'default',output:[{reasoning:secret,text:secret}],headers:{authorization:secret},usage:{input_tokens:100,cached:secret,input_tokens_details:{cached_tokens:40},output_tokens:20,output_tokens_details:{reasoning_tokens:5},total_tokens:120}};
 diagnostic.providerResult(response);diagnostic.providerResult(response);diagnostic.stage('response_validation');tick(7);
 diagnostic.modelAttempt({inputBytes:1e20,instructionsBytes:-1,toolSchemaBytes:secret});tick(30);
 diagnostic.providerResult({model:secret,service_tier:secret,usage:new Proxy({},{get(){throw Error(secret);}})});diagnostic.stage('response_validation');tick(2);
 diagnostic.success({modelRounds:2,toolCalls:1,answer:secret});diagnostic.success({modelRounds:999,toolCalls:999});diagnostic.failure(Error(secret),null,false,false);
 assert.equal(logs.length,1);assert.equal(logs[0][0],'Home solution conversation completed');const event=JSON.parse(logs[0][1]);
 assert.equal(event.elapsedMs,80);assert.deepEqual(event.stageElapsedMs,{request_validation:2,configuration:3,grounding:11,model_setup:0,conversation_preparation:5,provider:50,response_validation:9});
 assert.equal(event.modelAttempts,2);assert.equal(event.modelRounds,2);assert.equal(event.toolCalls,1);assert.equal(event.providerRounds.length,2);
 assert.deepEqual(event.providerRounds[0],{attempt:1,elapsedMs:20,inputBytes:123,instructionsBytes:456,toolSchemaBytes:789,model:'gpt-6.1-sol',serviceTier:'default',inputTokens:100,cachedInputTokens:40,outputTokens:20,reasoningTokens:5,totalTokens:120});
 const absent=event.providerRounds[1];assert.equal(absent.elapsedMs,30);assert.equal(absent.inputBytes,null);assert.equal(absent.instructionsBytes,null);assert.equal(absent.model,null);assert.equal(absent.serviceTier,null);
 for(const key of ['inputTokens','cachedInputTokens','outputTokens','reasoningTokens','totalTokens'])assert.equal(absent[key],null,'Missing usage is not free usage');
 assert.doesNotMatch(JSON.stringify(logs),new RegExp(secret));
 const frozen=JSON.stringify(event);diagnostic.providerResult(response);assert.equal(JSON.stringify(event),frozen);
});

test('successful logging failure and hostile optional usage cannot change a completed operation',t=>{
 t.mock.method(console,'info',()=>{throw Error(secret);});const diagnostic=createSolutionDiagnostics();
 diagnostic.modelAttempt(new Proxy({},{get(){throw Error(secret);}}));
 assert.doesNotThrow(()=>diagnostic.providerResult(new Proxy({},{get(){throw Error(secret);}})));
 assert.doesNotThrow(()=>diagnostic.success({modelRounds:1,toolCalls:0}));
});

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
 assert.deepEqual(diagnostic,{trigger:'deadline',reader:null,elapsedMs:solutionGroundingLimits.timeoutMs,readerElapsedMs:null,readersStarted:2,readersCompleted:1,readFailure:null,httpStatus:null,upstreamCode:null,sourceCorrelationId:null,activeReaders:[{reader:'bls',elapsedMs:solutionGroundingLimits.timeoutMs}]});
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
 assert.equal(JSON.parse(logs[0][1]).modelAttempts,1);assert.equal(JSON.parse(logs[0][1]).providerHttpStatus,429);assert.doesNotMatch(JSON.stringify(logs),new RegExp(secret));
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
  assert.equal(logs.length,1);const event=JSON.parse(logs[0][1]);assert.equal(event.correlationId,payload.correlationId);assert.equal(event.stage,stage);assert.equal(event.modelAttempts,attempts);assert.equal(isolated.sandbox.__requests.length,attempts);
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

test('grounding observations snapshot reader counts, queue offsets and durations without changing evidence',async t=>{
 t.mock.timers.enable({apis:['Date'],now:1000});const {body,results}=fixture(),observations=[],pending=[];
 const task=verifySolutionEvidence(body,{datasetToken:token,onDiagnostic:value=>observations.push(value),read:async key=>{const wait=Promise.withResolvers();pending.push({key,...wait});return wait.promise;}},signal());
 assert.equal(pending.length,2);t.mock.timers.tick(40);pending[0].resolve(results[pending[0].key]);await drain();
 t.mock.timers.tick(60);pending[1].resolve(results[pending[1].key]);const evidence=await task;
 assert.equal(observations.length,1);assert.deepEqual(observations[0],{elapsedMs:100,readersStarted:2,readersCompleted:2,maxConcurrentReaders:2,readers:[{reader:pending[0].key,startedAfterMs:0,elapsedMs:40,completed:true},{reader:pending[1].key,startedAfterMs:0,elapsedMs:100,completed:true}]});
 assert.equal(evidence.groundingReads,undefined);assert.doesNotMatch(JSON.stringify(observations),new RegExp(secret));
 const logs=[];t.mock.method(console,'info',(...args)=>logs.push(args));const diagnostic=createSolutionDiagnostics();diagnostic.groundingResult({...observations[0],payload:secret});diagnostic.success({modelRounds:1,toolCalls:1});
 assert.deepEqual(JSON.parse(logs[0][1]).groundingReads,observations[0]);assert.doesNotMatch(JSON.stringify(logs),new RegExp(secret));
 await assert.doesNotReject(verifySolutionEvidence(body,{datasetToken:token,read:async key=>results[key],onDiagnostic:()=>{throw Error(secret);}},signal()));
});
test('failed grounding observations are frozen before late readers settle and sanitize every field',async t=>{
 t.mock.timers.enable({apis:['Date'],now:1000});const {body,results}=fixture(),controller=new AbortController(),observations=[],pending=[];
 const task=verifySolutionEvidence(body,{datasetToken:token,onDiagnostic:value=>observations.push(value),read:async key=>{const wait=Promise.withResolvers();pending.push({key,...wait});return wait.promise;}},controller.signal),rejected=assert.rejects(task,SolutionEvidenceError);
 t.mock.timers.tick(50);controller.abort();await rejected;
 const frozen=JSON.stringify(observations);assert.equal(observations.length,1);assert.equal(observations[0].readersCompleted,0);assert.ok(observations[0].readers.every(r=>r.elapsedMs===50&&!r.completed));
 pending.forEach(p=>p.resolve(results[p.key]));await drain();assert.equal(JSON.stringify(observations),frozen);
 const projected=groundingReadDetails({elapsedMs:1e20,readersStarted:1000,readersCompleted:-1,maxConcurrentReaders:1000,readers:[{reader:secret,elapsedMs:100},{reader:'dashboard',elapsedMs:-5,startedAfterMs:1e20,completed:secret,payload:secret}],body:secret});
 assert.deepEqual(projected,{elapsedMs:600000,readersStarted:14,readersCompleted:0,maxConcurrentReaders:2,readers:[{reader:'dashboard',startedAfterMs:600000,elapsedMs:0,completed:false}]});assert.doesNotMatch(JSON.stringify(projected),new RegExp(secret));
 const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));const diagnostic=createSolutionDiagnostics();diagnostic.groundingResult(observations[0]);diagnostic.failure(Error(secret),null,false,false);assert.deepEqual(JSON.parse(logs[0][1]).groundingReads,observations[0]);
});

test('actual console output preserves nested reader timings as JSON at both sanitized boundaries',t=>{
 const output={info:'',error:''},sink=kind=>new Writable({write(chunk,_encoding,done){output[kind]+=chunk.toString();done();}});
 const emitted=new Console({stdout:sink('info'),stderr:sink('error')});
 t.mock.method(console,'info',emitted.info.bind(emitted));t.mock.method(console,'error',emitted.error.bind(emitted));
 for(const kind of ['info','error']){
  const diagnostic=createSolutionDiagnostics();
  diagnostic.groundingResult({elapsedMs:125,readersStarted:2,readersCompleted:kind==='info'?2:1,maxConcurrentReaders:2,
   readers:[{reader:'dashboard',startedAfterMs:0,elapsedMs:80,completed:true,headers:{authorization:secret}},{reader:'bls',startedAfterMs:0,elapsedMs:125,completed:kind==='info',body:secret},{reader:secret,elapsedMs:1}],request:secret,url:secret});
  if(kind==='info')diagnostic.success({modelRounds:1,toolCalls:1,answer:secret});
  else diagnostic.failure(Object.assign(Error(secret),{headers:{authorization:secret},body:secret}),null,false,false);
  const prefix=kind==='info'?'Home solution conversation completed ':'Home solution conversation failed ';
  assert.ok(output[kind].startsWith(prefix));assert.equal(output[kind].trim().split('\n').length,1);
  assert.doesNotMatch(output[kind],/\[Object\]/);assert.doesNotMatch(output[kind],new RegExp(secret));
  const event=JSON.parse(output[kind].slice(prefix.length));
  assert.deepEqual(event.groundingReads,{elapsedMs:125,readersStarted:2,readersCompleted:kind==='info'?2:1,maxConcurrentReaders:2,
   readers:[{reader:'dashboard',startedAfterMs:0,elapsedMs:80,completed:true},{reader:'bls',startedAfterMs:0,elapsedMs:125,completed:kind==='info'}]});
  for(const reader of event.groundingReads.readers)assert.deepEqual(Object.keys(reader).sort(),['completed','elapsedMs','reader','startedAfterMs']);
  for(const field of ['request','url','headers','body','answer'])assert.equal(Object.hasOwn(event.groundingReads,field),false);
 }
});
