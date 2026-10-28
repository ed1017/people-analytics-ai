'use client';

import {useId} from 'react';
import {readPlanAlternatives,planAlternativesField} from '@/lib/home-plan-alternatives';
import {readManualResults,manualPlanResultsField,resultTarget} from '@/lib/manual-plan-results';
import {reviewPlanResult} from '@/lib/plan-result-review';

const button='min-h-11 rounded-md border bg-background px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
const day=(date:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
export function PlanResultReview({goalId,goal,fields,datasetToken,selected,onSelect,onTrack}:{goalId:string;goal:string;fields:Record<string,unknown>;datasetToken:string;selected:string;onSelect:(id:string)=>void;onTrack:(id:string)=>void}){
 const uid=useId();
 const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId,goal});
 const plans=catalog?.plans.filter(p=>!p.deleted&&catalog.attachments.some(a=>a.planId===p.id))??[];
 const plan=selected?plans.find(p=>p.id===selected):plans.at(-1);
 const eligible=plan?resultTarget(plan,fields,datasetToken,goalId):null,target=eligible?.target;
 let review:ReturnType<typeof reviewPlanResult>|null=null,error='';
 try{const ledger=readManualResults(fields[manualPlanResultsField],goalId);if(target)review=reviewPlanResult(ledger,target);}catch{error='Saved results could not be read. Review saved work before recording another result.';}
 const latest=review?.latest;
 const rows=target?[{label:'Saved target',value:target.value,date:target.date},...(latest?.value!==null&&latest?.value!==undefined?[{label:'Reported result',value:latest.value,date:latest.measuredOn}]:[])]:[];
 const max=Math.max(1,...rows.map(row=>row.value));
 return <section aria-label="Plan result comparison" className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
  {!plan?<><h3 className="text-lg font-semibold">{selected?'Selected plan is unavailable':'Choose a saved plan to begin'}</h3><p>Review attached plans in Action plans.</p>{selected&&<button type="button" className={button} onClick={()=>onSelect('')}>Choose another saved plan</button>}</>:<>
   <label htmlFor={uid} className="block text-sm font-medium">Saved plan</label>
   <select id={uid} className={`${button} w-full`} value={plan.id} onChange={e=>onSelect(e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>Plan {p.number} — revision {p.draft.revision}</option>)}</select>
   {target&&review?<>
    <div className="rounded-lg bg-primary p-4 text-primary-foreground"><p className="text-sm">{review.status}{review.corrected?' · Corrected':''}</p><h3 className="mt-1 text-2xl font-semibold">{review.difference!==null?`${review.difference>0?'+':''}${review.difference.toLocaleString()} ${target.unit} versus target`:latest?.value!==null&&latest?.value!==undefined?`${latest.value.toLocaleString()} ${target.unit} reported`:'Record a result to compare'}</h3><p className="mt-1 text-sm">Target: {target.value.toLocaleString()} {target.unit} · {day(target.date)}</p></div>
    <p className="text-sm text-muted-foreground">{target.illustrative?'Scenario practice · ':''}Manually reported, unverified</p>
    <figure aria-label={`Saved target and manually reported result in ${target.unit}`} className="space-y-4">
     <figcaption className="text-sm font-medium">{target.metric==='headcount'?'Headcount':'Additional role coverage'} · {target.unit}</figcaption>
     {rows.map((row,i)=><div key={row.label}><div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span>{row.label} · {day(row.date)}</span><strong>{row.value.toLocaleString()} {target.unit}</strong></div><div aria-hidden="true" className="h-5 rounded bg-muted"><div className={`h-5 rounded ${i?'bg-amber-600':'bg-primary'}`} style={{width:`${row.value/max*100}%`}}/></div></div>)}
    </figure>
    {latest&&review.difference===null&&<p className="text-sm">{latest.value===null?'Reported value is unknown.':`Result dated ${day(latest.measuredOn)}; compare on the target date.`}</p>}
    <details><summary className="min-h-11 cursor-pointer text-sm focus-visible:ring-2 focus-visible:ring-ring">Details</summary><div className="space-y-2 break-words text-sm"><p>{target.population}</p><p>{target.definition}</p><p>{target.provenance}</p>{latest&&<><p>Source: {latest.sourceNote}</p><p>Recorded: {latest.recordedAt}. {review.corrected?'Correction; the original remains in Track history.':''}</p></>}<p>Manually recorded in this browser. Differences compare this exact plan revision, population, unit and target date.</p></div></details>
   </>:!error&&<p>This plan needs a dated numeric target before results can be compared. Review its measurement in Track.</p>}
   {error&&<p role="alert">{error}</p>}
   <button type="button" className={button} onClick={()=>onTrack(plan.id)}>Open Track to {latest?'update result':'record result'}</button>
  </>}
 </section>;
}
