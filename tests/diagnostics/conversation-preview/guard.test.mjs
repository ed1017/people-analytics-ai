import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {application,applicationTree,branch,question,binding,limits,model} from './config.mjs';
import {hash,validateManifest,checkPayload,createControl} from './guard.mjs';
const payload=()=>({model:model.id,reasoning:{effort:model.reasoning},service_tier:model.serviceTier,instructions:'Fixed offline prompt',input:[],tools:[],text:{format:{}},tool_choice:'auto',parallel_tool_calls:false,max_output_tokens:5000});
const options=()=>({maxRetries:0,timeout:60000,signal:new AbortController().signal});
const response=()=>({id:'resp-offline',model:model.id,status:'completed',service_tier:'default',usage:{input_tokens:100,output_tokens:20}});
async function dispatch(c,p=payload(),r=response(),o=options()){const fetch=c.wrapFetch(async()=>new Response('{}'));return c.dispatch(p,o,async()=>{await fetch('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(p),signal:o.signal});return r;});}
function armed(){const at=Date.parse('2026-10-12T15:00:00Z'),sha='a'.repeat(40),m={version:1,kind:'conversation-deadline-one-shot',application,applicationTree,branch,questionSha256:hash(question),binding,limits,model,overlayCommit:sha,reviewerGo:true,parentRelease:true,reviewReceiptSha256:'b'.repeat(64),createdAt:new Date(at-1000).toISOString(),expiresAt:new Date(at+60000).toISOString()},env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:binding.projectId,VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:sha,CONVERSATION_PREVIEW_RUN_ID:binding.runId,CONVERSATION_PREVIEW_MANIFEST_SHA256:'c'.repeat(64),VERCEL_DEPLOYMENT_ID:'dpl_offline',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true',NEXT_PUBLIC_GOAL_PROGRESS:'true'};return {m,env,at};}
test('unreviewed/unreleased, changed reservation, wrong target/model/limits, overrides and expired manifests refuse',()=>{
 const {m,env,at}=armed();assert.equal(validateManifest(m,env,at),23430000);
 for(const patch of [{reviewerGo:false},{parentRelease:false},{binding:{...binding,reservationId:'old'}},{model:{...model,reasoning:'low'}},{limits:{...limits,generationCalls:5}},{application:'wrong'},{expiresAt:new Date(at).toISOString()}])assert.throws(()=>validateManifest({...m,...patch},env,at));
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'prj_other'},{VERCEL_GIT_COMMIT_SHA:'d'.repeat(40)},{CONVERSATION_PREVIEW_RUN_ID:'other'},{NEXT_PUBLIC_GOAL_PROGRESS:'false'},{OPENAI_BASE_URL:'https://other.invalid'},{SWP_DEMO_MODEL_PROFILE:'changed'}])assert.throws(()=>validateManifest(m,{...env,...patch},at));
});
test('full serialized byte limit includes UTF8/schema/tool/input; never trims',()=>{
 const p=payload();p.instructions='';const base=Buffer.byteLength(JSON.stringify(p));p.instructions='x'.repeat(limits.serializedBodyBytes-base);assert.equal(checkPayload(p),224000);p.instructions+='x';const before=JSON.stringify(p);assert.throws(()=>checkPayload(p));assert.equal(JSON.stringify(p),before);
 for(const field of ['instructions','input','tools','text']){const next=payload();next[field]=field==='instructions'?'😀'.repeat(60000):{data:'x'.repeat(224000)};assert.throws(()=>checkPayload(next));}
});
test('unknown provider fields, tier, output, truncation and paid tools refuse before dispatch',async()=>{
 for(const patch of [{previous_response_id:'id'},{service_tier:'ultrafast'},{max_output_tokens:5001},{reasoning:{effort:'medium',extra:true}},{truncation:'auto'},{tools:[{type:'web_search'}]}]){const c=createControl();await assert.rejects(dispatch(c,{...payload(),...patch}));assert.equal(c.wires,0);assert.equal(c.calls,0);}
});
test('four dispatches consume four wire slots before I/O; fifth refuses',async()=>{
 const events=[],c=createControl((stage,data)=>events.push({stage,...data}));for(let i=0;i<4;i++)await dispatch(c);await assert.rejects(dispatch(c));assert.equal(c.calls,4);assert.equal(c.wires,4);assert.deepEqual(events.filter(e=>e.stage.startsWith('wire')).map(e=>e.attempt),[1,2,3,4]);assert.ok(events.every(e=>e.reservedMicrousd===undefined||e.reservedMicrousd===23430000));
});
test('wire failure consumes its slot and stops retry, SDK replay and fallback',async()=>{
 const c=createControl(),p=payload(),o=options();let writes=0;const fetch=c.wrapFetch(async()=>{writes++;throw Error('offline disconnect');});await assert.rejects(c.dispatch(p,o,()=>fetch('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(p),signal:o.signal})));await assert.rejects(dispatch(c));assert.equal(c.wires,1);assert.equal(writes,1);
});
test('parallel invocations cannot allocate a second call; first is also stopped conservatively',async()=>{
 const c=createControl(),p=payload(),o=options(),wait=Promise.withResolvers(),fetch=c.wrapFetch(async()=>wait.promise);
 const first=c.dispatch(p,o,async()=>{await fetch('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(p),signal:o.signal});return response();});
 await assert.rejects(dispatch(c));wait.resolve(new Response('{}'));await assert.rejects(first);assert.equal(c.calls,1);assert.equal(c.wires,1);
});
test('missing usage, incomplete response, changed tier/model and excess usage stop continuation',async()=>{
 for(const patch of [{usage:null},{status:'incomplete'},{service_tier:'priority'},{model:'other'},{usage:{input_tokens:1050001,output_tokens:1}},{usage:{input_tokens:100,output_tokens:5001}}]){const c=createControl();await assert.rejects(dispatch(c,payload(),{...response(),...patch}));await assert.rejects(dispatch(c));assert.equal(c.wires,1);}
});
test('no count endpoint, redirects, unexpected body or changed payload reaches transport',async()=>{
 for(const [url,body] of [['https://api.openai.com/v1/responses/input_tokens',JSON.stringify(payload())],['https://other.invalid/v1/responses',JSON.stringify(payload())],['https://api.openai.com/v1/responses',JSON.stringify({...payload(),instructions:'changed'})]]){const c=createControl(),o=options();let writes=0;const fetch=c.wrapFetch(async()=>{writes++;return new Response('{}');});await assert.rejects(c.dispatch(payload(),o,()=>fetch(url,{method:'POST',body,signal:o.signal})));assert.equal(writes,0);assert.equal(c.wires,0);}
 const c=createControl(),p=payload(),o=options(),fetch=c.wrapFetch(async(_url,init)=>{assert.equal(init.redirect,'error');return new Response('{}');});await c.dispatch(p,o,async()=>{await fetch('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(p),signal:o.signal});return response();});
});
test('pre-dispatch and post-wire cancellation fail closed with no reclaimed allowance',async()=>{
 const before=new AbortController();before.abort();const a=createControl();await assert.rejects(dispatch(a,payload(),response(),{...options(),signal:before.signal}));assert.equal(a.wires,0);
 const after=new AbortController(),b=createControl(),p=payload(),o={...options(),signal:after.signal},fetch=b.wrapFetch(async()=>{after.abort();return new Response('{}');});await assert.rejects(b.dispatch(p,o,async()=>{await fetch('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(p),signal:o.signal});return response();}));assert.equal(b.wires,1);await assert.rejects(dispatch(b));
});
test('exclusive filesystem claim refuses duplicates/restarts in same build; fresh filesystem is explicitly outside that guarantee',()=>{
 const root=mkdtempSync(join(tmpdir(),'preview-claim-')),claim=join(root,binding.runId);mkdirSync(claim);assert.throws(()=>mkdirSync(claim),/EEXIST/);assert.throws(()=>mkdirSync(claim),/EEXIST/);
});

test('release expiry between SDK admission and wire send refuses network; receipt failure also fails closed',async()=>{
 let allowed=true,writes=0;const c=createControl(()=>{},()=>{if(!allowed)throw Error('Expired');}),p=payload(),o=options(),fetch=c.wrapFetch(async()=>{writes++;return new Response('{}');});
 await assert.rejects(c.dispatch(p,o,async()=>{allowed=false;await fetch('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify(p),signal:o.signal});return response();}));assert.equal(writes,0);assert.equal(c.wires,0);
 const broken=createControl(()=>{throw Error('Receipt unavailable');});await assert.rejects(dispatch(broken));assert.equal(broken.calls,1);assert.equal(broken.wires,0);
});


test('provider receipts omit raw IDs/text and reject unbounded metadata before serialization',async()=>{
 const secret='untrusted-provider-value-'.repeat(1000);
 for(const patch of [{status:secret},{model:secret},{service_tier:{value:secret}},{usage:{input_tokens:secret,output_tokens:20}},{usage:{input_tokens:100,output_tokens:20,total_tokens:Infinity}},{usage:{input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:101}}},{usage:{input_tokens:100,output_tokens:20,output_tokens_details:{reasoning_tokens:{value:secret}}}}]){
  const events=[],c=createControl((stage,data)=>events.push({stage,...data}));
  await assert.rejects(dispatch(c,payload(),{...response(),_request_id:secret,id:secret,...patch}));
  assert.deepEqual(events.find(e=>e.stage==='provider-1'),{stage:'provider-1',attempt:1,code:'provider_result_or_usage'});
  assert.ok(!JSON.stringify(events).includes('untrusted-provider-value'));assert.equal(c.wires,1);await assert.rejects(dispatch(c));
 }
 const events=[],c=createControl((stage,data)=>events.push({stage,...data}));
 await dispatch(c,payload(),{...response(),_request_id:secret,id:secret,output_text:secret,output:[null,{type:'function_call',arguments:secret}]});
 const receipt=events.find(e=>e.stage==='provider-1');assert.equal(receipt.hasOutputText,true);assert.equal(receipt.functionCalls,1);assert.ok(!JSON.stringify(events).includes('untrusted-provider-value'));
 assert.deepEqual(Object.keys(receipt).sort(),['stage','attempt','status','model','serviceTier','usage','functionCalls','hasOutputText'].sort());
});
