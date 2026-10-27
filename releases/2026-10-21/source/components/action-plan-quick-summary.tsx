import {requiredStaffingPlanFacts} from '@/lib/home-required-staffing-plan';
import {bundleInputKey} from '@/lib/home-bundle-reconciliation';
import {StaffingOptionSummary} from './home-required-staffing-review';
import {HiringPlanningSummary} from './hiring-planning-summary';
import type {BundleDraft,BundleResult} from '@/lib/home-bundle-reconciliation';
import {actionPlanQuickSummary} from '@/lib/action-plan-quick-summary';
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:1});
const money=(value:number|null)=>value===null?'Unknown':`$${value.toLocaleString('en-US',{maximumFractionDigits:2})}`;
export function ActionPlanQuickSummary({draft,result,compact=false,fallbackActions=[]}:{draft:BundleDraft|null;result?:BundleResult|null;compact?:boolean;fallbackActions?:readonly {id:string;step:string}[]}){
 if(draft?.inputs.requiredStaffingPlan&&result?.inputKey===bundleInputKey(draft)){const f=requiredStaffingPlanFacts(draft.inputs.requiredStaffingPlan);return <section aria-label="Action Plan quick summary"><StaffingOptionSummary option={f.option} currency={f.review.inputs.currency} costMonths={f.review.inputs.months} deliveryMonths={f.deliveryTarget?.months??null}/></section>;}
 if(compact)return <CompactPlanSummary draft={draft} result={result} fallbackActions={fallbackActions}/>;
 const value=actionPlanQuickSummary(draft,result);
 const planning=value.planning;
 if(value.conditionalHiring)return <section aria-label="Action Plan quick summary" className="space-y-2"><p className="font-medium">Conditional hiring proposal · assumptions unconfirmed</p><HiringPlanningSummary result={value.conditionalHiring.result}/><p>Full hiring cost and staffing availability: Unknown.</p></section>;
 if(value.hiring){const h=value.hiring;return <section aria-label="Action Plan quick summary" className="@container text-base leading-normal"><div className="grid grid-cols-1 gap-2 @min-[36rem]:grid-cols-3">
 <section aria-label="Total cost" className="min-w-0 break-words rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">External cash subtotal</h4><p>{money(h.externalSubtotal)} USD · partial</p><p>Before unknown costs: {money(h.remainingBeforeUnknownCosts)} USD remaining</p><p>Full mixed-route cost and affordability: Unknown</p></section>
 <section aria-label="Timeline" className="min-w-0 break-words rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">Budget period</h4><p>{h.start} through {h.end} · {h.months} months</p><p>Hire arrival: {h.arrival}</p><p>Internal readiness: Unknown</p></section>
 <section aria-label="Resources" className="min-w-0 break-words rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">Required: {h.requiredRoles} roles</h4><p>{h.externalHires} external hires · {h.externalFte} FTE</p><p>{h.ftePerHire} FTE per hire · {h.remainingRoles} roles unresolved</p><p>Internal availability, release, backfill and payroll: Unknown</p></section>
 </div></section>;}

 const range=(v:{min:number;max:number}|null)=>v===null?'Unknown':v.min===v.max?number(v.min):`${number(v.min)}–${number(v.max)}`;
 if(planning)return <section aria-label="Action Plan quick summary" className="@container space-y-2 text-base leading-normal">
  <p className="text-sm font-medium">{planning.modelProposed?'Model-proposed planning assumptions · unconfirmed':'Planning assumptions · unconfirmed'}</p>
  <div className="grid grid-cols-1 gap-2 @min-[36rem]:grid-cols-3">
   <section aria-label="Incremental cash" className="min-w-0 rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">Incremental cash</h4><p className="text-xl font-semibold">{money(planning.cash)}</p><p className="text-sm">Listed allowances · USD · whole pilot</p><p className="text-sm">Listed cash allowance</p><p className="text-sm">Funding and other costs unconfirmed.</p></section>
   <section aria-label="Timeline" className="min-w-0 rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">Duration</h4><p className="text-xl font-semibold">{number(planning.months)} months</p><p className="text-sm">Start: {draft?.inputs.scope.startMonth.value??'Unknown'}</p><p className="text-sm">Dates and readiness need review.</p></section>
   <section aria-label="Resources" className="min-w-0 rounded-lg border bg-muted/30 p-3"><h4 className="font-semibold">Proposed participation</h4><p className="text-xl font-semibold">{range(planning.participants)} people</p><p>Labor time: {range(planning.hours)} hours</p><p className="text-sm">Labor cost: Not calculated</p><p className="text-sm">{planning.participants&&planning.participants.min!==planning.participants.max?'Range reflects unknown cohort overlap.':'Availability and membership unconfirmed.'}</p></section>
  </div>
  <details><summary className="min-h-11 cursor-pointer py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Assumptions and calculation</summary><ul className="space-y-1 text-sm">{planning.cashItems.map(row=><li key={row.id}>{row.label}: {money(row.amount)}</li>)}{planning.rows.map(row=><li key={row.field+row.target}>{row.label}: {number(row.assumption.value)} {row.unit} · {row.assumption.kind==='model-proposed'?'Model-proposed':row.assumption.kind==='unknown'?'Unknown':'Retained or user-interpreted input'}. {row.assumption.basis}</li>)}</ul><p className="text-sm">Labor hours = proposed people × {number(planning.perPerson)} hours per person over the whole pilot + {number(planning.coordination)} coordination hours. Cash excludes existing payroll. These calculations do not establish staffing, funding or effectiveness.</p></details>
 </section>;
 const allUnknown=value.cash===null&&value.subtotal===null&&!value.costs.length&&value.start===null&&value.finish===null&&value.months===null&&value.people===null&&value.deliveryHours===null&&!value.capacitySeries.length;
 if(allUnknown)return <section aria-label="Action Plan quick summary" className="@container text-base leading-normal"><div className="grid grid-cols-1 gap-2 @min-[36rem]:grid-cols-3">
  <section aria-label="Total cost" className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2"><div className="flex flex-wrap justify-between gap-x-2"><h4 className="font-semibold">Total cost</h4><p>Unknown</p></div><p>Breakdown: Unknown</p></section>
  <section aria-label="Timeline" className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2"><h4 className="font-semibold">Timeline</h4><p>Duration / start / finish: Unknown</p></section>
  <section aria-label="Resources" className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2"><h4 className="font-semibold">Resources</h4><p>People / FTE / staff hours: Unknown</p>{value.staffingHoursSeparate&&<p>Training effort: Unknown</p>}</section>
 </div></section>;
 const costRows=value.costs.map(row=><li key={row.id} className="min-w-0"><div className="flex flex-wrap justify-between gap-x-2"><span>{row.label}</span><span className="font-medium">{money(row.value)}</span></div>{value.chart&&<div aria-hidden="true" className="mt-1 h-1.5 rounded bg-muted"><div className="h-full rounded bg-primary" style={{width:`${row.value!/value.cash!*100}%`}}/></div>}</li>);
 const series=value.capacitySeries,max=Math.max(1,...series.map(point=>point.people),value.demand??0);
 const x=(index:number)=>30+index/Math.max(1,series.length-1)*600,y=(people:number)=>90-people/max*70;
 return <section aria-label="Action Plan quick summary" className="@container rounded-lg border bg-muted/30 p-3 text-base leading-normal">
  <div className="grid grid-cols-1 gap-2 @min-[36rem]:grid-cols-3">
   <section aria-label="Total cost" className="min-w-0 space-y-1">
    <div className="flex flex-wrap justify-between gap-x-2"><h4 className="font-semibold">Incremental cash</h4><p className="text-xl font-semibold">{money(value.cash)}</p></div>
    <p>{value.subtotal!==null?`Listed: ${money(value.subtotal)} · partial`:value.coverage==='reviewed'?'Reviewed cash estimate':'Cost coverage incomplete'}</p>
    <p>USD{value.months!==null?` · ${value.months} months`:''} · excludes existing payroll</p>
    {costRows.length>0?<details><summary className="min-h-11 cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Cash breakdown ({costRows.length})</summary><ul aria-label={value.chart?'Cash breakdown · planning estimate':'Listed cash items'} className="space-y-2">{costRows}</ul></details>:<p>Breakdown: Unknown</p>}
   </section>
   <section aria-label="Timeline" className="min-w-0 space-y-1"><div className="flex flex-wrap justify-between gap-x-2"><h4 className="font-semibold">Timeline</h4><p className="text-xl font-semibold">{value.days===null?'Unknown duration':`${number(value.days)} days`}</p></div><p>Start: {value.start??'Unknown'} · Finish: {value.finish??'Unknown'}</p>{value.dateCount<value.activityCount&&<p>Dates: {value.dateCount}/{value.activityCount} activities</p>}</section>
   <section aria-label="Resources" className="min-w-0 space-y-1"><div className="flex flex-wrap justify-between gap-x-2"><h4 className="font-semibold">People</h4><p className="text-xl font-semibold">{number(value.people)}</p></div><p>FTE: Unknown · Delivery hours: {number(value.deliveryHours)}</p>{value.staffingHoursSeparate&&<p>Training hours separate; combined effort unknown</p>}</section>
  </div>
  {series.length>0&&<details><summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Conditional capacity scenario · not an observed trend</summary><figure aria-label="Conditional capacity scenario" className="mt-2 rounded-lg border p-3"><figcaption className="font-semibold">Capacity scenario · people</figcaption><p>Conditional on readiness · not an observed trend</p><svg role="img" aria-label={`Scenario capacity: ${series[0].people} to ${series.at(-1)!.people} people; demand ${number(value.demand)}`} viewBox="0 0 660 100" className="h-24 w-full"><title>Monthly scenario capacity in people</title><path d="M30 15V90H630" fill="none" stroke="currentColor" opacity=".35"/>{value.demand!==null&&<path d={`M30 ${y(value.demand)}H630`} stroke="currentColor" strokeDasharray="5 4" opacity=".6"/>}<polyline points={series.map((point,index)=>`${x(index)},${y(point.people)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3"/></svg><div className="flex justify-between gap-2"><span>{series[0].month}</span><span>{series.at(-1)!.month}</span></div><p>{number(series[0].people)} → {number(series.at(-1)!.people)} people · Demand: {number(value.demand)}</p><details><summary className="min-h-11 cursor-pointer py-2">Monthly values</summary><ul className="grid grid-cols-2 gap-2">{series.map(point=><li key={point.month}>{point.month}: {number(point.people)} people</li>)}</ul></details></figure></details>}
 </section>;
}

const provenance=(kind:string|undefined)=>kind==='model-proposed'?'Model-proposed · unconfirmed':kind==='unknown'||!kind?'Not supplied':kind==='user-entered'?'User-entered assumption':'Retained planning assumption';
/** One option's short bullets; every quantity comes from the checked summary. */
function CompactPlanSummary({draft,result,fallbackActions}:{draft:BundleDraft|null;result?:BundleResult|null;fallbackActions:readonly {id:string;step:string}[]}){
 const value=actionPlanQuickSummary(draft,result),p=value.planning,h=value.hiring;
 const range=(v:{min:number;max:number}|null)=>v===null?'Unknown':v.min===v.max?number(v.min):`${number(v.min)}–${number(v.max)}`;
 if(value.conditionalHiring)return <section aria-label="Action Plan quick summary"><HiringPlanningSummary compact result={value.conditionalHiring.result}/></section>;
 const cash=p?p.cash:h?h.externalSubtotal:value.cash??value.subtotal;
 const duration=(n:number|null,unit:string)=>n===null?'Unknown':`${number(n)} ${unit}${n===1?'':'s'}`;
 const actions=draft?.bundle.components.map(activity=>({id:activity.id,step:activity.firstStep}))??fallbackActions;
 const stakeholders=[...new Set(draft?.bundle.components.map(c=>c.ownerRole)??[])].join('; ')||'Unknown';
 return <section aria-label="Action Plan quick summary"><ul className="list-disc space-y-2 pl-5 text-sm leading-snug">
 <li>Actions: {actions.length?actions.map((activity,index)=><span key={activity.id}>{index>0?' ':''}{activity.step}</span>):'Not specified'}</li>
 <li>Cost: <strong>{money(cash)}</strong>{cash===null?'':' USD'} · {p?'incremental allowance':h||value.subtotal!==null?'partial cash':'incremental cash'}</li>
 <li>{h?'Budget period':'Duration'}: <strong>{p?duration(p.months,'month'):h?duration(h.months,'month'):duration(value.days,'day')}</strong> · {p?(draft?.inputs.scope.months.kind==='model-proposed'?'proposed':'entered assumption'):h?'cost horizon':'readiness unconfirmed'}</li>
 <li>Labor time: <strong>{range(p?.hours??null)!=='Unknown'?range(p!.hours):number(value.deliveryHours)} hours</strong> · labor cost unknown</li>
 <li>People: <strong>{p?`${range(p.participants)} people`:h?`${h.requiredRoles} roles`:number(value.people)}</strong>{p?.participants&&p.participants.min!==p.participants.max?' · overlap unknown':' · availability unconfirmed'}</li>
 <li>Stakeholders: {stakeholders} · unconfirmed</li>
 <li>{p?`${p.modelProposed?'Model-proposed':'Planning assumptions'} · unconfirmed; existing payroll excluded`:h?'Entered cost assumptions · includes new-hire pay':'Planning assumptions · cost coverage '+value.coverage}</li>
 </ul></section>;
}
/** Flat supporting content for the plan's single disclosure. */
export function ActionPlanCalculationDetails({draft,result}:{draft:BundleDraft|null;result?:BundleResult|null}){
 const value=actionPlanQuickSummary(draft,result),p=value.planning;
 return <section aria-label="Calculation assumptions" className="space-y-2">
 <h4 className="font-semibold">Calculation assumptions</h4>
 {p?<><ul className="list-disc space-y-1 pl-5">{p.cashItems.map(row=><li key={row.id}>{row.label}: {money(row.amount)} USD over the whole plan.</li>)}{p.rows.map(row=><li key={row.field+row.target}>{row.label}: {number(row.assumption.value)} {row.unit} · {provenance(row.assumption.kind)}. {row.assumption.basis}</li>)}</ul><p>Labor hours = people × {number(p.perPerson)} hours per person + {number(p.coordination)} coordination hours over the whole plan. Cash excludes existing payroll; labor cost is not calculated. These assumptions do not establish staffing, funding or effectiveness.</p></>:<><ul className="list-disc pl-5">{value.costs.map(row=><li key={row.id}>{row.label}: {money(row.value)} USD</li>)}</ul><p>Cash coverage: {value.coverage}. Activity dates supplied: {value.dateCount}/{value.activityCount}. Missing inputs remain unknown.</p></>}
 {!!value.capacitySeries.length&&<section aria-label="Conditional capacity scenario"><h4 className="font-semibold">Conditional capacity scenario · not an observed trend</h4><p>Conditional on readiness. Demand: {number(value.demand)} people.</p><ul>{value.capacitySeries.map(point=><li key={point.month}>{point.month}: {number(point.people)} people</li>)}</ul></section>}
 </section>;
}
