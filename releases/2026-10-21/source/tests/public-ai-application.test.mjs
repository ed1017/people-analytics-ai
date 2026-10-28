// Run from the approved serving checkout. Uses only projected public responses and fake accounting/provider ports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicAiApplication} from '../lib/public-ai-application.server.mjs';
import {PUBLIC_AI_ROUTES,readPublicAiCapabilityReceipt} from '../lib/public-ai-capabilities.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {PUBLIC_PLANNER_LEDGER,PUBLIC_PLANNER_CAP_MICRO_USD} from '../lib/public-planner-round.server.mjs';
import {PUBLIC_PLANNER_PRICE_GROUP,PUBLIC_PLANNER_PRICE_MAX_RESERVATION,publicPlannerPriceCandidate} from '../lib/public-planner-price-candidate.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {emptyWorkforcePlanInput} from '../lib/workforce-increment.ts';
import {developmentCatalog,quoteInputs} from '../lib/development-costs.ts';
import {createHomeDemoDraft} from '../lib/home-demo-goals.ts';
import {homeDemoExamples} from '../lib/home-demo-catalog.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createPlanAlternatives,packPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {analyticsToolDefinitions} from '../lib/analytics-tool-dispatch.mjs';
const NOW=Date.parse(publicPlannerPriceCandidate('plan').verifiedAt)+16*60*60*1000,hostname='people-analytics-test-ed-56dc.vercel.app',filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels';
const binding=await loadPublic9037Binding({hostname,production:false});
const response=await binding.handle(new Request('https://'+hostname+'/api/dashboard?'+new URLSearchParams(filters)));assert.equal(response.status,200);
const dashboard=await response.json(),pack=buildHomePack({dashboard:{status:'loaded',data:dashboard}},scope);
function http(path,body,id='app-test',host=hostname,method='POST'){
 return new Request('https://'+host+path,{method,headers:{'x-workforce-dataset':P.token,'x-workforce-request-id':id,...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{})});
}
const message=(text)=>({type:'message',id:'message-test',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]});
const raw=(spec,text='',calls=[])=>({id:'response-test',status:'completed',model:spec.model,usage:{input_tokens:10,output_tokens:10,total_tokens:20},output:calls.length?calls:[message(text)],output_text:text});
const tool=(name,args,id='call-test')=>({type:'function_call',id:'fc-test',status:'completed',call_id:id,name,arguments:JSON.stringify(args)});
function fixture(script,{reserved=0,deny=false,enabled=true,production=false,rowPatch={},now=()=>NOW,malformedGrant=false,settle,policyForRoute}={}){
 const grants=new Map(),events=[],specs=[];let attempts=0;
 const row=()=>({id:PUBLIC_PLANNER_LEDGER,cap_micro_usd:PUBLIC_PLANNER_CAP_MICRO_USD,reserved_micro_usd:reserved,enabled:true,policy_id:PUBLIC_PLANNER_PRICE_GROUP,per_call_micro_usd:PUBLIC_PLANNER_PRICE_MAX_RESERVATION,pricing_valid_until:publicPlannerPriceCandidate('plan').validUntil,...rowPatch});
 const admit=async(r,signal)=>{
  signal.throwIfAborted();attempts++;events.push('admit');
  assert.ok(Object.isFrozen(r));assert.match(r.requestId,/^planner_[a-f0-9]{64}$/);assert.match(r.contextId,/^[a-f0-9]{64}$/);
  assert.ok(['planner-sol-4k-20261022-v1','planner-luna-20261020-v1'].includes(r.policyId));
  const state=row();
  if(deny||!state.enabled||state.policy_id!==PUBLIC_PLANNER_PRICE_GROUP||Date.parse(state.pricing_valid_until)<=now()+30000||grants.has(r.requestId)||reserved+r.reserveMicroUsd>PUBLIC_PLANNER_CAP_MICRO_USD)return {granted:false};
  reserved+=r.reserveMicroUsd;grants.set(r.requestId,structuredClone(r));return {...r,granted:true,reservationId:'fake_'+grants.size,...(malformedGrant?{contextId:'wrong'}:{})};
 };
 const provider=async(spec,signal)=>{
  signal.throwIfAborted();assert.equal(events.at(-1),'admit');assert.equal(grants.size,specs.length+1);events.push('provider');specs.push(spec);
  assert.equal(spec.store,false);assert.equal(spec.service_tier,'default');assert.deepEqual(spec.prompt_cache_options,{mode:'explicit'});assert.equal(spec.parallel_tool_calls,spec.tools?.length?false:spec.parallel_tool_calls);assert.equal('previous_response_id' in spec,false);
  return script(spec,specs.length);
 };
 const app=createPublicAiApplication({options:{hostname,production},enabled,admit,settle,provider,now,policyForRoute});
 return {app,events,specs,grants,get reserved(){return reserved;},get attempts(){return attempts;}};
}
const home=()=>({version:1,requestId:'app-test',goal:{id:'goal1',statement:'Review workforce evidence'},scope,filters,timeZone:'UTC',evidence:structuredClone(pack),goalContext:null,selectedId:null,catalog:null,state:{version:1,verifiedMetrics:[],turns:[],constraints:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null},message:{id:'turn1',text:'Explain the available workforce evidence.'}});
const homeFinal=JSON.stringify({verifiedMetrics:[],answer:{discussionOnly:'The workforce evidence is synthetic.'},candidateIds:[],analysisIds:[],questions:[],constraintUpdates:[],rejected:[],focusCandidateId:null});
for(const [question,registryId,metric]of [
 ['Which country has the largest workforce?','workforce.countries','headcount'],
 ['Rank business units by recorded cost per FTE','finance.business_units','cost_per_fte_usd'],
 ['Which business units have the slowest average fills?','recruiting.business_units','avg_time_to_fill_days'],
 ['Which job profiles have the lowest pathway coverage?','learning.job_profiles','pathway_coverage_pct'],
])test('actual Home aggregate route: '+registryId,async()=>{
 const req={...home(),goal:{id:'',statement:''},message:{id:'turn1',text:question}};
 const f=fixture(spec=>{assert.ok(spec.tools.some(t=>t.name==='read_aggregate_comparison'));return raw(spec,'',[tool('read_aggregate_comparison',{registryId,metric,order:registryId==='learning.job_profiles'?'ascending':'descending',limit:3,scope:'company-wide',asOf:'current'})]);});
 const result=await f.app(http('/api/home-solution-conversation',req));assert.equal(result.status,200,JSON.stringify(await result.clone().json()));
 const answer=await result.json();assert.equal(f.specs.length,1);assert.equal(answer.usage.modelRounds,1);assert.equal(answer.usage.toolCalls,1);assert.equal(answer.charts.length,1);if(registryId==='learning.job_profiles')assert.match(answer.answer,/All 50 groups are tied/);else {assert.match(answer.answer,/Recorded as of 2026-09-30/);assert.match(answer.answer,/groups/);}assert.equal(answer.state.turns.at(-1).text,answer.answer);
 if(registryId!=='learning.job_profiles'){
  const [path,collection]=({'workforce.countries':['workforce','countries'],'finance.business_units':['finance','by_business_unit'],'recruiting.business_units':['talent-acquisition','business_units']})[registryId];
  const source=await(await binding.handle(new Request('https://'+hostname+'/api/'+path))).json();
  const maximum=Math.max(...source[collection].map(row=>row[metric]));assert.ok(answer.answer.includes(maximum.toLocaleString('en-US',{maximumFractionDigits:10})));assert.match(answer.answer,/highest to lowest/);
  assert.ok(answer.answer.includes(`all ${source[collection].length} groups`));
 }
});
test('aggregate scope and date limitations do not silently become current company facts',async()=>{
 for(const overrides of [{scope:'selected-or-other'},{asOf:'last year'}]){
  const f=fixture(spec=>raw(spec,'',[tool('read_aggregate_comparison',{registryId:'workforce.countries',metric:'headcount',order:'descending',limit:1,scope:'company-wide',asOf:'current',...overrides})]));
  const result=await f.app(http('/api/home-solution-conversation',{...home(),message:{id:'turn1',text:'Which country has the largest workforce?'}}));assert.equal(result.status,200);const answer=await result.json();assert.equal(f.specs.length,1);if(overrides.asOf){assert.match(answer.answer,/requested historical period comparison is unavailable/);assert.match(answer.answer,/Available data is dated 2026-09-30/);}else assert.match(answer.answer,/only/);assert.doesNotMatch(answer.answer,/highest to lowest/);
 }
});
for(const [registryId,metric,path,question]of [
 ['skills.largest_gaps','employees_below_or_missing_requirement','skills','Which listed skills have the largest gaps?'],
 ['skills.highest_demand','employees_in_roles_requiring_skill','skills','Which listed skills have the highest demand?'],
 ['skills.strongest_coverage','requirement_met_pct','skills','Which listed skills have the highest requirement coverage?'],
 ['pay.job_compa','mean_compa_pct','compensation-job-release','Which published job profile has the highest compa ratio?'],
 ['catalog.policy_bands','midpoint','compensation-ranges','Which listed job and level has the highest constructed midpoint?'],
])test('released catalogue/skills actual Home route: '+registryId,async()=>{
 // Avoid a conjunction in the final catalog prompt: this asks one composite dimension, not two analyses.
 const text=registryId==='catalog.policy_bands'?'Which listed job/level has the highest constructed midpoint?':question;
 const req={...home(),goal:{id:'',statement:''},message:{id:'turn1',text}};
 const f=fixture(spec=>{assert.ok(spec.tools.some(t=>t.name==='read_aggregate_comparison'));return raw(spec,'',[tool('read_aggregate_comparison',{registryId,metric,order:'descending',limit:1,scope:'company-wide',asOf:'current'})]);});
 const response=await f.app(http('/api/home-solution-conversation',req));assert.equal(response.status,200);const result=await response.json();assert.equal(f.specs.length,1);assert.equal(result.usage.toolCalls,1);assert.doesNotMatch(result.answer,/cannot be verified|No ranking/);
 const data=await(await binding.handle(new Request('https://'+hostname+'/api/'+path))).json();
 const rows=registryId.startsWith('skills.')?data[registryId.split('.')[1]]:registryId==='pay.job_compa'?data.rows.filter(r=>r.status==='published'):data.constructedPolicy.bands.filter(r=>data.jobs.some(j=>j.job_profile_code===r.job)&&data.levels.some(l=>l.level_code===r.level));
 const maximum=Math.max(...rows.map(r=>r[metric]));assert.ok(result.answer.includes(maximum.toLocaleString('en-US',{maximumFractionDigits:10})));
 if(registryId.startsWith('skills.'))assert.match(result.answer,/Ranking covers the available source list/);
 if(registryId==='pay.job_compa'){assert.match(result.answer,/48 available groups/);assert.match(result.answer,/2 groups excluded.*Withheld/);assert.match(result.answer,/Compa uses constructed policy midpoints/);}
 if(registryId==='catalog.policy_bands'){assert.match(result.answer,/all 550 groups/);assert.match(result.answer,/USD annual base at 1 FTE/);}
});
test('survey ranking actual Home route reads all eight grounded groups and accepts scoped factual answer',async()=>{
 const survey=await(await binding.handle(new Request('https://'+hostname+'/api/survey-sentiment'))).json();
 const evidence=buildHomePack({'survey-sentiment':{status:'loaded',data:survey}},scope);
 const comparison=evidence.sources.find(s=>s.id==='S1').facts.businessUnitComparison;
 assert.equal(comparison.rows.length,8);const low=[...comparison.rows].sort((a,b)=>a.favorable_pct-b.favorable_pct)[0];assert.equal(low.org_code,'BU-SALES');
 for(const question of ['which group has the lowest sentiment?','Which business unit has the lowest engagement favorability?']){
  const req={...home(),goal:{id:'',statement:''},evidence,message:{id:'turn1',text:question}};
  const f=fixture((spec,round)=>{
   if(round===1)return raw(spec,'',[tool('read_evidence',{sourceIds:['S1']})]);
   const output=JSON.parse(spec.input.findLast(x=>x.type==='function_call_output').output);
   const encoded=JSON.stringify(output);for(const row of comparison.rows)assert.ok(encoded.includes(row.org_code));
   assert.ok(encoded.includes('S1:businessUnit:7'));
   return raw(spec,JSON.stringify({...JSON.parse(homeFinal),answer:{discussionOnly:`Sales has the lowest engagement favorability across all eight released business units: ${low.favorable_pct}% among ${low.respondents} valid respondents as of ${comparison.asOf} [S1]. This measures survey favorability, not text sentiment; team and demographic breakdowns are unavailable.`}}));
  });
  const result=await f.app(http('/api/home-solution-conversation',req));assert.equal(result.status,200,JSON.stringify(await result.clone().json()));assert.equal(f.specs.length,2);assert.match((await result.json()).answer,/Sales/);
 }
});
test('normal Home default admits four sequential rounds below aggregate reserve with verified settlement',async()=>{
 let available=9622552,rounds=0;const reservations=new Map(),events=[];
 const app=createPublicAiApplication({options:{hostname,production:false},enabled:true,now:()=>NOW,
  admit:async r=>{events.push('admit');assert.equal(r.reserveMicroUsd,4686000);if(available<r.reserveMicroUsd)return {granted:false};available-=r.reserveMicroUsd;reservations.set(r.requestId,r);return {...r,granted:true,reservationId:r.requestId};},
  settle:async r=>{events.push('settle');assert.equal(r.receipt.status,'completed');assert.ok(reservations.has(r.requestId));available+=4686000-100000;return {settled:true};},
  provider:async spec=>{events.push('provider');rounds++;assert.equal(spec.tool_choice,rounds===4?'none':'auto');return {...raw(spec,rounds===4?homeFinal:'',rounds<4?[tool('read_evidence',{sourceIds:['W1']},'call-'+rounds)]:[]),id:'resp_normal_'+rounds,service_tier:'default',usage:{input_tokens:10,output_tokens:10,total_tokens:20,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}}};}});
 const req=http('/api/home-solution-conversation',home());assert.equal(req.headers.has('x-workforce-max-rounds'),false);
 const result=await app(req);assert.equal(result.status,200,JSON.stringify(await result.clone().json()));assert.equal((await result.json()).usage.modelRounds,4);assert.equal(rounds,4);assert.equal(reservations.size,4);assert.equal(available,9222552);assert.deepEqual(events,Array.from({length:4},()=>['admit','provider','settle']).flat());
});
test('normal Home preserves holds and denies third round when settlement is unconfirmed',async()=>{
 let available=9622552,rounds=0,attempts=0,settleCalls=0;
 const app=createPublicAiApplication({options:{hostname,production:false},enabled:true,now:()=>NOW,
  admit:async r=>{attempts++;if(available<r.reserveMicroUsd)return {granted:false};available-=r.reserveMicroUsd;return {...r,granted:true,reservationId:r.requestId};},
  settle:async()=>{settleCalls++;return {settled:false};},
  provider:async spec=>{rounds++;return {...raw(spec,'',[tool('read_evidence',{sourceIds:['W1']},'call-'+rounds)]),id:'resp_unconfirmed_'+rounds,service_tier:'default',usage:{input_tokens:10,output_tokens:10,total_tokens:20,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}}};}});
 const result=await app(http('/api/home-solution-conversation',home()));assert.equal(result.status,429);assert.equal(rounds,2);assert.equal(attempts,3);assert.equal(settleCalls,2);assert.equal(available,250552);
});
const homeChat={page:'home',message:'Explain current workforce size',overviewBriefingContext:pack,publicEvidenceContext:{filters,scope}};
const chatFinal=JSON.stringify({answer:'The public synthetic workforce has 9,037 people.',next_step:'none',finding_followups:[],problem:null,problem_evidence:[],options:[],question:null});
const intake={goal:'Plan additional capacity',statement:'Add 5 roles.',inputs:emptyWorkforcePlanInput()};
const intakeFinal=JSON.stringify({summary:{recommendation:{name:'Review staffing assumptions',rationale:'These are explicit planning assumptions.',steps:['Review before calculating.'],assumptions:[],caveats:['No operational action.']}},questions:[],changes:[{field:'roles',value:'5',evidence:'Add 5 roles.'}]});
const quote=developmentCatalog[0],capability={version:1,goal:'Compare conditional training costs',options:[{quote,goal:'Training',inputs:{...quoteInputs(quote),participants:'5',additionalFees:'0',hourlyCost:'20'}}],limits:{budget:'100000',employeeHours:'1000',minimumParticipants:'1',allowRevision:false},settings:{allowRevision:false,minFillRate:'',maxFillRate:''}};
async function plan(){
 const draft=createHomeDemoDraft(homeDemoExamples.find(x=>x.key!=='capacity'),'2026-10-20T12:00:00.000Z');draft.binding=await actionBinding(draft.binding.goalId,draft.binding.goal,pack,null);
 const context={goalId:draft.binding.goalId,goal:draft.binding.goal},catalog=packPlanAlternatives(createPlanAlternatives(context,[{id:'one',draft},{id:'two',draft}]));
 return {request:{version:1,requestId:'app-test',context,selectedId:'one',comparisonIds:['one','two'],text:'Compare these plans',catalog},current:{version:1,source:{datasetId:P.datasetId,datasetToken:P.token,publicDigest:binding.router.current().digest,cutoff:P.cutoff,provenance:'approved-public-projection-v1',contract:P.contract,publicationReceiptId:P.approval},goal:{id:context.goalId,statement:context.goal},filters,scope,evidence:pack,planningInputs:null},previous:[]};
}
const planFinal=JSON.stringify({version:1,intent:'compare',sourceIds:['one','two'],operations:[],question:null});
test('actual Home composition forwards one captured receipt before returning the answer',async()=>{
 const receipts=[];
 const f=fixture(spec=>({...raw(spec,homeFinal),id:'resp_composition',service_tier:'default',usage:{input_tokens:10,output_tokens:10,total_tokens:20,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}}}),{settle:async(r,signal)=>{assert.equal(signal.aborted,false);receipts.push(r);return {settled:true};}});
 const result=await f.app(http('/api/home-solution-conversation',home()));assert.equal(result.status,200);assert.equal(receipts.length,1);assert.equal(receipts[0].receipt.response_id,'resp_composition');assert.equal(receipts[0].requestId,[...f.grants.keys()][0]);assert.deepEqual(f.events,['admit','provider']);
});
function capabilityScript(spec,round){
 if(round===1)return raw(spec,'',[tool('evaluate_capability_option',{option_index:0,participants:5,fill_rate_pct:JSON.parse(spec.input[0].content).source.defaults.fill_rate_pct,revision_of:null,reason_code:'cost_check'},'evaluate')]);
 const result=JSON.parse(spec.input.findLast(x=>x.type==='function_call_output').output);
 return raw(spec,'',[tool('finish_capability_review',{reviewed_ids:[result.id],preferred_id:result.status==='constraints met'?result.id:null,conclusion:result.status==='constraints met'?'constraints_met_outcomes_unknown':result.status==='constraints failed'?'no_feasible_option':'insufficient_inputs'},'finish')]);
}
test('all five real application routes validate actual specs through atomic admission before provider',async()=>{
 const cases=[['/api/home-solution-conversation',home(),'home-solution',s=>raw(s,homeFinal)],['/api/chat',homeChat,'chat',s=>raw(s,chatFinal)],['/api/home-plan-conversation',await plan(),'plan',s=>raw(s,planFinal)],['/api/workforce-solution/intake',intake,'intake',s=>raw(s,intakeFinal)],['/api/capability-agent',capability,'capability',capabilityScript]];
 for(const [path,body,kind,script] of cases){
  const f=fixture(script),r=await f.app(http(path,body));assert.equal(r.status,200,path+' '+JSON.stringify(await r.clone().json()));const result=await r.json();
  assert.equal(r.headers.get('x-workforce-dataset'),P.token);assert.equal(r.headers.get('cache-control'),'no-store');
  const policy=publicPlannerPriceCandidate(kind),rounds=kind==='capability'?2:1;
  assert.equal(f.specs.length,rounds,path);assert.equal(f.grants.size,rounds);assert.equal(f.reserved,rounds*policy.reserveMicroUsd);
  assert.ok(f.specs.every(s=>s.model===policy.model&&s.max_output_tokens<=policy.maxOutputTokens));if(kind==='home-solution')assert.deepEqual(f.specs[0].include,['reasoning.encrypted_content']);assert.deepEqual(f.events,Array.from({length:rounds},()=>['admit','provider']).flat());
  if(kind==='home-solution')assert.equal(result.usage.modelRounds,1);
  if(kind==='intake')assert.equal(result.draft.roles,'5');
  if(kind==='capability')assert.equal(result.evaluations.length,1);
 }
});
test('actual Home and analytics tool loops reserve every round and reject same-ID replay',async()=>{
 for(const kind of ['home','analytics']){
  const path=kind==='home'?'/api/home-solution-conversation':'/api/chat',body=kind==='home'?home():{page:'workforce',message:'Explain workforce composition'};
  const f=fixture((spec,round)=>{
   if(kind==='home')assert.deepEqual(spec.include,['reasoning.encrypted_content']);
   if(round===1){const definition=analyticsToolDefinitions.find(t=>t.name==='get_workforce_composition');const result=raw(spec,'',[kind==='home'?tool('read_evidence',{sourceIds:['W1']}):tool(definition.name,Object.fromEntries(definition.parameters.required.map(k=>[k,null])))]);if(kind==='home')result.output.unshift({type:'reasoning',id:'rs-test',encrypted_content:'opaque-test-reasoning',summary:[]});return result;}
   assert.ok(spec.input.some(x=>x.type==='function_call_output'));if(kind==='home')assert.ok(spec.input.some(x=>x.type==='reasoning'&&x.encrypted_content==='opaque-test-reasoning'));return raw(spec,kind==='home'?homeFinal:JSON.stringify({answer:{discussion:'Company evidence remains synthetic.'}}));
  });
  const first=await f.app(http(path,body));assert.equal(first.status,200,kind+' '+JSON.stringify(await first.clone().json()));assert.equal(f.specs.length,2);assert.equal(f.grants.size,2);
  const held=f.reserved,replay=await f.app(http(path,body));assert.ok(replay.status>=400);assert.equal(f.specs.length,2);assert.equal(f.reserved,held);assert.equal(f.attempts,3);
 }
});
test('denial never reaches provider on any of the five actual routes',async()=>{
 const cases=[['/api/home-solution-conversation',home()],['/api/chat',homeChat],['/api/home-plan-conversation',await plan()],['/api/workforce-solution/intake',intake],['/api/capability-agent',capability]];
 for(const [path,body] of cases){const f=fixture(()=>{throw Error('Provider must not run');},{deny:true});const r=await f.app(http(path,body));assert.ok(r.status>=400,path);assert.equal(f.attempts,1);assert.equal(f.specs.length,0);assert.equal(f.reserved,0);}
});
test('disabled application and missing required port make zero ledger/provider calls',async()=>{
 const f=fixture(()=>{throw Error('No provider');},{enabled:false});
 for(const path of PUBLIC_AI_ROUTES)assert.equal((await f.app(http(path,{}))).status,503);
 const status=await f.app(http('/api/public-ai-capabilities',null,'read',hostname,'GET'));assert.equal((await status.json()).status,'unavailable');assert.equal(f.attempts,0);assert.equal(f.specs.length,0);
 let touched=0;const closed=createPublicAiApplication({options:{hostname},enabled:true,provider:()=>touched++,now:()=>NOW});assert.equal((await closed(http('/api/chat',homeChat))).status,503);assert.equal(touched,0);
});
test('approved aliases canonicalize and readiness reports exact five routes without reservations',async()=>{
 const f=fixture(s=>raw(s,homeFinal),{production:true});
 for(const host of ['www.ed-ai.app','ed-ai.app','people-analytics-9037review-ed-56dc.vercel.app']){
  const status=await f.app(http('/api/public-ai-capabilities',null,'read',host,'GET'));assert.equal(status.status,200);const receipt=await status.json();assert.ok(readPublicAiCapabilityReceipt(receipt,NOW));assert.equal(receipt.status,'configured');assert.equal(receipt.version,2);assert.deepEqual(receipt.routes,PUBLIC_AI_ROUTES);
  const current=await f.app(http('/api/home-solution-conversation?'+new URLSearchParams(filters),null,'projection',host,'GET'));assert.equal(current.status,200);assert.equal((await current.json()).inputs.opening,9037);
 }
 assert.equal(f.attempts,0);assert.equal(f.specs.length,0);
 const request=home();request.requestId='alias-complete';assert.equal((await f.app(http('/api/home-solution-conversation',request,request.requestId,'www.ed-ai.app'))).status,200);assert.equal(f.specs.length,1);
 assert.equal((await f.app(http('/api/chat',homeChat,'denied','untrusted.example'))).status,503);assert.equal(f.specs.length,1);
});
test('configured receipt never asserts budget availability; actual admission still denies unsafe attempts',async()=>{
 for(const settings of [{reserved:PUBLIC_PLANNER_CAP_MICRO_USD-1},{rowPatch:{enabled:false}},{rowPatch:{policy_id:'wrong'}},{rowPatch:{pricing_valid_until:new Date(NOW-60*60*1000).toISOString()}},{malformedGrant:true}]){
  const f=fixture(()=>{throw Error('No provider');},settings);const r=await f.app(http('/api/public-ai-capabilities',null,'read',hostname,'GET'));const receipt=await r.json();assert.equal(receipt.status,'configured');assert.equal(f.attempts,0);assert.equal(f.specs.length,0);
  assert.ok((await f.app(http('/api/chat',homeChat))).status>=400);assert.equal(f.attempts,1);assert.equal(f.specs.length,0);
 }
});
test('configuration expires before policy safety margin and old receipts cannot authorize expired rounds',async()=>{
 let clock=NOW;const f=fixture(()=>{throw Error('No provider');},{now:()=>clock});
 const before=await (await f.app(http('/api/public-ai-capabilities',null,'read',hostname,'GET'))).json();assert.equal(before.status,'configured');
 clock=Date.parse(publicPlannerPriceCandidate('plan').validUntil)-120000;
 const close=await (await f.app(http('/api/public-ai-capabilities',null,'read',hostname,'GET'))).json();assert.equal(close.status,'unavailable');
 clock=Date.parse(publicPlannerPriceCandidate('plan').validUntil);
 assert.equal(readPublicAiCapabilityReceipt(before,clock),null);
 assert.ok((await f.app(http('/api/chat',homeChat))).status>=400);assert.equal(f.attempts,0);assert.equal(f.specs.length,0);
});
test('invalid provider model or usage keeps reservation and prevents replay retry',async()=>{
 for(const bad of ['model','usage']){
  const f=fixture(spec=>({...raw(spec,chatFinal),...(bad==='model'?{model:'wrong'}:{usage:{input_tokens:10,output_tokens:10,total_tokens:21}})}));
  assert.ok((await f.app(http('/api/chat',homeChat))).status>=400);assert.equal(f.specs.length,1);const charged=f.reserved;assert.equal(charged,500000);
  assert.ok((await f.app(http('/api/chat',homeChat))).status>=400);assert.equal(f.specs.length,1);assert.equal(f.reserved,charged);
 }
});
test('capability replays actual empty reasoning content after calculation and admits exactly second round',async()=>{
 const reasoning={type:'reasoning',id:'rs_capability',encrypted_content:'opaque-fixture',summary:[],content:[]};
 const f=fixture((spec,round)=>{
  assert.deepEqual(spec.include,['reasoning.encrypted_content']);
  const response=capabilityScript(spec,round);
  if(round===1)response.output.unshift(structuredClone(reasoning));
  else assert.deepEqual(spec.input.find(x=>x.type==='reasoning'),reasoning);
  return response;
 });
 const response=await f.app(http('/api/capability-agent',capability));assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.evaluations.length,1);assert.equal(result.modelCalls,2);assert.equal(result.calculatorCalls,2);assert.equal(f.attempts,2);assert.equal(f.grants.size,2);assert.equal(f.reserved,1000000);assert.deepEqual(f.events,['admit','provider','admit','provider']);
});


