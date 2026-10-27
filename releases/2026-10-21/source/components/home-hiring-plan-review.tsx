'use client';
import {useState} from 'react';
import type {useHomeSolutionConversation} from './use-home-solution-conversation';
import {ActionPlanQuickSummary} from './action-plan-quick-summary';
import {canReviewCostedHiringPlan,canReviewConditionalHiringPlan,conditionalHiringSteps,hiringPlanIdentity} from '@/lib/home-hiring-plan';
type Controller=ReturnType<typeof useHomeSolutionConversation>;
const button='min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50';
export function HomeHiringPlanReview({controller}:{controller:Controller}){
 const [count,setCount]=useState(''),[review,setReview]=useState<Awaited<ReturnType<Controller['reviewHiringPlan']>>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const source=controller.state.hiringBudget;if(!source)return null;
 const conditional=!canReviewCostedHiringPlan(source);
 if(conditional&&!canReviewConditionalHiringPlan(source))return null;
 const externalHires=Number(count||source.inputs.hires),current=review?.key===JSON.stringify(source)&&(conditional?review.selection.receipt.version===2:review.selection.receipt.version===1&&review.selection.receipt.externalHires===externalHires)?review:null,disabled=controller.hiringEditorDirty||busy||controller.pending||controller.saving||!controller.canSend;
 const selected=current?controller.saved?.plans.find(plan=>!plan.deleted&&plan.draft.inputs.hiringPlan&&hiringPlanIdentity(plan.draft.inputs.hiringPlan)===hiringPlanIdentity(current.selection.receipt)):null;
 if(conditional){
  const content=<><p><strong>Next action:</strong> {conditionalHiringSteps[0]}</p><p><strong>Suggested owners · unconfirmed:</strong> Hiring owner and Finance</p><details><summary className="min-h-11 cursor-pointer py-2">Plan details</summary><p>{conditionalHiringSteps[1]}</p><p>Incremental hiring cash and recruiting effort remain unverified. No staffing, funding or operational approval is implied.</p></details>
   <button className={button} disabled={disabled} onClick={async()=>{setBusy(true);setError('');try{setReview(await controller.reviewHiringPlan(null));}catch(e){setError(e instanceof Error?e.message:'Review the current estimate.');}finally{setBusy(false);}}}>Review conditional hiring plan</button>
   {controller.hiringEditorDirty&&<p>Update the hiring estimate or explicitly discard its edits before reviewing or pinning.</p>}
   {error&&<p role="alert">{error}</p>}
   {current&&<section aria-label="Reviewed conditional hiring plan" className="space-y-2"><details><summary className="min-h-11 cursor-pointer py-2">Reviewed receipt</summary><p>{current.selection.brief}</p><p>Input revision {source.revision}; exact user/model provenance is retained.</p></details><button className={button} disabled={disabled||!!selected} onClick={()=>void controller.saveHiringPlan(current)}>{selected?`Pinned Action Plan #${selected.number}`:'Save hiring plan'}</button></section>}
  </>;
  return controller.state.conditionalHiringPlan?<section aria-label="Conditional hiring plan review" className="space-y-2">{content}</section>:<details><summary className="min-h-11 cursor-pointer py-2">Conditional hiring plan</summary><div className="space-y-2">{content}</div></details>;
 }
 return <details className="rounded border p-3 text-sm"><summary className="min-h-11 cursor-pointer py-2">Review hiring route as an Action Plan</summary>
 <p>Retains the required {source.inputs.hires} roles. Any remaining roles need separately verified internal coverage; they are not assumed filled.</p>
 <label className="block">External hires in the reviewed route<input disabled={disabled} type="number" min="1" max={source.inputs.hires??undefined} value={count||String(source.inputs.hires??'')} onChange={e=>{setCount(e.target.value);setReview(null);}} className="ml-2 min-h-11 rounded border p-2"/></label>
 <button className={button} disabled={disabled} onClick={async()=>{setBusy(true);setError('');try{setReview(await controller.reviewHiringPlan(Number(count||source.inputs.hires)));}catch(e){setError(e instanceof Error?e.message:'Review the current estimate.');}finally{setBusy(false);}}}>Review hiring plan</button>
 {controller.hiringEditorDirty&&<p>Update the hiring estimate or explicitly discard its edits before reviewing or pinning.</p>}
 {error&&<p role="alert">{error}</p>}
 {current&&<section aria-label="Reviewed hiring plan" className="space-y-3"><ActionPlanQuickSummary draft={current.selection.draft} result={current.selection.result}/><details><summary className="min-h-11 cursor-pointer">Plan brief and provenance</summary><p>{current.selection.brief}</p><p>Input revision {source.revision}; original user and proposed input provenance is retained in the saved receipt.</p></details><button className={button} disabled={disabled||!!selected} onClick={()=>void controller.saveHiringPlan(current)}>{selected?`Pinned Action Plan #${selected.number}`:'Pin hiring plan with unknowns'}</button></section>}
 </details>;
}
