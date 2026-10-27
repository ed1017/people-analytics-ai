import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_9037 as P} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
import {createPublicPlannerRoundBoundary as boundary,createPublicPlannerProvider,publicPlannerReadiness,plannerWorstChargeMicroUsd,readPublicPlannerPolicy,PUBLIC_PLANNER_ROUTE_LIMITS} from '../releases/2026-10-21/source/lib/public-planner-round.server.mjs';
const NOW=Date.parse('2026-10-20T15:00:00Z'),context='a'.repeat(64);
// Invented accounting rates; not a live price policy.
const policy=(route='chat',patch={})=>({id:'invented-test-policy',route,model:PUBLIC_PLANNER_ROUTE_LIMITS[route].model,verifiedAt:'2026-10-20T14:00:00Z',validUntil:'2026-10-21T00:00:00Z',contextTokens:1050000,maxOutputTokens:PUBLIC_PLANNER_ROUTE_LIMITS[route].outputTokens,maxInputBytes:30000,maxRounds:PUBLIC_PLANNER_ROUTE_LIMITS[route].rounds,timeoutMs:500,inputMicroUsdPerMillion:1,outputMicroUsdPerMillion:1,safetyBasisPoints:11000,reserveMicroUsd:2,...patch});
const spec=(route='chat')=>({model:PUBLIC_PLANNER_ROUTE_LIMITS[route].model,instructions:'Use supplied synthetic evidence.',input:[{role:'user',content:'Compare the plans.'}],tool_choice:'none',max_output_tokens:PUBLIC_PLANNER_ROUTE_LIMITS[route].outputTokens,store:false,service_tier:'default',...(route==='home-solution'?{reasoning:{effort:'medium'}}:{})});
const meta=(round=1,requestId='request-one')=>({requestId,contextId:context,datasetToken:P.token,round,signal:new AbortController().signal});
const result=s=>({status:'completed',model:s.model,output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Checked.'}]}],usage:{input_tokens:10,output_tokens:5,total_tokens:15}});
function ledger(cap=20,reserved=0){
 const rows=new Map();let attempts=0;
 return {get reserved(){return reserved;},get count(){return rows.size;},get attempts(){return attempts;},async admit(r,signal){
  attempts++;signal.throwIfAborted();
  if(rows.has(r.requestId)||reserved+r.reserveMicroUsd>cap)return {granted:false};
  reserved+=r.reserveMicroUsd;rows.set(r.requestId,structuredClone(r));
  return {...r,granted:true,reservationId:'row_'+rows.size};
 }};
}
function setup({p=policy(),db=ledger(),provider,resultHook,currentContext=()=>context,...rest}={}){
 const calls=[];const run=boundary({enabled:true,policy:p,admit:db.admit,provider:provider??(async(s,signal)=>{signal.throwIfAborted();calls.push(s);return resultHook?resultHook(s):result(s);}),currentContext,now:()=>NOW,...rest});
 return {run,db,calls};
}
test('disabled or missing policy never touches ledger or provider',async()=>{
 const db=ledger();let calls=0;
 for(const options of [{},{enabled:true},{enabled:false,policy:policy()}]){
  await assert.rejects(boundary({...options,admit:db.admit,provider:()=>calls++}).complete(spec(),meta()));
 }
 assert.equal(db.attempts,0);assert.equal(calls,0);
});
test('all five routes reserve each sequential model round before dispatch',async()=>{
 for(const route of Object.keys(PUBLIC_PLANNER_ROUTE_LIMITS)){
  const db=ledger(100),p=policy(route);let calls=0;
  const {run}=setup({p,db,provider:async s=>{calls++;assert.equal(db.count,calls);assert.equal(s.prompt_cache_options.mode,'explicit');assert.ok(Object.isFrozen(s));return result(s);}});
  for(let round=1;round<=p.maxRounds;round++)await run.complete(spec(route),meta(round));
  assert.equal(calls,p.maxRounds);assert.equal(db.reserved,2*p.maxRounds);
  await assert.rejects(run.complete(spec(route),meta(p.maxRounds+1)));assert.equal(db.count,p.maxRounds);
 }
});
test('parallel operations share atomic cap including existing reservations and exact replay rejection',async()=>{
 const db=ledger(20,4);
 const runs=Array.from({length:20},(_,i)=>setup({db}).run.complete(spec(),meta(1,'request-'+i)));
 const done=await Promise.allSettled(runs);
 assert.equal(done.filter(x=>x.status==='fulfilled').length,8);assert.equal(db.reserved,20);assert.equal(db.count,8);
 const replay=await Promise.allSettled(Array.from({length:20},(_,i)=>setup({db}).run.complete({...spec(),instructions:'Changed prompt'},meta(1,'request-'+i))));
 assert.equal(replay.filter(x=>x.status==='fulfilled').length,0);assert.equal(db.reserved,20);
});
test('policy supplies absent model and preserves encrypted reasoning replay',async()=>{
 const f=setup(),s=spec();delete s.model;
 s.include=['reasoning.encrypted_content'];
 s.input.push({type:'reasoning',id:'rs_synthetic',encrypted_content:'synthetic-only',summary:[]});
 await f.run.complete(s,meta());
 assert.equal(f.calls[0].model,'gpt-5.6-luna');
 assert.deepEqual(f.calls[0].include,['reasoning.encrypted_content']);
 assert.equal(f.calls[0].input[1].encrypted_content,'synthetic-only');
 const bad=setup();await assert.rejects(bad.run.complete({...s,model:'other'},meta()));
 assert.equal(bad.db.count,0);
});
test('provider failure, invalid usage and incomplete output keep reservations and forbid retries',async()=>{
 for(const provider of [()=>{throw Error('secret provider details');},s=>({...result(s),status:'incomplete'}),s=>({...result(s),usage:{input_tokens:1050001,output_tokens:1,total_tokens:1050002}})]){
  const f=setup({provider});await assert.rejects(f.run.complete(spec(),meta()),error=>['planner_round_unavailable','planner_provider_invalid','planner_usage_invalid'].includes(error.reason));
  assert.equal(f.db.reserved,2);await assert.rejects(f.run.complete(spec(),meta(2)));assert.equal(f.db.count,1);
 }
});
test('mismatched grant fields, extensions and denial cannot dispatch',async()=>{
 for(const mutate of [r=>({...r,granted:false}),r=>({...r,contextId:'b'.repeat(64)}),r=>({...r,reserveMicroUsd:1}),r=>({...r,policyId:'other'}),r=>({...r,extra:true})]){
  let calls=0;const f=setup({admit:async r=>mutate({...r,granted:true,reservationId:'row_1'}),provider:()=>calls++});
  await assert.rejects(f.run.complete(spec(),meta()));assert.equal(calls,0);
 }
});
test('expired, underreserved or wrong model policy never reserves',async()=>{
 for(const p of [policy('chat',{validUntil:'2026-10-20T15:00:00Z'}),policy('chat',{reserveMicroUsd:0}),policy('chat',{inputMicroUsdPerMillion:100000000}),policy('chat',{model:'other'}),policy('chat',{maxRounds:7})]){
  const f=setup({p});await assert.rejects(f.run.complete(spec(),meta()));assert.equal(f.db.count,0);
 }
 assert.equal(plannerWorstChargeMicroUsd(policy()),2);
 assert.throws(()=>readPublicPlannerPolicy({...policy(),unknown:true}));
});
test('provider options, built-in tools, media and cache writes are rejected before reserve',async()=>{
 const variants=[
  {...spec(),previous_response_id:'resp_old'},{...spec(),store:true},{...spec(),service_tier:'priority'},
  {...spec(),reasoning:{effort:'minimal'}},
  {...spec(),tools:[{type:'web_search'}],tool_choice:'auto'},{...spec(),input:[{role:'user',content:[{type:'input_image',image_url:'https://example.invalid/a'}]}]},
  {...spec(),input:[{role:'user',content:[{type:'input_text',text:'x',prompt_cache_breakpoint:{mode:'explicit'}}]}]},
  {...spec(),prompt_cache_options:{mode:'implicit'}},{...spec(),max_output_tokens:10001},{...spec(),input:[{role:'user',content:'x'.repeat(40000)}]},
 ];
 for(const value of variants){const f=setup();await assert.rejects(f.run.complete(value,meta()));assert.equal(f.db.attempts,0);}
});
test('same-instance parallel/replayed/skipped rounds and identity drift fail closed',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),f=setup({provider:async s=>{await gate;return result(s);}});
 const first=f.run.complete(spec(),meta());await assert.rejects(f.run.complete(spec(),meta(2)));release();await first;
 await assert.rejects(f.run.complete(spec(),meta()));await assert.rejects(f.run.complete(spec(),meta(3)));
 await assert.rejects(f.run.complete(spec(),{...meta(2),contextId:'b'.repeat(64)}));assert.equal(f.db.count,1);
});
test('currentness checked before reserve, after grant and after provider',async()=>{
 for(const failAt of [1,2,3]){
  let checks=0;const f=setup({currentContext:()=>++checks===failAt?'b'.repeat(64):context});
  await assert.rejects(f.run.complete(spec(),meta()));
  assert.equal(f.db.count,failAt===1?0:1);assert.equal(f.calls.length,failAt===3?1:0);
 }
});
test('ignored abort while admission pending cannot cause a late provider call',async()=>{
 const db=ledger();let release,calls=0,seen;
 const f=setup({p:policy('chat',{timeoutMs:10}),admit:async(r,s)=>{seen=s;await new Promise(resolve=>release=resolve);return db.admit(r,new AbortController().signal);},provider:()=>calls++});
 await assert.rejects(f.run.complete(spec(),meta()));assert.equal(seen.aborted,true);release();
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(db.count,1);assert.equal(calls,0);
});
test('late provider output is refused without refund and request metadata is captured',async()=>{
 let release,seen;const f=setup({p:policy('chat',{timeoutMs:10}),provider:async(s,signal)=>{seen=signal;await new Promise(resolve=>release=resolve);return result(s);}});
 await assert.rejects(f.run.complete(spec(),meta()));assert.equal(f.db.count,1);assert.equal(seen.aborted,true);release();
 const db=ledger();let next;const g=setup({db,currentContext:async()=>{if(!next)await new Promise(resolve=>next=resolve);return context;}});
 const m=meta(),pending=g.run.complete(spec(),m);m.requestId='changed';m.contextId='b'.repeat(64);next();await pending;
 assert.equal(db.count,1);
});
test('HTTP provider uses one fixed request with no redirects/retries and builds output_text',async()=>{
 const requests=[],provider=createPublicPlannerProvider({apiKey:'invented-key',transport:async(url,init)=>{requests.push({url,init});return Response.json(result(spec()));}});
 const value=await provider(spec(),new AbortController().signal);
 assert.equal(requests.length,1);assert.equal(requests[0].url,'https://api.openai.com/v1/responses');assert.equal(requests[0].init.redirect,'error');assert.equal(value.output_text,'Checked.');
 let calls=0;const fail=createPublicPlannerProvider({apiKey:'invented-key',transport:async()=>{calls++;return new Response('',{status:503});}});
 await assert.rejects(fail(spec(),new AbortController().signal));assert.equal(calls,1);
});
test('readiness requires fresh exact enabled ledger state and never reserves',async()=>{
 const p=policy(),row={id:'public-9037-ai-initial-v1',cap_micro_usd:100000000,reserved_micro_usd:34,enabled:true,policy_id:p.id,per_call_micro_usd:p.reserveMicroUsd,pricing_valid_until:p.validUntil};
 const base={enabled:true,policy:p,now:()=>NOW,readLedgerStatus:async()=>row};
 assert.equal(await publicPlannerReadiness(base),true);
 for(const changed of [{enabled:false},{reserved_micro_usd:100000000},{policy_id:'other'},{cap_micro_usd:5000000},{cap_micro_usd:20000000},{cap_micro_usd:30000000},{per_call_micro_usd:1},{pricing_valid_until:'2026-10-20T15:00:00Z'},{extra:true}]){
  assert.equal(await publicPlannerReadiness({...base,readLedgerStatus:async()=>({...row,...changed})}),false);
 }
 assert.equal(await publicPlannerReadiness({...base,readLedgerStatus:undefined}),false);
 assert.equal(await publicPlannerReadiness({...base,enabled:false}),false);
});
test('pre-aborted readiness never starts a rejecting ledger read',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const unhandled=[],record=error=>unhandled.push(error);
 process.on('unhandledRejection',record);
 try{
  assert.equal(await publicPlannerReadiness({enabled:true,policy:policy(),now:()=>NOW,signal:controller.signal,readLedgerStatus:async()=>{calls++;throw Error('probe');}}),false);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,0);assert.deepEqual(unhandled,[]);
 }finally{process.off('unhandledRejection',record);}
});
test('documented optional reasoning content is preserved through admitted replay',async()=>{
 for(const content of [undefined,null,[],[{type:'reasoning_text',text:'Synthetic reasoning fixture.'}]]){
  const f=setup(),s=spec();const item={type:'reasoning',id:'rs_fixture',encrypted_content:'opaque-fixture',summary:[],...(content===undefined?{}:{content})};s.input.push(item);
  await f.run.complete(s,meta());assert.equal(f.db.count,1);assert.deepEqual(f.calls[0].input[1],item);
 }
});
test('reasoning content keeps strict item schema encryption and unknown-field rejection before admission',async()=>{
 const base={type:'reasoning',id:'rs_fixture',encrypted_content:'opaque-fixture',summary:[],content:[]};
 const invalid=[{...base,content:'text'},{...base,content:{}},{...base,content:[null]},{...base,content:[{type:'output_text',text:'x'}]},{...base,content:[{type:'reasoning_text',text:1}]},{...base,content:[{type:'reasoning_text',text:'x',extra:true}]},{...base,extra:true},{...base,encrypted_content:null}];
 const missing={...base};delete missing.encrypted_content;invalid.push(missing);
 for(const item of invalid){const f=setup(),s=spec();s.input.push(item);await assert.rejects(f.run.complete(s,meta()));assert.equal(f.db.count,0);assert.equal(f.calls.length,0);}
});


