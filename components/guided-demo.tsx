"use client";
import {useLayoutEffect,useRef,useState} from 'react';
import {HomeGuidedFlow} from '@/lib/home-guided-flow';
import {decisionStore} from '@/components/decision-store';
import type {GuidedActionRegistry} from '@/components/home-guided-actions';
import {GUIDED_EXAMPLE_PROMPT} from '@/lib/home-decision-journey';
export {GUIDED_EXAMPLE_PROMPT} from '@/lib/home-decision-journey';
const steps=[
 ['Send the example question','Submit this question in a separate example conversation. Your current conversation and draft are kept.','send example prompt','Sending example prompt…'],
 ['Pin the demo goal','Save this fictional example as its own goal. Your existing goals and plans stay separate.','pin demo goal','Pinning demo goal…'],
 ['Select the saved goal','Open the demo goal you just pinned. Selecting a saved goal does not run another model request.','select demo goal','Selecting demo goal…'],
 ['Prepare Action Plans','Request plan choices for this demo goal using the normal Action Plan preparation. Costs and staffing remain planning assumptions.','prepare example plans','Preparing example plans…'],
 ['Select an example plan','Select Action Plan #1 and open its approach, proposed owners, budget, timeline and assumptions for review.','select example plan','Selecting example plan…'],
 ['Attach the example plan','Attach the selected version to this demo goal. Earlier attachments are preserved; this does not approve or implement the plan.','attach example plan','Attaching example plan…'],
] as const;
export type GuidedDemoActions={ready:boolean;begin:(id:string)=>void;send:()=>Promise<void>;pin:(id:string)=>void;select:(id:string)=>void;cancel:()=>void;leave:()=>void};
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
async function settle(signal:AbortSignal){await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));if(signal.aborted)throw Error('Example action cancelled.');}
export function GuidedDemo({active,actions,registry,onClose}:{active:boolean;actions:GuidedDemoActions;registry:GuidedActionRegistry;onClose:()=>void}){
 const [step,setStep]=useState(0),[pending,setPending]=useState(false),[error,setError]=useState('');
 const [id]=useState(()=>`guided-${crypto.randomUUID()}`),flow=useRef(new HomeGuidedFlow()),abort=useRef<AbortController|null>(null),latest=useRef(actions),heading=useRef<HTMLHeadingElement>(null),closed=useRef(false),running=useRef<AbortController|null>(null);
 useLayoutEffect(()=>{latest.current=actions;});
 function cancel(){abort.current?.abort();flow.current.cancel();registry.preparation?.cancel?.();latest.current.cancel();}
 function close(){if(closed.current)return;closed.current=true;cancel();latest.current.leave();registry.clear();onClose();}
 useLayoutEffect(()=>{const node=heading.current;if(node){node.focus({preventScroll:true});node.scrollIntoView({block:'start',behavior:'instant'});}},[step]);
 // Navigation cancels an explicit walkthrough; reload never resumes or replays it.
 useLayoutEffect(()=>{if(!active)close();});
 useLayoutEffect(()=>()=>{abort.current?.abort();flow.current.cancel();registry.preparation?.cancel?.();latest.current.cancel();latest.current.leave();registry.clear();},[registry]);
 const owned=()=>{const s=decisionStore.getSnapshot();if(!s.saved||!s.data.goals.goals.some(goal=>goal.id===id&&goal.statement===GUIDED_EXAMPLE_PROMPT))throw Error('The demo goal was removed or changed. It will not be recreated. Exit the example to review your work.');};
 async function next(){
  if(running.current||closed.current||step>=steps.length)return;
  const controller=new AbortController();abort.current=controller;running.current=controller;const signal=controller.signal;
  setPending(true);setError('');
  try{
   const success=await flow.current.run(step,async()=>{
    if(step===0){registry.start(id);latest.current.begin(id);await settle(signal);await latest.current.send();}
    else{
     if(step>1)owned();
     if(step===1)latest.current.pin(id);
     if(step===2)latest.current.select(id);
     if(step===3){const prepare=registry.preparation;if(prepare?.goalId!==id||!prepare.prepare)throw Error('Wait for the current goal and data to finish loading, then retry.');await prepare.prepare();}
     if(step===4){const plan=registry.plan;if(plan?.goalId!==id||!plan.select)throw Error('The example plans are not ready. Go Back to prepare them again.');plan.select();}
     if(step===5){
      const deadline=Date.now()+15000;
      while(registry.plan?.goalId===id&&!registry.plan.attachReady?.()&&Date.now()<deadline)await settle(signal);
      const plan=registry.plan;if(plan?.goalId!==id||!plan.attach)throw Error('Select the demo goal and example plan before attaching.');
      if(!plan.attachReady?.())throw Error('The plan is still checking its assumptions or needs review. Wait for the plan status below, then retry.');
      await plan.attach();
     }
    }
    await settle(signal);
   },()=>{
    if(signal.aborted)throw Error('Example action cancelled.');
    if(step>=1)owned();
    if(step>=2&&decisionStore.getSnapshot().data.goals.activeId!==id)throw Error('The selected goal changed. Select the demo goal before continuing.');
    if(step===3&&registry.plan?.goalId!==id)throw Error('No usable plans were prepared. Review the preparation message below, then retry.');
    if(step===4&&!registry.plan?.selected?.())throw Error('The example plan could not be selected. Retry after reviewing the current goal.');
    if(step===5&&!registry.plan?.attached?.())throw Error('The plan was not attached. Review the message or conflict below, then retry.');
   },step>=2);
   if(success&&!signal.aborted)setStep(value=>value+1);
  }catch(reason){if(!signal.aborted)setError(reason instanceof Error?reason.message:'The action did not finish. Please retry.');}
  finally{if(running.current===controller){running.current=null;setPending(false);}}
 }
 function back(){cancel();running.current=null;setPending(false);setError('');setStep(value=>Math.max(0,value-1));}
 const complete=step===steps.length;
 return <section aria-label="Optional guided demo" className="min-w-0 rounded-lg border border-primary/50 bg-card p-4 xl:col-span-2">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Guided example</h2><button className={button} onClick={close}>{complete?'Finish example':'Cancel example'}</button></div>
  <p className="mt-2 text-xs text-muted-foreground">Demo example · fictional planning assumptions, not predicted or achieved outcomes.</p>
  <h3 ref={heading} tabIndex={-1} className="mt-3 font-semibold">{complete?'Example plan attached':`Step ${step+1} of ${steps.length}: ${steps[step][0]}`}</h3>
  <p className="my-2 text-sm">{complete?'Your demo goal and attached plan are saved. You can reopen the goal and describe changes in chat; review and apply the recalculated proposal before attaching a new version.':steps[step][1]}</p>
  {step===0&&<blockquote className="my-3 break-words border-l-2 pl-3 text-sm">{GUIDED_EXAMPLE_PROMPT}</blockquote>}
  {pending&&<p role="status" aria-live="polite" className="my-2 flex items-center gap-2 text-sm"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"/>{steps[step][3]}</p>}
  {error&&<p role="alert" className="my-2 text-sm">{error}</p>}
  {complete&&<p className="text-xs text-muted-foreground">Share Action Plan (TBD) and Track results (TBD) are future features.</p>}
  <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={step===0||pending&&step===5} onClick={back}>Back</button>{!complete&&<button className={button} disabled={pending||!actions.ready} onKeyDown={event=>{if(event.repeat)event.preventDefault();}} onClick={event=>{if(event.detail<2)void next();}}>{error?'Retry: ':'Next: '}{steps[step][2]}</button>}</div>
 </section>;
}
