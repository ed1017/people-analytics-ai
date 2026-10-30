"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {ChatContent} from '@/components/chat-content';
import {publicAiFetch} from '@/lib/public-ai-readiness-client.mjs';
import {readPositionChatContext,type PositionChatContext} from '@/lib/position-chat-context';

const button='min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
const fundingLabels:Record<string,string>={'funding-unknown':'Funding not verified','within-demo-envelope':'Within demo allowance','approval-required':'Approval required'};
type View={signature:string;pending:boolean;answer:string;error:string;notice:string};
/** Explicit explanation only. No request on mount, edits, restore, or retry without a click. */
export function PositionScenarioExplanation({packet,active=true}:{packet:PositionChatContext|null;active?:boolean}){
 const signature=useMemo(()=>{try{return active&&packet?JSON.stringify(packet):'';}catch{return '';}},[packet,active]);
 const checked=useMemo(()=>{try{return packet&&signature?readPositionChatContext(packet,{datasetToken:packet.datasetToken,goalId:packet.goalId,goal:packet.goal}):null;}catch{return null;}},[signature,packet]);
 const currentSignature=useRef(signature),request=useRef<AbortController|null>(null);
 currentSignature.current=signature;
 const [view,setView]=useState<View>({signature,pending:false,answer:'',error:'',notice:''});
 // Reset on a changed input identity, so returning to an earlier scenario cannot resurrect its answer.
 if(view.signature!==signature)setView({signature,pending:false,answer:'',error:'',notice:''});
 useEffect(()=>()=>{request.current?.abort();request.current=null;},[signature]);
 const visible=view.signature===signature?view:null;
 async function explain(){
  if(!active||!packet||!checked||request.current)return;
  const captured=structuredClone(packet),capturedSignature=signature,expected=JSON.stringify(checked.evidence),controller=new AbortController();
  request.current=controller;setView({signature:capturedSignature,pending:true,answer:'',error:'',notice:''});
  const current=()=>!controller.signal.aborted&&request.current===controller&&currentSignature.current===capturedSignature;
  try{
   const response=await publicAiFetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({
    page:'workforce-planning',persona:'Finance',message:'Explain this selected position scenario: the allocation, ready capacity, cost, donor impact and funding status. State the next supported decision; do not invent a different allocation or approval.',
    history:[],goalId:captured.goalId,goalContext:{goal:captured.goal},positionContext:captured,
   })});
   if(!current())return;
   const text=await response.text();if(!current())return;
   if(text.length>250000)throw Error('The explanation was too large to verify. Try again.');
   let body:Record<string,unknown>;try{body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid response');}catch{throw Error('The explanation could not be read. Try again.');}
   if(!response.ok)throw Error(typeof body.error==='string'&&body.error.length<=500?body.error:'The explanation is unavailable. Try again.');
   if(typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>48000||JSON.stringify(body.positionEvidence)!==expected)throw Error('The explanation did not match this scenario. Try again.');
   if(current())setView({signature:capturedSignature,pending:false,answer:body.answer,error:'',notice:''});
  }catch(error){
   if(current())setView({signature:capturedSignature,pending:false,answer:'',error:error instanceof Error?error.message:'The explanation is unavailable. Try again.',notice:''});
  }finally{if(request.current===controller)request.current=null;}
 }
 function cancel(){request.current?.abort();request.current=null;setView({signature,pending:false,answer:'',error:'',notice:'Explanation cancelled. Your scenario is unchanged.'});}
 return <section aria-label="Position scenario explanation" className="min-w-0 space-y-2 rounded-xl border p-3">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">Scenario explanation</h3>{checked&&<p className="text-sm font-semibold" data-position-funding-status={checked.evidence.finance.status}>{fundingLabels[checked.evidence.finance.status]??'Review funding'}</p>}</div>
  <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!active||!checked||visible?.pending===true} onClick={()=>void explain()}>{visible?.pending?'Explaining…':visible?.error?'Retry explanation':'Explain this scenario'}</button>{visible?.pending&&<button type="button" className={button} onClick={cancel}>Cancel explanation</button>}</div>
  {!checked&&<p className="text-sm text-muted-foreground">Choose a valid position scenario to explain.</p>}
  {visible?.error&&<p role="alert" className="text-sm text-destructive">{visible.error}</p>}
  <div role="status" aria-live="polite" className="text-sm">{visible?.pending?'Preparing an explanation of this scenario.':visible?.notice}</div>
  {visible?.answer&&<div className="min-w-0 text-sm"><ChatContent content={visible.answer} compact/></div>}
 </section>;
}
