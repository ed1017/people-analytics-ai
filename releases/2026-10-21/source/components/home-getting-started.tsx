"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {createPortal} from 'react-dom';
import {HOME_INTRO_OPT_OUT_KEY} from '@/lib/home-onboarding';
import {lockIntroPageScroll} from '@/lib/intro-scroll-lock';
import type { AppPage } from "@/lib/types";

/** Intro only. The existing Planning Scenario entry owns all calculation and draft safeguards. */
export function HomeGettingStarted({busy,active,ready,autoOpen,deferAutoOpen=false,onStartDemo,demoReady=true,status,dismissKey}: {
  liveChatAvailable?:boolean;
  conversational?:boolean;
  busy:boolean;
  active:boolean;
  ready:boolean;
  autoOpen:boolean;
  deferAutoOpen?:boolean;
  onNavigate:(page:AppPage)=>void;
  onStartDemo:()=>void;
  demoReady?:boolean;
  status?:ReactNode;
  dismissKey:string;
}) {
  const [open,setOpen]=useState(false),id=useId();
  const [preferenceError,setPreferenceError]=useState<string|null>(null);
  const [optedOut,setOptedOut]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),title=useRef<HTMLHeadingElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const attempted=useRef(false),previousKey=useRef(dismissKey),restoreFocus=useRef(true),activeHome=useRef(active),launching=useRef(false);
  const fallback=()=>document.querySelector<HTMLButtonElement>('[data-orientation-return]');
  const show=useCallback(()=>{
    if(!active||busy||!ready||!dialog.current||dialog.current.open)return;
    try{setOptedOut(localStorage.getItem(HOME_INTRO_OPT_OUT_KEY)==='1');setPreferenceError(null);}
    catch{setPreferenceError('This browser could not read the saved introduction preference.');}
    restoreFocus.current=true;launching.current=false;dialog.current.showModal();attempted.current=true;title.current?.focus({preventScroll:true});setOpen(true);
  },[active,busy,ready]);
  useEffect(()=>{
    if(!open)return;
    return lockIntroPageScroll(document);
  },[open]);
  const dismiss=()=>{dialog.current?.close();};
  const changeOptOut=(checked:boolean)=>{
    try{if(checked)localStorage.setItem(HOME_INTRO_OPT_OUT_KEY,'1');else localStorage.removeItem(HOME_INTRO_OPT_OUT_KEY);setOptedOut(checked);setPreferenceError(null);}
    catch{setPreferenceError('This browser could not save the preference. You can still close the introduction for this visit.');}
  };
  useEffect(()=>{activeHome.current=active;if(!active||previousKey.current!==dismissKey){restoreFocus.current=false;dialog.current?.close();}previousKey.current=dismissKey;},[active,dismissKey]);
  useEffect(()=>{
    if(!ready||attempted.current||!active)return;
    // Wait for blocking recovery/editor flows; never clear or replace their work.
    if(deferAutoOpen||busy||!autoOpen||!dialog.current)return;
    show();
    attempted.current=true;
  },[ready,autoOpen,deferAutoOpen,active,busy,show]);
  useEffect(()=>{
    const dismissed=(event:StorageEvent)=>{if(event.key===HOME_INTRO_OPT_OUT_KEY){attempted.current=true;setOptedOut(event.newValue==='1');setPreferenceError(null);}};
    window.addEventListener('storage',dismissed);return()=>window.removeEventListener('storage',dismissed);
  },[]);
  const finish=()=>{
    setOpen(false);
    if(restoreFocus.current&&activeHome.current){const target=trigger.current?.getClientRects().length?trigger.current:fallback();target?.focus({preventScroll:true});}
  };
  const start=()=>{
    if(launching.current||!active||busy||!ready||!demoReady)return;
    launching.current=true;restoreFocus.current=false;dialog.current?.close();
    fallback()?.focus({preventScroll:true});onStartDemo();
  };
  return <section aria-label="Product introduction" className="min-w-0 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <button ref={trigger} data-orientation-return type="button" disabled={busy||!ready||!active} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={show} className="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium text-primary hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">Introduction</button>
      {status}
    </div>
    {ready&&createPortal(<dialog ref={dialog} id={id} aria-labelledby={id+'-title'} aria-describedby={id+'-purpose'} onClose={finish} onCancel={event=>{event.preventDefault();dismiss();}} onClick={event=>{
      if(event.target!==event.currentTarget)return;
      const box=event.currentTarget.getBoundingClientRect();
      if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dismiss();
    }} onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]');
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl overscroll-none overflow-hidden rounded-2xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60 open:flex open:flex-col">
      <header className="shrink-0 border-b px-5 py-4 sm:px-6">
        <h2 ref={title} id={id+'-title'} tabIndex={-1} className="mt-1 text-2xl font-bold tracking-tight focus:outline-none">Workforce Intelligence</h2>
        <p id={id+'-purpose'} className="mt-2 text-base font-semibold">Turn workforce evidence into a staffing decision.</p>
      <div className="mt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" disabled={!demoReady||busy||!active} onClick={start} className="min-h-11 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">Start guided demo</button>
        <button type="button" onClick={dismiss} className="min-h-11 rounded-lg border px-4 py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Explore on my own</button>
        <label htmlFor={id+'-opt-out'} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
          <input id={id+'-opt-out'} type="checkbox" checked={optedOut} onChange={event=>changeOptOut(event.currentTarget.checked)} className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/>
          Do not show again
        </label>
      </div>
      {preferenceError&&<p role="alert" className="mt-2 text-sm text-destructive">{preferenceError}</p>}
      {!demoReady&&<p role="status" className="mt-2 text-sm">Finish loading or recover unsaved work to start the demo.</p>}
      </div>
      </header>
      <div tabIndex={0} role="region" aria-label="About Workforce Intelligence" className="min-h-0 overscroll-contain overflow-y-auto px-5 py-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6">
        <section aria-labelledby={id+'-why'}>
          <h3 id={id+'-why'} className="text-base font-bold">Purpose of the project</h3>
          <p className="mt-1">Workforce decisions connect people, work and budgets. This project brings those decisions into one place: understand the workforce, compare staffing options and develop a plan.</p>
          <p className="mt-2">Start with the workforce you have, identify a priority and compare ways to respond.</p>
        </section>
        <section aria-labelledby={id+'-explore'} className="mt-4">
          <h3 id={id+'-explore'} className="text-base font-bold">What you can do</h3>
          <p className="mt-1">Explore workforce trends, recruiting, skills and employee listening. Use the suggested questions or your own question to investigate the evidence. Adjust scenario inputs to update the numbers and charts together.</p>
        </section>
        <section aria-labelledby={id+'-try'} className="mt-4">
          <h3 id={id+'-try'} className="text-base font-bold">Try a planning decision</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li><strong>Review the starting point.</strong> The guided example begins with a fictional 5-FTE capacity gap.</li>
            <li><strong>Adjust the assumptions.</strong> Change the available workload, timing, staffing and budget inputs to test your approach.</li>
            <li><strong>Compare the options.</strong> Explore developing people, moving people internally and hiring. Review cost, readiness and uncovered work together.</li>
            <li><strong>Keep a proposal.</strong> Review and save in this browser, then reopen it to continue.</li>
          </ol>
        </section>
        <section aria-labelledby={id+'-read'} className="mt-4">
          <h3 id={id+'-read'} className="text-base font-bold">How to read the results</h3>
          <p className="mt-1">Compare cost, readiness and uncovered work. Methods and sources are available in Details.</p>
        </section>
        <section aria-labelledby={id+'-role'} className="mt-4">
          <h3 id={id+'-role'} className="text-base font-bold">Project development</h3>
          <p className="mt-1">Product design focused on workforce decisions and practical tradeoffs. AI assisted with implementation, design and testing.</p>
          <a href="/about" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center rounded text-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">About this project<span className="sr-only"> (opens a new tab)</span></a>
        </section>
        <section aria-labelledby={id+'-contact'} className="mt-4">
          <h3 id={id+'-contact'} className="text-base font-bold">Contact Ed Om</h3>
          <p className="mt-1">Questions, feedback and conversations about the project are welcome.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <a href="mailto:edwinom.nyc@gmail.com" className="inline-flex min-h-11 min-w-0 items-center rounded text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"><span className="break-all">edwinom.nyc@gmail.com</span></a>
            <a href="https://www.linkedin.com/in/ed-om-62a57818" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">LinkedIn<span className="sr-only"> (opens a new tab)</span></a>
          </div>
        </section>
      </div>

    </dialog>,document.body)}
  </section>;
}
