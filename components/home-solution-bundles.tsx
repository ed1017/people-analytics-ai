"use client";
import {readBundleWorkspace,bundleWorkspaceField} from "@/lib/home-bundle-records";
import {revealJourneyTarget} from "@/components/workforce-journey-continue";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {HomeBundlePlans,type BundleSession,type BundleDiscussion} from '@/components/home-bundle-plans';
import {actionBinding,actionBindingKey,validActionBinding,type ActionBinding} from '@/lib/home-action-drafts';
import {linkedAttachmentField,resolveAttachedSourceBinding,type PlanningDestination,type ProjectPlanningBinding} from '@/lib/home-linked-attachment';
import {HOME_BUNDLE_REQUEST,bundlePreparationField,readBundlePreparation,createHomeBundlePreparation} from '@/lib/home-bundle-preparation';
import {normalizeHomePack} from '@/lib/home-pack.mjs';
import type {Persona} from '@/lib/types';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const localInputs=(id:string)=>{const fields=decisionStore.getSnapshot().data.workspaces[id]?.fields;return {capacity:fields?.workforceSolution??null,retention:fields?.retentionWhatIfV1??null}};
export function HomeSolutionBundles({openRequest,goalId,goal,pack,projectEvidence,active,ready,busy,pin,persona,goalContext,marketReference,hasPlanningWork,onResume,onDiscuss}:{projectEvidence?:(destination:PlanningDestination)=>unknown;openRequest?:{goalId:string;goal:string;sequence:number}|null;goalId:string;goal:string;pack:unknown;active:boolean;ready:boolean;busy:boolean;pin:{id:string;sequence:number}|null;persona:Persona;goalContext:unknown;marketReference:unknown;hasPlanningWork:boolean;onResume:()=>void;onDiscuss:(request:BundleDiscussion)=>void}){
 const storage=useDecisionStorage(),coordinator=useRef(createHomeBundlePreparation()),consumed=useRef(0),pinContext=useRef<{sequence:number;identity:string}|null>(null),heading=useRef<HTMLHeadingElement>(null);
 const openedRequest=useRef(0);
 useLayoutEffect(()=>{
  if(!openRequest||openedRequest.current===openRequest.sequence)return;
  openedRequest.current=openRequest.sequence;
  const goals=decisionStore.getSnapshot().data.goals;
  if(active&&openRequest.goalId===goalId&&openRequest.goal===goal&&goals.activeId===goalId&&goals.goals.find(item=>item.id===goalId)?.statement===goal)revealJourneyTarget(heading.current);
 },[openRequest,active,goalId,goal]);
 const [bundleCache]=useState(()=>new Map<string,BundleSession>());
 const fields=storage.data.workspaces[goalId]?.fields??{},raw=fields[bundlePreparationField];
 const plans=localInputs(goalId),planningKey=JSON.stringify(plans);
 const linkState=()=>{const current=decisionStore.getSnapshot().data.workspaces[goalId]?.fields;return JSON.stringify([current?.development??null,current?.[linkedAttachmentField]??null]);},linkKey=linkState();
 const project:ProjectPlanningBinding=destination=>actionBinding(goalId,goal,projectEvidence?projectEvidence(destination):pack,{plans:{capacity:destination.workforceSolution,retention:plans.retention},request:{persona,goalContext,marketReference}});
 const packet=normalizeHomePack(pack),identity=JSON.stringify([goalId,goal,packet,plans,persona,goalContext,marketReference,active,ready,linkKey,raw&&typeof raw==='object'&&'preparedAt' in raw?raw.preparedAt:null]);
 const live=useRef(identity);const [bound,setBound]=useState<{identity:string;binding:ActionBinding;sourceRejected:boolean}|null>(null),[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 // Immediately invalidate on store transitions, including a goal switch away and back.
 useEffect(()=>{let prior=JSON.stringify([decisionStore.getSnapshot().data.goals,localInputs(goalId)]);return decisionStore.subscribe(()=>{const next=JSON.stringify([decisionStore.getSnapshot().data.goals,localInputs(goalId)]);if(next!==prior){prior=next;coordinator.current.invalidate();}})},[goalId]);
 useLayoutEffect(()=>{
  live.current=identity;const worker=coordinator.current;worker.invalidate();let cancelled=false;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- New evidence invalidates an in-flight preparation and scope review.
  setPending(false);setNotice('');
  if(goalId&&goal&&active&&ready)void actionBinding(goalId,goal,packet,{plans,request:{persona,goalContext,marketReference}}).then(async physical=>{
   const original=raw&&typeof raw==='object'&&'binding' in raw&&validActionBinding(raw.binding)?raw.binding:null;
   const resolved=original&&projectEvidence?await resolveAttachedSourceBinding(original,physical,fields,project,raw&&typeof raw==='object'&&'preparedAt' in raw&&typeof raw.preparedAt==='string'?raw.preparedAt:undefined):null;
   if(!cancelled)setBound({identity,binding:resolved??physical,sourceRejected:Boolean(original&&projectEvidence&&!resolved)});
  }).catch(()=>{if(!cancelled)setNotice('The current context is too large or unavailable. Your saved work is kept.');});
  return()=>{cancelled=true;worker.invalidate();};
 // The serialized identity includes every input used above.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[identity]);
 const binding=bound?.identity===identity?bound.binding:null,current=binding&&!bound?.sourceRejected?readBundlePreparation(raw,binding,packet):null;
 // Preserve a previous valid proposal for reference only; never treat its snapshot as current.
 const old=raw&&typeof raw==='object'&&'binding' in raw&&raw.binding&&typeof raw.binding==='object'&&'goalId' in raw.binding&&raw.binding.goalId===goalId?readBundlePreparation(raw,raw.binding as ActionBinding,packet):null;
 const draft=current??old,stale=!!draft&&!current;
 const retained=!draft?readBundleWorkspace(storage.data.workspaces[goalId]?.fields[bundleWorkspaceField],goalId):null;
 const currentCheck=(key:string)=>JSON.stringify(localInputs(goalId))===planningKey&&linkState()===linkKey&&live.current===key&&active&&ready&&decisionStore.getSnapshot().saved&&decisionStore.getSnapshot().data.goals.activeId===goalId&&decisionStore.getSnapshot().data.goals.goals.find(item=>item.id===goalId)?.statement===goal;
 async function prepare(mode:'new-pin'|'explicit'){
  if(!binding||busy||!storage.saved||!currentCheck(identity))return;
  setPending(true);setNotice('');
  const outcome=await coordinator.current.run({mode,binding,packet,stored:mode==='explicit'&&(current?.proposal.bundles.length===0||bound?.sourceRejected)?undefined:raw,isCurrent:()=>currentCheck(identity),prepare:async signal=>{
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({page:'home',persona,message:HOME_BUNDLE_REQUEST,history:[],goalContext,marketReference,hasFocusedIssue:true,overviewBriefingContext:packet})});
   let reply;try{reply=await response.json()}catch{return {proposal:null,diagnostic:'client_response'}}
   if(!response.ok)return {proposal:null,diagnostic:reply?.diagnostic??'client_response'};return reply;
  },commit:patch=>{decisionStore.setField(goalId,patch.field,patch.value);if(!decisionStore.getSnapshot().saved)throw Error('Draft could not be saved.');}});
  if(live.current!==identity)return;
  setPending(false);
  if(outcome.status==='ready'||outcome.status==='cached'){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start'});});}
  else setNotice(outcome.status==='failed'?`Action Plan preparation failed. Stage: ${outcome.diagnostic??'client_response'}. Your goal, previous draft and results are kept. No retry runs automatically.`:'The context changed. Your saved work is kept; prepare again explicitly.');
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
 const disabled=busy||pending||!binding||!storage.saved||!active||!ready;
 return <section aria-label="Action Plans for your goal" className="space-y-3 break-words rounded-xl border border-primary/40 p-4 text-sm leading-relaxed">
  <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold">Action Plans for your goal</h2><p>{goal}</p>
  {pending&&<p role="status">Preparing coordinated Action Plans in one response…</p>}
  {!ready&&<p role="status">Checking current evidence. Saved work is kept.</p>}
  {notice&&<p role="alert">{notice}</p>}
  {stale&&<p role="status">Previous Action Plan proposal — goal, evidence or planning inputs changed. Preserved for reference; prepare the current context explicitly.</p>}
  {!draft&&raw&&<p role="status">The saved bundle preparation cannot be verified with current evidence. Its record is kept.</p>}
  {!draft&&retained&&(retained.drafts.length>0||retained.attachments.length>0)&&<section aria-label="Saved Action Plan records" className="space-y-2 rounded border p-3">
   <h3 className="font-semibold">Saved Action Plans — review needed</h3><p>The current proposal cannot be verified. These saved records are kept for reference; prepare the current context before tailoring.</p>
   {retained.drafts.map(item=><details key={JSON.stringify([item.binding,item.bundle.id,item.signature])}><summary className="min-h-11 cursor-pointer py-2">{item.bundle.name} · saved draft revision {item.revision}</summary><p>Original goal: {item.binding.goal}</p><p>{item.bundle.coordination}</p><p className="text-xs">{item.bundle.limitation}</p></details>)}
   {retained.attachments.map(item=><p key={item.id}>{item.draft.bundle.name} · attached revision {item.draft.revision} · {retained.attachments.some(next=>next.supersedes===item.id)?'Previous attached version':'Attached snapshot'}. Snapshot cash: {item.result.cashTotal===null?'Unknown':`$${item.result.cashTotal.toLocaleString()} USD`}. Not a current calculation or operational approval.</p>)}
  </section>}
  {(!current||current.proposal.bundles.length===0)&&<button className={button} disabled={disabled} onClick={()=>void prepare('explicit')}>{!raw||current?.proposal.bundles.length===0?'Create Action Plan':'Prepare Action Plans'}</button>}
  {draft&&<>
   <HomeBundlePlans key={JSON.stringify([actionBindingKey(draft.binding),draft.preparedAt])} proposal={draft.proposal} preparedAt={draft.preparedAt} binding={draft.binding} contextCurrent={!stale} disabled={disabled||stale} isCurrent={()=>!!current&&currentCheck(identity)} cache={bundleCache} onDiscuss={onDiscuss} projectBinding={projectEvidence?project:undefined}/>
   <details><summary className="min-h-11 cursor-pointer py-2">Preparation details</summary>{draft.proposal.question&&<p>{draft.proposal.question}</p>}{draft.proposal.unavailableReason&&<p>{draft.proposal.unavailableReason}</p>}<p>One preparation response. Input tokens: {draft.usage.inputTokens??'Unavailable'}. Output tokens: {draft.usage.outputTokens??'Unavailable'}. Latency: {draft.usage.latencyMs===null?'Unavailable':`${draft.usage.latencyMs} ms`}. Reopening, editing and calculating do not call the model.</p></details>
  </>}
  {hasPlanningWork&&<details><summary className="min-h-11 cursor-pointer py-2">Existing workforce planning work</summary><p>Review saved workforce inputs and calculated options. Changed inputs require an explicit new calculation.</p><button className={button} disabled={busy||pending} onClick={onResume}>Review existing numbers</button></details>}
 </section>;
}
