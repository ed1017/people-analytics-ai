import {createHash} from 'node:crypto';
import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata} from './public-9037-projection.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
import {catalogSourceLabel,countryDisplayLabel} from './catalog-display.ts';
import {QUARTERLY_DEFINITION,calculateQuarterlyTurnover,readQuarterlyTurnover} from './home-quarterly-turnover.mjs';

/** Only scoped aggregate dashboard responses; no model values or employee records. */
export async function readPublicQuarterlyTurnover({binding,hostname,identity,filters,selection,signal,requestId}){
 const must=v=>{if(!v)throw Error('Quarterly turnover data could not be verified.');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};
 current();must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&/^[a-f0-9]{64}$/.test(identity.digest)&&await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname));
 must(filters&&same(Object.keys(filters).sort(),['country','level','org'])&&Object.values(filters).every(v=>typeof v==='string'&&v.length>0&&v.length<=100));
 must(['country','org','level'].includes(selection.groupBy)&&['total','voluntary'].includes(selection.metric)&&(selection.year===null||Number.isInteger(selection.year)&&selection.year>=2000&&selection.year<=2099)&&Array.isArray(selection.quarters)&&selection.quarters.length<=4&&selection.quarters.every(q=>[1,2,3,4].includes(q)));
 async function read(scoped){
  const response=await binding.handle(new Request('https://'+hostname+'/api/dashboard?'+new URLSearchParams(scoped),{headers:{'x-workforce-dataset':P.token},signal}));current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
  const data=await boundedJson(response.body,8*1024*1024,signal);current();must(data?.data_meta?.bundleDigest===identity.digest&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
  const receipt=readDashboardScopeReceipt(data.workforce_filter_scope);must(receipt?.status==='verified_public_aggregate'&&same(receipt.requested,scoped)&&same(receipt.effective,scoped));
  return data;
 }
 const base=await read(filters),key={org:'business_units',country:'countries',level:'levels'}[selection.groupBy];
 const options=base.filter_options?.[key];must(Array.isArray(options)&&options.length>0&&options.length<=12&&new Set(options.map(o=>o.value)).size===options.length);
 const groups=options.filter(o=>filters[selection.groupBy]==='all'||o.value===filters[selection.groupBy]);must(groups.length>0);
 const rows=[];
 for(const group of groups){
  must(typeof group.value==='string'&&typeof group.label==='string');
  const scoped={...filters,[selection.groupBy]:group.value};must(typeof binding.turnoverHistory==='function');
  const data=await binding.turnoverHistory(scoped);current();
  must(data?.contract==='public-group-turnover-history-v1'&&data.datasetToken===P.token&&data.bundleDigest===identity.digest&&data.asOf===P.cutoff&&same(data.filters,scoped));
  const groupLabel=(selection.groupBy==='country'?countryDisplayLabel(group.label,group.value):catalogSourceLabel(group.label)).replace(/[\\`*_[\]<>]/g,'');
  rows.push(...calculateQuarterlyTurnover(data.rows,selection,P.cutoff).map(row=>({...row,groupCode:group.value,groupLabel})));
 }
 const quarterly={groupBy:selection.groupBy,metric:selection.metric,asOf:P.cutoff,definition:QUARTERLY_DEFINITION,rows};must(readQuarterlyTurnover(quarterly));
 const scope=base.workforce_filter_scope.label.replace(/[\\`*_[\]<>]/g,''),title=`Quarterly ${selection.metric} turnover by ${selection.groupBy==='org'?'business unit':selection.groupBy==='country'?'country':'level'}`;
 const fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:2});
 const answer=[title+'.',`Scope: ${scope}. Synthetic data through ${P.cutoff}.`,...groups.map(group=>{const selected=rows.filter(r=>r.groupCode===group.value);return `${selected[0].groupLabel}: ${selected.map(r=>`${r.quarter}: ${r.status==='available'?fmt(r.ratePct)+'%':'unavailable ('+r.reason.toLowerCase()+')'}`).join('; ')}.`;}),QUARTERLY_DEFINITION,'The chart Details show exit counts and denominators. Complete grouped history is Q2 2024-Q3 2026; Q1 2024 lacks January grouped exits. Missing quarters are not zero.'].join('\n\n');
 const chart={version:1,requestId,datasetToken:P.token,packetSha256:createHash('sha256').update(JSON.stringify({digest:identity.digest,filters,quarterly})).digest('hex'),kind:'recorded',synthetic:true,axis:'quarterly',metric:'quarterly_turnover_pct',title,unit:'%',sourceId:'A1',scope,asOf:P.cutoff,limitation:QUARTERLY_DEFINITION,sampled:false,omitted:0,quarterly,points:[]};
 current();return {answer,charts:[chart]};
}
