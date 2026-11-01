'use client';
import {useId,useMemo,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {POSITION_MARKET_FIELD,readPositionMarketLedger,positionMarketChatReference} from '@/lib/position-market-assumptions';
import {positionChatContext} from '@/lib/position-chat-context';
import {PositionMarketContext} from './position-market-context';
import {PositionModeledDuties} from './position-modeled-duties';
import {POSITION_MODELED_DUTIES_FIELD,readPositionModeledDutiesLedger,positionModeledDutiesChatReference} from '@/lib/position-modeled-duties';
import {POSITION_MARKET_CONTEXT_FIELD,readPositionMarketContextLedger,positionMarketContextChatReference} from '@/lib/position-market-context';
import {PositionScenarioExplanation} from './position-scenario-explanation';
import type {PositionAllocationDraft} from '@/lib/position-allocation';
import {DEMO_POSITION_INVENTORY} from '@/lib/position-inventory';
import type {PositionScenarioCapture} from '@/lib/position-allocation-store';
import {assessPositionFinance,unknownPositionFinance,noPositionAddition,POSITION_FINANCE_MODEL,type PositionFinanceAssessmentInput,type PositionFinanceEnvelope,type PositionAdditionProposal} from '@/lib/position-finance-assessment';
import {readPositionFinanceLedger,positionFinanceForAllocation,positionAllocationSignature,savePositionFinanceScenario,POSITION_FINANCE_LEDGER_FIELD,type PositionFinanceCapture} from '@/lib/position-finance-store';

const control='min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
const button='min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
const money=(n:number|null)=>n===null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const labels:Record<string,string>={'invalid-scenario':'Review allocation','approval-required':'Approval required','funding-unknown':'Funding not verified','within-demo-envelope':'Within demo allowance','within-supplied-approved-envelope':'Within supplied approved funding'};
const approvalLabels:Record<string,string>={'new-positions':'new positions','positions-outside-funded-envelope':'positions outside the funding envelope','frozen-positions':'release frozen positions','funding-exceeded':'additional funding','on-hold-positions':'resume paused requisitions'};
type Edit={finance:PositionFinanceEnvelope;addition:PositionAdditionProposal;baseRevision:number};
export type PositionFinancePanelProps={allocation:PositionAllocationDraft;datasetToken:string;goalId:string;savedCapture:PositionScenarioCapture|null;allocationLedger:unknown;initialFinanceRevision?:number|null;active?:boolean};
/** Separate explicit capture of funding assumptions. Allocation saves remain v1. */
export function PositionFinancePanel({allocation,datasetToken,goalId,savedCapture,allocationLedger,initialFinanceRevision,active=true}:PositionFinancePanelProps){
 const uid=useId(),storage=useDecisionStorage(),fields=(goalId?storage.data.workspaces[goalId]:storage.data.exploration)?.fields??{};
 const raw=fields[POSITION_FINANCE_LEDGER_FIELD];
 const ledger=useMemo(()=>readPositionFinanceLedger(raw,datasetToken,goalId,allocationLedger),[raw,datasetToken,goalId,allocationLedger]);
 const [edits,setEdits]=useState<Record<string,Edit>>({}),[selected,setSelected]=useState<Record<string,string>>({}),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const signature=positionAllocationSignature(allocation),matches=Boolean(savedCapture&&positionAllocationSignature(savedCapture.draft)===signature);
 const key=JSON.stringify([datasetToken,goalId,savedCapture?.scenarioId??'',savedCapture?.revision??0]);
 const [contextSelections,setContextSelections]=useState<Record<string,number|null>>({});
 const contextRevision=contextSelections[key]??null;
 const [dutySelections,setDutySelections]=useState<Record<string,number|null>>({});
 const dutyRevision=dutySelections[key]??null;
 const [preferredRevision,setPreferredRevision]=useState<number|null|undefined>(initialFinanceRevision);
 const record=ledger&&savedCapture?(preferredRevision===undefined?positionFinanceForAllocation(ledger,savedCapture.scenarioId,savedCapture.revision):preferredRevision===null?null:ledger.records.find(row=>row.scenarioId===savedCapture.scenarioId&&row.allocationRevision===savedCapture.revision&&row.allocationSignature===signature&&row.revision===preferredRevision)??null):null;
 const missingRequestedRevision=preferredRevision!==undefined&&preferredRevision!==null&&matches&&!record;
 const latest=ledger?.records.filter(row=>row.scenarioId===savedCapture?.scenarioId).at(-1);
 const edit=edits[key]??{finance:record?.finance??unknownPositionFinance(allocation),addition:record?.addition??noPositionAddition(),baseRevision:latest?.revision??0};
 const input:PositionFinanceAssessmentInput={version:1,modelVersion:POSITION_FINANCE_MODEL,allocation,finance:edit.finance,addition:edit.addition};
 let result:ReturnType<typeof assessPositionFinance>|null=null,validation='';
 try{result=assessPositionFinance(input);}catch(e){validation=e instanceof Error?e.message:'Review funding assumptions.';}
 const disabled=!storage.ready||!storage.saved||!matches||!ledger||missingRequestedRevision;
 const goal=storage.data.goals.goals.find(g=>g.id===goalId)?.statement??'';
 const marketLedger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,allocationLedger);
 const contextLedger=readPositionMarketContextLedger(fields[POSITION_MARKET_CONTEXT_FIELD],datasetToken,goalId,allocationLedger);
 const selectedContext=contextLedger&&savedCapture&&contextRevision!==null?positionMarketContextChatReference(contextLedger,savedCapture,contextRevision):null;
 const contextValid=!!contextLedger&&(contextRevision===null||!!selectedContext);
 const dutyLedger=readPositionModeledDutiesLedger(fields[POSITION_MODELED_DUTIES_FIELD],datasetToken,goalId,allocationLedger);
 const selectedDuties=dutyLedger&&savedCapture&&dutyRevision!==null?positionModeledDutiesChatReference(dutyLedger,savedCapture,dutyRevision):null;
 const dutiesValid=!!dutyLedger&&(dutyRevision===null||!!selectedDuties);
 const explanationPacket=!disabled&&contextValid&&dutiesValid&&result&&result.status!=='invalid-scenario'&&savedCapture&&marketLedger?positionChatContext({draft:allocation,modeledDuties:selectedDuties,marketContext:selectedContext,market:positionMarketChatReference(marketLedger,savedCapture),scenario:{id:savedCapture.scenarioId,revision:savedCapture.revision},finance:{version:1,modelVersion:POSITION_FINANCE_MODEL,envelope:edit.finance,addition:edit.addition}},{datasetToken,goalId,goal}):null;
 const records=ledger?.records.filter(row=>row.scenarioId===savedCapture?.scenarioId&&row.allocationRevision===savedCapture?.revision)??[];
 function patch(next:Partial<Edit>){setEdits(current=>({...current,[key]:{...edit,...next}}));setNotice('');setError('');}
 function allowance(value:number|null){patch({finance:{...edit.finance,basis:'illustrative-demo',reference:'User-entered scenario funding allowance; no Finance approval record',incrementalFundingUsd:value,fundedPositionIds:edit.finance.basis==='unknown'?null:edit.finance.fundedPositionIds}});}
 function addition<K extends keyof PositionAdditionProposal>(name:K,value:PositionAdditionProposal[K]){const next={...edit.addition,[name]:value};patch({addition:next.count===0?noPositionAddition():next});}
 function demo(){if(allocation.inventory.version!==DEMO_POSITION_INVENTORY.version)return;patch({finance:{...unknownPositionFinance(allocation),basis:'illustrative-demo',reference:'Explicitly adopted funding assumption for the 76-position scenario',fundedPositionIds:[...allocation.input.selectedIds],incrementalFundingUsd:allocation.input.budgetUsd}});}
 function reopen(row:PositionFinanceCapture){setPreferredRevision(row.revision);patch({finance:structuredClone(row.finance),addition:structuredClone(row.addition),baseRevision:latest?.revision??0});setNotice(`Opened funding revision ${row.revision}. Saving creates a new comparison if changed.`);}
 function save(){try{
  if(disabled||!savedCapture)throw Error('Save the current allocation before saving its funding comparison.');
  const snapshot=decisionStore.getSnapshot(),goal=snapshot.data.goals.goals.find(g=>g.id===goalId)?.statement??'';
  const capture=savePositionFinanceScenario({store:decisionStore,datasetToken,goalId,goal,revision:snapshot.data.revision,at:new Date().toISOString(),scenarioId:savedCapture.scenarioId,allocationRevision:savedCapture.revision,allocationSignature:signature,input,baseFinanceRevision:edit.baseRevision});
  setEdits(current=>{const next={...current};delete next[key];return next;});setSelected(current=>({...current,[key]:String(capture.revision)}));setPreferredRevision(capture.revision);setError('');setNotice(`Saved funding comparison ${capture.revision} for allocation revision ${savedCapture.revision}.`);
 }catch(e){setError(e instanceof Error?e.message:'Funding comparison could not be saved.');}}
 const number=(label:string,value:number|null,change:(v:number|null)=>void,max:number,step=1)=><label className="min-w-0 text-sm font-medium">{label}<input className={control} type="number" min={0} max={max} step={step} value={value??''} placeholder="Unknown" onChange={e=>change(e.target.value===''?null:Number(e.target.value))}/></label>;
 return <section aria-labelledby={`${uid}-title`} className="min-w-0 space-y-3 rounded-xl border p-3">
  <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 id={`${uid}-title`} className="text-lg font-semibold">Funding and added positions</h3><strong className="text-sm">{matches?labels[result?.status??'invalid-scenario']:'Save allocation first'}</strong></div>
  {!matches&&<p className="text-sm">Save the current allocation to compare funding and added positions.</p>}
  {missingRequestedRevision&&<p role="alert" className="text-sm">The selected funding revision is unavailable. Reopen the intended position scenario.</p>}
  {!ledger&&<p role="alert" className="text-sm">Saved funding comparisons could not be read. Existing records are retained.</p>}
  <fieldset disabled={disabled} className="min-w-0 space-y-3 disabled:opacity-60">
   <legend className="sr-only">Funding and proposed position assumptions</legend>
   <div className="grid min-w-0 gap-3 sm:grid-cols-2">{number(`Scenario allowance · USD over ${allocation.input.horizonMonths} months`,edit.finance.incrementalFundingUsd,allowance,100000000,100)}<div className="flex flex-wrap items-end gap-2">{allocation.inventory.version===DEMO_POSITION_INVENTORY.version&&<button type="button" className={button} onClick={demo}>Adopt demo funding envelope</button>}<button type="button" className={button} onClick={()=>patch({finance:unknownPositionFinance(allocation)})}>Clear funding assumption</button></div></div>
   <details>
    <summary className="min-h-11 cursor-pointer text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">Add a position · {edit.addition.count} proposed</summary>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">{number('New positions',edit.addition.count,v=>addition('count',v??0),500)}{number('FTE per new position',edit.addition.ftePerPosition,v=>addition('ftePerPosition',v),2,0.1)}{number(`Added-position cash allowance · USD total`,edit.addition.incrementalCashAllowanceUsd,v=>addition('incrementalCashAllowanceUsd',v),100000000,100)}{number('Position available from month',edit.addition.availableFromMonth,v=>addition('availableFromMonth',v),24)}</div>
    <p className="mt-2 text-xs text-muted-foreground">Proposed vacant positions. Staffing is a separate decision.</p>
   </details>
  </fieldset>
  {matches&&result&&<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><dt className="text-xs text-muted-foreground">Cash required</dt><dd className="text-lg font-semibold">{money(result.requiredCashUsd)}</dd></div><div><dt className="text-xs text-muted-foreground">Allowance remaining</dt><dd className="text-lg font-semibold">{money(result.fundingRemainingUsd)}</dd></div><div><dt className="text-xs text-muted-foreground">Added positions</dt><dd className="text-lg font-semibold">{result.proposedAddition.positions}</dd></div><div><dt className="text-xs text-muted-foreground">Added position FTE</dt><dd className="text-lg font-semibold">{result.proposedAddition.positionFte??'Unknown'}</dd></div></dl>}
  {matches&&validation&&<p role="alert" className="text-sm">{validation}</p>}
  <div className="flex flex-wrap gap-2"><button type="button" className={`${button} bg-primary text-primary-foreground`} disabled={disabled||Boolean(validation)||result?.status==='invalid-scenario'} onClick={save}>Save funding comparison</button>{edits[key]&&<><button type="button" className={button} onClick={()=>{setEdits(current=>{const next={...current};delete next[key];return next;});setNotice('Funding edits reset.');setError('');}}>Reset funding edits</button><span className="self-center text-xs">Unsaved funding changes</span></>}</div>
  {records.length>0&&<div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-sm">Saved funding comparison<select className={control} value={selected[key]??String(record?.revision??'')} onChange={e=>setSelected(current=>({...current,[key]:e.target.value}))}>{records.map(row=><option key={row.revision} value={row.revision}>Revision {row.revision} · {labels[row.result.status]}</option>)}</select></label><button type="button" className={button} disabled={disabled} onClick={()=>{const row=records.find(r=>String(r.revision)===(selected[key]??String(record?.revision??'')));if(row)reopen(row);}}>Reopen funding</button></div>}
  {error&&<p role="alert" className="text-sm">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
  {savedCapture&&<PositionModeledDuties key={`duties:${key}:${signature}`} capture={savedCapture} datasetToken={datasetToken} goalId={goalId} allocationLedger={allocationLedger} selectedRevision={dutyRevision} onSelectedRevision={revision=>setDutySelections(old=>({...old,[key]:revision}))} disabled={!matches||!active}/>}
  {savedCapture&&<PositionMarketContext key={`${key}:${signature}`} capture={savedCapture} datasetToken={datasetToken} goalId={goalId} allocationLedger={allocationLedger} selectedRevision={contextRevision} onSelectedRevision={revision=>setContextSelections(old=>({...old,[key]:revision}))} disabled={!matches||!active}/>}
  <PositionScenarioExplanation packet={explanationPacket} active={active}/>
  <details><summary className="min-h-11 cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-ring">Details</summary><div className="space-y-1 text-sm"><p>{edit.finance.reference??'No Finance approval evidence supplied.'}</p><p>Funding applies to {edit.finance.asOf}, this inventory and a {edit.finance.horizonMonths}-month USD cash horizon. Employee time value is separate.</p>{result?.approvalReasons.length?<p>Approval needed: {result.approvalReasons.map(reason=>(approvalLabels[reason]??reason)).join('; ')}.</p>:null}<p>Saved funding comparisons stay with their exact allocation revision.</p></div></details>
 </section>;
}
