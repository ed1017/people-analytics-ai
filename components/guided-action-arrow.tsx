'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowBigDown} from 'lucide-react';
/** Point at the existing control; this overlay cannot receive clicks or run actions. */
export function GuidedActionArrow({selector,label}:{selector:string;label:string}){
 const overlay=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState<{left:number;top:number;label:string}|null>(null);
 useLayoutEffect(()=>{
  let frame=0,stopped=false,focused=false,target:HTMLElement|null=null;
  const update=()=>{
   frame=0;if(stopped)return;
   const next=[...document.querySelectorAll<HTMLElement>(selector)].find(node=>node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden')??null;
   if(target!==next){target?.removeAttribute('data-guided-highlight');target=next;target?.setAttribute('data-guided-highlight','true');}
   if(!target){setPosition(previous=>previous===null?previous:null);return;}
   if(!focused&&!target.matches(':disabled')){focused=true;target.scrollIntoView({block:'center',behavior:'instant'});target.focus({preventScroll:true});}
   const rect=target.getBoundingClientRect(),nextPosition=rect.bottom<0||rect.top>innerHeight?null:{left:Math.max(96,Math.min(innerWidth-96,rect.left+rect.width/2)),top:rect.top-(overlay.current?.getBoundingClientRect().height??104)-8,label:target.dataset.guideTarget==='prepare'?target.textContent??label:label};
   setPosition(previous=>JSON.stringify(previous)===JSON.stringify(nextPosition)?previous:nextPosition);
  };
  const queue=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','aria-selected']});
  window.addEventListener('scroll',queue,true);window.addEventListener('resize',queue);queue();
  return()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',queue,true);window.removeEventListener('resize',queue);target?.removeAttribute('data-guided-highlight');};
 },[selector,label]);
 return position?createPortal(<div ref={overlay} data-guided-arrow aria-hidden="true" className="pointer-events-none fixed z-50 flex w-48 -translate-x-1/2 flex-col items-center text-center" style={{left:position.left,top:position.top}}>
  <span className="rounded bg-[#6b203b] px-2 py-1 text-sm font-semibold text-white shadow">{position.label}</span><ArrowBigDown size={56} strokeWidth={2} className="fill-[#6b203b] text-white drop-shadow"/>
 </div>,document.body):null;
}
