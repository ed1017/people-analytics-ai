import {normalizeHomePack} from './home-pack.mjs';
// @ts-expect-error Native fixtures share source.
import {turnoverMetric,isTurnoverGoal,metricRequest,type CompanyTurnoverContext} from './home-turnover-context.ts';

// Version 1 definitions are immutable: saved values are interpreted using these exact metrics.
const attrition={source:'A1',unit:'%',population:'Company-wide; unfiltered',denominator:'Exact rate denominator unavailable',period:'Exact YTD dates unavailable'};
export const historicalMetrics={
 total_turnover_ytd_pct:{...attrition,field:'total_turnover_ytd_pct',name:'Overall turnover (YTD %)',statistic:'Overall turnover rate'},
 voluntary_turnover_ytd_pct:{...attrition,field:'voluntary_turnover_ytd_pct',name:'Voluntary turnover (YTD %)',statistic:'Voluntary turnover rate'},
 annualized_voluntary_turnover_pct:{...attrition,field:'annualized_voluntary_turnover_pct',name:'Annualized voluntary turnover (%)',statistic:'Annualized voluntary turnover rate',period:'Annualization window unavailable'},
 median_time_to_fill_days:{source:'R1',field:'median_time_to_fill_days',name:'Median time to fill (days)',unit:' days',population:'Company-wide recruiting; unfiltered',statistic:'Median historical time to fill; not start date or productive readiness',period:'Observation window unavailable',denominator:'Included requisition cohort and count unavailable'},
 engagement_favorable_pct:{source:'S1',field:'engagement_favorable_pct',name:'Engagement favorable (%)',unit:'%',population:'Company-wide; survey-specific respondents',statistic:'Engagement favorable percentage; not satisfaction projection',period:'Exact survey fieldwork window unavailable',denominator:'Matching question and respondent denominator unavailable'},
 weighted_requirement_met_pct:{source:'T1',field:'weighted_requirement_met_pct',name:'Weighted skill requirement coverage (%)',unit:'%',population:'Company-wide recorded role requirements; unfiltered',statistic:'Weighted requirement coverage; not proficiency, availability or training effectiveness',period:'Observation window unavailable',denominator:'Weighted employee-role-skill requirements; exact denominator unavailable'},
} as const;
export type HistoricalMetric=keyof typeof historicalMetrics;
export type MetricObservation={metric:HistoricalMetric;value:number|null;asOf:string|null};
export type MetricHistory={version:1;originEvidenceDigest:string;observations:MetricObservation[]};
export type HistoricalMeasure={history?:MetricHistory;companyTurnover?:CompanyTurnoverContext};
export function resolveHistoricalMetric(goal:string):{kind:'supported'|'suggested';metric:HistoricalMetric}|{kind:'unsupported'|'none'}{
 const request=metricRequest(goal);
 // Display labels are exact metric selections, including their statistic and period.
 for(const metric of Object.keys(historicalMetrics) as HistoricalMetric[])if(request===metricRequest(historicalMetrics[metric].name))return {kind:'supported',metric};
 const domains=[isTurnoverGoal(request),/\b(hiring|hire|recruiting|recruitment)\b|time[- ]to[- ]fill/i.test(request),/\b(engagement|survey)\b/i.test(request),/\b(skills?|learning|training|capabilit(?:y|ies))\b/i.test(request),/\b(finance|salar(?:y|ies)|costs?|headcount|fte|satisfaction)\b/i.test(request)];
 const count=domains.filter(Boolean).length;
 if(!count)return {kind:'none'};
 if(count!==1)return {kind:'unsupported'};
 // Anchored positive phrases reject extra metrics, units and observation periods.
 // Unknown windows cannot be equated with a requested cadence or rolling window.
 if(domains[0]){const metric=turnoverMetric(goal);return metric?{kind:/\bytd\b|year[- ]to[- ]date|annualized voluntary/.test(request)?'supported':'suggested',metric}:{kind:'unsupported'};}
 if(domains[1]){
  if(/^median time[- ]to[- ]fill(?: in days)?$/.test(request))return {kind:'supported',metric:'median_time_to_fill_days'};
  return /^(?:our )?(?:hiring|recruiting|recruitment)$/.test(request)?{kind:'suggested',metric:'median_time_to_fill_days'}:{kind:'unsupported'};
 }
 if(domains[2]){
  if(/^(?:employee )?engagement (?:favorable(?: percentage| percent)?|favorability)$/.test(request))return {kind:'supported',metric:'engagement_favorable_pct'};
  return /^(?:employee )?engagement$/.test(request)?{kind:'suggested',metric:'engagement_favorable_pct'}:{kind:'unsupported'};
 }
 if(domains[3]){
  if(/^weighted skills? requirement coverage(?: percentage| percent)?$/.test(request))return {kind:'supported',metric:'weighted_requirement_met_pct'};
  return /^(?:skills|learning|training|capability)$/.test(request)?{kind:'suggested',metric:'weighted_requirement_met_pct'}:{kind:'unsupported'};
 }
 return {kind:'none'};
}
export function captureMetricHistory(goal:string,pack:unknown,originEvidenceDigest:string):MetricHistory|undefined{
 const resolution=resolveHistoricalMetric(goal);if(resolution.kind!=='supported'&&resolution.kind!=='suggested')return undefined;
 const sourceId=historicalMetrics[resolution.metric].source;
 const source=normalizeHomePack(pack).sources.find((s:{id:string})=>s.id===sourceId);
 if(source?.status!=='loaded')return undefined;
 const facts=source.facts as Record<string,unknown>;
 const observations=(Object.keys(historicalMetrics) as HistoricalMetric[]).filter(key=>historicalMetrics[key].source===sourceId).map(metric=>({metric,value:typeof facts[metric]==='number'?facts[metric] as number:null,asOf:source.date}));
 return {version:1,originEvidenceDigest,observations};
}
export function validMetricHistory(raw:unknown):raw is MetricHistory{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
 const r=raw as MetricHistory;
 return Object.keys(r).sort().join()==='observations,originEvidenceDigest,version'&&r.version===1&&typeof r.originEvidenceDigest==='string'&&/^[a-f0-9]{64}$/.test(r.originEvidenceDigest)&&Array.isArray(r.observations)&&r.observations.length>0&&r.observations.length<=6&&new Set(r.observations.map(o=>o?.metric)).size===r.observations.length&&r.observations.every(o=>o&&typeof o==='object'&&Object.keys(o).sort().join()==='asOf,metric,value'&&typeof o.metric==='string'&&Object.hasOwn(historicalMetrics,o.metric)&&(o.value===null||typeof o.value==='number'&&Number.isFinite(o.value)&&o.value>=0&&o.value<=1e15)&&(o.asOf===null||typeof o.asOf==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(o.asOf)&&Number.isFinite(Date.parse(o.asOf))));
}
// Passive legacy adaptation never updates stored bytes or fetches current evidence.
export function historicalObservations(measure?:HistoricalMeasure):MetricObservation[]{
 if(measure?.history&&measure.companyTurnover)return [];
 if(measure?.history)return measure.history.observations;
 const legacy=measure?.companyTurnover;
 return legacy?(['total_turnover_ytd_pct','voluntary_turnover_ytd_pct','annualized_voluntary_turnover_pct'] as const).map(metric=>({metric,value:legacy[metric],asOf:legacy.asOf})):[];
}
export const observationText=(o:MetricObservation)=>`${historicalMetrics[o.metric].name}: ${o.value===null?'Unknown':o.value+historicalMetrics[o.metric].unit}`;
export function historicalContextText(goal:string,measure?:HistoricalMeasure):string|null{
 if(measure?.history&&measure.companyTurnover)return 'Historical context cannot be verified: conflicting context formats. Review the saved plan.';
 const resolution=resolveHistoricalMetric(goal);
 if(resolution.kind==='none'&&!historicalObservations(measure).length)return null;
 if(resolution.kind!=='supported'&&resolution.kind!=='suggested')return 'Historical context · requested metric unavailable or ambiguous. Do not substitute another metric.';
 const observations=historicalObservations(measure),entry=observations.find(o=>o.metric===resolution.metric)??{metric:resolution.metric,value:null,asOf:null};
 const other=entry.value===null?observations.find(o=>o.metric!==entry.metric&&o.value!==null):undefined;
 return `${resolution.kind==='suggested'?'Suggested historical metric':'Historical context'} · ${observationText(entry)}. ${historicalMetrics[entry.metric].population}.${other?` Separately available: ${observationText(other)}.`:''} Not the plan population baseline.`;
}
export function legacyAggregateBaseline(baseline:{kind:string;basis:string|null}){
 return baseline.kind==='adopted'&&Object.values(historicalMetrics).some(metric=>(baseline.basis??'').includes(`${metric.source}.${metric.field}`));
}
export const historicalContextLimit='Source as-of date is not an observation window. Matching observation periods and denominators are unverified; do not infer pilot improvement. Targets are assumptions, not recorded outcomes.';
