import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native Node tests share TypeScript source.
import {captureGoalProgressInput,goalProgressConversationEnabled} from './goal-progress-conversation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {prepareGoalProgressWrite,commitGoalProgress} from './goal-progress-store.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readGoalProgressLedger,appendGoalProgressEvent} from './goal-progress.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {progressEntryField,readProgressEntryState,verifyProgressEntryProposal,progressEntryDigest,progressEntryIssues,progressEntryCommands,sameProgressEntry,type ProgressEntryContext,type ProgressEntryProposal,type ProgressEntryState} from './goal-progress-entry.ts';
export function captureProgressEntry(store:DecisionStore,goalId:string,enabled=goalProgressConversationEnabled){return enabled?readProgressEntryState(store.getSnapshot().data.workspaces[goalId]?.fields[progressEntryField]):null;}
export async function retainProgressEntryProposal(store:DecisionStore,raw:unknown,context:ProgressEntryContext,{enabled=goalProgressConversationEnabled,current=()=>true}:{enabled?:boolean;current?:()=>boolean}={}){
 if(!enabled)throw Error('Progress entry is not enabled.');if(!current())throw Error('The progress request was cancelled or its conversation changed.');
 const ticket=prepareGoalProgressWrite(store,store.getDatasetToken()),proposal=await verifyProgressEntryProposal(raw,context);
 const input=captureGoalProgressInput(store,ticket.goalId,true);
 if(!input||ticket.goalId!==proposal.goalId||ticket.goal!==proposal.goal||proposal.ledgerDigest!==await progressEntryDigest([ticket.goalId,ticket.goal,ticket.datasetToken,input.ledger])||!sameProgressEntry(captureProgressEntry(store,ticket.goalId,true),context.previous))throw Error('The goal, progress or draft changed. Review the request again.');
 const fresh=prepareGoalProgressWrite(store,ticket.datasetToken);if(!sameProgressEntry(ticket,fresh))throw Error('Saved revision changed while checking the proposal.');
 if(!current())throw Error('The progress request was cancelled or its conversation changed.');
 store.commitGoalFields(ticket.goalId,ticket.goal,ticket.decisionRevision,new Date().toISOString(),()=>({[progressEntryField]:{version:1,proposal,status:'draft',confirmedAt:null} as unknown as Json}));
}
export async function confirmProgressEntry(store:DecisionStore,proposal:ProgressEntryProposal,{enabled=goalProgressConversationEnabled,now=new Date().toISOString()}={}){
 if(!enabled)throw Error('Progress entry is not enabled.');
 const ticket=prepareGoalProgressWrite(store,store.getDatasetToken()),saved=captureProgressEntry(store,ticket.goalId,true);
 if(saved?.status==='confirmed'&&sameProgressEntry(saved.proposal,proposal))return {changed:false};
 if(saved?.status!=='draft'||!sameProgressEntry(saved.proposal,proposal)||ticket.goalId!==proposal.goalId||ticket.goal!==proposal.goal||ticket.datasetToken!==proposal.datasetToken)throw Error('The reviewed progress draft changed or was cancelled.');
 const input=captureGoalProgressInput(store,ticket.goalId,true);if(!input?.ledger||input.unavailableReason)throw Error('Saved progress is unavailable.');
 const ledger=readGoalProgressLedger(input.ledger,ticket.goalId);
 if(proposal.ledgerDigest!==await progressEntryDigest([ticket.goalId,ticket.goal,ticket.datasetToken,ledger]))throw Error('The measurement, scope or progress changed. Refine the draft before confirming.');
 const issues=progressEntryIssues(proposal.spec,ledger,now.slice(0,10));if(issues.length||proposal.blocking.length)throw Error(issues[0]??proposal.blocking[0]);
 const commands=progressEntryCommands(proposal,ledger,now,await progressEntryDigest(proposal.spec));let next=ledger;for(const command of commands)next=appendGoalProgressEvent(next,command);
 if(!sameProgressEntry(captureProgressEntry(store,ticket.goalId,true),saved))throw Error('The progress draft changed while confirming.');
 return commitGoalProgress(store,ticket,commands,{at:now,currentDatasetToken:()=>store.getDatasetToken(),enabled,confirmedEntry:{...saved,status:'confirmed',confirmedAt:now} as unknown as Json});
}
export function cancelProgressEntry(store:DecisionStore,proposal:ProgressEntryProposal,enabled=goalProgressConversationEnabled){
 if(!enabled)throw Error('Progress entry is not enabled.');const ticket=prepareGoalProgressWrite(store,store.getDatasetToken()),saved=captureProgressEntry(store,ticket.goalId,true);
 if(saved?.status!=='draft'||!sameProgressEntry(saved.proposal,proposal)||ticket.goal!==proposal.goal)throw Error('The progress draft changed.');
 store.commitGoalFields(ticket.goalId,ticket.goal,ticket.decisionRevision,new Date().toISOString(),()=>({[progressEntryField]:{...saved,status:'cancelled'} as unknown as Json}));
}
export function progressEntryContext(store:DecisionStore,requestId:string,turns:ProgressEntryContext['turns'],enabled=goalProgressConversationEnabled):ProgressEntryContext|null{
 if(!enabled)return null;const snapshot=store.getSnapshot(),goal=snapshot.data.goals.goals.find(g=>g.id===snapshot.data.goals.activeId);if(!goal)return null;
 const input=captureGoalProgressInput(store,goal.id,true);if(!input) return null;
 return {input,goal:goal.statement,requestId,turns,previous:captureProgressEntry(store,goal.id,true),now:new Date().toISOString()};
}
export function progressEntryReviewStatus(state:ProgressEntryState|null){return state?.status??'absent';}
