import {aggregateVisual} from './home-aggregate-visual.mjs';
import {roleRecruitingComparison} from './home-role-recruiting.mjs';
import {createHash} from 'node:crypto';
import {estimatePolicyBasePay} from './home-policy-estimate.mjs';
import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata,public9037Fields} from './public-9037-projection.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {aggregateRegistry,queryAggregate} from './home-aggregate-registry.mjs';
import {catalogSourceLabel as catalogDisplayLabel,countryDisplayLabel} from './catalog-display.ts';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
import {queryWorkforceHistory} from './home-history-query.mjs';
import {withBusinessUnitTurnover} from './home-bu-turnover.mjs';

/** Same pinned dashboard source, with an explicit supported intersection per question. */
export async function readPublicWorkforceHistory({binding,hostname,identity,args,signal,requestId}){
 const must=v=>{if(!v)throw Error('Historical workforce evidence could not be verified.');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};
 current();must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&/^[a-f0-9]{64}$/.test(identity.digest));
 must(await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname));
 must(args&&same(Object.keys(args).sort(),['country','end','level','metric','org','start']));
 const filters={country:args.country,org:args.org,level:args.level};
 must(Object.values(filters).every(v=>typeof v==='string'&&v.length>0&&v.length<=100));
 const response=await binding.handle(new Request('https://'+hostname+'/api/dashboard?'+new URLSearchParams(filters),{headers:{'x-workforce-dataset':P.token},signal}));
 current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
 const data=await boundedJson(response.body,8*1024*1024,signal);current();
 must(data?.data_meta?.bundleDigest===identity.digest&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
 const receipt=readDashboardScopeReceipt(data.workforce_filter_scope);
 if(!receipt||receipt.status!=='verified_public_aggregate'||!same(receipt.requested,filters)||!same(receipt.effective,filters))return {answer:'This country, business-unit and level combination is not verified. Choose a supported combination in the workforce filters.'};
 const result=queryWorkforceHistory(data,args);
 const scope=receipt.label.split(';').map((label,i)=>i===0&&filters.country!=='all'?countryDisplayLabel(label.trim(),filters.country):catalogDisplayLabel(label.trim())).join('; ').replace(/[\\`*_[\]<>]/g,'');
 const chart=result.status==='available'&&result.points.length>=2?{version:1,requestId,datasetToken:P.token,packetSha256:createHash('sha256').update(JSON.stringify({digest:identity.digest,filters,args,points:result.points})).digest('hex'),kind:'recorded',synthetic:true,metric:args.metric,title:args.metric==='fte'?'FTE snapshots':'Headcount snapshots',unit:result.unit,sourceId:'W1',scope,asOf:P.cutoff,limitation:'Complete requested month-end stock series from the verified synthetic joint aggregate. No rates or causal inference.',sampled:false,omitted:0,points:result.points}:undefined;
 return {...result,chart,answer:`Scope: ${scope}. Source: recorded workforce dashboard, as of ${P.cutoff}.\n\n${result.answer}`};
}

/** Concise presentation; full definitions remain in chart Details and the source contract. */
export function formatHomeAggregate(result){
 const order=result.order==='ascending'?'lowest to highest':'highest to lowest';
 const population=result.complete?`all ${result.totalGroups} groups`:`${result.eligibleGroups} available groups`;
 const definition=result.metric==='total_turnover_ytd_pct'?'Total YTD turnover':result.metric==='voluntary_turnover_ytd_pct'?'Voluntary YTD turnover':result.definition.split(';')[0].split(', not ')[0];
 const title=`${definition} (${result.unit}), ${order}, across ${population}. Recorded as of ${result.asOf}.`;
 const labels=result.rows.map(row=>{
  const keys=JSON.parse(row.id),label=result.registryId==='workforce.countries'?countryDisplayLabel(row.label,keys[0]):catalogDisplayLabel(row.label);
  const plain=label.replace(/[\\`*_[\]<>]/g,'');
  return `${row.rank}. ${plain}: ${row.value.toLocaleString('en-US',{maximumFractionDigits:result.registryId==="attrition.business_units"&&result.unit==="percent"?2:10})} ${result.unit}`;
 });
 const context=[];
 if(result.registryId.startsWith('finance.'))context.push('Labor cost period: unspecified.');
 if(result.registryId==='listening.items')context.push('Respondent counts vary by item.');
 if(result.registryId.startsWith('career.'))context.push('Recorded employee preferences.');
 if(result.registryId==='pay.job_compa')context.push('Compa uses constructed policy midpoints.');
 if(result.registryId==='catalog.policy_bands')context.push('Constructed policy bands; annual base at 1 FTE.');
 if(result.limitations.some(x=>x.startsWith('Successful-hire journeys')))context.push('Successful-hire records only; funnel conversion unavailable.');
 if(result.coverage==='bounded-source-list')context.push('Ranking covers the available source list.');
 const period=result.registryId.startsWith('finance.')?'':result.registryId==='attrition.business_units'?'January-September 2026':result.period;
 const excluded=result.excludedGroups?`${result.excludedGroups} groups excluded: ${result.registryId==='pay.job_compa'?'Withheld values': 'unavailable values'}.`:'';
 return [...(result.completeTie?[`All ${result.completeTie.count} groups are tied at ${result.completeTie.value} ${result.unit}.`]:labels),title,'Company-wide',period,...context,excluded,...(result.truncated?[`Showing ${result.returnedGroups} of ${result.eligibleGroups} groups, including cutoff ties.`]:[])].filter(Boolean).join('\n\n');
}

