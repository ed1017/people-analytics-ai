import * as taExtensionModule from '../lib/synthetic-ta/extension.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {dataApiErrorResponse} from '../lib/data-api-error.ts';
import * as numeric from '../lib/numeric-contract.ts';
import * as planning from '../lib/stored-planning.ts';
import * as exitEnps from '../lib/exit-enps.ts';
import {withDatasetRequest} from '../lib/dataset-runtime.ts';

async function capture(run){
 const original=console.error,logs=[];console.error=(...args)=>logs.push(args);
 try{return {value:await run(),logs};}finally{console.error=original;}
}
const privateMessage='JWT issued at future: PRIVATE_JWT PRIVATE_CREDENTIAL https://private.invalid/private-sql';

test('API failure keeps details private and returns a server-generated correlation receipt',async()=>{
 const {value:response,logs}=await capture(()=>dataApiErrorResponse('workforce',{code:'PGRST303',message:privateMessage,details:privateMessage,hint:privateMessage}));
 assert.equal(response.status,500);assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();assert.equal(body.error,'Workforce analytics are temporarily unavailable. Please try again.');
 assert.match(body.correlationId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(response.headers.get('x-correlation-id'),body.correlationId);
 assert.equal(logs.length,1);assert.deepEqual(logs[0],['Data API unavailable',{source:'workforce',correlationId:body.correlationId,code:'PGRST303',errorType:'upstream_error'}]);
 assert.doesNotMatch(JSON.stringify({body,logs}),/JWT|PRIVATE|private.invalid|private-sql/);
});

test('arbitrary exception fields cannot escape through diagnostic codes or names',async()=>{
 for(const error of [new Error(privateMessage),privateMessage,null,{code:privateMessage,name:privateMessage}]){
  const {value:response,logs}=await capture(()=>dataApiErrorResponse('survey-sentiment',error));
  const body=await response.json();assert.match(body.error,/Employee Listening/);
  assert.equal(logs[0][1].code,null);assert.doesNotMatch(JSON.stringify({body,logs}),/JWT|PRIVATE|private.invalid/);
 }
 const {value:ids}=await capture(async()=>Promise.all(['talent-acquisition','workforce-planning'].map(async source=>(await dataApiErrorResponse(source,{code:'42501'}).json()).correlationId)));
 assert.notEqual(ids[0],ids[1]);
});

const code=ts.transpileModule(fs.readFileSync(new URL('../app/api/workforce/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function routeWith(results){
 const calls=[],exports={};
 const supabaseServer={from:table=>{calls.push(table);return {select:()=>({single:async()=>results(table),order:async()=>results(table)})}}};
 vm.runInNewContext(code,{exports,require:name=>{
  if(name==='next/server')return {NextResponse:Response};
  if(name==='@/lib/dataset-runtime')return {withDatasetRequest};
  if(name==='../../../lib/supabase-server')return {supabaseServer};
  if(name==='../../../lib/data-api-error')return {dataApiErrorResponse};
  throw Error('Unexpected import: '+name);
 }});
 return {response:await exports.GET(),calls};
}

test('actual workforce GET preserves its aggregate read contract and legitimate zero',async()=>{
 const {value:{response,calls},logs}=await capture(()=>routeWith(table=>({error:null,data:table==='workforce_current_summary'?{as_of:'2026-09-30',headcount:'0'}:table==='dashboard_headcount_trend'?[{snapshot_date:'2026-09-30',headcount:'0',fte:'0'}]:[]})));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();assert.equal(body.summary.headcount,0);assert.equal(body.trend[0].fte,0);assert.equal(logs.length,0);
 assert.deepEqual(calls,['workforce_current_summary','dashboard_headcount_trend','workforce_business_unit_summary','workforce_country_summary','workforce_level_summary','workforce_tenure_summary','workforce_movement_summary']);
});

test('actual workforce GET redacts every upstream result failure and thrown transport error',async()=>{
 const tables=['workforce_current_summary','dashboard_headcount_trend','workforce_business_unit_summary','workforce_country_summary','workforce_level_summary','workforce_tenure_summary','workforce_movement_summary'];
 for(const failed of [...tables,'transport','missing-summary']){
  const {value:{response},logs}=await capture(()=>routeWith(table=>{
   if(failed==='transport')throw new Error(privateMessage);
   if(table===failed)return {error:{code:'PGRST303',message:privateMessage},data:null};
   return {error:null,data:table==='workforce_current_summary'?(failed==='missing-summary'?null:{headcount:1}):[]};
  }));
  assert.equal(response.status,500);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.error,'Workforce analytics are temporarily unavailable. Please try again.');
  assert.equal(logs.length,1);assert.equal(body.correlationId,logs[0][1].correlationId);
  assert.doesNotMatch(JSON.stringify({body,logs}),/JWT|PRIVATE|private.invalid/);assert.equal(body.summary,undefined);
 }
});

for(const source of ['survey-sentiment','talent-acquisition','workforce-planning']){
 test(`actual ${source} GET redacts failed source reads and transport errors`,async()=>{
  const code=ts.transpileModule(fs.readFileSync(new URL(`../app/api/${source}/route.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const transport of [false,true]){
   const exports={},supabaseServer={from:()=>{
    if(transport)throw new Error(privateMessage);
    const query={select:()=>query,single:()=>query,order:()=>query,in:()=>query,then:resolve=>resolve({data:null,error:{code:'PGRST303',message:privateMessage}})};
    return query;
   }};
   const aliases={'@/lib/dataset-runtime':{withDatasetRequest},'../../../lib/synthetic-ta/extension':taExtensionModule,'next/server':{NextResponse:Response},'../../../lib/supabase-server':{supabaseServer},'../../../lib/data-api-error':{dataApiErrorResponse},'../../../lib/numeric-contract':numeric,'../../../lib/stored-planning':planning,'../../../lib/exit-enps':{...exitEnps,localExitEnpsEnabled:()=>false}};
   vm.runInNewContext(code,{exports,require:name=>{if(name in aliases)return aliases[name];throw Error('Unexpected import: '+name)}});
   const {value:response,logs}=await capture(()=>exports.GET());
   assert.equal(response.status,500);assert.equal(response.headers.get('cache-control'),'no-store');
   const body=await response.json();assert.match(body.error,/temporarily unavailable/);
   assert.equal(logs.length,1);assert.equal(logs[0][1].source,source);
   assert.equal(logs[0][1].code,transport?null:'PGRST303');
   assert.equal(response.headers.get('x-correlation-id'),body.correlationId);
   assert.equal(body.correlationId,logs[0][1].correlationId);
   assert.doesNotMatch(JSON.stringify({body,logs}),/JWT|PRIVATE|private.invalid/);
  }
 });
}
