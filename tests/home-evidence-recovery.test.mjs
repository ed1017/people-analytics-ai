/** Offline contracts only. No credential reads, database connections or model requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {dataApiErrorResponse} from '../lib/data-api-error.ts';
import {AggregateEvidenceReadError} from '../lib/home-solution-grounding.mjs';
import {groundingFailureDetails} from '../lib/home-solution-diagnostics.ts';
import {homeConversationErrorMessage} from '../lib/home-evidence-recovery.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';

const privateDetail='PRIVATE_JWT_CLAIMS_PAY_NAME_URL';
test('known server authentication failures carry only safe receipts and never request browser login',async t=>{
 t.mock.method(console,'error',()=>{});
 for(const code of ['PGRST300','PGRST301','PGRST302','PGRST303']){
  const response=dataApiErrorResponse('workforce',{code,message:privateDetail,details:privateDetail,hint:privateDetail});
  const failure=AggregateEvidenceReadError.fromResponse(response),body=await response.json();
  assert.equal(response.status,503);assert.equal(response.headers.get('www-authenticate'),null);
  assert.equal(failure.diagnostic.readFailure,'source_authentication');assert.equal(failure.diagnostic.upstreamCode,code);
  assert.equal(failure.diagnostic.sourceCorrelationId,body.correlationId);
  assert.doesNotMatch(JSON.stringify({body,diagnostic:failure.diagnostic}),new RegExp(privateDetail));
 }
 for(const headers of [
  {'x-data-error-code':'source_auth_unavailable','x-data-upstream-code':privateDetail,'x-correlation-id':privateDetail},
  {'x-data-upstream-code':'PGRST303'},
  {'x-data-error-code':'source_auth_unavailable','x-data-upstream-code':'PGRST205'},
 ]){
  const response=new Response(privateDetail,{status:503,headers});
  const failure=AggregateEvidenceReadError.fromResponse(response);
  assert.equal(failure.diagnostic.readFailure,'http_error');assert.equal(failure.diagnostic.upstreamCode,null);
  assert.equal(failure.diagnostic.sourceCorrelationId,null);assert.equal(response.bodyUsed,false);
 }
 const raw=groundingFailureDetails({upstreamCode:privateDetail,sourceCorrelationId:privateDetail,message:privateDetail});
 assert.equal(raw.upstreamCode,null);assert.equal(raw.sourceCorrelationId,null);assert.doesNotMatch(JSON.stringify(raw),new RegExp(privateDetail));
});

test('actual POST distinguishes auth/read/facts failures, preserves evidence and permits only an explicit verified retry',async()=>{
 const isolated=await offlineBusinessRoute(),logs=[];isolated.sandbox.console={error:(...args)=>logs.push(args),info:()=>{}};
 const data={as_of:'2026-09-30',summary:{headcount:100,fte:100}},results={workforce:{status:'loaded',data}},body=solutionRequest('recommend me a plan');
 body.evidence=buildHomePack(results,body.scope);const before=JSON.stringify(body);
 isolated.sandbox.__aggregateSources=results;
 const post=()=>isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':'legacy-v1:0'},body:JSON.stringify(body)}));
 for(const kind of ['auth','http','facts']){
  logs.length=0;
  isolated.sandbox.__aggregateFailure=kind==='auth'?{reader:'workforce',status:503,code:'PGRST303'}:kind==='http'?{reader:'workforce',status:500}:undefined;
  isolated.sandbox.__aggregateSources=kind==='facts'?{workforce:{status:'loaded',data:{...data,summary:{headcount:101,fte:101}}}}:results;
  const response=await post(),payload=await response.json(),event=JSON.parse(logs.at(-1)[1]),message=homeConversationErrorMessage(payload);
  assert.equal(response.status,503);assert.equal(payload.code,kind==='auth'?'evidence_source_auth_unavailable':kind==='http'?'evidence_reader_failed':'evidence_facts_changed');
  assert.equal(event.stage,'grounding');assert.equal(event.modelAttempts,0);assert.equal(isolated.sandbox.__requests.length,0);
  assert.equal(JSON.stringify(body),before);assert.equal(payload.state,undefined);assert.equal(payload.answer,undefined);
  assert.match(message,/Your latest request was not answered/);assert.match(message,/draft and earlier work are kept/);assert.ok(message.includes(payload.correlationId));
  if(kind==='auth'){
   assert.equal(event.grounding.upstreamCode,'PGRST303');assert.equal(event.grounding.sourceCorrelationId,logs[0][1].correlationId);
   assert.match(message,/server could not authenticate/);assert.doesNotMatch(message,/Refresh Home|login|expired|JWT|PRIVATE|PGRST303/);
   assert.deepEqual(Object.keys(payload).sort(),['code','correlationId','error']);
  }else if(kind==='http'){assert.match(message,/could not be read/);assert.doesNotMatch(message,/has changed|Refresh Home|authenticate/);}
  else{assert.match(message,/has changed/);assert.match(message,/Refresh Home/);}
  assert.doesNotMatch(JSON.stringify({payload,logs}),/PRIVATE_SYNTHETIC_AUTH_DETAIL/);
 }
 isolated.sandbox.__aggregateSources=results;delete isolated.sandbox.__aggregateFailure;
 assert.equal(isolated.sandbox.__requests.length,0,'Restoring source availability alone cannot trigger a retry');
 isolated.sandbox.__replies.push(responseForStep(final('The evidence is available again; your earlier work is preserved.')));
 const recovered=await post();assert.equal(recovered.status,200);assert.equal(isolated.sandbox.__requests.length,1);assert.equal(JSON.stringify(body),before);
 assert.equal(isolated.sandbox.__requestOptions[0].maxRetries,0);
});

test('client renders fixed evidence copy and rejects an untrusted reference',()=>{
 const message=homeConversationErrorMessage({code:'evidence_source_auth_unavailable',error:privateDetail,correlationId:privateDetail});
 assert.match(message,/server could not authenticate/);assert.doesNotMatch(message,/PRIVATE|Reference:/);
 assert.equal(homeConversationErrorMessage(null),'The conversation response is unavailable.');
 assert.equal(homeConversationErrorMessage({error:'Existing provider failure'}),'Existing provider failure');
});
