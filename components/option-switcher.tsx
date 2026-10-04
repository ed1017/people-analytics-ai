"use client";
import {useId,useRef,type ReactNode} from 'react';

/** Keep panels mounted: browsing never discards an option's disclosure or draft. */
export function OptionSwitcher<T extends {id:string}>({options,selectedId,onSelect,children,toolbar}:{options:readonly T[];selectedId:string;onSelect:(id:string)=>void;children:(option:T,index:number)=>ReactNode;toolbar?:ReactNode}){
 const prefix=useId(),tabs=useRef<Array<HTMLButtonElement|null>>([]);
 if(!options.length)return null;
 const selected=Math.max(0,options.findIndex(option=>option.id===selectedId));
 const move=(index:number,focus=false)=>{const next=(index+options.length)%options.length;onSelect(options[next].id);if(focus)tabs.current[next]?.focus({preventScroll:true})};
 return <div className="min-w-0 space-y-3">
  <div className="flex items-center gap-1" aria-label="Option navigation">
   <button type="button" aria-label="Previous option" disabled={options.length<2} onClick={()=>move(selected-1)} className="min-h-11 min-w-11 rounded border disabled:opacity-40">←</button>
   <div role="tablist" aria-label="Calculated options" className="flex min-w-0 flex-1 gap-1">{options.map((option,index)=><button type="button" key={option.id} ref={node=>{tabs.current[index]=node}} role="tab" id={`${prefix}-tab-${option.id}`} aria-controls={`${prefix}-panel-${option.id}`} aria-selected={index===selected} tabIndex={index===selected?0:-1} onClick={()=>move(index)} onKeyDown={event=>{const next=event.key==='ArrowRight'?index+1:event.key==='ArrowLeft'?index-1:event.key==='Home'?0:event.key==='End'?options.length-1:null;if(next!==null){event.preventDefault();move(next,true)}}} className={`min-h-11 min-w-0 flex-1 rounded border px-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary ${index===selected?'bg-primary text-primary-foreground':''}`}>Option {index+1}</button>)}</div>
   <button type="button" aria-label="Next option" disabled={options.length<2} onClick={()=>move(selected+1)} className="min-h-11 min-w-11 rounded border disabled:opacity-40">→</button>
  </div>
  {toolbar}
  {options.map((option,index)=><div key={option.id} role="tabpanel" id={`${prefix}-panel-${option.id}`} aria-labelledby={`${prefix}-tab-${option.id}`} hidden={index!==selected} tabIndex={0}>{children(option,index)}</div>)}
 </div>;
}
