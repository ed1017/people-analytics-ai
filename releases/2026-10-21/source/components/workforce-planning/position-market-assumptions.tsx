'use client';
import {useEffect,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {MarketEvidenceBars} from '@/components/market-evidence-bars';
import {marketComparisons,oewsAreas} from '@/lib/oews-reference.mjs';
import {SOFTWARE_TRAINING_REFERENCE} from '@/lib/market-skills-reference';
import type {PositionAllocationDraft} from '@/lib/position-allocation';
import {POSITION_ALLOCATION_LEDGER_FIELD} from '@/lib/position-allocation-store';
import {POSITION_MARKET_FIELD,positionMarketEligibility,preparePositionMarketAdoption,confirmPositionMarketAdoption,readPositionMarketLedger,currentPositionMarketEvidence} from '@/lib/position-market-assumptions';

const control='min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';
const button='min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
const money=(value:number|null|undefined)=>typeof value==='number'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value):'Unavailable';
type Ticket=ReturnType<typeof preparePositionMarketAdoption>;

/** Market inputs enter this planner only through explicit, revision-bound adoption. */
export function PositionMarketAssumptions({draft,datasetToken,goalId,onApplied}:{draft:PositionAllocationDraft;datasetToken:string;goalId:string;onApplied:(draft:PositionAllocationDraft)=>void}){
 const storage=useDecisionStorage(),fields=(goalId?storage.data.workspaces[goalId]:storage.data.exploration)?.fields??{};
 const eligibility=positionMarketEligibility(draft);
 const ledger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 const current=ledger?currentPositionMarketEvidence(ledger,draft):null;
 const [area,setArea]=useState('99'),[statistic,setStatistic]=useState<'median'|'mean'>(current?.statistic??'median'),[oncost,setOncost]=useState(String(current?.employerOncostPercent??0));
 const [mapping,setMapping]=useState(false),[basis,setBasis]=useState(false),[ticket,setTicket]=useState<Ticket|null>(null),[error,setError]=useState('');
 const applying=useRef(false),reviewRef=useRef<HTMLButtonElement>(null),confirmRef=useRef<HTMLButtonElement>(null),appliedTicket=useRef<Ticket|null>(null);
 useEffect(()=>{if(ticket)confirmRef.current?.focus();},[ticket]);
 const comparison=marketComparisons({soc:'15-1252',area});
 const amount=Number(oncost),validOncost=oncost.trim()!==''&&Number.isFinite(amount)&&amount>=0&&amount<=200;
 function cancel(){setTicket(null);setError('');requestAnimationFrame(()=>reviewRef.current?.focus());}
 function review(){if(area!=='99'||!mapping||!basis||!validOncost||!ledger||!storage.ready||!storage.saved)return;try{setTicket(preparePositionMarketAdoption({store:decisionStore,datasetToken,goalId,draft,statistic,employerOncostPercent:amount,mappingConfirmed:true,fullTimeBasisConfirmed:true}));setError('');}catch(e){setError(e instanceof Error?e.message:'Review the market assumption again.');}}
 function apply(){if(!ticket||applying.current||appliedTicket.current===ticket)return;applying.current=true;try{const next=confirmPositionMarketAdoption({store:decisionStore,ticket,at:new Date().toISOString()});appliedTicket.current=ticket;setTicket(null);onApplied(next);}catch(e){setError(e instanceof Error?e.message:'The assumption could not be applied. Review it again.');setTicket(null);}finally{applying.current=false;}}
 if(!eligibility.eligible)return <section aria-label="Market evidence for selected positions" className="rounded-xl border p-3"><h3 className="font-semibold">Market evidence</h3><p className="mt-1 text-sm text-muted-foreground">{eligibility.reason}</p></section>;
 return <section aria-label="Market evidence for selected positions" className="min-w-0 space-y-3 rounded-xl border p-3">
  <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-semibold">Compare hiring pay</h3><span className="text-sm">{eligibility.selectedIds.length} selected {eligibility.role} positions · United States</span></div>
  {current&&<p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold">Market pay assumption applied to this draft: {money(current.annualCostUsd)} per FTE</p>}
  {!ledger&&<p role="alert" className="text-sm text-destructive">Saved market assumptions could not be verified. Restore a supported backup before applying another assumption.</p>}
  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
   {comparison&&<MarketEvidenceBars title="Software developer pay by location" unit="May 2025 · annual USD wages" rows={comparison.locations.filter((row):row is NonNullable<typeof row>=>row!==null).map(row=>({id:row.selected.AREA,label:oewsAreas.find(item=>item.value===row.selected.AREA)?.label??row.selected.AREA,value:statistic==='median'?row.selected.A_MEDIAN:row.selected.A_MEAN,text:money(statistic==='median'?row.selected.A_MEDIAN:row.selected.A_MEAN),selected:row.selected.AREA===area}))} onSelect={value=>{setArea(value);setTicket(null);}}/>}
   <div className="min-w-0 space-y-3">
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Pay statistic<select aria-label="Market pay statistic" className={control} value={statistic} onChange={e=>{setStatistic(e.target.value as 'median'|'mean');setTicket(null);}}><option value="median">Median</option><option value="mean">Mean</option></select></label><label className="text-sm font-semibold">Employer on-cost (%)<input aria-label="Employer on-cost percent" className={control} type="number" min={0} max={200} step={1} value={oncost} onChange={e=>{setOncost(e.target.value);setTicket(null);}}/></label></div>
    {area!=='99'?<p className="text-sm">Choose U.S. to apply pay to these country-level positions. New York remains a location comparison.</p>:<><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={mapping} onChange={e=>{setMapping(e.target.checked);setTicket(null);}}/>Use Software Developers as the role reference</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={basis} onChange={e=>{setBasis(e.target.checked);setTicket(null);}}/>Use annual wages per modeled full-time FTE, plus this on-cost</label></>}
    <p className="text-sm">Current annual hire cost: <strong>{money(draft.input.annualHireCostUsd)} per FTE</strong></p>
    {!ticket?<button ref={reviewRef} type="button" className={button+' bg-primary text-primary-foreground'} disabled={area!=='99'||!mapping||!basis||!validOncost||!ledger||!storage.ready||!storage.saved} onClick={review}>Review pay assumption</button>:<div role="group" aria-label="Confirm market pay assumption" className="space-y-2 rounded-lg border p-3"><p className="text-sm font-semibold">Apply {money(ticket.annualCostUsd)} annual cost per hired FTE?</p><p className="text-sm">{money(ticket.wageUsd)} wages + {ticket.employerOncostPercent}% employer on-cost. Budget, timing and allocation stay as entered.</p><div className="flex flex-wrap gap-2"><button ref={confirmRef} type="button" className={button+' bg-primary text-primary-foreground'} onClick={apply}>Apply to current position draft</button><button type="button" className={button} onClick={cancel}>Cancel</button></div></div>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   </div>
  </div>
  <details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring">Skills and source details</summary><div className="space-y-2 pb-2"><p>Compare this hiring assumption with the repurpose and training routes below. Enter your own training cost and readiness assumptions.</p><p>O*NET lists shared skills between Computer Systems Analysts and Software Developers, including Programming, Systems Analysis and Complex Problem Solving; Technology Design appears in the target skill list. This is an occupation reference, not an assessment of the selected workforce.</p><a className="inline-block min-h-11 py-2 text-primary underline" href={SOFTWARE_TRAINING_REFERENCE.target.url} target="_blank" rel="noreferrer">O*NET Software Developers</a><p>{SOFTWARE_TRAINING_REFERENCE.attribution} <a className="text-primary underline" href={SOFTWARE_TRAINING_REFERENCE.licenseUrl} target="_blank" rel="noreferrer">{SOFTWARE_TRAINING_REFERENCE.license}</a></p>{current&&<p>Adopted {current.statistic} wages {money(current.wageUsd)} + {current.employerOncostPercent}% on-cost on {new Date(current.adoptedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}.</p>}<p>Source: BLS OEWS, May 2025, SOC 15-1252, all industries. Annual wage statistics describe jobs, not employer costs. The selected role mapping, full-time FTE basis and on-cost are planning assumptions. The position register supplies country only; New York state and metro comparisons do not relocate these positions.</p><a className="inline-block min-h-11 py-2 text-primary underline" href={eligibility.reference?.sourceUrl} target="_blank" rel="noreferrer">BLS wage source</a></div></details>
 </section>;
}