test('explicit guided scenario actual Home route uses shared calculator without provider admission',async()=>{
 const {createSwpDemo}=await import('../lib/swp-demo.ts');
 const {bundleInputKey}=await import('../lib/home-bundle-reconciliation.ts');
 const {compareScenarioForChat}=await import('../lib/scenario-planning-parity.ts');
 const draft=await createSwpDemo('guided-swp-route','2026-10-21T12:00:00Z');
 const review={conversationMode:'fictional-swp-demo-v1',classification:'fictional-scenario',datasetToken:P.token,goalId:draft.binding.goalId,goal:draft.binding.goal,revision:draft.revision,draft,inputKey:bundleInputKey(draft),reviewState:'not-calculated'};
 const request={...home(),goal:{id:'',statement:''},goalContext:{scenarioReview:review},message:{id:'turn1',text:'Compare staffing options'}};
 const f=fixture(()=>{throw Error('Scenario calculation must not call provider');});
 const r=http('/api/home-solution-conversation',request);r.headers.set('x-workforce-conversation','fictional-swp-demo-v1');
 const response=await f.app(r);assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
 const result=await response.json();assert.equal(result.answer,(await compareScenarioForChat(draft)).answer);assert.equal(result.usage.modelRounds,0);assert.equal(f.attempts,0);
 const changed=structuredClone(request);changed.message.text='Close a 99 FTE capacity gap with a $1 USD budget';
 const cr=http('/api/home-solution-conversation',changed);cr.headers.set('x-workforce-conversation','fictional-swp-demo-v1');
 const changedResult=await(await f.app(cr)).json();assert.match(changedResult.answer,/differ/);assert.doesNotMatch(changedResult.answer,/develop \/.*move/);assert.equal(f.attempts,0);
 const invalid=structuredClone(request);invalid.goalContext.scenarioReview.inputKey='changed';
 const bad=http('/api/home-solution-conversation',invalid);bad.headers.set('x-workforce-conversation','fictional-swp-demo-v1');
 assert.notEqual((await f.app(bad)).status,200);assert.equal(f.attempts,0);
});


