"use client";
import {useEffect,useRef,useState} from "react";
import type {ProblemConversation} from "@/components/problem-conversation";
import {decisionStore} from "@/components/decision-store";
import {createWorkforceSolution,emptySolutionInputs} from "@/lib/workforce-solution";
import {revealJourneyTarget} from "@/components/workforce-journey-continue";

export type HomeCapacityRequest={context:string;goalId:string;goal:string};
const button="min-h-11 rounded border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function HomeCapacityReview({request,context,conversation,onClose,onConfirmed,onRetention}:{request:HomeCapacityRequest;context:string;conversation:ProblemConversation;onClose:()=>void;onConfirmed:(goalId:string,goal:string)=>void;onRetention?:(goalId:string,goal:string)=>void}){
 const root=useRef<HTMLElement>(null);
 const [goal,setGoal]=useState(request.goal),[scope,setScope]=useState(''),[notice,setNotice]=useState(''),[invalidated,setInvalidated]=useState(false);
 const invalid=useRef(false);
 useEffect(()=>{
  revealJourneyTarget(root.current);
  // A switch away and back also invalidates this review, even if React batches it.
  return decisionStore.subscribe(()=>{
   const goals=decisionStore.getSnapshot().data.goals;
   if(goals.activeId!==request.goalId||(request.goalId&&goals.goals.find(g=>g.id===request.goalId)?.statement!==request.goal)){
    invalid.current=true;setInvalidated(true);
   }
  });
 },[request]);
 useEffect(()=>{
  if(context!==request.context){
   invalid.current=true;
   // eslint-disable-next-line react-hooks/set-state-in-effect -- Latch invalidation after an external context transition; returning does not revive approval.
   setInvalidated(true);
  }
 },[context,request.context]);
 const stale=invalidated||context!==request.context;
 const blocked=stale||conversation.loading||!conversation.storageReady||!conversation.saved||Boolean(conversation.issueEditor);
 function confirm(){
  if(blocked||invalid.current||scope!=='additional')return;
  try{
   const snapshot=decisionStore.getSnapshot();
   if(snapshot.data.goals.activeId!==request.goalId)throw Error('The selected goal changed. Reopen the scope review.');
   const id=conversation.confirmWorkforceGoal(goal);
   if(decisionStore.getSnapshot().data.workspaces[id]?.fields.workforceSolution!==undefined)throw Error('A plan already exists for this goal. Your saved plan is retained.');
   const inputs=emptySolutionInputs();inputs.scope={goalStatement:goal.trim(),intent:'additional'};
   decisionStore.setField(id,'workforceSolution',createWorkforceSolution(crypto.randomUUID(),id,inputs,new Date().toISOString()));
   if(!decisionStore.getSnapshot().saved)throw Error('Browser storage could not save. Your working copy is retained; retry saving before calculating.');
   onConfirmed(id,goal.trim());
   requestAnimationFrame(()=>revealJourneyTarget(document.querySelector<HTMLElement>('[data-home-planner-heading]')));
  }catch(error){setNotice((error as Error).message)}
 }
 function confirmRetention(){
  if(blocked||invalid.current||scope!=='retention'||!onRetention)return;
  try{
   if(decisionStore.getSnapshot().data.goals.activeId!==request.goalId)throw Error('The selected goal changed. Reopen the scope review.');
   const id=conversation.confirmWorkforceGoal(goal);
   if(!decisionStore.getSnapshot().saved)throw Error('Browser storage could not save the goal. Your draft is retained.');
   onRetention(id,goal.trim());
  }catch(error){setNotice((error as Error).message)}
 }
 return <section ref={root} tabIndex={-1} aria-label="Review workforce planning scope" className="space-y-3 rounded-lg border border-primary/40 p-4 text-sm">
  <h2 className="text-lg font-semibold">Review the goal and planning scope</h2>
  <p>Compare development, internal moves and external hiring for <strong>additional role capacity in one business unit</strong>. Costs and timing depend on assumptions you review next. This does not estimate retention improvements or replacement-only hiring.</p>
  <label className="block">Goal to carry into the plan<textarea aria-label="Goal to carry into the plan" readOnly={Boolean(request.goalId)} value={goal} onChange={event=>{setGoal(event.target.value);setScope('')}} className="mt-1 min-h-24 w-full rounded border bg-background p-2"/></label>
  {goal.trim().length>240&&<p role="status">Please review a goal of up to 240 characters. Your original text and chat draft are retained; nothing is shortened automatically.</p>}
  <fieldset disabled={blocked} className="space-y-2"><legend className="mb-2 font-medium">Does this goal require additional role capacity?</legend>
   {[
    ['additional','Yes — additional roles, filled through development, moves or hiring'],
    ['retention','No — retain current employees only'],
    ['replacement','No — replace departures only'],
    ['unknown','Not sure yet'],
   ].map(([value,label])=><label key={value} className="flex min-h-11 items-center gap-2"><input type="radio" name="home-capacity-scope" value={value} checked={scope===value} onChange={()=>setScope(value)}/><span>{label}</span></label>)}
  </fieldset>
  {scope==='additional'&&<p>Confirm only the additional-capacity part of your goal. Retention effects remain unknown. Next: choose a role and business unit, fill missing demand, timing and cost assumptions, <strong>Save reviewed inputs</strong>, then <strong>Calculate options</strong>.</p>}
  {((scope==='retention'&&!onRetention)||scope==='replacement')&&<p role="status">This scope is not supported by the additional-capacity calculator. Continue the conversation to investigate evidence and next steps. No workforce plan or calculation has been created.</p>}
  {scope==='retention'&&onRetention&&<p role="status">Retention what-if explores one program using your own expected-exit baseline, effect range, timing and costs. It is conditional arithmetic, not a forecast. Page filters do not supply its population or assumptions.</p>}
  {scope==='unknown'&&<p role="status">Clarify whether you need additional roles before using this calculator. You can continue the conversation; your draft is kept.</p>}
  {stale&&<p role="status">Your goal or context changed. Close and reopen Compare workforce options to review the current context. Your review text is retained here for reference.</p>}
  {notice&&<p role="alert">{notice}</p>}
  <div className="flex flex-wrap gap-2">{scope==='retention'&&onRetention&&<button type="button" className={button} disabled={blocked||!goal.trim()||goal.trim().length>240} onClick={confirmRetention}>Confirm goal and open Retention what-if</button>}{!(scope==='retention'&&onRetention)&&<button type="button" className={button} disabled={blocked||scope!=='additional'||!goal.trim()||goal.trim().length>240} onClick={confirm}>Confirm goal and review inputs</button>}<button type="button" className={button} onClick={onClose}>Return to conversation</button></div>
  <p className="text-xs text-muted-foreground">Confirmation saves this goal and opens local inputs. It does not send to AI or calculate. Your conversation draft is kept.</p>
 </section>;
}
