import type {calculateMonthlyWorkload} from './swp-monthly-workload';

/** Summarize validated monthly results without offsetting shortages with later surplus. */
export function capacityPeriodSummary(result:ReturnType<typeof calculateMonthlyWorkload>|null){
 if(!result||!result.points.length)return null;
 const known=result.points.filter(point=>point.gapFte!==null);
 const shortages=known.filter(point=>point.gapFte!>0);
 const peak=shortages.reduce<typeof shortages[number]|null>((largest,point)=>!largest||point.gapFte!>largest.gapFte!?point:largest,null);
 return {months:result.points.length,knownMonths:known.length,unknownMonths:result.points.length-known.length,
  shortfallMonths:shortages.length,firstShortfall:shortages[0]?.month??null,
  peakShortfall:peak?{month:peak.month,fte:peak.gapFte!}:null};
}

/** Do not round a real positive shortage down to a displayed zero. */
export function formatShortfallFte(value:number){
 return value>0&&value<0.01?'<0.01':value.toLocaleString(undefined,{maximumFractionDigits:2});
}
