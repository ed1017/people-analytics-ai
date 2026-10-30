'use client';
import {useId,useState} from 'react';
import {useDecisionStorage} from '@/components/decision-store';
import {POSITION_ALLOCATION_LEDGER_FIELD,readPositionScenarioLedger} from '@/lib/position-allocation-store';
import {POSITION_FINANCE_LEDGER_FIELD,readPositionFinanceLedger,positionFinanceForAllocation} from '@/lib/position-finance-store';
import {POSITION_FINANCE_MODEL,assessPositionFinance,unknownPositionFinance,noPositionAddition} from '@/lib/position-finance-assessment';
import {positionChatContext} from '@/lib/position-chat-context';
import {PositionScenarioExplanation} from './position-scenario-explanation';

export type OverviewPlanFromPositionsProps={datasetToken:string;goalId:string;onChoosePositions:()=>void};
const money=(value:number|null)=>value===null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const fundingLabels:Record<string,string>={'invalid-scenario':'Review allocation','approval-required':'Approval required','funding-unknown':'Funding not verified','within-demo-envelope':'Within demo allowance','within-supplied-approved-envelope':'Funding not verified'};

/** A view-only selection: never reopens or replaces an allocation or chat draft. */
export function OverviewPlanFromPositions({datasetToken,goalId,onChoosePositions}:OverviewPlanFromPositionsProps){
 const uid=useId(),storage=useDecisionStorage(),scope=JSON.stringify([datasetToken,goalId]);
 const [selection,setSelection]=useState({scope,value:''});
 if(selection.scope!==scope)setSelection({scope,value:''});
 const value=selection.scope===scope?selection.value:'';
 const workspace=goalId?storage.data.workspaces[goalId]:storage.data.exploration;
 const fields=workspace?.fields??{},raw=fields[POSITION_ALLOCATION_LEDGER_FIELD];
 const ledger=storage.ready?readPositionScenarioLedger(raw,datasetToken,goalId):null;
 const financeLedger=ledger?readPositionFinanceLedger(fields[POSITION_FINANCE_LEDGER_FIELD],datasetToken,goalId,raw):null;
 const row=ledger?.records.find(record=>`${record.scenarioId}:${record.revision}`===value);
 const record=row&&financeLedger?positionFinanceForAllocation(financeLedger,row.scenarioId,row.revision):null;
 // Browser-supplied approved-source metadata is not an authenticated Finance record.
 const envelope=row?(record?.finance.basis==='approved-source'?unknownPositionFinance(row.draft):record?.finance??unknownPositionFinance(row.draft)):null;
 const addition=record?.addition??noPositionAddition();
 const assessment=row&&envelope&&financeLedger?assessPositionFinance({version:1,modelVersion:POSITION_FINANCE_MODEL,allocation:row.draft,finance:envelope,addition}):null;
 const goal=storage.data.goals.goals.find(item=>item.id===goalId)?.statement??'';
 const packet=row&&envelope&&assessment&&storage.saved?positionChatContext({draft:row.draft,scenario:{id:row.scenarioId,revision:row.revision},finance:{version:1,modelVersion:POSITION_FINANCE_MODEL,envelope,addition}},{datasetToken,goalId,goal}):null;
 return <section aria-labelledby={`${uid}-title`} className="min-w-0 space-y-3 rounded-xl border p-3">
  <h3 id={`${uid}-title`} className="text-lg font-semibold">Plan from positions</h3>
  <p className="text-sm text-muted-foreground">Use a saved position scenario and its funding assumptions. General capacity options use separate assumptions.</p>
  {!storage.ready?<p role="status" className="text-sm">Loading saved position scenarios…</p>:!ledger||!financeLedger?<p role="alert" className="text-sm">Saved position comparisons could not be read. Existing records are retained.</p>:ledger.records.length===0?<p className="text-sm">Choose vacancies and save an allocation to review it here.</p>:<label htmlFor={`${uid}-select`} className="block text-sm font-medium">Saved position scenario
   <select id={`${uid}-select`} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring" value={row?value:''} onChange={event=>setSelection({scope,value:event.target.value})}>
    <option value="">Choose a saved revision</option>{ledger.records.map(item=><option key={`${item.scenarioId}:${item.revision}`} value={`${item.scenarioId}:${item.revision}`}>Scenario {item.scenarioNumber} · revision {item.revision}</option>)}
   </select>
  </label>}
  {row&&assessment&&<div className="space-y-2"><strong className="text-sm">{fundingLabels[assessment.status]}</strong><p className="text-base font-semibold">Hire {row.draft.input.hire}. Repurpose {row.draft.input.repurpose}. Train {row.draft.input.train}.</p><dl className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><dt className="text-xs text-muted-foreground">Selected positions</dt><dd>{row.draft.input.selectedIds.length}</dd></div><div><dt className="text-xs text-muted-foreground">Cash required</dt><dd>{money(assessment.requiredCashUsd)}</dd></div><div><dt className="text-xs text-muted-foreground">Horizon</dt><dd>{row.draft.input.horizonMonths} months</dd></div><div><dt className="text-xs text-muted-foreground">Proposed additions</dt><dd>{assessment.proposedAddition.positions}</dd></div></dl>
   <PositionScenarioExplanation key={`${scope}:${value}`} packet={packet}/>
   <details><summary className="min-h-11 cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-ring">Details</summary><p className="text-sm">Allocation revision {row.revision}{record?`, funding revision ${record.revision}`:', no saved funding comparison'}. {row.draft.inventory.asOf}. {envelope?.reference??'No verified Finance approval supplied.'}</p></details>
  </div>}
  <button type="button" onClick={onChoosePositions} className="min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Choose positions</button>
 </section>;
}
