import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVEL_CODES} from '../releases/2026-10-21/source/lib/home-level-turnover.mjs';
import {PUBLIC_9037 as P} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
import {public9037Metadata} from '../releases/2026-10-21/source/lib/public-9037-projection.mjs';
import {createPublicHomeRouteTestAdapter} from '../releases/2026-10-21/source/lib/public-home-route.server.mjs';
import {createPublicHomeGroundingTestAdapter} from '../releases/2026-10-21/source/lib/public-home-grounding.server.mjs';
import {createPublicSavedEvidenceTestAdapter} from '../releases/2026-10-21/source/lib/public-saved-evidence.server.mjs';
import {buildHomePack} from '../releases/2026-10-21/source/lib/home-pack.mjs';
import {emptySolutionState,readSolutionRequest} from '../releases/2026-10-21/source/lib/home-solution-conversation.ts';
import {createSwpDemo} from '../releases/2026-10-21/source/lib/swp-demo.ts';
import {createPlanAlternatives,packPlanAlternatives} from '../releases/2026-10-21/source/lib/home-plan-alternatives.ts';
import {independentWorkforceQuestion,retainIndependentWorkforceAnswer} from '../releases/2026-10-21/source/lib/home-independent-workforce-question.ts';
import {publicSolutionEnvelope,publicHomeSourceVersion} from '../releases/2026-10-21/source/lib/public-ai-evidence-client.mjs';

