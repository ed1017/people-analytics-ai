"use client";
import {useLayoutEffect,type RefObject} from 'react';
/** Keep the Home input/Send group aligned with its content column and visible viewport. */
export function useHomeComposerDock(active:boolean,slot:RefObject<HTMLDivElement|null>,dock:RefObject<HTMLDivElement|null>,input:RefObject<HTMLTextAreaElement|null>){
 useLayoutEffect(()=>{
  const anchor=slot.current,element=dock.current,textarea=input.current,root=anchor?.closest<HTMLElement>('.home-workspace');
  if(!active||!anchor||!element||!textarea||!root)return;
  const page=root.closest('main')??root;
  const viewport=window.visualViewport;let keyboardOpen=false;
  const measure=()=>{
   const box=anchor.getBoundingClientRect(),height=viewport?.height??innerHeight;
   if(!box.width)return;
   const keyboard=height<innerHeight*.75;
   document.documentElement.classList.toggle('home-keyboard-open',keyboard);
   if(keyboard&&!keyboardOpen){const header=document.querySelector('main > header');if(header)window.scrollBy(0,Math.max(0,header.getBoundingClientRect().bottom));}
   keyboardOpen=keyboard;
   element.style.setProperty('left',`${box.left}px`);element.style.setProperty('width',`${box.width}px`);
   element.style.setProperty('bottom',`${Math.max(0,innerHeight-height-(viewport?.offsetTop??0))}px`);
   element.style.setProperty('max-height',`${Math.max(100,height*.65)}px`);
   const inputMax=Math.max(48,Math.min(320,height*.4));
   textarea.style.setProperty('max-height',`${inputMax}px`);
   textarea.style.setProperty('min-height',`${Math.min(112,inputMax)}px`);
   root.style.setProperty('--home-visible-height',`${height}px`);
   const composerHeight=`${element.getBoundingClientRect().height}px`;
   root.style.setProperty('--home-composer-height',composerHeight);
   page.style.setProperty('--home-composer-height',composerHeight);
  };
  const keepFocusVisible=(event:FocusEvent)=>{
   const target=event.target;if(!(target instanceof HTMLElement)||element.contains(target))return;
   requestAnimationFrame(()=>{const box=target.getBoundingClientRect(),cover=element.getBoundingClientRect();if(box.right>cover.left&&box.left<cover.right&&box.bottom>cover.top-8&&box.top<cover.bottom)target.scrollIntoView({block:'center',behavior:'instant'});});
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(anchor);observer.observe(element);
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});viewport?.addEventListener('resize',measure);viewport?.addEventListener('scroll',measure);page.addEventListener('focusin',keepFocusVisible);
  return()=>{document.documentElement.classList.remove('home-keyboard-open');observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);viewport?.removeEventListener('resize',measure);viewport?.removeEventListener('scroll',measure);page.removeEventListener('focusin',keepFocusVisible);page.style.removeProperty('--home-composer-height');};
 },[active,slot,dock,input]);
}
