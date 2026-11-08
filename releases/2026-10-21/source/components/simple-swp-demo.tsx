"use client";
import {staffingAssumptions} from '@/lib/scenario-chat-continuity';
import {InteractivePlanner} from './interactive-planner';
import {StaffingOptionsTable} from './staffing-options-table';
import {workforceInputDisplay} from '@/lib/workforce-input-display';
import type {WorkforcePlanField} from '@/lib/workforce-increment';
import {scenarioRecommendation} from '@/lib/scenario-planning-parity';
import {ScenarioDecisionSummary} from './scenario-decision-summary';
import {StaffingPrioritySummary} from './staffing-priority-summary';
import {StaffingOptionCost} from './staffing-option-cost';
import {useState} from 'react';
import {staffingOptionTitle} from '@/lib/staffing-option-title';
import {guidedWorkloadResult} from '@/lib/guided-workload';
import {SwpDemoInputs} from './swp-demo-inputs';
import {GuidedWorkloadSummary} from './guided-workload-summary';
import {SwpOutcomeChart} from './swp-outcome-chart';
import {compareSwpDemo,guidedOptionEffort,swpEnd,swpTradeoffOptions} from '@/lib/swp-demo';
import type {BundleDraft} from '@/lib/home-bundle-reconciliation';
import type {BundleEditPreview} from '@/lib/home-bundle-chat-edit';
const button='min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50';
const money=(n:number|null|undefined)=>n==null?'Cost unknown':'$'+n.toLocaleString('en-US');
type Comparison=Awaited<ReturnType<typeof compareSwpDemo>>;
export function SimpleSwpDemo({reviewing,draft,comparison,edit,selection,disabled,editingDisabled,pending,onSelect,onEdit,onAccept,onCancel,onCalculate,onPrepare,onPrimaryChange,alreadySaved,guided}:{guided?:{forcedChoice:boolean};reviewing:boolean;draft:BundleDraft;comparison:Comparison|null;edit:BundleEditPreview|null;selection:string|null;disabled:boolean;editingDisabled:boolean;pending:boolean;onSelect:(id:string)=>void;onEdit:(value:BundleEditPreview)=>void;onAccept:()=>void;onCancel:()=>void;onCalculate:()=>void;onPrepare:()=>void;onPrimaryChange:(request:string)=>void;alreadySaved:boolean}){
 const [valid,setValid]=useState(true),[formVersion,setFormVersion]=useState(0);
 const workload=guidedWorkloadResult(draft.inputs),n=(v:number|null|undefined)=>!valid||v==null?'Unknown':v.toLocaleString('en-US',{maximumFractionDigits:2});
 const demand=workload?.workloadHours!=null&&workload.productiveHoursInHorizon?workload.workloadHours/workload.productiveHoursInHorizon:null,supply=workload?.qualifiedAllocatedFte??null,gap=workload?.additionalFte;
 const progress=reviewing?4:comparison?.evaluation.context.status==='ready'&&!edit&&valid?3:2;
 const options=comparison?.options??[],primary=comparison?swpTradeoffOptions(comparison.evaluation):[],feasible=primary.filter(o=>o.candidate.status==='met');
 const selected=options.find(o=>o.id===selection);
 const prescribed=(mix:{build:number;move:number;buy:number})=>mix.build===3&&mix.move===2&&mix.buy===0;
 const choiceAllowed=(option:typeof options[number])=>!guided||(option.candidate.status==='met'&&(!guided.forcedChoice||prescribed(option.candidate.mix)));
 const canReview=!!selected&&choiceAllowed(selected);
 const inputsLocked=!!guided||editingDisabled;
 const introduction=<section className="scenario-question-hero" aria-labelledby="scenario-business-question">
  <p className="scenario-question-eyebrow">Your staffing decision</p>
  <h3 id="scenario-business-question">{valid&&gap!=null&&draft.inputs.budget?.amount.value!=null?<>{gap>0?<>How would you close a <strong>{n(gap)} FTE</strong> capacity gap</>:<>How would you sustain capacity</>} with a <strong>{money(draft.inputs.budget.amount.value)} USD</strong> budget?</>:<>What capacity gap and budget should this plan address?</>}</h3>
  <p>Compare developing, moving and hiring people. Find a staffing mix that fits your timeline and incremental cash budget.</p>
  {!valid&&<p>Complete the inputs below to update this question.</p>}
 </section>;
 return <div className="simple-demo space-y-3">
 {!guided&&<div className="flex flex-wrap items-center gap-3 text-sm" aria-label="Planning progress"><span className="font-semibold">Step {progress} of 4 · {progress===2?'Review inputs and compare':progress===3?'Choose a staffing option':'Review and save'}</span><progress aria-label="Planning progress" max={4} value={progress} className="h-2 w-24 accent-primary"/></div>}
 {!reviewing&&(valid&&!edit&&comparison?.evaluation.context.status==='ready'?<details className="scenario-introduction"><summary className="min-h-11 cursor-pointer py-2 text-sm">About this scenario</summary>{introduction}</details>:introduction)}
 {!reviewing&&<>

 {pending&&<p role="status">{guided?'Calculating the example locally. No live AI request is needed.':'Updating your choices.'}</p>}
 {comparison&&!pending&&valid&&!edit&&<details><summary className="min-h-11 cursor-pointer py-2 text-sm">Recommendation tradeoffs</summary><p className="text-sm">Priorities compare eligible displayed options using their entered assumptions.</p><ScenarioDecisionSummary comparison={comparison}/></details> }
 {comparison?.evaluation.context.status==='needs-inputs'&&<p role="status">{comparison.evaluation.context.missing.map(m=>m.reason).join(' ')}</p>}
 {comparison&&!pending&&comparison.evaluation.context.status==='ready'&&feasible.length<2&&<p role="status">{feasible.length===0?guided?'No alternative staffing option meets the entered limits. Exit the guide to change assumptions.':'No alternative staffing option meets the entered staffing and budget limits. Review scenario levers to compare again.':guided?'One alternative staffing option meets the entered limits. Exit the guide to explore other assumptions.':'One alternative staffing option meets the entered staffing and budget limits. Review scenario levers to explore other choices.'}</p>}
 {!pending&&!comparison&&!edit&&<button className={button+' bg-primary text-primary-foreground font-semibold'} onClick={onCalculate} disabled={disabled||!valid}>Compare staffing options</button>}
 <InteractivePlanner scope={`${draft.inputs.scope.population.value} · ${draft.inputs.scope.startMonth.value}–${swpEnd(draft)}`} outcome={comparison&&!pending&&valid&&!edit?<StaffingPrioritySummary comparison={comparison}/>:pending?'Updating the comparison.':edit?'Review your input changes.':guided?'Review the fixed inputs, then compare options.':'Adjust the inputs, then compare options.'}
  metrics={[{label:'Required capacity',value:n(demand)+' FTE'},{label:'Qualified capacity',value:n(supply)+' FTE'},{label:'Initial gap',value:n(gap)+' FTE'},{label:selected?'Selected option cash':'Period budget ceiling',value:selected?money(selected.candidate.cash.complete):money(draft.inputs.budget?.amount.value)}]}
  levers={<div className="scenario-essential-inputs"><SwpDemoInputs key={formVersion} draft={draft} disabled={inputsLocked||!!edit} onReview={onEdit} onPrimaryChange={onPrimaryChange} onValidity={setValid}/></div>}
  visual={comparison&&!pending&&valid&&!edit?<SwpOutcomeChart draft={draft} options={options}/>:<p role="status">{pending?'Recalculating the scenario.':edit?'Review or cancel your input changes to update the comparison.':'Compare the entered assumptions to show monthly coverage.'}</p>}
  assumptions="Conditional scenario outputs. Role readiness is not productive FTE; uncovered hours account for partial readiness months."
 />
 {!!primary.length&&<fieldset disabled={disabled}><legend className="text-sm font-medium">{guided?.forcedChoice?"Required choice: Develop and move your team (3 develop / 2 move / 0 hire)":"Choose a staffing option"}</legend>{guided?.forcedChoice&&<p className="mb-2 text-sm">This tutorial prioritizes the lowest incremental cash among the displayed feasible options. That is not the same as least uncovered work or best overall: compare the tradeoffs below. Outside the guide, edit inputs and choose the option that matches your priorities.</p>}<p className="mb-2 text-xs text-muted-foreground">Compare cost, readiness and uncovered work.</p><p className="mb-2 text-xs" aria-label="Staffing assumptions">{staffingAssumptions(selected?.draft??draft)}</p><StaffingOptionsTable enumerated={comparison?.evaluation.report?.summary.enumerated??0} options={primary.map(o=>({id:o.id,mix:o.candidate.mix,cash:o.candidate.cash.complete,staffHours:o.candidate.effort?.trainingHours??null,coverageDate:o.candidate.metrics?.fullCoverageDate??null,shortfallHours:guidedOptionEffort(o)?.shortfallHours??null,status:o.candidate.status,reason:o.candidate.reason}))} action={o=><label className="flex min-h-11 items-center gap-2"><input type="radio" name="swp-option" aria-label={`${staffingOptionTitle(o.mix)}: ${o.mix.build}/${o.mix.move}/${o.mix.buy}`} checked={selection===o.id} disabled={disabled||!valid||o.status==='invalid'||!!guided&&(o.status!=='met'||guided.forcedChoice&&!prescribed(o.mix))} onChange={()=>onSelect(o.id)}/><span>{staffingOptionTitle(o.mix)}{selection===o.id?' - Selected':''}</span></label>}/></fieldset>}
 {!!primary.length&&<section aria-label="Selected staffing option details" aria-live="polite" className="simple-demo-selected-details">{selected?<><h3 className="text-sm font-semibold">Selected: {staffingOptionTitle(selected.candidate.mix)}</h3><StaffingOptionCost draft={selected.draft} cash={selected.candidate.cash}/></>:<p className="text-sm">Select an option to review its cost breakdown.</p>}</section>}
 {!reviewing&&comparison&&<><p id="staffing-review-guidance" className="text-sm">{alreadySaved?'This choice is already saved.':!valid?'Complete the assumptions before reviewing.':disabled?'Finish the pending update before reviewing.':!canReview?(feasible.length?'Select one available staffing option above to review its Action Plan.':'Review All options, calculations and assumptions, or adjust assumptions before selecting a plan.'):'Your selected option is ready to review.'}</p><button aria-describedby="staffing-review-guidance" className={button+' bg-primary text-primary-foreground'} disabled={disabled||!valid||!canReview||alreadySaved} onClick={onPrepare}>{alreadySaved?'This choice is already saved':'Review selected Action Plan'}</button></>}
 
 
 <p className="text-xs text-muted-foreground">Prefilled example: {n(draft.inputs.guidedWorkload?.existingPeople.value)} analysts today · {n(draft.inputs.guidedWorkload?.allocationPct.value)}% time available · {n(draft.inputs.guidedWorkload?.skillCoveragePct.value)}% qualified share.</p>
 {edit&&<section aria-label="Review scenario changes" className="rounded border p-3 text-sm"><h3 className="font-semibold">Review your changes</h3>{edit.changes.map(c=><p key={c.field}>{c.field}: {String(c.before.value??'Unknown')} → {String(c.after.value??'Unknown')}</p>)}<div className="mt-2 flex gap-2"><button className={button} disabled={disabled} onClick={()=>{onAccept();setFormVersion(v=>v+1);}}>Use changes in this draft</button><button className={button} disabled={disabled} onClick={onCancel}>Cancel changes</button></div></section>}
 <details><summary className="min-h-11 cursor-pointer py-2 text-sm">All options, calculations and assumptions</summary><div className="space-y-3">{comparison&&<p className="text-sm">{scenarioRecommendation(draft,comparison)}</p>}<GuidedWorkloadSummary draft={draft}/><p className="text-xs">{guided?"Cost and readiness assumptions are fixed in this guide; exit to edit them.":"Cost and readiness assumptions can be edited above."} Internal pools are distinct; developing people does not add headcount. End-date role coverage may leave earlier workload uncovered. Partial readiness months are prorated by calendar days.</p><dl className="grid grid-cols-2 gap-2 text-xs">{Object.entries(draft.inputs.capacity?.input??{}).filter(([,v])=>v!=='').map(([key,value])=><div key={key}><dt>{workforceInputDisplay(key as WorkforcePlanField,value).label}</dt><dd>{workforceInputDisplay(key as WorkforcePlanField,value).value}</dd></div>)}</dl></div></details>
 </>}
 </div>;
}
