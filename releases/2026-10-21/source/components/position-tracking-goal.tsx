"use client";
import {useEffect,useRef,useState} from 'react';
import {decisionStore} from './decision-store';
import {POSITION_ALLOCATION_LEDGER_FIELD,readPositionScenarioLedger} from '@/lib/position-allocation-store';
import {POSITION_FINANCE_LEDGER_FIELD,readPositionFinanceLedger} from '@/lib/position-finance-store';
import {preparePositionTrackingGoal,confirmPositionTrackingGoal,type PositionTrackingTicket} from '@/lib/position-tracking-goal';
const control='min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
export function PositionTrackingGoal({fields,datasetToken,onCreated}:{fields:Record<string,unknown>;datasetToken:string;onCreated:()=>void}) {
 const [ticket,setTicket]=useState<PositionTrackingTicket|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const locked=useRef(false),trigger=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(ticket)heading.current?.focus();},[ticket]);
 const allocations=readPositionScenarioLedger(fields[POSITION_ALLOCATION_LEDGER_FIELD],datasetToken,'');
 const finance=readPositionFinanceLedger(fields[POSITION_FINANCE_LEDGER_FIELD],datasetToken,'',fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 if(!allocations||!finance)return <p role="alert" className="text-sm">Saved position scenarios need review. Return to Talent Inventory to inspect them; existing work is retained.</p>;
 if(!allocations.records.length)return <p className="text-sm text-muted-foreground">Select a saved goal on Overview to review its plans. No goal is selected.</p>;
 function review(){if(locked.current)return;setError('');try{setTicket(preparePositionTrackingGoal({store:decisionStore,datasetToken}));}catch(e){setError(e instanceof Error?e.message:'Saved scenarios could not be reviewed. Try again.');}}
 function cancel(){if(locked.current)return;setTicket(null);setError('');requestAnimationFrame(()=>trigger.current?.focus());}
 function confirm(){if(!ticket||locked.current)return;locked.current=true;setBusy(true);setError('');try{confirmPositionTrackingGoal({store:decisionStore,ticket,goalId:crypto.randomUUID(),at:new Date().toISOString()});onCreated();}catch(e){locked.current=false;setBusy(false);setError(e instanceof Error?e.message:'The tracking goal was not saved. Review and try again.');}}
 return <section aria-label="Start tracking saved positions" className="min-w-0 space-y-3 rounded-xl border bg-card p-3 md:p-4">
  {!ticket?<><h3 className="text-lg font-semibold">Track your saved position scenarios</h3><p className="text-sm">Create a goal to set a target and record results.</p><button ref={trigger} type="button" className={`${control} bg-primary text-primary-foreground`} onClick={review}>Create tracking goal</button></>:<div role="group" aria-label="Review tracking goal" className="space-y-3">
   <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold focus-visible:ring-2 focus-visible:ring-ring">{ticket.goal}</h3>
   <p className="text-sm">{ticket.scenarioCount} saved scenario{ticket.scenarioCount===1?'':'s'} · {ticket.revisionCount} allocation revision{ticket.revisionCount===1?'':'s'} · {ticket.financeRevisionCount} funding revision{ticket.financeRevisionCount===1?'':'s'}</p>
   <p className="text-sm">A copy will be added to the new goal. General exploration stays unchanged.</p>
   <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={`${control} bg-primary text-primary-foreground`} onClick={confirm}>{busy?'Creating goal…':'Create and continue'}</button><button type="button" disabled={busy} className={control} onClick={cancel}>Cancel</button>{error&&<button type="button" disabled={busy} className={control} onClick={review}>Review again</button>}</div>
  </div>}
  {error&&<p role="alert" className="text-sm">{error}</p>}
 </section>;
}
