'use client';
import {useState} from 'react';
import {previewPlanConversation,type PlanConversationRequest,type PlanConversationProposal} from '@/lib/home-plan-conversation';
import type {CombinationReview} from '@/lib/home-plan-combination';
import {PlanAlternativeCard} from '@/components/plan-alternative-card';
import {PlanDirections} from '@/components/plan-directions';
import {planBudgetText} from '@/lib/home-plan-revisions';
import {planStaffEffortText} from '@/lib/home-plan-delivery-estimate';
const button='min-h-11 rounded border px-3 py-2 font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';

export function HomePlanConversationReview({request,proposal,current,onSave,onClose}:{request:PlanConversationRequest;proposal:PlanConversationProposal;current:boolean;onSave:(review:CombinationReview)=>void;onClose:()=>void}) {
 const [participants,setParticipants]=useState(''),[fees,setFees]=useState('');
 const review:CombinationReview={...(participants?{participants:participants as CombinationReview['participants']} :{}),...(fees?{fees:fees as CombinationReview['fees']} :{})};
 const preview=previewPlanConversation(request,proposal,review);
 return <section aria-label="Review saved-plan conversation" className="space-y-3 rounded border border-primary/50 p-3 text-sm">
  <h3 className="font-semibold">{proposal.intent==='compare'?'Saved-plan comparison':'Review proposed plan changes'}</h3>
  <p>Goal: {request.context.goal}</p><p>Your request: {request.text}</p>
  {!current&&<p role="status">The goal, selection or saved plans changed. Send the request again before saving.</p>}
  {proposal.intent==='combine'&&<><p>Overlap stays unknown unless you confirm it. Matching descriptions do not prove shared participants or costs.</p>
   <label className="block">Participant overlap<select className="ml-2 rounded border bg-background p-2" aria-label="Structured participant overlap" value={participants} onChange={event=>setParticipants(event.target.value)}><option value="">Unknown</option><option value="same">Same participants</option><option value="disjoint">Separate groups</option></select></label>
   <label className="block">Cash allowance overlap<select className="ml-2 rounded border bg-background p-2" aria-label="Structured cash overlap" value={fees} onChange={event=>setFees(event.target.value)}><option value="">Unknown</option><option value="distinct">Separate allowances</option><option value="shared-matches">Share exact matches</option></select></label></>}
  {preview.kind==='clarify'&&<p role="status">{preview.question}</p>}
  {preview.kind==='compare'&&<><p>Read-only comparison of saved assumptions. No recommendation ranking or predicted effect.</p><div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">{preview.plans.map(plan=><PlanAlternativeCard key={plan.id} plan={plan} catalog={request.catalog} compact snapshot/>)}</div></>}
  {preview.kind==='proposal'&&<><p>Based on {preview.sources.map(plan=>'Action Plan #'+plan.number+' (revision '+plan.draft.revision+')').join(' and ')}. Originals and attached history remain saved.</p>
   <ul className="list-disc space-y-1 pl-5">{preview.notes.map((note,index)=><li key={index}>{note}</li>)}</ul>
   <PlanDirections draft={preview.draft}/><p>{planBudgetText(preview.result)} Staff effort: {planStaffEffortText(preview.draft)}</p>
   {!!preview.result.issues.length&&<details><summary className="min-h-11 cursor-pointer py-2">Unresolved assumptions ({preview.result.issues.length})</summary><ul className="list-disc pl-5">{preview.result.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul></details>}
   <p>Save creates a new numbered alternative. Apply and Attach remain separate actions.</p><button className={button} disabled={!current} onClick={()=>onSave(review)}>Save as new alternative</button></>}
  <button className={button+' ml-2'} onClick={onClose}>{proposal.intent==='compare'?'Close comparison':'Cancel proposal'}</button>
 </section>;
}
