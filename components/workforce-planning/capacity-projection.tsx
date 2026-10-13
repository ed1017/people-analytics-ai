'use client';

import {useId} from 'react';
import type {calculateMonthlyWorkload} from '@/lib/swp-monthly-workload';

type CapacityResult = ReturnType<typeof calculateMonthlyWorkload>;
const format = (value:number|null) => value===null ? 'Unknown' : value.toLocaleString(undefined,{maximumFractionDigits:2});

/** Presentation only: every plotted value comes from the existing monthly engine. */
export function CapacityProjection({result}:{result:CapacityResult|null}) {
 const titleId=useId(),descriptionId=useId();
 const points=result?.points??[];
 const values=points.flatMap(point=>[point.allocatedFte,point.requiredFte]).filter((value):value is number=>value!==null);
 const maximum=Math.max(1,...values);
 const x=(index:number)=>points.length===1?340:72+index*536/Math.max(1,points.length-1);
 const y=(value:number)=>242-value/maximum*194;
 const last=points.at(-1);
 const series=[{key:'requiredFte',label:'Demand · required FTE',color:'#2563eb',dash:undefined},{key:'allocatedFte',label:'Supply · available FTE',color:'#c2410c',dash:'7 4'}] as const;
 return <div className="min-w-0 space-y-4">
  <div className="min-w-0 rounded-xl border bg-background p-4 sm:p-5">
   <h3 className="font-semibold">Monthly supply and demand</h3>
   <p className="mt-1 text-xs text-muted-foreground">FTE assigned to this work, compared with FTE required.</p>
   <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="Chart legend">{series.map(item=><li key={item.key} className="flex items-center gap-2"><span aria-hidden="true" className="inline-block w-5 border-t-2" style={{borderColor:item.color,borderStyle:item.dash?'dashed':'solid'}}/>{item.label}</li>)}</ul>
   {values.length>0 ? <svg viewBox="0 0 640 290" role="img" aria-labelledby={`${titleId} ${descriptionId}`} className="mt-3 block w-full">
    <title id={titleId}>Monthly available and required capacity in FTE</title>
    <desc id={descriptionId}>Calculated from your confirmed assumptions. Unknown values are not plotted or connected. Exact values are available in Monthly detail below.</desc>
    {[0,.25,.5,.75,1].map(fraction=><g key={fraction}><line x1="72" x2="608" y1={y(maximum*fraction)} y2={y(maximum*fraction)} stroke="currentColor" opacity=".12"/><text x="62" y={y(maximum*fraction)+4} textAnchor="end" fontSize="12" fill="currentColor">{maximum>=10000?new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(maximum*fraction):format(maximum*fraction)}</text></g>)}
    {points.map((point,index)=><text key={point.month} x={x(index)} y="268" textAnchor="middle" fontSize="12" fill="currentColor">{point.month}</text>)}
    {series.map(item=>{let previousKnown=false;const path=points.map((point,index)=>{const value=point[item.key];if(value===null){previousKnown=false;return '';}const command=previousKnown?'L':'M';previousKnown=true;return `${command}${x(index)},${y(value)}`;}).join(' ');return <g key={item.key}><path d={path} fill="none" stroke={item.color} strokeWidth="2.5" strokeDasharray={item.dash}/>{points.map((point,index)=>point[item.key]===null?null:<circle key={point.month} cx={x(index)} cy={y(point[item.key]!)} r="4" fill={item.color}><title>{`${point.month}: ${item.label}, ${format(point[item.key])}`}</title></circle>)}</g>;})}
   </svg> : <div className="flex min-h-60 items-center justify-center py-8 text-center text-sm text-muted-foreground">{result?'Supply and demand are unknown. Complete the blank inputs to plot capacity.':'Enter your assumptions and calculate to see the comparison.'}</div>}
   {result&&<p className="mt-2 text-xs text-muted-foreground">Positive gap = shortfall; negative gap = surplus. Unknown values are not plotted.</p>}
  </div>
  {last&&<div><p className="mb-2 text-xs text-muted-foreground">Final planning month · {last.month}</p><dl className="grid grid-cols-3 gap-2 sm:gap-3">{[{label:'Available FTE',value:last.allocatedFte},{label:'Required FTE',value:last.requiredFte},{label:'Gap FTE',value:last.gapFte}].map(item=><div key={item.label} className="min-w-0 rounded-xl border bg-background p-3 sm:p-4"><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-2 break-words text-lg font-semibold tabular-nums sm:text-2xl">{item.label==='Gap FTE'&&item.value!==null&&item.value>0?'+':''}{format(item.value)}</dd></div>)}</dl></div>}
 </div>;
}
