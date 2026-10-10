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
  return <section aria-label="Home instructions" className="min-w-0 basis-full flex-1 text-sm sm:basis-80">
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
      <p>An AI-enabled Strategic Workforce Planning prototype: connect a business objective to workforce choices, a reviewed Action Plan and progress tracking — insight → action → outcomes.</p>
      <p className="text-xs text-muted-foreground">Synthetic data and fictional scenarios. Benefits are conditional estimates; review capability, availability and funding before acting.</p>
      <h4 className="font-semibold">Start with your question</h4>
      <ol className="list-decimal space-y-2 pl-5">
        <li><strong>Describe the outcome</strong> — Type in chat or click a practical starter prompt to send it. The goal comes with your Action Plan; describe it naturally in chat.</li>
        <li><strong>Review proposed Action Plans</strong> — {conversational?'Review the proposed plan, its conditional recommendation, concrete steps, suggested owners and success measures. Missing costs, capacity and dates stay unknown.':'Ask for plans and review their assumptions before choosing.'} <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("workforce")}>Explore your data</button> when supporting evidence would help.</li>
        <li><strong>Refine in chat</strong> — Choose an approach to discuss, combine ideas, or optionally focus on a team. Discussing a plan does not save it.</li>
        <li><strong>{conversational?'Review and pin':'Review and save'}</strong> — {conversational?'Choose Pin Action Plan on the reviewed card when ready.':'Use the plan’s explicit selection control when ready.'} The goal and proposal are linked together; earlier versions remain in history. Saving does not authorize implementation.</li>
        <li><strong>Check outcomes</strong> — Agree what to observe and compare it with a baseline and target. Proposed benefits are not achieved results.</li>
      </ol>
      <p className="text-xs text-muted-foreground">On your first visit, example Action Plans include goals and assumptions you can explore and edit. Their scope, budget and outcomes are assumptions, not achieved results.</p>
      <p className="text-xs text-muted-foreground">{conversational?'To reopen saved work, select a Pinned Action Plan. Its goal and progress stay linked. Earlier saved goals remain available under Earlier saved goals and drafts.':'To reopen saved work, select a Pinned Goal and expand its latest plan.'} Earlier attachments stay in history.</p>
      <p className="text-xs text-muted-foreground">Goals and drafts are saved in this browser within the limits in Browser storage details. Explore <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("workforce")}>Workforce</button>, <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("occupational-references")}>Intelligence</button> or <button className="rounded-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate("planning-overview")}>Planning</button>. Opening a page does not carry evidence or run a model. Source coverage and limitations are in Data details.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => {restoreFocus.current=false;close();onStartDemo();}} className="min-h-11 rounded border px-3 py-2 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Try a guided example</button>
      </div>
      </div></div>
    </dialog>
  </section>;
}
