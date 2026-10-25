'use client';
import {capacityBalanceLabel} from '@/lib/capacity-display';
import {KeyFindings} from "@/components/key-findings";
import {capacityFindings} from "@/lib/context-findings";
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
// Display wording only: adapter labels and saved calculation notes stay unchanged.
const displayLabels={...capacityLabels,scope:'Work to plan',volume:'Work items each month',effort:'Hours per item',people:'People at the start',fte:'Contracted time at start (FTE)',hours:'Productive hours per FTE / month'};
const format=(n:number|null)=>n===null?'Unknown':n.toLocaleString(undefined,{maximumFractionDigits:2});
export function CapacityWorkspace(){
 const {goalKey,capacitySession:session,setCapacitySession:setSession}=usePlanningSession();
 const {draft,error}=session,feedback=useRef<HTMLDivElement>(null);
 const preview=capacityPreview(draft);
 const result=session.result??preview.result;
 const cost=session.cost;
 const isPreview=!session.result;
 const edit=(patch:Partial<CapacityDraft>)=>setSession({...session,draft:{...draft,...patch,confirmed:false},result:null,cost:null,error:'',capture:null,scope:patch.scope!==undefined&&patch.scope.trim()!==session.scope?.label?null:session.scope});
 const field=(key:Exclude<keyof CapacityDraft,'fullTimeMovements'|'confirmed'|'sourceNote'>,help?:string)=>capacitySliders[key]?<PlanningAssumptionSlider key={key} label={displayLabels[key]} value={draft[key]??''} onChange={value=>edit({[key]:value})} spec={capacitySliders[key]} help={help}/>:<label className="block min-w-0 text-sm" key={key}>{displayLabels[key]}
  <input aria-label={displayLabels[key]} className={control} value={draft[key]??''} type={key==='openingDate'?'date':'text'} inputMode={key==='scope'||key==='openingDate'?undefined:'decimal'} aria-describedby={help?`capacity-${key}-help`:undefined} onChange={event=>edit({[key]:event.target.value})}/>
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
 return <section aria-label="Workload capacity planning" className="capacity-workspace @container/capacity space-y-4">
  <KeyFindings findings={!error ? capacityFindings(result, isPreview) : null} />
  <p className="text-sm text-muted-foreground">Enter the work and the team you expect to have. Blank numbers stay unknown.</p>
  {draft.sourceNote&&<aside aria-label="Scenario origin" className="rounded border bg-card p-3 text-sm"><strong>Illustrative handoff origin</strong><p>{draft.sourceNote}</p><p>Edit the transferred assumptions below. The original reduction is already included.</p></aside>}
  <SkillClientDemand goalKey={goalKey} onStart={draft=>setSession({draft,result:null,cost:null,error:'',scope:null,capture:null,saveName:''})}/>
  <div className="grid min-w-0 items-start gap-5 grid-cols-1 @min-[48rem]/capacity:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.65fr)]">
  <form noValidate onSubmit={event=>{event.preventDefault();calculate();}} className="min-w-0 space-y-3 rounded-xl border bg-background p-4">
   <h3 className="font-semibold">1. What work needs doing?</h3>
   <div>{field('scope','For example, Service desk - tickets.')}</div>
   <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">{field('volume','For example, clients or tickets.')}{field('effort','Before any productivity improvement.')}</div>
   <h3 className="border-t pt-3 font-semibold">2. How many people do you have?</h3>
   <p className="text-sm text-muted-foreground">Count people separately from working time. FTE means full-time equivalent: two half-time people = 1 FTE.</p>
   <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">{field('people')}{field('fte')}</div>
   <p className="text-sm text-muted-foreground">Enter your dates and time assigned to this work below.</p>
   <details className="border-t pt-1">
    <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Timing &amp; capacity assumptions (required)</summary>
    <p className="mb-3 text-xs text-muted-foreground">Starting people and FTE are measured just before the first planning month. FTE is contracted working time, before assigning time to this work. Leave blanks when unknown; enter 0 only when none.</p>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">{field('openingDate')}{field('months','Plan 1-6 months.')}</div>
    <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">{field('hours','After leave and other non-work time; before time assigned to this work.')}</div>
    <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">{field('hires','Count each joiner once.')}{field('exits','All departures, including retirement; count each person once.')}{field('allocation','0–100%, up to four decimal places. Do not deduct leave again.')}{field('productivity','0–100%, up to four decimal places. Applied once to throughput, not to hires or workload.')}</div>
    <label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft.fullTimeMovements} onChange={e=>edit({fullTimeMovements:e.target.checked})}/>Assume each person joining or leaving accounts for 1 FTE</label>
    {!draft.fullTimeMovements&&<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">{field('hireFte','0–1 FTE/person; explicit assumption, not inferred from current staff.')}{field('exitFte','0–1 FTE/person.')}</div>}
   {field('costRate','Manual USD 0–100,000 per contracted FTE per month, up to two decimal places. Blank = unknown; 0 = zero. Define what your rate includes; no compensation period, loaded components or exchange rate is inferred.')}
   </details>
   <label className="flex min-h-11 items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={draft.confirmed} onChange={e=>setSession({...session,draft:{...draft,confirmed:e.target.checked},result:null,cost:null,capture:null,error:''})}/><span>I confirm these values repeat each month, with no transfers. People leave before new hires join; new hires contribute for the full month. These are my planning assumptions.</span></label>
   <button className="min-h-11 rounded-md bg-foreground px-4 py-2 font-medium text-background focus-visible:ring-2 focus-visible:ring-ring" type="submit">Calculate capacity</button>
  </form>
  <div className="min-w-0 space-y-4">
  <h3 className="font-semibold">3. Do you have enough?</h3>
  {isPreview&&draft.scope&&preview.error&&<p className="text-sm text-destructive">{preview.error}</p>}
  <CapacityProjection result={result}/>
  {result&&!isPreview&&<div className="rounded-xl border bg-background p-4" aria-label="Contracted supply cost estimate">
   <p className="text-sm">Estimated monthly workforce cost - final month · {result.points.at(-1)?.month}</p>
   <p className="mt-2 break-words text-xl font-semibold tabular-nums">{formatCapacityCost(cost?.points.at(-1)?.runRateCents)} <span className="text-sm font-normal">USD/month</span></p>
   <p className="mt-2 text-xs text-muted-foreground">Your rate of {formatCapacityCost(cost?.assumptions.rateCents)} USD per contracted FTE per month × contracted FTE supply.</p>
  </div>}
  <div ref={feedback} tabIndex={-1} aria-label="Capacity calculation feedback" className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
   <p role="alert" aria-atomic="true" className={error?'text-sm text-destructive':'sr-only'}>{error}</p>
   <p role="status" aria-atomic="true" className={error?'sr-only':'font-medium'}>{error?'':result?.status==='needs-inputs'?'Incomplete - some inputs are unknown':isPreview?'Preview from your current inputs. Confirm and calculate to save or use in Overview.':'Calculated from your assumptions'}</p>
   {result&&<div className="space-y-3">
    {result.status==='needs-inputs'&&<p className="text-sm">Fill in the missing numbers, including Timing &amp; capacity assumptions, then confirm and calculate. Known work needs can still be shown while available time is unknown.</p>}
    <p className="text-sm">{result.assumptions.scope.label} · Opening {result.assumptions.opening.asOf}.</p>
    <details className="border-t"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Monthly detail · people and FTE</summary>
    <p className="mb-3 text-xs text-muted-foreground">Available FTE is contracted time assigned to this work; productivity changes required FTE. An FTE gap is not a hiring count. Cost is a monthly estimate from your rate and contracted FTE, rounded to cents; assignment and productivity do not change it. It does not measure actual pay, cumulative spend or savings.</p>
    <div className="overflow-x-auto" role="region" aria-label="Monthly capacity comparison" tabIndex={0}>
     <div className="space-y-3 sm:hidden">{result.points.map(p=><div key={p.month} className="rounded-md border p-3">
      <p className="mb-2 font-medium">{p.month}</p>
      <dl className="grid grid-cols-3 gap-2 text-sm">{[['Available FTE',p.allocatedFte],['Required FTE',p.requiredFte],['Capacity balance',p.gapFte]].map(([label,value])=><div key={label as string}><dt className="text-xs">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{label==='Capacity balance'?capacityBalanceLabel(value as number|null):format(value as number|null)}</dd></div>)}</dl>
      <p className="mt-2 text-xs">{format(p.headcount)} people · {format(p.contractedFte)} contracted FTE</p>
      <p className="mt-2 text-xs">Estimated workforce cost: {formatCapacityCost(cost?.points.find(c=>c.month===p.month)?.runRateCents)} USD/month</p>
     </div>)}</div>
     <table className="hidden w-full text-left text-sm sm:table"><caption className="sr-only">Monthly available and required capacity, with people shown separately</caption><thead><tr>{['Month','People','Contracted FTE','Available FTE','Required FTE','Capacity balance','Estimated workforce cost (USD/month)'].map(label=><th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead><tbody>{result.points.map(p=><tr key={p.month} className="border-t"><th scope="row" className="p-2 font-normal">{p.month}</th>{[p.headcount,p.contractedFte,p.allocatedFte,p.requiredFte,p.gapFte].map((n,i)=><td key={i} className="p-2 tabular-nums">{i===4?capacityBalanceLabel(n):format(n)}</td>)}<td className="p-2 tabular-nums">{formatCapacityCost(cost?.points.find(c=>c.month===p.month)?.runRateCents)}</td></tr>)}</tbody></table>
    </div>
    </details>
   </div>}
  </div>
  </div>
  </div>
  <CapacitySavedScenarios key={goalKey}/>
  <p className="text-xs text-muted-foreground">Save scenarios in this browser under a selected goal. Without a goal, calculations are session-only. Drafts are not saved automatically: they survive navigation but clear on reload or dataset change.</p>
 </section>;
}
