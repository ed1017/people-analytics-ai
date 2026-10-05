"use client";
import {useEffect,useEffectEvent,useRef,useState} from "react";
import {decisionStore} from "@/components/decision-store";
import {preflightWorkforceMixes,workforceMixSearchLimits,type WorkforceMixSearch,type WorkforceMixSearchSpec} from "@/lib/workforce-mix-search-core";
import {localWorkforceTask} from "@/lib/workforce-search-client";
import type {WorkforceSelectionContext} from "@/lib/workforce-mix-selection-core";
import type {WorkforceSelectionOffer} from "@/components/workforce-selection-handoff";
const paths=["build","move","buy"] as const;
const button="min-h-10 rounded border px-3 py-2 text-sm disabled:opacity-50";
const money=(value:number|null)=>value===null?"Unknown":new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
const verify:WorkforceSelectionOffer['verify']=(context,snapshot,ids,signal)=>localWorkforceTask("select",{context,snapshot,ids},signal??new AbortController().signal);
export function WorkforceLocalSearch({currentContext,roles,savedMix,onOffer}:{currentContext:()=>WorkforceSelectionContext;roles:number;savedMix:Record<typeof paths[number],string>;onOffer:(offer:WorkforceSelectionOffer|undefined)=>void}){
 const [bounds,setBounds]=useState<Record<string,string>>({buildMin:'',buildMax:'',moveMin:'',moveMax:'',buyMin:'',buyMax:''});
 const [confirmed,setConfirmed]=useState(false),[report,setReport]=useState<WorkforceMixSearch|null>(null),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const pending=useRef<AbortController|null>(null),generation=useRef(0),captured=useRef('');
 const contextIdentity=()=>JSON.stringify({...currentContext(),expectedSearchFingerprint:''});
 const invalidate=()=>{generation.current++;pending.current?.abort();pending.current=null;setBusy(false);setReport(null);setSelected([]);onOffer(undefined)};
 const sourceChanged=useEffectEvent(()=>{try{if(captured.current&&captured.current!==contextIdentity())invalidate()}catch{invalidate()}});
 useEffect(()=>{const off=decisionStore.subscribe(()=>sourceChanged());return()=>{off();pending.current?.abort()}},[]);
 let preflight:ReturnType<typeof preflightWorkforceMixes>|null=null,problem='';
 try{
  if(!Object.values(bounds).every(value=>/^\d+$/.test(value)))throw Error('Enter all six bounds as nonnegative whole numbers.');
  const spec={...Object.fromEntries(paths.map(path=>[path,{min:Number(bounds[path+'Min']),max:Number(bounds[path+'Max'])}])),maxEvaluations:workforceMixSearchLimits.maxEvaluations,maxResults:workforceMixSearchLimits.maxResults,resultFilter:'all',assumptionPolicy:'preserve-reviewed-path-totals-and-timing'} as WorkforceMixSearchSpec;
  preflight=preflightWorkforceMixes(roles,spec);
  if(!preflight.enumerated)problem='These bounds contain no mix that sums to the saved role requirement.';
  else if(!preflight.withinBudget)problem='Too many combinations; narrow the bounds before running.';
 }catch(error){problem=(error as Error).message}
 async function run(){
  if(!preflight||problem||!confirmed)return;
  invalidate();const controller=new AbortController();pending.current=controller;const ticket=generation.current;setBusy(true);setNotice('');
  try{
   const context=currentContext();captured.current=contextIdentity();
   const result=await localWorkforceTask<WorkforceMixSearch>('search',{context,spec:preflight.spec},controller.signal);
   if(ticket!==generation.current||controller.signal.aborted||captured.current!==contextIdentity())return;
   setReport(result);
  }catch(error){if(ticket===generation.current&&!controller.signal.aborted)setNotice((error as Error).message)}
  finally{if(ticket===generation.current){setBusy(false);pending.current=null}}
 }
 return <section aria-label="Bounded local scenario search" className="space-y-3 rounded border p-3">
  <h4 className="font-semibold">Compare bounded Build, Move and Buy mixes</h4>
  <p>Enter planning assumptions for {roles} additional roles. Candidate pools are not assignable capacity. Each mix must sum to {roles}; internal Build/Move do not create new company employees.</p>
  <p>Only counts vary. Saved dates, rates, backfills, total salary uplift and training cash/hours stay fixed, not scaled per person. Inactive-path costs follow the existing calculator’s zero-cost rule; saved cost fields are not rewritten. Results are conditional comparisons, never an approved or universally best plan.</p>
  <button className={button} onClick={()=>{invalidate();setConfirmed(false);setBounds(Object.fromEntries(paths.flatMap(path=>[[path+'Min',String(Number(savedMix[path]))],[path+'Max',String(Number(savedMix[path]))]])));setNotice('Bounds copied from the saved mix, not capacity evidence. Widen only if intended, then confirm.')}}>Use saved mix as exact bounds</button>
  <div className="grid gap-3 sm:grid-cols-3">{paths.map(path=><fieldset key={path} className="min-w-0 rounded border p-2"><legend>{path==='buy'?'Buy (external hires)':path==='build'?'Build':'Move'}</legend>{['Min','Max'].map(edge=><label className="block" key={edge}>{edge==='Min'?'Minimum':'Maximum'}<input aria-label={`${path} ${edge.toLowerCase()} bound`} inputMode="numeric" maxLength={4} className="mt-1 min-h-10 w-full min-w-0 rounded border bg-background p-2" value={bounds[path+edge]} onChange={event=>{invalidate();setConfirmed(false);setNotice('');setBounds(before=>({...before,[path+edge]:event.target.value}))}}/></label>)}</fieldset>)}</div>
  <p role="status">{preflight?`Planned enumeration: ${preflight.enumerated.toLocaleString()} combinations; ${preflight.calculatorInvocations.toLocaleString()} evaluations including the reference. `:''}Preflight counts only; executed results appear below after running. Technical cap: 1,000 evaluations; at most 64 results shown. {problem}</p>
  <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={event=>{invalidate();setConfirmed(event.target.checked)}}/>I confirm these bounds and the unchanged cost/timing assumptions for this comparison.</label>
  <div className="flex flex-wrap gap-2"><button className={button} disabled={busy||!confirmed||!!problem} onClick={()=>void run()}>Run local mix search</button>{busy&&<button className={button} onClick={()=>{invalidate();setNotice('Local search cancelled; saved plans are unchanged.')}}>Cancel local search</button>}</div>
  {busy&&<p role="status">Comparing saved assumptions locally…</p>}{notice&&<p role="status">{notice}</p>}
  {report&&<>
   <p>{report.summary.enumerated} mixes evaluated; {report.summary.counts.met} meet entered constraints. Showing {report.summary.emitted}; {report.summary.omittedByCap} omitted by the output cap. Ascending Build/Move order, not a quality ranking. {report.summary.calculatorInvocations} calculator calls including the reference; {report.summary.counts.invalid} invalid candidates; {report.summary.counts['not-met']} fail entered constraints; {report.summary.counts.unknown} have unresolved constraints. {report.summary.enumerationComplete?'Complete within the confirmed bounds.':'Incomplete search.'}</p>
   {!report.results.some(candidate=>!candidate.isSavedMix&&candidate.mix.build+candidate.mix.move>0&&candidate.status==='met'&&candidate.tradeOffs&&Object.values(candidate.tradeOffs).every(value=>value!==null))&&<p role="status">No selectable additional options in these returned results. Review Build, Move and Buy bounds, or review the saved budget, employee cap, deadline and readiness assumptions before a new calculation. Widening bounds does not guarantee a feasible option.</p>}
   <p>Compare cash, separate employee-time value, added employees and conditional coverage month. Nondominated means no other eligible mix within these bounds improves one of those measures without worsening another; it does not prove capacity or a best choice. Choose at most two, then review below.</p>
   <div className="grid gap-3 lg:grid-cols-2">{report.results.map(candidate=>{
    const eligible=!candidate.isSavedMix&&candidate.mix.build+candidate.mix.move>0&&candidate.status==='met'&&candidate.tradeOffs&&Object.values(candidate.tradeOffs).every(value=>value!==null);
    return <article key={candidate.id} className="min-w-0 space-y-1 rounded border p-2"><label className="flex gap-2"><input type="checkbox" aria-label={`Select ${candidate.id}`} checked={selected.includes(candidate.id)} disabled={!eligible||selected.length===2&&!selected.includes(candidate.id)} onChange={event=>{const ids=event.target.checked?[...selected,candidate.id]:selected.filter(id=>id!==candidate.id);setSelected(ids);onOffer(ids.length?{snapshot:report,selectedIds:ids,verify}:undefined)}}/>Build {candidate.mix.build}, Move {candidate.mix.move}, Buy {candidate.mix.buy}</label>
     <p>{candidate.status}{candidate.isSavedMix?' · saved mix':''}{candidate.mix.build+candidate.mix.move===0?' · hiring-only core option':''}; {candidate.tradeOffStatus.replaceAll('-',' ')}.</p>
     {candidate.tradeOffs&&<p>Cash {money(candidate.tradeOffs.incrementalCash)}; employee time {money(candidate.tradeOffs.employeeTimeValue)}; added employees {candidate.tradeOffs.addedEmployees}; coverage {candidate.tradeOffs.fullCoverageMonth??'Unknown'}.</p>}{candidate.reason&&<p>{candidate.reason}</p>}
    </article>;
   })}</div>
  </>}
 </section>;
}
