/** Real SDK + real POST, fake aggregate port and fake fetch. No credentials or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {compileRoute} from './bundle.mjs';
import {createControl,hash} from './guard.mjs';
import {question,binding,application,applicationTree,branch,limits,model} from './config.mjs';
import {claimStore} from './claim-store.mjs';
import {solutionRequest,candidate,evaluate,final} from '../../fixtures/home-solution-conversation.mjs';
const provider=(step,n)=>({id:'resp-offline-'+n,object:'response',status:'completed',model:'gpt-6.1-sol',service_tier:'default',usage:{input_tokens:2000,output_tokens:100,total_tokens:2100,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}},output:step.name?[{type:'function_call',call_id:'call-'+n,name:step.name,arguments:JSON.stringify(step.args),id:'fc-'+n,status:'completed'}]:[{id:'msg-'+n,type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(step),annotations:[]}]}]});
test('reviewed actual POST and real SDK use the bounded transport for one/two/four rounds and reject incomplete usage',async t=>{
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'conversation-preview-route-'));
 const modulePath=await compileRoute(process.cwd(),out,{offline:true});
 const saved={fetch:globalThis.fetch,key:process.env.OPENAI_API_KEY,home:process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION,progress:process.env.NEXT_PUBLIC_GOAL_PROGRESS};
 process.env.OPENAI_API_KEY='offline-only-key';process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION='true';process.env.NEXT_PUBLIC_GOAL_PROGRESS='true';
 try{
  const entry=createRequire(import.meta.url)(modulePath),{POST}=entry;
  await t.test('compiled existing client admits only paid claim; no claim or verification receipt reaches provider',async()=>{
   const now=Date.now(),sha='a'.repeat(40),manifest={version:1,kind:'conversation-deadline-one-shot',application,applicationTree,branch,questionSha256:hash(question),binding,limits,model,overlayCommit:sha,reviewerGo:true,parentRelease:true,reviewReceiptSha256:'b'.repeat(64),createdAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60000).toISOString()};
   const env={SUPABASE_URL:'https://'+claimStore.project+'.supabase.co',SUPABASE_SECRET_KEY:'offline-only-not-a-credential',VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:binding.projectId,VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:sha,CONVERSATION_PREVIEW_RUN_ID:binding.runId,CONVERSATION_PREVIEW_MANIFEST_SHA256:'c'.repeat(64),VERCEL_DEPLOYMENT_ID:'dpl_offline',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true',NEXT_PUBLIC_GOAL_PROGRESS:'true'},previous=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
   Object.assign(process.env,env);
   try{
    let admission,providerCalls=0;const rows=new Set(),events=[];
    globalThis.fetch=async(url,init)=>{
     const target=String(url);
     if(target==='https://'+claimStore.project+'.supabase.co/rest/v1/'+claimStore.table){
      assert.equal(init.method,'POST');const row=JSON.parse(init.body);events.push(row.claim_kind);if(rows.has(row.run_id))return new Response(JSON.stringify({code:'23505'}),{status:409});rows.add(row.run_id);return new Response(null,{status:201});
     }
     assert.equal(target,'https://api.openai.com/v1/responses');events.push('provider');providerCalls++;return new Response(JSON.stringify(provider(final('Company-wide evidence cannot establish a team ranking.'),1)),{headers:{'content-type':'application/json'}});
    };
    const request=()=>new Request('http://local.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(solutionRequest(question))});
    const guarded=()=>{const c=createControl(()=>{},()=>entry.assertPaidClaim(admission));globalThis.__conversationPreviewControl=c;return c;};
    guarded();assert.equal((await POST(request())).status,422);assert.equal(providerCalls,0);
    admission=Object.freeze({kind:'provider_free',paidAdmission:false});guarded();assert.equal((await POST(request())).status,422);assert.equal(providerCalls,0);assert.equal(rows.has(binding.runId),false);
    admission=await entry.claimPaidPreview(manifest,process.env);const control=guarded();assert.equal((await POST(request())).status,200);assert.equal(providerCalls,1);assert.equal(control.wires,1);control.stop();
    await assert.rejects(entry.claimPaidPreview(manifest,process.env));assert.deepEqual(events,['paid','provider','paid']);assert.equal(providerCalls,1);
   }finally{delete globalThis.__conversationPreviewControl;for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
  });
  for(const count of [1,2,4])await t.test(count+' round route preserves question, instructions, tools and calculation',async()=>{
   const c=candidate('pilot'),steps=count===1?[final('The supplied packet does not rank teams; confirm comparable evidence first.')]:count===2?[evaluate(c),final('Review the unconfirmed pilot.',[c.id])]:[{name:'read_clock',args:{}},{name:'read_evidence',args:{sourceIds:[]}},evaluate(c),final('Review the unconfirmed pilot.',[c.id])];
   const calls=[],control=createControl();globalThis.__conversationPreviewControl=control;
   globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://api.openai.com/v1/responses');calls.push(JSON.parse(init.body));return new Response(JSON.stringify(provider(steps.shift(),calls.length)),{headers:{'content-type':'application/json'}});};
   const body=solutionRequest(question);body.requestId=binding.runId;const before=structuredClone(body);
   const r=await POST(new Request('http://local.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':'legacy-v1:0'},body:JSON.stringify(body)})),reply=await r.json();
   assert.equal(r.status,200,JSON.stringify(reply));assert.equal(reply.usage.modelRounds,count);assert.equal(control.wires,count);assert.equal(control.calls,count);assert.deepEqual(body,before);
   assert.ok(calls.every(p=>p.model==='gpt-6.1-sol'&&p.reasoning.effort==='medium'&&p.service_tier==='default'&&p.max_output_tokens===5000&&p.parallel_tool_calls===false));assert.ok(calls[0].input[0].content.includes(question));assert.ok(calls[0].instructions.includes('same response as those tool calls'));assert.ok(calls[0].tools.some(t=>t.name==='evaluate_candidate'));
   control.stop();
  });
  await t.test('HTTP 429 is one wire attempt with no SDK or transport retry',async()=>{
   const control=createControl();globalThis.__conversationPreviewControl=control;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{message:'Offline rate limit',type:'rate_limit_error'}}),{status:429,headers:{'content-type':'application/json'}});};
   const body=solutionRequest(question),r=await POST(new Request('http://local.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));assert.equal(r.status,422);assert.equal(calls,1);assert.equal(control.wires,1);assert.equal(control.calls,1);
  });
  await t.test('missing usage fails once with no retry',async()=>{
   const control=createControl();globalThis.__conversationPreviewControl=control;globalThis.fetch=async()=>new Response(JSON.stringify({...provider(final('Not accepted.'),1),usage:null}),{headers:{'content-type':'application/json'}});
   const body=solutionRequest(question),r=await POST(new Request('http://local.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));assert.equal(r.status,422);assert.equal(control.wires,1);assert.equal(control.calls,1);
  });
 }finally{globalThis.fetch=saved.fetch;delete globalThis.__conversationPreviewControl;for(const [key,value] of [['OPENAI_API_KEY',saved.key],['NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION',saved.home],['NEXT_PUBLIC_GOAL_PROGRESS',saved.progress]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
