'use client';
import {useState,type ReactNode} from 'react';
/** A form is opened only by this explicit user action, never by a model reply. */
export function OptionalConversationForm({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false);
 return <div className="space-y-2"><button type="button" className="min-h-11 rounded px-2 py-2 text-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close '+label:'Open '+label}</button>{open&&children}</div>;
}
