import type {DecisionStore} from './local-decisions';
import type {WorkloadCapacityInput} from './workload-capacity';
import type {WorkloadSaveTicket,WorkloadPlanSnapshotV1} from './workload-plan-records';
// @ts-expect-error Native tests share TypeScript source.
import {calculateWorkloadCapacity} from './workload-capacity.ts';
// @ts-expect-error Native tests share TypeScript source.
import {actionBindingKey} from './home-action-drafts.ts';
// @ts-expect-error Native tests share TypeScript source.
import {createWorkloadPlanSnapshot,workloadSnapshotKey,workloadEqual,assertWorkloadSnapshotCurrent} from './workload-plan-records.ts';
// @ts-expect-error Native tests share TypeScript source.
import {readPlanAlternatives,packPlanAlternatives,appendWorkloadAlternative,associatePlanProposal,applyPlanAlternative,planAlternativesField} from './home-plan-alternatives.ts';
export type WorkloadSaveReview={snapshot:WorkloadPlanSnapshotV1;ticket:WorkloadSaveTicket;requestId:string;attachmentId:string;at:string;sourcePlanId:string|null};
function guard(store:DecisionStore,input:WorkloadCapacityInput,sourceKey:string){const state=store.getSnapshot(),id=input.identity;if(!state.ready||!state.saved||store.getDatasetToken()!==id.datasetToken||state.data.goals.activeId!==id.goalId||state.data.goals.goals.find(g=>g.id===id.goalId)?.statement!==id.goal||calculateWorkloadCapacity(input).sourceKey!==sourceKey)throw Error('The current goal, dataset, workload revision or accepted assumptions changed. Review again.');return state;}
export function prepareWorkloadSave(store:DecisionStore,input:WorkloadCapacityInput,optionId:string,acceptedAt:string,sourceKey:string,sourcePlanId:string|null=null):WorkloadSaveReview{
 const state=guard(store,input,sourceKey);return {snapshot:createWorkloadPlanSnapshot(input,optionId,acceptedAt,sourceKey),ticket:{goalId:input.identity.goalId,goal:input.identity.goal,datasetToken:store.getDatasetToken(),decisionRevision:state.data.revision,sourceKey,selectedOptionId:optionId},requestId:'workload-'+crypto.randomUUID(),attachmentId:'workload-'+crypto.randomUUID(),at:new Date().toISOString(),sourcePlanId};
}
export function commitWorkloadSave(store:DecisionStore,review:WorkloadSaveReview,currentInput:WorkloadCapacityInput,currentOptionId:string){
 const state=guard(store,currentInput,review.ticket.sourceKey),s=review.snapshot;assertWorkloadSnapshotCurrent(s,review.ticket,currentInput,currentOptionId,store.getDatasetToken());if(!workloadEqual(s.input,currentInput)||s.report.sourceKey!==review.ticket.sourceKey||state.data.revision!==review.ticket.decisionRevision)throw Error('The workload review or browser-store revision changed. Previous plans are kept.');
 const context={goalId:s.input.identity.goalId,goal:s.input.identity.goal},raw=state.data.workspaces[context.goalId]?.fields[planAlternativesField],catalog=raw===undefined?null:readPlanAlternatives(raw,context);if(raw!==undefined&&!catalog)throw Error('Saved history cannot be verified.');
 function build(latestFields:Record<string,unknown>){guard(store,currentInput,review.ticket.sourceKey);assertWorkloadSnapshotCurrent(s,review.ticket,currentInput,currentOptionId,store.getDatasetToken());const value=latestFields[planAlternativesField],latest=value===undefined?null:readPlanAlternatives(value,context);if(value!==undefined&&!latest)throw Error('Saved history cannot be verified.');const source=review.sourcePlanId?latest?.plans.find(p=>p.id===review.sourcePlanId):null;if(review.sourcePlanId&&!source)throw Error('The source workload proposal is unavailable.');
  const outcome=appendWorkloadAlternative(latest,context,{requestId:review.requestId,text:'Save reviewed workload proposal',sourceIds:source?[source.id]:[],expectedInputs:source?{[source.id]:source.result.inputKey}:{}},s,workloadSnapshotKey(s));if(outcome.status!=='ready')throw Error('Workload proposal needs review.');
  const next=associatePlanProposal(outcome.catalog,context,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:review.attachmentId,at:review.at,acknowledgeUnknowns:true,workloadProof:{datasetToken:store.getDatasetToken(),sourceKey:review.ticket.sourceKey,bindingKey:actionBindingKey(currentInput.currentBinding.binding),revision:currentInput.identity.revision,selectedOptionId:currentOptionId}});return {next,outcome};
 }
 const preview=build(state.data.workspaces[context.goalId]?.fields??{});if(preview.outcome.reused&&workloadEqual(preview.next,catalog))return {plan:preview.outcome.plan,storeRevision:state.data.revision,reused:true};
 let result=preview.outcome;const revision=store.commitGoalFields(context.goalId,context.goal,review.ticket.decisionRevision,review.at,fields=>{const prepared=build(fields);result=prepared.outcome;return {[planAlternativesField]:packPlanAlternatives(prepared.next) as never,homePlanAlternativeViewV1:{version:1,selectedId:result.plan.id,collapsed:false}};});return {plan:result.plan,storeRevision:revision,reused:result.reused};
}
export function applySavedWorkload(store:DecisionStore,planId:string,expectedStoreRevision:number,currentInput:WorkloadCapacityInput,sourceKey:string){
 const state=guard(store,currentInput,sourceKey);if(state.data.revision!==expectedStoreRevision)throw Error('Browser-store revision changed before local Apply.');const context={goalId:currentInput.identity.goalId,goal:currentInput.identity.goal},catalog=readPlanAlternatives(state.data.workspaces[context.goalId]?.fields[planAlternativesField],context),plan=catalog?.plans.find(p=>p.id===planId);if(!catalog||!plan?.workload||!workloadEqual(plan.workload.input,currentInput))throw Error('Reopen the exact saved workload artifact before local Apply.');
 const next=applyPlanAlternative(catalog,context,planId,plan.result.inputKey,{datasetToken:store.getDatasetToken(),sourceKey,bindingKey:actionBindingKey(currentInput.currentBinding.binding),revision:currentInput.identity.revision,selectedOptionId:plan.workload.selectedOptionId});if(plan.applied)return state.data.revision;
 return store.commitGoalFields(context.goalId,context.goal,expectedStoreRevision,new Date().toISOString(),()=>({[planAlternativesField]:packPlanAlternatives(next) as never}));
}
