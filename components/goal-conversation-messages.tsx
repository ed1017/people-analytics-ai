"use client";
import {Fragment,useState,type ReactNode} from "react";
type BulletAction=(message:ChatMessage,text:string)=>ReactNode;
type MessageSupplement=(message:ChatMessage)=>ReactNode;
import {ChatContent} from "@/components/chat-content";
import type {AppPage,ChatMessage} from "@/lib/types";
export function GoalConversationMessages({messages,viewKey,hasGoal,onNavigate,home=false,hideHistory=false,latestOnly=false,renderBulletAction,collapsedRationale,renderMessageSupplement,renderBeforeMessage,responseStart}:{responseStart?:ChatMessage;renderBeforeMessage?:MessageSupplement;renderMessageSupplement?:MessageSupplement;collapsedRationale?:(message:ChatMessage)=>boolean;renderBulletAction?:BulletAction;messages:ChatMessage[];viewKey:string;hasGoal:boolean;onNavigate?:(page:AppPage)=>void;home?:boolean;hideHistory?:boolean;latestOnly?:boolean}) {
 const [boundary,setBoundary]=useState({key:viewKey,last:messages.at(-1)});
 if(boundary.key!==viewKey)setBoundary({key:viewKey,last:messages.at(-1)});
 const last=boundary.key===viewKey?boundary.last:messages.at(-1);
 const end=(hasGoal||hideHistory)&&last?messages.indexOf(last)+1:0;
 const history=messages.slice(0,end),current=messages.slice(end);
 const render=(items:ChatMessage[])=><ConversationMessages messages={items} onNavigate={onNavigate} home={home} collapsedRationale={collapsedRationale} renderBulletAction={renderBulletAction} renderMessageSupplement={renderMessageSupplement} responseStart={responseStart} renderBeforeMessage={renderBeforeMessage}/>;
 return <>{!hideHistory&&history.length>0&&<details aria-label="Conversation history" className="mb-4 text-sm"><summary className="cursor-pointer font-semibold text-primary">Conversation history</summary><p className="my-2 text-xs text-muted-foreground">Reference only. Current findings use current page evidence and your saved goal context.</p>{render(history)}</details>}{render(latestOnly?current.slice(-1):current)}</>;
}

export function ConversationMessages({assistantBasis,messages,onNavigate,home=false,compactAssistant=home,renderBulletAction,collapsedRationale,renderMessageSupplement,renderBeforeMessage,responseStart}:{assistantBasis?:string;responseStart?:ChatMessage;renderBeforeMessage?:MessageSupplement;renderMessageSupplement?:MessageSupplement;collapsedRationale?:(message:ChatMessage)=>boolean;renderBulletAction?:BulletAction;messages:ChatMessage[];onNavigate?:(page:AppPage)=>void;home?:boolean;compactAssistant?:boolean}) {
 return messages.map((message,index)=>{const content=<div key={index} data-chat-role={message.role} data-home-response-start={message===responseStart||undefined} className={message.role==="assistant"?(compactAssistant?"py-2 text-sm leading-relaxed":"py-2 text-base leading-relaxed"):home?"py-2 text-lg":"py-2 text-[17px] leading-relaxed"}><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{message.role==="user"?"You":"Workforce AI"}</p>{message.role==='assistant'&&assistantBasis&&<p className="mb-2 text-xs text-muted-foreground">{assistantBasis}</p>}<ChatContent compact={compactAssistant&&message.role==="assistant"} content={message.content} bulletAction={home&&message.role==="assistant"&&renderBulletAction?text=>renderBulletAction(message,text):undefined} onNavigate={message.role==="assistant"?onNavigate:undefined}/>{message.role==="assistant"&&renderMessageSupplement?.(message)}</div>;return collapsedRationale?.(message)&&message.role==="assistant"?<details key={index} className="text-sm"><summary className="min-h-11 cursor-pointer rounded py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Why these plans</summary>{content}</details>:<Fragment key={index}>{renderBeforeMessage?.(message)}{content}</Fragment>;});
}
