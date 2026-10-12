import type {ReactNode} from 'react';
import {ActionPlanQuickSummary} from './action-plan-quick-summary';
import {PlanReviewNextStep} from './plan-review-next-step';
import {HistoricalMetricContext} from './historical-metric-context';
import type {BundleDraft,BundleResult} from '@/lib/home-bundle-reconciliation';
import {homePlanSummary,planSummarySentences} from '@/lib/home-plan-summary';
import {bundleAssumptionText,bundleDisplayText,bundleHorizonEnd} from '@/lib/home-bundle-display';

/** Read-only presentation of the supplied revision; never adopts or rewrites a snapshot. */
export function HomePlanSummary({draft,result,measurePack,children,savedBudgetText}:{draft:BundleDraft;result?:BundleResult|null;measurePack?:unknown;children?:ReactNode;savedBudgetText?:string}){
 const end=bundleHorizonEnd(draft.inputs.scope).value,lastFinish=draft.inputs.timing.map(item=>item.finish.value).filter((date):date is string=>!!date).sort().at(-1);
 const isBudgetText=(item:string)=>/Budget limit|Budget feasibility|over the limit|headroom under/.test(item);
 const sections=homePlanSummary(draft,result,measurePack).map(section=>savedBudgetText&&section.heading==='Cost'?{...section,items:[...section.items.filter(item=>!isBudgetText(item)),savedBudgetText]}:section);
 const measurement=sections.find(section=>section.heading==='How success is measured')!;
 const budget=sections.find(section=>section.heading==='Cost')!.items.filter(item=>item===savedBudgetText||isBudgetText(item));
 return <section aria-label="Plan overview" className="min-w-0 space-y-1 text-sm">
  <ActionPlanQuickSummary draft={draft} result={result}/>
  <p aria-label="Plan description"><strong>Proposed approach:</strong> {bundleDisplayText(draft.bundle.objective,draft.bundle,draft.inputs)}</p>
  <section aria-label="Goal and success measure" className="space-y-1">
   <p>{measurement.items[0]}</p><p>{measurement.items.slice(1).join(' ')}</p>
  </section>
  {budget.length>0&&<div aria-label="Plan budget check" className="space-y-1">{budget.map(item=><p key={item}>{item}</p>)}</div>}
  {lastFinish&&end&&lastFinish>end&&<p role="alert">Proposed component dates extend beyond the shared horizon. Review the actual dates before calculating.</p>}
  {!!result?.issues.length&&<p role="status">Unresolved calculation inputs: {result.issues.length}. Review the assumptions before acting.</p>}
  {draft.bundle.components[0]&&<p><strong>First action:</strong> {bundleDisplayText(draft.bundle.components[0].firstStep,draft.bundle,draft.inputs)} <strong>Proposed owner:</strong> {draft.bundle.components[0].ownerRole}.</p>}
  <p>Proposal · effects, owners and funding unconfirmed.</p>
  <p><strong>Before starting:</strong> Confirm owner, baseline, target and review date.</p>
  <p aria-label="Plan population and source scope" className="text-xs">
   <span>Plan population: {bundleAssumptionText(draft.inputs.scope.population)}.</span>{' '}
   <span>Planning period: {bundleAssumptionText(draft.inputs.scope.startMonth)} / {bundleAssumptionText(draft.inputs.scope.months)} months.</span>{' '}
   <span>Business unit: {bundleAssumptionText(draft.inputs.scope.businessUnit)}.</span>{' '}
   <span>Workforce evidence has not verified this plan scope.</span>
  </p>
  {draft.inputs.scope.requirements.value&&<section aria-label="Planning constraints"><strong>Planning constraints:</strong><ul className="mt-1 list-disc space-y-1 pl-5">{planSummarySentences(draft.inputs.scope.requirements.value).map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
  <details key={JSON.stringify([draft.binding,draft.bundle.id,draft.revision])}>
   <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Plan details and assumptions</summary>
   <ul aria-label="Selected plan summary" className="space-y-3">
    {sections.map(section=><li key={section.heading} className="min-w-0 break-words rounded-xl border bg-muted/40 p-4">
     <strong>{section.heading}:</strong>
     <ul aria-label={section.label??section.heading} className="mt-1 list-disc space-y-1 pl-5">
      {section.items.map((item,index)=><li key={index}>{item}</li>)}
     </ul>
    </li>)}
   </ul>
   {children}
   <PlanReviewNextStep goal={draft.binding.goal}/>
   <HistoricalMetricContext goal={draft.binding.goal} measure={draft.inputs.successMeasure} detailsOnly/>
  </details>
 </section>;
}
