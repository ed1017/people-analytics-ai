import test from 'node:test';
import assert from 'node:assert/strict';
import {levelTurnoverIntent,calculateLevelTurnover,LEVEL_CODES} from '../releases/2026-10-21/source/lib/home-level-turnover.mjs';
import {readPublicLevelTurnover} from '../releases/2026-10-21/source/lib/public-level-turnover.server.mjs';
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

const hostname='people-analytics-test-ed-56dc.vercel.app',identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest:'a'.repeat(64)};
const filters={country:'IN',org:'all',level:'all'},question='Which levels drive Managed Services turnover, and what does it cost?';
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
 const binding={router:{current:()=>current,bootstrapToken:()=>P.token},handle:async request=>{const u=new URL(request.url),f=Object.fromEntries(u.searchParams);assert.equal(u.pathname,'/api/dashboard');assert.equal(request.headers.get('x-workforce-dataset'),P.token);requests.push(f);const d=dashboard(f);mutate(d,'dashboard',f);return Response.json(d,{headers:{'x-workforce-dataset':P.token}});},turnoverHistory:async f=>{requests.push(f);const d={contract:'public-group-turnover-history-v1',datasetToken:P.token,bundleDigest:identity.digest,asOf:P.cutoff,filters:f,rows:history(f)};mutate(d,'history',f);return d;}};
 const grounding=createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:async()=>binding}),saved=createPublicSavedEvidenceTestAdapter({enabled:true,verifyHome:(r,s)=>grounding.verify(r,s),loadProjection:()=>assert.fail('No projection')});
 const route=createPublicHomeRouteTestAdapter({enabled:true,hostname,timeoutMs,loadBinding:async()=>binding,verifyHome:(r,s)=>grounding.verify(r,s),verifySaved:(r,s)=>saved.verify(r,s),loadProjection:()=>assert.fail('No projection'),completionFactory:()=>{providerAttempts++;assert.fail('Provider forbidden');}});
 return {data,requests,binding,dashboard,route,setMutation:fn=>mutate=fn,setIdentity:v=>current=v,get providerAttempts(){return providerAttempts;},run:(selection,chosenFilters=filters)=>readPublicLevelTurnover({binding,hostname,identity,filters:chosenFilters,selection:selection??levelTurnoverIntent(question),signal:new AbortController().signal})};
}
test('bounded intent keeps metric, date, BU and unsupported cost/tenure distinct',()=>{
 assert.deepEqual(levelTurnoverIntent(question),{org:'BU-MGSVC',metric:'total',cost:true,tenure:false,guidance:true});
 for(const alias of ['Managed Services','BU-MGSVC'])assert.equal(levelTurnoverIntent(`Show current voluntary turnover by level for ${alias}`).metric,'voluntary');
 for(const date of ['2025','2026','last year','previous year','this year','current calendar year','last month','October','Q3 2026','monthly','today'])assert.match(levelTurnoverIntent(`Show ${date} turnover by level for Managed Services`).answer,/not been substituted/);
 for(const date of ['current YTD','2026 YTD','YTD 2026','January through October 2026','as of 2026-10-31'])assert.equal(levelTurnoverIntent(`Show ${date} turnover by level for Managed Services`).answer,undefined);
 assert.match(levelTurnoverIntent('Show involuntary turnover by level for Managed Services').answer,/Choose total or voluntary/);
 assert.match(levelTurnoverIntent('Show total and voluntary turnover by level for Managed Services').answer,/Choose/);
 assert.equal(levelTurnoverIntent(question+' and tenure').tenure,true);
 for(const code of ['IN','IT','AT','TO','BY','IS','DO','ME'])for(const geography of [`in ${code}`,`for ${code}`,code,`in ${code.toLowerCase()}`])assert.equal(levelTurnoverIntent(`Show turnover by level for Managed Services ${geography}`),null,geography);
 for(const text of ['Please show me turnover by level for Managed Services','What is total turnover by level in Managed Services?','Show turnover across all levels in Managed Services','Show turnover by level for Managed Services in current YTD','Show turnover by level for Managed Services in 2025'])assert.ok(levelTurnoverIntent(text),text);
 for(const text of [question+' and change this plan',question+' but exclude executives',question.replace('Managed Services','not Managed Services'),question.replace('turnover','not voluntary turnover'),'Compare my saved plans',question+' in the US','Which levels drive Managed Services and Technology turnover?','Show turnover by level for Unknown Unit','Predict turnover by level for Managed Services','Why is turnover at Managed Services caused by levels?'])assert.equal(levelTurnoverIntent(text),null,text);
 const turns=[{role:'assistant',text:'Current-YTD voluntary turnover by level: Managed Services.\n\nMore details.'}];
 assert.equal(levelTurnoverIntent('What does it cost?',turns).metric,'voluntary');assert.equal(levelTurnoverIntent('What about tenure?',turns).tenure,true);
 assert.equal(levelTurnoverIntent('What does it cost?',[]),null);assert.equal(levelTurnoverIntent('Show that again',[{role:'assistant',text:'An unrelated answer.'}]),null);
});
test('exact monthly reconciliation and arithmetic distinguish totals, voluntary, zero exits and no denominator',()=>{
 const h=histories(),total=calculateLevelTurnover(h.base,h.levels,'total'),voluntary=calculateLevelTurnover(h.base,h.levels,'voluntary');
 assert.equal(total.totalExits,110);assert.equal(total.averageHeadcount,7920);assert.equal(total.rows[0].exitCount,60);assert.equal(total.rows[0].averageHeadcount,110);assert.equal(total.rows[0].contributionPct,60/110*100);assert.equal(total.rows[0].ratePct,60/110*100);assert.equal(voluntary.totalExits,60);assert.equal(voluntary.rows[0].contributionPct,50);
 assert.equal(total.rows[3].exitCount,0);assert.equal(total.rows[3].ratePct,0);assert.equal(total.rows[3].contributionPct,0);
 const empty=histories();for(const row of empty.base)if(row.total_exits!==null)row.total_exits=row.voluntary_exits=0;for(const level of empty.levels)for(const row of level.history)if(row.total_exits!==null)row.total_exits=row.voluntary_exits=0;
 const noExits=calculateLevelTurnover(empty.base,empty.levels,'total');assert.equal(noExits.rows[0].contributionPct,null);assert.equal(noExits.rows[0].ratePct,0);
 for(const row of empty.base)row.headcount=0;for(const level of empty.levels)for(const row of level.history)row.headcount=0;
 assert.equal(calculateLevelTurnover(empty.base,empty.levels,'total').rows[0].ratePct,null);
 empty.base[24].total_exits=empty.levels[0].history[24].total_exits=2;
 const noStock=calculateLevelTurnover(empty.base,empty.levels,'total');assert.equal(noStock.rows[0].exitCount,2);assert.equal(noStock.rows[0].contributionPct,100);assert.equal(noStock.rows[0].ratePct,null);
});
test('incomplete, duplicated, conflicting or unknown history cannot produce a partition',()=>{
 for(const mutate of [h=>h.levels.pop(),h=>h.levels[1].code=h.levels[0].code,h=>h.levels[0].history.pop(),h=>h.levels[0].history[25].month='2025-01-01',h=>h.levels[0].history[25].total_exits=null,h=>h.levels[0].history[25].voluntary_exits=8,h=>h.levels[0].history[25].headcount++,h=>h.levels[0].history[25].suppressed=true,h=>h.base[25].total_exits++,h=>h.base[1].headcount++]){const h=histories();calculateLevelTurnover(h.base,h.levels,'total');mutate(h);assert.throws(()=>calculateLevelTurnover(h.base,h.levels,'total'));}
});
test('reader preserves country, names explicit scope, leads with contributions and gives honest mixed limits',async()=>{
 const f=fixture(),r=await f.run({...levelTurnoverIntent(question),tenure:true});
 assert.equal(f.requests.length,26);assert(f.requests.every(row=>row.country==='IN'&&row.org==='BU-MGSVC'));assert.match(r.answer,/Largest recorded total exit contributions: Level 1: 60 exits \(54.5%\)/);assert.match(r.answer,/January-October 2026/);assert.match(r.answer,/Level 1: 60 total exits; 54.5% of business-unit total exits; 110 average headcount; 54.5% total turnover rate/);assert.match(r.answer,/contribution is not causation/);assert.match(r.answer,/cost is unavailable/);assert.match(r.answer,/tenure turnover breakdown is not verified/);assert.match(r.answer,/country scope stays India/);assert.equal((r.answer.match(/^- Level /gm)??[]).length,12);assert.deepEqual(r.charts,[]);
 assert.doesNotMatch(JSON.stringify(r),/rawFlows|employeeId|cellIndex/);
 const alternate=fixture(),selected={...filters,org:'BU-TECH',level:'L4'},before=JSON.stringify(selected);await alternate.run(undefined,selected);assert.equal(JSON.stringify(selected),before);assert(alternate.requests.every(row=>row.country==='IN'&&row.org==='BU-MGSVC'));
 await assert.rejects(fixture().run(undefined,{...filters,country:'US'}));
});
test('each scope/identity/calendar/suppression failure is rejected after a verified positive baseline',async()=>{
 const mutations=[
  (d,t)=>{if(t==='dashboard')d.data_meta.bundleDigest='b'.repeat(64);},
  (d,t)=>{if(t==='dashboard')d.workforce_filter_scope.effective={...d.workforce_filter_scope.effective,country:'all'};},
  (d,t)=>{if(t==='dashboard')d.workforce_filter_scope.metricContract='voluntary-ytd-nine-month-average-stock-v2';},
  (d,t)=>{if(t==='dashboard')d.filter_options.countries.unshift({value:'IN',label:'United States'});},
  (d,t)=>{if(t==='dashboard')d.filter_options.countries[0].label='United States';},
  (d,t)=>{if(t==='dashboard')d.filter_options.business_units.unshift({value:'BU-MGSVC',label:'Conflicting unit'});},
  (d,t)=>{if(t==='dashboard')d.filter_options.business_units[0].label='Corporate Services';},
  (d,t)=>{if(t==='dashboard')d.filter_options.levels.pop();},
  (d,t)=>{if(t==='dashboard')d.filter_options.levels[1]=d.filter_options.levels[0];},
  (d,t)=>{if(t==='dashboard')d.overview.headcount++;},
  (d,t)=>{if(t==='dashboard')d.trend[24].headcount++;},
  (d,t)=>{if(t==='dashboard')d.workforce_filter_scope.status='suppressed';},
  (d,t)=>{if(t==='history')d.datasetToken='stale:1';},
  (d,t)=>{if(t==='history')d.asOf='2026-09-30';},
  (d,t)=>{if(t==='history')d.filters={...d.filters,level:'all'};},
  (d,t)=>{if(t==='history')d.suppressed=true;},
  (d,t,f)=>{if(t==='history'&&f.level==='L2')d.rows[25].total_exits++;},
 ];
 for(const mutate of mutations){const f=fixture();await f.run();f.setMutation(mutate);await assert.rejects(f.run());}
 const f=fixture();await f.run();f.setMutation(()=>f.setIdentity({...identity,digest:'b'.repeat(64)}));await assert.rejects(f.run());
});
async function savedRequest(f,text=question){
 const results={dashboard:{status:'loaded',data:f.dashboard(filters)}},draft=await createSwpDemo('guided-level-test','2026-11-10T00:00:00.000Z'),goal={id:draft.binding.goalId,statement:draft.binding.goal};
 const catalog=packPlanAlternatives(createPlanAlternatives({goalId:goal.id,goal:goal.statement},[{id:'saved-demo',draft}]));
 const request=readSolutionRequest({version:1,requestId:'level-0',timeZone:'UTC',goal,scope:'India; All business units; All levels',filters,evidence:buildHomePack(results,'India; All business units; All levels'),goalContext:null,selectedId:'saved-demo',state:emptySolutionState(),catalog,message:{id:'level-message-0',text}});
 return {request,source:publicHomeSourceVersion(results)};
}
async function post(f,raw){const response=await f.route.handle(new Request('https://'+hostname+'/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':P.token,'x-workforce-request-id':raw.request.requestId},body:JSON.stringify(raw)}));const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;}
test('actual public route saves only answer turns through repeat, follow-up and serialized reload, with provider hard denied',async()=>{
 const f=fixture();let {request,source}=await savedRequest(f);request.state.constraints=[{field:'budget_usd',action:'set',number:100000,text:null,unit:'USD',turnId:'retained'}];request.state.questions=['Keep the original question'];
 const workspace=structuredClone({goal:request.goal,catalog:request.catalog,selectedId:request.selectedId,filters:request.filters,state:request.state});
 for(const [i,text] of [question,question,'What does it cost?','What about tenure?','Show that again'].entries()){
  request={...request,requestId:'level-'+i,message:{id:'level-message-'+i,text}};const before=JSON.stringify(request),detached=independentWorkforceQuestion(request);assert(detached);
  const envelope=await publicSolutionEnvelope(detached,source,undefined),reply=await post(f,envelope);assert.equal(reply.usage.modelRounds,0);assert.equal(reply.state.turns.at(-1).text,reply.answer);assert.match(reply.answer,/Current-YTD total turnover by level: Managed Services/);
  const state=retainIndependentWorkforceAnswer(request,reply);assert.equal(JSON.stringify(request),before);assert.deepEqual({...state,turns:[],currentCalculationKinds:[]},{...workspace.state,turns:[],currentCalculationKinds:[]});
  assert.deepEqual({goal:request.goal,catalog:request.catalog,selectedId:request.selectedId,filters:request.filters},{goal:workspace.goal,catalog:workspace.catalog,selectedId:workspace.selectedId,filters:workspace.filters});request=JSON.parse(JSON.stringify({...request,state}));
 }
 assert.equal(f.providerAttempts,0);assert.equal(request.state.turns.length,10);
});
test('unsupported metrics and periods clarify without substitution or provider calls; plan edits never detach',async()=>{
 const f=fixture();for(const text of ['Show involuntary turnover by level for Managed Services','Show 2025 turnover by level for Managed Services']){const {request,source}=await savedRequest(f,text),detached=independentWorkforceQuestion(request);assert(detached);const reply=await post(f,await publicSolutionEnvelope(detached,source,undefined));assert.doesNotMatch(reply.answer,/Largest recorded/);assert.equal(reply.usage.modelRounds,0);retainIndependentWorkforceAnswer(request,reply);}
 const {request}=await savedRequest(f,question+' and change this plan');assert.equal(independentWorkforceQuestion(request),null);assert.equal(independentWorkforceQuestion({...request,message:{...request.message,text:question},goalContext:{scenarioReview:{}}}),null);assert.equal(f.providerAttempts,0);
});

