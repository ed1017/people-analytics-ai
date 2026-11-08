"use client";
import {useEffect,useId,useRef,type ReactNode,type SyntheticEvent} from 'react';
import styles from './whole-app-demo-window.module.css';

/** Controls are admitted only inside the current real-app tour surface. */
export function wholeAppDemoTargetAllowed(target:Element,nextPage?:string):boolean {
 if(target.closest('[data-tour-controls]'))return true;
 if(target.closest('[data-whole-app-demo-plan]'))return true;
 if(target.closest('[data-tour-menu]'))return true;
 if(target.closest('summary'))return true;
 const nav=target.closest('[data-tour-page]');
 return Boolean(nav&&nextPage&&nav.getAttribute('data-tour-page')===nextPage);
}
const controls='button,a[href],input,select,textarea,summary,[tabindex],[role="button"],[contenteditable="true"]';
export function WholeAppDemoWindow({active,title,instruction,nextPage,children,onExit,complete=false,palette}:{active:boolean;title:string;instruction:string;nextPage?:string;children:ReactNode;onExit:()=>void;complete?:boolean;palette?:string}){
 const content=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const root=useRef<HTMLDivElement>(null),exit=useRef<HTMLButtonElement>(null),opener=useRef<HTMLElement|null>(null),id=useId();
 useEffect(()=>{
  if(!active)return;
  opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';exit.current?.focus({preventScroll:true});
  return()=>{document.body.style.overflow=previous;if(opener.current?.isConnected)opener.current.focus({preventScroll:true});};
 },[active]);
 useEffect(()=>{
  if(!active)return;
  if(content.current){content.current.scrollTop=0;content.current.scrollLeft=0;}
  heading.current?.focus({preventScroll:true});
 },[active,title,nextPage]);
 useEffect(()=>{
  const surface=root.current;if(!active||!surface)return;
  const changed=new Map<HTMLElement,{inert:boolean;dim:string|null}>();
  const highlighted=new Map<HTMLElement,string|null>();
  function restoreHighlights(){for(const [node,prior] of highlighted){if(prior===null)node.removeAttribute('data-tour-current-action');else node.setAttribute('data-tour-current-action',prior);}highlighted.clear();}
  function refresh(){
   restoreHighlights();
   for(const node of surface!.querySelectorAll<HTMLElement>('[data-tour-page]'))if(nextPage&&node.getAttribute('data-tour-page')===nextPage){highlighted.set(node,node.getAttribute('data-tour-current-action'));node.setAttribute('data-tour-current-action','true');}
   for(const [node,prior] of changed){node.inert=prior.inert;if(prior.dim===null)node.removeAttribute('data-tour-blocked');else node.setAttribute('data-tour-blocked',prior.dim);}changed.clear();
   for(const node of surface!.querySelectorAll<HTMLElement>(controls)){
    if(wholeAppDemoTargetAllowed(node,nextPage)||node.querySelector(controls))continue;
    changed.set(node,{inert:node.inert,dim:node.getAttribute('data-tour-blocked')});node.inert=true;node.setAttribute('data-tour-blocked','true');
   }
  }
  refresh();const observer=new MutationObserver(refresh);observer.observe(surface,{childList:true,subtree:true});
  return()=>{observer.disconnect();restoreHighlights();for(const [node,prior] of changed){node.inert=prior.inert;if(prior.dim===null)node.removeAttribute('data-tour-blocked');else node.setAttribute('data-tour-blocked',prior.dim);}};
 },[active,nextPage]);
 const gate=(event:SyntheticEvent)=>{if(active&&event.target instanceof Element&&!wholeAppDemoTargetAllowed(event.target,nextPage)){event.preventDefault();event.stopPropagation();}};
 return <div ref={root} data-workspace-palette={palette} className={active?styles.window:undefined} role={active?'dialog':undefined} aria-modal={active?true:undefined} aria-labelledby={active?id:undefined} onClickCapture={gate} onKeyDownCapture={event=>{
  if(!active)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onExit();return;}
  if(event.key==='Tab'){
   const available=[...(root.current?.querySelectorAll<HTMLElement>(controls)??[])].filter(node=>wholeAppDemoTargetAllowed(node,nextPage)&&!node.closest('[inert]')&&!node.matches(':disabled')&&node.tabIndex>=0&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden');
   const first=available[0],last=available.at(-1),focused=document.activeElement;
   if(!first){event.preventDefault();return;}
   if(event.shiftKey&&(focused===first||focused===heading.current||!root.current?.contains(focused))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&(focused===last||!root.current?.contains(focused))){event.preventDefault();first.focus();}
  }else if(event.key==='Enter'||event.key===' ')gate(event);
 }}>
  {active&&<header className={styles.coach} data-tour-controls><div><h2 ref={heading} tabIndex={-1} id={id}>{title}</h2><p aria-live="polite">{instruction}</p></div><button ref={exit} type="button" onClick={onExit}>{complete?'Finish demo':'Exit demo'}</button></header>}
  <div ref={content} key="app-content" className={active?styles.content:undefined}>{children}</div>
 </div>;
}
