import {StaffingOptionCost} from './staffing-option-cost';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import {guidedPlanSummary} from '@/lib/guided-plan-summary';
export function GuidedPlanSummary({draft,compact=false}:{draft:BundleDraft;compact?:boolean}){
 const summary=guidedPlanSummary(draft);if(!summary)return null;
 const n=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
 return <section aria-label="Selected workforce choice" className="space-y-1 rounded border p-3 text-sm">
  <p><strong>{summary.mix.build} develop / {summary.mix.move} move / {summary.mix.buy} hire</strong></p>
  <p>Incremental cash: {summary.cash===null?'Unknown':'$'+n(summary.cash)+' USD'}. Conditional readiness: {summary.ready??'Unknown'}.</p>
  <p>Uncovered work over this period: {summary.effort?n(summary.effort.shortfallHours)+' hours':'Unknown'}. End-date role coverage does not erase earlier shortfalls.</p>
  {summary.target&&(compact?<div aria-label="Conditional capacity target">
   <p><strong>Scenario target:</strong> {summary.target.roles} whole roles by {summary.target.deadline}.</p>
   <p>{summary.target.population} · {summary.target.metric}. Roles are not added company headcount.</p>
   <p>Starting qualified capacity assumption: {summary.target.baselineFte??'Unknown'} FTE. This is the scenario input, not measured capacity.</p><p><strong>Still unverified:</strong> Measured baseline and later outcome for additional-role delivery. Availability, source-team release, skill readiness and funding need confirmation. Proposed milestones do not prove capacity achieved.</p>
   <details><summary className="min-h-11 cursor-pointer py-2 font-medium">Measurement details and assumptions</summary>{summary.target.lines.filter((_,index)=>index===2||index===3||index===5).map(line=><p key={line}>{line}</p>)}<p>Partial readiness months are excluded.</p></details>
  </div>:<div aria-label="Conditional capacity target">{summary.target.lines.map(line=><p key={line}>{line}</p>)}</div>)}
  <StaffingOptionCost draft={draft} cash={summary.cashBreakdown}/>
  {!compact&&<p className="text-xs">Saved or reviewed assumptions only. Partial readiness months are excluded; availability, release, skill readiness and funding remain unverified.</p>}
 </section>;
}
