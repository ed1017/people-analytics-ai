"use client";
import {useId,useState} from 'react';
import {useDecisionStorage} from './decision-store';
import {requirePositionAllocationDraft,calculatePositionAllocation,type PositionAllocationDraft} from '@/lib/position-allocation';
import {POSITION_ALLOCATION_DRAFT_FIELD,POSITION_ALLOCATION_LEDGER_FIELD,readPositionScenarioLedger} from '@/lib/position-allocation-store';
import {POSITION_FINANCE_LEDGER_FIELD,readPositionFinanceLedger,positionAllocationSignature} from '@/lib/position-finance-store';
import {PositionAllocationPlanner,type PositionPlannerHandoffRequest} from './workforce-planning/position-allocation-planner';
export function PositionScenarioSource({datasetToken,goalId,onOpenInventory,onTrackPositions,active=true}:{datasetToken:string;goalId:string;onOpenInventory:()=>void;onTrackPositions?:()=>void;active?:boolean}){
 const uid=useId(),storage=useDecisionStorage(),scope=JSON.stringify([datasetToken,goalId]);
 const [selection,setSelection]=useState({scope,key:''}),[request,setRequest]=useState<{scope:string;value:PositionPlannerHandoffRequest}|null>(null);
 if(selection.scope!==scope){setSelection({scope,key:''});setRequest(null);}
 const fields=(goalId?storage.data.workspaces[goalId]:storage.data.exploration)?.fields??{};
 const allocations=readPositionScenarioLedger(fields[POSITION_ALLOCATION_LEDGER_FIELD],datasetToken,goalId);
 const finance=readPositionFinanceLedger(fields[POSITION_FINANCE_LEDGER_FIELD],datasetToken,goalId,fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 const choices=(allocations?.records??[]).flatMap(row=>{
  const signature=positionAllocationSignature(row.draft),funding=finance?.records.filter(f=>f.scenarioId===row.scenarioId&&f.allocationRevision===row.revision&&f.allocationSignature===signature)??[];
  return [null,...funding].map(f=>({key:`${row.scenarioId}:${row.revision}:${f?.revision??'none'}`,label:`Scenario ${row.scenarioNumber} / revision ${row.revision}${f?` / funding ${f.revision}`:' / allocation only'}`,row,signature,financeRevision:f?.revision??null}));
 });
 const choice=selection.scope===scope?choices.find(c=>c.key===selection.key):undefined;
 return <section aria-label="Position scenario inputs" className="min-w-0 space-y-3">
  {!storage.ready?<p role="status">Loading saved scenarios.</p>:!allocations||!finance?<p role="alert">Saved position revisions could not be verified. Existing work is retained.</p>:choices.length>0&&<div className="flex flex-wrap items-end gap-2"><label htmlFor={uid} className="min-w-0 flex-1 text-sm font-semibold">Use saved position inputs<select id={uid} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 text-sm" value={choice?.key??''} onChange={e=>setSelection({scope,key:e.target.value})}><option value="">Choose an allocation and funding revision</option>{choices.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label><button type="button" className="min-h-11 rounded-lg border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring" disabled={!choice||!storage.saved} onClick={()=>{if(!choice)return;setRequest({scope,value:{requestId:crypto.randomUUID(),scenarioId:choice.row.scenarioId,revision:choice.row.revision,allocationSignature:choice.signature,financeRevision:choice.financeRevision}});}}>Use selected revision</button></div>}
  <PositionAllocationPlanner key={scope} datasetToken={datasetToken} goalId={goalId} embedded active={active} onOpenInventory={onOpenInventory} onTrackPositions={onTrackPositions} handoffRequest={request?.scope===scope?request.value:undefined}/>
 </section>;
}

export function CurrentPositionScenarioSummary({goalId}:{goalId:string}){
 const storage=useDecisionStorage(),fields=(goalId?storage.data.workspaces[goalId]:storage.data.exploration)?.fields??{};
 let draft:PositionAllocationDraft|null=null;try{const raw=fields[POSITION_ALLOCATION_DRAFT_FIELD];requirePositionAllocationDraft(raw);draft=raw;}catch{}
 if(!draft)return <section aria-label="Current position scenario" className="space-y-2 text-sm"><h3 className="text-lg font-semibold">Plan staffing from positions</h3><p>Select vacancies or a saved revision in the scenario planner.</p></section>;
 const result=calculatePositionAllocation(draft);
 return <section aria-label="Current position scenario summary" className="space-y-2 text-sm"><h3 className="text-lg font-semibold">Hire {draft.input.hire}. Repurpose {draft.input.repurpose}. Train {draft.input.train}.</h3><p>{draft.input.selectedIds.length} selected positions · {draft.input.horizonMonths}-month scenario</p>{!result.valid&&<p role="status">Review the allocation in the planner.</p>}</section>;
}
