import {conversationPlanCatalog} from '../lib/home-conversation-plan-catalog.ts';
import {conversationCatalog} from './fixtures/home-plan-conversation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {trackingPreviewBudgetEnabled,createTrackingPreviewBudget,trackingPreviewLimits} from '../lib/home-preview-budget.ts';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {emptyGoalProgress,HEADCOUNT_DEFINITION} from '../lib/goal-progress.ts';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/progress-target-context',HOME_TRACKING_QA_BUDGET:'v1'};
const base={model:'gpt-6.1-sol',service_tier:'default',input:[{role:'user',content:'Synthetic'}],max_output_tokens:5000};
test('only the explicit tracking Preview branch enables limits; production remains unchanged',()=>{
 assert.equal(trackingPreviewBudgetEnabled(env),true);
 for(const change of [{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL_GIT_COMMIT_REF:'other'},{HOME_TRACKING_QA_BUDGET:undefined}])assert.equal(trackingPreviewBudgetEnabled({...env,...change}),false);
 const twoSends=2*trackingPreviewLimits.rounds*(trackingPreviewLimits.inputTokens*2.5+trackingPreviewLimits.outputTokens*10)/1e6*1.1;
 assert.equal(twoSends,0.528);assert.equal(0.363+twoSends,0.891);
});
test('counts fail closed and two reservations cannot be exceeded after inference failure',async()=>{
 for(const count of [0,-1,NaN,1.5,40001,undefined])await assert.rejects(createTrackingPreviewBudget().prepare(base,async()=>({input_tokens:count})),/invalid input token count|exceeding/);
 await assert.rejects(createTrackingPreviewBudget().prepare(base,async()=>{throw Error('private failure');}),/count unavailable/);
 const budget=createTrackingPreviewBudget();let counts=0;
 for(let n=0;n<2;n++)assert.equal((await budget.prepare(base,async()=>{counts++;return {input_tokens:40000};})).max_output_tokens,2000);
 await assert.rejects(budget.prepare(base,async()=>{counts++;return {input_tokens:1};}),/maximum provider attempts/);assert.equal(counts,2);
 for(const change of [{model:'other'},{service_tier:'auto'},{previous_response_id:'x'},{conversation:'x'},{tools:[{type:'web_search'}]}])await assert.rejects(createTrackingPreviewBudget().prepare({...base,...change},async()=>{assert.fail('must reject before count');}),/unsupported|only local/);
});
test('pinned SDK sends identical full count/create payloads including schemas and continuation content',async()=>{
 const wire=[],client=new OpenAI({apiKey:'synthetic-only',maxRetries:0,fetch:async(url,init)=>{
  wire.push({url:String(url),body:JSON.parse(init.body)});
  return new Response(JSON.stringify(String(url).endsWith('/input_tokens')?{object:'response.input_tokens',input_tokens:40000}:{id:'synthetic',status:'completed',output:[]}),{headers:{'content-type':'application/json'}});
 }});
 const request={...base,instructions:'Policy',reasoning:{effort:'medium'},parallel_tool_calls:false,tool_choice:'none',tools:[{type:'function',name:'local',parameters:{type:'object',properties:{}},strict:true}],text:{format:{type:'json_schema',name:'result',schema:{type:'object',properties:{}}}},input:[...base.input,{type:'function_call_output',call_id:'a',output:'Accumulated result'}]};
 const prepared=await createTrackingPreviewBudget().prepare(request,b=>client.responses.inputTokens.count(b,{maxRetries:0}));
 await client.responses.create(prepared,{maxRetries:0});
 const {service_tier,max_output_tokens,...counted}=wire[1].body;
 assert.deepEqual(wire[0].body,counted);assert.equal(service_tier,'default');assert.equal(max_output_tokens,2000);assert.equal(request.max_output_tokens,5000);
});
test('actual route preserves real progress proposal and second-round final; budgets include all context',async()=>{
 const isolated=await offlineBusinessRoute();Object.assign(isolated.sandbox.process.env,env);isolated.sandbox.console={info(){},error(){}};
 const probe=await isolated.get(new Request('http://offline.invalid/api/home-solution-conversation'));assert.equal(probe.status,400);assert.equal(probe.headers.get('X-Tracking-Preview-Budget'),'v1; rounds=2; input=40000; output=2000');
 const counts=[];isolated.sandbox.__countTokens=async(body,options)=>{counts.push(JSON.parse(JSON.stringify(body)));assert.equal(options.maxRetries,0);assert.equal(options.timeout,15000);return {input_tokens:36813};};
 const text='Synthetic QA: maintain exactly 100 active employees across all countries, all business units and all levels through 2026-12-31. Freshness is 30 days. Report a complete 100 people on 2026-08-01 as baseline.';
 const body=solutionRequest(text,true);body.goal.statement='Maintain 100 active employees through 2026-12-31';body.catalog=conversationPlanCatalog({goalId:body.goal.id,goal:body.goal.statement},undefined,conversationCatalog().plans.map(({id,draft})=>({id,draft})));body.selectedId=null;body.goalProgress={version:1,goalId:body.goal.id,datasetToken:'legacy-v1:0',origin:'authored',ledger:emptyGoalProgress(body.goal.id,'authored'),unavailableReason:null};
 const spec={metric:'headcount',definition:HEADCOUNT_DEFINITION,unit:'people',scope:{country:'all',org:'all',level:'all'},measurement:{direction:'maintain',targetValue:100,targetDate:'2026-12-31',maxAgeDays:30,baselineId:null},observation:{value:100,date:'2026-08-01',complete:true,supersedes:null,useAsBaseline:true},basis:[{turnId:body.message.id,quote:text}]};
 isolated.sandbox.__replies.push(responseForStep({name:'propose_goal_progress',args:{spec}},1),responseForStep(final('Review the proposed progress entry.')));
 const send=()=>isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));
 const response=await send();const reply=await response.json();assert.equal(response.status,200,JSON.stringify(reply));assert.deepEqual(reply.progressProposal.spec,spec);assert.deepEqual(reply.progressProposal.blocking,[]);assert.equal(reply.usage.modelRounds,2);
 assert.equal(counts.length,2);assert.equal(counts[1].tool_choice,'none');assert.ok(counts[1].input.some(item=>item.type==='function_call_output'));
 for(const [i,request] of isolated.sandbox.__requests.entries()){
  const {service_tier,max_output_tokens,...same}=JSON.parse(JSON.stringify(request));assert.deepEqual(counts[i],same);assert.equal(max_output_tokens,2000);assert.equal(service_tier,'default');assert.equal(isolated.sandbox.__requestOptions[i].maxRetries,0);
  assert.ok(request.tools.some(t=>t.name==='propose_goal_progress'));assert.ok(request.text.format.schema);assert.ok(request.instructions.length>30000);
 }
 // The same real route rejects oversized initial input before any inference.
 isolated.sandbox.__requests.length=0;isolated.sandbox.__countTokens=async()=>({input_tokens:40001});
 const blocked=await send();assert.equal(blocked.status,422);assert.match((await blocked.json()).error,/Tracking Preview budget/);assert.equal(isolated.sandbox.__requests.length,0);
 // Count-only server mode always stops before inference, for fitting and oversized inputs.
 isolated.sandbox.process.env.HOME_TRACKING_QA_COUNT_ONLY='true';
 for(const tokens of [36813,41000,NaN]){
  isolated.sandbox.__countTokens=async()=>({input_tokens:tokens});
  const inspected=await send(),packet=await inspected.json();assert.equal(inspected.status,422);assert.equal(isolated.sandbox.__requests.length,0);
  assert.equal(packet.budgetDiagnostic.inputTokens,Number.isNaN(tokens)?null:tokens);assert.equal(packet.budgetDiagnostic.countOnly,true);
  assert.equal(packet.budgetDiagnostic.reason,Number.isNaN(tokens)?'count_invalid':tokens>40000?'input_limit':'count_only');
  assert.ok(packet.budgetDiagnostic.serializedBytes>100000);assert.ok(packet.budgetDiagnostic.toolSchemaBytes>50000);
 }
 assert.match((await isolated.get(new Request('http://offline.invalid/api/home-solution-conversation'))).headers.get('X-Tracking-Preview-Budget'),/mode=count-only/);
 delete isolated.sandbox.process.env.HOME_TRACKING_QA_COUNT_ONLY;
 // A continuation recount includes the tool result; rejection cannot dispatch round two.
 let n=0;isolated.sandbox.__countTokens=async()=>({input_tokens:++n===1?36813:40001});
 isolated.sandbox.__replies.push(responseForStep({name:'propose_goal_progress',args:{spec}},2));
 const continuation=await send();assert.equal(continuation.status,422);assert.match((await continuation.json()).error,/Tracking Preview budget/);assert.equal(isolated.sandbox.__requests.length,1);
 // Even a provider ignoring final-only cannot trigger a third call or return a draft.
 isolated.sandbox.__requests.length=0;isolated.sandbox.__countTokens=async()=>({input_tokens:36813});
 isolated.sandbox.__replies.push(responseForStep({name:'read_clock',args:{}},3),responseForStep({name:'read_clock',args:{}},4));
 const exhausted=await send();assert.equal(exhausted.status,422);assert.equal((await exhausted.json()).progressProposal,undefined);assert.equal(isolated.sandbox.__requests.length,2);
 // The opt-in cannot reduce production output or introduce a token-count dependency.
 isolated.sandbox.process.env.VERCEL_ENV='production';isolated.sandbox.__requests.length=0;
 isolated.sandbox.__countTokens=async()=>assert.fail('production must not count');
 isolated.sandbox.__replies.push(responseForStep(final('No progress was recorded.')));
 assert.equal((await send()).status,200);assert.equal(isolated.sandbox.__requests[0].max_output_tokens,5000);
 assert.equal((await isolated.get(new Request('http://offline.invalid/api/home-solution-conversation'))).headers.get('X-Tracking-Preview-Budget'),null);

});
