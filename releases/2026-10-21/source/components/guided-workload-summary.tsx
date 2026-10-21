import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import {guidedWorkloadResult} from '@/lib/guided-workload';
const show=(n:number|null)=>n===null?'Unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
export function GuidedWorkloadSummary({draft}:{draft:BundleDraft}){
 const result=guidedWorkloadResult(draft.inputs);if(!result)return null;
 return <section aria-label="Modeled workload and capacity" className="rounded border bg-card p-3 text-sm space-y-2">
 <h3 className="font-semibold">Workload → qualified capacity → staffing gap</h3>
 <p>Scenario only, over {draft.inputs.scope.months.value} months. Existing group: {show(draft.inputs.guidedWorkload!.existingPeople.value)} people → {show(result.contractedFte)} contracted FTE → {show(result.allocatedFte)} allocated FTE → {show(result.qualifiedAllocatedFte)} qualified allocated FTE.</p>
 {result.status==='calculated'?<><p>Workload: <strong>{show(result.workloadHours)} hours</strong>. Existing qualified productive capacity: <strong>{show(result.capacityHours)} hours</strong>. Gap: <strong>{show(result.gapHours)} hours / {show(result.additionalFte)} FTE</strong>, rounded up to <strong>{show(result.additionalRoles)} additional whole roles</strong>.</p>{result.additionalRoles===0&&<p>No additional staffing is required by these assumptions. The staffing comparison needs positive additional demand; no hiring recommendation is inferred.</p>}</>:<p role="status">Workload result unavailable: {result.missing.join(' ')}</p>}
 <details><summary className="min-h-11 cursor-pointer py-2">Calculation and limits</summary><p>Workload = monthly units × hours per unit × months. Existing capacity = people × contracted FTE/person × allocation × required-proficiency coverage × productive hours/FTE/month × months. Additional roles are assumed to be full-time, fully allocated and qualified only after their readiness dates.</p><p>Developing or moving existing employees does not increase company headcount. Those separate pools contribute no baseline hours here before readiness; training time is tracked separately, not subtracted twice. Task exposure and automation effects are not modeled. Realized capacity, service levels and measured outcomes are unknown. No peak-load or attrition model is included.</p></details>
 </section>;
}
