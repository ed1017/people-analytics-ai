'use client';

import {useId,useRef,useState} from 'react';
import {readPlanAlternatives,planAlternativesField} from '@/lib/home-plan-alternatives';
import {activeResults,commitManualResult,manualPlanResultsField,prepareManualResult,readManualResults,resultDifference,resultTarget,type ManualResult,type ResultInput,type ResultTarget,type ResultTicket} from '@/lib/manual-plan-results';
import {listPositionResultTargets,positionFteAmount,type PositionResultTarget} from '@/lib/position-result-targets';
import {decisionStore} from './decision-store';
import {PlanAlternativeCard} from './plan-alternative-card';

const control='min-h-11 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const signed=(n:number)=>`${n>0?'+':''}${n.toLocaleString()}`;
const targetName=(target:ResultTarget)=>`${target.metric==='position-ready-fte'?'Position scenario':'Plan'} ${target.planNumber}, revision ${target.revision}`;
function TargetDescription({target,compact=false}:{target:ResultTarget;compact?:boolean}){
 const definition=<div className="space-y-2 text-sm"><p>{target.metric==='headcount'?'Definition: active employees counted at one point in time.':target.definition}</p>
  {target.startDate&&<p>Planning period: {target.startDate} to {target.date}. Report additional coverage relative to the starting workforce.</p>}
  {(target.metric==='headcount'||target.metric==='position-ready-fte')&&<p className="text-muted-foreground">{target.provenance}</p>}
  {target.metric==='position-ready-fte'&&<p>Funding revision: {target.position.financeRevision??'Not linked'}.</p>}</div>;
 return <div className="space-y-2 text-sm">
  <p><strong>{target.metric==='position-ready-fte'?'Saved position target':target.metric==='additional-role-coverage'?'Saved scenario target':'Saved headcount target'}: {target.value.toLocaleString()} {target.unit} on {target.date}</strong></p>
  <p className="break-words">Population: {target.population}</p>
  {compact?<details><summary className="min-h-11 cursor-pointer">Measurement definition and period</summary>{definition}</details>:definition}
 </div>;
}
function ResultDescription({entry,target}:{entry:ManualResult;target:ResultTarget}){
 const comparison=resultDifference(target,entry);
 return <div className="space-y-1 text-sm">
  <p><strong>Reported result: {entry.value===null?'Unknown':`${entry.value.toLocaleString()} ${target.unit}`}</strong> as of {entry.measuredOn}</p>
  {comparison.difference!==null&&<p>Difference from saved target: <strong>{signed(comparison.difference)} {target.unit}</strong></p>}
  <p>{comparison.note}</p>
  <p className="break-words">Source note: {entry.sourceNote}</p>
  <p className="text-muted-foreground">Recorded {entry.recordedAt.replace('T',' ').replace(/\.\d{3}/,'').replace('Z',' UTC')}. Manually reported, unverified.</p>
 </div>;
}
export function ManualPlanResults({goalId,goal,fields,datasetToken,selectedPlanId,onSelectPlan}:{selectedPlanId?:string;onSelectPlan?:(id:string)=>void;goalId:string;goal:string;fields:Record<string,unknown>;datasetToken:string}){
 const uid=useId(),heading=useRef<HTMLHeadingElement>(null);
 const [selected,setSelected]=useState(''),[ticket,setTicket]=useState<ResultTicket|null>(null),[review,setReview]=useState<ResultInput|null>(null);
 const [value,setValue]=useState(''),[unknown,setUnknown]=useState(false),[date,setDate]=useState(''),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[correction,setCorrection]=useState<string|null>(null);
 const [error,setError]=useState(''),[saved,setSaved]=useState('');
 const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId,goal});
 const plans=catalog?.plans.filter(p=>!p.deleted&&catalog.attachments.some(a=>a.planId===p.id))??[];
 let positionTargets:PositionResultTarget[]=[],positionError='';
 try{positionTargets=listPositionResultTargets(fields,datasetToken,goalId);}catch{positionError='Saved position targets could not be read. Existing records are retained.';}
 const choices=[...plans.map(p=>({id:p.id,label:`Plan ${p.number} - revision ${p.draft.revision}`})),...positionTargets.map(t=>({id:t.planId,label:`${targetName(t)} - ${t.date}${t.position.financeRevision===null?' - allocation only':` - funding ${t.position.financeRevision}`}`}))];
 const selection=(selectedPlanId??selected)||plans.at(-1)?.id||positionTargets.at(-1)?.planId||'';
 const choice=choices.find(p=>p.id===selection),plan=plans.find(p=>p.id===selection);
 const eligible=plan?resultTarget(plan,fields,datasetToken,goalId):null,target=eligible?.target??positionTargets.find(t=>t.planId===selection);
 let ledger:ReturnType<typeof readManualResults>|null=null,readError=positionError;
 try{ledger=readManualResults(fields[manualPlanResultsField],goalId);if(ledger.targets.some(item=>item.target.metric==='position-ready-fte'&&!positionTargets.some(t=>JSON.stringify(t)===JSON.stringify(item.target)))){ledger=null;throw Error('Position target binding mismatch');}}catch{readError='Saved result history could not be read safely. Existing records are retained. Recording is unavailable until storage is reviewed.';}
 const current=ledger&&target?activeResults(ledger,target):[],latest=current.at(-1);
 function close(){setTicket(null);setReview(null);setError('');heading.current?.focus();}
 function open(entry?:ManualResult){
  setError('');setSaved('');
  try{if(!choice)return;setTicket(prepareManualResult(decisionStore,choice.id));setReview(null);setValue(entry?.value===null?'':String(entry?.value??''));setUnknown(entry?.value===null);setDate(entry?.measuredOn??new Date().toISOString().slice(0,10));setNote(entry?.sourceNote??'');setConfirmed(false);setCorrection(entry?.id??null);}catch(e){setError(e instanceof Error?e.message:'Could not open result form.');}
 }
 function prepare(event:React.FormEvent){
  event.preventDefault();setError('');
  const fte=ticket?.target.metric==='position-ready-fte';
  if(!unknown&&(!(fte?/^\d+(?:\.\d{1,2})?$/:/^\d+$/).test(value)||!Number.isFinite(Number(value))||(fte?!positionFteAmount(Number(value)):Number(value)>1e9))){setError(fte?'Enter FTE from 0 to 1,000 with at most two decimal places, or choose Result is unknown.':'Enter a whole number from 0 to 1,000,000,000, or choose Result is unknown.');return;}
  if(!date||date>new Date().toISOString().slice(0,10)||!note.trim()||!confirmed){setError('Enter a non-future measurement date and source note, then confirm the definition and population.');return;}
  setReview({value:unknown?null:Number(value),measuredOn:date,sourceNote:note.trim(),supersedes:correction,scopeConfirmed:true});
 }
 function save(){
  if(!ticket||!review)return;
  try{commitManualResult(decisionStore,ticket,review,new Date().toISOString(),crypto.randomUUID());setSaved(correction?'Correction saved. The original entry remains in history.':'Result saved in this browser.');close();}catch(e){setError(e instanceof Error?e.message:'Result was not saved.');}
 }
 return <section aria-label="Recorded plan results" className="min-w-0 space-y-3 rounded-lg border bg-card p-4">
  <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold">Record a result</h3>
  <p className="text-sm text-muted-foreground">Report what was measured against an attached saved plan. Entries stay in this browser; they are not shared across devices or verified by the app.</p>
  {choices.length>1&&<label className="block space-y-1 text-sm" htmlFor={`${uid}-plan`}><span>Saved plan</span><select id={`${uid}-plan`} className={`${control} w-full`} value={choice?.id??''} disabled={!!ticket} onChange={e=>{setSelected(e.target.value);onSelectPlan?.(e.target.value);setSaved('');setError('');}}>{choices.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
  {choice&&<p className="text-sm font-medium">{choice.label}</p>}
  {plan&&catalog&&<details key={plan.id} className="border-t pt-2">
   <summary className="min-h-11 cursor-pointer text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Review selected saved plan</summary>
   <p className="mb-3 text-sm text-muted-foreground">Plan {plan.number}, revision {plan.draft.revision}: saved assumptions and evidence references, not recorded results. Review their population and period against your measurement. Opening this review does not change the plan or report.</p>
   <PlanAlternativeCard plan={plan} catalog={catalog} snapshot/>
  </details>}
  {!choice&&<><p className="text-sm">{selection?'Selected target is unavailable. Choose another saved plan or position target.':'Attach a plan or link a saved position target to this goal to record a result.'}</p>{selection&&<button type="button" className={control} onClick={()=>{setSelected('');onSelectPlan?.('');}}>Choose another saved plan</button>}</>}
  {target?<>
   {target.illustrative&&target.metric!=='position-ready-fte'&&<p className="rounded border border-amber-500/40 bg-amber-500/5 p-2 text-sm">Illustrative plan: entries here are practice reports for this scenario, not company outcomes.</p>}
   <TargetDescription target={target} compact={!ticket}/>
   {!ticket&&<>{latest?<ResultDescription entry={latest} target={target}/>:<p className="text-sm">No result recorded for this exact saved target. Missing results are not zero.</p>}
    <button type="button" disabled={!!readError} className={control} onClick={()=>open()}>Record a result</button>
   </>}
  </>:eligible&&<p className="text-sm">{eligible.reason}</p>}
  {readError&&<p role="alert" className="text-sm">{readError}</p>}
  {saved&&<p role="status" className="text-sm">{saved}</p>}
  {error&&<p role="alert" className="text-sm">{error}</p>}
  {ticket&&(review?<section aria-label="Review result before saving" className="space-y-3 border-t pt-3">
   <h4 className="font-semibold">Review {correction?'correction':'result'}</h4>
   <p className="text-sm">{targetName(ticket.target)}. {correction?'The prior entry will remain in history.':'Manual result.'}</p>
   <p className="text-sm"><strong>{review.value===null?'Unknown':`${review.value.toLocaleString()} ${ticket.target.unit}`}</strong> as of {review.measuredOn}</p>
   <p className="break-words text-sm">Source note: {review.sourceNote}</p>
   <p className="text-sm">{resultDifference(ticket.target,review).note}</p>
   <div className="flex flex-wrap gap-2"><button type="button" className={control} onClick={save}>Save {correction?'correction':'result'}</button><button type="button" className={control} onClick={()=>{setReview(null);setError('');}}>Back to edit</button><button type="button" className={control} onClick={close}>Cancel</button></div>
  </section>:<form aria-label={correction?'Correct recorded result':'Record measured result'} onSubmit={prepare} className="space-y-3 border-t pt-3">
   <h4 className="font-semibold">{correction?'Correct entry':'Enter measured result'}</h4>
   <div className="grid gap-3 sm:grid-cols-2">
    <label htmlFor={`${uid}-value`} className="block space-y-1 text-sm"><span>{ticket.target.metric==='position-ready-fte'?'Ready capacity in selected vacancies':ticket.target.metric==='headcount'?'Active employees':'Additional qualified, allocated roles'} ({ticket.target.unit})</span><input autoFocus={!unknown} id={`${uid}-value`} className={`${control} w-full`} type="text" inputMode={ticket.target.metric==='position-ready-fte'?'decimal':'numeric'} disabled={unknown} required={!unknown} value={value} onChange={e=>setValue(e.target.value)} maxLength={13}/></label>
    <label htmlFor={`${uid}-date`} className="block min-w-0 space-y-1 text-sm"><span>Measured as of</span><input autoFocus={unknown} id={`${uid}-date`} className={`${control} w-full min-w-0`} type="date" required max={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
   </div>
   <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)}/>Result is unknown</label>
   <label htmlFor={`${uid}-note`} className="block space-y-1 text-sm"><span>Source note{correction?' and reason for correction':''}</span><textarea id={`${uid}-note`} className={`${control} w-full`} rows={2} required maxLength={600} value={note} onChange={e=>setNote(e.target.value)} aria-describedby={`${uid}-privacy`}/></label>
   <p id={`${uid}-privacy`} className="text-xs text-muted-foreground">Name the aggregate report, measurement method and any limitations. Do not include employee names, IDs or personal information. A source note is not verification.</p>
   <label className="flex min-h-11 items-start gap-2 py-2 text-sm"><input type="checkbox" className="mt-1" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I confirm this report uses the displayed definition, population and unit. It is a point-in-time result.</span></label>
   <div className="flex flex-wrap gap-2"><button className={control} type="submit">Review result</button><button type="button" className={control} onClick={close}>Cancel</button></div>
  </form>)}
  {!!ledger?.entries.length&&<details className="border-t pt-3"><summary className="min-h-11 cursor-pointer text-sm font-medium">Result history ({ledger.entries.length} entries for this goal)</summary><div className="space-y-4 pt-2">{[...ledger.entries].reverse().map(entry=>{
   const snapshot=ledger!.targets.find(t=>t.id===entry.targetId)!.target,replaced=ledger!.entries.some(e=>e.supersedes===entry.id),canCorrect=current.some(e=>e.id===entry.id);
   return <article key={entry.id} className="space-y-2 rounded border p-3"><h4 className="text-sm font-semibold">{targetName(snapshot)}{replaced?' - Superseded entry':entry.supersedes?' - Current corrected result':''}</h4><p className="text-sm">{snapshot.metric==='position-ready-fte'?'Manually reported FTE.':snapshot.illustrative?'Practice report for an illustrative plan.':'Manually reported.'}</p><ResultDescription entry={entry} target={snapshot}/><details><summary className="min-h-11 cursor-pointer text-sm">Exact target saved with this entry</summary><TargetDescription target={snapshot}/></details>{canCorrect&&!ticket&&<button type="button" className={control} onClick={()=>open(entry)}>Correct entry from {entry.measuredOn}</button>}</article>;
  })}</div></details>}
 </section>;
}
