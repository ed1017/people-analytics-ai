import {offlinePrivateReview,offlinePrivateConfig} from './offline-private.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import OpenAI from 'openai';
import {compileRoute} from './route.mjs';
import {createBuildClient} from './build.mjs';
import {replayPrivateArtifact} from './replay.mjs';
import {runDiagnostic,limits,hash} from './run.mjs';
import {aggregateContract,createAggregateReader,projectAggregate,evidenceFor} from './aggregate.mjs';
import {aggregateDispatch,aggregateResponse,syntheticAggregate,syntheticAggregateSha256} from './offline-aggregate.mjs';
import {batchTool,plansAnswer,tool,context} from './offline-replies.mjs';
import {verifySource,readAuthorization,authorizationTemplate,validateAuthorization,validateNodeRuntime,validateAggregateVerification,branch,projectId} from './guards.mjs';
import {withSparseSource} from './offline-source.mjs';
const sourceCheck=()=>withSparseSource(root,()=>verifySource(root));
const root=fileURLToPath(new URL('../',import.meta.url));let realNetwork=0;
globalThis.fetch=()=>{realNetwork++;throw Error('real_network_forbidden');};
const code=await compileRoute(root);
const readStep=()=>({output:[tool('read_evidence',{sourceIds:['A1']})],output_text:''});
const finalStep=payload=>{const result=plansAnswer(payload),final=JSON.parse(result.output_text);final.questions=['Which team would you like to explore first?'];return {...result,output_text:JSON.stringify(final)};};
async function run({steps=[batchTool,finalStep],phase='model-assessment',read=aggregateDispatch,approved=syntheticAggregateSha256,signal,recordHook,dispatchHook,boundaryHook}={}){
 let boundary,wire=0;const events=[],payloads=[],reads=[];
 const client=createBuildClient({OpenAI,apiKey:'synthetic-only-key',getBoundary:()=>boundary,dispatch:async(input,init)=>{
  wire++;const payload=JSON.parse(init.body);payloads.push(payload);dispatchHook?.(input,init);
  const result=await steps[wire-1](payload);
  const output=result.output.length?result.output:[{type:'message',role:'assistant',id:'msg_synthetic',content:[{type:'output_text',text:result.output_text,annotations:[]}]}];
  return Response.json({id:'resp_synthetic_'+wire,object:'response',status:'completed',model:'gpt-6.1-sol',service_tier:'default',output,
   usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}},
   {headers:{'x-request-id':'req_synthetic_'+wire}});
 }});
 const privateCapture=offlinePrivateReview();
 const report=await runDiagnostic({code,client,privateReview:privateCapture.sink,phase,approvedAggregateSha256:phase==='model-assessment'?approved:null,
  aggregateDispatch:async(...args)=>{reads.push(args);return read(...args);},runId:'offline-turnover',expiresAt:Date.now()+60000,
  requireWireProof:true,bindBoundary:value=>{boundary=value;boundaryHook?.(boundary);},signal,record:(stage,value)=>{recordHook?.(stage,value);events.push({stage,...structuredClone(value)});}});
 return {report,wire,events,payloads,reads,boundary,privateCapture};
}
test('current exact app verifies only attrition then supports evidence, checked plans and final optional question in two calls',async()=>{
 const {report,wire,reads,payloads,events}=await run();
 assert.equal(report.executionComplete,true);assert.equal(report.aggregateVerificationPassed,true);assert.equal(wire,2);
 assert.equal(report.aggregate.attempts,2);assert.equal(reads.length,2);assert.equal(report.databaseAttempts,0);
 for(const [url,init] of reads){assert.equal(url,aggregateContract.endpoint);assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');}
 const current=context(payloads[0]);assert.deepEqual(current.currentEvidence.sources.filter(x=>x.status==='loaded').map(x=>x.id),['A1']);
 assert.equal(current.evidenceGrounding.sources.find(x=>x.id==='A1').basis,'database-backed-aggregate');
 assert.equal(current.evidenceGrounding.sources.find(x=>x.id==='A1').asOf,'2026-09-30');
 assert.equal(current.evidenceGrounding.packetSha256,hash(current.currentEvidence));
 assert.equal(current.evidenceGrounding.databaseIntegrityCertified,false);
 assert.equal(current.currentEvidence.sources.filter(x=>x.id!=='A1').every(x=>x.facts===null&&x.status!=='loaded'),true);
 assert.equal(events.find(x=>x.stage==='checked-turn-1').checkedPlanCount,1);assert.equal(report.goalSaved,false);assert.equal(report.fullAcceptance,false);
 assert.equal(report.reservationRetainedMicrousd,11715000);assert.equal(report.budgetClosure,'pending-external-review');
});
test('separate zero-provider checkpoint traverses actual app verification and stops before SDK construction/dispatch',async()=>{
 const {report,wire,reads,events}=await run({phase:'aggregate-verification'});
 assert.equal(report.executionComplete,true);assert.equal(report.zeroProviderCheckpoint,true);assert.equal(report.aggregateVerificationPassed,true);
 assert.equal(wire,0);assert.equal(report.generationAttempts,0);assert.equal(report.reservationRetainedMicrousd,0);assert.equal(reads.length,2);
 assert.equal(events.find(x=>x.stage==='route-reply-1').httpStatus,422);
});
test('second response requesting extra work stops inconclusive without a third dispatch',async()=>{
 const {report,wire}=await run({steps:[batchTool,readStep]});
 assert.equal(wire,2);assert.equal(report.generationAttempts,2);assert.equal(report.stopReason,'continuation_second_final_required');assert.equal(report.executionComplete,false);
 assert.equal(report.sdkRetries,0);assert.equal(report.countAttempts,0);assert.deepEqual(report.completedTurns,[]);
});
for(const scenario of ['unavailable','missing_dataset','stale_dataset','stale_date','changed_on_recheck','future_month','duplicate_month','suppressed','oversized'])test(scenario+' fails before model dispatch',async()=>{
 let n=0;const read=async()=>{n++;const raw=structuredClone(syntheticAggregate);
  if(scenario==='unavailable')return new Response('',{status:503});
  if(scenario==='missing_dataset')return Response.json(raw);
  if(scenario==='stale_dataset')return Response.json(raw,{headers:{'x-workforce-dataset':'legacy-v1:1'}});
  if(scenario==='stale_date')raw.as_of='2026-08-31';
  if(scenario==='changed_on_recheck'&&n===2)raw.summary.total_exits++;
  if(scenario==='future_month')raw.trend[0].month='2026-10-01';
  if(scenario==='duplicate_month')raw.trend[0].month=raw.trend[1].month;
  if(scenario==='suppressed')raw.summary.suppressed=true;
  if(scenario==='oversized')return new Response('x'.repeat(65537),{headers:{'x-workforce-dataset':aggregateContract.datasetToken}});
  return aggregateResponse(raw);
 };
 const {report,wire}=await run({read});assert.equal(wire,0);assert.equal(report.generationAttempts,0);assert.equal(report.executionComplete,false);assert.ok(n<=2);
});
test('changed facts against the separately approved aggregate hash stop on initial read',async()=>{
 const {report,wire,reads}=await run({approved:'0'.repeat(64)});assert.equal(wire,0);assert.equal(reads.length,1);assert.equal(report.executionComplete,false);
});
test('unexpected record/name/pay fields and model prose never enter receipts',async()=>{
 const marker='SENTINEL_PRIVATE_NAME_AND_PAY',raw={...structuredClone(syntheticAggregate),employees:[{name:marker,pay:12345}],business_units:[{org_name:marker}],reasons:[{separation_reason:marker}]};
 raw.summary.person_name=marker;raw.summary.base_pay=12345;raw.trend[0].employee_name=marker;
 const prose=payload=>{const reply=finalStep(payload),final=JSON.parse(reply.output_text);final.answer+=' '+marker;return {...reply,output_text:JSON.stringify(final)};};
 const {events,report}=await run({read:async()=>aggregateResponse(raw),steps:[batchTool,prose]});
 assert.equal(report.executionComplete,true);const receipts=JSON.stringify(events);assert.ok(!receipts.includes(marker));
 for(const forbidden of ['"payload":','"outputText":','"replyText":','"request":','"employees":','"base_pay":'])assert.ok(!receipts.includes(forbidden),forbidden);
 assert.equal(events.some(x=>x.stage.startsWith('replay')),false);
 assert.deepEqual(projectAggregate(raw),projectAggregate(syntheticAggregate));
});
test('hung aggregate ignores abort but deadline returns before any model dispatch',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let release;const read=()=>new Promise(resolve=>{release=resolve;});
 const pending=run({read});await new Promise(resolve=>setImmediate(resolve));t.mock.timers.tick(8000);
 const {report,wire}=await pending;assert.equal(wire,0);assert.equal(report.aggregate.attempts,1);assert.equal(report.executionComplete,false);
 release(aggregateResponse());await new Promise(resolve=>setImmediate(resolve));assert.equal(report.generationAttempts,0);
});
test('caller cancellation stops a hung recheck and any later scheduling',async()=>{
 const controller=new AbortController();let n=0,recheck;
 const pending=run({signal:controller.signal,read:async()=>{if(++n===1)return aggregateResponse();recheck=true;return new Promise(()=>{});}});
 while(!recheck)await new Promise(resolve=>setImmediate(resolve));controller.abort();
 const {report,wire}=await pending;assert.equal(wire,0);assert.equal(n,2);assert.equal(report.executionComplete,false);
});
test('aggregate reader refuses overlapping, third and wrong endpoint reads',async()=>{
 const signal=new AbortController().signal;let resolve,dispatches=0;
 const reader=createAggregateReader({signal,dispatch:()=>{dispatches++;return new Promise(r=>{resolve=r;});}});
 const first=reader.initial(),rejected=assert.rejects(first);assert.throws(()=>reader.initial());await rejected;resolve(aggregateResponse());assert.equal(dispatches,1);reader.close();
 const second=createAggregateReader({signal,dispatch:aggregateDispatch});await second.initial();
 await assert.rejects(second.GET(new Request('http://local.invalid/api/workforce',{headers:{'x-workforce-dataset':aggregateContract.datasetToken}})));second.close();
 const third=createAggregateReader({signal,dispatch:aggregateDispatch});await third.initial();
 await third.GET(new Request('http://local.invalid/api/attrition',{headers:{'x-workforce-dataset':aggregateContract.datasetToken}}));
 await assert.rejects(third.GET(new Request('http://local.invalid/api/attrition')));third.close();
});
test('loaded extra evidence, stale client facts and dataset header fail in the actual current app path',async()=>{
 // Patch only serialized request construction at the VM boundary, not source or verifier.
 const {loadRoute}=await import('./route.mjs');
 const {firstRequest}=await import('./fixture.mjs');
 for(const kind of ['extra_source','changed_fact','stale_header']){
  let calls=0,forbidden=0,reads=0;const reader=createAggregateReader({signal:new AbortController().signal,dispatch:async()=>{reads++;return aggregateResponse();}});
  const request=firstRequest(evidenceFor(await reader.initial()));
  if(kind==='changed_fact')request.evidence.sources.find(x=>x.id==='A1').facts.total_exits++;
  if(kind==='extra_source'){const source=request.evidence.sources.find(x=>x.id==='W2');source.status='loaded';source.facts={headcount:20};}
  const POST=loadRoute(code,{aggregateGET:r=>reader.GET(r),forbiddenDatabase(){forbidden++;throw Error('database_forbidden');},checkClient(){calls++;throw Error('unexpected_model');}});
  const response=await POST(new Request('http://local.invalid/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':kind==='stale_header'?'legacy-v1:1':'legacy-v1:0'},body:JSON.stringify(request)}));
  assert.equal(calls,0);assert.equal(response.status,kind==='stale_header'?409:503);assert.ok(reads<=2);if(kind==='extra_source')assert.equal(forbidden,1);reader.close();
 }
});
test('source guard pins current app and both phases need separate exact authorization',()=>{
 const source=sourceCheck();assert.equal(source.baseSource,'64b5124b329c26bf35cdf6eed2fb02b98d06bad1');
 const time=Date.now(),auth={...authorizationTemplate(source),privateReview:offlinePrivateConfig,runId:'11111111-1111-4111-8111-111111111111',reviewedCodeCommit:'c'.repeat(40),createdAt:new Date(time-1000).toISOString(),expiresAt:new Date(time+60000).toISOString()};
 const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:projectId,VERCEL_DEPLOYMENT_ID:'dpl_synthetic',VERCEL_GIT_REPO_OWNER:'ed1017',VERCEL_GIT_REPO_SLUG:'people-analytics-ai',VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:'d'.repeat(40)};
 assert.equal(validateAuthorization(auth,env,source,time,'24.21.0'),true);
 assert.throws(()=>validateAuthorization({...auth,phase:'model-assessment'},env,source,time,'24.21.0'));
 const armed={...auth,phase:'model-assessment',budgetLedger:{asOf:new Date(time).toISOString(),priorExposureMicrousd:30000000,totalCapMicrousd:50000000},reservationId:'22222222-2222-4222-8222-222222222222',approvedAggregateSha256:syntheticAggregateSha256,aggregateVerificationReceiptSha256:'e'.repeat(64),privateReviewRetrievalSha256:'f'.repeat(64)};
 assert.equal(validateAuthorization(armed,env,source,time,'24.21.0'),true);
 for(const patch of [{aggregateContract:{...aggregateContract,endpoint:'https://example.com'}},{limits:{...limits,generationAttempts:4}},{expiresAt:new Date(time-1).toISOString()},{sourceRootSha256:'f'.repeat(64)}])assert.throws(()=>validateAuthorization({...armed,...patch},env,source,time,'24.21.0'));
 assert.throws(()=>validateNodeRuntime('24.22.0'));
 assert.equal(limits.reservationMicrousd,11715000);assert.equal(limits.generationAttempts,2);
 for(const ledger of [null,{...armed.budgetLedger,priorExposureMicrousd:40000000},{...armed.budgetLedger,asOf:new Date(time-900001).toISOString()}])assert.throws(()=>validateAuthorization({...armed,budgetLedger:ledger},env,source,time,'24.21.0'));
});
test('model phase requires an intact recent zero-provider receipt bound to the same source and facts',()=>{
 const source=sourceCheck(),time=Date.now();
 const receipt={stage:'aggregate-verified',phase:'aggregate-verification',sourceRootSha256:source.sourceRootSha256,
  reviewedCodeCommit:'c'.repeat(40),verifiedAt:new Date(time-1000).toISOString(),aggregateVerificationPassed:true,
  generationAttempts:0,wireAttempts:0,aggregateReadAttempts:2,aggregateSha256:syntheticAggregateSha256,privateCanaryNonceSha256:'a'.repeat(64),privateReview:{reviewId:offlinePrivateConfig.reviewId,recipientKeySha256:offlinePrivateConfig.recipientKeySha256,redacted:false,completionSha256:'b'.repeat(64)}};
 const bytes=Buffer.from(JSON.stringify({sanitization:{redacted:false,truncated:false},receipt})+'\n');
 const auth={phase:'model-assessment',privateReview:offlinePrivateConfig,reviewedCodeCommit:receipt.reviewedCodeCommit,aggregateVerificationReceiptSha256:hash(bytes),approvedAggregateSha256:syntheticAggregateSha256};
 assert.equal(validateAggregateVerification(bytes,auth,source,time),true);
 for(const patch of [{generationAttempts:1},{wireAttempts:1},{aggregateReadAttempts:1},{aggregateVerificationPassed:false},{sourceRootSha256:'0'.repeat(64)},{aggregateSha256:'0'.repeat(64)},{verifiedAt:new Date(time-3600001).toISOString()}]){
  const bad=Buffer.from(JSON.stringify({sanitization:{redacted:false,truncated:false},receipt:{...receipt,...patch}}));
  assert.throws(()=>validateAggregateVerification(bad,{...auth,aggregateVerificationReceiptSha256:hash(bad)},source,time));
 }
 assert.throws(()=>validateAggregateVerification(bytes,{...auth,aggregateVerificationReceiptSha256:'0'.repeat(64)},source,time));
});
test('exact model policy is retained and repeated turns are refused',async()=>{
 const {boundary,wire,payloads}=await run();assert.equal(wire,2);
 for(const payload of payloads){assert.equal(payload.model,'gpt-6.1-sol');assert.equal(payload.max_output_tokens,5000);assert.equal(payload.service_tier,'default');assert.equal(payload.parallel_tool_calls,false);}
 assert.throws(()=>boundary.beginTurn({},0));
});
for(const kind of ['endpoint','retry_header','duplicate_dispatch'])test('wire '+kind+' guard stops before underlying dispatch',async()=>{
 const {wire,report}=await run({boundaryHook:boundary=>{
  const verify=boundary.verifyTransport;
  boundary.verifyTransport=(input,init)=>{
   if(kind==='endpoint')return verify('https://example.com/v1/responses',init);
   if(kind==='retry_header'){const headers=new Headers(init.headers);headers.set('x-stainless-retry-count','1');return verify(input,{...init,headers});}
   verify(input,init);return verify(input,init);
  };
 }});
 assert.equal(wire,0);assert.equal(report.generationAttempts,1);assert.equal(report.executionComplete,false);assert.equal(report.attemptAmbiguous,true);
 assert.equal(report.reservationRetainedMicrousd,11715000);
});
test('missing authorization refuses before any transport; no real run file is created',()=>{
 assert.throws(()=>readAuthorization(root,{OPENAI_API_KEY:'SENTINEL_PRIVATE_KEY'}),/unarmed/);
});
test('all verification used stubs and no network',()=>assert.equal(realNetwork,0));
test('successful run retains exact private answer, final, evidence and state for all-plan save replay',async()=>{
 const {report,privateCapture,events}=await run();const artifact=privateCapture.decode();
 assert.equal(report.executionComplete,true);assert.equal(artifact.redacted,false);assert.equal(artifact.records.completion.replayEligible,true);
 const {replyText}=artifact.records.reply,reply=JSON.parse(replyText);
 assert.equal(reply.answer,artifact.records.checks.final.answer);assert.equal(artifact.records.request.request.evidence.sources.filter(s=>s.status==='loaded').length,1);
 assert.deepEqual(artifact.records.request.aggregate,projectAggregate(syntheticAggregate));
 assert.equal(Object.keys(artifact.records).filter(stage=>stage.startsWith('provider-')).length,2);
 assert.equal(events.some(event=>JSON.stringify(event).includes(reply.answer)),false);
 const replay=await replayPrivateArtifact(artifact);assert.equal(replay.checks.length,1);assert.equal(replay.browserVerified,false);assert.equal(replay.liveGoalSaved,false);
 assert.ok(replay.checks.every(check=>check.saveContractPassed&&check.reloadPreserved&&!check.applied));
});
test('failed second call retains first visible output, exact route failure and diagnostic without extra dispatch',async()=>{
 const {report,wire,privateCapture}=await run({steps:[batchTool,()=>{throw Error('SYNTHETIC_FAILURE_ONLY');}]});
 assert.equal(wire,2);assert.equal(report.executionComplete,false);assert.equal(report.appFailureDiagnostic.modelAttempts,2);
 const artifact=privateCapture.decode();assert.ok(artifact.records['provider-1']);assert.ok(artifact.records.reply.replyText);
 assert.equal(artifact.records.completion.replayEligible,false);await assert.rejects(replayPrivateArtifact(artifact));
});
test('missing private capture refuses before aggregate or provider work',async()=>{
 let reads=0;
 await assert.rejects(runDiagnostic({code,client:null,phase:'model-assessment',approvedAggregateSha256:syntheticAggregateSha256,
  record(){},runId:'offline-no-sink',expiresAt:Date.now()+60000,aggregateDispatch(){reads++;}}),/private_review_required/);
 assert.equal(reads,0);
});
test('qualitative-only or optional-read first responses are inconclusive with one dispatch',async()=>{
 for(const step of [readStep,()=>({output:[tool('read_workforce_planning_playbook',{sections:['options']})],output_text:''}),()=>({output:[],output_text:'{}'})]){
  const result=await run({steps:[step]});assert.equal(result.wire,1);assert.equal(result.report.continuationPassed,false);
  assert.equal(result.report.diagnosticOutcome,'inconclusive');assert.equal(result.report.stopReason,'continuation_first_calculation_required');
 }
});
test('a third SDK attempt is rejected by the global bound even after a successful pair',async()=>{
 const result=await run();assert.equal(result.report.executionComplete,true);
 await assert.rejects(result.boundary.create(result.payloads[1],{signal:new AbortController().signal,maxRetries:0,timeout:30000}),/global_attempt_limit/);
 assert.equal(result.wire,2);assert.equal(result.report.generationAttempts,2);
});
for(const variant of ['call_id','result_id','history','forced_choice'])test('changed second-request '+variant+' cannot dispatch',async()=>{
 const result=await run({boundaryHook:boundary=>{
  const create=boundary.create;let n=0;
  boundary.create=(payload,options)=>{
   if(++n===2){payload=structuredClone(payload);
    if(variant==='call_id')payload.input.at(-1).call_id='wrong';
    if(variant==='result_id'){const value=JSON.parse(payload.input.at(-1).output);value.id='wrong';payload.input.at(-1).output=JSON.stringify(value);}
    if(variant==='history')payload.input[1].encrypted_content='changed';
    if(variant==='forced_choice')payload.tool_choice='required';
   }
   return create(payload,options);
  };
 }});
 assert.equal(result.wire,1);assert.equal(result.report.executionComplete,false);assert.equal(result.report.continuationPassed,false);
});
test('successful normalized continuation retains reasoning/phase and exact tool result for offline replay',async()=>{
 const r=await run(),first=r.payloads[0],second=r.payloads[1],artifact=r.privateCapture.decode();
 assert.equal(second.tool_choice,'auto');assert.equal(second.parallel_tool_calls,false);
 assert.deepEqual(second.input.slice(0,first.input.length),first.input);
 assert.equal(second.input[1].encrypted_content,'OFFLINE_ONLY');assert.equal(second.input[2].phase,'commentary');
 assert.equal(second.input[3].id,'fc_fixture');assert.equal(second.input[3].call_id,'call_synthetic');assert.equal(second.input[3].created_by,undefined);
 assert.equal(second.input.at(-1).call_id,'call_synthetic');assert.equal(typeof second.input.at(-1).output,'string');
 assert.deepEqual(artifact.records['provider-2'].continuation.output,second.input.at(-1));
 const result=JSON.parse(second.input.at(-1).output);assert.equal(result.id,'fictional-mentoring');assert.ok(result.verifiedMetricReferences.length);
 assert.equal(r.report.continuationPassed,true);assert.equal(r.report.diagnosticOutcome,'checked-continuation');
 artifact.records['provider-2'].continuation.output.output='{}';await assert.rejects(replayPrivateArtifact(artifact));
});
