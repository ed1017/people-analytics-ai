import {normalizeHomePack} from './home-pack.mjs';
/** Snapshot of released company context; never a plan baseline or an outcome. */
export type CompanyTurnoverContext={source:'A1';asOf:string|null;total_turnover_ytd_pct:number|null;voluntary_turnover_ytd_pct:number|null;annualized_voluntary_turnover_pct:number|null};
export const turnoverMetrics={total_turnover_ytd_pct:'Overall turnover (YTD %)',voluntary_turnover_ytd_pct:'Voluntary turnover (YTD %)',annualized_voluntary_turnover_pct:'Annualized voluntary turnover (%)'};
export const isTurnoverGoal=(goal:string)=>/\b(turnover|retention|retain|exits|attrition)\b/i.test(goal);
export function turnoverMetric(goal:string):keyof typeof turnoverMetrics|null{
 if(/\b(?:non[-\s]|nonvoluntary|not\b|no\b|without\b|exclud\w*|except\w*|other than|rather than)/i.test(goal.replace(/[\u2010-\u2015]/g,'-'))||!isTurnoverGoal(goal)||/\b(involuntary|regrettable|monthly|quarterly|annual)\b/i.test(goal)||/\bannualized\b/i.test(goal)&&!/\bvoluntary\b/i.test(goal)||/\b(overall|total|not)\b/i.test(goal)&&/\bvoluntary\b/i.test(goal))return null;
 if(/\bvoluntary\b/i.test(goal)&&!/\binvoluntary\b/i.test(goal))return /\bannualized\b/i.test(goal)?'annualized_voluntary_turnover_pct':'voluntary_turnover_ytd_pct';
 return 'total_turnover_ytd_pct';
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
