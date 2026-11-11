import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata} from './public-9037-projection.mjs';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
import {boundedJson} from './public-qa-stream.server.mjs';
import {demoBusinessUnitNames,catalogDisplayLabel,countryDisplayLabel} from './catalog-display.ts';
import {LEVEL_CODES,LEVEL_TURNOVER_PERIOD,LEVEL_TURNOVER_DEFINITION,currentYtdHistory,calculateLevelTurnover} from './home-level-turnover.mjs';

/** Server-owned scoped aggregates only. No inferred costs, person records or model values. */
export async function readPublicLevelTurnover({binding,hostname,identity,filters,selection,signal}){
 const must=value=>{if(!value)throw Error('Level turnover evidence could not be verified.');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};
 current();must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&/^[a-f0-9]{64}$/.test(identity.digest)&&await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname)&&typeof binding.turnoverHistory==='function');
 must(filters&&same(Object.keys(filters).sort(),['country','level','org'])&&Object.values(filters).every(v=>typeof v==='string'&&v.length>0&&v.length<=100));
 must(selection&&Object.hasOwn(demoBusinessUnitNames,selection.org)&&['total','voluntary'].includes(selection.metric)&&['cost','tenure','guidance'].every(key=>typeof selection[key]==='boolean')&&!selection.answer);
 const scoped={...filters,org:selection.org,level:'all'};
 async function read(scope){
  const response=await binding.handle(new Request('https://'+hostname+'/api/dashboard?'+new URLSearchParams(scope),{headers:{'x-workforce-dataset':P.token},signal}));current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
  const data=await boundedJson(response.body,8*1024*1024,signal);current();must(data?.data_meta?.bundleDigest===identity.digest&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
  const receipt=readDashboardScopeReceipt(data.workforce_filter_scope);must(receipt?.status==='verified_public_aggregate'&&same(receipt.requested,scope)&&same(receipt.effective,scope));
  const history=await binding.turnoverHistory(scope);current();
  must(history&&same(Object.keys(history).sort(),['asOf','bundleDigest','contract','datasetToken','filters','rows'])&&history.contract==='public-group-turnover-history-v1'&&history.datasetToken===P.token&&history.bundleDigest===identity.digest&&history.asOf===P.cutoff&&same(history.filters,scope));
  currentYtdHistory(history.rows);
  must(data.overview?.snapshot_date===P.cutoff&&data.overview.headcount===history.rows.at(-1).headcount&&receipt.stockStatus===(data.overview.headcount===0?'known-empty':'positive'));
  must(Array.isArray(data.trend)&&data.trend.length===history.rows.length&&data.trend.every((row,i)=>row.snapshot_date===new Date(Date.UTC(Number(history.rows[i].month.slice(0,4)),Number(history.rows[i].month.slice(5,7)),0)).toISOString().slice(0,10)&&row.headcount===history.rows[i].headcount));
  return {data,history:history.rows};
 }
 const base=await read(scoped),options=base.data.filter_options;
 must(options&&Array.isArray(options.levels)&&same(options.levels.map(row=>row.value).sort(),[...LEVEL_CODES].sort()));
 must(Array.isArray(options.business_units)&&options.business_units.length>0&&options.business_units.length<=8&&new Set(options.business_units.map(row=>row.value)).size===options.business_units.length&&options.business_units.every(row=>Object.hasOwn(demoBusinessUnitNames,row.value)&&typeof row.label==='string'&&catalogDisplayLabel(row.label)===demoBusinessUnitNames[row.value])&&options.business_units.some(row=>row.value===selection.org));
 const countries=['AU','BR','CA','DE','FR','GB','IN','JP','SG','US'];
 must(Array.isArray(options.countries)&&options.countries.length>0&&options.countries.length<=countries.length&&new Set(options.countries.map(row=>row.value)).size===options.countries.length&&options.countries.every(row=>countries.includes(row.value)&&typeof row.label==='string'&&countryDisplayLabel(row.label,row.value)===countryDisplayLabel(row.value,row.value))&&(filters.country==='all'||options.countries.some(row=>row.value===filters.country)));
 const levels=[];
 for(const code of LEVEL_CODES){const level=await read({...scoped,level:code});must(same(level.data.filter_options,options));levels.push({code,history:level.history});}
 const result=calculateLevelTurnover(base.history,levels,selection.metric),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1}),percent=n=>n===null?'unavailable':fmt(n)+'%';
 const name=demoBusinessUnitNames[selection.org],country=filters.country==='all'?'All countries':countryDisplayLabel(filters.country,filters.country);
 const scopeChange=filters.org!==selection.org||filters.level!=='all'?`This question uses ${name} across all twelve levels; country scope stays ${country}. It does not change the dashboard filters or saved plan.`:null;
 const leaders=result.rows.filter(row=>row.exitCount>0).slice(0,3);
 const summary=leaders.length?`Largest recorded ${selection.metric} exit contributions: ${leaders.map(row=>`Level ${Number(row.code.slice(1))}: ${fmt(row.exitCount)} exits (${fmt(row.contributionPct)}%)`).join('; ')}.`:`No ${selection.metric} exits are recorded for this YTD period; contribution shares are unavailable.`;
 const answer=[`Current-YTD ${selection.metric} turnover by level: ${name}.`,`Scope: ${country}; ${name}; all twelve levels. ${LEVEL_TURNOVER_PERIOD}, as of ${P.cutoff}. Synthetic workforce data.`,summary,scopeChange,`Business-unit total: ${fmt(result.totalExits)} ${selection.metric} exits; ${fmt(result.averageHeadcount)} average monthly closing headcount; ${percent(result.ratePct)} YTD turnover.`,`Levels are ordered by recorded exit count, not by rate or causal impact.`,result.rows.map(row=>`- Level ${Number(row.code.slice(1))}: ${fmt(row.exitCount)} ${selection.metric} exits; ${row.contributionPct===null?'contribution unavailable (no business-unit exits)':fmt(row.contributionPct)+`% of business-unit ${selection.metric} exits`}; ${fmt(row.averageHeadcount)} average headcount; ${row.ratePct===null?'rate unavailable (zero average headcount)':fmt(row.ratePct)+`% ${selection.metric} turnover rate`}.`).join('\n'),LEVEL_TURNOVER_DEFINITION,'Small-group rates can swing sharply: read the exit count and denominator together. Displayed percentages and average headcounts are rounded to one decimal.',selection.guidance?'“Drive” here means contribution to recorded exits, not why people left. Investigate role mix, exit reasons, workload and career opportunities before drawing causal conclusions.':null,selection.cost?'Turnover cost is unavailable from these records. An explicit cost scenario would need replacement counts, per-exit costs, currency, period and downtime assumptions. No salary multiplier or cost estimate has been applied.':null,selection.tenure?'A business-unit-by-tenure turnover breakdown is not verified. The supported level breakdown above has not been relabeled as tenure evidence.':null].filter(Boolean).join('\n\n');
 current();return {answer,charts:[]};
}
