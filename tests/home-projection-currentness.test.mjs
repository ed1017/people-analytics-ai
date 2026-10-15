import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {DatasetRouter} from '../lib/dataset-router.mjs';
import {createDatasetRequestBoundary} from '../lib/dataset-request-boundary.mjs';
import * as currentness from '../lib/home-projection-currentness.ts';
import {calculateHeadcountProjection,projectionDigest} from '../lib/home-solution-projection.ts';
import {dashboardScopeReceipt} from '../lib/dashboard-scope.ts';
import {projectionInputs,projectionSpec} from './fixtures/home-solution-conversation.mjs';
const {projectionCurrentnessFilters,createProjectionCurrentnessReceipt,currentHeadcountProjection}=currentness;
const filters={country:'all',org:'all',level:'all'},token='legacy-v1:0';
const url='https://fixture.invalid/api/home-solution-conversation?country=all&org=all&level=all';
const loadModule=(file,require)=>{
 const exports={},source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js,{exports,require,Response,Request,URL,AbortSignal,process:{env:{}},fetch:()=>{throw Error('Network forbidden');}});
 return exports;
};
function routeHarness({load=async()=>projectionInputs(),enabled=true}={}){
 const calls={source:0,model:0,write:0},router=new DatasetRouter({ 'legacy-v1':{digest:'uncertified-live-v1'} },{read:async()=>({datasetId:'legacy-v1',generation:0,digest:'uncertified-live-v1'}),compareAndSwap:async()=>{calls.write++;throw Error('Write forbidden');}});
 const boundary=createDatasetRequestBoundary({router,retained:{'legacy-v1':{assertAvailable:async()=>true}}});
 const runtime={withDatasetRequest:boundary,datasetRouter:router,datasetAI:()=>{calls.model++;throw Error('Model forbidden');}};
 const routeModule=loadModule('app/api/home-solution-conversation/route.ts',name=>{
  if(name==='@/lib/dataset-runtime')return runtime;
  if(name==='@/lib/home-projection-currentness')return currentness;
  if(name==='@/lib/home-solution-conversation')return {solutionConversationEnabled:enabled};
  if(name==='@/lib/home-solution-projection-source')return {loadSolutionProjectionInputs:async(...args)=>{calls.source++;return load(...args);}};
  if(name==='openai')return {default:class{constructor(){calls.model++;throw Error('Model forbidden');}}};
  return {};
 });
 return {get:routeModule.GET,calls};
}
async function selectionFixture(inputs=projectionInputs(),spec=projectionSpec()){
 const item=await calculateHeadcountProjection(spec,inputs,[],[]),receipt=await createProjectionCurrentnessReceipt(inputs,token,filters);
 return {selection:{goalId:'goal-1',goalStatement:'Review workforce capacity',id:item.id,revision:item.revision},activeGoal:{id:'goal-1',statement:'Review workforce capacity'},analyses:[item],receipt,filters,datasetToken:token,isCurrent:()=>true};
}
test('GET uses existing dataset boundary, returns only input contract, and never calls model or writes',async()=>{
 const h=routeHarness(),response=await h.get(new Request(url,{headers:{'x-workforce-dataset':token}}));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-workforce-dataset'),token);
 const receipt=await response.json();assert.equal(receipt.provenance,'legacy-live-source-read');assert.equal(receipt.inputs.datasetVersion,null);
 assert.deepEqual(Object.keys(receipt).sort(),['version','provenance','datasetToken','checkedAt','inputs','inputDigest'].sort());
 assert.deepEqual(receipt.inputs,projectionInputs());assert.equal(receipt.inputDigest,await projectionDigest(receipt.inputs));
 assert.deepEqual(h.calls,{source:1,model:0,write:0});
});
test('strict filters reject missing, duplicate, extra, empty and control values before source access',async()=>{
 const h=routeHarness();
 for(const query of ['', '?country=all&org=all', '?country=all&org=all&level=all&country=US', '?country=all&org=all&level=all&goal=secret', '?country=&org=all&level=all', '?country=%20US&org=all&level=all','?country=US%00&org=all&level=all','?country='+('a'.repeat(101))+'&org=all&level=all']){
  const response=await h.get(new Request(url.split('?')[0]+query));assert.equal(response.status,400,query);assert.equal(response.headers.get('cache-control'),'no-store');
 }
 assert.deepEqual(h.calls,{source:0,model:0,write:0});
 assert.deepEqual(projectionCurrentnessFilters(new URLSearchParams('level=L2&org=OPS&country=US')),{country:'US',org:'OPS',level:'L2'});
});
test('stale dataset header, disabled feature, abort, source failure and wrong scope do not return a receipt',async()=>{
 const h=routeHarness(),stale=await h.get(new Request(url,{headers:{'x-workforce-dataset':'legacy-v1:1'}}));
 assert.equal(stale.status,409);assert.equal(h.calls.source,0);
 const disabled=routeHarness({enabled:false});assert.equal((await disabled.get(new Request(url))).status,404);assert.equal(disabled.calls.source,0);
 const abort=new AbortController();abort.abort();assert.equal((await h.get(new Request(url,{signal:abort.signal}))).status,503);assert.equal(h.calls.source,0);
 for(const load of [async()=>{throw Error('PRIVATE_DATABASE_DETAIL');},async()=>projectionInputs({country:'US',org:'all',level:'all'}),async()=>({...projectionInputs(),opening:0}),async()=>({...projectionInputs(),datasetVersion:{datasetToken:'other:1'}})]){
  const failed=routeHarness({load}),response=await failed.get(new Request(url));assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.doesNotMatch(await response.text(),/PRIVATE_DATABASE_DETAIL|inputDigest|inputs"/);assert.equal(failed.calls.model,0);assert.equal(failed.calls.write,0);
 }
 const pending=new AbortController(),duringRead=routeHarness({load:async()=>{pending.abort();return projectionInputs();}});
 assert.equal((await duringRead.get(new Request(url,{signal:pending.signal}))).status,503);
});
test('exact explicit projection selection verifies arithmetic and all current inputs without mutation',async()=>{
 const f=await selectionFixture(),before=JSON.stringify(f);
 const value=await currentHeadcountProjection(f);assert.deepEqual(value,f.analyses[0]);assert.notEqual(value,f.analyses[0]);assert.equal(JSON.stringify(f),before);
 for(const selection of [{...f.selection,id:'absent'},{...f.selection,revision:2},{...f.selection,goalId:''},{...f.selection,goalStatement:'Changed'}])await assert.rejects(currentHeadcountProjection({...f,selection}));
 for(const activeGoal of [{id:'other',statement:f.activeGoal.statement},{id:f.activeGoal.id,statement:'Changed'}])await assert.rejects(currentHeadcountProjection({...f,activeGoal}));
 await assert.rejects(currentHeadcountProjection({...f,isCurrent:()=>false}));
 let checks=0;await assert.rejects(currentHeadcountProjection({...f,isCurrent:()=>++checks===1}),/context changed/);
});
test('source drift and malformed or stale receipts fail closed even if token is unchanged',async()=>{
 const f=await selectionFixture();
 for(const change of [v=>v.opening++,v=>v.asOf='2026-07-31',v=>v.scope='Other scope',v=>v.defaults.annual_attrition_pct++,v=>v.baseline[0].planned_headcount++,v=>v.relations.push('different-source')]){
  const inputs=structuredClone(f.receipt.inputs);change(inputs);
  const receipt=await createProjectionCurrentnessReceipt(inputs,token,filters);
  await assert.rejects(currentHeadcountProjection({...f,receipt}),/inputs changed/);
 }
 for(const receipt of [{...f.receipt,inputDigest:'0'.repeat(64)},{...f.receipt,datasetToken:'legacy-v1:1'},{...f.receipt,provenance:'certified'},{...f.receipt,checkedAt:'invalid'},{...f.receipt,extra:'private'},null])await assert.rejects(currentHeadcountProjection({...f,receipt}));
 await assert.rejects(currentHeadcountProjection({...f,filters:{...filters,country:'US'}}));
 const tampered=structuredClone(f.analyses);tampered[0].points[0].headcount++;
 await assert.rejects(currentHeadcountProjection({...f,analyses:tampered}),/arithmetic/);
 const digest=structuredClone(f.analyses);digest[0].inputDigest='0'.repeat(64);await assert.rejects(currentHeadcountProjection({...f,analyses:digest}),/inputs changed/);
 for(const inputs of [{...projectionInputs(),privateRows:[]},{...projectionInputs(),asOf:'2026-02-30'},{...projectionInputs(),baseline:[{...projectionInputs().baseline[0],privateField:'withheld'}]},{...projectionInputs(),defaults:{annual_growth_pct:1}}])await assert.rejects(createProjectionCurrentnessReceipt(inputs,token,filters));
});

function sourceHarness({optionalError=false,wrongSnapshot=false,unsupported=false}={}){
 const calls=[],inputs=projectionInputs(),data={overview:{snapshot_date:inputs.asOf,headcount:inputs.opening},trend:[{snapshot_date:inputs.asOf}],filter_options:{countries:[],business_units:[],levels:[]}};
 const results={scenario_modeler_defaults:{data:Object.fromEntries(Object.entries(inputs.defaults).map(([k,v])=>['baseline_'+k,v]))},workforce_scenario_summary:{data:inputs.baseline},dashboard_overview_current:{data:{snapshot_date:wrongSnapshot?'2026-07-31':inputs.asOf,headcount:inputs.opening}}};
 const client={rpc:(name,args)=>{calls.push(['rpc',name,args]);return {abortSignal:async()=>({data:unsupported?{...data,applied_filters:{country:'US',org:'all',level:'all'}}:data})};},from:name=>{
  calls.push(['from',name]);const chain={};for(const method of ['select','eq','order','limit','single','abortSignal'])chain[method]=()=>chain;
  chain.then=(resolve,reject)=>Promise.resolve(optionalError?{error:{message:'optional unavailable'}}:results[name]).then(resolve,reject);return chain;
 }};
 const source=loadModule('lib/home-solution-projection-source.ts',name=>name==='./supabase-server'?{supabaseServer:client}:name==='./dashboard-scope'?{dashboardScopeReceipt}:{});
 return {load:source.loadSolutionProjectionInputs,calls};
}
test('real source loader preserves monthly-flow availability when optional configured sources fail or mismatch',async()=>{
 for(const options of [{optionalError:true},{wrongSnapshot:true}]){
  const source=sourceHarness(options),inputs=await source.load(filters,new AbortController().signal);
  assert.equal(inputs.datasetVersion,null);assert.equal(inputs.defaults,null);assert.deepEqual(Array.from(inputs.baseline),[]);
  const spec={id:'flow',base:null,method:'monthly_flow',months:2,changes:[['monthly_hires',4],['monthly_exits',2]].map(([field,value])=>({field,value,kind:'literal',basis:'illustrative',turnId:null,interpretation:'Explicit offline scenario assumption.'}))};
  const f=await selectionFixture(inputs,spec),checked=await currentHeadcountProjection(f);assert.equal(checked.points[1].headcount,104);
  await assert.rejects(calculateHeadcountProjection(projectionSpec(),inputs,[],[]),/baseline\/defaults/);
  assert.equal(source.calls.filter(c=>c[0]==='rpc').length,1);assert.equal(source.calls.filter(c=>c[0]==='from').length,3);
 }
});
test('real source loader supplies complete configured inputs and rejects unverified population scope',async()=>{
 const source=sourceHarness(),inputs=await source.load(filters,new AbortController().signal);
 assert.deepEqual(structuredClone(inputs.defaults),projectionInputs().defaults);assert.equal(inputs.baseline.length,3);
 const f=await selectionFixture(inputs);assert.equal((await currentHeadcountProjection(f)).points.length,3);
 const bad=sourceHarness({unsupported:true});await assert.rejects(bad.load(filters,new AbortController().signal),/population could not be verified/);assert.equal(bad.calls.length,1);
});