import {tenureExitsIntent,calculateTenureExits,TENURE_BANDS,TENURE_DIGEST} from '../releases/2026-10-21/source/lib/home-tenure-exits.mjs';
import {readPublicTenureExits} from '../releases/2026-10-21/source/lib/public-tenure-exits.server.mjs';
const hostname='people-analytics-test-ed-56dc.vercel.app',identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest:TENURE_DIGEST};
const filters={country:'all',org:'all',level:'all'},question='Show exits by tenure and cost';
const options={countries:[{value:'IN',label:'India'}],business_units:[{value:'BU-MGSVC',label:'Demo BU-MGSVC'}],levels:LEVEL_CODES.map((value,i)=>({value,label:'Demo level '+(i+1)}))};
function histories(){
 const levels=LEVEL_CODES.map((code,k)=>({code,history:Array.from({length:34},(_,i)=>({month:new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10),headcount:(k+1)*100+(i%2)*20,total_exits:i?([6,4,1][k]??0):null,voluntary_exits:i?([3,2,1][k]??0):null}))}));
 const base=levels[0].history.map((row,i)=>({month:row.month,...Object.fromEntries(['headcount','total_exits','voluntary_exits'].map(key=>[key,row[key]===null?null:levels.reduce((n,level)=>n+level.history[i][key],0)]))}));
 return {base,levels};
}
function fixture({timeoutMs=90000}={}){
 const data=histories(),requests=[];let mutate=()=>{},current=identity,providerAttempts=0;
 const history=f=>structuredClone(f.level==='all'?data.base:data.levels.find(level=>level.code===f.level).history);
 const dashboard=f=>{const rows=history(f);return {data_meta:public9037Metadata(identity.digest),overview:{headcount:rows.at(-1).headcount,snapshot_date:P.cutoff},trend:rows.map(row=>({snapshot_date:new Date(Date.UTC(Number(row.month.slice(0,4)),Number(row.month.slice(5,7)),0)).toISOString().slice(0,10),headcount:row.headcount,fte:row.headcount})),filter_options:structuredClone(options),workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:f,effective:f,label:`India; ${f.org==='all'?'All business units':'Managed Services'}; ${f.level==='all'?'All levels':f.level}`,basis:'Invented aggregate fixture',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-calendar-month-average-stock-v3',stockStatus:rows.at(-1).headcount===0?'known-empty':'positive'}};};
 const binding={router:{current:()=>current,bootstrapToken:()=>P.token},handle:async request=>{const u=new URL(request.url),f=Object.fromEntries(u.searchParams);if(u.pathname==='/api/attrition'){const d=attrition();mutate(d,'attrition',filters);return Response.json(d,{headers:{'x-workforce-dataset':P.token}});}assert.equal(u.pathname,'/api/dashboard');assert.equal(request.headers.get('x-workforce-dataset'),P.token);requests.push(f);const d=dashboard(f);mutate(d,'dashboard',f);return Response.json(d,{headers:{'x-workforce-dataset':P.token}});},turnoverHistory:async f=>{requests.push(f);const d={contract:'public-group-turnover-history-v1',datasetToken:P.token,bundleDigest:identity.digest,asOf:P.cutoff,filters:f,rows:history(f)};mutate(d,'history',f);return d;}};
 const grounding=createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:async()=>binding}),saved=createPublicSavedEvidenceTestAdapter({enabled:true,verifyHome:(r,s)=>grounding.verify(r,s),loadProjection:()=>assert.fail('No projection')});
 const route=createPublicHomeRouteTestAdapter({enabled:true,hostname,timeoutMs,loadBinding:async()=>binding,verifyHome:(r,s)=>grounding.verify(r,s),verifySaved:(r,s)=>saved.verify(r,s),loadProjection:()=>assert.fail('No projection'),completionFactory:()=>{providerAttempts++;assert.fail('Provider forbidden');}});
 return {data,requests,binding,dashboard,route,setMutation:fn=>mutate=fn,setIdentity:v=>current=v,get providerAttempts(){return providerAttempts;},run:(selection,chosenFilters=filters)=>readPublicTenureExits({binding,hostname,identity,filters:chosenFilters,selection:selection??tenureExitsIntent(question),signal:new AbortController().signal})};
}
async function savedRequest(f,text=question){
 const results={dashboard:{status:'loaded',data:f.dashboard(filters)}},draft=await createSwpDemo('guided-level-test','2026-11-10T00:00:00.000Z'),goal={id:draft.binding.goalId,statement:draft.binding.goal};
 const catalog=packPlanAlternatives(createPlanAlternatives({goalId:goal.id,goal:goal.statement},[{id:'saved-demo',draft}]));
 const request=readSolutionRequest({version:1,requestId:'level-0',timeZone:'UTC',goal,scope:'India; All business units; All levels',filters,evidence:buildHomePack(results,'India; All business units; All levels'),goalContext:null,selectedId:'saved-demo',state:emptySolutionState(),catalog,message:{id:'level-message-0',text}});
 return {request,source:publicHomeSourceVersion(results)};
}
async function post(f,raw){const response=await f.route.handle(new Request('https://'+hostname+'/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':P.token,'x-workforce-request-id':raw.request.requestId},body:JSON.stringify(raw)}));const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;}
function attrition(){return {as_of:P.cutoff,data_meta:public9037Metadata(TENURE_DIGEST),business_units:[],levels:[],reasons:[],summary:{as_of:P.cutoff,retirements:0,total_exits:150,voluntary_exits:100,involuntary_exits:50,regrettable_exits:0,total_turnover_ytd_pct:0,voluntary_turnover_ytd_pct:0,annualized_voluntary_turnover_pct:0,regrettable_share_of_voluntary_pct:0},tenure:TENURE_BANDS.map((tenure_band,i)=>({tenure_band,tenure_sort:i+1,exits:(i+1)*10,voluntary_exits:20,regrettable_exits:0})).map((r,i)=>({...r,voluntary_exits:i===0?10:i===4?30:20})),trend:Array.from({length:34},(_,i)=>({month:new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10),total_exits:15,voluntary_exits:10,involuntary_exits:5,regrettable_exits:0,monthly_turnover_pct:0,monthly_voluntary_turnover_pct:0}))};}
test('bounded tenure intent rejects named scope and plan changes; supports exact period and own follow-ups',()=>{
 for(const text of ['Show exits by tenure','Show company-wide voluntary turnover by tenure','Show all company exits by tenure and cost','Show current YTD turnover by tenure','Show rates by tenure','Show January through October 2026 exits by tenure'])assert.ok(tenureExitsIntent(text),text);
 for(const text of ['Show Managed Services exits by tenure','Show exits by tenure in IN','Show exits by tenure in US','Show IS exits by tenure','Show voluntary turnover by tenure IS','Show ARE exits by tenure','Show level L1 exits by tenure','Why do tenure bands cause turnover?'])assert.match(tenureExitsIntent(text).answer,/not supported/,text);
 for(const text of ['Show 2025 exits by tenure','Show last year exits by tenure','Show this year exits by tenure','Show current year exits by tenure'])assert.match(tenureExitsIntent(text).answer,/not been substituted/);
 assert.match(tenureExitsIntent('Show regrettable exits by tenure').answer,/Choose/);
 assert.equal(tenureExitsIntent('Show that again'),null);assert.equal(tenureExitsIntent('Show exits by tenure and change my plan'),null);
});
test('composition reconciles exact bands, summary and monthly counts; zero shares unavailable',()=>{
 const d=attrition(),r=calculateTenureExits(d,'total');assert.equal(r.total,150);assert.equal(r.rows[0].share,10/150*100);assert.equal(calculateTenureExits(d,'voluntary').total,100);
 for(const change of [d=>d.tenure.pop(),d=>d.tenure.reverse(),d=>d.tenure[1].tenure_band=d.tenure[0].tenure_band,d=>d.tenure[0].tenure_sort=2,d=>d.tenure[0].exits++,d=>d.tenure[0].exits=-1,d=>d.tenure[0].exits=null,d=>d.tenure[0].exits=.5,d=>d.tenure[0].suppressed=true,d=>d.tenure[0].voluntary_exits=100,d=>d.trend.pop(),d=>d.trend[24].month='2025-01-01',d=>d.trend[24].voluntary_exits++,d=>d.summary.total_exits++,d=>d.summary.suppressed=true,d=>d.summary.involuntary_exits=-500,d=>d.summary.involuntary_exits=4000,d=>d.summary.retirements=-5,d=>d.as_of='2026-09-30']){const bad=attrition();change(bad);assert.throws(()=>calculateTenureExits(bad,'total'));}
 for(const row of d.tenure)row.exits=row.voluntary_exits=0;for(const row of d.trend)row.total_exits=row.voluntary_exits=row.involuntary_exits=0;d.summary.total_exits=d.summary.voluntary_exits=d.summary.involuntary_exits=0;assert.equal(calculateTenureExits(d,'total').rows[0].share,null);
});
test('reader pins identity, refuses filtered scope and gives composition/cost/rate boundaries',async()=>{
 const f=fixture(),result=await f.run({...tenureExitsIntent(question),rate:true});assert.match(result.answer,/150 total exits/);assert.match(result.answer,/not turnover rates/);assert.match(result.answer,/cost is unavailable/);assert.match(result.answer,/thresholds are not verified/);assert.match(result.answer,/denominators are missing/);
 for(const key of ['country','org','level']){const scoped={...filters,[key]:'selected'},before=JSON.stringify(scoped);assert.match((await f.run(undefined,scoped)).answer,/filters are kept/);assert.equal(JSON.stringify(scoped),before);}
 for(const mutate of [d=>d.data_meta.bundleDigest='b'.repeat(64),d=>d.as_of='2026-09-30',d=>d.suppressed=true,d=>d.tenure[0].suppressed=true]){const f=fixture();f.setMutation((d,t)=>{if(t==='attrition')mutate(d);});await assert.rejects(f.run());}
 const controller=new AbortController();controller.abort();await assert.rejects(readPublicTenureExits({binding:f.binding,hostname,identity,filters,selection:tenureExitsIntent(question),signal:controller.signal}));
});
test('actual route repeats, follows up and reloads without provider or planning changes',async()=>{
 const f=fixture();let {request,source}=await savedRequest(f);request.state.questions=['Retain this'];const original=structuredClone(request);
 for(const [i,text] of [question,question,'What does it cost?','Show the shares','What about voluntary exits?','Show that again'].entries()){
  request={...request,requestId:'tenure-'+i,message:{id:'tenure-message-'+i,text}};const detached=independentWorkforceQuestion(request);assert(detached,text);const before=JSON.stringify(request),reply=await post(f,await publicSolutionEnvelope(detached,source,undefined));assert.equal(reply.usage.modelRounds,0);assert.match(reply.answer,/Current-YTD (total|voluntary) exits by tenure: All company/);const state=retainIndependentWorkforceAnswer(request,reply);assert.equal(JSON.stringify(request),before);assert.deepEqual({...state,turns:[]},{...original.state,turns:[]});for(const k of ['goal','catalog','selectedId','filters'])assert.deepEqual(request[k],original[k]);request=JSON.parse(JSON.stringify({...request,state}));
 }assert.equal(f.providerAttempts,0);
});
test('unsupported period, named scope and ambiguous wording stay deterministic without provider fallback',async()=>{
 const f=fixture();for(const text of ['Show current year exits by tenure','Show exits by tenure for 2025','Show exits by tenure in 2025','Show quarterly exits by tenure','Show exits by tenure in Managed Services','Show exits by tenure in IN','Why do tenure bands cause turnover?']){const {request,source}=await savedRequest(f,text),detached=independentWorkforceQuestion(request);assert(detached,text);const reply=await post(f,await publicSolutionEnvelope(detached,source,undefined));assert.equal(reply.usage.modelRounds,0);assert.doesNotMatch(reply.answer,/Company total:/);assert.match(reply.answer,/not been substituted|not supported/);retainIndependentWorkforceAnswer(request,reply);}assert.equal(f.providerAttempts,0);
});
test('wrong identity, stale metadata, mixed counts, suppression and mid-read switch fail closed',async()=>{
 for(const mutate of [d=>d.data_meta.datasetToken='stale:1',d=>d.data_meta.cutoff='2026-09-30',d=>d.data_meta.suppressed=true,d=>d.summary.voluntary_exits++,d=>d.trend[24].total_exits++,d=>d.trend[24].suppressed=true,d=>d.tenure[1]=d.tenure[0]]){const f=fixture();await f.run();f.setMutation((d,t)=>{if(t==='attrition')mutate(d);});await assert.rejects(f.run());}
 const f=fixture();await f.run();f.setMutation(()=>f.setIdentity({...identity,digest:'b'.repeat(64)}));await assert.rejects(f.run());
 for(const patch of [{digest:'b'.repeat(64)},{token:'stale:1'},{generation:5},{datasetId:'wrong'}]){const f=fixture(),bad={...identity,...patch};f.setIdentity(bad);await assert.rejects(readPublicTenureExits({binding:f.binding,hostname,identity:bad,filters,selection:tenureExitsIntent(question),signal:new AbortController().signal}));}
});

