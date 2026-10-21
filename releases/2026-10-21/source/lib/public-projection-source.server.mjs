/** Disabled restoration foundation. No route imports this module. */
import {loadPublic9037Binding} from './public-9037.server.mjs';
import {PUBLIC_9037} from './public-9037-contract.mjs';
import {public9037Metadata} from './public-9037-projection.mjs';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
import {projectionCurrentnessFilters} from './home-projection-currentness.ts';
import {isPublicProjectionVersion} from './public-projection-contract.mjs';
import {projectionDigest,readHeadcountProjections} from './home-solution-projection.ts';
import {isDeepStrictEqual as same} from 'node:util';
import {boundedJson} from './public-qa-stream.server.mjs';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';
async function boundedOperation(operation,incoming,timeoutMs){
 must(Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=30000,'Invalid projection deadline');
 const controller=new AbortController(),signal=AbortSignal.any([incoming??new AbortController().signal,controller.signal]);
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{signal.throwIfAborted();return await awaitPublicQaBinding(Promise.resolve().then(()=>operation(signal)),signal);}
 finally{clearTimeout(timer);controller.abort();}
}
const must=(v,m)=>{if(!v)throw Error(m);};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&same(Object.keys(v).sort(),[...keys].sort());
const date=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const nonnegative=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const defaultsFields=['annual_growth_pct','salary_inflation_pct','annual_attrition_pct','fill_rate_pct','productivity_hiring_reduction_pct'];
function checkedFilters(filters){must(exact(filters,['country','org','level']),'Explicit projection scope required');return projectionCurrentnessFilters(new URLSearchParams(filters));}
function checkedInputs(raw){
 must(exact(raw,['asOf','opening','filters','scope','relations','datasetVersion','defaults','baseline'])&&isPublicProjectionVersion(raw.datasetVersion)&&raw.asOf===PUBLIC_9037.cutoff&&nonnegative(raw.opening)&&raw.opening>0&&raw.opening<=1e9&&typeof raw.scope==='string'&&raw.scope.trim()&&raw.scope.length<=300&&Array.isArray(raw.relations)&&raw.relations.length>0&&raw.relations.length<=10&&raw.relations.every(v=>typeof v==='string'&&v.length>0&&v.length<100),'Public projection inputs unavailable');
 checkedFilters(raw.filters);
 must(raw.defaults===null||exact(raw.defaults,defaultsFields)&&Object.values(raw.defaults).every(v=>typeof v==='number'&&Number.isFinite(v)),'Invalid public scenario defaults');
 must(Array.isArray(raw.baseline)&&raw.baseline.length<=24&&raw.baseline.every(row=>exact(row,['planning_month','planned_headcount','planned_fte','planned_labor_cost_usd'])&&date(row.planning_month)&&['planned_headcount','planned_fte','planned_labor_cost_usd'].every(k=>nonnegative(row[k]))),'Invalid public baseline');
 return structuredClone(raw);
}
/** Production entry always constructs the reviewed public projector; callers cannot inject a private port. */
export async function loadPublicProjectionSource(options,signal){return loadPublicProjectionTestSource(()=>loadPublic9037Binding(options),signal,30000,options.hostname);}
/** Offline loader seam for stalled-binding tests, never runtime dependency injection. */
export async function loadPublicProjectionTestSource(loader,signal,timeoutMs=30000,hostname='www.ed-ai.app'){
 const binding=await boundedOperation(()=>loader(),signal,timeoutMs);
 return createPublicProjectionTestAdapter(binding,{timeoutMs,hostname});
}
/** Explicit offline fake-public-document seam, never an authenticated source factory. */
export function createPublicProjectionTestAdapter(binding,{timeoutMs=30000,hostname='www.ed-ai.app'}={}){
 async function projection(rawFilters,incoming){return boundedOperation(async signal=>{
  must(hostname==='www.ed-ai.app'||/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname),'Invalid public projection hostname');
  const filters=checkedFilters(rawFilters);signal.throwIfAborted();
  const identity=structuredClone(binding.router.current());
  must(exact(identity,['datasetId','digest','token','generation'])&&identity.datasetId===PUBLIC_9037.datasetId&&identity.token===PUBLIC_9037.token&&identity.generation===2&&/^[a-f0-9]{64}$/.test(identity.digest)&&await binding.router.bootstrapToken()===PUBLIC_9037.token,'Public projection binding unavailable');
  const check=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity),'Public projection binding changed');};
  async function read(path){
   check();const r=await binding.handle(new Request('https://'+hostname+path,{signal,headers:{'x-workforce-dataset':identity.token}}));
   must(r.ok&&r.headers.get('x-workforce-dataset')===identity.token,'Public projection evidence unavailable');
   const data=await boundedJson(r.body,8*1024*1024,signal);check();must(same(data?.data_meta,public9037Metadata(identity.digest,data?.data_meta)),'Public projection metadata mismatch');return data;
  }
  const d=await read('/api/dashboard?'+new URLSearchParams(filters)),scope=readDashboardScopeReceipt(d.workforce_filter_scope);
  must(scope?.status==='verified_public_aggregate'&&same(scope.requested,filters)&&same(scope.effective,filters),'Public projection scope unavailable');
  must(scope.stockStatus==='positive'&&nonnegative(d.overview?.headcount)&&d.overview.headcount>0,'Projection requires positive opening stock; verified empty stock is not an unknown or usable opening.');
  const inputs={asOf:d.overview.snapshot_date,opening:d.overview.headcount,filters,scope:scope.label,relations:['public-dashboard-joint-v3'],datasetVersion:{datasetId:identity.datasetId,datasetToken:identity.token,publicDigest:identity.digest,cutoff:PUBLIC_9037.cutoff,provenance:'approved-public-projection-v1',contract:PUBLIC_9037.contract,publicationReceiptId:PUBLIC_9037.approval},defaults:null,baseline:[]};
  if(Object.values(filters).every(v=>v==='all')){
   const [scenario,planning]=await Promise.all([read('/api/scenario-modeler'),read('/api/workforce-planning')]);
   must(scenario.as_of===inputs.asOf&&Array.isArray(planning.scenarios)&&planning.scenarios.length===1&&planning.scenarios[0].scenario_name==='Baseline'&&Array.isArray(planning.scenarios[0].points),'Public projection reference identity mismatch');
   inputs.defaults=scenario.defaults;inputs.baseline=planning.scenarios[0].points.map(({planning_month,planned_headcount,planned_fte,planned_labor_cost_usd})=>({planning_month,planned_headcount,planned_fte,planned_labor_cost_usd}));inputs.relations.push('public-scenario-modeler-defaults','public-workforce-planning:Baseline');
  }
  check();must(await binding.router.bootstrapToken()===identity.token,'Public projection bootstrap changed');check();return checkedInputs(inputs);
 },incoming,timeoutMs);}
 return Object.freeze({projection,async currentness(filters,signal){const inputs=await projection(filters,signal);const inputDigest=await projectionDigest(inputs);signal?.throwIfAborted();must(binding.router.current().digest===inputs.datasetVersion.publicDigest&&binding.router.current().token===inputs.datasetVersion.datasetToken,'Public projection binding changed');return {version:1,provenance:'approved-public-projection-read',datasetToken:PUBLIC_9037.token,checkedAt:new Date().toISOString(),inputs,inputDigest};}});
}
/** A caller must obtain a fresh source receipt and own cancellation/goal/selection epochs. This is not a publication certificate. */
export async function currentPublicHeadcountProjection({selection,activeGoal,analyses,receipt,filters,datasetToken,isCurrent}){
 must(isCurrent()&&selection.goalId&&selection.goalId===activeGoal.id&&selection.goalStatement===activeGoal.statement,'The selected projection goal changed.');
 must(exact(receipt,['version','provenance','datasetToken','checkedAt','inputs','inputDigest'])&&receipt.version===1&&receipt.provenance==='approved-public-projection-read'&&receipt.datasetToken===PUBLIC_9037.token&&datasetToken===receipt.datasetToken&&typeof receipt.checkedAt==='string'&&Number.isFinite(Date.parse(receipt.checkedAt))&&new Date(receipt.checkedAt).toISOString()===receipt.checkedAt,'Public projection receipt unavailable or stale');
 const inputs=checkedInputs(receipt.inputs);must(same(inputs.filters,checkedFilters(filters)),'Public projection scope changed');
 const item=readHeadcountProjections(analyses).find(v=>v.id===selection.id&&v.revision===selection.revision);must(item,'Select an available projection revision.');
 const digest=await projectionDigest(inputs);must(isCurrent(),'Projection context changed during verification');
 must(receipt.inputDigest===digest&&item.inputDigest===digest&&same(item.inputs,inputs),'Projection inputs changed; review current source inputs');return item;
}
