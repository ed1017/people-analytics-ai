import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,statSync,writeFileSync,cpSync,unlinkSync,symlinkSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compileRoute,loadRoute} from './route.mjs';
import {runTwoTurns,createBoundary,hash,model,limits} from './run.mjs';
import {verifySource,readAuthorization,validateAuthorization,authorizationTemplate,validateNodeRuntime,supportedNodeVersions,branch,projectId,authorizationPath,inventoryPath,canonical} from './guards.mjs';
import {firstRequest,fixture} from './fixture.mjs';
import {durableRecorder} from './build.mjs';
import {encodeReceipt,decodeReceipt,receiptPrefix} from '../tests/helpers/swp-preview-receipt-log.mjs';
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
function setup(steps,{wire=false,expiresAt=Date.now()+60000,now=Date.now,beforeWire=()=>{}}={}) {
  const events=[],calls=[];let boundary;
  const client={responses:{create(payload,options){
    calls.push({payload:structuredClone(payload),options,consumedBeforeDispatch:boundary.report.generationAttempts});
    return {withResponse:async()=>{
      const wireRequest={method:'POST',body:JSON.stringify(payload),headers:{'x-client-request-id':options.headers['X-Client-Request-Id'],'x-stainless-retry-count':'0'}};
      beforeWire();
      if(wire)boundary.verifyTransport('https://api.openai.com/v1/responses',wireRequest);
      if(wire===2)boundary.verifyTransport('https://api.openai.com/v1/responses',wireRequest);
      const step=steps[calls.length-1];if(step instanceof Error)throw step;
      const next=typeof step==='function'?step(payload):step;
      if(!next)throw Error('unexpected_stub_call');
      return {data:{id:'resp_synthetic_'+calls.length,status:'completed',model:model.id,service_tier:'default',
        usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:5}},...next},
        request_id:next.testMissingRequestId?null:'req_synthetic_'+calls.length,response:{status:200}};
    }};
  },inputTokens:{count(){throw Error('token_count_forbidden');}}}};
  return {events,calls,client,run:(recordHook=()=>{})=>runTwoTurns({code,client,runId,expiresAt,now,requireWireProof:wire,
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
  const b=createBoundary({client:{},record(){},runId,expiresAt:Date.now()+60000,signal:new AbortController().signal});
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
function configuredRun(source,now) {
  const auth={...authorizationTemplate(source),runId,reservationId:'01234567-89ab-cdef-0123-456789abcdef',
    reviewedCodeCommit:'a'.repeat(40),createdAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60000).toISOString()};
  const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:projectId,VERCEL_DEPLOYMENT_ID:'dpl_offline',
    VERCEL_GIT_REPO_OWNER:'ed1017',VERCEL_GIT_REPO_SLUG:'people-analytics-ai',VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)};
  return {auth,env};
}
test('run configuration is unarmed by default and pins source, exact runtime, Preview identity and limits without approval flags',()=>{
  const source=verifySource(root),template=authorizationTemplate(source),now=Date.now();
  assert.equal(template.runId,null);assert.equal(Object.hasOwn(template,'executionAuthorized'),false);
  assert.throws(()=>validateAuthorization(template,{},source,now,'24.21.0'));
  const {auth,env}=configuredRun(source,now),check=(a=auth,e=env,n=now,v='24.21.0')=>validateAuthorization(a,e,source,n,v);
  assert.equal(check(),true);
  for(const changed of [{VERCEL_ENV:'production'},{VERCEL_TARGET_ENV:'production'},{VERCEL_GIT_COMMIT_SHA:auth.reviewedCodeCommit},
    {VERCEL_GIT_COMMIT_SHA:'invalid'},{VERCEL_GIT_COMMIT_REF:'wrong'},{VERCEL_GIT_REPO_OWNER:'wrong'},
    {OPENAI_BASE_URL:'https://example.invalid'},{VERCEL_PROJECT_ID:'prj_wrong'},{OPENAI_CUSTOM_HEADERS:'Authorization: synthetic-override'},
    {OPENAI_ADMIN_KEY:'synthetic-admin'},{SWP_PLAN_B_AUTHORIZATION:''}])assert.throws(()=>check(auth,{...env,...changed}));
  for(const changed of [{approved:true},{sourceRootSha256:'0'.repeat(64)},{inventorySha256:'0'.repeat(64)},
    {projectId:'prj_wrong'},{repository:'wrong/repo'},{branch:'wrong'},{runtime:{name:'node',version:'24.19.0'}},
    {reservationId:runId},{runId:null},{reviewedCodeCommit:'invalid'},{sourceCommit:'c'.repeat(40)},
    {expiresAt:new Date(now).toISOString()},{createdAt:new Date(now+1).toISOString()},
    {expiresAt:new Date(now+3600001).toISOString()},{createdAt:'2026-10-09T00:00:00+00:00'},
    {createdAt:'2026-02-30T00:00:00.000Z'},{limits:{...limits,generationAttempts:5}},{model:{...model,id:'other'}}])
    assert.throws(()=>check({...auth,...changed}));
  assert.throws(()=>check(auth,env,now,'24.19.0'));assert.throws(()=>check(auth,env,NaN));
  assert.equal(limits.priorRetainedMicrousd+limits.reservationMicrousd,46799877);
});
test('path-only inventory binds its own bytes and all source inputs, with only run configuration excluded',()=>{
  const source=verifySource(root),paths=JSON.parse(readFileSync(join(root,inventoryPath)));
  assert.equal(paths.includes(inventoryPath),true);assert.equal(paths.includes(authorizationPath),false);
  assert.equal(source.sourceFileCount,paths.length);assert.equal(source.frozenReferencePreserved,true);
  const expected=Object.fromEntries(paths.map(path=>[path,hash(path==='vercel.json'?canonical(JSON.parse(readFileSync(join(root,path)))):readFileSync(join(root,path)))]));
  assert.equal(source.sourceRootSha256,hash(canonical({version:1,files:expected})));
  assert.equal(source.inventorySha256,expected[inventoryPath]);
  const clone=join(mkdtempSync(join(tmpdir(),'plan-b-source-')),'checkout');
  cpSync(root,clone,{recursive:true,filter:path=>!['node_modules','.git','.vercel'].includes(relative(root,path).split('/')[0])});
  assert.equal(verifySource(clone).sourceRootSha256,source.sourceRootSha256);
  writeFileSync(join(clone,authorizationPath),'{}\n');
  assert.equal(verifySource(clone).sourceRootSha256,source.sourceRootSha256);
  unlinkSync(join(clone,authorizationPath));
  writeFileSync(join(clone,'.npmrc'),'ignore-scripts=false\n');
  assert.throws(()=>verifySource(clone),/source_inventory_changed/);unlinkSync(join(clone,'.npmrc'));
  const readme=join(clone,'.plan-b-two-turn/README.md'),before=readFileSync(readme);
  writeFileSync(readme,Buffer.concat([before,Buffer.from('\nChanged source input.\n')]));
  const changed=verifySource(clone);assert.notEqual(changed.sourceRootSha256,source.sourceRootSha256);
  const now=Date.now(),{auth,env}=configuredRun(source,now);
  assert.throws(()=>validateAuthorization(auth,env,changed,now,'24.21.0'),/unarmed_or_unbound/);
  writeFileSync(readme,before);
  for(const list of [[...paths,paths[0]],[...paths,authorizationPath],paths.filter(path=>path!==inventoryPath),[...paths].reverse()]){
    writeFileSync(join(clone,inventoryPath),JSON.stringify(list,null,2)+'\n');
    assert.throws(()=>verifySource(clone),/source_inventory_changed/);
  }
  writeFileSync(join(clone,inventoryPath),readFileSync(join(root,inventoryPath)));
  unlinkSync(readme);symlinkSync(join(clone,'README.md'),readme);
  assert.throws(()=>verifySource(clone),/source_entry_changed/);
});
test('authorization reader requires the fixed canonical file and refuses legacy environment arming or symlinks',()=>{
  assert.equal(existsSync(join(root,authorizationPath)),false);
  assert.throws(()=>readAuthorization(root,{}),/unarmed/);
  assert.throws(()=>readAuthorization(root,{SWP_PLAN_B_AUTHORIZATION:''}),/legacy_arming_forbidden/);
  const dir=mkdtempSync(join(tmpdir(),'plan-b-auth-reader-'));
  cpSync(join(root,'.plan-b-two-turn'),join(dir,'.plan-b-two-turn'),{recursive:true});
  const {auth}=configuredRun(verifySource(root),Date.now()),path=join(dir,authorizationPath),raw=canonical(auth)+'\n';
  writeFileSync(path,raw);const read=readAuthorization(dir,{});
  assert.deepEqual(read.authorization,auth);assert.equal(read.authorizationSha256,hash(raw));
  for(const invalid of [JSON.stringify(auth,null,2)+'\n',' '.repeat(20001),raw.replace('{','{"kind":"duplicate",')]){
    writeFileSync(path,invalid);assert.throws(()=>readAuthorization(dir,{}));
  }
  unlinkSync(path);symlinkSync(join(dir,inventoryPath),path);
  assert.throws(()=>readAuthorization(dir,{}),/authorization_file_invalid/);
});
test('expiry is checked before every generation, after receipt IO and immediately before outgoing dispatch',async()=>{
  let time=1000;const now=()=>time,expiresAt=2000;
  time=2000;const expired=setup([answer('Never dispatched.')],{now,expiresAt,wire:true});
  const first=await expired.run();assert.equal(first.generationAttempts,0);assert.equal(expired.calls.length,0);
  assert.equal(first.stopReason,'reservation_expired');
  time=1000;const afterReceipt=setup([answer('Never dispatched.')],{now,expiresAt,wire:true});
  const second=await afterReceipt.run(stage=>{if(stage==='before-generation-1')time=2000;});
  assert.equal(second.generationAttempts,1);assert.equal(afterReceipt.calls.length,0);assert.equal(second.attemptAmbiguous,true);
  time=1000;const atWire=setup([answer('Never dispatched.')],{now,expiresAt,wire:true,beforeWire:()=>{time=2000;}});
  const third=await atWire.run();assert.equal(atWire.calls.length,1);assert.equal(third.wireAttempts,0);
  assert.equal(third.stopReason,'reservation_expired');
  time=1000;const nextTurn=setup([answer('Synthetic completed turn one.'),answer('Never dispatched.')],{now,expiresAt,wire:true});
  const fourth=await nextTurn.run(stage=>{if(stage==='checked-turn-1')time=2000;});
  assert.deepEqual(fourth.completedTurns,[1]);assert.equal(nextTurn.calls.length,1);assert.equal(fourth.wireAttempts,1);
  assert.equal(fourth.stopReason,'reservation_expired');assert.equal(fourth.reservationRetainedMicrousd,23430000);
  assert.throws(()=>createBoundary({client:{},record(){},runId,signal:new AbortController().signal}),/reservation_expired/);
});
test('database refusal is latched before any database operation',()=>{
  const b=createBoundary({client:{},record(){},runId,expiresAt:Date.now()+60000,signal:new AbortController().signal});
  assert.throws(()=>b.forbiddenDatabase(),/database_forbidden/);assert.equal(b.report.databaseAttempts,1);
  assert.throws(()=>b.beginTurn(firstRequest(),0),/database_forbidden/);
});
test('runtime gate explicitly accepts the observed Vercel patch and rejects unreviewed patches or coercion',()=>{
  assert.deepEqual(supportedNodeVersions,['24.19.0','24.21.0']);
  for(const version of supportedNodeVersions)assert.doesNotThrow(()=>validateNodeRuntime(version));
  for(const version of ['24.18.0','24.20.0','24.21.1','24.22.0','25.0.0','24.x','v24.21.0','24.21.0 ',null,undefined,24,{toString:()=> '24.21.0'}])
    assert.throws(()=>validateNodeRuntime(version),/runtime_changed/);
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
test('receipt decoder rejects incomplete, duplicate, mixed, corrupted and malformed chunks',()=>{
  const receipt={text:'Synthetic receipt '.repeat(300)},lines=encodeReceipt('offline_integrity',receipt);
  assert(lines.length>1);assert.deepEqual(decodeReceipt([...lines].reverse()).receipt,receipt);
  const changed=patch=>lines.map((line,index)=>index===0?receiptPrefix+JSON.stringify({...JSON.parse(line.slice(receiptPrefix.length)),...patch}):line);
  for(const broken of [lines.slice(1),[lines[0],...lines.slice(0,-1)],changed({recordId:'different'}),
    changed({sha256:'0'.repeat(64)}),changed({bytes:1}),changed({data:'!bad'}),changed({extra:'refuse'}),
    changed({index:lines.length}),changed({data:'AAAA'})])assert.throws(()=>decodeReceipt(broken));
  assert.throws(()=>encodeReceipt('invalid id',receipt));
  assert.throws(()=>decodeReceipt([receiptPrefix+'x'.repeat(3000)]));
});
test('unarmed build exits before provider access and does not print even a supplied sentinel key',()=>{
  const result=spawnSync(process.execPath,['.plan-b-two-turn/build.mjs'],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH,OPENAI_API_KEY:'SENTINEL_DO_NOT_EXPORT'}});
  assert.equal(result.status,1);assert.match(result.stderr,/PLAN_B_TWO_TURN_STOP unarmed/);
  assert(!result.stdout.includes('SENTINEL'));assert(!result.stderr.includes('SENTINEL'));
});
test('all checks were offline',()=>{assert.equal(networkAttempts,0);assert.equal(hash(firstRequest()),hash(firstRequest()));});
test('locked real SDK serializes exact payload/headers and never retries, using only an isolated fetch stub',()=>{
  const program=`
    import assert from 'node:assert/strict';
    import OpenAI from 'openai';
    import {readFileSync} from 'node:fs';
    import {createBuildClient} from './.plan-b-two-turn/build.mjs';
    import {runTwoTurns} from './.plan-b-two-turn/run.mjs';
    const code=readFileSync(process.argv[1],'utf8');
    const runId='5f318def-88b2-4fe7-85c5-c89ca8b3467f';
    for(const mode of ['success','server-error','hostile-headers']){
      if(mode==='hostile-headers')process.env.OPENAI_CUSTOM_HEADERS='Authorization: synthetic-override\\nOpenAI-Project: synthetic-wrong-project';
      else delete process.env.OPENAI_CUSTOM_HEADERS;
      let boundary,wire=0;const records=[];
      const client=createBuildClient({OpenAI,apiKey:'synthetic-sdk-key',getBoundary:()=>boundary,dispatch:async(url,init)=>{
        wire++;assert.equal(new URL(url).href,'https://api.openai.com/v1/responses');
        const p=JSON.parse(init.body),headers=new Headers(init.headers);
        assert.equal(p.model,'gpt-6.1-sol');assert.equal(p.reasoning.effort,'medium');assert.equal(p.service_tier,'default');assert.equal(p.max_output_tokens,5000);
        assert.equal(headers.get('authorization'),'Bearer synthetic-sdk-key');assert.equal(headers.get('x-stainless-retry-count'),'0');
        assert.equal(headers.has('openai-project'),false);assert.equal(headers.has('openai-organization'),false);assert.equal(init.redirect,'error');
        if(mode==='server-error')return new Response(JSON.stringify({error:{message:'synthetic unavailable',type:'server_error'}}),{status:503,headers:{'content-type':'application/json','x-request-id':'req_sdk_error'}});
        const text=JSON.stringify({answer:'Synthetic SDK reply '+wire,candidateIds:[],analysisIds:[],questions:[],constraintUpdates:[],rejected:[],focusCandidateId:null,verifiedMetrics:[]});
        return new Response(JSON.stringify({id:'resp_sdk_'+wire,object:'response',status:'completed',model:'gpt-6.1-sol',service_tier:'default',
          output:[{type:'message',id:'msg_synthetic',role:'assistant',content:[{type:'output_text',text,annotations:[]}]}],
          usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}}),
          {status:200,headers:{'content-type':'application/json','x-request-id':'req_sdk_'+wire}});
      }});
      const result=await runTwoTurns({code,client,runId,expiresAt:Date.now()+60000,requireWireProof:true,bindBoundary:v=>boundary=v,record:(stage,value)=>records.push({stage,...value})});
      assert.equal(result.executionComplete,mode==='success',JSON.stringify({mode,result,wire,stages:records.map(r=>({stage:r.stage,code:r.code,requestId:r.requestId}))}));assert.equal(wire,mode==='success'?2:mode==='server-error'?1:0);
      assert.equal(result.generationAttempts,mode==='success'?2:1);assert.equal(result.countAttempts,0);
      if(mode==='success')assert.equal(records.find(r=>r.stage==='generation-1').requestId,'req_sdk_1');
      if(mode==='server-error')assert.equal(records.find(r=>r.stage==='attempt-stop-1').requestId,'req_sdk_error');
      if(mode==='hostile-headers')assert.equal(result.attemptAmbiguous,true);
    }
    console.log('PASS isolated installed-SDK wire identity, Standard payload, header rejection and zero retries');
  `;
  const result=spawnSync(process.execPath,['--input-type=module','-e',program,join(compiled,'route.cjs')],
    {cwd:root,encoding:'utf8',env:{PATH:process.env.PATH},timeout:15000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS isolated installed-SDK/);
});
