"use client";
import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {localWorkforceTask} from '@/lib/workforce-search-client';
import {cardPriorities,rankSolutionCards,fullCoverage,cardSourceIdentity,readSolutionPins,unpinSolution,type CardsSnapshot,type CardPriority,type WhatIfPreview,type SolutionPin} from '@/lib/workforce-solution-cards';
import {readWorkforceSolution,solutionResultIsCurrent,type WorkforceSolution} from '@/lib/workforce-solution';
import {workforceReviewEvidence} from '@/lib/workforce-solution-review';
import type {WorkforcePlanField,WorkforcePlanInput} from '@/lib/workforce-increment';
const button='min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50';
const control='mt-1 min-h-11 w-full min-w-0 rounded border bg-background p-2';
const amount=(n:number|null)=>n===null?'Unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
const fields:[WorkforcePlanField,string][]=[['budget','Shared cash budget (USD)'],['maxAddedEmployees','Shared maximum additional employees, including backfills'],['deadlineMonth','Shared coverage deadline (YYYY-MM)'],['annualHireCost','Shared annual cost per hire (USD)'],['hireFee','Shared fee per hire (USD)'],['recruitingStart','Shared recruiting launch (YYYY-MM-DD)'],['arrivalMode','Shared hiring arrival mode'],['arrivalDate','Shared hire arrival (YYYY-MM-DD)'],['loadedHourlyCost','Shared loaded hourly cost (USD/hour)'],['build','Build count'],['move','Move count'],['buy','Buy count'],['backfills','External backfills'],['buildMonth','Build readiness month (YYYY-MM)'],['moveMonth','Move effective month (YYYY-MM)'],['backfillDate','Backfill arrival (YYYY-MM-DD)'],['annualBackfillCost','Annual cost per backfill (USD)'],['backfillFee','Fee per backfill (USD)'],['internalAnnualCostChange','Annual internal cohort uplift (USD)'],['trainingCash','Training cash (USD)'],['trainingHours','Employee training hours']];
type Props={solution:WorkforceSolution;resultId:string;blocked:boolean;onDraftChange:(dirty:boolean)=>void};
export function WorkforceSolutionCards(props:Props){
 const storage=useDecisionStorage(),ws=storage.data.workspaces[props.solution.goalId],goal=storage.data.goals.goals.find(g=>g.id===props.solution.goalId);
 const key=JSON.stringify([cardSourceIdentity(props.solution,props.resultId),ws?.fields.workforceAlternativeReviews,storage.data.goals.activeId,goal?.statement,ws?.fields.workforceInspection,props.blocked]);
 return <Cards key={key} {...props}/>;
}
function Cards({solution,resultId,blocked,onDraftChange}:Props){
 const storage=useDecisionStorage(),workspace=storage.data.workspaces[solution.goalId],history=workspace?.fields.workforceAlternativeReviews??[],rawPins=workspace?.fields.workforceSolutionPins??[],pins=readSolutionPins(rawPins);
 const [snapshot,setSnapshot]=useState<CardsSnapshot|null>(null),[priority,setPriority]=useState<CardPriority>(''),[notice,setNotice]=useState('Verifying saved options locally…'),[invalid,setInvalid]=useState(false);
 const [draft,setDraft]=useState<{cardId:string;input:WorkforcePlanInput}|null>(null),[preview,setPreview]=useState<WhatIfPreview|null>(null),[working,setWorking]=useState(false);
 const operation=useRef<AbortController|null>(null),initial=useRef({source:cardSourceIdentity(solution,resultId),history:JSON.stringify(history),selected:workspace?.fields.workforceInspection,goal:storage.data.goals.goals.find(g=>g.id===solution.goalId)?.statement});
 const cancelOperation=()=>{operation.current?.abort();operation.current=null};
 const context=()=>{
  const state=decisionStore.getSnapshot(),ws=state.data.workspaces[solution.goalId],saved=readWorkforceSolution(ws?.fields.workforceSolution),goal=state.data.goals.goals.find(g=>g.id===solution.goalId);
  if(invalid||blocked||!state.saved||state.data.goals.activeId!==solution.goalId||!saved||!goal||goal.statement!==initial.current.goal||cardSourceIdentity(saved,resultId)!==initial.current.source||JSON.stringify(ws?.fields.workforceAlternativeReviews??[])!==initial.current.history||ws?.fields.workforceInspection!==initial.current.selected)throw Error('Context changed or work is unsaved. Return to a saved calculation before continuing.');
  return {state,ws,saved};
 };
 const invalidate=useEffectEvent(()=>{try{context()}catch{cancelOperation();setPreview(null);setWorking(false);setInvalid(true);setNotice('Context changed; temporary results cannot be saved. Saved history is retained.')}});
 useEffect(()=>{const off=decisionStore.subscribe(()=>invalidate());return()=>{off();cancelOperation();onDraftChange(false)}},[onDraftChange]);
 useEffect(()=>{
  const controller=new AbortController();
  localWorkforceTask<CardsSnapshot>('cards',{solution,resultId,history},controller.signal).then(value=>{if(!controller.signal.aborted){setSnapshot(value);setNotice(value.historyNotice)}}).catch(error=>{if(!controller.signal.aborted)setNotice(error.message)});
  return()=>controller.abort();
  // The wrapper remounts for every source/history transition.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const recalculate=useEffectEvent(async(controller:AbortController)=>{
  if(!draft)return;
  try{const {saved}=context();const value=await localWorkforceTask<WhatIfPreview>('what-if',{solution:saved,resultId,history,cardId:draft.cardId,draft:draft.input,priority},controller.signal);if(controller.signal.aborted)return;context();setPreview(value);setNotice('Temporary local comparison ready. Review changes, then save explicitly.');}
  catch(error){if(!controller.signal.aborted){setPreview(null);setNotice((error as Error).message)}}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 });
 useEffect(()=>{
  if(!draft)return;
  const controller=new AbortController();operation.current=controller;
  const timer=setTimeout(()=>void recalculate(controller),250);
  return()=>{clearTimeout(timer);controller.abort()};
 },[draft,priority]);
 function edit(cardId:string,input:WorkforcePlanInput){cancelOperation();setPreview(null);setDraft({cardId,input});setWorking(true);setNotice('Recalculating temporary inputs locally…');onDraftChange(true)}
 function cancel(){cancelOperation();setDraft(null);setPreview(null);setWorking(false);onDraftChange(false);setNotice('What-if cancelled; saved inputs, results and approvals retained.')}
 async function save(){if(!preview||!draft||working)return;cancelOperation();const controller=new AbortController();operation.current=controller;setWorking(true);
  try{const {saved}=context(),captured=JSON.stringify(saved),newResultId=crypto.randomUUID();
   const next=await localWorkforceTask<WorkforceSolution>('save-what-if',{solution:saved,resultId,history,preview,runId:crypto.randomUUID(),newResultId,at:new Date().toISOString()},controller.signal);
   if(controller.signal.aborted)return;const latest=context();if(JSON.stringify(latest.saved)!==captured)throw Error('Saved solution changed; calculate again before saving.');
   decisionStore.setField(solution.goalId,'workforceSolution',next);
   if(!decisionStore.getSnapshot().saved)throw Error(decisionStore.getSnapshot().notice??'Browser storage did not save; retained working copy needs review.');
   onDraftChange(false);decisionStore.setField(solution.goalId,'workforceInspection',newResultId);
  }catch(error){if(!controller.signal.aborted)setNotice((error as Error).message)}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 }
 async function pin(){if(draft||working)return;const controller=new AbortController();operation.current=controller;setWorking(true);
  try{const {saved,ws}=context(),before=JSON.stringify(ws?.fields.workforceSolutionPins??[]);
   const next=await localWorkforceTask<SolutionPin[]>('pin',{pins:ws?.fields.workforceSolutionPins??[],solution:saved,resultId,id:crypto.randomUUID(),at:new Date().toISOString()},controller.signal);
   if(controller.signal.aborted)return;const latest=context();if(JSON.stringify(latest.ws?.fields.workforceSolutionPins??[])!==before)throw Error('Pins changed; review before saving.');decisionStore.setField(solution.goalId,'workforceSolutionPins',next);setNotice(decisionStore.getSnapshot().saved?'Exact saved calculation pinned. Approval is unchanged.':'Pin remains in this working tab; browser storage did not save.');
  }catch(error){if(!controller.signal.aborted)setNotice((error as Error).message)}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 }
 async function openPin(pin:SolutionPin){if(draft||working)return;const controller=new AbortController();operation.current=controller;setWorking(true);
  try{const {saved}=context();const resolved=await localWorkforceTask<{resultId:string;historical:boolean}|null>('resolve-pin',{pin,solution:saved},controller.signal);if(controller.signal.aborted)return;context();if(!resolved)throw Error('Pinned result unavailable or changed; bookmark retained without repair.');decisionStore.setField(solution.goalId,'workforceInspection',resolved.resultId);setNotice(resolved.historical?'Opened exact historical result.':'Opened exact saved result.');}
  catch(error){if(!controller.signal.aborted)setNotice((error as Error).message)}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 }
 const shown=preview?.cards??snapshot?.cards??[],ranked=rankSolutionCards(shown,priority),evidence=snapshot?workforceReviewEvidence(snapshot.review):null;
 const sourceResult=solution.results.find(r=>r.id===resultId),historical=!sourceResult||sourceResult.version!==solution.versions.at(-1)?.version||!solutionResultIsCurrent(solution,sourceResult)||initial.current.goal!==solution.versions.at(-1)?.inputs.scope.goalStatement;
 return <section aria-label="Workforce solution options" className="min-w-0 space-y-3 text-sm">
  <h4 className="font-semibold">Compare solution options</h4>
  <p>{historical?'Historical saved options — tailoring unavailable.':'Saved options with retained evidence.'} Candidate pools are not assignable capacity. Preference and pins do not record approval.</p>
  <label className="block">Your comparison priority<select aria-label="Your comparison priority" className={control} value={priority} disabled={invalid||blocked} onChange={e=>{cancelOperation();setPreview(null);if(draft)setWorking(true);setPriority(e.target.value as CardPriority)}}><option value="">Choose a priority — neutral options</option>{Object.entries(cardPriorities).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <p>{draft&&!preview?'Temporary inputs are not yet verified. Saved baseline amounts below are not current what-if results.':ranked.message}</p>
  <div className="space-y-3">{ranked.cards.map((card,index)=>{
   const baseline=snapshot?.cards.find(c=>c.id===card.id),plan=card.plan;
   return <article key={card.id} aria-label={card.title} className="min-w-0 space-y-2 rounded-lg border p-3">
    <h5 className="font-semibold">Option {index+1}: {card.title}{(!draft||preview)&&ranked.preferred===card.id?' — Preferred under your selected priority':''}</h5>
    <p>{preview?'Temporary recalculation':'Saved baseline'} · Build {plan.input.build}, Move {plan.input.move}, Buy {plan.input.buy}; backfills {plan.input.backfills||'0'}.</p>
    <p>Incremental cash: USD {amount(plan.totalCash)} · Employee time value: USD {amount(plan.totalTime)} (separate).</p>
    <p>Added employees including backfills: {plan.maxAddedEmployees} · Full conditional coverage: {fullCoverage(plan)??'Unknown / not reached'}.</p>
    {preview&&baseline&&<p>Change from this option&apos;s saved baseline: cash {plan.totalCash===null||baseline.plan.totalCash===null?'Unknown':`USD ${amount(plan.totalCash-baseline.plan.totalCash)}`}; employee time {plan.totalTime===null||baseline.plan.totalTime===null?'Unknown':`USD ${amount(plan.totalTime-baseline.plan.totalTime)}`}; added employees {plan.maxAddedEmployees-baseline.plan.maxAddedEmployees}; coverage {fullCoverage(baseline.plan)??'Unknown'} → {fullCoverage(plan)??'Unknown'}.</p>}
    <ul>{plan.checks.map(check=><li key={check.name}>{check.name}: {check.status}</li>)}</ul>
    <details><summary className="min-h-11 cursor-pointer py-2 font-medium">Justification, evidence and trade-offs</summary>
     <p>No composite score or benefit estimate. Cash excludes employee-time value; earlier conditional coverage is not proven availability. Build/Move require validation of availability, proficiency and backfills.</p>
     <p>Evidence retained as of {evidence?.asOf??'Unknown'}; {evidence?.role}, {evidence?.businessUnit}. Candidate pools and pathways do not prove assignable capacity. Recruiting sample {evidence?.recruiting.sample??'Unknown'}, period {evidence?.recruiting.periodStart??'Unknown'} to {evidence?.recruiting.periodEnd??'Unknown'}; hiring arrival {plan.arrivalDate??'Unknown'} ({plan.arrivalBasis}).</p>
     <p className="break-all">Goal {solution.goalId}; solution {solution.id}; calculation {resultId}; version {sourceResult?.version}; alternative review {card.reviewId??'None'}, slot {card.slot===null?'None':card.slot+1}. {sourceResult?.payload.localWhatIf?'Locally recalculated on retained evidence; not a source refresh.':''}</p>
     <ul className="list-disc pl-5">{[...(snapshot?.review.limitations??[]),...plan.warnings].map((text,i)=><li key={i}>{text}</li>)}</ul>
     <details><summary className="min-h-11 cursor-pointer py-2">Exact assumptions and lineage</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({input:plan.input,evidenceIds:sourceResult?.evidenceIds,origin:sourceResult?.payload.localWhatIf??null,searchOrigin:snapshot?.alternative?.schemaVersion===2?snapshot.alternative.selectionOrigin:null},null,2)}</pre></details>
    </details>
    <button className={button} disabled={blocked||invalid||historical||!!draft||working} onClick={()=>edit(card.id,{...card.input})}>Tailor {card.title.toLowerCase()}</button>
    {card.id==='saved'?<button className={button} disabled={blocked||invalid||!!draft||working||!pins||pins.some(p=>p.resultId===resultId&&p.solutionId===solution.id)} onClick={()=>void pin()}>{pins?.some(p=>p.resultId===resultId&&p.solutionId===solution.id)?'Saved calculation pinned':'Pin saved solution'}</button>:<p className="text-xs">Save revised solution first to pin this option as its own result.</p>}
   </article>;
  })}</div>
  {snapshot?.alternative&&<details><summary className="min-h-11 cursor-pointer py-2">Hiring-only benchmark</summary><p>Incremental cash USD {amount((preview?.benchmark??snapshot.benchmark).plan.totalCash)}; employees {(preview?.benchmark??snapshot.benchmark).plan.maxAddedEmployees}; conditional coverage {fullCoverage((preview?.benchmark??snapshot.benchmark).plan)??'Unknown'}.</p><ul>{(preview?.benchmark??snapshot.benchmark).plan.checks.map(check=><li key={check.name}>{check.name}: {check.status}</li>)}</ul></details>}
  {draft&&<section aria-label="Tailor selected option" className="space-y-3 rounded border p-3">
   <h5 className="font-semibold">Temporary what-if — {snapshot?.cards.find(c=>c.id===draft.cardId)?.title}</h5><p>Role, BU, additional-role demand and horizon stay fixed. Shared fields apply to every compared option. Blank values stay unknown. Counts must sum to the saved role demand.</p>
   <div className="grid min-w-0 gap-3 sm:grid-cols-2">{fields.map(([key,label])=><label key={key} className="min-w-0">{label}{key==='arrivalMode'?<select aria-label={label} className={control} value={draft.input[key]} disabled={invalid||blocked} onChange={e=>edit(draft.cardId,{...draft.input,[key]:e.target.value})}><option value="">Unknown</option><option value="explicit">Explicit arrival</option><option value="historical-median">Historical median assumption</option></select>:<input aria-label={label} className={control} maxLength={100} value={draft.input[key]} disabled={invalid||blocked} onChange={e=>edit(draft.cardId,{...draft.input,[key]:e.target.value})}/>}</label>)}</div>
   <p>Save revised solution first to pin it. Saving appends a version and calculation; original results and approval notes stay with their prior version.</p>
   <div className="flex flex-wrap gap-2"><button className={button} disabled={blocked||invalid||working||!preview||!preview.changedFields.length} onClick={()=>void save()}>Save revised solution to this goal</button><button className={button} onClick={cancel}>Cancel what-if</button></div>
  </section>}
  <p role="status">{working?'Working locally. ':''}{notice}</p>
  <section aria-label="Pinned solutions" className="space-y-2"><h5 className="font-semibold">Pinned solutions for this goal</h5><p className="text-xs">Exact saved results; independent of approval. Up to ten bookmarks. Resolve any temporary edits before opening one.</p>{!pins?<p>Pin history unreadable; original records retained.</p>:!pins.length?<p>No saved solutions pinned.</p>:pins.map(pin=><div key={pin.id} className="flex flex-wrap items-center gap-2 rounded border p-2"><span className="break-all">Version {pin.version} · {pin.resultId} {pin.version!==solution.versions.at(-1)?.version?'(historical)':''}</span><button className={button} disabled={blocked||invalid||!!draft||working} onClick={()=>void openPin(pin)}>Open pinned version {pin.version}</button><button aria-label={`Unpin version ${pin.version}`} className={button} disabled={blocked||invalid||!!draft||working} onClick={()=>{try{const {ws}=context();decisionStore.setField(solution.goalId,'workforceSolutionPins',unpinSolution(ws?.fields.workforceSolutionPins??[],pin.id));setNotice(decisionStore.getSnapshot().saved?'Bookmark removed; saved calculation retained.':'Browser storage did not save the bookmark change.')}catch(error){setNotice((error as Error).message)}}}>Unpin</button></div>)}</section>
 </section>;
}
