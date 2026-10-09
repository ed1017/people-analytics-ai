import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compileRoute,loadRoute} from './route.mjs';
import {runTwoTurns,createBoundary,hash,model,limits} from './run.mjs';
import {verifySource,validateAuthorization,authorizationTemplate,branch,projectId} from './guards.mjs';
import {firstRequest,fixture} from './fixture.mjs';
import {durableRecorder} from './build.mjs';
import {decodeReceipt} from '../tests/helpers/swp-preview-receipt-log.mjs';
import {illustrativeServiceReview,requestDemandContext,demandQuantityFields} from '../lib/swp-demand.ts';
import {demandReferenceModelContract} from '../lib/swp-demand-reference.ts';
import {final} from '../tests/fixtures/home-solution-conversation.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const runId='5f318def-88b2-4fe7-85c5-c89ca8b3467f';
const compiled=mkdtempSync(join(tmpdir(),'plan-b-offline-'));
let networkAttempts=0;
globalThis.fetch=()=>{networkAttempts++;throw Error('offline_network_forbidden');};
const code=await compileRoute(root,compiled);
const context=payload=>JSON.parse(payload.input[0].content.split('\n').slice(1).join('\n'));
const tool=(name,args,id='call_synthetic')=>({type:'function_call',name,arguments:JSON.stringify(args),call_id:id});
const answer=text=>({output:[],output_text:JSON.stringify(final(text))});
function scopedTool(payload) {
  const current=context(payload),request=firstRequest(),basis={kind:'user-supplied',turnId:current.currentMessage.id,
    quote:current.currentMessage.text,explanation:'Explicit fictional scenario input.'};
  const spec=illustrativeServiceReview(requestDemandContext(request,fixture.datasetToken),'2026-10-09T12:00:00Z').spec;
  spec.objective=request.message.text;spec.objectiveTurnId=request.message.id;
  spec.scope={ref:'illustrative-service-role'};spec.scopeBasis=basis;spec.linkageBasis=basis;
  spec.startMonth='2026-11';spec.startBasis=basis;spec.months=9;spec.monthsBasis=basis;
  for(const field of demandQuantityFields){spec[field].scope={ref:'scenario-scope'};if(spec[field].basis.kind==='illustrative')spec[field].basis={kind:'model-proposed',turnId:null,quote:null,explanation:'Illustrative planning premise; not measured operations.'};}
  spec.contracts.value=2;spec.contracts.basis={...basis,turnId:request.message.id,quote:request.message.text};
  spec.existingRoles.value=4;spec.existingRoles.basis=basis;spec.availabilityPct.value=25;spec.availabilityPct.basis=basis;
  return {output:[tool('review_scoped_service_demand',{spec})],output_text:''};
}
function setup(steps,{wire=false}={}) {
  const events=[],calls=[];let boundary;
  const client={responses:{create(payload,options){
    calls.push({payload:structuredClone(payload),options,consumedBeforeDispatch:boundary.report.generationAttempts});
    return {withResponse:async()=>{
      if(wire)boundary.verifyTransport('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(payload)});
      if(wire===2)boundary.verifyTransport('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(payload)});
      const step=steps[calls.length-1];if(step instanceof Error)throw step;
      const next=typeof step==='function'?step(payload):step;
      if(!next)throw Error('unexpected_stub_call');
      return {data:{id:'resp_synthetic_'+calls.length,status:'completed',model:model.id,service_tier:'default',
        usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:5}},...next},
        request_id:next.testMissingRequestId?null:'req_synthetic_'+calls.length,response:{status:200}};
    }};
  },inputTokens:{count(){throw Error('token_count_forbidden');}}}};
  return {events,calls,client,run:(recordHook=()=>{})=>runTwoTurns({code,client,runId,requireWireProof:wire,
    bindBoundary:value=>{boundary=value;},record:(stage,value)=>{recordHook(stage,value);events.push({stage,...structuredClone(value)});}})};
}
test('actual integrated POST keeps real first state, reference tools, Sol medium and explicit test Standard override',async()=>{
  const firstText='Synthetic opener reply unique to this run: clarify the service work.';
  const s=setup([answer(firstText),scopedTool,answer('Synthetic conditional result; proposed assumptions remain unaccepted.')],{wire:true});
  const report=await s.run();
  assert.equal(report.executionComplete,true,JSON.stringify(report));assert.equal(report.generationAttempts,3);assert.equal(report.wireAttempts,3);
  assert.deepEqual(report.completedTurns,[1,2]);assert.equal(report.countAttempts,0);assert.equal(report.databaseAttempts,0);
  const first=s.events.find(e=>e.stage==='route-reply-1').reply;
  const next=s.events.find(e=>e.stage==='before-turn-2').request;
  assert.deepEqual(next.state,first.state);assert.equal(context(s.calls[1].payload).recentTurns.at(-1).text,firstText);
  assert.equal(next.goalContext.scenarioReview.acceptedForScenario,false);assert.equal(next.goalContext.scenarioReview.staffingComparison,null);
  const reply=s.events.find(e=>e.stage==='route-reply-2').reply,review=reply.demandReview;
  assert.equal(review.spec.months,9);assert.equal(review.spec.startMonth,'2026-11');assert.equal(review.spec.existingRoles.value,4);assert.equal(review.spec.availabilityPct.value,25);
  assert.equal(review.result.status,'calculated');assert.equal(review.spec.hoursPerContract.basis.kind,'model-proposed');
  assert.equal(review.spec.existingRoles.basis.turnId,'swp-preview-user-2');
  assert.equal(s.events.find(e=>e.stage==='checked-turn-2').checks.codeArithmeticVerified,true);
  for(const [index,call] of s.calls.entries()){
    assert.equal(call.consumedBeforeDispatch,index+1);assert.equal(call.payload.model,model.id);
    assert.deepEqual(call.payload.reasoning,{effort:'medium'});assert.equal(call.payload.max_output_tokens,5000);
    assert.equal(call.payload.service_tier,'default');assert.equal(call.options.maxRetries,0);assert.equal(call.options.timeout,30000);
    assert.deepEqual(call.payload.tools,demandReferenceModelContract.tools);assert.deepEqual(call.payload.text.format,demandReferenceModelContract.responseFormat);
    assert.match(call.payload.instructions,/Lead with a useful grounded or clearly conditional recommendation/);
    assert.equal(call.payload.parallel_tool_calls,false);assert(call.options.headers['X-Client-Request-Id'].endsWith('-'+(index+1)));
  }
  assert.equal(report.productionTierParity,false);assert.equal(report.budgetClosure,'pending-external-review');
});
test('four total SDK generations can complete two turns without a count call',async()=>{
  const s=setup([{output:[tool('read_evidence',{sourceIds:[]})],output_text:''},answer('Synthetic first reply.'),scopedTool,answer('Synthetic final reply.')]);
  assert.equal((await s.run()).executionComplete,true);assert.equal(s.calls.length,4);
});
test('a real first-turn review also carries forward unchanged and is edited through checked references',async()=>{
  const initial=payload=>{
    const value=scopedTool(payload),spec=JSON.parse(value.output[0].arguments).spec;
    for(const key of ['scopeBasis','linkageBasis','startBasis','monthsBasis'])spec[key]={kind:'model-proposed',turnId:null,quote:null,explanation:'Illustrative initial premise.'};
    for(const field of ['existingRoles','availabilityPct'])spec[field].basis={kind:'model-proposed',turnId:null,quote:null,explanation:'Illustrative initial premise.'};
    spec.months=6;spec.existingRoles.value=0;spec.availabilityPct.value=0;
    return {output:[tool('review_scoped_service_demand',{spec})],output_text:''};
  };
  const edit=payload=>{
    const c=context(payload),basis={kind:'user-supplied',turnId:c.currentMessage.id,quote:c.currentMessage.text,explanation:'Current fictional clarification.'};
    const retain={ref:'retain'},changes=[{field:'months',quantity:null,number:9,text:null,basis},
      ...['existingRoles','availabilityPct'].map(field=>({field,quantity:{value:field==='existingRoles'?4:25,period:retain,scope:retain},number:null,text:null,basis}))];
    return {output:[tool('revise_scoped_service_demand',{edit:{reviewRef:c.goalContext.scenarioReview.demandProposal.reviewRef,changes}})],output_text:''};
  };
  const s=setup([initial,answer('Synthetic initial proposed review.'),edit,answer('Synthetic revised review.')]);
  const result=await s.run();assert.equal(result.executionComplete,true,JSON.stringify(result));
  const first=s.events.find(e=>e.stage==='route-reply-1').reply,next=s.events.find(e=>e.stage==='before-turn-2').request;
  assert.deepEqual(next.state,first.state);assert.deepEqual(next.goalContext.scenarioReview.demandProposal,first.demandReview);
  assert.equal(s.events.find(e=>e.stage==='route-reply-2').reply.demandReview.spec.months,9);
});
test('global attempt limit survives the turn boundary and reports partial instead of making call five',async()=>{
  const read={output:[tool('read_clock',{})],output_text:''};
  const s=setup([read,read,answer('Synthetic first reply.'),scopedTool]);const report=await s.run();
  assert.equal(report.executionComplete,false);assert.equal(report.partial,true);assert.deepEqual(report.completedTurns,[1]);
  assert.equal(report.generationAttempts,4);assert.equal(s.calls.length,4);assert.equal(report.failure.code,'actual_route_failed');
  assert.equal(report.stopReason,'global_attempt_limit');
  assert.equal(report.reservationRetainedMicrousd,23430000);
});
test('provider error consumes the attempt, stops both turns and leaves budget unresolved',async()=>{
  const error=Object.assign(Error('private provider message sk-do-not-print-this'),{status:504,request_id:'req_timeout'});
  const s=setup([error]);const report=await s.run();
  assert.equal(s.calls.length,1);assert.equal(report.generationAttempts,1);assert.equal(report.attemptAmbiguous,true);
  assert.deepEqual(report.completedTurns,[]);assert(!JSON.stringify(s.events).includes('sk-do-not-print-this'));
  assert.equal(s.events.find(e=>e.stage==='attempt-stop-1').requestId,'req_timeout');
});
test('a before-attempt receipt failure stops before the SDK and conservatively consumes the slot',async()=>{
  const s=setup([answer('Must not be dispatched.')]);
  const report=await s.run(stage=>{if(stage==='before-generation-1')throw Error('receipt_write_failed');});
  assert.equal(s.calls.length,0);assert.equal(report.generationAttempts,1);assert.equal(report.attemptAmbiguous,true);
  assert.equal(report.executionComplete,false);assert.equal(report.reservationRetainedMicrousd,23430000);
});
test('schema and checked-tool failures stop without a corrective model attempt',async()=>{
  for(const bad of [{output:[],output_text:'{"invalid":true}'},{output:[tool('review_scoped_service_demand',{spec:{}})],output_text:''}]){
    const s=setup([bad]);assert.equal((await s.run()).executionComplete,false);assert.equal(s.calls.length,1);
  }
});
test('unexpected tier/model, incomplete response and missing usage/request identity never cause fallback',async()=>{
  for(const override of [{service_tier:'priority'},{model:'different-model'},{status:'incomplete'},{usage:null},{testMissingRequestId:true}]){
    const s=setup([{...answer('Synthetic.'),...override}]);const report=await s.run();assert.equal(report.executionComplete,false);assert.equal(s.calls.length,1);
    const receipt=s.events.find(e=>e.stage==='generation-1');assert(receipt);assert.equal(receipt.requestedModel.serviceTier,'default');
  }
});
test('transport blocks token counting, alternate endpoints and repeated dispatch before any extra wire call',()=>{
  const b=createBoundary({client:{},record(){},runId,signal:new AbortController().signal});
  for(const url of ['https://api.openai.com/v1/responses/input_tokens','https://example.invalid/v1/responses'])
    assert.throws(()=>b.verifyTransport(url,{method:'POST',body:'{}'}));
  assert.equal(b.report.wireAttempts,0);
});
test('a repeated outbound dispatch is refused and is never treated as retry authorization',async()=>{
  const s=setup([answer('Synthetic.')],{wire:2}),report=await s.run();
  assert.equal(report.executionComplete,false);assert.equal(report.generationAttempts,1);assert.equal(report.wireAttempts,1);
  assert.equal(report.attemptAmbiguous,true);assert.equal(report.stopReason,'transport_scope_or_attempt_ambiguity');
});
test('the unchanged per-turn fourth-round final-only guard still applies',async()=>{
  const read={output:[tool('read_clock',{})],output_text:''},s=setup([read,read,read,answer('Synthetic final-only reply.')]);
  const report=await s.run();assert.equal(s.calls.length,4);assert.equal(s.calls[3].payload.tool_choice,'none');
  assert.deepEqual(report.completedTurns,[1]);assert.equal(report.stopReason,'global_attempt_limit');
});
test('actual dataset wrapper rejects stale dataset before model execution',async()=>{
  let calls=0;const POST=loadRoute(code,{checkClient(){calls++;},create(){calls++;},forbiddenDatabase(){throw Error('database');}});
  const response=await POST(new Request('http://build-only.invalid/api/home-solution-conversation',{
    method:'POST',headers:{'x-workforce-dataset':'stale-v2:2'},body:JSON.stringify(firstRequest())}));
  assert.equal(response.status,409);assert.equal(calls,0);
});
test('authorization remains unarmed by default, pins Preview/source/budget, and rejects stale or modified authorization',()=>{
  const source=verifySource(root),template=authorizationTemplate(source),now=Date.now();
  assert.equal(template.executionAuthorized,false);assert.throws(()=>validateAuthorization(template,{},source,now));
  const auth={...template,executionAuthorized:true,budgetReviewApproved:true,runId,reservationId:runId,
    approvalReference:'parent-offline-test-only',sourceCommit:'a'.repeat(40),createdAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60000).toISOString()};
  const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:projectId,VERCEL_DEPLOYMENT_ID:'dpl_offline',
    VERCEL_GIT_REPO_OWNER:'ed1017',VERCEL_GIT_REPO_SLUG:'people-analytics-ai',VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:auth.sourceCommit};
  assert.equal(validateAuthorization(auth,env,source,now),true);
  for(const changed of [{...env,VERCEL_ENV:'production'},{...env,VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)},{...env,OPENAI_BASE_URL:'https://example.invalid'},{...env,VERCEL_PROJECT_ID:'prj_wrong'}])assert.throws(()=>validateAuthorization(auth,changed,source,now));
  for(const changed of [{...auth,budgetReviewApproved:false},{...auth,harnessSha256:'0'.repeat(64)},{...auth,expiresAt:new Date(now-1).toISOString()},{...auth,limits:{...limits,generationAttempts:5}},{...auth,unexpectedField:'refuse-unreviewed-input'}])assert.throws(()=>validateAuthorization(changed,env,source,now));
  assert.equal(limits.priorRetainedMicrousd+limits.reservationMicrousd,46799877);
});
test('receipts round trip in full, redact secrets and never overwrite a prior record',()=>{
  const dir=mkdtempSync(join(tmpdir(),'plan-b-receipts-')),lines=[];
  const record=durableRecorder(dir,runId,'private-known-secret',line=>lines.push(line));
  record('test',{text:'Synthetic '+ 'large '.repeat(1500)+' private-known-secret sk-protectedcredential',model,
    usage:{input_tokens:100,output_tokens:20},requestId:'req_synthetic'});
  const recovered=decodeReceipt(lines).receipt;
  assert.equal(recovered.sanitization.truncated,false);assert.equal(recovered.sanitization.redacted,true);
  assert(!JSON.stringify(recovered).includes('private-known-secret'));assert(!JSON.stringify(recovered).includes('sk-protectedcredential'));
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'test.json'))),recovered);assert.equal(statSync(join(dir,'test.json')).mode&0o777,0o600);
  assert.throws(()=>record('test',{}));
});
test('unarmed build exits before provider access and does not print even a supplied sentinel key',()=>{
  const result=spawnSync(process.execPath,['.plan-b-two-turn/build.mjs'],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH,OPENAI_API_KEY:'SENTINEL_DO_NOT_EXPORT'}});
  assert.equal(result.status,1);assert.match(result.stderr,/PLAN_B_TWO_TURN_STOP unarmed/);
  assert(!result.stdout.includes('SENTINEL'));assert(!result.stderr.includes('SENTINEL'));
});
test('all checks were offline',()=>{assert.equal(networkAttempts,0);assert.equal(hash(firstRequest()),hash(firstRequest()));});
