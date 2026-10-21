import {calculateRequiredStaffing,staffingInputLabels,type StaffingInputField,type RequiredStaffingOption} from '@/lib/required-staffing';
import {staffingDeliveryConflict,type RequiredStaffingReview} from '@/lib/home-required-staffing';
const number=(n:number|null)=>n===null?'Unknown':n.toLocaleString('en-US',{maximumFractionDigits:2});
export function StaffingOptionSummary({option:o,currency,costMonths,deliveryMonths}:{option:RequiredStaffingOption;currency:string|null;costMonths:number|null;deliveryMonths:number|null}){
 return <ul className="list-disc space-y-2 pl-5"><li>Cost: <strong>{number(o.listedCash)} {currency??'currency unknown'}</strong> · {o.completeCash===null?'partial':'scenario total'}{o.budgetStatus==='over'?' · over budget':''}</li><li>Training: <strong>{o.totalTrainingHours!==null?`${number(o.totalTrainingHours)} hours`:o.train?`${number(o.plannedTrainingHours)} hours · partial`:'Not specified'}</strong></li><li>Timing: <strong>{o.readyAfterMonths===null?'Unknown':o.readyAfterMonths===0?'Ready at start':`After ${o.readyAfterMonths} months`}</strong></li><li>Delivery target: {deliveryMonths===null?'Unknown':`${deliveryMonths} months`}</li><li>Cost horizon: {number(costMonths)} months · incremental cash</li><li>Scenario assumptions · unconfirmed</li></ul>;

}
export function HomeRequiredStaffingReview({review,onClear,onPin,disabled,pinned,deliveryMonths=null,deliveryIssue,notes}:{review:RequiredStaffingReview;onClear:()=>void;onPin?:(id:string)=>void;disabled:boolean;pinned?:(id:string)=>number|undefined;deliveryMonths?:number|null;deliveryIssue?:string|null;notes?:string}){
 const r=calculateRequiredStaffing(review.inputs),unit=r.input.currency??'currency unknown';
 const costRecommendation=r.recommendation;
 if(deliveryIssue||r.options.some(o=>o.id===r.recommendation?.optionId&&staffingDeliveryConflict(o,r.input,deliveryMonths)))r.recommendation=null;
 const selected=r.options.find(o=>o.id===r.recommendation?.optionId),missing=[review.inputs.internalRelease===null&&selected&&(selected.train+selected.redeploy)>0?'whether internal staff can be released':null,selected?.readyAfterMonths===null?'readiness dates':null,review.inputs.backfillCostPerInternalPerson===null&&selected&&(selected.train+selected.redeploy)>0?'backfill costs':null].filter(Boolean);
 return <section aria-label="Fixed-role staffing comparison" className="min-w-0 space-y-3 rounded border p-3 text-sm">
  <h3 className="font-semibold">Staffing options</h3>
  {deliveryIssue&&<p role="status">{deliveryIssue}</p>}
  {r.missing.map(line=><p key={line}>{line}</p>)}
  <div className="grid min-w-0 gap-3 md:grid-cols-3">{r.options.map(o=><article key={o.id} aria-label={`Train ${o.train}, redeploy ${o.redeploy}, hire ${o.hire}`} className={`min-w-0 space-y-2 rounded border p-3 ${r.recommendation?.optionId===o.id?'border-primary bg-muted/30':''}`}>
   {r.recommendation?.optionId===o.id&&<p className="text-xs font-semibold">Recommended</p>}
   <h4 className="font-semibold">{[o.redeploy?`Redeploy ${o.redeploy}`:null,o.train?`Train ${o.train}`:null,o.hire?`Hire ${o.hire}`:null].filter(Boolean).join(' · ')}</h4>
   {staffingDeliveryConflict(o,r.input,deliveryMonths)&&<p role="status">Misses the {deliveryMonths}-month delivery target.</p>}
   <StaffingOptionSummary option={o} currency={r.input.currency} costMonths={r.input.months} deliveryMonths={deliveryMonths}/>
   {r.recommendation?.optionId===o.id&&onPin&&<button type="button" className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" disabled={disabled||!!pinned?.(o.id)||o.coverage==='not-met'||o.budgetStatus==='over'} onClick={()=>onPin(o.id)}>{pinned?.(o.id)?`Pinned Action Plan #${pinned(o.id)}`:'Pin Action Plan'}</button>}
  </article>)}</div>
  {!!missing.length&&<p className="text-sm">If you tell me {missing.join(', ')}, I can update the plans and recommendation.</p>}
  <details><summary className="min-h-11 cursor-pointer py-2">Assumptions &amp; caveats</summary><div className="space-y-2">
   {notes&&<p className="whitespace-pre-wrap">{notes}</p>}
   <p>{number(r.input.requiredRoles)} required people · {r.input.role??'Role unknown'}. Correct inputs in chat.</p>
   {costRecommendation&&<p>Cost-only comparison: {costRecommendation.text} Next step: {costRecommendation.nextStep}</p>}
   {r.options.map(o=><section key={o.id}><h4 className="font-semibold">Train {o.train} · redeploy {o.redeploy} · hire {o.hire}</h4><p>{o.coveredRoles} roles allocated; actual people and skills are unverified. Complete cash: {number(o.completeCash)} {unit}. Coverage: {o.coverage}.</p>{o.newHireTrainingUnspecified&&<p>{number(o.plannedTrainingHours)} planned training hours; new-hire training requirements remain unknown.</p>}{o.unknowns.map(line=><p key={line}>{line}</p>)}</section>)}
   <p>{r.enumerated} combinations evaluated; up to three representative comparisons shown. Company population is not used to derive this requirement. Cost horizon is not a delivery target.</p><ul className="list-disc pl-5">{Object.entries(review.origins).map(([field,basis])=><li key={field}>{staffingInputLabels[field as StaffingInputField]}: {String(review.inputs[field as StaffingInputField]??'Unknown')} · {basis.kind.replaceAll('-',' ')} — {basis.explanation}{basis.quote?` “${basis.quote}”`:''}</li>)}</ul>{r.limitations.map(line=><p key={line}>{line}</p>)}
   <button type="button" className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" disabled={disabled} onClick={onClear}>Clear staffing comparison</button>
  </div></details>
 </section>;
}
