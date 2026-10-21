import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native Node tests share TypeScript source.
import {readHomeGuideOrigin,homeGuideOriginField} from './home-guide-origin.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readHomeDemo,homeDemoField} from './home-demo-catalog.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {appendGoalProgressEvent,emptyGoalProgress,goalProgressEnabled,goalProgressField,readGoalProgressLedger,recordGoalProgressAssessment,type ProgressEvent,type ProgressCurrentSource} from './goal-progress.ts';
import {validDatasetToken} from './dataset-identity.mjs';
export type ProgressWriteTicket={datasetToken:string;goalId:string;goal:string;decisionRevision:number};
export type ProgressCommand=ProgressEvent|{kind:'assess';id:string;at:string;currentSource:ProgressCurrentSource|null};
export function prepareGoalProgressWrite(store:DecisionStore,datasetToken:string):ProgressWriteTicket{
 const state=store.getSnapshot(),goal=state.data.goals.goals.find(g=>g.id===state.data.goals.activeId);
 if(!validDatasetToken(datasetToken)||store.getDatasetToken()!==datasetToken||!state.ready||!state.saved||state.recovery||!goal)throw Error('A saved, current goal and dataset workspace are required.');
 return {datasetToken,goalId:goal.id,goal:goal.statement,decisionRevision:state.data.revision};
}
export function commitGoalProgress(store:DecisionStore,ticket:ProgressWriteTicket,commands:ProgressCommand[],options:{at:string;currentDatasetToken:()=>string;signal?:AbortSignal;enabled?:boolean;confirmedEntry?:Json}){
 if(!(options.enabled??goalProgressEnabled))throw Error('Goal progress is not enabled.');
 options.signal?.throwIfAborted();const fresh=prepareGoalProgressWrite(store,options.currentDatasetToken());
 if(JSON.stringify(fresh)!==JSON.stringify(ticket))throw Error('Goal, dataset or saved revision changed. Review the progress request again.');
 if(!Array.isArray(commands)||commands.length<1||commands.length>6)throw Error('Use one bounded progress transaction.');
 const fields=store.getSnapshot().data.workspaces[ticket.goalId]?.fields??{},demo=!!readHomeGuideOrigin(fields[homeGuideOriginField],ticket.goalId)||!!readHomeDemo(fields[homeDemoField],ticket.goalId);
 const previous=fields[goalProgressField]===null||fields[goalProgressField]===undefined?emptyGoalProgress(ticket.goalId,demo?'demo':'authored'):readGoalProgressLedger(fields[goalProgressField],ticket.goalId);
 if(demo&&previous.origin!=='demo')throw Error('Demo origin cannot be removed from progress.');let next=previous;
 for(const command of commands){
  if(command.at!==options.at)throw Error('A progress transaction uses one explicit recording time.');
  if(command.kind==='observed'&&command.data.source.datasetToken!==ticket.datasetToken)throw Error('Observation belongs to a different dataset workspace.');
  if(command.kind==='plan-linked'){
   const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:ticket.goalId,goal:ticket.goal}),plan=catalog?.plans.find(p=>p.id===command.data.planId&&!p.deleted);
   if(!plan||plan.draft.revision!==command.data.revision||plan.result.inputKey!==command.data.inputKey||plan.draft.binding.evidenceDigest!==command.data.evidenceDigest||command.data.datasetToken!==ticket.datasetToken)throw Error('The exact saved plan revision or inputs changed.');
  }
  next=command.kind==='assess'?recordGoalProgressAssessment(next,command.id,command.at,command.currentSource):appendGoalProgressEvent(next,command);
 }
 options.signal?.throwIfAborted();if(options.currentDatasetToken()!==ticket.datasetToken)throw Error('Dataset changed before progress could be saved.');
 if(next.events.length===previous.events.length&&!options.confirmedEntry)return {changed:false,revision:ticket.decisionRevision};
 const revision=store.commitGoalFields(ticket.goalId,ticket.goal,ticket.decisionRevision,options.at,()=>({[goalProgressField]:next as unknown as Json,...(options.confirmedEntry?{goalProgressEntryV1:options.confirmedEntry}:{})}));return {changed:next.events.length!==previous.events.length,revision};
}
