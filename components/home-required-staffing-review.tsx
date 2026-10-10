import {calculateRequiredStaffing,staffingInputLabels,type StaffingInputField} from '@/lib/required-staffing';
import type {RequiredStaffingReview} from '@/lib/home-required-staffing';
const number=(n:number|null)=>n===null?'Unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
export function HomeRequiredStaffingReview({review,onClear,disabled}:{review:RequiredStaffingReview;onClear:()=>void;disabled:boolean}){
 const r=calculateRequiredStaffing(review.inputs),unit=r.input.currency??'currency unknown';
 return <section aria-label="Fixed-role staffing comparison" className="min-w-0 space-y-3 rounded border p-3 text-sm">
  <h3 className="font-semibold">Staffing options</h3><p>{number(r.input.requiredRoles)} required people · {r.input.role??'Role unknown'} · {number(r.input.months)} months</p>
  <p>Calculated from your stated scenario. Correct inputs in chat.</p>
  {r.missing.map(line=><p key={line}>{line}</p>)}
  <div className="grid min-w-0 gap-3 md:grid-cols-3">{r.options.map(o=><article key={o.id} aria-label={`Train ${o.train}, redeploy ${o.redeploy}, hire ${o.hire}`} className="min-w-0 space-y-2 rounded border p-3">
   <h4 className="font-semibold">{[o.redeploy?`Redeploy ${o.redeploy}`:null,o.train?`Train ${o.train}`:null,o.hire?`Hire ${o.hire}`:null].filter(Boolean).join(' · ')}</h4>
   <p>Known incremental cash: <strong>{number(o.listedCash)} {unit}</strong>{o.completeCash===null?' (subtotal)':''}{o.budgetStatus==='over'?' · over budget':''}</p>
   <p>{o.totalTrainingHours!==null?`Training in this scenario: ${number(o.totalTrainingHours)} hours.`:o.train?`Planned training: ${number(o.plannedTrainingHours)} hours.`:'Training: Not specified.'}{o.train>0&&o.newHireTrainingUnspecified?' New-hire training: Not specified.':''}</p>
   <p>Readiness: {o.readyAfterMonths===null?'Unknown':o.readyAfterMonths===0?'Assumed ready at period start':`After ${o.readyAfterMonths} months`}. Coverage: {o.coverage}.</p>
   <details><summary className="min-h-11 cursor-pointer py-2">Cost and coverage details</summary><p>{o.coveredRoles} roles allocated; actual people and skills are unverified. Complete cash: {number(o.completeCash)} {unit}.</p>{o.newHireTrainingUnspecified&&<p>{number(o.plannedTrainingHours)} planned training hours are included in this scenario; new-hire training requirements remain unknown.</p>}{o.unknowns.map(line=><p key={line}>{line}</p>)}</details>
  </article>)}</div>
  {r.recommendation?<p><strong>Recommendation:</strong> {r.recommendation.text} <strong>Next step:</strong> {r.recommendation.nextStep}</p>:<p>Confirm the missing costs or constraints before choosing an option.</p>}
  <details><summary className="min-h-11 cursor-pointer py-2">Assumptions and calculation limits</summary><p>{r.enumerated} combinations evaluated; up to three representative comparisons shown. Company population is not used to derive this requirement.</p><ul className="list-disc pl-5">{Object.entries(review.origins).map(([field,basis])=><li key={field}>{staffingInputLabels[field as StaffingInputField]}: {String(review.inputs[field as StaffingInputField]??'Unknown')} · {basis.kind.replaceAll('-',' ')} — {basis.explanation}{basis.quote?` “${basis.quote}”`:''}</li>)}</ul>{r.limitations.map(line=><p key={line}>{line}</p>)}</details>
  <button type="button" className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" disabled={disabled} onClick={onClear}>Clear staffing comparison</button>
 </section>;
}
