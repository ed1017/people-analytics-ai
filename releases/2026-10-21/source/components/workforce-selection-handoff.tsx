"use client";
import {useEffect,useEffectEvent,useState} from "react";
import {decisionStore} from "@/components/decision-store";
import {createWorkforceSelectionSession} from "@/lib/workforce-selection-session";
import type {WorkforceSelectionContext,StagedWorkforceMixSelection} from "@/lib/workforce-mix-selection";
import type {WorkforceMixSearch} from "@/lib/workforce-mix-search";
import type {WorkforcePlanInput} from "@/lib/workforce-increment";

/** Host contract for locally generated selections; no endpoint or model transport. */
export type WorkforceSelectionOffer = {
 snapshot: WorkforceMixSearch;
 selectedIds: string[];
 verify: (context: WorkforceSelectionContext, snapshot: unknown, ids: string[], signal?: AbortSignal) => Promise<StagedWorkforceMixSelection>;
};
const button="min-h-10 rounded border px-3 py-2 text-sm disabled:opacity-50";
export function WorkforceSelectionHandoff({offer,currentContext,onReplace}:{offer:WorkforceSelectionOffer;currentContext:()=>WorkforceSelectionContext;onReplace:(drafts:WorkforcePlanInput[],offer:WorkforceSelectionOffer)=>void}) {
 const [session]=useState(()=>createWorkforceSelectionSession(offer.verify));
 const [view,setView]=useState(session.getState),[notice,setNotice]=useState('');
 const refreshContext=useEffectEvent(()=>{try{session.setContext(currentContext())}catch{session.cancel()}setView(session.getState())});
 useEffect(()=>{
  // Subscribe outside React rendering so even batched A → B → A publications invalidate replies.
  const unsubscribe=decisionStore.subscribe(()=>refreshContext());
  return()=>{unsubscribe();session.cancel()};
 },[session]);
 async function review(){
  try{session.setContext(currentContext())}catch{session.cancel();setView(session.getState());setNotice('Saved inputs or evidence changed; select again.');return}
  setNotice('');const request=session.select(offer.snapshot,offer.selectedIds);setView(session.getState());
  await request;setView(session.getState());
 }
 async function replace(){
  const staged=session.getState().proposal;
  if(!staged)return;
  try{session.setContext(currentContext())}catch{session.cancel();setView(session.getState());return}
  // Recompute once more at the explicit handoff, rather than trust displayed/stored input proposals.
  const request=session.select(offer.snapshot,staged.selectedIds);setView(session.getState());const applied=await request;
  const next=session.getState();
  if(applied&&next.status==='staged'&&JSON.stringify(next.proposal)===JSON.stringify(staged)) {
   try{currentContext();onReplace(structuredClone(staged.revisions),offer);session.cancel();setNotice('Selected mixes opened as temporary drafts. Calculate explicitly after reviewing or editing.')}catch{session.cancel();setNotice('Saved inputs or evidence changed; select again.')}
  }
  setView(session.getState());
 }
 return <section aria-label="Selected scenario handoff" className="space-y-3 rounded border p-3">
  <h4 className="font-semibold">Selected scenario mixes</h4>
  <p>Review one or two selections before replacing the temporary alternatives below. Existing draft edits will be replaced only when you choose Replace alternative drafts.</p>
  <p>Feasibility is conditional on entered assumptions. Candidate pools are not assignable employees; operational capacity remains unverified.</p>
  <button className={button} disabled={view.status==='checking'} onClick={()=>void review()}>Review selected mixes</button>
  {view.status==='checking'&&<p role="status">Checking selections against saved inputs and evidence…</p>}
  {view.status==='rejected'&&<p role="status">Selections are stale, invalid or incomplete. Revisit the comparison before staging.</p>}
  {view.proposal&&<div className="space-y-2">
   <p>Only Build, Move and external-hire counts change. Demand, budget, employee limit, deadline, dates, backfills, rates, training cash/hours and total internal uplift stay fixed. Path totals are not scaled per person.</p>
   <ul className="list-disc pl-5">{view.proposal.revisions.map((draft,index)=><li key={index}>Alternative {index+1}: Build {draft.build}, Move {draft.move}, external hires {draft.buy}; backfills {draft.backfills||'Unknown'}, Build month {draft.buildMonth||'Unknown'}, Move month {draft.moveMonth||'Unknown'}, training cash USD {draft.trainingCash||'Unknown'}, training hours {draft.trainingHours||'Unknown'}.</li>)}</ul>
   <p>Review the full assumptions in the draft fields after handoff. Recalculate any edits before saving a review. Your original plan and version-specific approvals stay unchanged.</p>
   <button className={button} onClick={()=>void replace()}>Replace alternative drafts</button>
  </div>}
  {(view.status==='checking'||view.proposal)&&<button className={button} onClick={()=>{session.cancel();setView(session.getState());setNotice('Selection cancelled. Existing alternative drafts are unchanged.')}}>Cancel selected mixes</button>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
