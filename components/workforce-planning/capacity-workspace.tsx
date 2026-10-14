'use client';
import {useRef} from 'react';
import {SkillClientDemand} from './skill-client-demand';
import {CapacityProjection} from './capacity-projection';
import {calculateMonthlyWorkload} from '@/lib/swp-monthly-workload';
import {capacitySpec,capacityLabels,type CapacityDraft} from '@/lib/swp-capacity-draft';
import {decisionStore} from '@/components/decision-store';
import {datasetSession} from '@/lib/dataset-client.mjs';
import {capacityContext,capacityBinding} from '@/lib/swp-capacity-store';
import {calculateCapacityCost,capacityCostAssumptions,capacityCalculationKey,formatCapacityCost} from '@/lib/swp-capacity-cost';
import {CapacitySavedScenarios} from './capacity-saved-scenarios';
import {usePlanningSession} from './planning-session-context';

import {PlanningAssumptionSlider} from '@/components/planning-assumption-slider';
import {capacitySliders} from '@/lib/planning-slider';
import {capacityPreview} from '@/lib/capacity-preview';

const control='mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-foreground';
const format=(n:number|null)=>n===null?'Unknown':n.toLocaleString(undefined,{maximumFractionDigits:2});
export function CapacityWorkspace(){
 const {goalKey,capacitySession:session,setCapacitySession:setSession}=usePlanningSession();
 const {draft,error}=session,feedback=useRef<HTMLDivElement>(null);
 const preview=capacityPreview(draft);
 const result=session.result??preview.result;
 const cost=session.cost;
 const isPreview=!session.result;
 const edit=(patch:Partial<CapacityDraft>)=>setSession({...session,draft:{...draft,...patch,confirmed:false},result:null,cost:null,error:'',capture:null,scope:patch.scope!==undefined&&patch.scope.trim()!==session.scope?.label?null:session.scope});
 const field=(key:Exclude<keyof CapacityDraft,'fullTimeMovements'|'confirmed'>,help?:string)=>capacitySliders[key]?<PlanningAssumptionSlider key={key} label={capacityLabels[key]} value={draft[key]??''} onChange={value=>edit({[key]:value})} spec={capacitySliders[key]} help={help}/>:<label className="block min-w-0 text-sm" key={key}>{capacityLabels[key]}
  <input aria-label={capacityLabels[key]} className={control} value={draft[key]??''} type={key==='openingDate'?'date':'text'} inputMode={key==='scope'||key==='openingDate'?undefined:'decimal'} aria-describedby={help?`capacity-${key}-help`:undefined} onChange={event=>edit({[key]:event.target.value})}/>
  {help&&<span id={`capacity-${key}-help`} className="mt-1 block text-xs text-muted-foreground">{help}</span>}
 </label>;
 function calculate(){
  try {
   const currentDraft={...draft,costRate:draft.costRate??''};
   const result=calculateMonthlyWorkload(capacitySpec(currentDraft));
   const cost=calculateCapacityCost(result,capacityCostAssumptions(currentDraft.costRate));
   const scope=session.scope??{id:crypto.randomUUID(),label:draft.scope.trim(),workUnit:draft.scope.trim()};
   let binding=null;
   try{binding=capacityBinding(capacityContext(decisionStore,datasetSession.snapshot(),goalKey.slice(goalKey.indexOf(':')+1)),scope);}catch{/* General exploration remains session-only. */}
   setSession({...session,draft:currentDraft,result,cost,error:'',scope,capture:{inputKey:capacityCalculationKey(result,cost),binding}});
  }
  catch(error){setSession({...session,result:null,cost:null,capture:null,error:error instanceof Error?error.message:'Check your inputs.'});}
  requestAnimationFrame(()=>feedback.current?.focus());
 }
 return <section aria-label="Workload capacity planning" className="space-y-4">
  <p className="text-sm text-muted-foreground">Choose a skill, enter the expected work, then compare it with your assumed capacity. Blank inputs stay unknown.</p>
  <SkillClientDemand goalKey={goalKey} onStart={draft=>setSession({draft,result:null,cost:null,error:'',scope:null,capture:null,saveName:''})}/>
  <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.65fr)]">
  <form noValidate onSubmit={event=>{event.preventDefault();calculate();}} className="min-w-0 space-y-3 rounded-xl border bg-background p-4">
   <h3 className="font-semibold">2. Enter expected work</h3>
   <div>{field('scope','Use the skill above or name a workload, e.g. Service desk - tickets.')}</div>
   <div className="grid gap-3 sm:grid-cols-2">{field('volume','For client demand, enter clients per month.')}{field('effort','For client demand, enter hours per client, before productivity improvement.')}</div>
   <p className="text-sm text-muted-foreground">To see a gap, complete the timing and capacity assumptions below. Skill references do not supply available FTE.</p>
   <details className="border-t pt-1">
    <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Timing &amp; capacity assumptions (required)</summary>
    <p className="mb-3 text-xs text-muted-foreground">Opening stocks are immediately before the first planning month. People are whole people; contracted FTE is before workload assignment. Work effort is before productivity improvement. Productive hours are net of leave and non-work time, before assignment.</p>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">{field('openingDate')}{field('months','Plan 1-6 months.')}</div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{field('people')}{field('fte')}{field('hours')}</div>
    <div className="mt-2 grid gap-3 sm:grid-cols-2">{field('hires','Count each joiner once.')}{field('exits','All departures, including retirement; count each person once.')}{field('allocation','0–100%, up to four decimal places. Do not deduct leave again.')}{field('productivity','0–100%, up to four decimal places. Applied once to throughput, not to hires or workload.')}</div>
    <label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.fullTimeMovements} onChange={e=>edit({fullTimeMovements:e.target.checked})}/>Assume every hire and departure is full-time (1 FTE per person)</label>
    {!draft.fullTimeMovements&&<div className="grid gap-3 sm:grid-cols-2">{field('hireFte','0–1 FTE/person; explicit assumption, not inferred from current staff.')}{field('exitFte','0–1 FTE/person.')}</div>}
   {field('costRate','Manual USD 0–100,000 per contracted FTE per month, up to two decimal places. Blank = unknown; 0 = zero. Define what your rate includes; no compensation period, loaded components or exchange rate is inferred.')}
   </details>
   <label className="flex min-h-11 items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={draft.confirmed} onChange={e=>setSession({...session,draft:{...draft,confirmed:e.target.checked},result:null,cost:null,capture:null,error:''})}/><span>I confirm the entered values repeat each month, with no transfers. Departures leave the opening stock before hires; hires contribute for the full month. These are my planning assumptions.</span></label>
   <button className="min-h-11 rounded-md bg-foreground px-4 py-2 font-medium text-background focus-visible:ring-2 focus-visible:ring-ring" type="submit">Calculate capacity</button>
  </form>
  <div className="min-w-0 space-y-4">
  <h3 className="font-semibold">3. See the capacity gap</h3>
  {isPreview&&<p role="status" className="text-sm">Live preview only. Confirm and calculate before saving or using this scenario in Overview.</p>}
  {isPreview&&draft.scope&&preview.error&&<p role="status" className="text-sm text-destructive">{preview.error}</p>}
  <CapacityProjection result={result}/>
  {result&&!isPreview&&<div className="rounded-xl border bg-background p-4" aria-label="Contracted supply cost estimate">
   <p className="text-sm">Final-month contracted supply run-rate · {result.points.at(-1)?.month}</p>
   <p className="mt-2 break-words text-xl font-semibold tabular-nums">{formatCapacityCost(cost?.points.at(-1)?.runRateCents)} <span className="text-sm font-normal">USD/month</span></p>
   <p className="mt-2 text-xs text-muted-foreground">User-assumed {formatCapacityCost(cost?.assumptions.rateCents)} USD per contracted FTE per month × contracted FTE supply, rounded to cents. Assignment and productivity do not change this estimate. It is not actual pay, cumulative spend or savings.</p>
  </div>}
  <div ref={feedback} tabIndex={-1} aria-live="polite" className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   {!result&&!error&&<p className="text-sm text-muted-foreground">Calculate to compare monthly supply and workload. Editing an input clears the previous result and confirmation.</p>}
   {result&&<div className="space-y-3">
    <p className="font-medium">{result.status==='needs-inputs'?'Incomplete - some inputs are unknown':isPreview?'Preview from your current inputs':'Calculated from your assumptions'}</p>
    {result.status==='needs-inputs'&&<p className="text-sm">Complete the blank inputs in Timing &amp; capacity assumptions, then confirm and calculate again. Known workload requirements can still be shown when supply is unknown.</p>}
    <p className="text-sm">{result.assumptions.scope.label} · Opening {result.assumptions.opening.asOf}. Positive gap = shortfall; negative gap = surplus.</p>
    <details className="border-t"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Monthly detail · people and FTE</summary>
    <div className="overflow-x-auto" role="region" aria-label="Monthly capacity comparison" tabIndex={0}>
     <div className="space-y-3 sm:hidden">{result.points.map(p=><div key={p.month} className="rounded-md border p-3">
      <p className="mb-2 font-medium">{p.month}</p>
      <dl className="grid grid-cols-3 gap-2 text-sm">{[['Available FTE',p.allocatedFte],['Required FTE',p.requiredFte],['Gap FTE',p.gapFte]].map(([label,value])=><div key={label as string}><dt className="text-xs">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{label==='Gap FTE'&&typeof value==='number'&&value>0?'+':''}{format(value as number|null)}</dd></div>)}</dl>
      <p className="mt-2 text-xs">{format(p.headcount)} people · {format(p.contractedFte)} contracted FTE</p>
      <p className="mt-2 text-xs">Supply run-rate: {formatCapacityCost(cost?.points.find(c=>c.month===p.month)?.runRateCents)} USD/month</p>
     </div>)}</div>
     <table className="hidden w-full text-left text-sm sm:table"><caption className="sr-only">Monthly available and required capacity, with people shown separately</caption><thead><tr>{['Month','People','Contracted FTE','Available FTE','Required FTE','Gap FTE','Supply run-rate (USD/month)'].map(label=><th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead><tbody>{result.points.map(p=><tr key={p.month} className="border-t"><th scope="row" className="p-2 font-normal">{p.month}</th>{[p.headcount,p.contractedFte,p.allocatedFte,p.requiredFte,p.gapFte].map((n,i)=><td key={i} className="p-2 tabular-nums">{i===4&&n!==null&&n>0?'+':''}{format(n)}</td>)}<td className="p-2 tabular-nums">{formatCapacityCost(cost?.points.find(c=>c.month===p.month)?.runRateCents)}</td></tr>)}</tbody></table>
    </div>
    </details>
    <p className="text-xs text-muted-foreground">Available FTE is contracted FTE assigned to this work. Productivity changes required FTE; an FTE gap is not a number of people to hire.</p>
   </div>}
  </div>
  </div>
  </div>
  <CapacitySavedScenarios key={goalKey}/>
  <p className="text-xs text-muted-foreground">Saved scenarios stay in this browser under the selected goal. Without a goal, calculations are session-only. Unsaved drafts survive navigation but clear on reload or dataset change. No automatic saving. Optional cost estimates use only your manual rate and contracted FTE supply.</p>
 </section>;
}
