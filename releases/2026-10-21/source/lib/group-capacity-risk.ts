// @ts-expect-error Native regression tests use the same calculation source.
import {monthlyHeadcountFlow} from './monthly-headcount-flow.ts';
export const capacityRiskPrompt='Which groups are at risk of a capacity gap in the next 3 months?';
/** Classify a question category, never individual prompt strings or an asserted finding. */
export function capacityRiskIntent(text:string):number|null {
 if(!/\b(capacity|staffing|workforce)\b/i.test(text)||!/\b(gaps?|shortfalls?|shortages?|risks?)\b/i.test(text)||!/\b(groups?|business units?)\b/i.test(text))return null;
 const match=text.match(/\b(?:next|over)\s+(\d+)\s+months?\b/i);
 // Unsupported date expressions need clarification, not a silently substituted horizon.
 if(!match&&/\b(years?|weeks?|days?|quarters?|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text))return null;
 return match?Number(match[1]):3;
}
export type RiskGroup={code:string;label:string;asOf:string;headcount:number;fte:number;exits:number;historyMonths:number;history?:{snapshot_date:string;headcount:number;fte:number}[]};
export type RiskAssumptions={months:number;demandFte:number|null;monthlyExits:number|null;monthlyHires:number|null;hireLagDays:number|null;ftePerHire:number|null;existingAvailabilityPct:number|null;rampPct:[number|null,number|null,number|null];annualHireCost:number|null;basis:'entered'|'adopted-demo'};
export function emptyRiskAssumptions(months=3):RiskAssumptions{return {months,demandFte:null,monthlyExits:null,monthlyHires:null,hireLagDays:null,ftePerHire:null,existingAvailabilityPct:null,rampPct:[null,null,null],annualHireCost:null,basis:'entered'};}
export function demoRiskAssumptions(g:RiskGroup,months=3):RiskAssumptions{return {...emptyRiskAssumptions(months),demandFte:g.fte,monthlyExits:g.exits/g.historyMonths,monthlyHires:0,hireLagDays:30,ftePerHire:1,existingAvailabilityPct:100,rampPct:[50,75,100],basis:'adopted-demo'};}
const day=86400000;
export type RiskPoint={month:string;headcount:number;departures:number;arrivals:number;capacityFte:number;demandFte:number;gapFte:number;incrementalHireCost:number|null};
export type RiskResult={status:'ready'|'missing';missing:string[];points:RiskPoint[];peakGap:number|null;peakMonth:string|null;departures:number|null;arrivals:number|null;hireCost:number|null};
export function calculateGroupCapacityRisk(g:RiskGroup,a:RiskAssumptions):RiskResult{
 if(!a||!['entered','adopted-demo'].includes(a.basis)||!Array.isArray(a.rampPct)||a.rampPct.length!==3)throw Error('A compatible scenario assumption contract is required.');
 const asOf=Date.parse(g.asOf+'T00:00:00Z');
 if(!Number.isFinite(asOf)||new Date(asOf).toISOString().slice(0,10)!==g.asOf||new Date(asOf+day).getUTCDate()!==1||!g.code||![g.headcount,g.fte,g.exits,g.historyMonths].every(n=>Number.isFinite(n)&&n>=0)||g.headcount<=0||g.fte>g.headcount||g.historyMonths<1)throw Error('A valid month-end group snapshot and departure period are required.');
 if(!Number.isInteger(a.months)||a.months<1||a.months>12)throw Error('Choose a horizon from 1 to 12 months after the recorded snapshot.');
 const fields=['demandFte','monthlyExits','monthlyHires','hireLagDays','ftePerHire','existingAvailabilityPct'] as const;
 const labels={demandFte:'demand FTE',monthlyExits:'monthly departures',monthlyHires:'monthly hiring launches',hireLagDays:'hire arrival lag',ftePerHire:'FTE per hire',existingAvailabilityPct:'existing productive availability'};
 const missing=fields.filter(k=>a[k]===null).map(k=>labels[k]);if(a.rampPct.some(n=>n===null))missing.push('new-hire productivity ramp');
 for(const k of [...fields,'annualHireCost'] as const)if(a[k]!==null&&(!Number.isFinite(a[k])||a[k]!<0||a[k]!>10000000))throw Error('Assumptions must be finite, nonnegative values.');
 if(a.existingAvailabilityPct!==null&&a.existingAvailabilityPct>100||a.ftePerHire!==null&&a.ftePerHire>1||a.hireLagDays!==null&&(!Number.isInteger(a.hireLagDays)||a.hireLagDays>365)||a.rampPct.some(n=>n!==null&&(!Number.isFinite(n)||n<0||n>100)))throw Error('Review availability, FTE, lag and ramp bounds.');
 if(missing.length)return {status:'missing',missing,points:[],peakGap:null,peakMonth:null,departures:null,arrivals:null,hireCost:null};
 const start=asOf+day,first=new Date(start),cohorts:{arrival:number;people:number}[]=[];let existing=g.headcount,stock=g.headcount;const points:RiskPoint[]=[];
 for(let i=0;i<a.months;i++){
  const begin=Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+i,1),end=Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+i+1,1),days=(end-begin)/day;
  cohorts.push({arrival:begin+a.hireLagDays!*day,people:a.monthlyHires!});
  if(a.monthlyExits!>existing)throw Error('Assumed departures exceed the remaining opening workforce; revise the horizon or departures.');
  const existingCapacity=(existing-a.monthlyExits!/2)*(g.fte/g.headcount)*a.existingAvailabilityPct!/100;
  let incoming=0,cost=0;const arrivals=cohorts.filter(c=>c.arrival>=begin&&c.arrival<end).reduce((n,c)=>n+c.people,0);
  for(let d=begin;d<end;d+=day)for(const c of cohorts)if(d>=c.arrival){const age=Math.floor((d-c.arrival)/day),ramp=a.rampPct[Math.min(2,Math.floor(age/30))]!;incoming+=c.people*a.ftePerHire!*ramp/100/days;if(a.annualHireCost!==null)cost+=c.people*a.annualHireCost/365;}
  const asOfPrior=new Date(begin-day).toISOString().slice(0,10),flow=monthlyHeadcountFlow({asOf:asOfPrior,opening:stock,months:1,hires:arrivals,exits:a.monthlyExits!,transfersIn:0,transfersOut:0})[0];stock=flow.headcount;existing-=a.monthlyExits!;
  const capacityFte=existingCapacity+incoming;points.push({month:flow.month.slice(0,7),headcount:stock,departures:a.monthlyExits!,arrivals,capacityFte,demandFte:a.demandFte!,gapFte:Math.max(0,a.demandFte!-capacityFte),incrementalHireCost:a.annualHireCost===null?null:cost});
 }
 const peak=points.reduce((p,r)=>r.gapFte>p.gapFte?r:p);return {status:'ready',missing:[],points,peakGap:peak.gapFte,peakMonth:peak.month,departures:points.reduce((n,p)=>n+p.departures,0),arrivals:points.reduce((n,p)=>n+p.arrivals,0),hireCost:a.annualHireCost===null?null:points.reduce((n,p)=>n+p.incrementalHireCost!,0)};
}