/** Uses only the already-authenticated server binding and reviewed public aggregate routes. */
export async function readPublicHomeAggregate({binding,hostname,identity,filters,args,signal,requestId}){
 const must=value=>{if(!value)throw Error('Current aggregate evidence could not be verified.');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};
 current();
 must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&/^[a-f0-9]{64}$/.test(identity.digest));
 must(await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname));
 const definition=aggregateRegistry.find(item=>item.id===args.registryId);
 must(definition&&Object.hasOwn(public9037Fields,definition.path));
 if(args.scope!=='company-wide'||!filters||Object.values(filters).some(value=>value!=='all'))return {answer:'This comparison supports company-wide data only. Clear the workforce filters, or use filtered headcount history.'};
 const response=await binding.handle(new Request('https://'+hostname+definition.path,{headers:{'x-workforce-dataset':P.token},signal}));
 current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
 let data=await boundedJson(response.body,8*1024*1024,signal);current();
 must(data?.data_meta?.bundleDigest===identity.digest&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
 let result;
 try{
  if(definition.id==='recruiting.roles'){
   must(Array.isArray(data.profiles)&&data.profiles.length>0&&data.profiles.length<=100);
   const responses=[];
   for(const profile of data.profiles){
    must(typeof profile.code==='string'&&profile.code.length<=100);
    const r=await binding.handle(new Request('https://'+hostname+'/api/role-buy-feasibility?'+new URLSearchParams({job_profile:profile.code,requested_buy:'0'}),{headers:{'x-workforce-dataset':P.token},signal}));current();must(r.ok&&r.headers.get('x-workforce-dataset')===P.token);
    const d=await boundedJson(r.body,8*1024*1024,signal);current();must(d?.data_meta?.bundleDigest===identity.digest&&same(d.data_meta,public9037Metadata(identity.digest,d.data_meta)));responses.push(d);
   }
   data=roleRecruitingComparison(data,responses,P.cutoff);
  }
  if(definition.id==='attrition.business_units'&&args.metric==='total_turnover_ytd_pct'){
   const dashboards=[];
   for(const org of [...(data.business_units??[]).map(r=>r.org_code),'all']){
    must(dashboards.length<9&&typeof org==='string');
    const r=await binding.handle(new Request('https://'+hostname+'/api/dashboard?'+new URLSearchParams({country:'all',org,level:'all'}),{headers:{'x-workforce-dataset':P.token},signal}));current();must(r.ok&&r.headers.get('x-workforce-dataset')===P.token);
    const d=await boundedJson(r.body,8*1024*1024,signal);current();must(d?.data_meta?.bundleDigest===identity.digest&&same(d.data_meta,public9037Metadata(identity.digest,d.data_meta)));dashboards.push(d);
   }
   data=withBusinessUnitTurnover(data,dashboards);
  }
  result=queryAggregate({registryId:args.registryId,metric:args.metric,order:args.order,limit:args.limit},data);
 }
 catch(error){current();
  if(['recruiting.business_units','recruiting.sources'].includes(definition.id)&&args.metric==='application_to_hire_pct'&&error?.message==='Funnel conversion unavailable: successful-hire journeys only; unsuccessful applications are absent')return {answer:'Application-to-hire conversion is unavailable because the applicant denominator is incomplete. Compare recorded accepted offers or mean time to fill instead.'};
  return {answer:error?.message==='Tie group exceeds20-row bound; request cannot be truncated safely'?'More than 20 groups share this rank. Choose another measure to narrow the comparison.':definition.id==='attrition.business_units'?'I cannot verify this turnover comparison. Choose total or voluntary YTD turnover and the latest recorded period.':'This comparison cannot be verified. Choose a supported measure and the latest recorded period.'};}
 current();
 if(args.asOf!=='current'&&args.asOf!==result.asOf){
  const requested=/^\d{4}-\d{2}-\d{2}$/.test(args.asOf)?args.asOf:'historical period';
  return {answer:definition.id==='attrition.business_units'&&['total_turnover_ytd_pct','voluntary_turnover_ytd_pct'].includes(args.metric)&&result.asOf===P.cutoff?`Business-unit turnover for the requested ${requested} is unavailable. The available comparison covers January–September 2026 (YTD). Ask to use that period to compare business units.`:`The requested ${requested} comparison is unavailable. Available data is dated ${result.asOf}. Ask for the comparison as of that date.`};
 }
 const turnover=definition.id==='attrition.business_units'&&['total_turnover_ytd_pct','voluntary_turnover_ytd_pct'].includes(args.metric);
 const all=turnover?queryAggregate({registryId:args.registryId,metric:args.metric,order:args.order,limit:20},data):null;
 // The turnover chart contract requires the whole eight-BU partition. A nullable
 // registry metric can otherwise produce a partial ranking with a falsely complete chart.
 if(turnover&&(!all.complete||all.totalGroups!==8||all.eligibleGroups!==8||all.rows.length!==8))return {answer:'This turnover comparison is unavailable because values for all eight business units are required. Refresh the data or choose another measure.'};
 const chart=all&&requestId?{version:1,requestId,datasetToken:P.token,packetSha256:createHash('sha256').update(JSON.stringify({digest:identity.digest,result:all})).digest('hex'),kind:'recorded',synthetic:true,axis:'business-unit',metric:args.metric==='total_turnover_ytd_pct'?'bu_total_turnover_pct':'bu_voluntary_turnover_pct',title:args.metric==='total_turnover_ytd_pct'?'Business-unit total turnover':'Business-unit voluntary turnover',unit:'%',sourceId:'A1',scope:'All business units; all countries and levels. January–September 2026.',asOf:result.asOf,limitation:result.definition+'; complete eight-business-unit partition, not a forecast.',sampled:false,omitted:0,points:all.rows.map(r=>({date:JSON.parse(r.id)[0],value:r.value}))}:undefined;
 const comparison=aggregateVisual(result);
 const visual=chart??(comparison&&requestId?{version:1,requestId,datasetToken:P.token,packetSha256:createHash('sha256').update(JSON.stringify({digest:identity.digest,result})).digest('hex'),kind:'recorded',synthetic:true,axis:'aggregate',metric:'aggregate_comparison',title:result.definition,unit:result.unit,sourceId:'G1',scope:result.scope,asOf:result.asOf,limitation:result.limitations.join(' '),sampled:false,omitted:result.excludedGroups,aggregate:comparison,points:result.rows.map(r=>({date:r.id,value:r.value}))}:undefined);
 return {answer:formatHomeAggregate(result),...(visual?{chart:visual,charts:[visual]}:{})};
}

/** Read-only policy estimate through the same authenticated, version-bound aggregate transport. */
export async function readPublicPolicyEstimate({binding,hostname,identity,filters,args,signal}){
 const must=value=>{if(!value)throw Error('Current policy evidence could not be verified.');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};
 current();must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&/^[a-f0-9]{64}$/.test(identity.digest));
 must(await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname));
 if(!filters||Object.values(filters).some(v=>v!=='all'))return {status:'unsupported_scope',message:'Policy estimates support global bands only. Clear filters to continue.'};
 const path='/api/compensation-ranges';must(Object.hasOwn(public9037Fields,path));
 const response=await binding.handle(new Request('https://'+hostname+path,{headers:{'x-workforce-dataset':P.token},signal}));
 current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
 const data=await boundedJson(response.body,8*1024*1024,signal);current();
 must(data?.data_meta?.bundleDigest===identity.digest&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
 const result=estimatePolicyBasePay(data,args);current();return result;
}
