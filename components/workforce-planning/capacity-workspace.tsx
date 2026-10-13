'use client';
import {useRef} from 'react';
import {calculateMonthlyWorkload} from '@/lib/swp-monthly-workload';
import {capacitySpec,capacityLabels,type CapacityDraft} from '@/lib/swp-capacity-draft';
import {usePlanningSession} from './planning-session-context';

const control='mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-foreground';
const format=(n:number|null)=>n===null?'Unknown':n.toLocaleString(undefined,{maximumFractionDigits:2});
export function CapacityWorkspace(){
 const {capacitySession:session,setCapacitySession:setSession}=usePlanningSession();
 const {draft,result,error}=session,feedback=useRef<HTMLDivElement>(null);
 const edit=(patch:Partial<CapacityDraft>)=>setSession({...session,draft:{...draft,...patch,confirmed:false},result:null,error:''});
 const field=(key:Exclude<keyof CapacityDraft,'fullTimeMovements'|'confirmed'>,help?:string)=><label className="block min-w-0 text-sm" key={key}>{capacityLabels[key]}
  <input aria-label={capacityLabels[key]} className={control} value={draft[key]} type={key==='openingDate'?'date':'text'} inputMode={key==='scope'||key==='openingDate'?undefined:'decimal'} aria-describedby={help?`capacity-${key}-help`:undefined} onChange={event=>edit({[key]:event.target.value})}/>
  {help&&<span id={`capacity-${key}-help`} className="mt-1 block text-xs text-muted-foreground">{help}</span>}
 </label>;
 function calculate(){
  try {setSession({...session,result:calculateMonthlyWorkload(capacitySpec(draft)),error:''});}
  catch(error){setSession({...session,result:null,error:error instanceof Error?error.message:'Check your inputs.'});}
  requestAnimationFrame(()=>feedback.current?.focus());
 }
 return <section aria-label="Workload capacity planning" className="space-y-4 rounded-lg border p-4">
  <div><h3 className="text-lg font-semibold">Can our capacity cover the work?</h3><p className="text-sm text-muted-foreground">One workload, 1–6 months. User assumptions, not a staffing forecast. Blank values stay unknown.</p></div>
  <form noValidate onSubmit={event=>{event.preventDefault();calculate();}} className="space-y-4">
   <div className="grid gap-3 sm:grid-cols-3">{field('scope','Name one group and its work unit, e.g. Service desk — tickets.')}{field('openingDate','Stocks immediately before the first planning month.')}{field('months')}</div>
   <div className="grid gap-3 sm:grid-cols-2">{field('people','Whole people; not a full-time-equivalent count.')}{field('fte','Contracted full-time equivalents, before assignment to this work.')}</div>
   <div className="grid gap-3 sm:grid-cols-3">{field('volume')}{field('effort','Work effort before the productivity improvement.')}{field('hours','Net of leave and non-work time; before workload assignment.')}</div>
   <details className="rounded-md border p-3">
    <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Recurring assumptions — required for complete capacity</summary>
    <div className="mt-2 grid gap-3 sm:grid-cols-2">{field('hires','Count each joiner once.')}{field('exits','All departures, including retirement; count each person once.')}{field('allocation','0–100%. Do not deduct leave again.')}{field('productivity','0–100%. Applied once to throughput, not to hires or workload.')}</div>
    <label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.fullTimeMovements} onChange={e=>edit({fullTimeMovements:e.target.checked})}/>Assume every hire and departure is full-time (1 FTE per person)</label>
    {!draft.fullTimeMovements&&<div className="grid gap-3 sm:grid-cols-2">{field('hireFte','0–1 FTE/person; explicit assumption, not inferred from current staff.')}{field('exitFte','0–1 FTE/person.')}</div>}
   </details>
   <label className="flex min-h-11 items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={draft.confirmed} onChange={e=>setSession({...session,draft:{...draft,confirmed:e.target.checked},result:null,error:''})}/><span>I confirm the entered values repeat each month, with no transfers. Departures leave the opening stock before hires; hires contribute for the full month. These are my planning assumptions.</span></label>
   <button className="min-h-11 rounded-md bg-foreground px-4 py-2 font-medium text-background focus-visible:ring-2 focus-visible:ring-ring" type="submit">Calculate capacity</button>
  </form>
  <div ref={feedback} tabIndex={-1} aria-live="polite" className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   {!result&&!error&&<p className="text-sm text-muted-foreground">Calculate to compare monthly supply and workload. Editing an input clears the previous result and confirmation.</p>}
   {result&&<div className="space-y-3">
    <p className="font-medium">{result.status==='needs-inputs'?'Incomplete — some inputs are unknown':'Calculated from your assumptions'}</p>
    {result.status==='needs-inputs'&&<p className="text-sm">Complete blank fields in the form and Recurring assumptions, then confirm and calculate again. Known workload requirements can still be shown when supply is unknown.</p>}
    <p className="text-sm">{result.assumptions.scope.label} · Opening {result.assumptions.opening.asOf}. Positive gap = shortfall; negative gap = surplus.</p>
    <div className="overflow-x-auto" role="region" aria-label="Monthly capacity comparison" tabIndex={0}>
     <div className="space-y-3 sm:hidden">{result.points.map(p=><div key={p.month} className="rounded-md border p-3">
      <p className="mb-2 font-medium">{p.month}</p>
      <dl className="grid grid-cols-3 gap-2 text-sm">{[['Available FTE',p.allocatedFte],['Required FTE',p.requiredFte],['Gap FTE',p.gapFte]].map(([label,value])=><div key={label as string}><dt className="text-xs">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{label==='Gap FTE'&&typeof value==='number'&&value>0?'+':''}{format(value as number|null)}</dd></div>)}</dl>
      <p className="mt-2 text-xs">{format(p.headcount)} people · {format(p.contractedFte)} contracted FTE</p>
     </div>)}</div>
     <table className="hidden w-full text-left text-sm sm:table"><caption className="sr-only">Monthly available and required capacity, with people shown separately</caption><thead><tr>{['Month','People','Contracted FTE','Available FTE','Required FTE','Gap FTE'].map(label=><th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead><tbody>{result.points.map(p=><tr key={p.month} className="border-t"><th scope="row" className="p-2 font-normal">{p.month}</th>{[p.headcount,p.contractedFte,p.allocatedFte,p.requiredFte,p.gapFte].map((n,i)=><td key={i} className="p-2 tabular-nums">{i===4&&n!==null&&n>0?'+':''}{format(n)}</td>)}</tr>)}</tbody></table>
    </div>
    <p className="text-xs text-muted-foreground">Available FTE is contracted FTE assigned to this work. Productivity changes required FTE; an FTE gap is not a number of people to hire.</p>
   </div>}
  </div>
  <p className="text-xs text-muted-foreground">Draft and result stay in this session during navigation. No automatic saving. Reloading clears them. Saved scenario comparison and cost estimates are not included in this calculator.</p>
 </section>;
}
