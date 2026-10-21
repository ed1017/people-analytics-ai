'use client';
import {useEffect, useRef, useState} from 'react';
import {PUBLIC_9037} from '../../lib/public-9037-contract.mjs';

export default function PublicQaForm({enabled}: {enabled: boolean}) {
 const [question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[answer,setAnswer]=useState('');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function submit(event: React.FormEvent) {
  event.preventDefault();if(!enabled||busy||!question.trim())return;
  if(new TextEncoder().encode(question).length>2000){setAnswer('Please shorten your question.');return;}
  const controller=new AbortController();active.current=controller;setBusy(true);setAnswer('');
  const timer=setTimeout(()=>controller.abort(),16000);
  try {
   const response=await fetch('/api/public-qa',{method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,body:JSON.stringify({requestId:crypto.randomUUID(),datasetToken:PUBLIC_9037.token,question,filters:{country:'all',org:'all',level:'all'}})});
   const result=await response.json();
   setAnswer(response.ok&&['answered','unsupported'].includes(result.status)&&result.datasetToken===PUBLIC_9037.token&&typeof result.answer==='string'?result.answer:'Q&A is unavailable. No answer was generated.');
  }catch{setAnswer('The request stopped. No automatic retry was made.');}
  finally{clearTimeout(timer);active.current=null;setBusy(false);}
 }
 return <form onSubmit={submit} className="space-y-3">
  <label htmlFor="public-qa-question" className="block">Company-wide question</label>
  <textarea id="public-qa-question" disabled={!enabled||busy} maxLength={2000} value={question} onChange={e=>setQuestion(e.target.value)} className="w-full rounded border p-2"/>
  <button disabled={!enabled||busy||!question.trim()} type="submit" className="rounded border px-4 py-2">{busy?'Checking evidence…':'Ask'}</button>
  {busy&&<button type="button" onClick={()=>active.current?.abort()} className="ml-3 underline">Cancel</button>}
  <p role="status" aria-live="polite" className="whitespace-pre-wrap">{answer}</p>
 </form>;
}
