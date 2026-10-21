'use client';
import {useEffect,useState} from 'react';
import {localWorkforceTask} from '@/lib/workforce-search-client';
import type {HomeMixHistory} from '@/lib/home-mix-history';
export function useVerifiedHomeMixHistory(raw:unknown,goalId:string){
 const key=JSON.stringify(raw??null),[checked,setChecked]=useState<{key:string;goalId:string;history:HomeMixHistory|null}|null>(null);
 useEffect(()=>{
  if(key==='null')return;
  const abort=new AbortController();
  void localWorkforceTask<HomeMixHistory|null>('home-mix-history',{raw:JSON.parse(key),goalId},abort.signal).then(history=>{if(!abort.signal.aborted)setChecked({key,goalId,history});}).catch(()=>{if(!abort.signal.aborted)setChecked({key,goalId,history:null});});
  return()=>abort.abort();
 },[key,goalId]);
 if(key==='null')return {status:'absent' as const,history:null};
 if(checked?.key!==key||checked.goalId!==goalId)return {status:'loading' as const,history:null};
 return checked.history?{status:'valid' as const,history:checked.history}:{status:'invalid' as const,history:null};
}
export function HomeMixHistoryView({value}:{value:ReturnType<typeof useVerifiedHomeMixHistory>}){
 if(value.status==='absent')return null;
 if(value.status==='loading')return <p role="status">Verifying saved staffing searches…</p>;
 if(value.status==='invalid')return <p role="alert">Saved staffing search history cannot be verified. It is retained; applying and attaching are blocked.</p>;
 return <details><summary className="min-h-11 cursor-pointer py-2">Verified local staffing searches ({value.history.entries.length})</summary>{value.history.entries.map((entry,index)=><div key={index} className="my-2 rounded border p-3 text-sm"><p>{entry.before.bundle.name} · source revision {entry.before.revision} · {entry.createdAt.slice(0,10)}</p><p>{entry.report.summary.enumerated} combinations within saved bounds. Objective: {entry.report.objective.label}. {entry.report.selection.label}</p><p>{entry.proposal?`Proposed staffing revision ${entry.proposal.draft.revision}: Build ${entry.proposal.draft.inputs.capacity!.input.build}, Move ${entry.proposal.draft.inputs.capacity!.input.move}, Buy ${entry.proposal.draft.inputs.capacity!.input.buy}.`:'Current staffing assumptions retained; no candidate adopted.'}</p><p className="text-xs">Historical source replay verified. This does not make the old assumptions current or establish operational approval.</p></div>)}</details>;
}
