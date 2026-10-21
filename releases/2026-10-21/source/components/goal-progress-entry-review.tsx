'use client';
import {useRef,useState} from 'react';
import {decisionStore,useDecisionStorage} from './decision-store';
import {goalProgressConversationEnabled} from '@/lib/goal-progress-conversation';
import {progressEntryField,readProgressEntryState} from '@/lib/goal-progress-entry';
import {cancelProgressEntry,confirmProgressEntry} from '@/lib/goal-progress-entry-store';
import {goalProgressField,readGoalProgressLedger,HEADCOUNT_DEFINITION,type GoalProgressLedger,type ProgressEvent} from '@/lib/goal-progress';
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const value=(v:unknown)=>v===null||v===undefined?'Unresolved':String(v);
function EntryReview(){
 const storage=useDecisionStorage(),[notice,setNotice]=useState<{id:string;message:string}|null>(null),[busy,setBusy]=useState(false),running=useRef(false);
 const goalId=storage.data.goals.activeId;let state;
 try{state=readProgressEntryState(storage.data.workspaces[goalId]?.fields[progressEntryField]);}catch{return <p role="status" className="m-4">Saved progress draft could not be verified. It is preserved; no observation was saved.</p>;}
 if(!state)return null;
 const {proposal:p,status}=state,s=p.spec,m=s.measurement,o=s.observation;
 let ledger:GoalProgressLedger|null=null,invalidLedger=false;
 try{const raw=storage.data.workspaces[goalId]?.fields[goalProgressField];if(raw!==undefined&&raw!==null)ledger=readGoalProgressLedger(raw,goalId);}catch{invalidLedger=true;}
 const reports=ledger?.events.filter((e):e is Extract<ProgressEvent,{kind:'observed'}>=>e.kind==='observed'&&e.data.source.classification==='user-reported')??[],superseded=new Set(reports.map(e=>e.supersedes));
 let baseline=reports.find(e=>e.id===m?.baselineId);while(baseline){const next=reports.find(e=>e.supersedes===baseline!.id);if(!next)break;baseline=next;}
 const correction=reports.find(e=>e.id===o?.supersedes);
 const unavailable=!storage.ready||!storage.saved||!!storage.recovery||busy||invalidLedger;
 async function act(confirm:boolean){if(running.current)return;running.current=true;setBusy(true);setNotice(null);try{if(confirm){await confirmProgressEntry(decisionStore,p);setNotice({id:p.id,message:'Saved the confirmed user-reported entry in this browser. It remains unverified.'});}else{cancelProgressEntry(decisionStore,p);setNotice({id:p.id,message:'Progress draft cancelled. Saved observations are unchanged.'});}}catch(error){setNotice({id:p.id,message:error instanceof Error?error.message:'The entry could not be saved. Earlier work is retained.'});}finally{running.current=false;setBusy(false);}}
 return <section aria-label="Review progress entry" className="m-4 space-y-2 break-words rounded border p-4 text-sm">
  <h2 className="font-semibold">{status==='draft'?'Proposed progress entry':status==='confirmed'?'Confirmed user-reported entry':'Cancelled progress draft'}</h2>
  <p><strong>{p.goal}</strong> · User-reported and unverified. Browser-local only; not recorded dataset evidence or a source-verified result.</p>
  <p>Metric: {value(s.metric)} · Definition: {s.definition===HEADCOUNT_DEFINITION?'Active employees at a point in time':value(s.definition)} · Unit: {value(s.unit)}.</p>
  <p>Saved goal scope: {s.scope?`${s.scope.country} / ${s.scope.org} / ${s.scope.level}`:'Unresolved'}. Page filters do not set this scope.</p>
  {m&&<><p>Measurement: {value(m.direction)} to {value(m.targetValue)} {value(s.unit)} by {value(m.targetDate)}. Freshness: {value(m.maxAgeDays)} days.</p><p>Baseline: {o?.useAsBaseline?'the dated report shown below':baseline?`${value(baseline.data.value)} ${baseline.data.unit} on ${baseline.data.period.end}, user-reported and unverified`:m.baselineId?'Referenced report unavailable':'not supplied; progress arithmetic remains unavailable'}.</p></>}
  {!m&&<p>The existing measurement definition is retained.</p>}
  {o&&<><p>Reported observation: {value(o.value)} {value(s.unit)} on {value(o.date)}. Reported scope completeness: {o.complete===null?'Unresolved':o.complete?'complete (unverified)':'partial (unverified)'}.</p><p>{o.supersedes?`Correction of ${correction?`${value(correction.data.value)} ${correction.data.unit} on ${correction.data.period.end}`:'an unavailable report'}; its earlier contents stay in history.`:'New dated report; no earlier observation is replaced.'}</p></>}
  {!o&&<p>This proposal contains no observation.</p>}
  <details><summary className="min-h-11 cursor-pointer py-2">Review the quoted user input</summary>{s.basis.map((b,i)=><blockquote key={i} className="border-l pl-3">{b.quote}</blockquote>)}</details>
  {p.blocking.map((b,i)=><p key={i} role="status">{b}</p>)}
  <p>Review these interpretations and refine them in chat. Confirmation saves only this exact entry. Choosing a plan does not record progress. Forecast and completion remain unavailable.</p>
  {status==='draft'&&<div className="flex flex-wrap gap-2"><button className={button} disabled={unavailable||!!p.blocking.length} onClick={()=>void act(true)}>Confirm progress entry</button><button className={button} disabled={unavailable} onClick={()=>{const inputs=[...document.querySelectorAll<HTMLTextAreaElement>('textarea[aria-label="Ask Workforce AI"],textarea[aria-label="Ask People Analytics AI"]')];inputs.find(input=>input.getClientRects().length>0)?.focus();}}>Edit in conversation</button><button className={button} disabled={unavailable} onClick={()=>void act(false)}>Cancel progress draft</button></div>}
  {status==='confirmed'&&<p>Confirmed at {state.confirmedAt}. Corrections require a new reviewed proposal and preserve history.</p>}
  {reports.length>0&&<details><summary className="min-h-11 cursor-pointer py-2">Confirmed report history</summary><p>Recent user-reported entries; all earlier records remain in the browser ledger.</p><ul>{reports.slice(-8).map(e=><li key={e.id}>{e.data.period.end}: {value(e.data.value)} {e.data.unit} · {e.data.scope.country} / {e.data.scope.org} / {e.data.scope.level} · unverified{supersededLabel(e.id)}.</li>)}</ul></details>}
  {notice?.id===p.id&&<p role="status">{notice.message}</p>}
 </section>;
 function supersededLabel(id:string){return superseded.has(id)?' · superseded by an explicit correction':'';}
}
export function SelectedProgressEntry(){return goalProgressConversationEnabled?<EntryReview/>:null;}
