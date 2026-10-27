'use client';
import {BusinessAssumptionsEditor} from './business-assumptions-editor';
import {InteractivePlanner} from './interactive-planner';
import {StaffingMixControls} from './staffing-mix-controls';
import {StaffingCoverageChart} from './swp-outcome-chart';
import {StaffingOptionsTable} from './staffing-options-table';
import {useState} from 'react';
import type {useHomeSolutionConversation} from './use-home-solution-conversation';
import {demandQuantityFields,type DemandBasis} from '@/lib/swp-demand';
import {staffingFields} from '@/lib/home-service-staffing';
import {staffingChoiceSummary} from '@/lib/staffing-choice-summary';
import {plannerCash,plannerDate,staffingActionHeadline} from '@/lib/planner-display';
import {swpMonth} from '@/lib/swp-demo';

type Controller=ReturnType<typeof useHomeSolutionConversation>;
const number=(value:number|null|undefined)=>value==null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:1});
const demandLabels={contracts:'Contracts',hoursPerContract:'Hours per contract',productiveHoursPerFte:'Productive hours per FTE',existingRoles:'Existing roles',existingFtePerRole:'FTE per existing role',availabilityPct:'Available team time (%)',ftePerRole:'FTE per additional role',explicitAdditionalRoles:'Stated additional roles',budgetUsd:'Budget (USD)'};
const staffingLabels={buildMax:'Maximum development pool (roles)',moveMax:'Maximum redeployment pool (roles)',backfills:'Backfill hires (roles)',annualHireCost:'Annual hire cost (USD per hire)',hireFee:'Recruitment fee (USD per hire)',annualBackfillCost:'Annual backfill cost (USD per hire)',backfillFee:'Recruitment fee (USD per backfill)',internalAnnualCostChange:'Annual internal uplift (USD, total)',trainingCash:'Training cash (USD, total)',trainingHours:'Training hours (total)',maxUncoveredHours:'Acceptable uncovered work (hours over this period)',maxAddedEmployees:'Maximum added employees',arrivalDate:'Hire arrival date',buildMonth:'Development ready month',moveMonth:'Redeployment ready month',backfillDate:'Backfill arrival date',deadlineMonth:'Coverage deadline month',internalPoolsDistinct:'Internal pools separate from baseline and each other',internalRelease:'Internal release assumed',costsCompleteAndDistinct:'Costs assumed complete and distinct'};
const basisText=(basis:DemandBasis)=>`${basis.kind.replaceAll('-',' ')}: ${basis.explanation}${basis.quote?` — “${basis.quote}”`:''}`;
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
export function HomeBusinessPlanningReview({controller}:{controller:Controller}){
 const [review,setReview]=useState<Awaited<ReturnType<Controller['reviewBusinessOption']>>|null>(null),[error,setError]=useState(''),[preparing,setPreparing]=useState(false),[editingContext,setEditingContext]=useState<string|null>(null);
 const state=controller.state.businessPlanning;if(!state)return null;
 const editContext=JSON.stringify([state.context,state.scopeKey]),editing=editingContext===editContext;
 const busy=controller.pending||controller.saving||preparing||!controller.canSend,r=state.review.result,s=state.review.spec,staffing=state.staffing;
 const active=staffing?.selectedMix?staffing.result.options[0]:null;
 const selected=(id:string)=>controller.saved?.plans.find(plan=>!plan.deleted&&plan.operation?.proposalKey===JSON.stringify({reviewKey:state.review.key,staffing:state.staffing?.inputs,optionId:id}));
 const currentReview=review&&review.key===JSON.stringify(state)?review:null;
 const saveUnavailable=!staffing||!staffing.result.options.some(option=>option.status!=='invalid')
  ? staffing?.result.status==='no-gap'?'No staffing plan to save: the calculated workload has no positive gap.'
   : `Plan cannot be saved yet. ${[...r.missing,...(staffing?.result.missing??[])].join(' ')||'Complete the staffing assumptions in chat to calculate a reviewable option.'}`
  : null;
 return <section aria-label="Business planning assumptions" className="space-y-3 text-sm">
  <InteractivePlanner scope={`${s.scope??'Role slice unknown'} · ${plannerDate(s.startMonth)}–${s.startMonth&&s.months?plannerDate(swpMonth(s.startMonth,s.months-1)):'End unknown'}`}
   outcome={staffing?.result.status==='calculated'?(staffing.selectedMix?staffingActionHeadline(staffing.result.options[0]):`Compare staffing options for ${number(r.additionalRoles)} additional roles.`):r.status==='calculated'?`Review options for ${number(r.additionalRoles)} additional whole roles.`:'Complete the operating assumptions to calculate the gap.'}
   metrics={active?[{label:'Incremental cash · USD',value:plannerCash(active.cash)},{label:'Uncovered work',value:number(active.shortfallHours)+' hours'},{label:'Full role readiness',value:plannerDate(active.coverageDate)},{label:'New hires',value:number(active.addedEmployees)+' people'}]:[{label:'Work required',value:number(r.workloadHours)+' hours'},{label:'Existing capacity',value:number(r.capacityHours)+' hours'},{label:'Workload gap',value:number(r.gapHours)+' hours'},{label:'Additional whole roles',value:number(r.additionalRoles)}]}
   levers={<><StaffingMixControls state={state} disabled={busy} onChange={controller.adjustBusinessMix}/><BusinessAssumptionsEditor key={editContext} state={state} disabled={busy} onApply={controller.adjustBusinessAssumptions} onEditing={open=>setEditingContext(open?editContext:null)}/>{!staffing&&<p>Add the role, workload and timing to compare staffing options.</p>}</>}
   visual={staffing?.result.options.length?<StaffingCoverageChart scopeAlreadyShown target={r.additionalRoles} scope={s.scope} start={s.startMonth} months={s.months} options={staffing.result.options.map((o,index)=>({id:o.id,label:staffing.selectedMix?'Adjusted mix':index===0?'All-hire reference':`Option ${index}`,mix:o.mix,coverage:o.monthly.length===s.months?o.monthly.map(m=>m.roles):null}))}/>:<p role="status">{r.missing.join(' ')||'Review staffing costs and readiness to calculate option coverage.'}</p>}
   assumptions={`Conditional plan. ${r.budgetUsd===null?'Budget unknown; affordability not assessed.':`Budget ${plannerCash(r.budgetUsd)}.`} ${active&&active.status!=='met'?'Some limits unmet or unverified. ':''}Readiness and release assumed.`}
  />
  {editing&&<p role="status">Apply or cancel input edits before reviewing or saving a plan.</p>}
  {saveUnavailable?<p role="status">{saveUnavailable}</p>:<p>Review an option below to save it.</p>}
  {staffing&&<><h4 className="font-semibold">Staffing options</h4>{staffing.result.missing.map(line=><p key={line}>{line}</p>)}
   {staffing.result.status==='no-gap'&&<p>No positive workload gap; no staffing plan was generated.</p>}
   <details><summary className="min-h-11 cursor-pointer py-2">Option tradeoffs</summary><p>{staffingChoiceSummary(staffing.result.options)}</p></details>
   <StaffingOptionsTable options={staffing.result.options} enumerated={staffing.result.enumerated} action={option=><button className={button} disabled={busy||editing||option.status==='invalid'||!!selected(option.id)} onClick={async()=>{setPreparing(true);setError('');try{setReview(await controller.reviewBusinessOption(option.id));}catch(e){setError((e as Error).message);}finally{setPreparing(false);}}}>{selected(option.id)?`Pinned Action Plan #${selected(option.id)!.number}`:`Review to save: ${option.mix.build}/${option.mix.move}/${option.mix.buy}`}</button>}/>

  </>}
  <details><summary className="min-h-11 cursor-pointer py-2">Inputs and calculation limits</summary>
   <p>End-date coverage does not prove full-period delivery. Entered limits do not verify availability or approve a workforce change.</p>
   {active&&<p>Exact incremental cash: {active.cash===null?'Unknown':String(active.cash)} USD. Exact readiness date: {active.coverageDate??'Unknown'}.</p>}
   <dl className="space-y-2">{[
    ['Role slice',s.scope,s.scopeBasis],['Operating linkage',s.linkage,s.linkageBasis],['Start month',s.startMonth,s.startBasis],['Planning months',s.months,s.monthsBasis],
    ...demandQuantityFields.map(field=>[demandLabels[field],`${number(s[field].value)}${s[field].period?' per '+s[field].period:''}${s[field].scope?' · '+s[field].scope:''}`,s[field].basis]),
   ].map(([label,value,basis])=><div key={String(label)}><dt className="font-medium">{String(label)}</dt><dd>{String(value??'Unknown')}<p className="text-xs">{basisText(basis as DemandBasis)}</p></dd></div>)}</dl>
   {staffing&&<><ul>{staffingFields.filter(field=>staffing.inputs.values[field]).map(field=><li key={field}>{staffingLabels[field]}: {String(staffing.inputs.values[field]!.value??'Unknown')} · {basisText(staffing.inputs.values[field]!.basis)}</li>)}</ul>{staffing.result.limitations.map(line=><p key={line}>{line}</p>)}</>}
  </details>
  {currentReview&&<section aria-label="Review provisional staffing selection" className="space-y-2 rounded border p-3"><h4 className="font-semibold">Review this plan</h4><p><strong>Goal:</strong> {currentReview.selection.goal.statement}</p><p><strong>Success measure:</strong> {currentReview.selection.draft.inputs.successMeasure?.name??'Not yet defined. Add a metric, baseline and target.'}</p><p>Develop {currentReview.selection.option.mix.build}, move {currentReview.selection.option.mix.move}, hire {currentReview.selection.option.mix.buy}. Cash: {number(currentReview.selection.option.cash)} USD. Workload shortfall: {number(currentReview.selection.option.shortfallHours)} hours.</p><p>Save this plan with its goal, success measures and assumptions.</p>{currentReview.selection.result.issues.map(line=><p key={line}>{line}</p>)}<button className={button} disabled={busy||editing} onClick={()=>void controller.saveBusinessOption(currentReview)}>Save plan with unknowns</button><button className={button} disabled={busy} onClick={()=>setReview(null)}>Cancel plan review</button></section>}
  {error&&<p role="status">{error}</p>}
  <button className={button} disabled={busy} onClick={()=>{controller.clearBusinessPlanning();setReview(null);setEditingContext(null);}}>Clear planning discussion</button>
 </section>;
}