test('abort interrupts scoped reads before any completed answer can escape',async()=>{
 const f=fixture(),controller=new AbortController();controller.abort();
 await assert.rejects(readPublicLevelTurnover({binding:f.binding,hostname,identity,filters,selection:levelTurnoverIntent(question),signal:controller.signal}),/abort/i);assert.equal(f.requests.length,0);
 const active=new AbortController();f.setMutation((d,t,scope)=>{if(t==='dashboard'&&scope.level==='L3')active.abort();});
 await assert.rejects(readPublicLevelTurnover({binding:f.binding,hostname,identity,filters,selection:levelTurnoverIntent(question),signal:active.signal}),/abort/i);assert(!f.requests.some(scope=>scope.level==='L4'));
});
test('actual route deadline rejects a stalled history without late answer or provider execution',async()=>{
 const f=fixture({timeoutMs:30}),{request,source}=await savedRequest(f),before=JSON.stringify(request),detached=independentWorkforceQuestion(request),raw=await publicSolutionEnvelope(detached,source,undefined);
 const history=f.binding.turnoverHistory;let release;
 f.binding.turnoverHistory=scope=>new Promise(resolve=>{release=async()=>resolve(await history(scope));});
 const response=await f.route.handle(new Request('https://'+hostname+'/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':P.token,'x-workforce-request-id':raw.request.requestId},body:JSON.stringify(raw)}));
 const reply=await response.json();assert.equal(response.status,503);assert.equal(reply.code,'home_request_interrupted');assert.equal(reply.answer,undefined);assert.equal(JSON.stringify(request),before);assert.equal(f.providerAttempts,0);
 assert.equal(typeof release,'function');await release();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.providerAttempts,0);assert.equal(JSON.stringify(request),before);
});
