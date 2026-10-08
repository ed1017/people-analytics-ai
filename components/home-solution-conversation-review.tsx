'use client';
import {useState} from 'react';
import type {useHomeSolutionConversation} from './use-home-solution-conversation';
import {resolveSolutionMetric,type SolutionEvaluation} from '@/lib/home-solution-conversation';
import type {HeadcountProjection} from '@/lib/home-solution-projection';
import {PlanAlternativeCard} from './plan-alternative-card';
import {OptionalConversationForm} from './optional-conversation-form';

type Controller=ReturnType<typeof useHomeSolutionConversation>;
const button='min-h-11 rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring';
const number=(value:number|null|undefined)=>value==null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:1});
function Proposal({item,controller,goal}:{item:SolutionEvaluation;controller:Controller;goal:string}){
 const [statement,setStatement]=useState(goal||item.candidate.goal.statement);
 const stale=JSON.stringify(item.constraints)!==JSON.stringify(controller.state.constraints),saved=controller.saved?.plans.find(plan=>plan.operation?.proposalKey===JSON.stringify(item.candidate));
 return <article aria-label={`Working proposal: ${item.candidate.name}`} className="space-y-3 rounded border p-3 text-sm">
  <p className="text-xs font-medium">Proposed approach · effectiveness is unproven</p><h3 className="font-semibold">{item.candidate.name} · revision {item.revision}</h3><p>{item.candidate.objective}</p><p>{item.candidate.rationale}</p><p>{item.candidate.approach}</p>
  <ol className="list-decimal space-y-2 pl-5">{item.candidate.activities.map(activity=><li key={activity.id}><strong>{activity.mode==='retain'?item.draft?.bundle.components.find(part=>part.id===activity.id)?.name??activity.name:activity.name}</strong> · {activity.mode}{activity.source?` from ${activity.source.kind} ${activity.source.id}, revision ${activity.source.revision}`:''}<p>{item.draft?.bundle.components.find(part=>part.id===activity.id)?.firstStep??activity.step}</p><p className="text-xs">{activity.limitation}</p></li>)}</ol>
  <p><strong>Tradeoffs:</strong> {item.candidate.tradeoffs.join(' ')||'Not yet evaluated.'}</p><p><strong>Next step:</strong> {item.candidate.nextStep}</p><p><strong>Learn whether it helps:</strong> {item.candidate.successMeasure}</p>
  {item.result?.calculationStatus==='awaiting-scope'?<p>Qualitative proposal · population or horizon still needs review. Resource totals have not been calculated.</p>:<p>Calculated cash: {item.result?.cashEstimate?.cash==null?'Unknown':`$${number(item.result.cashEstimate.cash)} USD`} · staff effort: {number(item.result?.deliveryEstimate?.hours)} hours · distinct participants: {number(item.result?.uniqueParticipants)}.</p>}
  <details open><summary className="cursor-pointer py-2 font-medium">Review interpreted inputs and changes</summary><ul className="list-disc space-y-1 pl-5">{[...item.interpretations,...item.changes].map((line,index)=><li key={index}>{line}</li>)}</ul>{!item.interpretations.length&&<p>No new quantities were supplied. Missing assumptions remain unknown.</p>}</details>
  {[...item.blocking,...(stale?['Current constraints changed. Refine this proposal in chat before saving.']:[])].map((line,index)=><p key={index} role="status">{line}</p>)}
  {!!item.issues.length&&<details><summary className="cursor-pointer py-2">Unknowns and calculation limits ({item.issues.length})</summary><ul className="list-disc space-y-1 pl-5">{item.issues.map((line,index)=><li key={index}>{line}</li>)}</ul></details>}
  <p><strong>Goal:</strong> {statement}. Refine the goal, dates, budget or assumptions in chat.</p>
  {!goal&&<OptionalConversationForm label="goal form"><label className="block">Goal for this proposal<input className="mt-1 w-full rounded border p-2" value={statement} maxLength={240} onChange={event=>setStatement(event.target.value)}/></label></OptionalConversationForm>}
  {!!item.issues.length&&<p>This proposal has unresolved assumptions. Choosing it acknowledges the unknowns listed above and keeps them for later review.</p>}
  <p className="text-xs">Choosing saves the goal and attaches this proposal automatically. It does not apply operational changes.</p>
  <div className="flex flex-wrap gap-2"><button data-guide-target="choose-proposal" className={button} disabled={!controller.canSend||controller.pending||controller.saving||stale||!!item.blocking.length||!item.draft||!statement.trim()||!!saved} onClick={()=>void controller.save(item,true,statement)}>{saved?`Selected as Action Plan #${saved.number}`:item.issues.length?'Choose this plan with unknowns':'Choose this plan'}</button><button className={button} disabled={controller.pending||controller.saving||!controller.canSend} onClick={()=>controller.reject(item)}>Discard proposal</button></div>
 </article>;
}
export function SolutionProjectionChart({analysis}:{analysis:HeadcountProjection}){
 const values=[analysis.inputs.opening,...analysis.points.map(p=>p.headcount)],low=Math.min(...values),high=Math.max(...values),span=Math.max(1,high-low),min=Math.max(0,low-span*.12),max=high+span*.12;
 const x=(index:number)=>60+index/(values.length-1)*570,y=(value:number)=>190-(value-min)/(max-min)*150;
 return <section aria-label="Headcount scenario" className="space-y-3 rounded border p-3 text-sm">
  <h3 className="font-semibold">Headcount scenario · {analysis.points.length} months</h3><p>{analysis.inputs.scope} · opening {number(analysis.inputs.opening)} as of {analysis.inputs.asOf} → {number(analysis.points.at(-1)?.headcount)} at {analysis.points.at(-1)?.month.slice(0,7)}.</p>
  <p>Assumption-based scenario, not a trained forecast.</p>
  <svg role="img" aria-label="Projected headcount from the active opening snapshot" viewBox="0 0 660 230" className="w-full"><title>Projected headcount; complete values follow in the table.</title><path d="M60 30V190H630" fill="none" stroke="currentColor" opacity=".4"/><polyline points={values.map((value,index)=>`${x(index)},${y(value)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3"/><text x="2" y="40" fontSize="12">{number(max)}</text><text x="2" y="190" fontSize="12">{number(min)}</text><text x="60" y="217" fontSize="12">{analysis.inputs.asOf.slice(0,7)}</text><text x="630" y="217" textAnchor="end" fontSize="12">{analysis.points.at(-1)?.month.slice(0,7)}</text></svg>
  <details open><summary className="cursor-pointer py-2 font-medium">Assumptions</summary><ul className="list-disc space-y-1 pl-5">{Object.entries(analysis.assumptions).map(([field,value])=><li key={field}>{field.replaceAll('_',' ')}: {number(value)}{field.endsWith('_pct')?'%':' people/month'}</li>)}</ul>{analysis.interpretations.map((line,index)=><p key={index}>{line}</p>)}{!analysis.interpretations.length&&<p>Using the configured scenario defaults.</p>}</details>
  <details><summary className="cursor-pointer py-2">Data identity, method and monthly values</summary><p>Sources: {analysis.inputs.relations.join(', ')}. Active dataset version: unavailable. Input digest: <span className="break-all">{analysis.inputDigest}</span>.</p>{analysis.limitations.map((line,index)=><p key={index}>{line}</p>)}<div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Monthly headcount stock and flow</caption><thead><tr>{['Month','Opening','Hires','Exits','Transfers in','Transfers out','Closing'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{analysis.points.map(point=><tr key={point.month}>{[point.month.slice(0,7),number(point.opening),number(point.hires),number(point.exits),number(point.transfersIn),number(point.transfersOut),number(point.headcount)].map((value,index)=><td className="p-2" key={index}>{value}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
export function HomeSolutionConversationReview({controller,goal,pack,showSaved}:{controller:Controller;goal:string;pack:unknown;showSaved:boolean}){
 const latest=[...new Map(controller.state.working.map(item=>[item.id,item])).values()].filter(item=>!controller.state.rejected.some(rejected=>rejected.candidateId===item.id&&rejected.revision===item.revision));
 const analyses=[...new Map(controller.state.analyses.map(item=>[item.id,item])).values()];
 return <section aria-label="Solution conversation review" className="space-y-3">
  {controller.pending&&<div role="status" className="flex items-center gap-3"><p>Thinking through the question and checking useful calculations…</p><button className={button} onClick={controller.cancel}>Cancel request</button></div>}
  {controller.notice&&<p role="status">{controller.notice}</p>}
  {!!controller.state.constraints.length&&<details><summary className="cursor-pointer py-2 text-sm">Current interpreted constraints</summary>{controller.state.constraints.map(item=><p key={item.field} className="text-sm">{item.field.replaceAll('_',' ')}: {item.action==='remove'?'Removed':item.number??item.text} {item.unit}. Correct this in chat if needed.</p>)}</details>}
  {!!controller.state.verifiedMetrics.length&&<section aria-label="Checked quantitative results" className="rounded border p-3 text-sm"><h3 className="font-semibold">Checked quantitative results</h3>{controller.state.verifiedMetrics.map((ref,index)=>{const metric=resolveSolutionMetric(controller.state,ref);return <p key={index}>{metric.label}: {number(metric.value)} {metric.unit}. {metric.basis} · {metric.source}.</p>;})}<p>Effectiveness and savings are not established by these calculations.</p></section>}
  {analyses.map(item=><SolutionProjectionChart key={item.id+item.revision} analysis={item}/>)}
  {latest.map(item=><Proposal key={item.id+item.revision} item={item} controller={controller} goal={goal}/>)}
  {showSaved&&controller.saved&&<details open><summary className="cursor-pointer py-2 font-semibold">Saved Action Plans</summary>{controller.saved.order.map(id=><PlanAlternativeCard key={id} plan={controller.saved!.plans.find(item=>item.id===id)!} catalog={controller.saved!} measurePack={pack} contextCurrent={false}/>)}</details>}
 </section>;
}
