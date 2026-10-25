// @ts-expect-error Native Node checks share this source.
import {createSwpDemo, compareSwpDemo, guidedOptionEffort} from './swp-demo.ts';
// @ts-expect-error Native Node checks share this source.
import {guidedWorkloadResult} from './guided-workload.ts';
// @ts-expect-error Native Node checks share this source.
import {staffingCashBreakdown} from './guided-plan-summary.ts';
// @ts-expect-error Native Node checks share this source.
import {staffingOptionLabel} from './staffing-option-label.ts';

/** Read-only presentation of the existing fictional scenario; no storage or API. */
export async function decisionLandingExample() {
  const draft=await createSwpDemo('guided-landing','2026-09-30T12:00:00Z');
  const comparison=await compareSwpDemo(draft);
  const workload=guidedWorkloadResult(draft.inputs);
  if(workload?.status!=='calculated'||!workload.productiveHoursInHorizon||workload.workloadHours===null)throw Error('Workload unavailable');
  const options=comparison.options.filter(option=>!option.candidate.isReferenceMix&&option.candidate.status==='met').map(option=>{
    const cash=staffingCashBreakdown(option.draft,option.candidate.cash),effort=guidedOptionEffort(option);
    if(cash.total===null||cash.lines.some(line=>line.total===null)||cash.lines.reduce((sum,line)=>sum+(line.total??0),0)!==cash.total||option.draft.inputs.scope.currency!=='USD'||cash.months!==draft.inputs.scope.months.value||cash.start!==draft.inputs.scope.startMonth.value)throw Error('Comparable cash evidence unavailable');
    return {id:option.id,label:staffingOptionLabel(option.candidate.mix),mix:option.candidate.mix,cash,uncoveredHours:effort?.shortfallHours??null};
  });
  if(options.length<2||options.some(option=>option.cash.end!==options[0].cash.end))throw Error('Comparable options unavailable');
  return {requiredFte:workload.workloadHours/workload.productiveHoursInHorizon,qualifiedFte:workload.qualifiedAllocatedFte,gapFte:workload.additionalFte,existingPeople:draft.inputs.guidedWorkload!.existingPeople.value,budget:draft.inputs.budget!.amount.value,currency:'USD' as const,options};
}
export type DecisionLandingExample=Awaited<ReturnType<typeof decisionLandingExample>>;
