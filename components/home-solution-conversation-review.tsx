'use client';
import {useState} from 'react';
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
/** Only the freshly reviewed conversational lead gets a recommendation label.
 * Saved catalogue order and discussion-only focus never establish a recommendation. */
function recommendedProposal(controller:Controller){
 const item=currentSolutionProposals(controller.state).find(item=>item.id===controller.state.focusCandidateId),turn=controller.state.turns.at(-1),user=controller.state.turns.at(-2);
 if(controller.pending||!item||turn?.role!=='assistant'||turn.id!=='reply-'+item.requestId.slice(0,70)||user?.id!==item.message.id||item.blocking.length||JSON.stringify(item.constraints)!==JSON.stringify(controller.state.constraints)||controller.saved?.plans.some(plan=>plan.operation?.proposalKey===JSON.stringify(item.candidate)))return null;
 return item.id;
}
/** Direct access to the actual review cards, without changing selection or saving. */
export function HomeSolutionProposalLinks({controller}:{controller:Controller}){
 const proposals=currentSolutionProposals(controller.state),recommendedId=recommendedProposal(controller);
 if(!proposals.length)return null;
 const links=(items:SolutionEvaluation[])=>items.map(item=><button key={item.id} type="button" className={button+' min-w-0 max-w-full break-words text-left'} onClick={()=>{const card=document.getElementById(proposalAnchor(item.id));card?.scrollIntoView({block:'start'});card?.focus({preventScroll:true});}}>Review {proposals.indexOf(item)+1}: {item.candidate.name}</button>);
 return <nav aria-label="Review proposed Action Plans" className="space-y-2 text-sm"><p className="font-semibold">{recommendedId?'Recommended Action Plan':'Proposed Action Plans'} <span className="font-normal text-muted-foreground">· review before saving</span></p><div className="flex flex-wrap gap-2">{links(recommendedId?proposals.filter(item=>item.id===recommendedId):proposals)}</div>{recommendedId&&proposals.length>1&&<><p className="font-semibold">Alternative Action Plans</p><div className="flex flex-wrap gap-2">{links(proposals.filter(item=>item.id!==recommendedId))}</div></>}</nav>;
}
function Proposal({item,controller,goal,number:proposalNumber,label}:{item:SolutionEvaluation;controller:Controller;goal:string;number:number;label:string}){
 const [statement,setStatement]=useState(goal||item.candidate.goal.statement);
 const stale=JSON.stringify(item.constraints)!==JSON.stringify(controller.state.constraints),saved=controller.saved?.plans.find(plan=>plan.operation?.proposalKey===JSON.stringify(item.candidate));
 return <article id={proposalAnchor(item.id)} tabIndex={-1} aria-label={`Working proposal: ${item.candidate.name}`} className="space-y-3 rounded border p-3 text-sm focus-visible:ring-2 focus-visible:ring-ring">
  <p className="text-xs font-medium">{label} · proposal {proposalNumber} · {saved?'saved proposal':'Not saved'} · effectiveness is unproven</p><h3 className="font-semibold">{item.candidate.name} · revision {item.revision}</h3><p><strong>Intended outcome:</strong> {item.candidate.objective}</p>
  <ol className="list-decimal space-y-2 pl-5">{item.candidate.activities.map(activity=>{const component=item.draft?.bundle.components.find(part=>part.id===activity.id),timing=item.draft?.inputs.timing.find(row=>row.componentId===activity.id);return <li key={activity.id}><strong>{component?.name??activity.name}</strong><p>{component?.firstStep??activity.step}</p><p><strong>Suggested owner:</strong> {component?.ownerRole??activity.ownerRole}</p><p className="text-xs"><strong>Timing:</strong> {timing?.start.value??'Start not confirmed'} → {timing?.finish.value??'Finish not confirmed'}. Follow the proposed step sequence; dates and availability need review.</p><p className="text-xs">{component?.limitation??activity.limitation}</p></li>;})}</ol>
  <p><strong>Next step:</strong> {item.candidate.nextStep}</p><p><strong>Success measure:</strong> {item.candidate.successMeasure}</p>
  {item.result?.calculationStatus==='awaiting-scope'?<p>Qualitative proposal · population or horizon still needs review. Resource totals have not been calculated.</p>:<p>Calculated cash: {item.result?.cashEstimate?.cash==null?'Unknown':`$${number(item.result.cashEstimate.cash)} USD`} · staff effort: {number(item.result?.deliveryEstimate?.hours)} hours · distinct participants: {number(item.result?.uniqueParticipants)}.</p>}
  <details><summary className="cursor-pointer py-2 font-medium">Rationale, approach and tradeoffs</summary><p>{item.candidate.rationale}</p><p>{item.candidate.approach}</p><p><strong>Tradeoffs:</strong> {item.candidate.tradeoffs.join(' ')||'Not yet evaluated.'}</p></details>
  <details open={!!item.blocking.length||stale}><summary className="cursor-pointer py-2 font-medium">Review interpreted inputs and changes</summary><ul className="list-disc space-y-1 pl-5">{[...item.interpretations,...item.changes].map((line,index)=><li key={index}>{line}</li>)}</ul>{!item.interpretations.length&&<p>No new quantities were supplied. Missing assumptions remain unknown.</p>}</details>
  {[...item.blocking,...(stale?['Current constraints changed. Refine this proposal in chat before saving.']:[])].map((line,index)=><p key={index} role="status">{line}</p>)}
  {!!item.issues.length&&<details><summary className="cursor-pointer py-2">Unknowns and calculation limits ({item.issues.length})</summary><ul className="list-disc space-y-1 pl-5">{item.issues.map((line,index)=><li key={index}>{line}</li>)}</ul></details>}
  <p><strong>Goal:</strong> {statement}</p>
  {!goal&&<OptionalConversationForm label="goal form"><label className="block">Goal for this proposal<input className="mt-1 w-full rounded border p-2" value={statement} maxLength={240} onChange={event=>setStatement(event.target.value)}/></label></OptionalConversationForm>}
  {!!item.issues.length&&<p>Choosing acknowledges the listed unknowns and keeps them for review.</p>}
  <p className="text-xs">Choosing saves the goal and attaches this proposal; no operational changes are applied.</p>
  <div className="flex flex-wrap gap-2"><button data-guide-target="choose-proposal" data-guide-candidate={item.id} data-guide-revision={item.revision} data-guide-request={item.requestId} className={button} disabled={!controller.canSend||controller.pending||controller.saving||stale||!!item.blocking.length||!item.draft||!statement.trim()||!!saved} onClick={()=>void controller.save(item,true,statement)}>{saved?`Selected as Action Plan #${saved.number}`:item.issues.length?'Choose this plan with unknowns':'Choose this plan'}</button><button className={button} disabled={controller.pending||controller.saving||!controller.canSend} onClick={()=>controller.reject(item)}>Discard proposal</button></div>
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
  <details><summary className="cursor-pointer py-2">Data identity, method and monthly values</summary><p>Sources: {analysis.inputs.relations.join(', ')}. Active dataset version: <span className="break-all">{analysis.inputs.datasetVersion?.datasetToken??'unavailable'}</span>. Input digest: <span className="break-all">{analysis.inputDigest}</span>.</p>{analysis.inputs.datasetVersion&&<p>Dataset cutoff: {analysis.inputs.datasetVersion.cutoff}. Bundle digest: <span className="break-all">{analysis.inputs.datasetVersion.bundleDigest}</span>.</p>}{analysis.limitations.map((line,index)=><p key={index}>{line}</p>)}<div className="overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Monthly headcount stock and flow</caption><thead><tr>{['Month','Opening','Hires','Exits','Transfers in','Transfers out','Closing'].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{analysis.points.map(point=><tr key={point.month}>{[point.month.slice(0,7),number(point.opening),number(point.hires),number(point.exits),number(point.transfersIn),number(point.transfersOut),number(point.headcount)].map((value,index)=><td className="p-2" key={index}>{value}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
export function HomeSolutionConversationReview({controller,goal,pack,showSaved}:{controller:Controller;goal:string;pack:unknown;showSaved:boolean}){
 const latest=currentSolutionProposals(controller.state),recommendedId=recommendedProposal(controller);
 const displayed=recommendedId?[...latest.filter(item=>item.id===recommendedId),...latest.filter(item=>item.id!==recommendedId)]:latest;
 const analyses=[...new Map(controller.state.analyses.map(item=>[item.id,item])).values()];
 return <section aria-label="Solution conversation review" className="space-y-3">
  {controller.pending&&<div role="status" className="flex items-center gap-3"><p>Thinking through the question and checking useful calculations…</p><button className={button} onClick={controller.cancel}>Cancel request</button></div>}
  {controller.notice&&<p role="status">{controller.notice}</p>}
  {!!controller.state.constraints.length&&<details><summary className="cursor-pointer py-2 text-sm">Current interpreted constraints</summary>{controller.state.constraints.map(item=><p key={item.field} className="text-sm">{item.field.replaceAll('_',' ')}: {item.action==='remove'?'Removed':item.number??item.text} {item.unit}. Correct this in chat if needed.</p>)}</details>}
  {!!controller.state.verifiedMetrics.length&&<details aria-label="Checked quantitative results" className="rounded border p-3 text-sm"><summary className="cursor-pointer py-2 font-semibold">Checked results and sources</summary>{controller.state.verifiedMetrics.map((ref,index)=>{const metric=resolveSolutionMetric(controller.state,ref);return <p key={index}>{metric.label}: {number(metric.value)} {metric.unit}. {metric.basis} · {metric.source}.</p>;})}<p>Effectiveness and savings are not established by these calculations.</p></details>}
  <HomeBusinessPlanningReview controller={controller}/>
  {analyses.map(item=><SolutionProjectionChart key={item.id+item.revision} analysis={item}/>)}
  {!!latest.length&&!!controller.state.questions.length&&<section aria-label="Optional questions before choosing a plan" className="space-y-2 rounded border p-3 text-sm">
   <h3 className="font-semibold">Before you choose — optional questions</h3>
   <ol className="list-decimal space-y-1 pl-5">{controller.state.questions.map((question,index)=><li key={index}>{question}</li>)}</ol>
   <p>Answer in chat for new or revised plans, or skip these questions and review any plan below. Your answers do not save a plan.</p>
  </section>}
  {displayed.map(item=><Proposal key={item.id+item.revision} item={item} controller={controller} goal={goal} number={latest.indexOf(item)+1} label={recommendedId===item.id?'Recommended Action Plan':recommendedId?'Alternative Action Plan':'Proposed Action Plan'}/>)}
  {!!latest.length&&<p className="text-sm">Refine a plan, combine ideas or ask for alternatives in chat.</p>}
  {showSaved&&controller.saved&&<details open><summary className="cursor-pointer py-2 font-semibold">Saved Action Plans</summary>{controller.saved.order.map(id=><PlanAlternativeCard key={id} plan={controller.saved!.plans.find(item=>item.id===id)!} catalog={controller.saved!} measurePack={pack} contextCurrent={false}/>)}</details>}
 </section>;
}
