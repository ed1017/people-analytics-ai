'use client';
import {useEffect,useState} from 'react';
import {buildGoalProgressContext,emptyGoalProgress,goalProgressEnabled,goalProgressField,type GoalProgressContext} from '@/lib/goal-progress';
import {readHomeGuideOrigin,homeGuideOriginField} from '@/lib/home-guide-origin';
import {readHomeDemo,homeDemoField} from '@/lib/home-demo-catalog';
import {decisionStore,useDecisionStorage} from './decision-store';
const number=(value:number|null)=>value===null?'Undefined':value.toLocaleString('en-US',{maximumFractionDigits:1});
const labels={undefined:'Progress is undefined',unavailable:'Current progress cannot be confirmed',baseline_only:'Baseline recorded; no later result',deadline_passed:'Target date has passed; review dated results',within_limit:'Within the limit at the observation date',outside_limit:'Above the saved limit at the observation date',meets_point_target:'Point target met at the observation date',behind_reference:'Behind the arithmetic reference',at_or_beyond_reference:'At or beyond the arithmetic reference'};
/** One shared readable view; no forms, model calls, ingestion or implicit writes. */
export function GoalProgressSummary({context}:{context:GoalProgressContext}){
 const a=context.assessment,m=context.measurement,o=a.latestComparable?.observation;
 return <section aria-label="Goal progress" className="m-4 space-y-2 rounded border p-4 text-sm">
  <h2 className="font-semibold">Goal progress · {labels[a.currentStatus]}</h2>
  <p>Browser-local only · not shared across devices or with a team.{context.origin==='demo'?' Fictional demo goal; reopening does not change its origin.':''}</p>
  {m&&<p>Saved goal scope: {m.scope.country} / {m.scope.org} / {m.scope.level}. Page filters do not change this measurement. Target: {number(m.target.value)} {m.unit} by {m.target.date} ({m.direction==='maintain'||m.direction==='ceiling'?'at or below':m.direction}).</p>}
  {a.baseline&&<p>Baseline: {number(a.baseline.observation.value)} {m?.unit} on {a.baseline.observation.period.end}.</p>}
  {o&&<><p>Latest comparable result: {number(o.value)} {m?.unit} on {o.period.end} · {o.source.classification}. Captured {o.capturedAt}; source release {o.source.releaseId}.</p><p>Change from baseline: {number(a.change)} {m?.unit}. Remaining gap: {number(a.gap)} {m?.unit}.{a.intendedChangePercent!==null?` ${number(a.intendedChangePercent)}% of intended ${m?.direction}; not completion.`:' No completion percentage is inferred.'}</p></>}
  {a.reference&&<p>{a.reference.kind==='accepted-milestone'?'Accepted milestone':'Linear arithmetic reference'}: {number(a.reference.value)} {m?.unit} at {a.reference.date}. Result minus reference: {number(a.reference.difference)} {m?.unit}.</p>}
  {a.requiredPace&&<p>Required pace: {number(a.requiredPace.value)} {a.requiredPace.unit}, from observation {a.requiredPace.from} through {a.requiredPace.through}. Arithmetic requirement, not a forecast.</p>}
  {a.reasons.length>0&&<ul className="list-disc pl-5">{a.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
  <p>Forecast unavailable. No success probability, confidence or completed-goal claim. Plan selection and attachment are not implementation or measured impact.</p>
  {context.milestones.length>0&&<details><summary>Milestones</summary><ul>{context.milestones.map(milestone=><li key={milestone.id}>{milestone.date}: {number(milestone.value)} {m?.unit} · {milestone.status}. {milestone.status==='proposed'?'Requires intentional acceptance.':''}</li>)}</ul></details>}
  {context.history.length>0&&<details><summary>Dated assessment history</summary><ul>{context.history.map(item=><li key={item.id}>{item.at}: {item.status} · measurement {item.measurementId}; observation {item.observationId??'unavailable'}.{item.assessmentVersion===1?' Historical result under earlier assessment rules; current results use corrected rules.':''}</li>)}</ul></details>}
 </section>;
}
function SelectedProgress(){
 const state=useDecisionStorage(),[today,setToday]=useState<string|null>(null);
 useEffect(()=>{const update=()=>setToday(new Date().toISOString().slice(0,10));update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[]);
 const goalId=state.data.goals.activeId;if(!state.ready||!goalId||!today)return null;
 let context:GoalProgressContext|null=null;
 try{const fields=state.data.workspaces[goalId]?.fields??{},demo=!!readHomeGuideOrigin(fields[homeGuideOriginField],goalId)||!!readHomeDemo(fields[homeDemoField],goalId);context=buildGoalProgressContext(decisionStore.getField(goalId,goalProgressField,emptyGoalProgress(goalId,demo?'demo':'authored')),{goalId,asOf:today,currentSource:null});}catch{/* Keep saved bytes unchanged; no invalid record becomes a current result. */}
 if(!context)return <p role="status" className="m-4">Saved progress could not be verified. Its earlier history is retained; resolve browser storage before recording a result.</p>;
 return <GoalProgressSummary context={context}/>;
}
export function SelectedGoalProgress(){return goalProgressEnabled?<SelectedProgress/>:null;}
