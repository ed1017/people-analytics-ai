"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {HOME_INSTRUCTIONS_DISMISSED_KEY} from '@/lib/home-onboarding';
import type { AppPage } from "@/lib/types";

export function HomeGettingStarted({ busy, active, ready, autoOpen, onNavigate, onStartDemo, status, dismissKey, conversational=false }: {
  conversational?:boolean;
  busy: boolean;
  active: boolean;
  ready: boolean;
  autoOpen: boolean;
  onNavigate: (page: AppPage) => void;
  onStartDemo: () => void;
  status?: ReactNode;
  dismissKey: string;
}) {
  const [open, setOpen] = useState(false);
  const dialog=useRef<HTMLDialogElement>(null),title=useRef<HTMLHeadingElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const attempted=useRef(false),previousKey=useRef(dismissKey),restoreFocus=useRef(true),activeHome=useRef(active);
  useEffect(()=>{activeHome.current=active;if(!active||previousKey.current!==dismissKey){restoreFocus.current=false;dialog.current?.close();}previousKey.current=dismissKey;},[active,dismissKey]);
  useEffect(()=>{
    if(!ready||attempted.current)return;
    attempted.current=true;
    if(!autoOpen||!active||busy)return;
    dialog.current?.showModal();title.current?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reflect one-time native dialog opening after browser storage hydration.
    setOpen(true);
  },[ready,autoOpen,active,busy]);
  useEffect(()=>{
    const dismissed=(event:StorageEvent)=>{if(event.key===HOME_INSTRUCTIONS_DISMISSED_KEY&&event.newValue!==null)dialog.current?.close();};
    window.addEventListener('storage',dismissed);return()=>window.removeEventListener('storage',dismissed);
  },[]);
  const close=()=>dialog.current?.close();
  const finish=()=>{
    setOpen(false);try{localStorage.setItem(HOME_INSTRUCTIONS_DISMISSED_KEY,'1');}catch{/* Closing still works when browser storage is unavailable. */}
    if(restoreFocus.current&&activeHome.current)trigger.current?.focus({preventScroll:true});
  };
  const navigate=(page:AppPage)=>{restoreFocus.current=false;close();onNavigate(page);};
  return <section aria-label="Home instructions" className="min-w-0 flex-1 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-x-3">
      <button ref={trigger} type="button" disabled={busy||!ready} aria-haspopup="dialog" aria-expanded={open} aria-controls="home-starting-instructions" onClick={() => {restoreFocus.current=true;dialog.current?.showModal();title.current?.focus();setOpen(true);}} className="min-h-11 rounded px-1 text-xs font-medium text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Show instructions</button>
      {status}
    </div>
    <dialog ref={dialog} id="home-starting-instructions" aria-labelledby="home-instructions-title" onClose={finish} onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const controls=event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-hidden rounded-xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4 sm:px-6"><h2 ref={title} id="home-instructions-title" tabIndex={-1} className="pt-2 text-xl font-semibold focus:outline-none">Home instructions</h2><button type="button" aria-label="Close instructions" onClick={close} className="min-h-11 shrink-0 rounded border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">Close</button></div>
      <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4 text-sm leading-relaxed sm:p-6">
      <p>The purpose of this product is to showcase the evolution of dashboards and strategic workforce planning from insight → action → outcomes.</p>
      <p>By incorporating AI into People Analytics and strategic workforce planning, it aims to help organizations turn workforce challenges into practical Action Plans, with clear ownership and accountability for results.</p>
      <p className="text-xs text-muted-foreground">Demo only. Review plans with your team before acting.</p>
      <h4 className="font-semibold">From question to action</h4>
      <ol className="list-decimal space-y-2 pl-5">
        <li><strong>Ask a question</strong> — Start a conversation or <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("workforce")}>explore your data</button>.</li>
        {conversational?<><li><strong>Explore and refine in chat</strong> — Describe the goal and discuss possible approaches. Reuse what is known; missing dates, budgets and assumptions can stay unknown.</li><li><strong>Choose a plan when ready</strong> — Review a proposal and its unknowns, then choose it. The goal is saved and the proposal attached automatically.</li><li><strong>Adjust it in chat</strong> — Describe a change and Send. Choose the revised proposal to keep both versions. Optional forms are available when you ask for them.</li></>:<><li><strong>Pin a goal when ready</strong> — Optionally save your goal and request Action Plan choices.</li><li><strong>Choose and attach a plan</strong> — Review a choice, then use Attach Action Plan to save it in one click.</li><li><strong>Adjust it in chat</strong> — Describe a change and Send. Review and select the new numbered alternative, then attach it to your goal.</li></>}
        <li><strong>Share and track your goal (TBD)</strong> — Share goals and Action Plans with owners, then track progress and outcomes.</li>
      </ol>
      <p className="text-xs text-muted-foreground">On your first visit, goals labelled Demo example include attached plans you can explore and edit. Their scope, budget and outcomes are assumptions, not achieved results.</p>
      <p className="text-xs text-muted-foreground">To reopen saved work, select a Pinned Goal and expand its latest plan. Earlier attachments stay in history.</p>
      <p className="text-xs text-muted-foreground">You can also use this as a traditional dashboard—explore workforce data through the left-hand menu.</p>
      <p className="text-xs text-muted-foreground">Goals and drafts are saved in this browser within the limits in Browser storage details. Explore <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("workforce")}>Workforce</button>, <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("occupational-references")}>Intelligence</button> or <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("planning-overview")}>Planning</button>. Opening a page does not carry evidence or run a model. Source coverage and limitations are in Data details.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => {restoreFocus.current=false;close();onStartDemo();}} className="min-h-11 rounded border px-3 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Try a guided example</button>
      </div>
      </div></div>
    </dialog>
  </section>;
}
