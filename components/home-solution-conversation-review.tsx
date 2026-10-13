'use client';
import {HistoricalMetricContext} from './historical-metric-context';
import {canReviewCostedHiringPlan} from '@/lib/home-hiring-plan';
import {HomeHiringPlanReview} from './home-hiring-plan-review';
import {ProposedPlanningEditor} from './proposed-planning-editor';
import {proposedPlanningEstimate} from '@/lib/home-proposed-planning';
import {AssumptionsDisclosure} from './assumptions-disclosure';
import {CompactChart} from './compact-chart';
import {measurementScope,successMeasureText} from '@/lib/home-success-measures';
import {HomeHiringBudgetReview} from './home-hiring-budget-review';
import {ActionPlanQuickSummary,ActionPlanCalculationDetails} from './action-plan-quick-summary';
import {ChatContent} from './chat-content';
import {useState} from 'react';
import {solutionReviewPresentation} from '@/lib/home-plan-presentation';
import {HomeRequiredStaffingReview} from './home-required-staffing-review';
import {HomeBusinessPlanningReview} from './home-business-planning-review';
import type {useHomeSolutionConversation} from './use-home-solution-conversation';
import {resolveSolutionMetric,currentSolutionProposals,type SolutionEvaluation} from '@/lib/home-solution-conversation';
import type {HeadcountProjection} from '@/lib/home-solution-projection';
import {PlanAlternativeCard} from './plan-alternative-card';
import {OptionalConversationForm} from './optional-conversation-form';

