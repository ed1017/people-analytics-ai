'use client';
import {useChartPointerTooltip} from './chart-pointer-tooltip';
import type {WorkforceFlow} from '@/lib/home-workforce-flows';
export function HomeWorkforceFlows({rows:sourceRows,asOf}:{rows:WorkforceFlow[]|null;asOf?:string}){
 const {point,tooltip}=useChartPointerTooltip(JSON.stringify([asOf,sourceRows]));
 const end=asOf?.slice(0,7)??sourceRows?.at(-1)?.month;
 const rows=sourceRows?.filter(r=>r.month.slice(0,4)===end?.slice(0,4)&&r.month<=end!)??null;
 if(!rows?.length)return <p className="mt-3 text-xs text-muted-foreground">Monthly hires and separations unavailable for this view.</p>;
 const net=(r:WorkforceFlow)=>r.hires===null||r.separations===null?'Unavailable':(r.hires-r.separations>0?'+':'')+(r.hires-r.separations);
 const description=(r:WorkforceFlow)=>`${r.month}: hires ${r.hires??'Unavailable'}, separations ${r.separations??'Unavailable'}, net change ${net(r)} people`;
 const high=Math.max(1,...rows.flatMap(r=>[r.hires??0,r.separations??0])),top=Math.ceil(high/50)*50;
 const x=(i:number)=>12+85*i/Math.max(1,rows.length-1),y=(n:number)=>142-120*n/top;
 const label=(m:string)=>new Date(m+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
 return <figure aria-label="Monthly hires and separations" className="mt-4 min-w-0 space-y-2 border-t pt-3 text-sm">
  <h3 className="font-semibold">Monthly hires and separations</h3>
  <p className="text-xs text-muted-foreground">Company-wide · {label(rows[0].month)}–{label(rows.at(-1)!.month)} · people per month</p>
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs"><span><span aria-hidden="true" style={{color:'var(--chart-1)'}}>━━</span> Hires: external starts (derived)</span><span><span aria-hidden="true" style={{color:'var(--chart-4)'}}>┄┄</span> Separations: all exits</span></div>
  <svg role="group" aria-label="Monthly external starts and total separations, counts. Focus points or use the exact values table; missing months are not connected." width="100%" height="174">
   {[0,top/2,top].map(t=><g key={t}><line x1="12%" x2="97%" y1={y(t)} y2={y(t)} stroke="currentColor" opacity=".15"/><text x="10%" y={y(t)+4} textAnchor="end" fill="currentColor" fontSize="11">{t}</text></g>)}
   {(['hires','separations'] as const).map(key=>rows.map((row,i)=>{const value=row[key],previous=rows[i-1]?.[key],color=key==='hires'?'var(--chart-1)':'var(--chart-4)';return value===null?null:<g key={key+row.month}>{i>0&&previous!=null&&new Date(row.month+'-01T00:00:00Z').getTime()-new Date(rows[i-1].month+'-01T00:00:00Z').getTime()<=32*86400000&&<line x1={x(i-1)+'%'} x2={x(i)+'%'} y1={y(previous)} y2={y(value)} stroke={color} strokeWidth="2" strokeDasharray={key==='separations'?'5 3':undefined}/>}<circle {...point(description(row))} cx={x(i)+'%'} cy={y(value)} r="10" fill="transparent"/><circle aria-hidden="true" pointerEvents="none" cx={x(i)+'%'} cy={y(value)} r="3" fill={color}/></g>;}))}
   {[0,Math.floor((rows.length-1)/2),rows.length-1].filter((n,i,a)=>a.indexOf(n)===i).map((n,i,a)=><text key={n} x={x(n)+'%'} y="168" textAnchor={i===0?'start':i===a.length-1?'end':'middle'} fill="currentColor" fontSize="11">{label(rows[n].month)}</text>)}
  </svg>
  {tooltip}

  <details><summary className="min-h-11 cursor-pointer py-2">Monthly counts and calculation</summary><p className="text-xs text-muted-foreground">External starts = month-end headcount change + total exits. Separations include voluntary and involuntary exits. Internal moves and recruiting offer dates are excluded. Missing months remain gaps.</p><div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Monthly workforce flows in people</caption><thead><tr><th scope="col">Month</th><th scope="col">External starts (derived)</th><th scope="col">Separations</th><th scope="col">Net change</th></tr></thead><tbody>{rows.map(r=><tr key={r.month}><th scope="row">{r.month}</th><td>{r.hires??'Unavailable'}</td><td>{r.separations??'Unavailable'}</td><td>{net(r)}</td></tr>)}</tbody></table></div></details>
 </figure>;
}
