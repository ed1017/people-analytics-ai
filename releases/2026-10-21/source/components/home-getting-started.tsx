"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {createPortal} from 'react-dom';
import {HOME_INSTRUCTIONS_DISMISSED_KEY} from '@/lib/home-onboarding';
import type { AppPage } from "@/lib/types";

/** Intro only. The existing Planning Scenario entry owns all calculation and draft safeguards. */
export function HomeGettingStarted({busy,active,ready,autoOpen,onStartDemo,demoReady=true,status,dismissKey}: {
  liveChatAvailable?:boolean;
  conversational?:boolean;
  busy:boolean;
  active:boolean;
  ready:boolean;
  autoOpen:boolean;
  onNavigate:(page:AppPage)=>void;
  onStartDemo:()=>void;
  demoReady?:boolean;
  status?:ReactNode;
  dismissKey:string;
}) {
  const [open,setOpen]=useState(false),id=useId();
  const dialog=useRef<HTMLDialogElement>(null),title=useRef<HTMLHeadingElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const attempted=useRef(false),previousKey=useRef(dismissKey),restoreFocus=useRef(true),activeHome=useRef(active),launching=useRef(false);
  const fallback=()=>document.querySelector<HTMLButtonElement>('[data-orientation-return]');
  const remember=()=>{try{localStorage.setItem(HOME_INSTRUCTIONS_DISMISSED_KEY,'1');}catch{/* Dismissal still works when storage is unavailable. */}};
  const show=useCallback(()=>{if(!active||busy||!ready||dialog.current?.open)return;restoreFocus.current=true;launching.current=false;dialog.current?.showModal();title.current?.focus();setOpen(true);},[active,busy,ready]);
  const dismiss=()=>{remember();dialog.current?.close();};
  useEffect(()=>{activeHome.current=active;if(!active||previousKey.current!==dismissKey){restoreFocus.current=false;dialog.current?.close();}previousKey.current=dismissKey;},[active,dismissKey]);
  useEffect(()=>{
    if(!ready||attempted.current||!active||busy||!autoOpen)return;
    attempted.current=true;
    show();
  },[ready,autoOpen,active,busy,show]);
  useEffect(()=>{
    const dismissed=(event:StorageEvent)=>{if(event.key===HOME_INSTRUCTIONS_DISMISSED_KEY&&event.newValue!==null)dialog.current?.close();};
    window.addEventListener('storage',dismissed);return()=>window.removeEventListener('storage',dismissed);
  },[]);
  const finish=()=>{
    setOpen(false);
    if(restoreFocus.current&&activeHome.current){const target=trigger.current?.getClientRects().length?trigger.current:fallback();target?.focus({preventScroll:true});}
  };
  const start=()=>{
    if(launching.current||!active||busy||!ready||!demoReady)return;
    launching.current=true;restoreFocus.current=false;remember();dialog.current?.close();
    fallback()?.focus({preventScroll:true});onStartDemo();
  };
  return <section aria-label="Product introduction" className="min-w-0 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <button ref={trigger} type="button" disabled={busy||!ready||!active} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={show} className="min-h-11 rounded px-1 text-sm font-medium text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">About Workforce Intelligence</button>
      {status}
    </div>
    {ready&&createPortal(<dialog ref={dialog} id={id} aria-labelledby={id+'-title'} aria-describedby={id+'-purpose'} onClose={finish} onCancel={event=>{event.preventDefault();dismiss();}} onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]');
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-hidden rounded-2xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60 open:flex open:flex-col">
      <header className="shrink-0 border-b px-5 py-4 sm:px-6">
        <p className="text-sm font-semibold text-primary">A portfolio project by Ed Om</p>
        <h2 ref={title} id={id+'-title'} tabIndex={-1} className="mt-1 text-2xl font-bold tracking-tight focus:outline-none">Workforce Intelligence</h2>
        <p id={id+'-purpose'} className="mt-2 text-base font-semibold">Turn workforce evidence into a staffing decision.</p>
      </header>
      <div tabIndex={0} role="region" aria-label="About Ed and Workforce Intelligence" className="min-h-0 overflow-y-auto px-5 py-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6">
        <section aria-labelledby={id+'-why'}>
          <h3 id={id+'-why'} className="text-base font-bold">Why I built this</h3>
          <p className="mt-1">I&apos;m Ed Om. I built this independent portfolio project to explore a practical question: how can a team turn workforce evidence into a staffing decision, with the assumptions and tradeoffs visible?</p>
          <p className="mt-2">Workforce Intelligence brings exploration and planning together. Start with the workforce you have, identify a question worth investigating, then test a possible response before saving a proposal.</p>
        </section>
        <section aria-labelledby={id+'-explore'} className="mt-4">
          <h3 id={id+'-explore'} className="text-base font-bold">What you can do</h3>
          <p className="mt-1">Explore workforce trends, recruiting, skills and employee listening. Use the suggested questions or your own question to investigate the evidence. In supported planning scenarios, adjust inputs and see the calculated numbers and charts change together.</p>
        </section>
        <section aria-labelledby={id+'-try'} className="mt-4">
          <h3 id={id+'-try'} className="text-base font-bold">Try a planning decision</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li><strong>Review the starting point.</strong> The guided example begins with a fictional 5-FTE capacity gap.</li>
            <li><strong>Adjust the assumptions.</strong> Change the available workload, timing, staffing and budget inputs to test your approach.</li>
            <li><strong>Compare the options.</strong> Explore developing people, moving people internally and hiring. Review cost, readiness and uncovered work together.</li>
            <li><strong>Keep a proposal.</strong> Review and save in this browser, then reopen it to continue. Saving records a plan; it does not approve or execute staffing actions.</li>
          </ol>
        </section>
        <section aria-labelledby={id+'-read'} className="mt-4">
          <h3 id={id+'-read'} className="text-base font-bold">How to read the results</h3>
          <p className="mt-1">The workforce data is synthetic and dated. The worked example has its own illustrative assumptions, while external references retain their sources and dates. Check the scope and period before comparing results.</p>
          <p className="mt-2">Scenario results show what follows from the inputs you choose. Missing inputs remain unknown, and a projected staffing decline is not automatically a workload shortfall. These are conditional planning results, not measured business outcomes.</p>
        </section>
        <section aria-labelledby={id+'-role'} className="mt-4">
          <h3 id={id+'-role'} className="text-base font-bold">My role in the project</h3>
          <p className="mt-1">I defined the workforce-planning problem, product requirements and acceptance criteria. AI assisted with implementation, design and testing. This project demonstrates the planning workflow and the reasoning behind it.</p>
          <a href="/about" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center rounded text-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">About this project<span className="sr-only"> (opens a new tab)</span></a>
        </section>
      </div>
      <footer className="shrink-0 border-t bg-card px-5 py-3 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" disabled={!demoReady||busy||!active} onClick={start} className="min-h-11 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">Start guided demo</button>
        <button type="button" onClick={dismiss} className="min-h-11 rounded-lg border px-4 py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Explore on my own</button>
      </div>
      {!demoReady&&<p role="status" className="mt-2 text-sm">Finish loading or recover unsaved work to start the demo.</p>}
      </footer>
    </dialog>,document.body)}
  </section>;
}
