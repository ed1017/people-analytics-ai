import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata,public9037Fields} from './public-9037-projection.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {aggregateRegistry,queryAggregate} from './home-aggregate-registry.mjs';
import {catalogDisplayLabel,countryDisplayLabel} from './catalog-display.ts';

export function formatHomeAggregate(result){
 const order=result.order==='ascending'?'lowest to highest':'highest to lowest';
 const population=result.complete?`all ${result.totalGroups} released groups`:`${result.eligibleGroups} eligible groups in the released collection`;
 const title=`${result.definition} (${result.unit}), ${order}, across ${population}. Recorded as of ${result.asOf}.`;
 const labels=result.rows.map(row=>{
  const keys=JSON.parse(row.id),label=result.registryId==='workforce.countries'?countryDisplayLabel(row.label,keys[0]):catalogDisplayLabel(row.label);
  // Labels are source text, not Markdown structure or model instructions.
  const plain=label.replace(/[\\`*_[\]<>]/g,'');
  return `${row.rank}. ${plain}: ${row.value.toLocaleString('en-US',{maximumFractionDigits:10})} ${result.unit}`;
 });
 return [title,result.scope,result.period,...labels,...(result.excludedGroups?[`${result.excludedGroups} groups have unknown values and are excluded; this does not rank them as zero.`]:[]),...(result.truncated?[`Showing ${result.returnedGroups} of ${result.eligibleGroups} eligible groups after ranking the whole released collection; ties at the cutoff are retained.`]:[]),...result.limitations].join('\n\n');
}

/** Uses only the already-authenticated server binding and reviewed public aggregate routes. */
export async function readPublicHomeAggregate({binding,hostname,identity,filters,args,signal}){
 const must=value=>{if(!value)throw Error('Current aggregate evidence could not be verified.');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};
 current();
 must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===2&&/^[a-f0-9]{64}$/.test(identity.digest));
 must(await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname));
 const definition=aggregateRegistry.find(item=>item.id===args.registryId);
 must(definition&&Object.hasOwn(public9037Fields,definition.path));
 if(args.scope!=='company-wide'||!filters||Object.values(filters).some(value=>value!=='all'))return {answer:'This comparison is available only for the complete company-wide aggregate. The current filters are not applied to these groups. Clear the workforce filters and ask for a company-wide comparison, or use the supported filtered headcount view.'};
 const response=await binding.handle(new Request('https://'+hostname+definition.path,{headers:{'x-workforce-dataset':P.token},signal}));
 current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
 const data=await boundedJson(response.body,8*1024*1024,signal);current();
 must(data?.data_meta?.bundleDigest===identity.digest&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
 let result;
 try{result=queryAggregate({registryId:args.registryId,metric:args.metric,order:args.order,limit:args.limit},data);}
 catch(error){current();return {answer:error?.message==='Tie group exceeds20-row bound; request cannot be truncated safely'?`More than 20 groups are tied at the requested cutoff in ${definition.id}. A shortened list would omit equally ranked groups, so no partial ranking is shown. Choose another supported measure or inspect the complete catalog.`:`The requested ${definition.id} comparison cannot be verified from the released aggregate: the metric, group completeness, date or suppression checks did not pass. No ranking is shown. Available metric names for this collection are ${Object.keys(definition.metrics).join(', ')}; current company-wide comparisons are the supported scope.`};}
 current();
 if(args.asOf!=='current'&&args.asOf!==result.asOf)return {answer:`This collection is dated ${result.asOf}, not the requested ${/^\d{4}-\d{2}-\d{2}$/.test(args.asOf)?args.asOf:'historical period'}. No ranking for the requested date is available. Ask for the latest released comparison; it will retain the source's recorded date and period.`};
 return {answer:formatHomeAggregate(result)};
}
