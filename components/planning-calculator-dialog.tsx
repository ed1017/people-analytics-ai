'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {SwpDemandEditor} from './swp-demand-editor';
import type {DemandReview} from '@/lib/swp-demand';
import type {DemandEditorDraft} from '@/lib/swp-demand-editor';

/** The caller owns the current review and all acceptance/save actions. Only edits
 * are drafted here; reviewing calls the caller's existing intentional action. */
export function PlanningCalculatorDialog({open,review,disabled,onReview,onCancel,children}:{open:boolean;review:DemandReview;disabled:boolean;onReview:(draft:DemandEditorDraft)=>void;onCancel:()=>void;children?:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),returnFocus=useRef<HTMLElement|null>(null);
 useLayoutEffect(()=>{
  const node=dialog.current;if(!node)return;
  if(open&&!node.open){returnFocus.current=document.activeElement as HTMLElement;node.showModal();node.querySelector<HTMLInputElement>('input')?.focus();}
  if(!open&&node.open){node.close();returnFocus.current?.focus();}
 },[open]);
 return <dialog ref={dialog} aria-label="Planning Calculator" onCancel={event=>{event.preventDefault();onCancel();}} onKeyDown={event=>{
  if(event.key!=='Tab')return;
  const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a[href],[tabindex]')].filter(node=>node.tabIndex>=0&&!node.matches(':disabled')&&node.getClientRects().length>0);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }} className="m-auto max-h-[85dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto rounded-xl border bg-card p-4 text-foreground shadow-xl backdrop:bg-black/60">
  {open&&<>{children}<SwpDemandEditor review={review} disabled={disabled} onReview={onReview} onCancel={onCancel}/></>}
 </dialog>;
}
