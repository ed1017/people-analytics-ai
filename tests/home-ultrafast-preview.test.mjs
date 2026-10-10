/** Offline only: real SDK requests use a synthetic fetch; actual POST uses isolated fixtures. */
import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {createUltrafastPreviewGuard,ultrafastPreviewEnabled,ultrafastPreviewLimits,UltrafastPreviewIncompleteError} from '../lib/home-ultrafast-preview.ts';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {solutionRequest,candidate,quantity,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';

const flag={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/home-reviewed-plan-fast-path-20261010',HOME_ULTRAFAST_EXPERIMENT:'single-call-v1'};
const signal=()=>new AbortController().signal;
const request=()=>({model:'gpt-6.1-sol',reasoning:{effort:'medium'},service_tier:'ultrafast',instructions:'Retain every source and constraint. 中文🙂',input:[{role:'user',content:'Complete fictional context'},{type:'function_call',call_id:'c1',name:'read',arguments:'{}'},{type:'function_call_output',call_id:'c1',output:'Complete tool result'}],tools:[{type:'function',name:'read',parameters:{type:'object',properties:{},additionalProperties:false,required:[]},strict:true}],text:{format:{type:'json_schema',name:'answer',strict:true,schema:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false}}},tool_choice:'auto',parallel_tool_calls:false,max_output_tokens:5000});
const A='Create a fictional mentoring pilot for three people, five total hours each and 12 total coordination hours. Start October 2026 for three months. Cash, capacity and impact are unknown. Do not save.';
function scoped(){const c=candidate('mentoring');c.quantities=[quantity('participants',3,'people','c1'),quantity('hours_per_participant',5,'hours/person/total'),quantity('coordination_hours',12,'hours/total'),{...quantity('population',null,'text'),text:'Fictional mentoring cohort'},{...quantity('start_month',null,'YYYY-MM'),text:'2026-10'},quantity('horizon_months',3,'months')];return c;}
const ready=c=>({name:'evaluate_candidate',args:{candidate:c,constraintUpdates:[],readyForReview:true}});
const provider=step=>({...responseForStep(step,0),model:'gpt-6.1-sol',service_tier:'ultrafast',usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:40},output_tokens_details:{reasoning_tokens:5}}});
async function route(env=flag){const isolated=await offlineBusinessRoute(),logs=[];Object.assign(isolated.sandbox.process.env,env);isolated.sandbox.console={info:(...args)=>logs.push(args),error:(...args)=>logs.push(args)};return {...isolated,logs,submit:body=>isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}))};}

test('explicit branch-only gate and conservative full-context generation ceiling',()=>{
 assert.equal(ultrafastPreviewEnabled(flag),true);
 for(const env of [{},{...flag,VERCEL_ENV:'production'},{...flag,VERCEL_ENV:'development'},{...flag,VERCEL_GIT_COMMIT_REF:'main'},{...flag,HOME_ULTRAFAST_EXPERIMENT:'counted-v1'},{...flag,HOME_ULTRAFAST_EXPERIMENT:'true'}])assert.equal(ultrafastPreviewEnabled(env),false);
 assert.deepEqual(ultrafastPreviewLimits,{contextTokens:1050000,outputTokens:5000,rounds:1});
 const {contextTokens,outputTokens,rounds}=ultrafastPreviewLimits;
 assert.equal(rounds*(contextTokens*30+outputTokens*90)*110/100/1000000,35.145);
});

test('one SDK generation preserves complete context and schemas, with no count endpoint or second dispatch',async()=>{
 const wire=[],original=request(),before=structuredClone(original),guard=createUltrafastPreviewGuard();
 const client=new OpenAI({apiKey:'synthetic-only',maxRetries:0,fetch:async(url,options)=>{wire.push({url:String(url),body:JSON.parse(options.body)});return Response.json({id:'synthetic',object:'response',status:'completed',output:[]});}});
 const checked=guard(original,signal());await client.responses.create(checked,{maxRetries:0,timeout:60000,signal:signal()});
 assert.deepEqual(original,before);assert.deepEqual(checked,{...before,truncation:'disabled'});
 assert.deepEqual(wire,[{url:'https://api.openai.com/v1/responses',body:{...before,truncation:'disabled'}}]);
 await assert.rejects(async()=>client.responses.create(guard(original,signal()),{maxRetries:0}),UltrafastPreviewIncompleteError);assert.equal(wire.length,1);
});

