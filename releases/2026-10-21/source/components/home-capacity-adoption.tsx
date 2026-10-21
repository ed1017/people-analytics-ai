"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {decisionStore} from '@/components/decision-store';
import {localWorkforceTask} from '@/lib/workforce-search-client';
import {bundleInputKey,type BundleDraft} from '@/lib/home-bundle-reconciliation';
import type {BundleCapacityAdoption} from '@/lib/home-capacity-adoption';
import type {WorkforceSelectionOffer} from '@/components/workforce-selection-handoff';
import type {WorkforceSelectionContext} from '@/lib/workforce-mix-selection-core';
const button='min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50',shown=(value:unknown)=>value===null?'Unknown':String(value);
export function HomeCapacityAdoption({draft,offer,currentContext,isCurrent,onAccept}:{draft:BundleDraft;offer:WorkforceSelectionOffer;currentContext:()=>WorkforceSelectionContext;isCurrent:()=>boolean;onAccept:(next:BundleDraft)=>void}){
 const [candidateId,setCandidateId]=useState(offer.selectedIds[0]),[preview,setPreview]=useState<BundleCapacityAdoption|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const pending=useRef<AbortController|null>(null),mounted=useRef(true),contextRef=useRef({currentContext,isCurrent});useLayoutEffect(()=>{contextRef.current={currentContext,isCurrent};});
 useEffect(()=>{mounted.current=true;const off=decisionStore.subscribe(()=>{pending.current?.abort();setPreview(null);setConfirmed(false);setBusy(false);});return()=>{mounted.current=false;off();pending.current?.abort();};},[]);
 async function run(accept=false){
  if(busy||!isCurrent()||!offer.selectedIds.includes(candidateId)||accept&&(!preview||!confirmed))return;
  const controller=new AbortController();pending.current?.abort();pending.current=controller;setBusy(true);setNotice('');if(!accept){setPreview(null);setConfirmed(false);}
  try{
   const context=currentContext(),identity=JSON.stringify(context);
   const result=await localWorkforceTask<BundleCapacityAdoption>('bundle-adoption',{draft,context,snapshot:offer.snapshot,candidateId},controller.signal);
   if(controller.signal.aborted||!mounted.current)return;
   if(!contextRef.current.isCurrent()||JSON.stringify(contextRef.current.currentContext())!==identity||result.inputKey!==bundleInputKey(draft))throw Error('The goal, draft or calculation changed. Review adoption again.');
   if(accept){if(JSON.stringify(result)!==JSON.stringify(preview))throw Error('The reviewed alternative changed. Review adoption again.');onAccept(result.next);}else setPreview(result);
  }catch(error){if(mounted.current&&!controller.signal.aborted)setNotice((error as Error).message)}finally{if(mounted.current&&pending.current===controller){setBusy(false);pending.current=null}}
 }
 return <section aria-label="Adopt capacity alternative into plan" className="space-y-3 rounded border border-primary/50 p-3">
  <h4 className="font-semibold">Adopt a selected mix into this plan</h4>
  <label className="block">Selected alternative<select className="min-h-11 w-full rounded border bg-background p-2" aria-label="Capacity alternative to adopt" disabled={busy} value={candidateId} onChange={event=>{setCandidateId(event.target.value);setPreview(null);setConfirmed(false);setNotice('');}}>{offer.selectedIds.map((id,index)=>{const mix=offer.snapshot.results.find(item=>item.id===id)?.mix;return <option key={id} value={id}>Alternative {index===0?'A':'B'}: Build {mix?.build}, Move {mix?.move}, external hires {mix?.buy}</option>})}</select></label>
  <button className={button} disabled={busy||!isCurrent()} onClick={()=>void run()}>Review adoption and reconciliation</button>
  <p className="text-xs">Review the full bundle with its existing dates, participant groups and shared costs. Unsupported mappings block adoption. Current saved attachments stay in history until explicit replacement.</p>
  {preview&&<><ul className="list-disc pl-5">{preview.changes.map(change=><li key={change.field}>{change.field}: {change.before} → {change.after}</li>)}</ul>
   <p>Participants under current assumptions: {shown(preview.before.uniqueParticipants)} → {shown(preview.after.uniqueParticipants)}. Added company employees: {shown(preview.before.plannedAddedEmployees)} → {shown(preview.after.plannedAddedEmployees)}. These are different measures.</p>
   <p>Complete bundle cash (USD): {shown(preview.before.cashTotal)} → {shown(preview.after.cashTotal)}. Staff effort remains in hours, separate from cash.</p>
   <p>Dependency-gated capacity month: {shown(preview.before.capacityReadyMonth)} → {shown(preview.after.capacityReadyMonth)}. Component finish: {shown(preview.after.planFinish)}. Existing dates are preserved.</p>
   <p>Cost coverage needs renewed review for: {preview.costReviewComponents.map(id=>draft.bundle.components.find(item=>item.id===id)?.name).join('; ')||'No changed shared-cost allocations'}.</p>
   <p>Inactive flow mappings removed: {preview.removedFlows.join(', ')||'None'}. Component activities, group counts and non-staffing expenses are preserved.</p>
   <details><summary className="min-h-11 cursor-pointer py-2">Flow mappings, participant assumptions and dependency dates</summary>{preview.next.inputs.capacity!.flows.map(flow=><p key={flow.id}>{flow.path}: {flow.componentIds.map(id=>draft.bundle.components.find(item=>item.id===id)?.name).join('; ')} · group {draft.inputs.groups.find(group=>group.id===flow.groupId)?.label??'External staffing'}.</p>)}{draft.inputs.groups.map(group=><p key={group.id}>{group.label}: {shown(group.count.value)} ({group.count.kind}).</p>)}{draft.inputs.timing.map(timing=><p key={timing.componentId}>{draft.bundle.components.find(item=>item.id===timing.componentId)?.name}: {shown(timing.start.value)} ({timing.start.kind}) to {shown(timing.finish.value)} ({timing.finish.kind}); prerequisites {draft.bundle.components.find(item=>item.id===timing.componentId)?.dependsOn.map(id=>draft.bundle.components.find(item=>item.id===id)?.name).join('; ')||'None'}.</p>)}</details>
   <details><summary className="min-h-11 cursor-pointer py-2">Reconciled shared ledger and review issues</summary><ul>{preview.after.ledger.map(line=><li key={line.id}>{line.label}: {shown(preview.before.ledger.find(old=>old.id===line.id)?.total??null)} → {shown(line.total)} · {line.kind}</li>)}</ul>{preview.after.issues.map(issue=><p key={issue}>{issue}</p>)}</details>
   <p className="text-xs">{preview.notice}</p><label className="flex gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/>I reviewed mappings, dependency dates, participant overlap, shared costs and remaining unknowns for this adoption.</label>
   <button className={button+' bg-primary text-primary-foreground'} disabled={busy||!confirmed||!isCurrent()} onClick={()=>void run(true)}>Accept capacity alternative into draft</button>
  </>}
  {busy&&<p role="status">Verifying the selected search and reconciling the bundle locally…</p>}{notice&&<p role="alert">{notice}</p>}
 </section>;
}
