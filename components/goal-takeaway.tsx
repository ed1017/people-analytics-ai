"use client";
import {useEffect,useState} from "react";
import {ChatContent} from "@/components/chat-content";
import {goalSummaryRequest} from "@/lib/goal-context";
import type {AppPage} from "@/lib/types";
type Entry={key:string;goalId:string;text:string;failed:boolean};
const sessionCache=new Map<string,Entry>();
export function GoalTakeaway({goalId,goalContext,payload,active,ready,paused,validGoalIds,unavailable,onNavigate}:{goalId:string;goalContext:unknown;payload:Record<string,unknown>;active:boolean;ready:boolean;paused:boolean;validGoalIds:string[];unavailable?:string;onNavigate?:(page:AppPage)=>void}) {
 const summaryRequest=goalSummaryRequest(payload,goalContext);
 const request=JSON.stringify(summaryRequest);
 const key=goalId+":"+request;
 const allowed=JSON.stringify(validGoalIds);
 const [entries,setEntries]=useState<Entry[]>(()=>[...sessionCache.values()]);
 const [lastAllowed,setLastAllowed]=useState(allowed);
 if(lastAllowed!==allowed){setLastAllowed(allowed);setEntries(current=>current.filter(e=>validGoalIds.includes(e.goalId)));}
 const entry=entries.find(e=>e.key===key);
 useEffect(()=>{for(const [cacheKey,cached] of sessionCache)if(!JSON.parse(allowed).includes(cached.goalId))sessionCache.delete(cacheKey);},[allowed]);
 useEffect(()=>{
  if(!active||!goalId||!ready||paused||entry)return;
  let live=true;const controller=new AbortController();let timeout:ReturnType<typeof setTimeout>;
  // Wait for page/source transitions to settle. StrictMode and quick navigation cancel before a call.
  const delay=setTimeout(async()=>{
   timeout=setTimeout(()=>controller.abort(),30000);
   try{
    const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:request,signal:controller.signal});
    const data=await response.json();if(!response.ok||typeof data.answer!=="string"||!data.answer.trim())throw new Error("unavailable");
    if(live){const result={key,goalId,text:data.answer,failed:false};sessionCache.set(key,result);while(sessionCache.size>32)sessionCache.delete(sessionCache.keys().next().value!);setEntries(current=>[...current.filter(e=>e.key!==key),result].slice(-32));}
   }catch{if(live)setEntries(current=>[...current.filter(e=>e.key!==key),{key,goalId,text:"The goal takeaway is unavailable. Ask a question below to continue with this page's evidence.",failed:true}].slice(-32));}
   finally{clearTimeout(timeout);}
  },300);
  return()=>{live=false;clearTimeout(delay);clearTimeout(timeout);controller.abort();};
 },[active,goalId,ready,paused,entry,key,request]);
 if(!goalId||!active)return null;
 return <section aria-label="Focused issue" className="mb-4 space-y-2 text-base"><h3 className="text-sm font-semibold text-primary">Focused issue</h3><p className="break-words text-sm font-medium">{summaryRequest.goalContext.goal}</p>{!ready?<p className="text-sm text-muted-foreground">{unavailable||"This page's evidence is loading or unavailable. No finding is inferred."}</p>:entry?<div role={entry.failed?"status":undefined}><ChatContent content={entry.text} onNavigate={onNavigate}/></div>:<p role="status" className="text-sm text-muted-foreground">{paused?"Your goal context is retained while you work on this question.":"Preparing a fresh takeaway from this page's evidence…"}</p>}</section>;
}
