"use client";
import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {decisionStore} from '@/components/decision-store';
import {prepareGoalStatementCopy,acceptGoalStatementCopy,type GoalStatementCopy,type GoalStatementContext} from '@/lib/workforce-goal-statement';
export function WorkforceGoalStatementCopy({statement,currentContext,disabled,onCopy,onFocusStatement}:{statement:string;currentContext:()=>GoalStatementContext;disabled:boolean;onCopy:(text:string)=>void;onFocusStatement:()=>void}){
 const [pending,setPending]=useState<GoalStatementCopy|null>(null),[notice,setNotice]=useState('');
 const ticket=useRef<GoalStatementCopy|null>(null),trigger=useRef<HTMLButtonElement|null>(null),confirm=useRef<HTMLButtonElement|null>(null);
 const clear=()=>{ticket.current=null;setPending(null)};
 const changed=useEffectEvent(()=>{if(ticket.current){try{if(acceptGoalStatementCopy(ticket.current,currentContext(),statement)!==null)return}catch{}clear();setNotice('Context changed; the planning statement was preserved. Choose the copy action again if intended.')}});
 useEffect(()=>{const off=decisionStore.subscribe(()=>changed());return()=>{off();ticket.current=null}},[]);
 useEffect(()=>{if(pending)confirm.current?.focus()},[pending]);
 function apply(request:GoalStatementCopy){
  clear();
  try{const value=acceptGoalStatementCopy(request,currentContext(),statement);if(value!==null){onCopy(value);onFocusStatement();setNotice('Current goal copied into the temporary planning statement. Review it before any separate AI action.');return}}catch{}
  setNotice('Context changed; the planning statement was preserved.');
 }
 function request(){
  clear();
  try{
   const result=prepareGoalStatementCopy(currentContext(),statement);
   if(result.kind==='copy'){apply(result.request);return}
   if(result.kind==='confirm'){ticket.current=result.request;setPending(result.request);setNotice('');return}
   setNotice(result.kind==='unchanged'?'The planning statement already matches the current goal.':'Save and review the current goal inputs before copying.');
  }catch{setNotice('Current saved goal unavailable; the planning statement was preserved.')}
 }
 const visible=pending&&pending.previousStatement===statement&&!disabled;
 return <div className="space-y-2 text-sm">
  <button ref={trigger} type="button" className="min-h-10 rounded border px-3 py-2 disabled:opacity-50" disabled={disabled} onClick={request}>Use current goal as planning statement</button>
  <p>Copies exact goal text into this temporary field only. It does not fill assumptions, save, calculate, approve or call AI.</p>
  {visible&&<section aria-label="Confirm planning statement replacement" className="space-y-2 rounded border p-3">
   <p>Your planning statement is not empty. Replace its entire text with this current goal?</p><p className="whitespace-pre-wrap break-words">{pending.context.goalText}</p>
   <div className="flex flex-wrap gap-2"><button ref={confirm} type="button" className="min-h-10 rounded border px-3 py-2" onClick={()=>{const request=ticket.current;if(request)apply(request)}}>Replace planning statement with current goal</button><button type="button" className="min-h-10 rounded border px-3 py-2" onClick={()=>{clear();setNotice('Replacement cancelled. Your planning statement is unchanged.');trigger.current?.focus()}}>Keep my planning statement</button></div>
  </section>}
  {notice&&<p role="status">{notice}</p>}
 </div>;
}
