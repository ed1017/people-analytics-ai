import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata} from './public-9037-projection.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {homeSurveyGroups} from './home-survey-groups.mjs';
import {queryAggregate} from './home-aggregate-registry.mjs';
import {catalogDisplayLabel} from './catalog-display.ts';
export const isHomeAssociationQuestion=text=>typeof text==='string'&&/\b(?:sentiment|engagement|favorability)\b/i.test(text)&&/\b(?:turnover|attrition)\b/i.test(text)&&/\b(?:correlat\w*|relat\w*|associat\w*|link\w*|connect\w*|compar\w*|contrast\w*|versus|vs|caus\w*|predict\w*)\b/i.test(text);
const limitation='The available comparison is across all eight business units, not departments, HR subgroups or individual employees: September 2026 engagement favorability versus January-September 2026 voluntary turnover. Clear filters and ask for that business-unit comparison. Other populations, periods and causal or predictive questions need separate evidence.';
/** Complete public partitions only; never pair sampled Home rows or employee records. */
export function describeHomeAssociation(survey,attrition){
 const groups=homeSurveyGroups(survey),turnover=queryAggregate({registryId:'attrition.business_units',metric:'voluntary_turnover_ytd_pct',order:'ascending',limit:20},attrition);
 if(!groups||groups.asOf!==P.cutoff||!Array.isArray(survey.engagement_trend)||survey.engagement_trend.filter(r=>r.close_date===P.cutoff&&r.respondents===groups.respondents).length!==1||attrition.as_of!==P.cutoff||!turnover.complete||turnover.truncated||groups.rows.length!==8||turnover.rows.length!==8)throw Error('Incomplete paired evidence');
 const paired=groups.rows.map(s=>{const t=turnover.rows.find(t=>t.id===JSON.stringify([s.org_code]));if(!t)throw Error('Unmatched group');return {label:catalogDisplayLabel(s.org_name).replace(/[\\`*_[\]<>|]/g,''),respondents:s.respondents,x:s.favorable_pct,y:t.value};});
 const mean=k=>paired.reduce((sum,r)=>sum+r[k],0)/paired.length,mx=mean('x'),my=mean('y');
 const xx=paired.reduce((s,r)=>s+(r.x-mx)**2,0),yy=paired.reduce((s,r)=>s+(r.y-my)**2,0),xy=paired.reduce((s,r)=>s+(r.x-mx)*(r.y-my),0);
 const coefficient=xx===0||yy===0?'Pearson correlation is undefined because at least one measure has no variation.':`The unweighted Pearson correlation across these eight business units is r = ${Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy))).toFixed(3)} (using the supplied rounded percentages).`;
 return {answer:[`Using engagement favorability as the explicit survey measure - not text sentiment - ${coefficient}`,'Comparison: engagement survey closed 2026-09-30 versus voluntary turnover from 2026-01-01 through 2026-09-30. Each business unit is one observation. Favorability means items rated 4 or 5 on a 1-5 scale, averaged across valid respondents. Voluntary turnover uses voluntary exits divided by average month-end headcount; respondent counts are not turnover denominators.',...paired.map(r=>`${r.label}: engagement ${r.x}% (${r.respondents} respondents); voluntary YTD turnover ${r.y}%.`),'Sources: Employee Listening and Attrition, matching complete business-unit codes and dataset cutoff 2026-09-30. This is a descriptive comparison of eight constructed synthetic groups with different measurement windows. It does not establish statistical significance, causality, individual behavior, a department-level relationship, or predict later departures. Employee-level linkage is not required for this group comparison.'].join('\n\n')};
}
export async function readPublicHomeAssociation({binding,hostname,identity,filters,text,signal}){
 const must=v=>{if(!v)throw Error('Association evidence unavailable');};
 const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};current();
 must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&/^[a-f0-9]{64}$/.test(identity.digest)&&await binding.router.bootstrapToken()===P.token);
 must(/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname));
 // Any unrecognized qualification is a clarification, never a silent scope substitution.
 const remainder=text.toLowerCase().replace(/\b(?:is|are|does|do|how|what|the|our|company|companywide|all|eight|8|business|units?|bu|bus|survey|sentiment|engagement|favorability|turnover|attrition|voluntary|compar(?:e[sd]?|ing|isons?)|contrast(?:s|ed|ing)?|across|versus|vs|correlat\w*|relat\w*|associat\w*|link\w*|connect\w*|between|with|to|and|there|a|an|any|show|me|please|have)\b/g,'').replace(/[\s?.,!\u2013\u2014-]/g,'');
 if(!filters||Object.values(filters).some(v=>v!=='all')||remainder)return {answer:limitation};
 const values=[];
 for(const path of ['/api/survey-sentiment','/api/attrition']){
  const response=await binding.handle(new Request('https://'+hostname+path,{headers:{'x-workforce-dataset':P.token},signal}));current();must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);
  const data=await boundedJson(response.body,8*1024*1024,signal);current();must(data?.data_meta?.bundleDigest===identity.digest&&same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));values.push(data);
 }
 try{return describeHomeAssociation(...values);}catch{return {answer:'A complete matching business-unit comparison could not be verified: dates, measures, group membership or suppression checks did not pass. No correlation is calculated. '+limitation};}
}
