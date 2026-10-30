'use client';

import {useId} from 'react';
import {readPlanAlternatives,planAlternativesField} from '@/lib/home-plan-alternatives';
import {readManualResults,manualPlanResultsField,resultTarget} from '@/lib/manual-plan-results';
import {reviewPlanResult} from '@/lib/plan-result-review';
import {listPositionResultTargets,type PositionResultTarget} from '@/lib/position-result-targets';

const button='min-h-11 rounded-md border bg-background px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
const day=(date:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
export function PlanResultReview({goalId,goal,fields,datasetToken,selected,onSelect,onTrack}:{goalId:string;goal:string;fields:Record<string,unknown>;datasetToken:string;selected:string;onSelect:(id:string)=>void;onTrack:(id:string)=>void}){
 const uid=useId();
 const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId,goal});
 const plans=catalog?.plans.filter(p=>!p.deleted&&catalog.attachments.some(a=>a.planId===p.id))??[];
 let positionTargets:PositionResultTarget[]=[],error='';
 try{positionTargets=listPositionResultTargets(fields,datasetToken,goalId);}catch{error='Saved position targets could not be read. Existing records are retained.';}
 const choices=[...plans.map(p=>({id:p.id,label:`Plan ${p.number} - revision ${p.draft.revision}`})),...positionTargets.map(t=>({id:t.planId,label:`Position scenario ${t.planNumber} - revision ${t.revision} - ${t.date}${t.position.financeRevision===null?' - allocation only':` - funding ${t.position.financeRevision}`}`}))];
 const selection=selected||plans.at(-1)?.id||positionTargets.at(-1)?.planId||'';
 const choice=choices.find(p=>p.id===selection),plan=plans.find(p=>p.id===selection);
 const eligible=plan?resultTarget(plan,fields,datasetToken,goalId):null,target=eligible?.target??positionTargets.find(t=>t.planId===selection);
 let review:ReturnType<typeof reviewPlanResult>|null=null;
 try{const ledger=readManualResults(fields[manualPlanResultsField],goalId);if(ledger.targets.some(item=>item.target.metric==='position-ready-fte'&&!positionTargets.some(t=>JSON.stringify(t)===JSON.stringify(item.target))))throw Error('Position target binding mismatch');if(target)review=reviewPlanResult(ledger,target);}catch{error='Saved results could not be read. Review saved work before recording another result.';}
 const latest=review?.latest;
 const positionResult=target?.metric==='position-ready-fte';
 const difference=review?.difference??null;
 const resultTone=positionResult
  ? difference===null?'bg-muted text-foreground':difference<0?'border border-amber-700 bg-amber-50 text-amber-950':'border border-teal-700 bg-teal-50 text-teal-950'
  : 'bg-primary text-primary-foreground';
 const positionHeadline=difference===null?null:difference<0?`${Math.abs(difference).toLocaleString()} FTE below target`:difference>0?`${difference.toLocaleString()} FTE above target`:'Target met · 0 FTE difference';
 const rows=target?[{label:'Saved target',value:target.value,date:target.date},...(latest?.value!==null&&latest?.value!==undefined?[{label:'Reported result',value:latest.value,date:latest.measuredOn}]:[])]:[];
 const max=Math.max(1,...rows.map(row=>row.value));
 return <section aria-label="Plan result comparison" className="space-y-3 rounded-xl border bg-card p-3 md:p-4">
  {!choice?<><h3 className="text-lg font-semibold">{selected?'Selected plan is unavailable':'Choose a saved plan to begin'}</h3><p>Review attached plans and position targets in Action plans.</p>{selected&&<button type="button" className={button} onClick={()=>onSelect('')}>Choose another saved plan</button>}</>:<>
   <label htmlFor={uid} className="block text-sm font-medium">Saved plan</label>
   <select id={uid} className={`${button} w-full`} value={choice.id} onChange={e=>onSelect(e.target.value)}>{choices.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>
   {target&&review?<>
    <div className={`rounded-lg p-4 ${resultTone}`}><p className="text-sm">{review.status}{review.corrected?' · Corrected':''}</p><h3 className="mt-1 text-2xl font-semibold">{positionResult&&positionHeadline?positionHeadline:review.difference!==null?`${review.difference>0?'+':''}${review.difference.toLocaleString()} ${target.unit} versus target`:latest?.value!==null&&latest?.value!==undefined?`${latest.value.toLocaleString()} ${target.unit} reported`:'Record a result to compare'}</h3><p className="mt-1 text-sm">Target: {target.value.toLocaleString()} {target.unit} · {day(target.date)}</p></div>
    <p className="text-sm text-muted-foreground">{target.illustrative&&target.metric!=='position-ready-fte'?'Scenario practice · ':''}Manually reported, unverified</p>
    <figure aria-label={`Saved target and manually reported result in ${target.unit}`} className="space-y-4">
     <figcaption className="text-sm font-medium">{target.metric==='position-ready-fte'?'Ready capacity in selected vacancies':target.metric==='headcount'?'Headcount':'Additional role coverage'} · {target.unit}</figcaption>
     {rows.map((row,i)=><div key={row.label}><div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span>{row.label} · {day(row.date)}</span><strong>{row.value.toLocaleString()} {target.unit}</strong></div><div aria-hidden="true" className="h-5 rounded bg-muted"><div className={`h-5 rounded ${i?'bg-amber-600':'bg-primary'}`} style={{width:`${row.value/max*100}%`}}/></div></div>)}
    </figure>
    {latest&&review.difference===null&&<p className="text-sm">{latest.value===null?'Reported value is unknown.':`Result dated ${day(latest.measuredOn)}; compare on the target date.`}</p>}
    <details><summary className="min-h-11 cursor-pointer text-sm focus-visible:ring-2 focus-visible:ring-ring">Details</summary><div className="space-y-2 break-words text-sm"><p>{target.population}</p><p>{target.definition}</p><p>{target.provenance}</p>{target.metric==='position-ready-fte'&&<p>Funding revision: {target.position.financeRevision??'Not linked'}.</p>}{latest&&<><p>Source: {latest.sourceNote}</p><p>Recorded: {latest.recordedAt}. {review.corrected?'Correction; the original remains in Track history.':''}</p></>}<p>Manually recorded in this browser. Differences compare this exact plan revision, population, unit and target date.</p></div></details>
   </>:!error&&<p>This plan needs a dated numeric target before results can be compared. Review its measurement in Track.</p>}
   <button type="button" className={button} onClick={()=>onTrack(choice.id)}>Open Track to {latest?'update result':'record result'}</button>
  </>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
