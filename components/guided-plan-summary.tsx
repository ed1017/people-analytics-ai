import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import {guidedPlanSummary} from '@/lib/guided-plan-summary';
export function GuidedPlanSummary({draft}:{draft:BundleDraft}){
 const summary=guidedPlanSummary(draft);if(!summary)return null;
 const n=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
 return <section aria-label="Selected workforce choice" className="space-y-1 rounded border p-3 text-sm">
  <p><strong>{summary.mix.build} develop / {summary.mix.move} move / {summary.mix.buy} hire</strong></p>
  <p>Incremental cash: {summary.cash===null?'Unknown':'$'+n(summary.cash)+' USD'}. Conditional readiness: {summary.ready??'Unknown'}.</p>
  <p>Uncovered work over this period: {summary.effort?n(summary.effort.shortfallHours)+' hours':'Unknown'}. End-date role coverage does not erase earlier shortfalls.</p>
  <p className="text-xs">Saved or reviewed assumptions only. Partial readiness months are excluded; availability, release, skill readiness and funding remain unverified.</p>
 </section>;
}
