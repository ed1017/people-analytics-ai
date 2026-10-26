"use client";
import {useEffect,useState,useSyncExternalStore} from 'react';
import {datasetFetch,datasetSession} from '@/lib/dataset-client.mjs';
import {readCompanySnapshot,companyHeadcountWhatIf,type CompanySnapshot} from '@/lib/company-headcount-what-if';

const count=(n:number)=>n.toLocaleString('en-US');
function WhatIfInputs({snapshot}:{snapshot:CompanySnapshot}){
 const [hires,setHires]=useState(''),[exits,setExits]=useState('');
 let points:ReturnType<typeof companyHeadcountWhatIf>=null,error='';
 try{points=companyHeadcountWhatIf(snapshot,hires,exits);}catch(e){error=e instanceof Error?e.message:'Review your inputs.';}
 return <div className="space-y-3">
  <p>Recorded snapshot: <strong>{count(snapshot.opening)} people</strong> on <strong>{snapshot.asOf}</strong>.</p>
  <p className="text-sm text-muted-foreground">Company-wide, across all countries, business units and levels. Dashboard filters do not narrow this calculation. This is a fixed released snapshot, not a live workforce feed.</p>
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="text-sm font-medium">External hires per month<input type="text" inputMode="numeric" value={hires} onChange={e=>setHires(e.target.value)} aria-describedby="company-what-if-help" className="mt-1 block min-h-11 w-full rounded-md border bg-background px-3" /></label>
   <label className="text-sm font-medium">Exits per month<input type="text" inputMode="numeric" value={exits} onChange={e=>setExits(e.target.value)} aria-describedby="company-what-if-help" className="mt-1 block min-h-11 w-full rounded-md border bg-background px-3" /></label>
  </div>
  <p id="company-what-if-help" className="text-sm text-muted-foreground">Enter your own assumptions in whole people, including explicit zero. The same hires and exits apply in each of the next six months. Blank inputs stay unknown.</p>
  {error?<p role="alert">{error}</p>:!points?<p role="status">Enter both monthly flows to calculate a what-if. No future headcount is calculated yet.</p>:<div className="overflow-x-auto">
   <table className="w-full text-left text-sm tabular-nums"><caption className="mb-2 text-left font-semibold">Conditional what-if · future months, not recorded history</caption><thead><tr>{['Month','Opening people','Hires','Exits','Closing people'].map(label=><th key={label} scope="col" className="px-2 py-2 first:pl-0">{label}</th>)}</tr></thead><tbody>{points.map(p=><tr key={p.month} className="border-t"><th scope="row" className="py-2 pr-2">{p.month.slice(0,7)}</th>{[p.opening,p.hires,p.exits,p.headcount].map((n,i)=><td key={i} className="px-2 py-2">{count(n)}</td>)}</tr>)}</tbody></table>
  </div>}
  <p className="text-sm text-muted-foreground">Closing people = opening + external hires − exits. Internal transfers net to zero company-wide. This is a conditional calculation, not a predictive forecast or staffing commitment. Costs are not calculated. Entries are temporary and reset when this tool is reloaded.</p>
 </div>;
}
export function CompanyHeadcountWhatIf(){
 const token=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,datasetSession.snapshot);
 const [attempt,setAttempt]=useState(0);
 const [source,setSource]=useState<{token:string;attempt:number;snapshot?:CompanySnapshot;error?:string}|null>(null);
 useEffect(()=>{
  const abort=new AbortController();
  void (async()=>{try{
   const response=await datasetFetch('/api/dashboard?country=all&org=all&level=all',{signal:abort.signal,cache:'no-store'});
   if(!response.ok)throw Error('Snapshot request failed.');
   const snapshot=readCompanySnapshot(await response.json(),token);
   if(!abort.signal.aborted&&datasetSession.snapshot()===token)setSource({token,attempt,snapshot});
  }catch{if(!abort.signal.aborted)setSource({token,attempt,error:'Verified company snapshot unavailable. Reload the source to try again.'});}})();
  return()=>abort.abort();
 },[token,attempt]);
 const current=source?.token===token&&source.attempt===attempt?source:null;
 return <details className="rounded-xl border bg-background p-4">
  <summary className="min-h-11 cursor-pointer py-2 font-semibold focus-visible:ring-2 focus-visible:ring-ring">Six-month headcount what-if</summary>
  <section aria-label="Company headcount what-if" className="space-y-3 pt-2 text-sm">
   {current?.snapshot?<WhatIfInputs key={token+':'+attempt} snapshot={current.snapshot}/>:<p role="status">{current?.error??'Loading verified company snapshot…'}</p>}
   <button type="button" onClick={()=>setAttempt(n=>n+1)} className="min-h-11 rounded-md border px-3 py-2">Reload source and clear inputs</button>
  </section>
 </details>;
}
