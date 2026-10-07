"use client";
import {useCallback,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {HomeGuidedFlow,guidedReceiptStep,type GuidedReceipt} from '@/lib/home-guided-flow';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {GuidedActionArrow} from '@/components/guided-action-arrow';
import type {GuidedActionRegistry} from '@/components/home-guided-actions';
import {GUIDED_EXAMPLE_PROMPT} from '@/lib/home-decision-journey';
export {GUIDED_EXAMPLE_PROMPT} from '@/lib/home-decision-journey';
export const guidedEditPrompt=(number:number)=>`In Action Plan #${number} set coordination hours to 24`;
const steps=[
 ['Review the retention example','Start a separate example conversation. Your current conversation and draft are kept. No question is sent until you use the real Send button.'],
 ['Submit the example question','Review the prefilled question, then follow Next → Submit to the actual Send button. Wait for the answer before pinning.'],
 ['Pin the demo goal','Follow Next → Pin goal to the real button. After the goal is saved, its Action Plans will be prepared using the normal Pin flow.'],
 ['Review the plans and choose one','Compare the approaches, proposed owners, cash costs, employee hours, periods and targets, then select any available Action Plan. If preparation failed, use Retry Action Plans.'],
 ['Attach your chosen plan','Follow Next → Attach Action Plan to the real button. Review any displayed conflict or assumptions. This step advances only after the attachment is saved.'],
 ['Edit your Action Plan','A suggested coordination-hours adjustment is filled into chat. Review or change it, then follow Next → Submit to the real Send button. The goal, budget and original attachment are kept.'],
 ['Select the revised plan','Follow the arrow to the new numbered plan. Review the recalculated assumptions and compare it with the original before attaching.'],
 ['Attach the revised plan','Review unresolved assumptions, then follow Next → Attach Action Plan. Both attachments will remain in the goal’s history.'],
] as const;
export type GuidedDemoActions={ready:boolean;loading:boolean;draft:string;begin:(id:string)=>void;fillDraft:(text:string)=>void;cancel:()=>void;leave:()=>void};
const button='min-h-11 rounded border border-white/60 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50';
async function settle(signal:AbortSignal){await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));if(signal.aborted)throw Error('Example action cancelled.');}
export function GuidedDemo({active,actions,registry,onClose}:{active:boolean;actions:GuidedDemoActions;registry:GuidedActionRegistry;onClose:()=>void}){
 const storage=useDecisionStorage();
 const [step,setStep]=useState(0),[pinnedStatement,setPinnedStatement]=useState<string>(GUIDED_EXAMPLE_PROMPT),[pending,setPending]=useState(false),[error,setError]=useState(''),[revised,setRevised]=useState<{id:string;number:number}|null>(null),[completedSteps,setCompletedSteps]=useState<number[]>([]),[popupTop,setPopupTop]=useState(12);
 const [id]=useState(()=>`guided-${crypto.randomUUID()}`),flow=useRef(new HomeGuidedFlow()),abort=useRef<AbortController|null>(null),latest=useRef(actions),heading=useRef<HTMLHeadingElement>(null),panel=useRef<HTMLElement>(null),closed=useRef(false),running=useRef<AbortController|null>(null),currentStep=useRef(0),pinnedGoal=useRef<string>(GUIDED_EXAMPLE_PROMPT),originalId=useRef<string|null>(null),originalNumber=useRef<number|null>(null),revisedId=useRef<string|null>(null),completed=useRef(new Set<number>()),editLoaded=useRef(false);
 useLayoutEffect(()=>{latest.current=actions;currentStep.current=step;});
 function cancel(){abort.current?.abort();flow.current.cancel();registry.preparation?.cancel?.();latest.current.cancel();}
 function close(){if(closed.current)return;closed.current=true;cancel();latest.current.leave();registry.clear();onClose();}
 const owned=useCallback((statement=pinnedGoal.current)=>{const s=decisionStore.getSnapshot();if(!s.saved||s.data.goals.activeId!==id||!s.data.goals.goals.some(goal=>goal.id===id&&goal.statement===statement))throw Error('The demo goal was removed, changed or deselected. It will not be recreated. Reopen it or exit the guide to review your work.');},[id]);
 useLayoutEffect(()=>registry.subscribe((event:GuidedReceipt)=>{
  if(closed.current)return;
  try{const current=currentStep.current;if(current===4&&guidedReceiptStep(3,event,id,originalId.current,revisedId.current)===4){owned();originalId.current=event.planId!;originalNumber.current=event.number!;return;}const next=guidedReceiptStep(current,event,id,originalId.current,revisedId.current);if(next===null)return;if(current===2){const statement=event.goal??GUIDED_EXAMPLE_PROMPT;owned(statement);pinnedGoal.current=statement;setPinnedStatement(statement);}else if(current>=2)owned();
   if(current===3){originalId.current=event.planId!;originalNumber.current=event.number!;}
   if(current===5){revisedId.current=event.planId!;setRevised({id:event.planId!,number:event.number!});}
   completed.current.add(current);setCompletedSteps([...completed.current]);currentStep.current=next;setError('');setStep(next);
   if(current===4&&!editLoaded.current&&originalNumber.current){editLoaded.current=true;try{latest.current.fillDraft(guidedEditPrompt(originalNumber.current));}catch(reason){setError((reason as Error).message);}}
  }catch(reason){setError((reason as Error).message);}
 }),[registry,id,owned]);
 useLayoutEffect(()=>{const node=heading.current;node?.focus({preventScroll:true});if(node?.parentElement)node.parentElement.scrollTop=node.offsetTop-node.parentElement.offsetTop;},[step]);
 useLayoutEffect(()=>{
  let frame=0;
  const position=()=>{frame=0;const popup=panel.current;if(!popup)return;const viewport=window.visualViewport,top=(viewport?.offsetTop??0)+12,height=viewport?.height??innerHeight,box=popup.getBoundingClientRect(),target=document.querySelector<HTMLElement>('[data-guided-highlight="true"]')?.getBoundingClientRect();
   const bottom=Math.max(top,top+height-box.height-24),overlaps=(y:number)=>Boolean(target&&box.left<target.right+100&&box.right>target.left-100&&y<target.bottom+12&&y+box.height>target.top-120);
   setPopupTop(previous=>{const next=overlaps(top)&&!overlaps(bottom)?bottom:top;return previous===next?previous:next;});
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(position);};
  const resize=new ResizeObserver(queue);if(panel.current)resize.observe(panel.current);
  const mutation=new MutationObserver(queue);mutation.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-guided-highlight']});
  window.addEventListener('scroll',queue,true);window.addEventListener('resize',queue);window.visualViewport?.addEventListener('resize',queue);queue();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();window.removeEventListener('scroll',queue,true);window.removeEventListener('resize',queue);window.visualViewport?.removeEventListener('resize',queue);};
 },[]);
 useLayoutEffect(()=>{if(!active)close();});
 useLayoutEffect(()=>()=>{abort.current?.abort();flow.current.cancel();registry.preparation?.cancel?.();latest.current.cancel();latest.current.leave();registry.clear();},[registry]);
 async function start(){
  if(running.current||closed.current||step!==0)return;
  const controller=new AbortController();abort.current=controller;running.current=controller;setPending(true);setError('');
  try{const success=await flow.current.run(0,async()=>{registry.start(id);latest.current.begin(id);await settle(controller.signal);latest.current.fillDraft(GUIDED_EXAMPLE_PROMPT);});if(success&&!controller.signal.aborted){completed.current.add(0);setCompletedSteps([...completed.current]);currentStep.current=1;setStep(1);}}
  catch(reason){if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'The example could not start. Please retry.');}
  finally{if(running.current===controller){running.current=null;setPending(false);}}
 }
 function back(){cancel();running.current=null;setPending(false);setError('');setStep(value=>Math.max(0,value-1));}
 const goalCurrent=step<3||storage.saved&&storage.data.goals.activeId===id&&storage.data.goals.goals.some(goal=>goal.id===id&&goal.statement===pinnedStatement);
 const complete=step===steps.length,done=completedSteps.includes(step),point=!complete&&!done&&goalCurrent;
 const scope=`[data-guide-goal="${id}"] `,selector=step===1||step===5?'[data-guide-target="submit"]':step===2?'[data-guide-target="pin"]':step===3?scope+'[data-guide-plan][aria-selected="true"], '+scope+'[data-guide-target="prepare"]':step===4||step===7?scope+'[data-guide-target="attach"]':step===6&&revised?scope+`[data-guide-plan="${revised.number}"]`:null;
 const targetLabel=step===1||step===5?'Next → Submit':step===2?'Next → Pin goal':step===3?'Review plans and choose one':step===6?`Next → Select Plan #${revised?.number}`:'Next → Attach Action Plan';
 return typeof document==='undefined'?null:createPortal(<section ref={panel} role="dialog" aria-modal="false" data-guided-popup style={{top:popupTop,right:12,width:'min(360px, calc(100vw - 24px))',maxHeight:'min(calc(100dvh - 24px), 400px, max(228px, 33dvh))'}} aria-label="Optional guided demo" className="fixed z-40 flex min-w-0 flex-col rounded-lg border border-[#8c3957] border-b-4 bg-[#6b203b] p-3 text-white shadow-xl">
  <div className="flex shrink-0 items-center justify-between gap-2"><h2 className="text-lg font-semibold">Guided instructions</h2><button className={button} onClick={close}>{complete?'Finish example':'Exit guide'}</button></div>
  <div data-guided-content className="min-h-0 overflow-y-auto overscroll-contain">
  <p className="mt-2 text-xs text-white/85">Demo example · fictional planning assumptions, not predicted or achieved outcomes.</p><hr className="my-3 border-white/40"/>
  <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold">{complete?'Original and revised plans attached':`Step ${step+1} of ${steps.length}: ${steps[step][0]}`}</h3>
  <p className="my-2 text-sm">{complete?'Your demo goal keeps both attached versions. Reopen it from Pinned Goals to compare plans and continue editing.':steps[step][1]}</p>
  {step===0&&<blockquote className="my-3 break-words border-l-2 border-white/60 pl-3 text-sm">{GUIDED_EXAMPLE_PROMPT}</blockquote>}
  {[1,5].includes(step)&&!done&&<p className="my-3 break-words text-sm"><strong>Chat draft:</strong> {actions.draft||'Enter the question or adjustment you want to submit.'}</p>}
  {(pending||actions.loading)&&<p role="status" aria-live="polite" className="my-2 text-sm">{pending?'Opening the example conversation…':'Waiting for your submitted question…'}</p>}
  {!goalCurrent&&<p role="alert" className="my-2 text-sm">The demo goal is not current or saved. Reopen it or resolve browser storage before continuing. A removed goal will not be recreated.</p>}
  {error&&<p role="alert" className="my-2 text-sm">{error}</p>}
  {done&&!complete&&<p className="my-2 text-sm">This step is complete. Continuing keeps the saved result.</p>}
  {complete&&<p className="text-xs text-white/85">Share Action Plan (TBD) and Track results (TBD) are future features.</p>}
  </div>
  <div className="mt-3 flex shrink-0 flex-wrap gap-2"><button className={button} disabled={step===0} onClick={back}>Back</button>{done&&!complete?<button className={button} onClick={()=>setStep(value=>value+1)}>Continue walkthrough</button>:step===0&&<button className={button} disabled={pending||!actions.ready} onClick={()=>void start()}>Next → Start example</button>}</div>
  {point&&selector&&<GuidedActionArrow key={step} selector={selector} label={targetLabel}/>}
 </section>,document.body);
}