test('unsupported context, hosted tools, policy changes and pre-abort fail before transport',()=>{
 for(const change of [{model:'gpt-6-astra'},{reasoning:{effort:'low'}},{service_tier:'default'},{max_output_tokens:5001},{tools:[{type:'web_search'}]},{previous_response_id:'hidden'},{conversation:'hidden'},{truncation:'auto'},{parallel_tool_calls:true},{tool_choice:'required'}])assert.throws(()=>createUltrafastPreviewGuard()({...request(),...change},signal()),/Unsupported/);
 const control=new AbortController();control.abort(Error('cancelled'));assert.throws(()=>createUltrafastPreviewGuard()(request(),control.signal),/cancelled/);
});

test('SDK HTTP and timeout failures make one attempt with no retry or tier fallback',async()=>{
 for(const mode of ['http','timeout']){
  const wire=[],guard=createUltrafastPreviewGuard(),client=new OpenAI({apiKey:'synthetic-only',maxRetries:0,fetch:async(url,options)=>{
   wire.push({url:String(url),body:JSON.parse(options.body)});
   if(mode==='http')return Response.json({error:{message:'synthetic rate limit'}},{status:429,headers:{'retry-after':'0'}});
   throw Object.assign(Error('synthetic timeout'),{name:'AbortError'});
  }});
  await assert.rejects(client.responses.create(guard(request(),signal()),{maxRetries:0,timeout:60000}),error=>mode==='http'?error.status===429:error.constructor.name==='APIConnectionTimeoutError');
  assert.throws(()=>guard(request(),signal()),UltrafastPreviewIncompleteError);assert.equal(wire.length,1);assert.equal(wire[0].url,'https://api.openai.com/v1/responses');assert.equal(wire[0].body.service_tier,'ultrafast');
 }
});

test('actual Preview POST keeps the checked 27-hour fast path, unknowns, complete payload and explicit save boundary',async()=>{
 const isolated=await route(),body=solutionRequest(A),before=JSON.stringify(body);isolated.sandbox.__replies.push(provider(ready(scoped())));
 const response=await isolated.submit(body),reply=await response.json();assert.equal(response.status,200);const item=reply.state.working.at(-1);
 assert.deepEqual(item.blocking,[]);assert.equal(item.result.deliveryEstimate.hours,27);assert.equal(item.result.cashEstimate.cash,null);assert.equal(item.draft.inputs.capacity,null);assert.equal(item.draft.inputs.whatIf,undefined);assert.equal(item.draft.inputs.successMeasure.target.value,null);
 assert.equal(reply.answer,'Action Plan ready for review; not saved or applied.');assert.equal(reply.usage.modelRounds,1);assert.equal(JSON.stringify(body),before);assert.equal(body.catalog,null);
 const sent=isolated.sandbox.__requests[0];assert.equal(isolated.sandbox.__requests.length,1);assert.equal(sent.model,'gpt-6.1-sol');assert.equal(sent.reasoning.effort,'medium');assert.equal(sent.service_tier,'ultrafast');assert.equal(sent.max_output_tokens,5000);assert.equal(sent.truncation,'disabled');assert.equal(sent.tool_choice,'auto');assert.ok(sent.tools.every(tool=>tool.type==='function'));
 const ordinary=await route({VERCEL_ENV:'production'});ordinary.sandbox.__replies.push(provider(ready(scoped())));assert.equal((await ordinary.submit(body)).status,200);
 const normal=JSON.parse(JSON.stringify(ordinary.sandbox.__requests[0]));assert.deepEqual(JSON.parse(JSON.stringify(sent)),{...normal,service_tier:'ultrafast',truncation:'disabled'},'Tier and disabled truncation are the only model payload differences');
 assert.equal(reply.diagnostics.providerRounds[0].serviceTier,'ultrafast');assert.equal(reply.diagnostics.providerRounds[0].inputTokens,100);assert.ok(isolated.sandbox.__requestOptions.every(options=>options.maxRetries===0&&options.timeout===60000));
});

