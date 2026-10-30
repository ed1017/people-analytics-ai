"use client";
import {useId,useRef,useState} from 'react';
import {decisionStore} from './decision-store';
import {POSITION_ALLOCATION_LEDGER_FIELD,readPositionScenarioLedger} from '@/lib/position-allocation-store';
import {POSITION_FINANCE_LEDGER_FIELD,readPositionFinanceLedger} from '@/lib/position-finance-store';
import {commitPositionResultTarget,preparePositionResultTarget,type PositionResultTicket} from '@/lib/position-result-targets';
const control='min-h-11 rounded-lg border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
export function PositionResultSetup({fields,datasetToken,goalId,onLinked}:{fields:Record<string,unknown>;datasetToken:string;goalId:string;onLinked:(id:string)=>void}){
 const uid=useId(),heading=useRef<HTMLHeadingElement>(null),[selection,setSelection]=useState(''),[date,setDate]=useState(''),[ticket,setTicket]=useState<PositionResultTicket|null>(null),[error,setError]=useState('');
 const allocations=readPositionScenarioLedger(fields[POSITION_ALLOCATION_LEDGER_FIELD],datasetToken,goalId);
 const funding=readPositionFinanceLedger(fields[POSITION_FINANCE_LEDGER_FIELD],datasetToken,goalId,fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 const choices=(allocations?.records??[]).flatMap(capture=>[null,...(funding?.records.filter(f=>f.scenarioId===capture.scenarioId&&f.allocationRevision===capture.revision)??[])].map(finance=>({key:`${capture.scenarioId}:${capture.revision}:${finance?.revision??'none'}`,capture,finance})));
 const choice=choices.find(c=>c.key===selection);
 if(fields[POSITION_ALLOCATION_LEDGER_FIELD]===undefined)return null;
 function cancel(){setTicket(null);setError('');requestAnimationFrame(()=>heading.current?.focus());}
 function review(e:React.FormEvent){e.preventDefault();setError('');try{if(!choice)throw Error('Choose a saved position revision.');setTicket(preparePositionResultTarget(decisionStore,{scenarioId:choice.capture.scenarioId,allocationRevision:choice.capture.revision,financeRevision:choice.finance?.revision??null,date}));}catch(e){setError(e instanceof Error?e.message:'Review the selected revision and target date.');}}
 function save(){if(!ticket)return;try{const target=commitPositionResultTarget(decisionStore,ticket,new Date().toISOString(),crypto.randomUUID());setTicket(null);onLinked(target.planId);}catch(e){setError(e instanceof Error?e.message:'Target was not saved. Review the current scenario.');}}
 return <section aria-label="Track a position scenario" className="min-w-0 space-y-3 rounded-xl border bg-card p-3 md:p-4">
  <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold">Track a position scenario</h3>
  {!allocations||!funding?<p role="alert">Saved position revisions could not be read. Existing work is retained.</p>:!choices.length?<p className="text-sm">Save a position allocation to set its tracking target.</p>:<form onSubmit={review} className="space-y-3">
   <div className="grid gap-3 sm:grid-cols-[2fr_1fr]"><label htmlFor={`${uid}-revision`} className="min-w-0 space-y-1 text-sm"><span>Position and funding revision</span><select required disabled={!!ticket} id={`${uid}-revision`} className={`${control} w-full`} value={selection} onChange={e=>{setSelection(e.target.value);setError('');}}><option value="">Choose a saved revision</option>{choices.map(c=><option key={c.key} value={c.key}>Scenario {c.capture.scenarioNumber} / revision {c.capture.revision}{c.finance?` / funding ${c.finance.revision}`:' / allocation only'}</option>)}</select></label>
   <label htmlFor={`${uid}-date`} className="min-w-0 space-y-1 text-sm"><span>Target date</span><input required disabled={!!ticket} id={`${uid}-date`} className={`${control} w-full min-w-0`} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
   {choice&&<div className="space-y-2 text-sm"><p className="text-lg font-semibold">Target: {choice.capture.result.targetReadyFte.toLocaleString()} FTE ready in existing vacancies</p><p>Hire {choice.capture.draft.input.hire} · Repurpose {choice.capture.draft.input.repurpose} · Train {choice.capture.draft.input.train} · Month {choice.capture.draft.input.horizonMonths}</p>
    {!!choice.finance?.addition.count&&<p>{choice.finance.addition.count} proposed additional position{choice.finance.addition.count===1?'':'s'} · {choice.finance.result.proposedAddition.positionFte??'Unknown'} proposed FTE · 0 ready FTE</p>}
    <details><summary className="min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">Details</summary><p>The target measures qualified, allocated FTE in the selected existing vacancies at the saved horizon. Choose the calendar date for that horizon. Redesign without staffing and proposed additional positions do not add ready FTE. Funding and release approvals remain as recorded in the selected revision.</p><p>Inventory: {choice.capture.draft.inventory.version}. {choice.capture.result.vacancies} selected vacancies; {choice.capture.result.redesignedUnstaffed} redesigned but unstaffed.</p></details>
   </div>}
   {!ticket?<button type="submit" className={`${control} bg-primary font-semibold text-primary-foreground`}>Review tracking target</button>:<div role="group" aria-label="Confirm position tracking target" className="space-y-2 rounded-lg border p-3"><p className="text-sm font-semibold">Track {choice?.capture.result.targetReadyFte.toLocaleString()} FTE by {date}?</p><p className="text-sm">This keeps the selected revision unchanged.</p><div className="flex flex-wrap gap-2"><button type="button" className={`${control} bg-primary font-semibold text-primary-foreground`} onClick={save}>Save target and open Track</button><button type="button" className={control} onClick={cancel}>Cancel</button></div></div>}
  </form>}
  {error&&<p role="alert" className="text-sm">{error}</p>}
 </section>;
}
