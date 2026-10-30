/** Pure presentation contract: no targets are inferred from actuals or industry benchmarks. */
export type WorkforceKpiMetric='capacity-gap'|'staffing-vs-plan'|'voluntary-turnover-ytd'|'time-to-fill'|'cost-vs-budget'|'raw-count';
export type WorkforceKpiPeriod={kind:'snapshot'|'ytd'|'interval'|'forecast';start:string;end:string};
export type WorkforceKpiContext={datasetToken:string;scope:{country:string;org:string;level:string;role:string;scenario:string};period:WorkforceKpiPeriod;unit:'FTE'|'percent'|'days'|'currency'|'people'|'positions';definition:string;currency:string|null;costBasis:string|null};
export type WorkforceKpiValue={value:number|null;state:'current'|'loading'|'unavailable'|'error'|'stale';context:WorkforceKpiContext};
export type WorkforceKpiTarget=WorkforceKpiValue&{provenance:{kind:'company-target'|'modeled-default';version:string;reference:string}};
export type WorkforceKpiInput={id:string;label:string;metric:WorkforceKpiMetric;actual:WorkforceKpiValue;target:WorkforceKpiTarget|null};
export type WorkforceKpiResult={key:string;id:string;label:string;metric:WorkforceKpiMetric;status:'green'|'red'|'neutral';reason:string|null;direction:'at-most'|'at-least'|null;actual:number|null;target:number|null;gap:number|null;adverseGap:number|null;context:WorkforceKpiContext;targetProvenance:WorkforceKpiTarget['provenance']|null};
const rules={
 'capacity-gap':{unit:'FTE',direction:'at-most'},
 'staffing-vs-plan':{unit:'FTE',direction:'at-least'},
 'voluntary-turnover-ytd':{unit:'percent',direction:'at-most'},
 'time-to-fill':{unit:'days',direction:'at-most'},
 'cost-vs-budget':{unit:'currency',direction:'at-most'},
} as const;
const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=1000;
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
function date(v:unknown):v is string{return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function canonical(c:WorkforceKpiContext){return [c?.datasetToken,c?.scope?.country,c?.scope?.org,c?.scope?.level,c?.scope?.role,c?.scope?.scenario,c?.period?.kind,c?.period?.start,c?.period?.end,c?.unit,c?.definition,c?.currency,c?.costBasis];}
function validContext(c:WorkforceKpiContext){
 if(!c||!text(c.datasetToken)||!c.scope||!['country','org','level','role','scenario'].every(k=>text(c.scope[k as keyof typeof c.scope]))||!text(c.definition)||!c.period)return false;
 const p=c.period;if(!['snapshot','ytd','interval','forecast'].includes(p.kind)||!date(p.start)||!date(p.end)||p.start>p.end)return false;
 if(p.kind==='snapshot'&&p.start!==p.end)return false;
 if(p.kind==='ytd'&&(p.start!==p.end.slice(0,4)+'-01-01'))return false;
 return c.unit==='currency'?typeof c.currency==='string'&&/^[A-Z]{3}$/.test(c.currency)&&text(c.costBasis):c.currency===null&&c.costBasis===null;
}
export function workforceKpiKey(input:WorkforceKpiInput){return JSON.stringify(['workforce-kpi-v1',input.metric,...canonical(input.actual.context)]);}
export function evaluateWorkforceKpi(input:WorkforceKpiInput):WorkforceKpiResult{
 const {actual,target,metric}=input,rule=metric==='raw-count'?null:rules[metric];
 const result:WorkforceKpiResult={key:workforceKpiKey(input),id:input.id,label:input.label,metric,status:'neutral',reason:null,direction:rule?.direction??null,actual:finite(actual.value)?actual.value:null,target:finite(target?.value)?target!.value:null,gap:null,adverseGap:null,context:structuredClone(actual.context),targetProvenance:target?structuredClone(target.provenance):null};
 const neutral=(reason:string)=>({...result,reason});
 if(!rule)return neutral('not-a-target-comparison');
 if(actual.state!=='current'||target&&target.state!=='current')return neutral('evidence-not-current');
 if(!target||!finite(actual.value)||!finite(target.value))return neutral('actual-or-target-missing');
 if(!target.provenance||!['company-target','modeled-default'].includes(target.provenance.kind)||!text(target.provenance.version)||!text(target.provenance.reference))return neutral('target-provenance-missing');
 if(!validContext(actual.context)||!validContext(target.context))return neutral('invalid-context');
 if(JSON.stringify(canonical(actual.context))!==JSON.stringify(canonical(target.context)))return neutral('incompatible-context');
 if(actual.context.unit!==rule.unit&&!(metric==='staffing-vs-plan'&&actual.context.unit==='people'))return neutral('incompatible-unit');
 if(metric==='cost-vs-budget'&&!['interval','forecast'].includes(actual.context.period.kind))return neutral('incompatible-period');
 if(metric==='voluntary-turnover-ytd'&&actual.context.period.kind!=='ytd')return neutral('incompatible-period');
 if(metric!=='capacity-gap'&&(actual.value<0||target.value<0))return neutral('invalid-value');
 if(metric==='voluntary-turnover-ytd'&&(actual.value>100||target.value>100))return neutral('invalid-value');
 const gap=actual.value-target.value,adverseGap=rule.direction==='at-most'?gap:-gap;
 if(!finite(gap))return neutral('invalid-value');
 return {...result,status:adverseGap>0?'red':'green',gap:Object.is(gap,-0)?0:gap,adverseGap:Object.is(adverseGap,-0)?0:adverseGap};
}
/** The risk list is exactly the red indicator set: no top-N limit and no second threshold engine. */
export function evaluateWorkforceKpis(inputs:readonly WorkforceKpiInput[]){
 const byKey=new Map<string,WorkforceKpiResult>();
 for(const input of inputs){const next=evaluateWorkforceKpi(input),prior=byKey.get(next.key);
  if(!prior){byKey.set(next.key,next);continue;}
  const fingerprint=(r:WorkforceKpiResult)=>JSON.stringify([r.status,r.reason,r.actual,r.target,r.gap,r.targetProvenance]);
  if(fingerprint(prior)!==fingerprint(next))byKey.set(next.key,{...prior,status:'neutral',reason:'conflicting-duplicate',gap:null,adverseGap:null});
 }
 const indicators=[...byKey.values()].sort((a,b)=>a.key.localeCompare(b.key));
 return {version:1 as const,indicators,risks:indicators.filter(row=>row.status==='red')};
}
