/** Actual aggregate GETs and Home POST with controlled database promises; no network or model calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {dataApiErrorResponse} from '../lib/data-api-error.ts';
import {withDatasetRequest} from '../lib/dataset-runtime.ts';
import * as dashboardScope from '../lib/dashboard-scope.ts';
import * as performance from '../lib/workforce-performance.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';

const privateDetail='PRIVATE_JWT_CLAIM_SQL_URL_NAME_PAY',token='legacy-v1:0';
const upstream=()=>({data:null,error:{code:'PGRST303',message:privateDetail,details:privateDetail,hint:privateDetail}});
const drain=()=>new Promise(resolve=>setImmediate(resolve));
const filters={country:'all',org:'all',level:'all'};
const dashboardData={overview:{snapshot_date:'2026-09-30',headcount:100,fte:100},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}],filter_options:{}};
const workforceData={as_of:'2026-09-30',summary:{headcount:100,fte:100}};
const attritionData={as_of:'2026-09-30',summary:{total_exits:5,voluntary_exits:3}};
function queryResult(result){const query={select:()=>query,order:()=>query,abortSignal:()=>query,single:()=>result,then:(resolve,reject)=>result.then(resolve,reject)};return query;}
function reader(name,client){
 const code=ts.transpileModule(fs.readFileSync(new URL(`../app/api/${name}/route.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={},aliases={'@/lib/dataset-runtime':{withDatasetRequest},'next/server':{NextResponse:Response},'../../../lib/supabase-server':{supabaseServer:client},'../../../lib/data-api-error':{dataApiErrorResponse},'../../../lib/dashboard-scope':dashboardScope,'../../../lib/workforce-performance':performance};
 vm.runInNewContext(code,{exports,require:key=>{assert.ok(key in aliases,'Unexpected import: '+key);return aliases[key];}});
 return (signal=new AbortController().signal,query='')=>exports.GET(Object.assign(new Request('http://offline.invalid/api/'+name+query,{headers:{'x-workforce-dataset':token},signal}),{nextUrl:new URL('http://offline.invalid/api/'+name+query)}));
}

test('dashboard sanitizes returned and thrown auth failures as well as transport errors',async t=>{
 const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
 for(const kind of ['returned-auth','thrown-auth','transport']){
  logs.length=0;const calls=[];
  const get=reader('dashboard',{rpc:(name,args)=>{calls.push({name,args});return {abortSignal:async()=>{
   if(kind==='transport')throw Error(privateDetail);
   if(kind==='thrown-auth')throw upstream().error;
   return upstream();
  }};}});
  const response=await get(undefined,'?country=US&org=BU-TECH&level=L3'),body=await response.json();
  assert.equal(response.status,kind==='transport'?500:503);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(body.code,kind==='transport'?'source_unavailable':'source_auth_unavailable');
  assert.equal(body.error,'Dashboard analytics are temporarily unavailable. Please try again.');
  assert.equal(response.headers.get('x-correlation-id'),body.correlationId);assert.equal(response.headers.get('www-authenticate'),null);
  assert.equal(logs.length,1);assert.equal(logs[0][1].source,'dashboard');assert.equal(logs[0][1].correlationId,body.correlationId);
  assert.doesNotMatch(JSON.stringify({body,logs}),new RegExp(privateDetail));assert.equal(body.overview,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{name:'dashboard_overview_filtered',args:{p_country_code:'US',p_org_code:'BU-TECH',p_level_code:'L3'}}]);
 }
});

test('dashboard successful scope and frozen-rating availability contracts stay unchanged',async t=>{
 const logs=[],calls=[];t.mock.method(console,'error',(...args)=>logs.push(args));
 const get=reader('dashboard',{rpc:(name,args)=>{calls.push({name,args});return {abortSignal:async()=>name==='dashboard_overview_filtered'?{data:dashboardData,error:null}:{data:null,error:null}};}});
 const response=await get(),body=await response.json();assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-workforce-dataset'),token);
 assert.deepEqual(body,{...dashboardScope.scopedDashboardResponse(dashboardData,filters),performance_rating:null});
 assert.deepEqual(calls.map(call=>call.name),['dashboard_overview_filtered','workforce_performance_release_v1']);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1].args)),{p_country_code:'all',p_org_code:'all',p_level_code:'all'});
 assert.equal(logs.length,0);
});

test('attrition preserves upstream auth codes and redacts returned and thrown failures',async t=>{
 const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
 for(const kind of ['returned-auth','thrown-auth','transport']){
  logs.length=0;
  const get=reader('attrition',{from:()=>{if(kind==='transport')throw Error(privateDetail);if(kind==='thrown-auth')throw upstream().error;return queryResult(Promise.resolve(upstream()));}});
  const response=await get(),body=await response.json();
  assert.equal(response.status,kind==='transport'?500:503);assert.equal(body.code,kind==='transport'?'source_unavailable':'source_auth_unavailable');
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-correlation-id'),body.correlationId);
  assert.equal(logs.length,1);assert.equal(logs[0][1].source,'attrition');assert.equal(logs[0][1].correlationId,body.correlationId);
  assert.equal(body.summary,undefined);assert.doesNotMatch(JSON.stringify({body,logs}),new RegExp(privateDetail));
 }
 const get=reader('attrition',{from:name=>queryResult(Promise.resolve({data:name==='attrition_current_summary'?{as_of:'2026-09-30',total_exits:'0',voluntary_exits:'0'}:[],error:null}))});
 const response=await get(),body=await response.json();assert.equal(response.status,200);assert.equal(body.summary.total_exits,0);assert.equal(body.summary.voluntary_exits,0);
});

// Reuse the isolated route bundle; each case starts independent state and pending source reads.
let isolatedRoute;
for(const pair of [['dashboard','workforce'],['dashboard','attrition'],['workforce','attrition']])for(const first of pair)test(`shared PGRST303 outage with ${pair.join('/')} stays classified when ${first} finishes first`,async t=>{
 const isolated=await (isolatedRoute??=offlineBusinessRoute()),logs=[];
 t.mock.method(console,'error',(...args)=>logs.push(args));isolated.sandbox.console={error:(...args)=>logs.push(args),info:()=>{}};
 isolated.sandbox.__requests.length=0;isolated.sandbox.__aggregateReads=[];isolated.sandbox.__aggregateSources={};
 const gates={dashboard:Promise.withResolvers(),workforce:Promise.withResolvers(),attrition:Promise.withResolvers()},seen=new Map(),delivered=[];
 const dashboard=reader('dashboard',{rpc:()=>({abortSignal:()=>gates.dashboard.promise})});
 const workforce=reader('workforce',{from:()=>queryResult(gates.workforce.promise)}),attrition=reader('attrition',{from:()=>queryResult(gates.attrition.promise)});
 isolated.sandbox.__aggregateResponse=async(key,signal)=>{assert.ok(pair.includes(key));seen.set(key,signal);const response=await ({dashboard,workforce,attrition})[key](signal);delivered.push({key,status:response.status,body:await response.clone().json()});return response;};
 const data={dashboard:dashboardScope.scopedDashboardResponse(dashboardData,filters),workforce:workforceData,attrition:attritionData};
 const body=solutionRequest('recommend me a plan');body.evidence=buildHomePack(Object.fromEntries(pair.map(key=>[key,{status:'loaded',data:data[key]}])),body.scope);
 for(const key of pair)assert.equal(body.evidence.sources.find(s=>s.id===({dashboard:'W1',workforce:'W2',attrition:'A1'})[key]).status,'loaded');
 const before=JSON.stringify(body),pending=isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':token},body:before}));
 await drain();assert.deepEqual([...seen.keys()],pair);gates[first].resolve(upstream());
 const response=await pending,payload=await response.json(),event=JSON.parse(logs.find(entry=>entry[0]==='Home solution conversation failed')[1]);
 assert.equal(response.status,503);assert.equal(payload.code,'evidence_source_auth_unavailable');assert.match(payload.error,/server could not authenticate/);
 assert.equal(event.grounding.reader,first);assert.equal(event.grounding.readFailure,'source_authentication');assert.equal(event.grounding.upstreamCode,'PGRST303');
 assert.equal(event.grounding.readersStarted,2);assert.equal(event.grounding.readersCompleted,0);assert.equal(event.modelAttempts,0);assert.equal(isolated.sandbox.__requests.length,0);
 assert.equal(delivered.length,1,'Grounding fails immediately without waiting for the later reader');assert.equal(event.grounding.sourceCorrelationId,delivered[0].body.correlationId);
 assert.ok([...seen.values()].every(signal=>signal.aborted));assert.equal(JSON.stringify(body),before);assert.equal(payload.state,undefined);assert.equal(payload.answer,undefined);
 const last=pair.find(key=>key!==first);gates[last].resolve(upstream());await drain();await drain();
 assert.equal(delivered.length,2);assert.ok(delivered.every(item=>item.status===503&&item.body.code==='source_auth_unavailable'));
 assert.equal(logs.filter(entry=>entry[0]==='Home solution conversation failed').length,1,'Late completion cannot replace the first terminal failure');
 assert.equal(event.grounding.reader,first);assert.equal(isolated.sandbox.__requests.length,0);
 assert.doesNotMatch(JSON.stringify({payload,logs,delivered}),new RegExp(privateDetail));
 delete isolated.sandbox.__aggregateResponse;
});