type Controller=ReturnType<typeof useHomeSolutionConversation>;
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const number=(value:number|null|undefined)=>value==null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:1});
const proposalAnchor=(id:string)=>'proposed-action-plan-'+id;
/** Direct access to the actual review cards, without changing selection or saving. */
export function HomeSolutionProposalLinks({controller}:{controller:Controller}){
 const view=solutionReviewPresentation(controller.state);
 const proposals=[...(view.recommended?[view.recommended]:[]),...view.alternatives];
 if(!proposals.length)return null;
 return <nav aria-label="Review proposed Action Plans" className="space-y-2 text-sm"><p className="font-semibold">Jump to plan review <span className="font-normal text-muted-foreground">· review before saving</span></p><div className="flex flex-wrap gap-2">{proposals.map(item=><button key={item.id} type="button" className={button+' min-w-0 max-w-full break-words text-left'} onClick={()=>{const card=document.getElementById(proposalAnchor(item.id));const details=card?.closest('details');if(details)details.open=true;card?.scrollIntoView({block:'start'});card?.focus({preventScroll:true});}}>Review {currentSolutionProposals(controller.state).findIndex(proposal=>proposal.id===item.id)+1}: {item.candidate.name}</button>)}</div></nav>;
}
type ProposalEdit={statement:string;dirty:boolean;values?:string[]};
const proposalEditKey=(item:SolutionEvaluation)=>JSON.stringify([item.id,item.revision,item.requestId]);
type ProposalProps={item:SolutionEvaluation;controller:Controller;goal:string;number:number;recommended?:boolean;notes?:string;capacityRisk?:string;edit:ProposalEdit;onEdit:(value:Partial<ProposalEdit>)=>void;supporting?:boolean};
function Proposal({item,controller,goal,number:proposalNumber,recommended=false,notes,capacityRisk,edit,onEdit,supporting=false}:ProposalProps){
 const statement=edit.statement,planningDirty=edit.dirty,setStatement=(statement:string)=>onEdit({statement}),setPlanningDirty=(dirty:boolean)=>onEdit({dirty});
 const stale=JSON.stringify(item.constraints)!==JSON.stringify(controller.state.constraints),saved=controller.saved?.plans.find(plan=>plan.operation?.proposalKey===JSON.stringify(item.candidate));
 if(supporting)return <section aria-label={`Supporting details: ${item.candidate.name}`} className="space-y-4"><h4 className="font-semibold">{item.candidate.name}</h4>

  <p><strong>Goal:</strong> {statement}.</p>
  {capacityRisk&&<p><strong>Capacity risk:</strong> {capacityRisk}</p>}
  <ol aria-label="Practical steps" className="list-decimal space-y-1 pl-5">{item.candidate.activities.map(activity=>{const component=item.draft?.bundle.components.find(part=>part.id===activity.id);return <li key={activity.id}>{component?.firstStep??activity.step}</li>;})}</ol>
  <p><strong>Suggested owners · unconfirmed:</strong> {[...new Set(item.candidate.activities.map(activity=>item.draft?.bundle.components.find(part=>part.id===activity.id)?.ownerRole??activity.ownerRole))].filter(Boolean).join('; ')||'Unknown'}</p>

   {notes&&<section aria-label="Supporting evidence and caveats"><ChatContent content={notes}/></section>}
   <section className="space-y-2"><h4 className="font-semibold">Rationale and limits</h4><p>{item.candidate.objective}</p><p>{item.candidate.rationale}</p><p>{item.candidate.approach}</p><p>{item.candidate.tradeoffs.join(' ')||'Tradeoffs not yet evaluated.'}</p>
   {item.candidate.activities.map(activity=>{const component=item.draft?.bundle.components.find(part=>part.id===activity.id),timing=item.draft?.inputs.timing.find(row=>row.componentId===activity.id);return <p key={activity.id}><strong>{component?.name??activity.name}:</strong> {component?.limitation??activity.limitation} Suggested owner: {component?.ownerRole??activity.ownerRole}. Timing: {timing?.start.value??'Unknown'} → {timing?.finish.value??'Unknown'}.</p>;})}
   {!item.candidate.activities.some(activity=>(item.draft?.bundle.components.find(part=>part.id===activity.id)?.firstStep??activity.step).trim()===item.candidate.nextStep.trim())&&<p>Follow-up: {item.candidate.nextStep}</p>}</section>
   {!!controller.state.constraints.length&&<section><h4 className="font-semibold">Current interpreted constraints</h4>{controller.state.constraints.map(item=><p key={item.field}>{item.field.replaceAll('_',' ')}: {item.action==='remove'?'Removed':item.number??item.text} {item.unit}. Correct this in chat if needed.</p>)}</section>}
   <ActionPlanCalculationDetails draft={item.draft} result={item.result}/>
   {item.draft&&proposedPlanningEstimate(item.draft)&&<ProposedPlanningEditor inline values={edit.values} onValuesChange={values=>onEdit({values})} draft={item.draft} onDirtyChange={setPlanningDirty} disabled={controller.pending||controller.saving||!controller.canSend||stale||!!saved} onReview={changes=>controller.editPlanningInputs(item,changes)}/>}
   <section><h4 className="font-semibold">Tracking</h4><p>{item.draft?.inputs.successMeasure?successMeasureText(item.draft.inputs.successMeasure,item.draft.inputs.successMeasure.scopeKey===measurementScope(item.draft.inputs)):`${item.candidate.successMeasure} · Baseline: Unknown; Target: Unknown.`}</p><p>Confirm owner, baseline, target and review date before starting.</p></section>
   <HistoricalMetricContext inline goal={item.draft?.binding.goal??goal} measure={item.draft?.inputs.successMeasure}/>
   <section><h4 className="font-semibold">Inputs and changes</h4><ul className="list-disc space-y-1 pl-5">{[...item.interpretations,...item.changes].map((line,index)=><li key={index}>{line}</li>)}</ul>{!item.interpretations.length&&<p>No new quantities were supplied. Missing assumptions remain unknown.</p>}</section>
   {!!item.issues.length&&<section><h4 className="font-semibold">Unknowns</h4><ul className="list-disc space-y-1 pl-5">{item.issues.map((line,index)=><li key={index}>{line}</li>)}</ul></section>}
   {!goal&&<OptionalConversationForm label="goal form"><label className="block">Goal for this proposal<input className="mt-1 w-full rounded border p-2" value={statement} maxLength={240} onChange={event=>setStatement(event.target.value)}/></label></OptionalConversationForm>}

 </section>;
 return <article id={proposalAnchor(item.id)} tabIndex={-1} aria-label={`Working proposal: ${item.candidate.name}`} className={`min-w-0 space-y-3 rounded border p-3 text-sm focus-visible:ring-2 focus-visible:ring-ring ${recommended?'border-primary bg-muted/30':''}`}>
  <p className="inline-flex rounded bg-muted px-2 py-1 text-xs font-medium">{recommended?'Recommended':`Alternative ${proposalNumber}`}{saved?' · saved':''}</p>
  <h3 aria-label={recommended?'Recommendation summary':undefined} className="font-semibold">{item.candidate.name} · revision {item.revision}</h3>
  <ActionPlanQuickSummary compact draft={item.draft} result={item.result}/>
  {[...item.blocking,...(stale?['Current constraints changed. Refine this proposal in chat before saving.']:[])].map((line,index)=><p key={index} role="status">{line}</p>)}
  {planningDirty&&<p role="status">Recalculate or discard input changes before pinning.</p>}
  <div className="flex flex-wrap gap-2"><button data-guide-target="choose-proposal" data-guide-candidate={item.id} data-guide-revision={item.revision} data-guide-request={item.requestId} className={button} disabled={planningDirty||!controller.canSend||controller.pending||controller.saving||stale||!!item.blocking.length||!item.draft||!statement.trim()||!!saved} onClick={()=>{if(!planningDirty)void controller.save(item,true,statement);}}>{saved?`Pinned Action Plan #${saved.number}`:'Pin Action Plan'}</button><button className={button} disabled={controller.pending||controller.saving||!controller.canSend} onClick={()=>controller.reject(item)}>Discard proposal</button></div>
 </article>;
}
function ProposalGroup({items,recommended,controller,goal,notes,capacityRisk,current=true,edits,onEdit}:{edits:Record<string,Partial<ProposalEdit>>;onEdit:(key:string,value:Partial<ProposalEdit>)=>void;items:SolutionEvaluation[];recommended:SolutionEvaluation|null;controller:Controller;goal:string;notes?:string;capacityRisk?:string;current?:boolean}){
 if(!items.length)return null;
 const draft=items[0].draft,estimate=draft?proposedPlanningEstimate(draft):null;
 const missing=[draft&&!draft.inputs.scope.startMonth.value&&draft.inputs.timing.every(t=>!t.start.value)?'the start date':null,estimate?.cash===null?'the incremental cash allowance':null,estimate?.perPerson===null?'hours per person':null,draft&&draft.inputs.memberships.some(m=>m.complete.value!==true)?'confirmed participants':null].filter(Boolean).slice(0,3);
 const props=(item:SolutionEvaluation,index:number):ProposalProps=>{const key=proposalEditKey(item);return {item,controller,goal,number:currentSolutionProposals(controller.state).findIndex(p=>p.id===item.id)+1,recommended:current&&recommended?.id===item.id&&recommended.revision===item.revision&&recommended.requestId===item.requestId,notes:index===0?notes:undefined,capacityRisk:index===0?capacityRisk:undefined,edit:{statement:goal||item.candidate.goal.statement,dirty:false,...edits[key]},onEdit:value=>onEdit(key,value)};};
 return <section aria-label={current?'Current Action Plan options':'Earlier Action Plan options'} className="space-y-3"><div className={`grid min-w-0 gap-3 ${items.length===1?'grid-cols-1':items.length===2?'md:grid-cols-2':'md:grid-cols-3'}`}>{items.map((item,index)=><Proposal key={item.id+':'+item.revision} {...props(item,index)}/>)}</div>{!!missing.length&&<p className="text-sm">If you tell me {missing.join(', ')}, I can update the plans and recommendation.</p>}<details><summary className="min-h-11 cursor-pointer py-2 font-medium">Assumptions &amp; caveats</summary><div className="space-y-4">{items.map((item,index)=><Proposal key={item.id+':'+item.revision} supporting {...props(item,index)}/>)}</div></details></section>;
}
export function SolutionProjectionChart({analysis}:{analysis:HeadcountProjection}){
 const values=[analysis.inputs.opening,...analysis.points.map(p=>p.headcount)],low=Math.min(...values),high=Math.max(...values),span=Math.max(1,high-low),min=Math.max(0,low-span*.12),max=high+span*.12;
 const x=(index:number,width:number)=>64+index/Math.max(1,values.length-1)*(width-84),y=(value:number)=>190-(value-min)/(max-min)*150;
 return <section aria-label="Headcount scenario" className="min-w-0 space-y-2 rounded border p-3 text-sm">
  <h3 className="font-semibold">Headcount scenario · {analysis.points.length} months</h3><p>{analysis.inputs.scope} · opening {number(analysis.inputs.opening)} as of {analysis.inputs.asOf} → {number(analysis.points.at(-1)?.headcount)} at {analysis.points.at(-1)?.month.slice(0,7)}.</p>
  <p>Assumption-based scenario, not a trained forecast.</p>
  <CompactChart label="Projected headcount from the active opening snapshot" title="Projected headcount; complete values follow in Assumptions & limits.">{width=><>
   <path d={`M64 30V190H${width-20}`} fill="none" stroke="currentColor" opacity=".4"/>
   <polyline points={values.map((value,index)=>`${x(index,width)},${y(value)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3"/>
   <text x="2" y="40" fontSize="14" fill="currentColor">{number(max)}</text><text x="2" y="190" fontSize="14" fill="currentColor">{number(min)}</text>
   <text x="64" y="217" fontSize="14" fill="currentColor">{analysis.inputs.asOf.slice(0,7)}</text><text x={width-20} y="217" textAnchor="end" fontSize="14" fill="currentColor">{analysis.points.at(-1)?.month.slice(0,7)}</text>
   {values.map((value,index)=><circle key={index} cx={x(index,width)} cy={y(value)} r="3" fill="currentColor"><title>{index===0?analysis.inputs.asOf:analysis.points[index-1].month}: {number(value)}</title></circle>)}
  </>}</CompactChart>
  <AssumptionsDisclosure><h4 className="font-medium">Assumptions</h4><ul className="list-disc space-y-1 pl-5">{Object.entries(analysis.assumptions).map(([field,value])=><li key={field}>{field.replaceAll('_',' ')}: {number(value)}{field.endsWith('_pct')?'%':' people/month'}</li>)}</ul>{analysis.interpretations.map((line,index)=><p key={index}>{line}</p>)}{!analysis.interpretations.length&&<p>Using the configured scenario defaults.</p>}
  <h4 className="font-medium">Data identity, method and monthly values</h4><p>Sources: {analysis.inputs.relations.join(', ')}. Active dataset version: <span className="break-all">{analysis.inputs.datasetVersion?.datasetToken??'unavailable'}</span>. Input digest: <span className="break-all">{analysis.inputDigest}</span>.</p>{analysis.inputs.datasetVersion&&<p>Dataset cutoff: {analysis.inputs.datasetVersion.cutoff}. Bundle digest: <span className="break-all">{analysis.inputs.datasetVersion.bundleDigest}</span>.</p>}{analysis.limitations.map((line,index)=><p key={index}>{line}</p>)}<div role="region" aria-label="Monthly headcount values" tabIndex={0} className="overflow-x-auto focus-visible:outline-2"><table className="compact-data-table whitespace-nowrap text-left"><caption className="sr-only">Monthly headcount stock and flow</caption><thead><tr>{['Month','Opening','Hires','Exits','Transfers in','Transfers out','Closing'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{analysis.points.map(point=><tr key={point.month}>{[point.month.slice(0,7),number(point.opening),number(point.hires),number(point.exits),number(point.transfersIn),number(point.transfersOut),number(point.headcount)].map((value,index)=><td className="p-2" key={index}>{value}</td>)}</tr>)}</tbody></table></div></AssumptionsDisclosure>
 </section>;
}
export function HomeSolutionConversationReview({controller,goal,pack,showSaved,planningNotes,capacityRisk}:{capacityRisk?:string;planningNotes?:string;controller:Controller;goal:string;pack:unknown;showSaved:boolean}){
 const [edits,setEdits]=useState<Record<string,Partial<ProposalEdit>>>({});
 const onEdit=(key:string,value:Partial<ProposalEdit>)=>setEdits(previous=>{const retained=new Set(controller.state.working.map(proposalEditKey));return {...Object.fromEntries(Object.entries(previous).filter(([id])=>retained.has(id))),[key]:{...previous[key],...value}};});
 const presentation=solutionReviewPresentation(controller.state);
 const current=[...(presentation.recommended?[presentation.recommended]:[]),...presentation.alternatives];
 const analyses=[...new Map(controller.state.analyses.map(item=>[item.id,item])).values()];
 return <section aria-label="Solution conversation review" className="space-y-3">
  {controller.pending&&<div role="status" className="flex items-center gap-3"><p>Thinking through the question and checking useful calculations…</p><button className={button} onClick={controller.cancel}>Cancel request</button></div>}
  {controller.notice&&<p role="status">{controller.notice}</p>}
  {!current.length&&!controller.state.requiredStaffing&&!!controller.state.constraints.length&&<details><summary className="cursor-pointer py-2 text-sm">Current interpreted constraints</summary>{controller.state.constraints.map(item=><p key={item.field} className="text-sm">{item.field.replaceAll('_',' ')}: {item.action==='remove'?'Removed':item.number??item.text} {item.unit}. Correct this in chat if needed.</p>)}</details>}
  {!!controller.state.verifiedMetrics.length&&<section aria-label="Checked quantitative results" className="rounded border p-3 text-sm"><h3 className="font-semibold">Checked quantitative results</h3>{controller.state.verifiedMetrics.map((ref,index)=>{const metric=resolveSolutionMetric(controller.state,ref);return <p key={index}>{metric.label}: {number(metric.value)} {metric.unit}. {metric.basis} · {metric.source}.</p>;})}<p>Effectiveness and savings are not established by these calculations.</p></section>}
  {controller.state.hiringBudget&&<details open={controller.state.currentCalculationKinds?.includes('hiring')===true}>
   <summary hidden={controller.state.currentCalculationKinds?.includes('hiring')===true} className="min-h-11 cursor-pointer py-2">Earlier hiring calculation</summary>
   <HomeHiringBudgetReview review={controller.state.hiringBudget} recommended={controller.state.conditionalHiringPlan===true&&controller.state.currentCalculationKinds?.includes('hiring')===true&&!canReviewCostedHiringPlan(controller.state.hiringBudget)} onDirtyChange={dirty=>controller.setHiringEditorDirty(JSON.stringify(controller.state.hiringBudget),dirty)} onUpdate={controller.updateHiringBudget} disabled={controller.pending||controller.saving||!controller.canSend}><HomeHiringPlanReview controller={controller}/></HomeHiringBudgetReview>
  </details>}
  {controller.state.requiredStaffing&&<details open={controller.state.currentCalculationKinds?.includes('required-staffing')===true}>
   <summary hidden={controller.state.currentCalculationKinds?.includes('required-staffing')===true} className="min-h-11 cursor-pointer py-2">Earlier staffing calculation</summary>
   <HomeRequiredStaffingReview notes={planningNotes} deliveryMonths={controller.staffingDeliveryTarget().months} deliveryIssue={controller.staffingDeliveryTarget().issue} onPin={id=>void controller.pinRequiredStaffing(id)} pinned={controller.pinnedRequiredStaffing} review={controller.state.requiredStaffing} onClear={controller.clearRequiredStaffing} disabled={controller.pending||controller.saving||!controller.canSend}/>
  </details>}
  {controller.state.requiredStaffing&&controller.state.businessPlanning?<details><summary className="min-h-11 cursor-pointer py-2">Separate workload assumptions</summary><HomeBusinessPlanningReview controller={controller}/></details>:<HomeBusinessPlanningReview controller={controller}/>}
  {analyses.map(item=><SolutionProjectionChart key={item.id+item.revision} analysis={item}/>)}
  <ProposalGroup edits={edits} onEdit={onEdit} items={current} recommended={presentation.recommended} controller={controller} goal={goal} notes={planningNotes} capacityRisk={capacityRisk}/>
  {!!presentation.earlier.length&&<details><summary className="min-h-11 cursor-pointer py-2">Earlier proposals ({presentation.earlier.length})</summary><ProposalGroup edits={edits} onEdit={onEdit} current={false} items={presentation.earlier} recommended={null} controller={controller} goal={goal}/></details>}
  {showSaved&&controller.saved&&<details><summary className="cursor-pointer py-2 font-semibold">Saved Action Plans</summary>{controller.saved.order.map(id=><PlanAlternativeCard key={id} plan={controller.saved!.plans.find(item=>item.id===id)!} catalog={controller.saved!} measurePack={pack} contextCurrent={false}/>)}</details>}
 </section>;
}
