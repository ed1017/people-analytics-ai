"use client";
import {readPlanAlternatives} from '@/lib/home-plan-alternatives';
import {PlanAlternativeCard} from '@/components/plan-alternative-card';
import {PlanDirections} from '@/components/plan-directions';
import {readBundleWorkspace,type BundleAttachment} from '@/lib/home-bundle-records';
import {planStaffHours} from '@/lib/home-plan-delivery-estimate';
import {planBudgetText} from '@/lib/home-plan-revisions';
import {bundleInputKey} from '@/lib/home-bundle-reconciliation';
import {bundleDisplayText,bundleAssumptionText,bundleComponentLabels} from '@/lib/home-bundle-display';
import {measurementScope,successMeasureText} from '@/lib/home-success-measures';

const money=(value:number|null)=>value===null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
export function AttachedActionPlansBrief({raw,alternatives,goalId,goal,onReview}:{alternatives?:unknown;raw:unknown;goalId:string;goal:string;onReview:()=>void}){
 const workspace=readBundleWorkspace(raw,goalId),savedGoal=alternatives&&typeof alternatives==='object'&&'goal' in alternatives&&typeof alternatives.goal==='string'?alternatives.goal:goal,catalog=readPlanAlternatives(alternatives,{goalId,goal:savedGoal});
 const superseded=new Set(workspace?.attachments.map(item=>item.supersedes));
 function snapshot(item:BundleAttachment){
  const {draft,result}=item,measure=draft.inputs.successMeasure;
  const edited=workspace?.drafts.some(saved=>saved.bundle.id===draft.bundle.id&&bundleInputKey(saved)!==bundleInputKey(draft));
  return <article key={item.id} className="min-w-0 space-y-2 rounded border p-3 text-sm">
   <h3 className="break-words font-semibold">{draft.bundle.name} · revision {draft.revision}</h3>
   <p>Attached {item.attachedAt.slice(0,10)} · {superseded.has(item.id)?'Previous attached version':'Latest attached version'}</p>
   {draft.binding.goal!==goal&&<p className="font-medium">Goal wording has changed since this attachment.</p>}
   {edited&&!superseded.has(item.id)&&<p>A different working draft is saved on Home. This attachment has not been replaced by that draft.</p>}
   <p className="break-words">Saved goal: {draft.binding.goal}</p>
   <p className="break-words">{bundleDisplayText(draft.bundle.objective,draft.bundle)}</p>
   <PlanDirections draft={draft} snapshot/>
   <p>Snapshot cash: {money(result.cashTotal)}. Staff hours: {planStaffHours(draft)??'Unknown'}. Plan finish: {result.planFinish??'Unknown'}.</p>
   {result.budget&&<p>{planBudgetText(result)}</p>}
   <p className="break-words">How success is measured: {successMeasureText(measure,!measure||measure.scopeKey===measurementScope(draft.inputs))}</p>
   {measure?.baseline.basis&&<p className="break-words text-xs">Saved baseline provenance: {measure.baseline.basis}</p>}
   <details><summary className="min-h-11 cursor-pointer py-2 font-medium">Saved assumptions, activities and unknowns</summary><div className="space-y-3 pt-2">
    <p>Population — {bundleAssumptionText(draft.inputs.scope.population)}. Start — {bundleAssumptionText(draft.inputs.scope.startMonth)}. Duration — {bundleAssumptionText(draft.inputs.scope.months)} months.</p>
    <p>{bundleDisplayText(draft.bundle.coordination,draft.bundle)}</p>
    <ol className="list-decimal space-y-2 pl-5">{draft.bundle.components.map(component=><li key={component.id} className="break-words"><strong>{component.name}</strong>: {bundleDisplayText(component.firstStep,draft.bundle)}<p>Proposed owner: {component.ownerRole}. Prerequisites: {component.dependsOn.length?bundleComponentLabels(component.dependsOn,draft.bundle):'None recorded'}.</p></li>)}</ol>
    <p>{result.issues.length?'Unresolved at attachment:':'No unresolved calculation inputs recorded; operational feasibility still needs review.'}</p>
    {!!result.issues.length&&<ul className="list-disc space-y-1 pl-5">{result.issues.map((issue,i)=><li key={i}>{bundleDisplayText(issue,draft.bundle)}</li>)}</ul>}
    <p>{draft.bundle.limitation}</p>
   </div></details>
  </article>;
 }
 return <section aria-label="Attached Action Plans" className="min-w-0 space-y-3 rounded-lg border p-4">
  <h2 className="text-lg font-semibold">Attached Action Plans</h2>
  <p className="text-sm text-muted-foreground">Saved proposal snapshots from Home. Attachment is not approval or evidence of achieved outcomes. These historical assumptions are not revalidated against current evidence here; review the plan on Home before acting.</p>
  {alternatives!==undefined&&!catalog&&<p role="status">Saved numbered alternatives cannot be verified. Their records are kept unchanged.</p>}
  {catalog?.attachments.map(item=>{const plan=catalog.plans.find(plan=>plan.id===item.planId)!;return <div key={item.id}><p>Attached {item.attachedAt.slice(0,10)}{savedGoal!==goal?' · goal wording has changed':''}{plan.deleted?' · removed from active list':''}</p><PlanAlternativeCard plan={plan} catalog={catalog} snapshot/></div>;})}
  {!workspace?<p role="status">Saved Action Plan records cannot be verified. They are kept unchanged; review them on Home.</p>:!workspace.attachments.length&&!catalog?.attachments.length?<p className="text-sm">No Action Plan attached to this goal yet. Review and attach a calculated plan on Home to include it here.</p>:<>
   {workspace.attachments.filter(item=>!superseded.has(item.id)).map(snapshot)}
   {workspace.attachments.some(item=>superseded.has(item.id))&&<details><summary className="min-h-11 cursor-pointer py-2 font-medium">Previous attached versions</summary><div className="space-y-3">{workspace.attachments.filter(item=>superseded.has(item.id)).map(snapshot)}</div></details>}
  </>}
  <button className="min-h-11 rounded border px-3 py-2 text-sm font-medium" onClick={onReview}>Review Action Plans on Home</button>
 </section>;
}
