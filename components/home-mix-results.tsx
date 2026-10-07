'use client';
import type {HomeMixState} from '@/lib/home-mix-orchestration';
import type {HomeMixEvaluation} from '@/lib/home-mix-runtime';
const cash=(value:number|null)=>value===null?'Unknown':`$${value.toLocaleString(undefined,{maximumFractionDigits:2})} USD`;
export function HomeMixResults({state,candidateId,onSelect,disabled}:{state:HomeMixState<HomeMixEvaluation>;candidateId:string|null;onSelect:(id:string|null)=>void;disabled:boolean}){
 if(state.status==='idle')return null;
 if(state.status==='queued'||state.status==='running')return <section aria-label="Automatic staffing search" className="rounded border p-3"><p role="status">Checking bounded staffing combinations…</p></section>;
 if(state.status==='failed')return <section aria-label="Automatic staffing search" className="rounded border p-3"><p role="status">Local staffing search could not be verified. Existing plans are retained; no staffing recommendation is available.</p></section>;
 if(state.status!=='ready')return null;
 const {context,report,notes}=state.report;if(context.status==='not-applicable')return null;
 return <section aria-label="Automatic staffing search" data-mix-status={context.status} data-mix-fingerprint={report?.reportFingerprint} className="min-w-0 space-y-2 rounded border p-3 text-sm">
  <h4 className="font-semibold">Staffing combinations</h4>
  <p className="text-xs">Calculated locally from this plan’s assumptions. Existing employee effort is measured in hours. No observed availability, salary quote or intervention effect is inferred.</p>
  {notes.map(note=><p className="text-xs" key={note}>{note}</p>)}
  {context.status==='needs-inputs'&&<><p>No combinations evaluated: the staffing inputs need review.</p><ul className="list-disc pl-5">{context.missing.map((item,index)=><li key={index}>{item.reason}</li>)}</ul></>}
  {context.status==='ready'&&!context.source.draft.inputs.mixScenario&&report?.summary.enumerated===1&&<p className="text-xs">To explore fictional internal options, say “Use illustrative staffing assumptions” in chat. Review the proposed groups, bounds, dates, costs and release premise before applying. Skill counts alone do not establish available staff.</p>}
  {report&&<>
   <p aria-label="Staffing search coverage">{report.summary.enumerated} combinations evaluated completely within bounds; {report.summary.calculatorInvocations} calculator calls including the reference. Build {report.spec.build.min}–{report.spec.build.max}, Move {report.spec.move.min}–{report.spec.move.max}, Buy {report.spec.buy.min}–{report.spec.buy.max}. {report.summary.emitted} shown; {report.summary.omittedByCap} omitted, including {report.summary.omittedNondominated} nondominated tradeoffs.</p>
   <p><strong>Objective:</strong> {report.objective.label} ({report.objective.basis}).</p>
   <p aria-label="Staffing search conclusion">{report.selection.label} {report.summary.counts.met} meet entered constraints; {report.summary.counts['not-met']} do not; {report.summary.counts.unknown} unresolved; {report.summary.counts.invalid} invalid.</p>
   <p className="text-xs">Cash ceiling {cash(report.constraints.cashBudget)}; added-employee ceiling {report.constraints.maxAddedEmployees??'Unknown'}; coverage deadline {report.constraints.deadlineMonth??'Unknown'}; staff-hour ceiling {report.constraints.maxStaffHours??'Not entered'}. Only Build/Move/Buy counts vary; dates, total path costs, training hours and backfills stay fixed.</p>
   {report.selection.tiedCandidateIds.length>1&&<p>{report.selection.tiedCandidateIds.length} tied options. {report.selection.tiePolicy} {report.selection.unresolvedTieMetric&&`Unresolved tie metric: ${report.selection.unresolvedTieMetric}.`}</p>}
   <fieldset disabled={disabled} className="space-y-2"><legend className="font-medium">Proposed staffing option</legend>
    <label className="flex min-h-11 items-center gap-2"><input type="radio" name={'home-mix-'+report.reportFingerprint} checked={candidateId===null} onChange={()=>onSelect(null)}/>Keep the current staffing assumptions</label>
    {report.results.map(candidate=><div key={candidate.id} className="space-y-1 rounded border p-2">
     {candidate.status==='met'&&candidate.cash.complete!==null?<label className="flex min-h-11 items-center gap-2"><input type="radio" name={'home-mix-'+report.reportFingerprint} checked={candidateId===candidate.id} onChange={()=>onSelect(candidate.id)}/>Build {candidate.mix.build} · Move {candidate.mix.move} · Buy {candidate.mix.buy}{candidate.id===report.preferredOptionId?' · best explored under the objective':''}</label>:<p>Build {candidate.mix.build} · Move {candidate.mix.move} · Buy {candidate.mix.buy} · {candidate.status==='unknown'?'feasibility unresolved':candidate.status==='not-met'?'constraints not met':'invalid inputs'}</p>}
     <p>Complete cash {cash(candidate.cash.complete)}; known subtotal {cash(candidate.cash.knownSubtotal)}. {candidate.cash.headroom!==null&&`Budget balance ${cash(candidate.cash.headroom)}.`} Staff hours {candidate.effort?.totalHours??'Unknown'}; training {candidate.effort?.trainingHours??'Unknown'} / delivery {candidate.effort?.deliveryHours??'Unknown'}. Added employees {candidate.metrics?.addedEmployees??'Unknown'}; conditional coverage {candidate.metrics?.fullCoverageDate??'Unknown'}.</p>
     {candidate.reason&&<p>{candidate.reason}</p>}
    </div>)}
   </fieldset>
   {candidateId&&<p>A proposed revision only. Review the mix and assumptions, then use Apply changes or Attach Action Plan. Previous attachments remain unchanged.</p>}
   {report.missing.length>0&&<details><summary className="min-h-11 cursor-pointer py-2">Unresolved search assumptions ({report.missing.length})</summary><ul className="list-disc pl-5">{report.missing.map((item,index)=><li key={index}>{item.reason}</li>)}</ul></details>}
   <details><summary className="min-h-11 cursor-pointer py-2">Search provenance and limits</summary><p>Best only within the stated bounds; no global optimum or operational approval.</p>{report.limitations.map(text=><p key={text} className="my-1 text-xs">{text}</p>)}<ul className="list-disc pl-5">{Object.entries(report.assumptionOrigins).map(([field,origin])=><li key={field}>{field}: {report.reference.input[field as keyof typeof report.reference.input]||'Unknown'} · {origin.kind}. {origin.basis}</li>)}</ul></details>
  </>}
 </section>;
}
