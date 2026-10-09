/** Read-only presentation of existing progress and exact saved-plan records. */
// @ts-expect-error Native Node tests share TypeScript source.
import {buildGoalProgressContext,readGoalProgressLedger,HEADCOUNT_DEFINITION,type GoalProgressContext,type GoalScope,type ProgressObservation,type ProgressEvent} from './goal-progress.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey} from './home-bundle-reconciliation.ts';
const same=(a:GoalScope,b:GoalScope)=>a.country===b.country&&a.org===b.org&&a.level===b.level;
export function readProgressSnapshot(raw:unknown,goalId:string,asOf:string){
 const context=buildGoalProgressContext(raw,{goalId,asOf}),m=context.measurement;
 const ledger=readGoalProgressLedger(raw,goalId),events=ledger.events.filter(e=>e.at.slice(0,10)<=asOf);
 const observations=events.filter((e):e is Extract<ProgressEvent,{kind:'observed'}>=>e.kind==='observed'),superseded=new Set(observations.map(e=>e.supersedes));
 const supported=!!m&&m.metric==='headcount'&&m.definition===HEADCOUNT_DEFINITION&&m.unit==='people';
 const comparable=(o:ProgressObservation)=>!!m&&supported&&o.metric===m.metric&&o.definition===m.definition&&o.unit===m.unit&&same(o.scope,m.scope)&&o.source.lineageId===m.lineageId&&o.source.classification!=='scenario'&&o.period.kind==='point'&&o.value!==null&&o.quality.complete&&!o.quality.suppressed&&(!o.quality.denominatorRequired||!!o.quality.denominator)&&o.period.end<=asOf&&o.capturedAt.slice(0,10)<=asOf;
 const baseline=context.assessment.baseline&&comparable(context.assessment.baseline.observation)?context.assessment.baseline.observation:null;
 const latest=context.assessment.latestComparable?.observation??(!baseline?observations.filter(e=>!superseded.has(e.id)&&comparable(e.data)).sort((a,b)=>a.data.period.end.localeCompare(b.data.period.end)||Date.parse(a.data.capturedAt)-Date.parse(b.data.capturedAt)).at(-1)?.data:null);
 const stale=!!latest&&!!m&&(Date.parse(asOf)-Date.parse(latest.period.end))/86400000>m.maxAgeDays;
 const nextAction=!m?'Define a metric, scope, dated baseline and target in chat.':!supported?'This metric has no supported measurement summary; review its definition in chat.':!baseline?'Record and review a dated baseline in chat.':!latest||latest.period.end===baseline.period.end?'Record a later dated measurement in chat, then review and confirm it.':stale?'Record a fresh dated measurement in chat, then review and confirm it.':context.assessment.latestReceivedId!==context.assessment.latestComparable?.id?'Review the latest report’s date, scope and quality in chat.':'Review the dated result and the proposed plan steps before acting.';
 return {context,baseline,latest:latest??null,stale,supported,hasObservations:observations.length>0,nextAction};
}
export type ProgressSnapshot=ReturnType<typeof readProgressSnapshot>;
export function readProgressLinkedPlan(rawLedger:unknown,fields:Record<string,unknown>,context:GoalProgressContext,goal:string,datasetToken:string){
 const unavailable={status:'unavailable' as const,label:context.planLinks.length?'Linked plan could not be verified for this goal and dataset.':'No saved plan linked.',steps:[]};
 try{
  const link=context.planLinks.at(-1);if(!link)return unavailable;
  const ledger=readGoalProgressLedger(rawLedger,context.goalId),event=ledger.events.find((e):e is Extract<ProgressEvent,{kind:'plan-linked'}>=>e.kind==='plan-linked'&&e.id===link.id);
  if(!event||event.data.datasetToken!==datasetToken)return unavailable;
  const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:context.goalId,goal}),plan=catalog?.plans.find(p=>p.id===link.planId&&!p.deleted);
  if(!plan||plan.draft.revision!==link.revision||bundleInputKey(plan.draft)!==event.data.inputKey||plan.draft.binding.evidenceDigest!==link.evidenceDigest)return unavailable;
  return {status:'available' as const,label:`Action Plan #${plan.number} · ${plan.draft.bundle.name} · revision ${plan.draft.revision}`,steps:plan.draft.bundle.components.map(c=>({id:c.id,name:c.name,ownerRole:c.ownerRole,firstStep:c.firstStep,checkpoint:plan.draft.inputs.timing.find(t=>t.componentId===c.id)?.finish??null}))};
 }catch{return unavailable;}
}
export type ProgressLinkedPlan=ReturnType<typeof readProgressLinkedPlan>;
