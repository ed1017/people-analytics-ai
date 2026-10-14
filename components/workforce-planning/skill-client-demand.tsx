'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {datasetFetch,datasetSession} from '@/lib/dataset-client.mjs';
import {DATASET_HEADER} from '@/lib/dataset-identity.mjs';
import {readDemandSkills,skillClientDraft,type DemandSkillCatalog} from '@/lib/skill-client-demand';
import type {CapacityDraft} from '@/lib/swp-capacity-draft';

const control='min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm';
export function SkillClientDemand({goalKey,onStart}:{goalKey:string;onStart:(draft:CapacityDraft)=>void}){
 const token=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,()=> 'pending');
 const [started,setStarted]=useState(false);
 return <details className="rounded-lg border p-3" onToggle={event=>{if(event.currentTarget.open)setStarted(true);}}>
  <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">Start with a skill and client demand</summary>
  {started&&<SkillReference key={JSON.stringify([token,goalKey])} token={token} onStart={onStart}/>}
 </details>;
}
function SkillReference({token,onStart}:{token:string;onStart:(draft:CapacityDraft)=>void}){
 const [catalog,setCatalog]=useState<DemandSkillCatalog|null>(null),[selected,setSelected]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  async function load(){try{
   const response=await datasetFetch('/api/skills',{cache:'no-store',signal:controller.signal});
   if(!response.ok||response.headers.get(DATASET_HEADER)!==token)throw Error('Unavailable');
   const next=readDemandSkills(await response.json());if(!controller.signal.aborted)setCatalog(next);
  }catch{if(!controller.signal.aborted)setError('Skill references are unavailable. Retry or enter a manual workload below.');}}
  if(!token.startsWith('pending'))void load();return ()=>controller.abort();
 },[token,attempt]);
 return <section aria-label="Skill client demand setup" className="space-y-3 text-sm">
  <p>Company-wide skill references (partial list). Dashboard filters do not narrow this list. Proficiency counts are not available FTE.</p>
  {error?<div><p role="alert">{error}</p><button type="button" className={control} onClick={()=>{setCatalog(null);setSelected('');setError('');setNotice('');setAttempt(value=>value+1);}}>Retry skill references</button></div>:!catalog?<p role="status">Loading skill references.</p>:<>
   <label className="block">Skill reference<select aria-label="Skill reference" className={control} value={selected} onChange={event=>{setSelected(event.target.value);setNotice('');}}><option value="">Choose a skill</option>{catalog.skills.map(skill=><option key={skill.id} value={skill.id}>{skill.name} ({skill.code})</option>)}</select></label>
   <p className="text-xs text-muted-foreground">Source snapshot: {catalog.asOf}. The saved workload name retains this reference date; it is not a live skill assessment.</p>
   <p>Below, use clients/month as work units and hours/client as hours per work unit. Enter timing and the capacity you assume is assigned to this skill. Nothing is inferred from revenue or skill records.</p>
   <p className="text-xs text-muted-foreground">Replaces unsaved worksheet inputs; saved scenarios are kept. One skill workload per scenario: do not add overlapping skill capacities together.</p>
   <button type="button" disabled={!selected} className={`${control} font-medium disabled:opacity-50`} onClick={()=>{if(!catalog||datasetSession.snapshot()!==token)return;onStart(skillClientDraft(catalog,selected));setNotice('Skill workload started below. Enter your client demand, timing and assumed capacity, then confirm, save and compare.');}}>Start new skill workload</button>
  </>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
