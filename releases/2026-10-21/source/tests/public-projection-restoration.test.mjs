import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {createPublicProjectionTestAdapter,loadPublicProjectionSource,currentPublicHeadcountProjection} from '../lib/public-projection-source.server.mjs';
import {calculateHeadcountProjection} from '../lib/home-solution-projection.ts';
import {createProjectionCurrentnessReceipt} from '../lib/home-projection-currentness.ts';
const filters={country:'all',org:'all',level:'all'},digest='a'.repeat(64);
const spec={id:'public-flow',base:null,method:'monthly_flow',months:3,changes:[['monthly_hires',20],['monthly_exits',10]].map(([field,value])=>({field,kind:'literal',value,basis:'illustrative',turnId:null,interpretation:'Explicit fixture assumption.'}))};
function fake({mutate=()=>{},changed=false,scope=filters}={}){
 let count=0;
 const identity={datasetId:P.datasetId,token:P.token,digest,generation:P.generation};
 const binding={router:{bootstrapToken:async()=>P.token,current:()=>({...identity,digest:changed&&count>0?'b'.repeat(64):digest})},async handle(req){
  assert.equal(req.headers.get('x-workforce-dataset'),P.token);count++;
  const path=new URL(req.url).pathname;
  const values={
   '/api/dashboard':{overview:{snapshot_date:P.cutoff,headcount:9037},workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:scope,effective:scope,label:'Fixture scope',basis:'Reviewed public aggregate',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'}},
   '/api/scenario-modeler':{as_of:P.cutoff,defaults:{annual_growth_pct:1,salary_inflation_pct:1,annual_attrition_pct:1,fill_rate_pct:100,productivity_hiring_reduction_pct:0}},
   '/api/workforce-planning':{scenarios:[{scenario_name:'Baseline',points:[{planning_month:'2027-01-01',planned_headcount:9037,planned_fte:9000,planned_labor_cost_usd:100}]}]}
  };
  const data=structuredClone({...values[path],data_meta:public9037Metadata(digest)});mutate(data,path);
  return Response.json(data,{headers:{'x-workforce-dataset':P.token}});
 }};
 return createPublicProjectionTestAdapter(binding);
}
test('public source binds public provenance, explicit monthly flow and immutable output',async()=>{
 const source=fake(),inputs=await source.projection(filters),p=await calculateHeadcountProjection(spec,inputs,[],[]);
 assert.equal(inputs.opening,9037);assert.equal(inputs.datasetVersion.publicDigest,digest);assert.equal('bundleDigest' in inputs.datasetVersion,false);
 assert.deepEqual(p.points.map(p=>p.headcount),[9047,9057,9067]);assert.match(p.limitations.join(' '),/public projection digest/);
 await assert.rejects(calculateHeadcountProjection({...spec,method:'configured_scenario',months:1,changes:[]},inputs,[],[]),/complete forward window/);
 await assert.rejects(calculateHeadcountProjection({...spec,changes:[]},inputs,[],[]),/unknown/);
 await assert.rejects(createProjectionCurrentnessReceipt(inputs,P.token,filters),/legacy binding/);
});
for(const [label,mutate] of [
 ['private token',d=>d.data_meta.datasetToken='candidate:1'],['unapproved receipt',d=>d.data_meta.publicationReceiptId='other'],['mixed digest',d=>d.data_meta.bundleDigest='b'.repeat(64)],['extra metadata',d=>d.data_meta.hidden='x'],['wrong cutoff',d=>{if(d.overview)d.overview.snapshot_date='2026-08-31';}],['scope mismatch',d=>{if(d.workforce_filter_scope)d.workforce_filter_scope.effective={...filters,country:'US'};}],['private scope',d=>{if(d.workforce_filter_scope)d.workforce_filter_scope.version=2;}],['empty',d=>{if(d.overview){d.overview.headcount=0;d.workforce_filter_scope.stockStatus='known-empty';}}],['unknown',d=>{if(d.overview)d.overview.headcount=null;}],['defaults missing', (d,path)=>{if(path==='/api/scenario-modeler')delete d.defaults.fill_rate_pct;}],['baseline renamed',d=>{if(d.scenarios)d.scenarios[0].scenario_name='Other';}],['baseline missing value',d=>{if(d.scenarios)delete d.scenarios[0].points[0].planned_fte;}]
])test('rejects '+label,async()=>{await assert.rejects(fake({mutate}).projection(filters));});
test('binding changes, abort and malformed filters fail closed',async()=>{
 await assert.rejects(fake({changed:true}).projection(filters),/binding changed/);
 const controller=new AbortController();controller.abort();await assert.rejects(fake().projection(filters,controller.signal));
 for(const f of [{...filters,extra:'all'},{country:'all',org:'all'},{...filters,country:' all'}])await assert.rejects(fake().projection(f));
});
test('filtered source reads scoped stock only without company defaults',async()=>{
 const scope={...filters,country:'US'},source=fake({scope,mutate:(d,path)=>{assert.equal(path,'/api/dashboard');d.overview.headcount=120;}});
 const inputs=await source.projection(scope);assert.equal(inputs.opening,120);assert.equal(inputs.defaults,null);assert.deepEqual(inputs.baseline,[]);
});
test('currentness preserves exact goal, scope, revision and source inputs; epoch checked after digest',async()=>{
 const source=fake(),receipt=await source.currentness(filters),p=await calculateHeadcountProjection(spec,receipt.inputs,[],[]);
 const args={selection:{goalId:'goal',goalStatement:'Keep exact scope',id:p.id,revision:p.revision},activeGoal:{id:'goal',statement:'Keep exact scope'},analyses:[p],receipt,filters,datasetToken:P.token,isCurrent:()=>true};
 assert.equal((await currentPublicHeadcountProjection(args)).id,p.id);
 for(const patch of [{activeGoal:{id:'goal',statement:'Different'}},{selection:{...args.selection,revision:2}},{filters:{...filters,country:'US'}},{datasetToken:'legacy-v1:0'},{receipt:{...receipt,inputDigest:'b'.repeat(64)}},{receipt:{...receipt,inputs:{...receipt.inputs,opening:9036}}},{receipt:{...receipt,provenance:'legacy-live-source-read'}}])await assert.rejects(currentPublicHeadcountProjection({...args,...patch}));
 let calls=0;await assert.rejects(currentPublicHeadcountProjection({...args,isCurrent:()=>++calls===1}),/context changed/);
 const changed={...receipt.inputs,datasetVersion:{...receipt.inputs.datasetVersion,publicDigest:'b'.repeat(64)}};
 await assert.rejects(calculateHeadcountProjection({...spec,base:{id:p.id,revision:p.revision}},changed,[p],[]),/binding changed/);
});
test('actual approved9037 public source: snapshot, filters, public digest and gap remain explicit',{skip:!fs.existsSync(new URL('../.private-9037',import.meta.url))},async()=>{
 const source=await loadPublicProjectionSource({hostname:'people-analytics-gkl61lnek-ed-56dc.vercel.app',production:true});
 const preview=await loadPublicProjectionSource({hostname:'people-analytics-gkl61lnek-ed-56dc.vercel.app',production:false});assert.equal((await preview.projection(filters)).opening,9037);
 const all=await source.projection(filters),scoped=await source.projection({...filters,country:'US',level:'L1'});
 assert.equal(all.opening,9037);assert.equal(all.datasetVersion.publicDigest,'53f5270a08bf3a9c04de43cf22b6b4a48cd092f9fca0b39e113602bbb686bbd9');assert.equal(all.baseline[0].planning_month,'2027-01-01');assert.ok(scoped.opening>0&&scoped.opening<9037);assert.equal(scoped.defaults,null);
 await assert.rejects(calculateHeadcountProjection({...spec,method:'configured_scenario',months:1,changes:[]},all,[],[]),/complete forward window/);
 const receipt=await source.currentness(filters);assert.equal(receipt.inputs.opening,9037);
});
test('legacy mutable-source receipt and private-version projections preserve their contracts',async()=>{
 const inputs=await fake().projection(filters),legacy={...inputs,datasetVersion:null};
 const receipt=await createProjectionCurrentnessReceipt(legacy,'legacy-v1:0',filters);
 assert.equal(receipt.provenance,'legacy-live-source-read');
 const privateInputs={...inputs,datasetVersion:{datasetId:'candidate',datasetToken:'candidate:1',bundleDigest:digest,cutoff:P.cutoff}};
 assert.equal((await calculateHeadcountProjection(spec,privateInputs,[],[])).points[0].headcount,9047);
 for(const version of [{...inputs.datasetVersion,contract:'other'},{...inputs.datasetVersion,publicationReceiptId:'other'},{...inputs.datasetVersion,bundleDigest:digest},{...inputs.datasetVersion,publicDigest:undefined}])await assert.rejects(calculateHeadcountProjection(spec,{...inputs,datasetVersion:version},[],[]));
});
test('bounded loader, handle and response stream terminate; oversized producers are cancelled',async()=>{
 const {loadPublicProjectionTestSource}=await import('../lib/public-projection-source.server.mjs');
 await assert.rejects(loadPublicProjectionTestSource(()=>new Promise(()=>{}),undefined,15),/aborted/);
 const identity={datasetId:P.datasetId,token:P.token,digest,generation:P.generation};
 const router={current:()=>identity,bootstrapToken:async()=>P.token};
 let observedSignal;
 const stalled=createPublicProjectionTestAdapter({router,handle:req=>{observedSignal=req.signal;return new Promise(()=>{});}},{timeoutMs:15});
 await assert.rejects(stalled.projection(filters),/aborted/);assert.equal(observedSignal.aborted,true);
 let cancelled=false;
 const body=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;}});
 const stalledStream=createPublicProjectionTestAdapter({router,handle:async()=>new Response(body,{headers:{'x-workforce-dataset':P.token}})},{timeoutMs:15});
 await assert.rejects(stalledStream.projection(filters));assert.equal(cancelled,true);
 let oversizedCancelled=false;
 const oversized=new ReadableStream({start(c){c.enqueue(new Uint8Array(8*1024*1024+1));},cancel(){oversizedCancelled=true;}});
 await assert.rejects(createPublicProjectionTestAdapter({router,handle:async()=>new Response(oversized,{headers:{'x-workforce-dataset':P.token}})}).projection(filters),/body_too_large/);assert.equal(oversizedCancelled,true);
});
