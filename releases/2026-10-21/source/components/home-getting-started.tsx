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
      const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-2xl border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/60 sm:p-6">
      <p className="text-sm font-semibold text-primary">A portfolio project by Ed Om</p>
      <h2 ref={title} id={id+'-title'} tabIndex={-1} className="mt-2 text-2xl font-bold tracking-tight focus:outline-none">Workforce Intelligence</h2>
      <p id={id+'-purpose'} className="mt-3 text-lg font-semibold">Turn workforce evidence into a staffing decision.</p>
      <p className="mt-2 text-sm leading-relaxed">Explore workforce trends, adjust a staffing scenario, and compare options before saving a proposal.</p>
      <p className="mt-3 text-xs text-muted-foreground">Built with AI assistance. The guided example uses fictional planning assumptions.</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" disabled={!demoReady||busy||!active} onClick={start} className="min-h-11 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">Start guided demo</button>
        <button type="button" onClick={dismiss} className="min-h-11 rounded-lg border px-4 py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Explore on my own</button>
      </div>
      {!demoReady&&<p role="status" className="mt-2 text-sm">Finish loading or recover unsaved work to start the demo.</p>}
      <a href="/about" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center rounded text-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">About this project<span className="sr-only"> (opens a new tab)</span></a>
    </dialog>,document.body)}
  </section>;
}
