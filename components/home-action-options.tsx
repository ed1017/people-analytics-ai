"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {HomeActionAssumptions} from '@/components/home-action-assumptions';
import type {ActionScenario} from '@/lib/home-action-scenarios';
import {actionBinding,actionBindingKey,actionSignature,homeActionDraftField,readActionDraft,type ActionBinding} from '@/lib/home-action-drafts';
import {actionEvidenceCatalog,HOME_ACTION_REQUEST,proposedActionPresentation} from '@/lib/home-action-proposal';
import {createHomeActionPreparation} from '@/lib/home-action-preparation';
import {normalizeHomePack} from '@/lib/home-pack.mjs';
import type {Persona} from '@/lib/types';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const localInputs=(id:string)=>{const fields=decisionStore.getSnapshot().data.workspaces[id]?.fields;return {capacity:fields?.workforceSolution??null,retention:fields?.retentionWhatIfV1??null}};
export function HomeActionOptions({goalId,goal,pack,active,ready,busy,pin,persona,goalContext,marketReference,hasPlanningWork,onResume}:{goalId:string;goal:string;pack:unknown;active:boolean;ready:boolean;busy:boolean;pin:{id:string;sequence:number}|null;persona:Persona;goalContext:unknown;marketReference:unknown;hasPlanningWork:boolean;onResume:()=>void}){
 const storage=useDecisionStorage(),coordinator=useRef(createHomeActionPreparation()),consumed=useRef(0),pinContext=useRef<{sequence:number;identity:string}|null>(null),heading=useRef<HTMLHeadingElement>(null);
 const [scenarioCache]=useState(()=>new Map<string,ActionScenario>());
 const raw=storage.data.workspaces[goalId]?.fields[homeActionDraftField];
 const plans=localInputs(goalId),planningKey=JSON.stringify(plans);
 const packet=normalizeHomePack(pack),identity=JSON.stringify([goalId,goal,packet,plans,persona,goalContext,marketReference,active,ready]);
 const live=useRef(identity);const [bound,setBound]=useState<{identity:string;binding:ActionBinding}|null>(null),[pending,setPending]=useState(false),[notice,setNotice]=useState(''),[selected,setSelected]=useState(0);
 // Immediately invalidate on store transitions, including a goal switch away and back.
 useEffect(()=>{let prior=JSON.stringify([decisionStore.getSnapshot().data.goals,localInputs(goalId)]);return decisionStore.subscribe(()=>{const next=JSON.stringify([decisionStore.getSnapshot().data.goals,localInputs(goalId)]);if(next!==prior){prior=next;coordinator.current.invalidate();}})},[goalId]);
 useLayoutEffect(()=>{
  live.current=identity;const worker=coordinator.current;worker.invalidate();let cancelled=false;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- New evidence invalidates an in-flight preparation and scope review.
  setPending(false);setNotice('');
  if(goalId&&goal&&active&&ready)void actionBinding(goalId,goal,packet,{plans,request:{persona,goalContext,marketReference}}).then(binding=>{if(!cancelled)setBound({identity,binding})}).catch(()=>{if(!cancelled)setNotice('The current context is too large or unavailable. Your saved work is kept.');});
  return()=>{cancelled=true;worker.invalidate();};
 // The serialized identity includes every input used above.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[identity]);
 const binding=bound?.identity===identity?bound.binding:null,current=binding?readActionDraft(raw,binding,packet):null;
 // Preserve a previous valid proposal for reference only; never treat its snapshot as current.
 const old=raw&&typeof raw==='object'&&'binding' in raw?readActionDraft(raw,raw.binding as ActionBinding,packet):null;
 const draft=current??old,stale=!!draft&&!current;
 const currentCheck=(key:string)=>JSON.stringify(localInputs(goalId))===planningKey&&live.current===key&&active&&ready&&decisionStore.getSnapshot().saved&&decisionStore.getSnapshot().data.goals.activeId===goalId&&decisionStore.getSnapshot().data.goals.goals.find(item=>item.id===goalId)?.statement===goal;
 async function prepare(mode:'new-pin'|'explicit'){
  if(!binding||busy||!storage.saved||!currentCheck(identity))return;
  setPending(true);setNotice('');
  const outcome=await coordinator.current.run({mode,binding,packet,stored:raw,isCurrent:()=>currentCheck(identity),prepare:async signal=>{
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({page:'home',persona,message:HOME_ACTION_REQUEST,history:[],goalContext,marketReference,hasFocusedIssue:true,overviewBriefingContext:packet})});
   if(!response.ok)throw Error('Action preparation unavailable.');return await response.json();
  },commit:patch=>{decisionStore.setField(goalId,patch.field,patch.value);if(!decisionStore.getSnapshot().saved)throw Error('Draft could not be saved.');}});
  if(live.current!==identity)return;
  setPending(false);
  if(outcome.status==='ready'||outcome.status==='cached'){setSelected(0);requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start'});});}
  else setNotice(outcome.status==='failed'?'Action preparation failed. Your goal, previous draft and results are kept. No retry runs automatically.':'The context changed. Your saved work is kept; prepare again explicitly.');
 }
 useEffect(()=>{
  if(pin?.id!==goalId||pin.sequence===consumed.current)return;
  if(pinContext.current?.sequence!==pin.sequence)pinContext.current={sequence:pin.sequence,identity};
  if(pinContext.current.identity!==identity||!active||!ready){consumed.current=pin.sequence;return;}
  // eslint-disable-next-line react-hooks/set-state-in-effect -- A newly received explicit Pin event starts its one coordinated external request.
  if(binding&&!busy&&storage.saved){consumed.current=pin.sequence;void prepare('new-pin');}
 // Only a fresh user Pin authorizes this call; reload and toggles never do.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[pin,goalId,binding,busy,active,ready,storage.saved,identity]);
 if(!goalId||!goal)return null;
 const action=draft?.proposal.actions[Math.min(selected,Math.max(0,draft.proposal.actions.length-1))],presentation=action?proposedActionPresentation(action):null;
 const disabled=busy||pending||!binding||!storage.saved||!active||!ready;
 return <section aria-label="Action options for your goal" className="space-y-3 break-words rounded-xl border border-primary/40 p-4 text-sm leading-relaxed">
  <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold">Action options for your goal</h2><p>{goal}</p>
  {pending&&<p role="status">Preparing action pilots from the current evidence…</p>}
  {!ready&&<p role="status">Checking current evidence. Saved work is kept.</p>}
  {notice&&<p role="alert">{notice}</p>}
  {stale&&<p role="status">Previous proposal — goal, evidence or planning inputs changed. Kept for reference; review a newly prepared proposal before using it.</p>}
  {!draft&&raw&&<p role="status">The previous draft cannot be verified with current evidence. Its saved record is kept.</p>}
  {(!current||!current.proposal.actions.length)&&<button className={button} disabled={disabled} onClick={()=>void prepare('explicit')}>Prepare action options</button>}
  {draft&&<><p className="font-medium">AI-proposed pilots — not validated</p><p className="text-muted-foreground">Proposals need review. References do not prove causes or effectiveness. Numerical results need assumptions reviewed for this exact action and a supported calculation.</p>
   {draft.proposal.actions.length>1&&<div role="tablist" aria-label="Action options" className="flex flex-wrap gap-2">{draft.proposal.actions.map((item,index)=><button key={index} role="tab" aria-selected={item===action} className={`${button} ${item===action?'bg-primary text-primary-foreground':''}`} onClick={()=>setSelected(index)}>Option {index+1}</button>)}</div>}
   {action&&presentation&&<article className="space-y-3 border-t pt-3"><h3 className="text-base font-semibold">{action.name}</h3><p><strong>First step:</strong> {action.firstStep}</p><HomeActionAssumptions key={actionBindingKey(draft.binding)+actionSignature(action)} action={action} binding={draft.binding} disabled={disabled||stale} contextCurrent={!stale} isCurrent={()=>!!current&&currentCheck(identity)} cache={scenarioCache}/><p><strong>Limitation:</strong> {action.limitation}</p>
    <details><summary className="min-h-11 cursor-pointer py-2">Evidence and limitations</summary>{action.evidence.map(id=>{const ref=stale?undefined:actionEvidenceCatalog(packet).find(item=>item.id===id),source=packet.sources.find(item=>item.id===ref?.sourceId);return <div key={id} className="mb-3"><p>[{id}] {source?.label} · {ref?.location}</p><p>{stale?'Original snapshot is no longer current; provenance must be rechecked.':`${ref?.scope} · ${ref?.date??'Date not supplied'}`}</p><p>{ref?.limitation}</p><p>Observed context only; this reference does not validate the proposed action.</p></div>})}</details>
   </article>}
   {!draft.proposal.actions.length&&<p>{draft.proposal.unavailableReason}</p>}
   <details><summary className="min-h-11 cursor-pointer py-2">Preparation details</summary>{draft.proposal.question&&<p>Preparation clarification: {draft.proposal.question}</p>}<p>One preparation response. Input tokens: {draft.usage.inputTokens??'Unavailable'}. Output tokens: {draft.usage.outputTokens??'Unavailable'}. Latency: {draft.usage.latencyMs===null?'Unavailable':`${draft.usage.latencyMs} ms`}. Saved locally; no content logs.</p></details>
  </>}
  {hasPlanningWork&&<details><summary className="min-h-11 cursor-pointer py-2">Compare workforce numbers</summary><p>Continue your existing planning work. Its assumptions and results remain separate from these proposed actions.</p><button className={button} disabled={busy||pending} onClick={onResume}>Review numbers</button></details>}
 </section>;
}
