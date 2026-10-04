"use client";
import {OptionSwitcher} from '@/components/option-switcher';
import type {JourneyTransient} from '@/lib/workforce-journey-state';
import {useEffect,useEffectEvent,useId,useRef,useState} from 'react';
import {WorkforceCalculationBreakdown} from '@/components/workforce-calculation-breakdown';
import {workforceScenarioOutcomes,workforceSearchCountCopy,workforceOptionBullets,workforceOptionsLead} from '@/lib/workforce-scenario-outcomes';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {localWorkforceTask} from '@/lib/workforce-search-client';
import {cardPriorities,rankSolutionCards,fullCoverage,cardSourceIdentity,cardVerificationIdentity,readSolutionPins,unpinSolution,type CardsSnapshot,type CardPriority,type WhatIfPreview,type SolutionPin} from '@/lib/workforce-solution-cards';
import {readWorkforceSolution,solutionResultIsCurrent,type WorkforceSolution} from '@/lib/workforce-solution';
import type {WorkforcePlanField,WorkforcePlanInput} from '@/lib/workforce-increment';
const button='min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50';
const control='mt-1 min-h-11 w-full min-w-0 rounded border bg-background p-2';
const amount=(n:number|null)=>n===null?'Unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
const fields:[WorkforcePlanField,string][]=[['budget','Shared cash budget (USD)'],['maxAddedEmployees','Shared maximum additional employees, including backfills'],['deadlineMonth','Shared coverage deadline (YYYY-MM)'],['annualHireCost','Shared annual cost per hire (USD)'],['hireFee','Shared fee per hire (USD)'],['recruitingStart','Shared recruiting launch (YYYY-MM-DD)'],['arrivalMode','Shared hiring arrival mode'],['arrivalDate','Shared hire arrival (YYYY-MM-DD)'],['loadedHourlyCost','Shared loaded hourly cost (USD/hour)'],['build','Build count'],['move','Move count'],['buy','Buy count'],['backfills','External backfills'],['buildMonth','Build readiness month (YYYY-MM)'],['moveMonth','Move effective month (YYYY-MM)'],['backfillDate','Backfill arrival (YYYY-MM-DD)'],['annualBackfillCost','Annual cost per backfill (USD)'],['backfillFee','Fee per backfill (USD)'],['internalAnnualCostChange','Annual internal cohort uplift (USD)'],['trainingCash','Training cash (USD)'],['trainingHours','Employee training hours']];
function OptionBulletText({bullet}:{bullet:ReturnType<typeof workforceOptionBullets>[number]}){
 const emphasis=[...new Set(bullet.emphasis)].filter(value=>bullet.text.includes(value)).sort((a,b)=>b.length-a.length);
 if(!emphasis.length)return bullet.text;
 const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return bullet.text.split(new RegExp(`(${emphasis.map(escape).join('|')})`,'g')).map((part,index)=>emphasis.includes(part)?<strong key={index}>{part}</strong>:part);
}
type Props={journeyContext?:string;onJourneyChange?:(state:JourneyTransient|undefined)=>void;solution:WorkforceSolution;resultId:string;blocked:boolean;onDraftChange:(dirty:boolean)=>void;onVerified:(identity:string|null)=>void;onReviewScope:()=>void};
export function WorkforceSolutionCards(props:Props){
 const storage=useDecisionStorage(),ws=storage.data.workspaces[props.solution.goalId],goal=storage.data.goals.goals.find(g=>g.id===props.solution.goalId);
 const key=JSON.stringify([cardSourceIdentity(props.solution,props.resultId),ws?.fields.workforceAlternativeReviews,storage.data.goals.activeId,goal?.statement,ws?.fields.workforceInspection,props.blocked]);
 return <Cards key={key} {...props}/>;
}
function Cards({solution,resultId,blocked,onDraftChange,onVerified,onReviewScope,journeyContext,onJourneyChange}:Props){
 const storage=useDecisionStorage(),workspace=storage.data.workspaces[solution.goalId],history=workspace?.fields.workforceAlternativeReviews??[],rawPins=workspace?.fields.workforceSolutionPins??[],pins=readSolutionPins(rawPins);
 const [snapshot,setSnapshot]=useState<CardsSnapshot|null>(null),[priority,setPriority]=useState<CardPriority>(''),[notice,setNotice]=useState('Verifying saved options locally before opening pinned versions…'),[invalid,setInvalid]=useState(false),[restoring,setRestoring]=useState(true);
 const [selectedCardId,setSelectedCardId]=useState('saved'),[compareOpen,setCompareOpen]=useState(false);
 const comparisonId=useId();
 const [draft,setDraft]=useState<{cardId:string;input:WorkforcePlanInput}|null>(null),[preview,setPreview]=useState<WhatIfPreview|null>(null),[working,setWorking]=useState(false);
 useEffect(()=>{onJourneyChange?.(draft&&journeyContext?{context:journeyContext,kind:'tailoring',input:draft.input,preview:preview?.changedFields.length&&!working?'ready':'needed'}:undefined)},[draft,preview,working,journeyContext,onJourneyChange]);
 const editControls=useRef<Partial<Record<WorkforcePlanField,HTMLInputElement|HTMLSelectElement>>>({}),draftTrigger=useRef<HTMLButtonElement|null>(null),[focusRequest,setFocusRequest]=useState<{field:WorkforcePlanField;sequence:number}|null>(null);
 useEffect(()=>{if(focusRequest){const target=editControls.current[focusRequest.field];for(let parent=target?.parentElement;parent;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;editControls.current[focusRequest.field]?.focus();editControls.current[focusRequest.field]?.scrollIntoView({block:'center'})}},[focusRequest]);
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
  localWorkforceTask<CardsSnapshot>('cards',{solution,resultId,history},controller.signal).then(value=>{if(!controller.signal.aborted){setSnapshot(value);setNotice(value.historyNotice);onVerified(cardVerificationIdentity(solution,resultId,history))}}).catch(error=>{if(!controller.signal.aborted)setNotice(error.message)}).finally(()=>{if(!controller.signal.aborted)setRestoring(false)});
  return()=>{controller.abort();onVerified(null)};
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
 function cancel(){cancelOperation();setDraft(null);setPreview(null);setWorking(false);onDraftChange(false);setNotice('What-if cancelled; saved inputs, results and approvals retained.');setTimeout(()=>draftTrigger.current?.focus(),0)}
 async function save(){if(!preview||!draft||working||draft.cardId!==activeCardId)return;cancelOperation();const controller=new AbortController();operation.current=controller;setWorking(true);
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
   const next=await localWorkforceTask<SolutionPin[]>('pin',{pins:ws?.fields.workforceSolutionPins??[],solution:saved,resultId,id:crypto.randomUUID(),at:new Date().toISOString(),history},controller.signal);
   if(controller.signal.aborted)return;const latest=context();if(JSON.stringify(latest.ws?.fields.workforceSolutionPins??[])!==before)throw Error('Pins changed; review before saving.');decisionStore.setField(solution.goalId,'workforceSolutionPins',next);setNotice(decisionStore.getSnapshot().saved?'Exact saved calculation pinned. Approval is unchanged.':'Pin remains in this working tab; browser storage did not save.');
  }catch(error){if(!controller.signal.aborted)setNotice((error as Error).message)}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 }
 async function openPin(pin:SolutionPin){if(restoring||draft||working)return;cancelOperation();const controller=new AbortController();operation.current=controller;setWorking(true);
  try{const {saved}=context();const resolved=await localWorkforceTask<{resultId:string;historical:boolean}|null>('resolve-pin',{pin,solution:saved,history},controller.signal);if(controller.signal.aborted||operation.current!==controller)return;context();if(!resolved)throw Error('Pinned result unavailable or changed; bookmark retained without repair.');decisionStore.setField(solution.goalId,'workforceInspection',resolved.resultId);setNotice(resolved.historical?'Opened exact historical result.':'Opened exact saved result.');}
  catch(error){if(!controller.signal.aborted)setNotice((error as Error).message)}finally{if(operation.current===controller){operation.current=null;setWorking(false)}}
 }
 const shown=preview?.cards??snapshot?.cards??[],ranked=rankSolutionCards(shown,priority);
 const activeCardId=ranked.cards.some(card=>card.id===selectedCardId)?selectedCardId:ranked.cards[0]?.id??'';
 const countCopy=workforceSearchCountCopy(snapshot?.searchSummary??null);
 const optionLead=draft?null:workforceOptionsLead(snapshot?.searchSummary??null,shown.length);
 const sourceResult=solution.results.find(r=>r.id===resultId),historical=!sourceResult||sourceResult.version!==solution.versions.at(-1)?.version||!solutionResultIsCurrent(solution,sourceResult)||storage.data.goals.goals.find(g=>g.id===solution.goalId)?.statement!==solution.versions.at(-1)?.inputs.scope.goalStatement;
 return <section data-journey="verify-result" tabIndex={-1} aria-label="Workforce solution options" className="min-w-0 space-y-3 text-sm">
  <h4 className="font-semibold">{(!draft||preview)&&ranked.preferred?'Recommended option and alternatives':'Suggested options'}</h4>
  {snapshot&&<p>{optionLead??`${shown.length} options to review${draft?' • Temporary what-if':''}`}</p>}
  {!storage.saved&&<p role="alert">This working copy is not saved. The previous durable record remains intact. {storage.notice}</p>}
  {historical&&<p>Historical saved options — tailoring unavailable.</p>}
  <details><summary className="min-h-11 cursor-pointer py-2">Comparison preference</summary><label className="block">Your comparison priority<select data-journey="compare" aria-label="Your comparison priority" className={control} value={priority} disabled={invalid||blocked||!storage.saved} onChange={e=>{cancelOperation();setPreview(null);setWorking(!!draft);setPriority(e.target.value as CardPriority)}}><option value="">Choose a priority — neutral options</option>{Object.entries(cardPriorities).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></details>
  {(draft||priority)&&<p>{draft&&!preview?'Temporary inputs are not yet verified. Saved baseline amounts below are not current what-if results.':ranked.message}</p>}
  <p>Estimates under your assumptions, not forecasts. Save does not approve or execute a plan.</p>
  {ranked.cards.some(card=>card.plan.checks.some(check=>check.status!=='met'))&&<p role="status">Some options have unmet or unknown limits. Check each option’s Why summary before saving.</p>}
  <OptionSwitcher options={ranked.cards} selectedId={activeCardId} onSelect={setSelectedCardId} toolbar={ranked.cards.length>1?<div>
   <button type="button" className={button} aria-expanded={compareOpen} aria-controls={comparisonId} onClick={()=>setCompareOpen(value=>!value)}>Compare options</button>
   {compareOpen&&<div id={comparisonId} role="region" aria-label="Compare calculated options" className="mt-3 overflow-x-auto" tabIndex={0}>
    <table className="w-full min-w-[32rem] text-left text-xs"><caption className="mb-2 text-left">{draft&&!preview?'Saved baseline comparison; temporary edits are not verified.':'Existing calculated options; no new calculation or approval.'} Skills availability and hiring starts remain unverified.</caption><thead><tr><th scope="col" className="p-2">Compare</th>{ranked.cards.map((card,index)=><th scope="col" className="p-2" key={card.id}>Option {index+1}</th>)}</tr></thead><tbody>{['Expected result','Cost','Timing','Staffing','Why'].map(label=><tr key={label}><th scope="row" className="p-2 align-top">{label}</th>{ranked.cards.map(card=><td className="p-2 align-top" key={card.id}>{workforceOptionBullets(card.plan).filter(item=>item.label===label).map(item=><OptionBulletText key={item.label} bullet={item}/>)}</td>)}</tr>)}</tbody></table>
   </div>}
  </div>:undefined}>{(card,index)=>{
   const baseline=snapshot?.cards.find(c=>c.id===card.id),plan=card.plan,outcome=workforceScenarioOutcomes(plan);
   const editBlocked=blocked||invalid||!storage.saved||historical||!!draft&&draft.cardId!==card.id;
   const editField=(field:WorkforcePlanField)=>{if(editBlocked)return;draftTrigger.current=document.activeElement as HTMLButtonElement;if(!draft)edit(card.id,{...card.input});setFocusRequest(before=>({field,sequence:(before?.sequence??0)+1}))};
   return <article key={card.id} aria-label={card.title} className="min-w-0 space-y-2 rounded-lg border p-3">
    <h5 className="font-semibold">Option {index+1}{(!draft||preview)&&ranked.preferred===card.id&&priority?` — Recommended for ${cardPriorities[priority].toLowerCase()}`:''}</h5>
    <ul className="list-disc space-y-1 pl-5">{workforceOptionBullets(plan).map(item=><li key={item.label}><span className="font-medium">{item.label}:</span> <OptionBulletText bullet={item}/></li>)}</ul>
    {preview&&baseline&&<p>Change from this option&apos;s saved baseline: cash {plan.totalCash===null||baseline.plan.totalCash===null?'Unknown':`USD ${amount(plan.totalCash-baseline.plan.totalCash)}`}; employee time {plan.totalTime===null||baseline.plan.totalTime===null?'Unknown':`USD ${amount(plan.totalTime-baseline.plan.totalTime)}`}; added employees {plan.maxAddedEmployees-baseline.plan.maxAddedEmployees}; coverage {fullCoverage(baseline.plan)??'Unknown'} → {fullCoverage(plan)??'Unknown'}.</p>}
    {preview&&baseline&&<p>Deadline coverage: {baseline.plan.input.deadlineMonth||'Unspecified'}: {amount(workforceScenarioOutcomes(baseline.plan).covered)} of {outcome.roles} → {outcome.deadline??'Unspecified'}: {amount(outcome.covered)} of {outcome.roles}.</p>}
    <button aria-label={`Adjust ${card.title.toLowerCase()}`} className={`${button} bg-primary text-primary-foreground`} disabled={blocked||invalid||!storage.saved||historical||!!draft||working} onClick={event=>{draftTrigger.current=event.currentTarget;edit(card.id,{...card.input});setFocusRequest(before=>({field:'budget',sequence:(before?.sequence??0)+1}))}}>Adjust this option</button>
    {card.id==='saved'?<button aria-label={pins?.some(p=>p.resultId===resultId&&p.solutionId===solution.id)?'Saved calculation pinned':'Pin saved solution'} className={button} disabled={blocked||invalid||!storage.saved||!!draft||working||!pins||pins.some(p=>p.resultId===resultId&&p.solutionId===solution.id)} onClick={()=>void pin()}>{pins?.some(p=>p.resultId===resultId&&p.solutionId===solution.id)?'Saved':'Save'}</button>:<button aria-label={`Review and save ${card.title.toLowerCase()}`} className={button} disabled={blocked||invalid||!storage.saved||historical||!!draft||working} onClick={event=>{draftTrigger.current=event.currentTarget;edit(card.id,{...card.input});setFocusRequest(before=>({field:'budget',sequence:(before?.sequence??0)+1}))}}>Save</button>}
    <details><summary className="min-h-11 cursor-pointer py-2 font-medium">Details</summary>
     <p>{preview?'Temporary recalculation':'Saved baseline'} · {card.title}: Build {plan.input.build}, Move {plan.input.move}, Buy {plan.input.buy}; backfills {plan.input.backfills||'0'}.</p>
     <ul>{plan.checks.map(check=><li key={check.name}>{check.name}: {check.status}</li>)}</ul>
     {snapshot&&<WorkforceCalculationBreakdown plan={plan} review={snapshot.review} editsDisabled={editBlocked} scopeDisabled={editBlocked||!!draft||working} onEdit={editField} onReviewScope={onReviewScope}/>}
     <p className="break-all">Goal {solution.goalId}; solution {solution.id}; calculation {resultId}; version {sourceResult?.version}; alternative review {card.reviewId??'None'}, slot {card.slot===null?'None':card.slot+1}. {sourceResult?.payload.localWhatIf?'Locally recalculated on retained evidence; not a source refresh.':''}</p>
     <ul className="list-disc pl-5">{[...(snapshot?.review.limitations??[]),...plan.warnings].map((text,i)=><li key={i}>{text}</li>)}</ul>
     <details><summary className="min-h-11 cursor-pointer py-2">Exact assumptions and lineage</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({input:plan.input,evidenceIds:sourceResult?.evidenceIds,origin:sourceResult?.payload.localWhatIf??null,searchOrigin:snapshot?.alternative?.schemaVersion===2?snapshot.alternative.selectionOrigin:null},null,2)}</pre></details>
    </details>

   </article>;
  }}</OptionSwitcher>
  {snapshot?.searchSummary&&<div className="text-sm text-foreground"><details><summary className="min-h-11 cursor-pointer py-2">Search methodology and count</summary>{!draft&&countCopy.headline&&<p>{countCopy.headline}</p>}<p>{countCopy.detail}</p><p>Counts describe the original saved search before any later edits. Saved alternatives may have been customized after selection; a what-if does not rerun these bounds.</p></details></div>}
  {snapshot?.alternative&&<details><summary className="min-h-11 cursor-pointer py-2">Hiring-only benchmark</summary><p>Incremental cash USD {amount((preview?.benchmark??snapshot.benchmark).plan.totalCash)}; employees {(preview?.benchmark??snapshot.benchmark).plan.maxAddedEmployees}; conditional coverage {fullCoverage((preview?.benchmark??snapshot.benchmark).plan)??'Unknown'}.</p><ul>{(preview?.benchmark??snapshot.benchmark).plan.checks.map(check=><li key={check.name}>{check.name}: {check.status}</li>)}</ul></details>}
  {draft&&<section data-journey="preview-tailoring" tabIndex={-1} aria-label="Tailor selected option" className="space-y-3 rounded border p-3">
   <h5 className="font-semibold">Adjusting Option {ranked.cards.findIndex(card=>card.id===draft.cardId)+1}</h5><p>Role, BU, additional-role demand and horizon stay fixed. Shared fields apply to every compared option. Blank values stay unknown. Counts must sum to the saved role demand.</p>
   <div className="grid min-w-0 gap-3 sm:grid-cols-2">{fields.filter(([key])=>['budget','deadlineMonth','build','move','buy','backfills'].includes(key)).map(([key,label])=><label key={key} className="min-w-0">{label}{key==='arrivalMode'?<select data-journey-field={key} ref={node=>{if(node)editControls.current[key]=node;else delete editControls.current[key]}} aria-label={label} className={control} value={draft.input[key]} disabled={invalid||blocked||!storage.saved} onChange={e=>edit(draft.cardId,{...draft.input,[key]:e.target.value})}><option value="">Unknown</option><option value="explicit">Explicit arrival</option><option value="historical-median">Historical median assumption</option></select>:<input data-journey-field={key} ref={node=>{if(node)editControls.current[key]=node;else delete editControls.current[key]}} aria-label={label} className={control} maxLength={100} value={draft.input[key]} disabled={invalid||blocked||!storage.saved} onChange={e=>edit(draft.cardId,{...draft.input,[key]:e.target.value})}/>}</label>)}</div>
   <details><summary className="min-h-11 cursor-pointer py-2">Advanced assumptions</summary>   <div className="grid min-w-0 gap-3 sm:grid-cols-2">{fields.filter(([key])=>!['budget','deadlineMonth','build','move','buy','backfills'].includes(key)).map(([key,label])=><label key={key} className="min-w-0">{label}{key==='arrivalMode'?<select data-journey-field={key} ref={node=>{if(node)editControls.current[key]=node;else delete editControls.current[key]}} aria-label={label} className={control} value={draft.input[key]} disabled={invalid||blocked||!storage.saved} onChange={e=>edit(draft.cardId,{...draft.input,[key]:e.target.value})}><option value="">Unknown</option><option value="explicit">Explicit arrival</option><option value="historical-median">Historical median assumption</option></select>:<input data-journey-field={key} ref={node=>{if(node)editControls.current[key]=node;else delete editControls.current[key]}} aria-label={label} className={control} maxLength={100} value={draft.input[key]} disabled={invalid||blocked||!storage.saved} onChange={e=>edit(draft.cardId,{...draft.input,[key]:e.target.value})}/>}</label>)}</div></details>
   {activeCardId!==draft.cardId&&<p role="status">Your adjustments belong to Option {ranked.cards.findIndex(card=>card.id===draft.cardId)+1}. Return to that option to save, or cancel these adjustments.</p>}
   <p>Save revised solution first to pin it. Saving appends a version and calculation; original results and approval notes stay with their prior version.</p>
   <div className="flex flex-wrap gap-2"><button data-journey="save-solution" className={`${button} bg-primary text-primary-foreground`} disabled={blocked||invalid||!storage.saved||working||!preview||!preview.changedFields.length||activeCardId!==draft.cardId} onClick={()=>void save()} aria-label="Save revised solution to this goal">Save</button><button className={button} onClick={cancel} aria-label="Cancel what-if">Cancel</button></div>
  </section>}
  <p role="status">{working?'Working locally. ':''}{notice}</p>
  <details><summary className="min-h-11 cursor-pointer py-2">Saved pins</summary><section aria-label="Pinned solutions" className="space-y-2"><h5 className="font-semibold">Pinned solutions for this goal</h5><p className="text-xs">Exact saved results; independent of approval. Up to ten bookmarks. Resolve any temporary edits before opening one.</p>{!pins?<p>Pin history unreadable; original records retained.</p>:!pins.length?<p>No saved solutions pinned.</p>:pins.map(pin=><div key={pin.id} className="flex flex-wrap items-center gap-2 rounded border p-2"><span className="break-all">Version {pin.version} · {pin.resultId} {!solution.results.some(r=>r.id===pin.resultId&&r.version===pin.version)||pin.solutionId!==solution.id?'(unavailable reference)':pin.version!==solution.versions.at(-1)?.version||storage.data.goals.goals.find(g=>g.id===solution.goalId)?.statement!==solution.versions.at(-1)?.inputs.scope.goalStatement?'(historical)':''}</span><button className={button} disabled={restoring||blocked||invalid||!storage.saved||!!draft||working} onClick={()=>void openPin(pin)}>Open pinned version {pin.version}</button><button aria-label={`Unpin version ${pin.version}`} className={button} disabled={blocked||invalid||!storage.saved||!!draft||working} onClick={()=>{try{const {ws}=context();decisionStore.setField(solution.goalId,'workforceSolutionPins',unpinSolution(ws?.fields.workforceSolutionPins??[],pin.id));setNotice(decisionStore.getSnapshot().saved?'Bookmark removed; saved calculation retained.':'Browser storage did not save the bookmark change.')}catch(error){setNotice((error as Error).message)}}}>Unpin</button></div>)}</section></details>
 </section>;
}
