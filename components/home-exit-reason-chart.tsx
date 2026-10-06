"use client";
import {useId} from 'react';
import type {HomeExitReasonChart as ChartData} from '@/lib/home-exit-reason-chart';
export function HomeExitReasonChart({chart}:{chart:ChartData}){
 const id=useId(),max=Math.max(...chart.rows.map(row=>row.count)),step=10**Math.floor(Math.log10(max)),axisMax=Math.ceil(max/step)*step;
 const fmt=(value:number)=>value.toLocaleString('en-US'),period=new Date(chart.date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 return <figure aria-labelledby={id} className="my-3 max-w-xl space-y-2 rounded-lg border p-3 text-xs" data-exit-reason-chart>
  <figcaption><p id={id} className="text-sm font-semibold">Leading reported exit-survey reasons</p><p className="mt-1 text-muted-foreground">{fmt(chart.respondents)} exit-survey respondents · Company-wide · As of {period} · <sup aria-label="Source S2" className="text-[11px]">[S2]</sup></p></figcaption>
  <div role="img" aria-label={`Reported responses, count axis from 0 to ${axisMax}. ${chart.rows.map(row=>`${row.reason}: ${row.count} (${row.percentage}%)`).join('; ')}.`} className="space-y-2">
   {chart.rows.map(row=><div key={row.reason}><div className="mb-0.5 flex flex-wrap justify-between gap-x-2"><span>{row.reason}</span><span className="tabular-nums">{fmt(row.count)} ({row.percentage}%)</span></div><div className="h-3 border-l border-foreground/60 bg-muted/40"><div data-reason-bar data-count={row.count} className="h-full bg-primary" style={{width:`${row.count/axisMax*100}%`}}/></div></div>)}
   <div className="flex justify-between border-t border-foreground/60 pt-1 tabular-nums"><span>0</span><span>{fmt(axisMax/2)}</span><span>{fmt(axisMax)}</span></div><p className="text-center">Reported responses (count)</p>
  </div>
  <p className="text-muted-foreground">Leading supplied reasons; fieldwork period and suppression metadata are unavailable. Reported associations do not establish causes or workforce turnover rates.</p>
 </figure>;
}
