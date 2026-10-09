'use client';
import {useState} from 'react';
import {PlanningCalculatorDialog} from './planning-calculator-dialog';
import {SWP_DEMAND_MODE,illustrativeServiceReview,demandQuantityFields,type DemandContext} from '@/lib/swp-demand';
import {reviewDemandEditor,demandEditorLabels,demandInputSourceLabel,type DemandEditorDraft} from '@/lib/swp-demand-editor';

const context:DemandContext={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-standalone-illustration',datasetToken:'illustration-only:0',boundGoal:{id:'',statement:''},revision:1};
const initial=()=>illustrativeServiceReview(context,'2026-10-08T00:00:00Z');
const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring';

/** An isolated deterministic illustration: no chat, API, storage or plan mutation. */
export function PlanningAssumptionIllustration({launcherOnly=false}:{launcherOnly?:boolean}){
 const [review,setReview]=useState(initial),[editing,setEditing]=useState(false),[notice,setNotice]=useState('');
 function update(draft:DemandEditorDraft){
  const next=reviewDemandEditor(review,draft,context,'assumption-editor-'+crypto.randomUUID());
  setReview(next);setEditing(false);setNotice('Planning inputs reviewed and illustration recalculated. Your entries remain unverified user-supplied inputs.');
 }
 const result=review.result;
 const content=<div className="min-w-0 space-y-5">
  <header className="space-y-2"><h1 className="text-2xl font-semibold">Planning Calculator</h1><p>Try a managed-services workload illustration. Review planning inputs and see how the estimated capacity gap changes.</p><p className="text-sm text-muted-foreground">This fictional service-analyst example uses no employee or project data. Changes last while this page is open; they do not update a saved goal, plan or workforce dataset.</p></header>
  <section aria-label="Planning input types" className="space-y-2 rounded border p-4 text-sm"><h2 className="font-semibold">Actuals, estimates and assumptions</h2><dl className="space-y-2"><div><dt className="font-medium">Actuals</dt><dd>Observed values supported by a dated source for the relevant scope and period.</dd></div><div><dt className="font-medium">Estimates and forecasts</dt><dd>Expected or projected values, with their method, period and uncertainty stated.</dd></div><div><dt className="font-medium">Assumptions</dt><dd>Chosen scenario inputs used to explore a possible outcome.</dd></div></dl><p>This illustration starts with fictional assumptions. Manually entered values retain user-supplied provenance; this page does not import or verify actuals. Calculated results are conditional estimates, not observed outcomes.</p></section>
  <section aria-label="Reviewed workload illustration" className="space-y-3 rounded border p-4">
   <h2 className="font-semibold">{number(review.spec.contracts.value)} proposed managed-services contracts</h2>
   <p>{review.spec.scope} · {review.spec.startMonth} · {review.spec.months} months</p>
   {result.status==='calculated'?<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div><dt>Workload over the horizon</dt><dd className="text-lg font-semibold">{number(result.workloadHours)} hours</dd></div>
    <div><dt>Available productive capacity</dt><dd className="text-lg font-semibold">{number(result.capacityHours)} hours</dd></div>
    <div><dt>Uncovered workload</dt><dd className="text-lg font-semibold">{number(result.gapHours)} hours</dd></div>
    <div><dt>Additional whole roles implied</dt><dd className="text-lg font-semibold">{number(result.additionalRoles)}</dd></div>
   </dl>:<div role="status"><p>Some planning inputs need clarification before calculating.</p><ul className="list-disc pl-5">{result.missing.map(value=><li key={value}>{value}</li>)}</ul></div>}
   <p className="text-sm">Roles describe a conditional effort gap, not a hiring recommendation. Internal release, manager time, delivery coverage, skills and costs need a separate review.</p>
   <details><summary className="min-h-11 cursor-pointer py-2">Reviewed inputs and their sources</summary><dl className="space-y-3">{demandQuantityFields.map(field=><div key={field}><dt className="font-medium">{demandEditorLabels[field]}</dt><dd>{number(review.spec[field].value)}{review.spec[field].period?` per ${review.spec[field].period}`:''} · {demandInputSourceLabel(review.spec[field].basis.kind)}</dd><dd className="text-sm">{review.spec[field].basis.explanation}</dd></div>)}</dl><ul className="mt-3 list-disc pl-5 text-sm">{result.limitations.map(value=><li key={value}>{value}</li>)}</ul></details>
  </section>
 </div>;
 const cancel=()=>{setEditing(false);setNotice('Edits cancelled. The last reviewed inputs are unchanged.');};
 return <div className="min-w-0 space-y-5">
  {!launcherOnly&&content}
  <div className="flex flex-wrap gap-2"><button type="button" aria-haspopup="dialog" aria-expanded={editing} className={button} onClick={()=>{setNotice('');setEditing(true);}}>Open Planning Calculator</button>{!launcherOnly&&<button className={button} onClick={()=>{setReview(initial());setNotice('The original fictional example is restored.');}}>Reset illustration</button>}</div>
  <PlanningCalculatorDialog open={editing} review={review} disabled={false} onReview={update} onCancel={cancel}>{launcherOnly&&<>{content}<button className={button} onClick={()=>{setEditing(false);setReview(initial());setNotice('The original fictional example is restored.');}}>Reset illustration</button></>}</PlanningCalculatorDialog>
  {notice&&<p role="status" className="text-sm">{notice}</p>}
 </div>;
}
