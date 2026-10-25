'use client';

import {capacityBalanceLabel,capacityShortfallAreas,capacityChartDomain} from '@/lib/capacity-display';
import styles from './capacity-projection.module.css';
import {useId} from 'react';
import type {calculateMonthlyWorkload} from '@/lib/swp-monthly-workload';

type CapacityResult = ReturnType<typeof calculateMonthlyWorkload>;
const format = (value:number|null) => value===null ? 'Unknown' : value>0&&value<.005 ? '<0.01' : value.toLocaleString(undefined,{maximumFractionDigits:2});

/** Presentation only: every plotted value comes from the existing monthly engine. */
export function CapacityProjection({result}:{result:CapacityResult|null}) {
 const titleId=useId(),descriptionId=useId();
 const points=result?.points??[];
 const values=points.flatMap(point=>[point.allocatedFte,point.requiredFte]).filter((value):value is number=>value!==null);
 const domain=capacityChartDomain(values),maximum=domain.max,minimum=domain.min;
 const tick=(fraction:number)=>minimum+(maximum-minimum)*fraction;
 const x=(index:number)=>points.length===1?340:104+index*504/Math.max(1,points.length-1);
 const y=(value:number)=>242-(value-minimum)/(maximum-minimum)*194;
 const last=points.at(-1);
 const series=[{key:'requiredFte',label:'Needed (FTE)',color:'#04342c',dash:undefined},{key:'allocatedFte',label:'Available (FTE)',color:'#087f5b',dash:'7 4'}] as const;
 return <div className={styles.container}><div className={styles.layout}>
  <div className="min-w-0 rounded-xl bg-background p-3 sm:p-4">
   <h3 className="font-semibold">Needed vs available FTE</h3><p className="text-xs">{minimum>0?'Focused scale · FTE':'FTE'}</p>
   <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Chart legend">{series.map(item=><li key={item.key} className="flex items-center gap-2"><span aria-hidden="true" className="inline-block w-5 border-t-2" style={{borderColor:item.color,borderStyle:item.dash?'dashed':'solid'}}/>{item.label}</li>)}<li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-5 bg-amber-700/15"/>Shaded: shortfall</li></ul>
   {values.length>0 ? <div className="mt-3">
   <div className="relative">
   <svg viewBox="0 0 640 260" role="img" aria-labelledby={`${titleId} ${descriptionId}`} className="block w-full">
    <title id={titleId}>Monthly available and required capacity in FTE</title>
    <desc id={descriptionId}>Calculated from the displayed assumptions. Unknown values are not plotted or connected. Exact values are available in Monthly detail below.</desc>
    {[0,.25,.5,.75,1].map(fraction=><line key={fraction} x1="104" x2="608" y1={y(tick(fraction))} y2={y(tick(fraction))} stroke="currentColor" opacity=".12"/>)}
    {capacityShortfallAreas(points).map((area,index)=><polygon key={index} data-capacity-shortfall="" points={area.map(p=>`${x(p.x)},${y(p.y)}`).join(' ')} fill="#BA7517" fillOpacity=".15"/>)}
    {series.map(item=>{let previousKnown=false;const path=points.map((point,index)=>{const value=point[item.key];if(value===null){previousKnown=false;return '';}const command=previousKnown?'L':'M';previousKnown=true;return `${command}${x(index)},${y(value)}`;}).join(' ');return <g key={item.key}><path d={path} fill="none" stroke={item.color} strokeWidth="2.5" strokeDasharray={item.dash}/>{points.map((point,index)=>point[item.key]===null?null:<circle key={point.month} cx={x(index)} cy={y(point[item.key]!)} r="4" fill={item.color}><title>{`${point.month}: ${item.label}, ${format(point[item.key])}`}</title></circle>)}</g>;})}
   </svg>
   <div aria-hidden="true" data-capacity-axis="y" className="pointer-events-none absolute inset-0 text-sm leading-4 tabular-nums">
    {[0,.25,.5,.75,1].map(fraction=><span key={fraction} className="absolute left-0 whitespace-nowrap text-right" style={{width:'14.5%',top:`${y(tick(fraction))/260*100}%`,transform:'translateY(-50%)'}}>{format(tick(fraction))}</span>)}
   </div>
   </div>
   <div aria-hidden="true" data-capacity-axis="x" className="relative h-8 text-center text-sm leading-4 tabular-nums">
    {points.map((point,index)=>index!==0&&index!==points.length-1&&index%Math.ceil(points.length/5)!==0?null:<span key={point.month} className="absolute top-0" style={{left:`${x(index)/640*100}%`,transform:'translateX(-50%)'}}><span className="block">{new Date(`${point.month}-01T00:00:00Z`).toLocaleDateString(undefined,{month:'short',timeZone:'UTC'})}</span><span className="block">{point.month.slice(0,4)}</span></span>)}
   </div>
   </div> : <div className="flex min-h-60 items-center justify-center py-8 text-center text-sm text-muted-foreground">{result?'More numbers are needed. Fill in the blank work and team inputs.':'Enter your work and team numbers to see the comparison.'}</div>}
   <details className="mt-2 text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3 focus-visible:ring-2 focus-visible:ring-ring">How to read this chart</summary><p>FTE means full-time equivalent capacity, not a count of people or a hiring target. The verdict is for the final month; check earlier months for interim gaps. Adding allocated FTE is not a number of hires. Shading marks required capacity above available capacity. Unknown values are not plotted or connected. Exact values are in Monthly detail. The labeled linear scale may start above zero to make small differences visible.</p></details>
  </div>
  <aside style={{backgroundColor:last?.gapFte==null?'#f2f4f3':last.gapFte>0?'#fff4df':'#eaf7f1',borderColor:last?.gapFte==null?'#72837a':last.gapFte>0?'#BA7517':'#087f5b',color:last?.gapFte==null?'#24372e':last.gapFte>0?'#5c3909':'#04342c'}} data-verdict={last?.gapFte==null?'unknown':last.gapFte>0?'short':'covered'} aria-label="Scenario capacity verdict" className={`rounded-xl border-l-4 p-4 ${last?.gapFte==null?'border-slate-400 bg-slate-50':last.gapFte>0?'border-amber-600 bg-amber-50':'border-teal-700 bg-teal-50'}`}>
   <p className="text-sm">{last?'By '+new Date(last.month+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}):'Set your planning horizon'}</p>
   <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{last?.gapFte==null?'Shortfall not assessed':capacityBalanceLabel(last.gapFte)}</p>
   {last&&<p className="mt-2 text-base"><strong>{format(last.allocatedFte)}</strong> of <strong>{format(last.requiredFte)}</strong> FTE needed</p>}
   {last?.gapFte!=null&&last.gapFte>0?<p className="mt-3 text-sm"><strong>To close this month:</strong> add {format(last.gapFte)} allocated FTE, or reduce the workload. </p>:last?.gapFte==null?<p className="mt-3 text-sm">Enter workload, productive hours and assigned team time to assess the gap.</p>:<p className="mt-3 text-sm">End-month demand covered.</p>}
  </aside>
 </div></div>;
}