test('renewed injected policy configures and completes requests after compiled pricing has expired',async()=>{
 const clock=Date.parse(publicPlannerPriceCandidate('chat').validUntil)+3600000;
 const verifiedAt=new Date(clock-60000).toISOString(),validUntil=new Date(clock+86400000-60000).toISOString();
 const routes=[];
 const policyForRoute=kind=>{routes.push(kind);return {...publicPlannerPriceCandidate(kind),verifiedAt,validUntil};};
 const f=fixture(spec=>raw(spec,chatFinal),{now:()=>clock,policyForRoute,rowPatch:{pricing_valid_until:validUntil}});
 assert.ok(clock>Date.parse(publicPlannerPriceCandidate('chat').validUntil));
 const status=await f.app(http('/api/public-ai-capabilities',null,'renewed-read',hostname,'GET'));
 const receipt=await status.json();assert.equal(receipt.status,'configured');assert.ok(readPublicAiCapabilityReceipt(receipt,clock));
 assert.deepEqual(routes,['home-solution','chat','plan','intake','capability']);assert.equal(f.attempts,0);assert.equal(f.specs.length,0);
 const response=await f.app(http('/api/chat',homeChat,'renewed-chat'));
 assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
 assert.match((await response.json()).answer,/9,037/);assert.equal(routes.at(-1),'chat');
 assert.equal(f.attempts,1);assert.equal(f.specs.length,1);assert.equal(f.reserved,publicPlannerPriceCandidate('chat').reserveMicroUsd);
 assert.equal(f.specs[0].model,publicPlannerPriceCandidate('chat').model);assert.deepEqual(f.events,['admit','provider']);
});

test('expired or missing injected pricing never configures or admits an actual chat request',async()=>{
 const clock=Date.parse(publicPlannerPriceCandidate('chat').validUntil)+3600000;
 for(const policyForRoute of [
  kind=>({...publicPlannerPriceCandidate(kind),verifiedAt:new Date(clock-86400000).toISOString(),validUntil:new Date(clock-1).toISOString()}),
  ()=>null,
  ()=>{throw Error('Missing verified pricing');},
 ]){
  const f=fixture(()=>{throw Error('Provider must not run');},{now:()=>clock,policyForRoute,rowPatch:{pricing_valid_until:new Date(clock+86400000).toISOString()}});
  const receipt=await(await f.app(http('/api/public-ai-capabilities',null,'closed-read',hostname,'GET'))).json();
  assert.equal(receipt.status,'unavailable');assert.deepEqual(receipt.routes,[]);
  const response=await f.app(http('/api/chat',homeChat,'closed-chat'));assert.ok(response.status>=400);
  assert.equal(f.attempts,0);assert.equal(f.specs.length,0);assert.equal(f.reserved,0);
 }
});
