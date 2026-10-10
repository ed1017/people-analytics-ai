'use client';
import {useState} from 'react';
import type {useHomeSolutionConversation} from './use-home-solution-conversation';
import {demandQuantityFields,type DemandBasis} from '@/lib/swp-demand';
import {staffingFields} from '@/lib/home-service-staffing';
type Controller=ReturnType<typeof useHomeSolutionConversation>;
const number=(value:number|null|undefined)=>value==null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:1});
const demandLabels={contracts:'Contracts',hoursPerContract:'Hours per contract',productiveHoursPerFte:'Productive hours per FTE',existingRoles:'Existing roles',existingFtePerRole:'FTE per existing role',availabilityPct:'Available team time (%)',ftePerRole:'FTE per additional role',explicitAdditionalRoles:'Stated additional roles',budgetUsd:'Budget (USD)'};
const staffingLabels={buildMax:'Maximum development pool (roles)',moveMax:'Maximum redeployment pool (roles)',backfills:'Backfill hires (roles)',annualHireCost:'Annual hire cost (USD per hire)',hireFee:'Recruitment fee (USD per hire)',annualBackfillCost:'Annual backfill cost (USD per hire)',backfillFee:'Recruitment fee (USD per backfill)',internalAnnualCostChange:'Annual internal uplift (USD, total)',trainingCash:'Training cash (USD, total)',trainingHours:'Training hours (total)',maxAddedEmployees:'Maximum added employees',arrivalDate:'Hire arrival date',buildMonth:'Development ready month',moveMonth:'Redeployment ready month',backfillDate:'Backfill arrival date',deadlineMonth:'Coverage deadline month',internalPoolsDistinct:'Internal pools separate from baseline and each other',internalRelease:'Internal release assumed',costsCompleteAndDistinct:'Costs assumed complete and distinct'};
const basisText=(basis:DemandBasis)=>`${basis.kind.replaceAll('-',' ')}: ${basis.explanation}${basis.quote?` — “${basis.quote}”`:''}`;
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
export function HomeBusinessPlanningReview({controller}:{controller:Controller}){
 const [review,setReview]=useState<Awaited<ReturnType<Controller['reviewBusinessOption']>>|null>(null),[error,setError]=useState(''),[preparing,setPreparing]=useState(false);
 const state=controller.state.businessPlanning;if(!state)return null;
 const busy=controller.pending||controller.saving||preparing||!controller.canSend,r=state.review.result,s=state.review.spec,staffing=state.staffing;
 const selected=(id:string)=>controller.saved?.plans.find(plan=>!plan.deleted&&plan.operation?.proposalKey===JSON.stringify({reviewKey:state.review.key,staffing:state.staffing?.inputs,optionId:id}));
 const currentReview=review&&review.key===JSON.stringify(state)?review:null;
 return <section aria-label="Business planning assumptions" className="space-y-3 rounded border p-3 text-sm">
  <h3 className="font-semibold">Provisional business plan</h3><p>{s.objective}</p><p>{s.scope??'Role slice needs clarification'} · {s.startMonth??'Start unknown'} · {s.months??'Unknown'} months</p>
  {r.status==='calculated'?<p>Workload: {number(r.workloadHours)} hours · existing available capacity: {number(r.capacityHours)} hours · gap: {number(r.gapHours)} hours ({number(r.additionalRoles)} additional whole roles).</p>:<p>{r.missing.join(' ')}</p>}
  <p>Proposed and user-supplied inputs remain unverified. Correct any assumption in chat; no mode or separate input form is required.</p>
  {staffing&&<><h4 className="font-semibold">Calculated provisional options</h4>{staffing.result.missing.map(line=><p key={line}>{line}</p>)}
   {staffing.result.status==='no-gap'&&<p>No positive workload gap; no staffing plan was generated.</p>}
   <div className="overflow-x-auto"><table className="w-full text-left"><caption>{staffing.result.enumerated} combinations evaluated within the supplied bounds</caption><thead><tr>{['Develop / move / hire','Complete cash (USD)','Training hours','Coverage date','Workload shortfall (hours)','Entered limits','Review'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{staffing.result.options.map(option=><tr className="border-t" key={option.id}><td className="p-2">{option.mix.build} / {option.mix.move} / {option.mix.buy}</td><td>{number(option.cash)}</td><td>{number(option.staffHours)}</td><td>{option.coverageDate??'Unknown'}</td><td>{number(option.shortfallHours)}</td><td>{option.status}{option.reason&&<p>{option.reason}</p>}</td><td><button className={button} disabled={busy||option.status==='invalid'||!!selected(option.id)} onClick={async()=>{setPreparing(true);setError('');try{setReview(await controller.reviewBusinessOption(option.id));}catch(e){setError((e as Error).message);}finally{setPreparing(false);}}}>{selected(option.id)?`Pinned Action Plan #${selected(option.id)!.number}`:`Review ${option.mix.build}/${option.mix.move}/${option.mix.buy}`}</button></td></tr>)}</tbody></table></div>
   <p>End-date coverage does not prove full-period delivery. “Met” applies only to entered limits; actual availability, readiness and release remain unverified.</p>
  </>}
  <details><summary className="min-h-11 cursor-pointer py-2">Inputs and calculation limits</summary>
   <dl className="space-y-2">{[
    ['Role slice',s.scope,s.scopeBasis],['Operating linkage',s.linkage,s.linkageBasis],['Start month',s.startMonth,s.startBasis],['Planning months',s.months,s.monthsBasis],
    ...demandQuantityFields.map(field=>[demandLabels[field],`${number(s[field].value)}${s[field].period?' per '+s[field].period:''}${s[field].scope?' · '+s[field].scope:''}`,s[field].basis]),
   ].map(([label,value,basis])=><div key={String(label)}><dt className="font-medium">{String(label)}</dt><dd>{String(value??'Unknown')}<p className="text-xs">{basisText(basis as DemandBasis)}</p></dd></div>)}</dl>
   {staffing&&<><ul>{staffingFields.map(field=><li key={field}>{staffingLabels[field]}: {String(staffing.inputs.values[field].value??'Unknown')} · {basisText(staffing.inputs.values[field].basis)}</li>)}</ul>{staffing.result.limitations.map(line=><p key={line}>{line}</p>)}</>}
  </details>
  {currentReview&&<section aria-label="Review provisional staffing selection" className="space-y-2 rounded border p-3"><h4 className="font-semibold">Review this provisional plan</h4><p><strong>Goal:</strong> {currentReview.selection.goal.statement}</p><p><strong>Success measure:</strong> {currentReview.selection.draft.inputs.successMeasure?.name??'Not yet defined. Agree a metric, baseline and target in chat; proposed capacity is not a measured outcome.'}</p><p>Develop {currentReview.selection.option.mix.build}, move {currentReview.selection.option.mix.move}, hire {currentReview.selection.option.mix.buy}. Cash: {number(currentReview.selection.option.cash)} USD. Workload shortfall: {number(currentReview.selection.option.shortfallHours)} hours.</p><p>Pinning keeps this proposal, its goal, success measures and assumptions together. It does not verify or accept the inputs as facts, approve funding or apply a workforce change.</p>{currentReview.selection.result.issues.map(line=><p key={line}>{line}</p>)}<button className={button} disabled={busy} onClick={()=>void controller.saveBusinessOption(currentReview)}>Pin Action Plan with unknowns</button><button className={button} disabled={busy} onClick={()=>setReview(null)}>Cancel plan review</button></section>}
  {error&&<p role="status">{error}</p>}
  <button className={button} disabled={busy} onClick={()=>{controller.clearBusinessPlanning();setReview(null);}}>Clear provisional business discussion</button>
 </section>;
}