test('needed continuation, blocked scope, invalid citations and extra work fail incomplete without fabricated final',async()=>{
 const incomplete=ready(scoped());incomplete.args.readyForReview=false;
 const blocked=ready(scoped());blocked.args.constraintUpdates=[{action:'set',field:'max_hours',number:20,text:null,unit:'hours/total',turnId:'user-1'}];
 const citation=ready(scoped());citation.args.candidate.activities[0].evidenceIds=['made-up'];
 const isolated=await route();
 for(const step of [incomplete,blocked,ready(candidate()),citation,{name:'read_evidence',args:{sourceIds:['A1']}}]){
  isolated.logs.length=0;isolated.sandbox.__requests.length=0;isolated.sandbox.__replies.push(provider(step));const body=solutionRequest(A),before=JSON.stringify(body);
  const response=await isolated.submit(body),reply=await response.json();assert.equal(response.status,422);assert.equal(reply.code,'preview_single_call_incomplete');assert.match(reply.error,/needs another model round and is incomplete/);assert.equal(reply.answer,undefined);assert.equal(reply.state,undefined);assert.equal(JSON.stringify(body),before);assert.equal(isolated.sandbox.__requests.length,1);
  const diagnostic=isolated.logs[0][1];assert.equal(diagnostic.modelAttempts,1);assert.equal(diagnostic.providerRounds.length,1);assert.equal(diagnostic.providerRounds[0].inputTokens,100);assert.equal(diagnostic.providerRounds[0].outputTokens,20);assert.equal(diagnostic.providerRounds[0].serviceTier,'ultrafast');assert.ok(!JSON.stringify(isolated.logs).includes(A));
 }
});

test('production ignores the experiment flag and retains normal multiple rounds',async()=>{
 const isolated=await route({...flag,VERCEL_ENV:'production'}),first=ready(scoped());first.args.readyForReview=false;
 isolated.sandbox.__replies.push(provider(first),responseForStep(final('Review the assumptions.',['mentoring']),1));
 const response=await isolated.submit(solutionRequest(A)),reply=await response.json();assert.equal(response.status,200);assert.equal(reply.usage.modelRounds,2);assert.equal(reply.answer,'Review the assumptions.');assert.equal(isolated.sandbox.__requests.length,2);
 for(const sent of isolated.sandbox.__requests){assert.equal(sent.service_tier,'default');assert.equal(sent.reasoning.effort,'medium');assert.equal(sent.max_output_tokens,5000);assert.equal(sent.truncation,undefined);}
});

test('Preview provider failures and incomplete output fail normally without a retry or replacement final',async()=>{
 const isolated=await route(),shift=isolated.sandbox.__replies.shift;
 isolated.sandbox.__replies.shift=()=>{throw Object.assign(Error('synthetic failure'),{status:429});};
 let response=await isolated.submit(solutionRequest(A)),reply=await response.json();assert.equal(response.status,422);assert.equal(reply.code,'provider_http_error');assert.equal(isolated.sandbox.__requests.length,1);assert.equal(reply.answer,undefined);
 isolated.sandbox.__replies.shift=shift;isolated.sandbox.__requests.length=0;
 isolated.sandbox.__replies.push({status:'incomplete',output:[],output_text:'Do not pass off unfinished output as complete'});
 response=await isolated.submit(solutionRequest(A));reply=await response.json();assert.equal(response.status,422);assert.equal(reply.code,'response_validation_failed');assert.equal(isolated.sandbox.__requests.length,1);assert.equal(reply.answer,undefined);
});
