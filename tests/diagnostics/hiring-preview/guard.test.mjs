import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {application,branch,limits,sourceManifest,unarmedManifest,validateManifest,modelPayload,createGuard,runDiagnostic,createGuardedFetch} from './guard.mjs';
import {fixture,fixtureRequest} from './fixture.mjs';
import {editHiringBudget,hiringBudgetView} from '../../../lib/home-hiring-budget.ts';
const root=fileURLToPath(new URL('../../../',import.meta.url)),now=Date.parse(fixture.clock),signal=()=>new AbortController().signal;
function armed(){return {...unarmedManifest(root),parentReserved:true,overlayReviewed:true,runId:'11111111-1111-4111-8111-111111111111',reservationId:'22222222-2222-4222-8222-222222222222',ledgerReceiptSha256:'a'.repeat(64),projectId:'prj_fixture',overlayCommit:'b'.repeat(40),reservedMicrousd:11715000,createdAt:fixture.clock,expiresAt:'2026-10-11T13:00:00.000Z',model:{id:'gpt-6.1-sol',reasoning:'medium',serviceTier:'default',testedConfigReceiptSha256:'c'.repeat(64)}};}
const env=m=>({VERCEL:'1',VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:m.overlayCommit,VERCEL_PROJECT_ID:m.projectId,VERCEL_DEPLOYMENT_ID:'dpl_fixture',HIRING_PREVIEW_RUN_ID:m.runId});
const changes=()=>Object.entries(fixture.inputs).map(([field,value])=>({field,value,basis:{kind:'user-supplied',turnId:fixtureRequest().message.id,quote:fixture.prompt,explanation:'Explicit fictional user scenario.'}}));
const first=()=>({status:'completed',service_tier:'default',usage:{input_tokens:2000,output_tokens:1000},output:[{type:'function_call',call_id:'fixture_call',name:'review_hiring_budget',arguments:JSON.stringify({changes:changes()})}],output_text:'',_request_id:'req_fixture1'});
function final(ref){return {verifiedMetrics:[],answer:{findings:'Ten external hires have listed cash of USD1,540,000, above the USD1,000,000 cap.',decisionRationale:'Review six external hires conditionally, preserving the ten required roles and four unresolved roles.',caveats:['No internal availability, readiness, release, backfill, payroll, funding approval or full mixed-route affordability is established.'],recommendedPlan:{name:'Review the six-external hiring route',steps:['Review six external hires: USD924,000 listed cash; USD76,000 remains before unknown costs.','Verify coverage and full costs for the remaining four roles before committing.'],calculationRefs:[ref]}},candidateIds:[],analysisIds:[],questions:[],constraintUpdates:[],rejected:[],focusCandidateId:null};}
function second(payload){const tool=JSON.parse(payload.input.find(item=>item.type==='function_call_output').output);return {status:'completed',service_tier:'default',usage:{input_tokens:5000,output_tokens:1000},output:[],output_text:JSON.stringify(final(tool.planningGuidance.binding.reference)),_request_id:'req_fixture2'};}
function harness(steps=[first,second]){const requests=[],records=[],m=armed();let claims=0;const client={baseURL:'https://api.openai.com/v1',responses:{create:async(payload,options)=>{requests.push({payload:structuredClone(payload),options});assert.equal(options.maxRetries,0);assert.equal(options.timeout,60000);const step=steps[requests.length-1];if(!step)throw Error('Unexpected provider call');return step(payload);}}};return {requests,records,client,run:()=>runDiagnostic({manifest:m,env:env(m),client,claim:()=>{claims++;if(claims>1)throw Error('Claim already exists');},record:(stage,value)=>records.push({stage,...value}),now:()=>now})};}
async function prepared(){const request=fixtureRequest(),g=createGuard(request),payload=modelPayload(request,[],false,{}),r=first();await g.before(payload,signal());await g.accept(r,r.output);const review=editHiringBudget(request,fixture.datasetToken,changes()),binding=await g.bindNative({...request.state,hiringBudget:review});return {g,payload:{...payload,input:[...r.output,{type:'function_call_output',call_id:'fixture_call',output:JSON.stringify({hiringBudget:hiringBudgetView(review),planningGuidance:{binding}})}]},binding};}
test('preparation is unarmed, preserves exact application source and cannot reserve or dispatch',()=>{
 const m=unarmedManifest(root);assert.equal(m.application,application);assert.equal(m.parentReserved,false);assert.equal(m.overlayReviewed,false);assert.equal(m.reservedMicrousd,null);assert.equal(m.capMicrousd,11720000);assert.equal(m.limits.generationCalls,2);assert.throws(()=>validateManifest(m,env(m),now),/reservation_or_review_missing/);
 const generated=JSON.parse(execFileSync(process.execPath,['tests/diagnostics/hiring-preview/run.mjs','--prepare'],{cwd:root,encoding:'utf8'}));assert.deepEqual(generated,m);assert.deepEqual(sourceManifest(root),m.files);
});
test('wrong reservation, cap, review, model, source identity, Preview or expiry fails before claim/provider',async()=>{
 const edits=[m=>m.parentReserved=false,m=>m.overlayReviewed=false,m=>m.ledgerReceiptSha256=null,m=>m.reservedMicrousd=11714999,m=>m.capMicrousd=11720001,m=>m.application='0'.repeat(40),m=>m.model.id='other',m=>m.model.testedConfigReceiptSha256=null,m=>m.limits={...m.limits,generationCalls:3},m=>m.expiresAt=m.createdAt];
 for(const change of edits){const m=armed();change(m);await assert.rejects(runDiagnostic({manifest:m,env:env(m),client:{baseURL:'https://api.openai.com/v1'},claim:()=>assert.fail('claim'),record:()=>assert.fail('record'),now:()=>now}));}
 const m=armed();for(const patch of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},{VERCEL_GIT_COMMIT_SHA:'d'.repeat(40)},{VERCEL_PROJECT_ID:'prj_wrong'},{HIRING_PREVIEW_RUN_ID:'wrong'},{OPENAI_BASE_URL:'https://alternate.invalid'}])assert.throws(()=>validateManifest(m,{...env(m),...patch},now));
});
test('native two-round flow preserves subtotal, provenance, current reference and six-hire handoff without save',async()=>{
 const h=harness(),result=await h.run();assert.equal(result.completed,true);assert.equal(result.attempts,2);assert.equal(h.requests.length,2);assert.equal(result.reply.usage.toolCalls,1);assert.equal(result.reply.usage.modelRounds,2);assert.equal(result.reply.state.hiringBudget.inputs.hires,10);assert.equal(result.selection.facts.externalSubtotal,924000);assert.equal(result.selection.facts.remainingBeforeUnknownCosts,76000);assert.equal(result.selection.facts.fullCost,null);assert.equal(result.selection.facts.internalAvailability,null);assert.equal(result.reply.state.hiringBudget.origins.annualBasePay.kind,'user-supplied');assert.deepEqual(h.requests.map(r=>r.payload.tool_choice),['auto','auto']);assert.ok(h.requests.every(r=>r.payload.max_output_tokens===5000&&r.payload.truncation==='disabled'));assert.equal(h.records.at(-1).fullAcceptance,false);assert.equal(h.records.at(-1).browserAcceptance,false);if(process.env.HIRING_OFFLINE_RECEIPT_PATH)writeFileSync(process.env.HIRING_OFFLINE_RECEIPT_PATH,JSON.stringify({...h.records.at(-1),synthetic:true}));
});
test('third call is forbidden before dispatch, even after a valid final',async()=>{
 const {g,payload}=await prepared();await g.before(payload,signal());const response=second(payload);await g.accept(response,response.output);await assert.rejects(g.before(payload,signal()),/call_limit_or_state/);assert.equal(g.attempts,2);
});
test('failure consumes the attempt and cannot be retried with the same guard',async()=>{
 const g=createGuard(fixtureRequest()),p=modelPayload(fixtureRequest(),[],false,{});await g.before(p,signal());g.failed();await assert.rejects(g.before(p,signal()),/call_limit_or_state/);assert.equal(g.attempts,1);
 const h=harness([()=>{throw Error('Synthetic provider failure');}]),r=await h.run();assert.equal(r.completed,false);assert.equal(h.requests.length,1);assert.equal(h.records.at(-1).retainedMicrousd,11715000);
});
test('invalid first tools, multiple tools, plain final and incomplete first output stop after one call',async()=>{
 for(const change of [r=>r.output[0].name='read_evidence',r=>r.output.push({...r.output[0],call_id:'second'}),r=>{r.output=[];r.output_text=JSON.stringify(final('invented'));},r=>r.status='incomplete',r=>r.service_tier='priority',r=>r.usage.output_tokens=5001,r=>r.usage=null]){
  const h=harness([()=>{const r=first();change(r);return r;}]),r=await h.run();assert.equal(r.completed,false);assert.equal(h.requests.length,1);
 }
});
test('invalid native inputs and invented cost completeness stop without buying a repair round',async()=>{
 for(const change of [rows=>rows.find(c=>c.field==='hires').value=6,rows=>rows.find(c=>c.field==='annualBasePay').value=null,rows=>rows.push({field:'otherCostsComplete',value:true,basis:rows[0].basis}),rows=>rows[0].basis={kind:'model-proposed',turnId:null,quote:null,explanation:'Invented role'}]){
  const h=harness([()=>{const r=first(),rows=changes();change(rows);r.output[0].arguments=JSON.stringify({changes:rows});return r;}]);const r=await h.run();assert.equal(r.completed,false);assert.equal(h.requests.length,1);
 }
});
test('missing, failed, altered and wrong-reference native receipts block the second dispatch',async()=>{
 for(const change of [p=>p.input=p.input.filter(i=>i.type!=='function_call_output'),p=>p.input.at(-1).output=JSON.stringify({ok:false,error:'Unknown'}),p=>{const r=JSON.parse(p.input.at(-1).output);r.planningGuidance.binding.reference='stale';p.input.at(-1).output=JSON.stringify(r);},p=>{const r=JSON.parse(p.input.at(-1).output);r.hiringBudget.listedCost=0;p.input.at(-1).output=JSON.stringify(r);},p=>p.input.at(-1).call_id='other']){const {g,payload}=await prepared();change(payload);await assert.rejects(g.before(payload,signal()));assert.equal(g.attempts,1);}
});
test('second tool request, incomplete JSON result, raw text and wrong reference never produce a completed reply',async()=>{
 for(const change of [r=>r.output=first().output,r=>r.status='incomplete',r=>r.output_text='valid prose is not typed JSON',r=>{const f=JSON.parse(r.output_text);f.answer.recommendedPlan.calculationRefs=['hiring-stale'];r.output_text=JSON.stringify(f);},r=>{const f=JSON.parse(r.output_text);f.answer={discussionOnly:'Confirm the budget.'};r.output_text=JSON.stringify(f);}]){const h=harness([first,p=>{const r=second(p);change(r);return r;}]),r=await h.run();assert.equal(r.completed,false);assert.equal(h.requests.length,2);assert.equal(h.records.some(r=>r.stage==='completed'),false);}
});
test('policy rejects retries/options, larger output, truncation, tools outside functions, or aborted work',async()=>{
 const p=modelPayload(fixtureRequest(),[],false,{});for(const patch of [{maxRetries:1},{max_output_tokens:5001},{truncation:'auto'},{tools:[{type:'web_search'}]},{model:'other'}]){const g=createGuard(fixtureRequest());await assert.rejects(g.before({...p,...patch},signal()));assert.equal(g.attempts,0);}
 const aborted=new AbortController();aborted.abort();await assert.rejects(createGuard(fixtureRequest()).before(p,aborted.signal));
});
test('receipts omit provider reasoning and credentials while retaining actual native outputs',async()=>{
 const h=harness([()=>{const r=first();r.output.unshift({type:'reasoning',summary:[{text:'PRIVATE_REASONING_SENTINEL'}]});return r;},second]);const r=await h.run();assert.equal(r.completed,true);const text=JSON.stringify(h.records);assert.doesNotMatch(text,/PRIVATE_REASONING_SENTINEL/);assert.match(text,/1540000/);assert.match(text,/924000/);
});
test('manual runner has no automatic hook, routes or count endpoint and independently caps transport attempts',()=>{
 const runner=readFileSync(new URL('./run.mjs',import.meta.url),'utf8'),plan=JSON.parse(readFileSync(new URL('./plan.json',import.meta.url),'utf8')),vercel=JSON.parse(readFileSync(new URL('../../../vercel.json',import.meta.url),'utf8'));
 assert.match(runner,/createGuardedFetch/);assert.match(runner,/maxRetries:0/);assert.match(runner,/openSync\(join\(output,stage\+'\.json'\),'wx'/);assert.equal(vercel.git.deploymentEnabled[branch],false);assert.equal(plan.bounds.countCalls,0);assert.equal(plan.reservationMicrousd,limits.reservedMicrousd);assert.ok(!readFileSync(new URL('../../../package.json',import.meta.url),'utf8').includes('hiring-preview'));
});

test('diagnostic uses the current Home model instructions, tools and response schema',async()=>{
 const {offlineBusinessRoute}=await import('../../helpers/offline-business-route.mjs');
 const route=await offlineBusinessRoute();route.sandbox.__replies.push(first(),{status:'completed',output:[],output_text:JSON.stringify({...final(''),answer:{discussionOnly:'Synthetic instruction-parity check only.'}})});
 await route.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':'legacy-v1:0'},body:JSON.stringify(fixtureRequest())}));
 const actual=JSON.parse(JSON.stringify(route.sandbox.__requests[0])),diagnostic=modelPayload(fixtureRequest(),[],false,{});
 for(const key of ['model','reasoning','service_tier','instructions','tools','text','tool_choice','parallel_tool_calls','max_output_tokens'])assert.deepEqual(diagnostic[key],actual[key],key);
});

test('transport independently permits only two POST attempts, excludes counts and denies redirect retries',async()=>{
 let calls=0;const fetch=createGuardedFetch(async(_input,init)=>{calls++;assert.equal(init.redirect,'error');if(calls===1)throw Error('Synthetic transport failure');return new Response('{}');});
 for(const [url,method] of [['https://api.openai.com/v1/responses/input_tokens','POST'],['https://other.invalid/v1/responses','POST'],['https://api.openai.com/v1/responses?x=1','POST'],['https://api.openai.com/v1/responses','GET']])await assert.rejects(fetch(url,{method}),/transport_scope_or_limit/);
 assert.equal(calls,0);await assert.rejects(fetch('https://api.openai.com/v1/responses',{method:'POST'}),/Synthetic/);await fetch('https://api.openai.com/v1/responses',{method:'POST'});await assert.rejects(fetch('https://api.openai.com/v1/responses',{method:'POST'}),/transport_scope_or_limit/);assert.equal(calls,2);
});