test('own-answer unsupported follow-ups never dispatch a provider',async()=>{
 for(const text of ['What about 2025?','Show the rates','What about involuntary exits?','What about India?']){const f=fixture();let {request,source}=await savedRequest(f);const initial=await post(f,await publicSolutionEnvelope(independentWorkforceQuestion(request),source,undefined));request={...request,state:retainIndependentWorkforceAnswer(request,initial),requestId:'followup',message:{id:'followup-message',text}};const detached=independentWorkforceQuestion(request);assert(detached,text);const reply=await post(f,await publicSolutionEnvelope(detached,source,undefined));assert.equal(reply.usage.modelRounds,0);assert.equal(f.providerAttempts,0);if(text==='Show the rates')assert.match(reply.answer,/rates are unavailable/);else assert.doesNotMatch(reply.answer,/Company total:/);}
});

test('boundary repeats retain the refusal rather than dispatching or inventing counts',async()=>{
 for(const text of ['Show 2025 exits by tenure','Show regrettable exits by tenure','Show exits by tenure in India']){const f=fixture();let {request,source}=await savedRequest(f,text);const initial=await post(f,await publicSolutionEnvelope(independentWorkforceQuestion(request),source,undefined));for(const follow of ['Show that again']){request={...request,state:retainIndependentWorkforceAnswer(request,initial),requestId:'boundary-repeat',message:{id:'boundary-repeat-message',text:follow}};const detached=independentWorkforceQuestion(request);assert(detached);const reply=await post(f,await publicSolutionEnvelope(detached,source,undefined));assert.equal(reply.answer,initial.answer);assert.equal(f.providerAttempts,0);}}
});

