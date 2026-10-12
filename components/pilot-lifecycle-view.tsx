'use client';
import {compareFictionalPilot,type PilotLifecycleExample as PilotRecord} from '@/lib/pilot-lifecycle-example';
/** Shared presentation for saved examples and the independent in-memory illustration. */
export function PilotLifecycleView({record:r,historical=false,goal,standalone=false}:{record:PilotRecord;historical?:boolean;goal:string;standalone?:boolean}){
 const result=compareFictionalPilot(r),last=r.observations.at(-1)!,delivery=r.delivery.at(-1)!,participation=r.participation.at(-1)!;
 return <section aria-label="Fictional pilot lifecycle" className="min-w-0 space-y-2 break-words rounded border p-3 text-sm">
  <h3 className="font-semibold">Fictional pilot walkthrough</h3>
  <p className="text-xs">Invented teaching example · not company history or real outcomes. Dates illustrate a sequence, including future steps; viewing this does not record work or results.</p>
  <p><strong>Illustrated outcome:</strong> workload pressure {r.proposedBaseline} → {last.value} {r.measurement.unit}; proposed target {r.measurement.target.value}. {result.gap===null?'Comparison unavailable.':`${result.gap} points above the proposed target.`}</p>
  <p><strong>Illustrated delivery:</strong> {delivery.completed}/{delivery.planned} check-ins; {participation.participants}/{participation.invited} participants; {participation.participantHours+participation.coordinationHours} total labor hours. Activities do not establish an outcome or its cause.</p>
  <p><strong>Demo owner:</strong> {r.owner.label}. Review: {r.reviewDate}.</p>
  {(historical||goal!==r.goal)&&<p role="status">Historical example for “{r.goal}”, revision {r.plan.revision}. Changes to the goal or plan do not move these fictional observations to a new version.</p>}
  <details key={r.plan.inputKey}>
   <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Pilot dates, measures and history</summary>
   <div className="space-y-3 pt-2">
    <p><strong>Population:</strong> {r.population}</p>
    <p><strong>Proposed measurement:</strong> {r.measurement.metric}; {r.measurement.definition}. Proposed baseline {r.proposedBaseline}; target {r.measurement.target.value} {r.measurement.unit} by {r.reviewDate}. {r.measurement.provenance}</p>
    <p>Assigned within the fiction on {r.owner.assignedOn}: {r.owner.label}. This is not a real staffing assignment.</p>
    <ul className="space-y-1">{r.delivery.map(e=><li key={e.date}>{e.date}: {e.status} · {e.completed}/{e.planned} {e.unit} (fictional).</li>)}</ul>
    <ul className="space-y-1">{r.participation.map(e=><li key={e.date}>{e.date}: cumulative participation {e.participants}/{e.invited}; {e.participantHours} participant hours + {e.coordinationHours} coordination hours (fictional). These snapshots are not additive.</li>)}</ul>
    <ul className="space-y-1">{r.observations.map((o,i)=><li key={o.period.end}>Fictional {i?'follow-up':'baseline'}: {o.value} {o.unit}, {o.period.start} through {o.period.end}; {o.quality.denominator} fictional respondents. Captured {o.capturedAt.slice(0,10)}. Source: scenario · {o.source.releaseId}.</li>)}</ul>
    <p>Descriptive fictional change: {result.change===null?'Unavailable':`${result.change} points`}. No causal effect, turnover benefit or real completion is inferred. Next review: inspect response completeness and discuss workload adjustments; do not declare the goal achieved.</p>
    <p>Labor is time, not cash. Labor cost is unknown: no pay rate is supplied. {standalone?'The illustrated':'The saved'} pilot cash allowance remains a proposal, not recorded expenditure.</p>
    {standalone?<p>Read-only fictional example. It is not attached to your selected goal and does not record progress or change your plans.</p>:<>
    <p className="break-all">Exact original attachment: {r.plan.planId} · revision {r.plan.revision}. Exact original inputs and evidence binding verified within this browser dataset. This link is not an evidence release certificate.</p>
    <p>Read-only walkthrough reconstructed from the original saved example. It does not add measurements to Goal progress. Prior attached plans remain unchanged; real observations require their own explicit review.</p>
    </>}
   </div>
  </details>
 </section>;
}
