import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {createProviderPreviewGuard,providerPreviewEnabled,providerPreviewLimits,providerPreviewBranch,ProviderPreviewIncompleteError} from '../lib/home-provider-preview.ts';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedSteps,fixedChanges,liveStaffingMessage} from './fixtures/required-staffing.mjs';
import {requiresRequiredStaffing,canCompleteRequiredStaffingAlone} from '../lib/home-required-staffing.ts';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:providerPreviewBranch,VERCEL_GIT_COMMIT_SHA:'synthetic-reviewed-head'};
const signal=()=>new AbortController().signal;
const request=()=>({model:'gpt-6.1-sol',reasoning:{effort:'medium'},service_tier:'default',instructions:'Full original instructions.',input:[{role:'user',content:'Complete input 中文🙂'}],tools:[],text:{format:{type:'text'}},tool_choice:'auto',parallel_tool_calls:false,max_output_tokens:5000});
const provider=step=>({...responseForStep(step,0),model:'gpt-6.1-sol',service_tier:'default',usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:5}}});
async function route(overrides={}){const r=await offlineBusinessRoute({...env,...overrides});r.sandbox.console={info(){},error(){}};return {...r,submit:body=>r.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}))};}
test('exact Preview branch gate and full-context single-attempt reservation',()=>{
 assert.equal(providerPreviewEnabled(env),true);
 for(const e of [{},{...env,VERCEL_ENV:'production'},{...env,VERCEL_ENV:'development'},{...env,VERCEL_GIT_COMMIT_REF:'main'}])assert.equal(providerPreviewEnabled(e),false);
 assert.deepEqual(providerPreviewLimits,{contextTokens:1050000,outputTokens:5000,rounds:1});
 assert.equal((1050000*5+5000*15)*110/100/1e6,5.8575);
});
test('SDK permits one unchanged request and blocks the second before wire dispatch',async()=>{
 const wire=[],guard=createProviderPreviewGuard(),original=request(),before=structuredClone(original);
 const client=new OpenAI({apiKey:'synthetic-only',maxRetries:0,fetch:async(url,options)=>{wire.push({url:String(url),body:JSON.parse(options.body)});return Response.json({id:'synthetic',object:'response',status:'completed',output:[]});}});
 await client.responses.create(guard(original,signal()),{maxRetries:0,timeout:60000});
 await assert.rejects(async()=>client.responses.create(guard(original,signal()),{maxRetries:0}),ProviderPreviewIncompleteError);
 assert.equal(wire.length,1);assert.deepEqual(original,before);for(const item of wire){assert.equal(item.url,'https://api.openai.com/v1/responses');assert.deepEqual(item.body,{...before,truncation:'disabled'});}
});
test('changed policy, hidden state, hosted tools and cancellation stop before dispatch',()=>{
 for(const delta of [{model:'gpt-6-astra'},{reasoning:{effort:'low'}},{service_tier:'ultrafast'},{max_output_tokens:5001},{tools:[{type:'web_search'}]},{previous_response_id:'hidden'},{conversation:'hidden'},{truncation:'auto'},{parallel_tool_calls:true}])assert.throws(()=>createProviderPreviewGuard()({...request(),...delta},signal()),/Unsupported/);
 const controller=new AbortController();controller.abort(Error('cancelled'));assert.throws(()=>createProviderPreviewGuard()(request(),controller.signal),/cancelled/);
});
test('only the exact available staffing function can be forced through the Preview guard',()=>{
 const original={...request(),tools:[{type:'function',name:'compare_required_staffing',parameters:{},strict:true}],tool_choice:{type:'function',name:'compare_required_staffing'}};
 assert.deepEqual(createProviderPreviewGuard()(original,signal()).tool_choice,original.tool_choice);
 for(const delta of [{tools:[]},{tool_choice:{type:'function',name:'read_clock'}},{tool_choice:{...original.tool_choice,extra:true}},{tool_choice:'required'}])assert.throws(()=>createProviderPreviewGuard()({...original,...delta},signal()),/Unsupported/);
});
test('HTTP and timeout failures do not retry or fall back',async()=>{
 for(const mode of ['http','timeout']){
  const guard=createProviderPreviewGuard();
  let calls=0;const client=new OpenAI({apiKey:'synthetic-only',maxRetries:0,fetch:async()=>{calls++;assert.throws(()=>guard(request(),signal()),ProviderPreviewIncompleteError,'allowance consumed before provider dispatch');if(mode==='http')return Response.json({error:{message:'synthetic'}},{status:429});throw Object.assign(Error('synthetic'),{name:'AbortError'});}});
  await assert.rejects(client.responses.create(guard(request(),signal()),{maxRetries:0,timeout:60000}));assert.equal(calls,1);
  await assert.rejects(async()=>client.responses.create(guard(request(),signal()),{maxRetries:0}),ProviderPreviewIncompleteError);assert.equal(calls,1,'provider failure cannot permit fallback or repair dispatch');
 }
});
test('actual POST completes checked standalone staffing in one call within the single-attempt limit',async()=>{
 const r=await route(),body=solutionRequest(fixedMessages.start),steps=fixedSteps(body),before=JSON.stringify(body);
 r.sandbox.__replies.push(provider(steps[0]));
 const response=await r.submit(body),reply=await response.json();assert.equal(response.status,200);assert.match(reply.answer,/495000 USD/);assert.equal(reply.state.requiredStaffing.inputs.requiredRoles,10);assert.equal(reply.state.working.length,0);assert.equal(JSON.stringify(body),before);
 assert.equal(r.sandbox.__requests.length,1);assert.equal(reply.providerReceipt.modelAttempts,1);assert.equal(reply.providerReceipt.providerRounds.length,1);
 for(const sent of r.sandbox.__requests){assert.equal(sent.truncation,'disabled');assert.equal(sent.reasoning.effort,'medium');assert.equal(sent.service_tier,'default');assert.ok(sent.tools.some(t=>t.name==='compare_required_staffing'));assert.equal(sent.max_output_tokens,5000);}
 for(const options of r.sandbox.__requestOptions){assert.equal(options.maxRetries,0);assert.equal(options.timeout,60000);}
 assert.deepEqual(JSON.parse(JSON.stringify(r.sandbox.__requests[0].tool_choice)),{type:'function',name:'compare_required_staffing'});
 assert.deepEqual(JSON.parse(JSON.stringify(r.sandbox.__requests[0].tools.map(t=>t.name))),['compare_required_staffing']);
 const probe=await r.sandbox.module.exports.GET().json();assert.equal(probe.limits.rounds,1);assert.equal(probe.verification,'pr204-standalone-single-attempt-v1');assert.equal(probe.commit,'synthetic-reviewed-head');assert.equal(probe.ready,true);assert.equal(probe.solutionConversationEnabled,true);assert.equal(probe.endpoint,'/api/home-solution-conversation');assert.equal(probe.legacyChatBlocked,true);assert.equal(r.sandbox.__requests.length,1);
});
test('exact live Home fixture selects one staffing tool and completes within one Preview attempt',async()=>{
 // Fresh General exploration: empty goal/state, all workforce filters, no saved plan or scenario.
 const body=solutionRequest(liveStaffingMessage),before=JSON.stringify(body),r=await route();
 assert.equal(requiresRequiredStaffing(body),true);
 r.sandbox.__replies.push(provider({name:'compare_required_staffing',args:{changes:fixedChanges(body)}}));
 const response=await r.submit(body),reply=await response.json(),sent=r.sandbox.__requests[0];
 assert.equal(response.status,200,JSON.stringify({status:response.status,code:reply.code,toolCount:sent.tools.length,toolChoice:sent.tool_choice}));
 assert.equal(canCompleteRequiredStaffingAlone(body),true);
 assert.equal(r.sandbox.__requests.length,1);assert.equal(reply.providerReceipt.modelAttempts,1);
 assert.deepEqual(JSON.parse(JSON.stringify(sent.tools.map(t=>t.name))),['compare_required_staffing']);
 assert.deepEqual(JSON.parse(JSON.stringify(sent.tool_choice)),{type:'function',name:'compare_required_staffing'});
 assert.deepEqual(JSON.parse(JSON.stringify(reply.usage)),{modelRounds:1,toolCalls:1});
 assert.match(reply.answer,/495000 USD/);assert.match(reply.answer,/480 planned training hours/);
 assert.match(reply.answer,/Recommendation:.*conditional/);assert.match(reply.answer,/Next step:/);assert.match(reply.answer,/Nothing was saved or applied/);
 assert.equal(reply.state.requiredStaffing.inputs.hireTrainingHoursPerPerson,null);assert.equal(reply.state.working.length,0);assert.equal(JSON.stringify(body),before);
 for(const suffix of [' Also explain FTE.',' Also review an annual hiring budget for five designers.',' And save the plan.',' Fill 5 designer roles by hiring/training/redeploying.'])assert.equal(canCompleteRequiredStaffingAlone(solutionRequest(liveStaffingMessage+suffix)),false,suffix);
});
test('read-only preflight rejects a Preview built without the Home UI flag before any model request',async()=>{
 const r=await route({NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'false'}),response=r.sandbox.module.exports.GET(),probe=await response.json();
 assert.equal(response.status,503);assert.equal(probe.ready,false);assert.equal(probe.solutionConversationEnabled,false);assert.equal(r.sandbox.__requests.length,0);
 assert.equal((await r.submit(solutionRequest(fixedMessages.start))).status,404);assert.equal(r.sandbox.__requests.length,0);
});
test('compound staffing retains both tools but cannot bypass the Preview single-attempt cap',async()=>{
 const r=await route(),body=solutionRequest('Fill 10 engineering roles by hiring/training/redeploying. Also review an annual hiring budget for five designers.'),before=JSON.stringify(body);
 const steps=[{name:'compare_required_staffing',args:{changes:fixedChanges(body,{role:'Engineering roles',requiredRoles:10})}},{name:'review_hiring_budget',args:{changes:fixedChanges(body,{role:'Designers',hires:5,months:12})}}];let step=0;
 r.sandbox.__replies.shift=()=>{
  const sent=r.sandbox.__requests.at(-1),next=steps[step++];assert.ok(next,'No second provider request');assert.equal(sent.tool_choice,'auto');assert.equal(sent.parallel_tool_calls,false);
  for(const name of ['compare_required_staffing','review_hiring_budget'])assert.ok(sent.tools.some(tool=>tool.name===name));assert.ok(sent.tools.some(tool=>tool.name===next.name));
  return provider(next);
 };
 const response=await r.submit(body),reply=await response.json();assert.equal(response.status,422);assert.equal(reply.code,'preview_single_attempt_incomplete');assert.equal(step,1);assert.equal(r.sandbox.__requests.length,1);
 assert.equal(reply.providerReceipt.modelAttempts,1);assert.equal(reply.providerReceipt.providerRounds.length,1);assert.equal(reply.answer,undefined);assert.equal(reply.state,undefined);assert.equal(JSON.stringify(body),before);
});
test('actual POST returns explicit incomplete and receipts before a second call; production preserves ordinary continuation',async()=>{
 for(const production of [false,true]){
  const r=await route(production?{VERCEL_ENV:'production'}:{}),body=solutionRequest('Read the date, then explain.'),before=JSON.stringify(body);
  r.sandbox.__replies.push(provider({name:'read_clock',args:{}}),provider({name:'read_clock',args:{}}),provider(final('Review complete.')));
  const response=await r.submit(body),reply=await response.json();assert.equal(JSON.stringify(body),before);
  if(production){assert.equal(response.status,200);assert.equal(r.sandbox.__requests.length,3);assert.equal(reply.providerReceipt,undefined);assert.equal(r.sandbox.module.exports.GET().status,405);}
  else {assert.equal(response.status,422);assert.equal(reply.code,'preview_single_attempt_incomplete');assert.match(reply.error,/incomplete/);assert.equal(reply.answer,undefined);assert.equal(reply.state,undefined);assert.equal(r.sandbox.__requests.length,1);assert.equal(reply.providerReceipt.providerRounds.length,1);assert.equal(reply.providerReceipt.modelAttempts,1);}
 }
});
test('Preview actual-company and mixed requests still verify fresh grounding before a model call',async()=>{
 const r=await route(),data={as_of:'2026-09-30',summary:{headcount:100,fte:100}};
 for(const text of [fixedMessages.start.replace('Illustrative scenario: ','Actual company requirement: '),fixedMessages.start+' Check our actual workforce availability.']){
 const body=solutionRequest(text);
 body.evidence=buildHomePack({workforce:{status:'loaded',data}},body.scope);
 r.sandbox.__aggregateSources={workforce:{status:'loaded',data:{...data,summary:{headcount:101,fte:101}}}};
 const response=await r.submit(body),reply=await response.json();assert.equal(response.status,503);assert.equal(reply.code,'evidence_facts_changed');assert.equal(r.sandbox.__requests.length,0);assert.equal(reply.providerReceipt.modelAttempts,0);assert.equal(reply.answer,undefined);
 }
});

test('allowance is per request, not a shared duplicate-submission limit',()=>{
 const first=createProviderPreviewGuard(),duplicate=createProviderPreviewGuard();
 first(request(),signal());assert.throws(()=>first(request(),signal()),ProviderPreviewIncompleteError);
 assert.doesNotThrow(()=>duplicate(request(),signal()));
});