test('planning exclusions remain identical after supported or refused tenure answers',()=>{
 for(const prior of ['Current-YTD total exits by tenure: All company.','Tenure exit composition unavailable.'])for(const text of ['What about saved scenarios?','What about creating a plan?','What about remove tenure from this plan?','What about add a scenario?'])assert.equal(tenureExitsIntent(text,[{role:'assistant',text:prior}]),null);
});


test('explicit tenure metric follow-ups override the prior metric without mixing or changing saved work',async()=>{
 for(const totalWord of ['total','overall']){
  const f=fixture();let {request,source}=await savedRequest(f,'Show voluntary exits by tenure');
  request.state.questions=['Retain this'];const original=structuredClone(request);
  for(const [i,[text,metric,count]] of [
   ['Show voluntary exits by tenure','voluntary',100],
   [`What about ${totalWord} exits?`,'total',150],
   ['Show that again','total',150],
   ['What about voluntary exits?','voluntary',100],
   ['Show the shares','voluntary',100],
  ].entries()){
   request={...request,requestId:'metric-'+i,message:{id:'metric-message-'+i,text}};
   const prior=request.state.turns,selection=tenureExitsIntent(text,prior);
   assert.equal(selection.metric,metric,text);assert.equal(selection.answer,undefined,text);
   const before=JSON.stringify(request),detached=independentWorkforceQuestion(request);assert(detached,text);
   const reply=await post(f,await publicSolutionEnvelope(detached,source,undefined));
   assert.match(reply.answer,new RegExp(`Current-YTD ${metric} exits by tenure: All company`));
   assert.match(reply.answer,new RegExp(`Company total: ${count} ${metric} exits`));
   assert.equal(reply.usage.modelRounds,0);assert.equal(f.providerAttempts,0);
   const state=retainIndependentWorkforceAnswer(request,reply);
   assert.equal(JSON.stringify(request),before);assert.deepEqual({...state,turns:[]},{...original.state,turns:[]});
   for(const key of ['goal','catalog','selectedId','filters'])assert.deepEqual(request[key],original[key]);
   request=JSON.parse(JSON.stringify({...request,state}));
  }
  for(const text of [`What about ${totalWord} and voluntary exits?`,`Show ${totalWord} and voluntary exits by tenure`]){
   assert.match(tenureExitsIntent(text,request.state.turns).answer,/Choose total or voluntary/);
   const next={...request,requestId:'mixed',message:{id:'mixed-message',text}};
   const reply=await post(f,await publicSolutionEnvelope(independentWorkforceQuestion(next),source,undefined));
   assert.match(reply.answer,/Choose total or voluntary/);assert.doesNotMatch(reply.answer,/Company total:/);
   assert.equal(reply.usage.modelRounds,0);assert.equal(f.providerAttempts,0);
  }
 }
});

test('metric overrides keep planner, named-scope and historical-period exclusions',()=>{
 for(const metric of ['total','voluntary']){
  const turns=[{role:'assistant',text:`Current-YTD ${metric} exits by tenure: All company.`}];
  for(const text of ['What about total exits and change my plan?','What about overall exits and saved scenarios?'])assert.equal(tenureExitsIntent(text,turns),null,text);
  for(const text of ['What about total exits in India?','What about overall exits in Managed Services?','What about total exits at level L1?'])assert.match(tenureExitsIntent(text,turns).answer,/not supported/,text);
  for(const text of ['What about total exits last year?','What about overall exits in 2025?'])assert.match(tenureExitsIntent(text,turns).answer,/not supported|not been substituted/,text);
 }
});
