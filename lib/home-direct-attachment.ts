// @ts-expect-error Native Node tests share TypeScript source.
import {previewLinkedAttachment,commitLinkedAttachment,type LinkedAttachmentRequest,type ProjectPlanningBinding} from './home-linked-attachment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleWorkspace} from './home-bundle-records.ts';
import type {DecisionStore} from './local-decisions.ts';
const pending=new WeakSet<DecisionStore>();
/** One explicit Attach click validates and atomically saves; only genuine conflicts interrupt. */
export async function attachCurrentPlan(store:DecisionStore,request:LinkedAttachmentRequest,project:ProjectPlanningBinding,isCurrent:()=>boolean,receiptId:string){
 if(pending.has(store))throw Error('An attachment is already pending.');pending.add(store);
 try{
  if(!isCurrent())throw Error('The plan or evidence changed. Review the current context.');
  const fields=store.getSnapshot().data.workspaces[request.draft.binding.goalId]?.fields??{},workspace=readBundleWorkspace(fields.homeSolutionBundlesV1,request.draft.binding.goalId);
  const existing=workspace?.attachments.find(item=>item.id===request.replaceId);
  // Check even a repeat against current evidence and linked destination history.
  const preview=await previewLinkedAttachment(store,request,{},project);
  const conflicts=preview.application.rows.filter(row=>row.proposed!==null&&!['blocked','read-only','missing'].includes(row.status)&&row.conflict&&row.status==='preserved');
  if(preview.manualConflicts.length||conflicts.length||preview.application.blockers.length)return {status:'review' as const,preview};
  if(existing&&bundleInputKey(existing.draft)===bundleInputKey(request.draft)&&!preview.application.selectedChanges.length)return {status:'already-attached' as const,changes:0};
  // Projection and revision checks are repeated inside the existing transaction.
  await commitLinkedAttachment(store,preview,{},project,isCurrent,receiptId);
  return {status:'attached' as const,changes:preview.application.selectedChanges.length};
 }finally{pending.delete(store)}
}
