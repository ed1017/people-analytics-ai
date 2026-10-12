import {normalizeHomePack} from './home-pack.mjs';
/** Snapshot of released company context; never a plan baseline or an outcome. */
export type CompanyTurnoverContext={source:'A1';asOf:string|null;total_turnover_ytd_pct:number|null;voluntary_turnover_ytd_pct:number|null;annualized_voluntary_turnover_pct:number|null};
export const turnoverMetrics={total_turnover_ytd_pct:'Overall turnover (YTD %)',voluntary_turnover_ytd_pct:'Voluntary turnover (YTD %)',annualized_voluntary_turnover_pct:'Annualized voluntary turnover (%)'};
export const isTurnoverGoal=(goal:string)=>/\b(turnover|retention|retain|exits|attrition)\b/i.test(goal);
// Only normalize presentation and a single action verb, never metric qualifiers.
export const metricRequest=(goal:string)=>goal.toLowerCase().replace(/[\u2010-\u2015]/g,'-').trim().replace(/[.!?]+$/,'').replace(/^(?:reduce|improve|review|increase|decrease|lower|support|strengthen|develop|build|measure|track)\s+/,'').replace(/\s+/g,' ');
export function turnoverMetric(goal:string):keyof typeof turnoverMetrics|null{
 const request=metricRequest(goal);
 for(const metric of Object.keys(turnoverMetrics) as (keyof typeof turnoverMetrics)[])if(request===metricRequest(turnoverMetrics[metric]))return metric;
 if(/^annualized voluntary turnover(?: rate)?$/.test(request))return 'annualized_voluntary_turnover_pct';
 if(/^voluntary turnover(?: rate)?(?: (?:ytd|year[- ]to[- ]date))?$/.test(request))return 'voluntary_turnover_ytd_pct';
 if(/^(?:(?:overall|total) )?turnover(?: rate)?(?: (?:ytd|year[- ]to[- ]date))?$/.test(request)||/^(?:retention|attrition)$/.test(request))return 'total_turnover_ytd_pct';
 return null;
}
export function companyTurnoverContext(pack:unknown):CompanyTurnoverContext|undefined{
 const source=normalizeHomePack(pack).sources.find((s:{id:string})=>s.id==='A1');
 if(source?.status!=='loaded')return undefined;
 const facts=source.facts as Record<string,unknown>;
 const rate=(key:keyof typeof turnoverMetrics)=>typeof facts[key]==='number'?facts[key] as number:null;
 return {source:'A1',asOf:source.date,total_turnover_ytd_pct:rate('total_turnover_ytd_pct'),voluntary_turnover_ytd_pct:rate('voluntary_turnover_ytd_pct'),annualized_voluntary_turnover_pct:rate('annualized_voluntary_turnover_pct')};
}
export function validCompanyTurnoverContext(raw:unknown):raw is CompanyTurnoverContext{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
 const r=raw as Record<string,unknown>;
 return Object.keys(r).sort().join()===['source','asOf',...Object.keys(turnoverMetrics)].sort().join()&&r.source==='A1'&&(r.asOf===null||typeof r.asOf==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.asOf)&&Number.isFinite(Date.parse(r.asOf)))&&Object.keys(turnoverMetrics).every(key=>r[key]===null||typeof r[key]==='number'&&Number.isFinite(r[key])&&r[key]>=0&&r[key]<=1e15);
}
export function companyTurnoverText(goal:string,context:CompanyTurnoverContext|undefined){
 const metric=turnoverMetric(goal);if(!isTurnoverGoal(goal))return null;if(!metric)return 'Company history · requested turnover metric unavailable. Do not substitute another rate.';
 const value=context?.[metric],other=value==null?Object.keys(turnoverMetrics).find(key=>key!==metric&&context?.[key as keyof typeof turnoverMetrics]!=null) as keyof typeof turnoverMetrics|undefined:undefined;
 return `Company history · ${turnoverMetrics[metric]}: ${value==null?'Unknown':value+'%'}.${other?` Separately available: ${turnoverMetrics[other]}: ${context![other]}%.`:''} Not the plan population baseline.`;
}
export const turnoverContextLimit='Company-wide, unfiltered released aggregate [A1]. Source as-of date is not an observation window. Exact YTD dates, annualization window and rate denominators are unavailable; do not compare these rates with pilot results or infer an improvement. Targets are assumptions, not recorded outcomes.';
