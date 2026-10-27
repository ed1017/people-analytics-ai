'use client';
import {solutionConversationEnabled} from '@/lib/home-solution-conversation';
import {pinnedActionPlans} from '@/lib/pinned-action-plans';
import {alternativeViewField} from '@/lib/home-plan-alternative-chat';
import {useEffect,useState} from 'react';
import {emptyGoalProgress,goalProgressEnabled,goalProgressField,type GoalProgressContext} from '@/lib/goal-progress';
import {readProgressSnapshot,readProgressLinkedPlan,type ProgressSnapshot,type ProgressLinkedPlan} from '@/lib/goal-progress-summary';
import {readHomeGuideOrigin,homeGuideOriginField} from '@/lib/home-guide-origin';
import {readHomeDemo,homeDemoField} from '@/lib/home-demo-catalog';
import {decisionStore,useDecisionStorage} from './decision-store';
const number=(value:number|null)=>value===null?'Unavailable':value.toLocaleString('en-US',{maximumFractionDigits:1});
const classification=(value:string)=>value==='user-reported'?'User-reported · unverified':value==='recorded-synthetic'?'Synthetic measured fixture':'Recorded workforce observation';
const targetDirection={increase:'Higher is better',decrease:'Lower is better',maintain:'Maintain the target',ceiling:'At or below the limit'};
/** Compact saved-record read. No forms, forecasts, ingestion or implicit writes. */
export function GoalProgressSummary({context,snapshot,plan,goal,pinnedPlanName}:{pinnedPlanName?:string;context:GoalProgressContext;snapshot?:ProgressSnapshot;plan?:ProgressLinkedPlan;goal?:string}){
 const a=context.assessment,m=context.measurement,baseline=snapshot?snapshot.baseline:a.baseline?.observation,latest=snapshot?snapshot.latest:a.latestComparable?.observation;
 const next=snapshot?.nextAction??'Review the measurement definition and record dated results in chat.';
 const absent=!snapshot?.hasObservations&&!baseline&&!latest,missing=absent?'Not yet measured':'Comparable measurement unavailable';
 const unconfigured=!!snapshot&&!m&&absent&&!snapshot.stale&&!a.latestReceivedId&&a.currentStatus==='undefined'&&a.gap===null&&!context.history.length&&!context.milestones.length&&!context.planLinks.length&&!pinnedPlanName&&plan?.status!=='available';
 const content=<section aria-label="Goal progress" className="min-w-0 space-y-1 break-words rounded border p-3 text-sm">
  <h2 className="font-semibold">Goal progress{goal?` · ${goal}`:''}</h2>
  {pinnedPlanName&&<p><strong>Pinned proposal:</strong> {pinnedPlanName}.</p>}
  <p aria-label="Saved progress target"><strong>Target:</strong> {m?`${number(m.target.value)} ${m.unit} by ${m.target.date} · ${targetDirection[m.direction]}`:'Not defined. Review a metric, scope, baseline and target before tracking progress.'}</p>
  <p><strong>Measured progress:</strong> {latest?`${number(latest.value)} ${m?.unit} · ${latest.period.end} · ${classification(latest.source.classification)}${snapshot?.stale?' · Stale under saved freshness policy':''}${baseline&&latest.period.end===baseline.period.end?' · Baseline only; no later measurement':''}`:missing}.</p>
  {m&&<p className="text-xs">Saved scope: {m.metric} · {m.scope.country} / {m.scope.org} / {m.scope.level}. Page filters do not change this scope.</p>}

  {m&&a.assessedOn>m.target.date&&<p className="text-sm" aria-label="Goal deadline status">Deadline passed ({m.target.date}); review dated evidence.</p>}
  <p><strong>Next action:</strong> {next}</p>
  <details>
   <summary className="min-h-11 cursor-pointer rounded py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Measurement details and plan link</summary>
   <div className="space-y-3 pt-2">
  <dl className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
   <div><dt className="text-xs text-muted-foreground">Baseline</dt><dd>{baseline?`${number(baseline.value)} ${m?.unit}`:missing}</dd>{baseline&&<dd className="text-xs">{baseline.period.end} · {classification(baseline.source.classification)}</dd>}</div>
   <div><dt className="text-xs text-muted-foreground">Latest dated measurement</dt><dd>{latest?`${number(latest.value)} ${m?.unit}`:missing}</dd>{latest&&<dd className="text-xs">{latest.period.end} · {classification(latest.source.classification)}{snapshot?.stale?' · Stale under saved freshness policy':''}{baseline&&latest.period.end===baseline.period.end?' · Baseline only; no later measurement':''}</dd>}</div>
   <div><dt className="text-xs text-muted-foreground">Target</dt><dd>{m?`${number(m.target.value)} ${m.unit}`:'Not defined'}</dd>{m&&<dd className="text-xs">{targetDirection[m.direction]}</dd>}</div>
   <div><dt className="text-xs text-muted-foreground">Deadline</dt><dd>{m?.target.date??'Not defined'}</dd></div>
   <div><dt className="text-xs text-muted-foreground">Remaining gap</dt><dd>{a.gap!==null?`${number(a.gap)} ${m?.unit}`:'Unavailable'}</dd>{a.gap!==null&&<dd className="text-xs">At {a.latestComparable?.observation.period.end}; dated arithmetic{snapshot?.stale?', stale':''}</dd>}</div>
   <div><dt className="text-xs text-muted-foreground">Execution status</dt><dd>Not recorded</dd><dd className="text-xs">Plan selection does not record implementation</dd></div>
  </dl>
  <p className="text-xs">Saved in this browser. Update measurements in normal chat, then review and confirm the proposed entry. No progress is saved by viewing this summary.</p>
  <div><p><strong>{pinnedPlanName?'Plan link:':'Linked plan:'}</strong> {pinnedPlanName&&!context.planLinks.length?'No saved plan link. Progress entries are recorded separately from pinned proposals.':plan?.label??(context.planLinks.length?'Linked plan details unavailable.':'No saved plan linked.')}</p>{plan?.status==='available'&&<><p className="text-xs">Owner assignment and completed steps are not recorded. Roles and checkpoints below are proposed assumptions.</p><details><summary className="min-h-11 cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Proposed owners and plan steps</summary><ul className="space-y-2">{plan.steps.map(step=><li key={step.id}><strong>{step.name}</strong> · {step.ownerRole} (proposed role)<p>Proposed first step: {step.firstStep}</p><p className="text-xs">Checkpoint: {step.checkpoint?.value??'Not supplied'}{step.checkpoint?.value?` · ${step.checkpoint.kind} assumption`:''}; completion not recorded.</p></li>)}</ul></details></>}</div>
  {context.milestones.length>0&&<details><summary className="min-h-11 cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Saved target milestones</summary><p>Accepted means the target was accepted, not achieved. Milestones are not observed outcomes.</p><ul>{context.milestones.map(item=><li key={item.id}>{item.date}: {number(item.value)} {m?.unit} · {item.status.replaceAll('-',' ')}. {item.status==='proposed'?'Proposed target; not a measured result.':''}</li>)}</ul></details>}
  <details><summary className="min-h-11 cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Measurement scope and evidence</summary>{m&&<p>{m.metric} · {m.scope.country} / {m.scope.org} / {m.scope.level}. Page filters do not change this saved scope. Freshness: {m.maxAgeDays} days.</p>}{a.reasons.length>0&&<ul className="list-disc pl-5">{a.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}{latest&&<p>Captured {latest.capturedAt}; source release {latest.source.releaseId}.</p>}<p>No trajectory, forecast, on-track status or completion claim is inferred.</p>{context.history.length>0&&<p>{context.history.length} recent dated assessments remain in saved history; their references do not establish current execution or measured impact.</p>}</details>
   </div>
  </details>
 </section>;
 return unconfigured?<details className="min-w-0 text-sm"><summary className="min-h-11 cursor-pointer rounded py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Goal progress · Not yet measured</summary>{content}</details>:content;
}
function SelectedProgress(){
 const state=useDecisionStorage(),[today,setToday]=useState<string|null>(null);
 useEffect(()=>{const update=()=>setToday(new Date().toISOString().slice(0,10));update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[]);
 const goal=state.data.goals.goals.find(g=>g.id===state.data.goals.activeId);if(!state.ready||!goal||!today)return null;
 let snapshot:ProgressSnapshot|null=null,plan:ProgressLinkedPlan|undefined;
 try{const fields=state.data.workspaces[goal.id]?.fields??{},demo=!!readHomeGuideOrigin(fields[homeGuideOriginField],goal.id)||!!readHomeDemo(fields[homeDemoField],goal.id),raw=fields[goalProgressField]??emptyGoalProgress(goal.id,demo?'demo':'authored');snapshot=readProgressSnapshot(raw,goal.id,today);plan=readProgressLinkedPlan(raw,fields,snapshot.context,goal.statement,decisionStore.getDatasetToken());}catch{/* Saved bytes remain unchanged. */}
 if(!snapshot)return <p role="status" className="m-4">Saved progress could not be verified. Its earlier history is retained; resolve browser storage before recording a result.</p>;
 const fields=state.data.workspaces[goal.id]?.fields??{},view=fields[alternativeViewField] as {selectedId?:string}|undefined,pins=solutionConversationEnabled?pinnedActionPlans([goal],state.data.workspaces).filter(item=>!item.legacy):[],pin=pins.find(item=>item.planId===view?.selectedId)??pins[0];
 return <div className="m-4 min-w-0"><GoalProgressSummary pinnedPlanName={pin?.name} context={snapshot.context} snapshot={snapshot} plan={plan} goal={goal.statement}/></div>;
}
export function SelectedGoalProgress(){return goalProgressEnabled?<SelectedProgress/>:null;}