test('Home admission below the fixed reservation preserves ledger and never calls provider',async()=>{
 const db=ledger(20000000,15202466),p=policy('home-solution',{reserveMicroUsd:4800000});
 const f=setup({p,db});await assert.rejects(f.run.complete(spec('home-solution'),meta()),e=>e.name==='PublicPlannerAdmissionError'&&e.message==='planner_admission_unavailable');
 assert.equal(db.reserved,15202466);assert.equal(db.count,0);assert.equal(f.calls.length,0);
});

test('bounded Home policy covers full context and enforced output; no discounted old policy',async()=>{
 const p=policy('home-solution',{id:'planner-sol-4k-20261022-v1',inputMicroUsdPerMillion:4000000,outputMicroUsdPerMillion:15000000,reserveMicroUsd:4686000});
 assert.equal(plannerWorstChargeMicroUsd(p),4686000);assert.equal(p.maxOutputTokens,4000);
 const db=ledger(20000000,15202466),a=setup({p,db});
 await assert.rejects(a.run.complete({...spec('home-solution'),max_output_tokens:4001},meta()));assert.equal(db.attempts,0);assert.equal(a.calls.length,0);
 const x=setup({p,db});await x.run.complete(spec('home-solution'),meta());assert.equal(x.calls[0].max_output_tokens,4000);assert.equal(db.reserved,19888466);
 const y=setup({p,db});await assert.rejects(y.run.complete(spec('home-solution'),meta(1,'another-request')));assert.equal(y.calls.length,0);assert.equal(db.reserved,19888466);
 assert.throws(()=>readPublicPlannerPolicy({...p,reserveMicroUsd:4685999}));
});
