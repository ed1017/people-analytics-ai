import type {BundleDraft,BundleResult} from '@/lib/home-bundle-reconciliation';
import {actionPlanQuickSummary} from '@/lib/action-plan-quick-summary';
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:1});
const money=(value:number|null)=>value===null?'Unknown':`$${value.toLocaleString('en-US',{maximumFractionDigits:2})}`;
export function ActionPlanQuickSummary({draft,result}:{draft:BundleDraft|null;result?:BundleResult|null}){
 const value=actionPlanQuickSummary(draft,result);
 const allUnknown=value.cash===null&&value.subtotal===null&&!value.costs.length&&value.start===null&&value.finish===null&&value.months===null&&value.people===null&&value.deliveryHours===null&&!value.capacitySeries.length;
 if(allUnknown)return <section aria-label="Action Plan quick summary" className="@container text-base leading-normal"><div className="grid grid-cols-1 gap-2 @min-[36rem]:grid-cols-3">
  <section aria-label="Total cost" className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2"><div className="flex flex-wrap justify-between gap-x-2"><h4 className="font-semibold">Total cost</h4><p>Unknown</p></div><p>Breakdown: Unknown</p></section>
  <section aria-label="Timeline" className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2"><h4 className="font-semibold">Timeline</h4><p>Duration / start / finish: Unknown</p></section>
  <section aria-label="Resources" className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2"><h4 className="font-semibold">Resources</h4><p>People / FTE / staff hours: Unknown</p>{value.staffingHoursSeparate&&<p>Training effort: Unknown</p>}</section>
 </div></section>;
 const costRows=value.costs.map(row=><li key={row.id} className="min-w-0"><div className="flex flex-wrap justify-between gap-x-2"><span>{row.label}</span><span className="font-medium">{money(row.value)}</span></div>{value.chart&&<div aria-hidden="true" className="mt-1 h-1.5 rounded bg-muted"><div className="h-full rounded bg-primary" style={{width:`${row.value!/value.cash!*100}%`}}/></div>}</li>);
 const series=value.capacitySeries,max=Math.max(1,...series.map(point=>point.people),value.demand??0);
 const x=(index:number)=>30+index/Math.max(1,series.length-1)*600,y=(people:number)=>90-people/max*70;
 return <section aria-label="Action Plan quick summary" className="@container text-base leading-normal">
  <div className="grid grid-cols-1 gap-2 @min-[36rem]:grid-cols-3">
   <section aria-label="Total cost" className="min-w-0 space-y-2 rounded-lg border bg-muted/30 p-3">
    <h4 className="font-semibold">Total cost</h4><p className="text-xl font-semibold">{money(value.cash)}</p>
    <p>{value.subtotal!==null?`Listed: ${money(value.subtotal)} · partial`:value.coverage==='reviewed'?'Reviewed cash estimate':'Cost coverage incomplete'}</p>
    <p>USD{value.months!==null?` · ${value.months} months`:''} · excludes existing payroll</p>
    {costRows.length>0?<><ul aria-label={value.chart?'Cash breakdown · planning estimate':'Listed cash items'} className="space-y-2">{costRows.slice(0,3)}</ul>{costRows.length>3&&<details><summary className="min-h-11 cursor-pointer py-2">More costs ({costRows.length-3})</summary><ul className="space-y-2">{costRows.slice(3)}</ul></details>}</>:<p>Breakdown: Unknown</p>}
   </section>
   <section aria-label="Timeline" className="min-w-0 space-y-2 rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">Timeline</h4><p className="text-xl font-semibold">{value.days===null?'Unknown duration':`${number(value.days)} days`}</p><dl className="space-y-1"><div><dt className="inline">Start: </dt><dd className="inline">{value.start??'Unknown'}</dd></div><div><dt className="inline">Finish: </dt><dd className="inline">{value.finish??'Unknown'}</dd></div></dl>{value.dateCount<value.activityCount&&<p>Dates: {value.dateCount}/{value.activityCount} activities</p>}</section>
   <section aria-label="Resources" className="min-w-0 space-y-2 rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">Resources</h4><p className="text-xl font-semibold">{number(value.people)} participants</p><dl className="space-y-1"><div><dt className="inline">FTE: </dt><dd className="inline">Unknown</dd></div><div><dt className="inline">Delivery hours: </dt><dd className="inline">{number(value.deliveryHours)}</dd></div></dl>{value.staffingHoursSeparate&&<p>Training hours separate; combined effort unknown</p>}</section>
  </div>
  {series.length>0&&<figure aria-label="Conditional capacity scenario" className="mt-2 rounded-lg border p-3"><figcaption className="font-semibold">Capacity scenario · people</figcaption><p>Conditional on readiness · not an observed trend</p><svg role="img" aria-label={`Scenario capacity: ${series[0].people} to ${series.at(-1)!.people} people; demand ${number(value.demand)}`} viewBox="0 0 660 100" className="h-24 w-full"><title>Checked monthly conditional capacity; not FTE or guaranteed availability</title><path d="M30 15V90H630" fill="none" stroke="currentColor" opacity=".35"/>{value.demand!==null&&<path d={`M30 ${y(value.demand)}H630`} stroke="currentColor" strokeDasharray="5 4" opacity=".6"/>}<polyline points={series.map((point,index)=>`${x(index)},${y(point.people)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3"/></svg><div className="flex justify-between gap-2"><span>{series[0].month}</span><span>{series.at(-1)!.month}</span></div><p>{number(series[0].people)} → {number(series.at(-1)!.people)} people · Demand: {number(value.demand)}</p><details><summary className="min-h-11 cursor-pointer py-2">Monthly values</summary><ul className="grid grid-cols-2 gap-2">{series.map(point=><li key={point.month}>{point.month}: {number(point.people)} people</li>)}</ul></details></figure>}
 </section>;
}
