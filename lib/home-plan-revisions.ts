// Browser-owned proposal history. Sending recalculates a proposal; applying and attaching remain explicit.
// @ts-expect-error Native Node tests share TypeScript source.
import {previewBundleChatEdit,acceptBundleChatEdit,type BundleEditSelection} from './home-bundle-chat-edit.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,readBundleDraft,reconcileBundle,type BundleDraft,type BundleResult} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey} from './home-action-drafts.ts';
export const planRevisionsField='homePlanRevisionsV1';
export type PlanRevision={request:string;selection:BundleEditSelection;before:BundleDraft;draft:BundleDraft;result:BundleResult;discarded:boolean};
export type PlanRevisions={version:1;goalId:string;revisions:PlanRevision[]};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const matches=(a:BundleDraft,b:BundleDraft)=>a.bundle.id===b.bundle.id&&a.signature===b.signature&&actionBindingKey(a.binding)===actionBindingKey(b.binding);
const validSelection=(selection:BundleEditSelection)=>selection&&Number.isInteger(selection.option)&&Number.isInteger(selection.count)&&selection.count>=1&&selection.count<=3&&selection.option>=1&&selection.option<=selection.count;
export function readPlanRevisions(raw:unknown,goalId:string):PlanRevisions|null{
 if(raw===undefined)return {version:1,goalId,revisions:[]};
 try{
  const value=raw as PlanRevisions;
  if(!value||value.version!==1||value.goalId!==goalId||!Array.isArray(value.revisions)||value.revisions.length>20||JSON.stringify(value).length>512000)return null;
  for(const record of value.revisions){
   if(!validSelection(record.selection)||typeof record.discarded!=='boolean'||!readBundleDraft(record.before)||record.before.binding.goalId!==goalId)return null;
   const preview=previewBundleChatEdit(record.before,record.request,record.selection,!record.draft.inputs.costPolicy),draft=acceptBundleChatEdit(record.before,preview,record.selection);
   if(!same(draft,record.draft)||!same(reconcileBundle(draft),record.result))return null;
  }
  return structuredClone(value);
 }catch{return null;}
}
export function currentPlanRevision(history:PlanRevisions|null,base:BundleDraft):PlanRevision|null{
 const last=history?.revisions.findLast(record=>matches(record.draft,base));
 if(!last||last.discarded||last.draft.revision<=base.revision)return null;
 // A higher revision alone does not prove that this proposal descends from the current saved inputs.
 let ancestor=last;
 while(bundleInputKey(ancestor.before)!==bundleInputKey(base)){
  const previous=history!.revisions.findLast(record=>!record.discarded&&bundleInputKey(record.draft)===bundleInputKey(ancestor.before));
  if(!previous||previous.draft.revision>=ancestor.draft.revision)return null;
  ancestor=previous;
 }
 return last;
}
export function proposePlanRevision(raw:unknown,base:BundleDraft,request:string,selection:BundleEditSelection){
 if(!validSelection(selection))throw Error('Select the intended Action Plan before revising it.');
 const history=readPlanRevisions(raw,base.binding.goalId);if(!history)throw Error('Saved revision history cannot be verified. Existing work is kept.');
 const before=currentPlanRevision(history,base)?.draft??base;
 const preview=previewBundleChatEdit(before,request,selection),draft=acceptBundleChatEdit(before,preview,selection),result=reconcileBundle(draft);
 const record={request,selection:structuredClone(selection),before:structuredClone(before),draft,result,discarded:false};
 history.revisions.push(record);
 if(!readPlanRevisions(history,base.binding.goalId))throw Error('Revision history is full. Earlier versions are kept; no proposal was replaced.');
 return {history,record,preview};
}
export function discardPlanRevision(raw:unknown,base:BundleDraft){
 const history=readPlanRevisions(raw,base.binding.goalId);if(!history)throw Error('Saved revision history cannot be verified.');
 for(const record of history.revisions)if(matches(record.draft,base)&&record.draft.revision>base.revision)record.discarded=true;
 return history;
}
const money=(value:number|null)=>value===null?'Unknown':`$${value.toLocaleString('en-US',{maximumFractionDigits:2})} USD`;
export function planBudgetText(result:BundleResult){
 const budget=result.budget;if(!budget)return '';
 // Older snapshots retain their signed totals; the current cost display always compares cash.
 const headroom=budget.limit!==null&&budget.cash!==null?Math.round((budget.limit-budget.cash)*100)/100:null;
 const basis='cash only; staff hours are separate';
 const balance=headroom===null?'Budget feasibility is unresolved.':headroom<0?`${money(-headroom)} over the limit; the proposed scope needs adjustment.`:`${money(headroom)} headroom under the listed assumptions.`;
 return `Budget limit ${money(budget.limit)} (${basis}). Cash ${money(budget.cash)}. ${balance} ${budget.assumed?'This retains proposed cost assumptions; actual costs and funding remain unverified.':''}`.trim();
}
export function planRevisionReply(record:PlanRevision){
 return `I recalculated Action Plan #${record.selection.option} for “${record.draft.binding.goal}” with your adjustment. ${planBudgetText(record.result)} Review the updated proposal below, then Apply changes or Attach Action Plan. Earlier versions are kept; an existing attachment has not changed.`;
}
