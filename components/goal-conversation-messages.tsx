"use client";
import {useState} from "react";
import {ChatContent} from "@/components/chat-content";
import type {AppPage,ChatMessage} from "@/lib/types";
export function GoalConversationMessages({messages,viewKey,hasGoal,onNavigate,home=false}:{messages:ChatMessage[];viewKey:string;hasGoal:boolean;onNavigate?:(page:AppPage)=>void;home?:boolean}) {
 const [boundary,setBoundary]=useState({key:viewKey,last:messages.at(-1)});
 if(boundary.key!==viewKey)setBoundary({key:viewKey,last:messages.at(-1)});
 const last=boundary.key===viewKey?boundary.last:messages.at(-1);
 const end=hasGoal&&last?messages.indexOf(last)+1:0;
 const history=messages.slice(0,end),current=messages.slice(end);
 const render=(items:ChatMessage[])=>items.map((message,index)=><div key={index} className={home?"py-2 text-lg":"py-2 text-[17px] leading-relaxed"}><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{message.role==="user"?"You":"Workforce AI"}</p><ChatContent content={message.content} onNavigate={message.role==="assistant"?onNavigate:undefined}/></div>);
 return <>{history.length>0&&<details aria-label="Conversation history" className="mb-4 text-sm"><summary className="cursor-pointer font-semibold text-primary">Conversation history</summary><p className="my-2 text-xs text-muted-foreground">Reference only. Current findings use current page evidence and your saved goal context.</p>{render(history)}</details>}{render(current)}</>;
}
