'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowDown,X} from 'lucide-react';

// Separate from saved goals, conversations, recovery and Home instructions.
export const WORKFORCE_CHAT_INTRO_SEEN_KEY='insights-to-action.workforce-chat-intro-seen.v1';

/** A non-modal introduction beside the actual chatbot, once per browser. */
export function WorkforceChatIntro({active,suppressed=false}:{active:boolean;suppressed?:boolean}){
 const anchor=useRef<HTMLDivElement>(null),shown=useRef(false);
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  const node=anchor.current;
  if(!active||suppressed||!node){
   // eslint-disable-next-line react-hooks/set-state-in-effect -- Close the introduction when its external page/guide eligibility ends.
   setOpen(false);return;
  }
  let inView=false;
  const update=()=>{
   const blocked=[...document.querySelectorAll<HTMLElement>('[data-guided-popup],dialog[open],[role="dialog"],:popover-open')].some(item=>item.getClientRects().length>0);
   if(blocked){setOpen(false);return;}
   if(!inView||shown.current)return;
   try{if(localStorage.getItem(WORKFORCE_CHAT_INTRO_SEEN_KEY)!==null)return;}catch{/* Keep once-per-mounted-session behavior if storage is unavailable. */}
   shown.current=true;
   try{localStorage.setItem(WORKFORCE_CHAT_INTRO_SEEN_KEY,'1');}catch{/* This preference never changes saved work. */}
   setOpen(true);
  };
  const intersection=new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);update();});intersection.observe(node);
  const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','style','data-guided-popup']});
  const storage=(event:StorageEvent)=>{if(event.key===WORKFORCE_CHAT_INTRO_SEEN_KEY&&event.newValue!==null)setOpen(false);};
  window.addEventListener('storage',storage);
  return()=>{intersection.disconnect();observer.disconnect();window.removeEventListener('storage',storage);};
 },[active,suppressed]);
 useEffect(()=>{
  if(!open||!active||suppressed)return;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
 },[open,active,suppressed]);
 const close=()=>{setOpen(false);anchor.current?.parentElement?.querySelector<HTMLTextAreaElement>('textarea')?.focus({preventScroll:true});};
 return <div ref={anchor} className="min-h-px shrink-0">
  {active&&!suppressed&&open&&<section data-workforce-intro aria-label="Workforce chatbot introduction" className="mb-2 text-sm">
   <div className="flex items-start gap-1 rounded-lg border border-primary/40 bg-background p-2 shadow-sm">
    <p role="status" className="min-w-0 flex-1 px-1 py-2">Use the chatbot to explore workforce questions and build an Action Plan for your goal.</p>
    <button type="button" aria-label="Close chatbot introduction" onClick={close} className="flex size-11 shrink-0 items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden="true" size={18}/></button>
   </div>
   <ArrowDown data-workforce-intro-arrow aria-hidden="true" className="ml-2 mt-1 text-primary" size={24}/>
  </section>}
 </div>;
}
