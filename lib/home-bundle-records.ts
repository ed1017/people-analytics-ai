// Separate browser field. Existing goals, action drafts and calculated option pins are untouched.
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft,reconcileBundle,bundleInputKey,type BundleDraft,type BundleResult} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey,type ActionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {plain,exactKeys} from './home-action-proposal.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
export const bundleWorkspaceField='homeSolutionBundlesV1';
export type BundleAttachment={id:string;status:'attached_proposal';attachedAt:string;supersedes:string|null;draft:BundleDraft;result:BundleResult;unknownsAcknowledged:boolean};
export type BundleWorkspace={version:1;goalId:string;drafts:BundleDraft[];attachments:BundleAttachment[]};
export type AttachConfirmation={confirmed:true;bindingKey:string;inputKey:string;acknowledgeUnknowns:boolean};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const id=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value);
const draftKey=(draft:BundleDraft)=>JSON.stringify([draft.binding,draft.bundle.id,draft.signature]);
function attachmentValid(raw:unknown):raw is BundleAttachment{
 try{
  const value=plain(raw);if(!value||!exactKeys(value,['id','status','attachedAt','supersedes','draft','result','unknownsAcknowledged'])||!id(value.id)||value.status!=='attached_proposal'||typeof value.attachedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value.attachedAt)||!Number.isFinite(Date.parse(value.attachedAt))||!(value.supersedes===null||id(value.supersedes))||typeof value.unknownsAcknowledged!=='boolean')return false;
  const draft=readBundleDraft(value.draft);if(!draft)return false;const result=reconcileBundle(draft);
  return same(result,value.result)&&(result.issues.length===0||value.unknownsAcknowledged===true);
 }catch{return false}
}
export function readBundleWorkspace(raw:unknown,goalId:string):BundleWorkspace|null{
 if(raw===undefined)return {version:1,goalId,drafts:[],attachments:[]};
 try{
  if(!validateJson(raw)||new TextEncoder().encode(JSON.stringify(raw)).length>192*1024)return null;
  const value=plain(raw);if(!value||!exactKeys(value,['version','goalId','drafts','attachments'])||value.version!==1||value.goalId!==goalId||!id(value.goalId)||!Array.isArray(value.drafts)||value.drafts.length>12||!Array.isArray(value.attachments)||value.attachments.length>12)return null;
  const drafts=value.drafts.map(readBundleDraft);if(drafts.some(draft=>!draft||draft.binding.goalId!==goalId)||new Set(drafts.map(draft=>draftKey(draft!))).size!==drafts.length)return null;
  if(value.attachments.some(item=>!attachmentValid(item)||item.draft.binding.goalId!==goalId)||new Set(value.attachments.map(item=>(item as BundleAttachment).id)).size!==value.attachments.length)return null;
  const attachments=value.attachments as BundleAttachment[],seen=new Map<string,BundleAttachment>(),replaced=new Set<string>();
  for(const item of attachments){if(item.supersedes){const prior=seen.get(item.supersedes);if(!prior||replaced.has(prior.id)||prior.draft.bundle.id!==item.draft.bundle.id)return null;replaced.add(prior.id);}seen.set(item.id,item);}
  return structuredClone({version:1,goalId,drafts:drafts as BundleDraft[],attachments});
 }catch{return null}
}
function workspace(raw:unknown,goalId:string){const value=readBundleWorkspace(raw,goalId);if(!value)throw Error('Saved bundle records cannot be verified; existing work is kept.');return value}
function patch(value:BundleWorkspace){if(!readBundleWorkspace(value,value.goalId))throw Error('Bundle storage limit or validation failed; existing work is kept.');return {field:bundleWorkspaceField,value}}
export function saveBundleDraftPatch(raw:unknown,draft:BundleDraft){
 const valid=readBundleDraft(draft);if(!valid)throw Error('This bundle draft cannot be verified.');
 const value=workspace(raw,valid.binding.goalId),index=value.drafts.findIndex(item=>draftKey(item)===draftKey(valid));
 if(index>=0){const prior=value.drafts[index];if(prior.revision>valid.revision||prior.revision===valid.revision&&!same(prior,valid))throw Error('A newer or different draft is already saved.');value.drafts[index]=valid;}else value.drafts.push(valid);
 return patch(value);
}
/** Explicitly attach a reviewed snapshot. No input, goal or prior attachment is mutated. */
export function attachBundlePatch(raw:unknown,draft:BundleDraft,confirmation:AttachConfirmation,attachmentId:string,attachedAt:string,replaceId:string|null=null){
 if(confirmation.confirmed!==true||confirmation.bindingKey!==actionBindingKey(draft.binding)||confirmation.inputKey!==bundleInputKey(draft))throw Error('Review this exact goal and bundle revision before attaching.');
 const value=workspace(raw,draft.binding.goalId),result=reconcileBundle(draft);
 const saved=value.drafts.find(item=>draftKey(item)===draftKey(draft));if(saved&&(saved.revision>draft.revision||saved.revision===draft.revision&&!same(saved,draft)))throw Error('Saved assumptions changed; review the latest draft before attaching.');
 if(result.issues.length&&!confirmation.acknowledgeUnknowns)throw Error('Review and acknowledge unresolved assumptions before attaching this proposed solution.');
 const superseded=new Set(value.attachments.map(item=>item.supersedes)),active=value.attachments.filter(item=>!superseded.has(item.id)&&item.draft.bundle.id===draft.bundle.id);
 if(replaceId===null&&active.length)throw Error('Explicitly replace the existing attached version; it will remain in history.');
 if(replaceId!==null&&!active.some(item=>item.id===replaceId))throw Error('The version selected for replacement is no longer current.');
 value.attachments.push({id:attachmentId,status:'attached_proposal',attachedAt,supersedes:replaceId,draft:structuredClone(draft),result,unknownsAcknowledged:confirmation.acknowledgeUnknowns});
 return patch(value);
}
export function attachedBundleState(attachment:BundleAttachment,currentBinding:ActionBinding,draft:BundleDraft|null):'current'|'draft_changed'|'context_changed'|'unverifiable'{
 if(!attachmentValid(attachment))return 'unverifiable';
 if(actionBindingKey(attachment.draft.binding)!==actionBindingKey(currentBinding))return 'context_changed';
 if(draft&&bundleInputKey(draft)!==bundleInputKey(attachment.draft))return 'draft_changed';
 return 'current';
}
