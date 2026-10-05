// @ts-expect-error Native Node tests share TypeScript source.
import {assumptionsFallbackField,readAssumptionsFallback} from './home-assumptions-fallback.ts';
// Navigation status only. Opening a plan still uses the existing current-context guards.
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundlePreparation,bundlePreparationField} from './home-bundle-preparation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleWorkspace,bundleWorkspaceField,type BundleWorkspace} from './home-bundle-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey,validActionBinding,type ActionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,type BundleDraft,type BundleResult} from './home-bundle-reconciliation.ts';

export type PinnedGoalPlanStatus = 'saved' | 'none' | 'review';
export function pinnedGoalPlanStatus(goalId:string,fields:Record<string,unknown>|undefined,packet:unknown):PinnedGoalPlanStatus {
  const raw=fields?.[bundlePreparationField];
  if(raw!==undefined){
    const binding=raw&&typeof raw==='object'&&'binding' in raw?raw.binding:null;
    if(!validActionBinding(binding)||binding.goalId!==goalId)return 'review';
    const preparation=readBundlePreparation(raw,binding,packet);
    if(!preparation)return 'review';
    if(preparation.proposal.bundles.length)return 'saved';
  }
  if(fields?.[assumptionsFallbackField]!==undefined)return readAssumptionsFallback(fields[assumptionsFallbackField],goalId)?'saved':'review';
  const stored=fields?.[bundleWorkspaceField];
  if(stored!==undefined){
    const workspace=readBundleWorkspace(stored,goalId);
    if(!workspace||workspace.drafts.length||workspace.calculations.length||workspace.attachments.length)return 'review';
  }
  return 'none';
}

/** Reopen an attached option first; never substitute a different goal or evidence binding. */
export function preferredSavedBundleId(workspace:BundleWorkspace|null,binding:ActionBinding,ids:string[]):string {
  const key=actionBindingKey(binding),matches=(draft:{binding:ActionBinding;bundle:{id:string}})=>actionBindingKey(draft.binding)===key&&ids.includes(draft.bundle.id);
  const replaced=new Set(workspace?.attachments.map(item=>item.supersedes));
  const attached=workspace?.attachments.findLast(item=>!replaced.has(item.id)&&matches(item.draft));
  return attached?.draft.bundle.id??workspace?.drafts.findLast(matches)?.bundle.id??ids[0]??'A';
}

/** Existing saved values, including unknowns, never receive fresh pilot defaults on reopen. */
export function restoredBundleDraft(workspace:BundleWorkspace|null,binding:ActionBinding,id:string):BundleDraft|null {
  const matches=(draft:BundleDraft)=>actionBindingKey(draft.binding)===actionBindingKey(binding)&&draft.bundle.id===id;
  const saved=workspace?.drafts.filter(matches).sort((a,b)=>b.revision-a.revision)[0];
  const attached=workspace?.attachments.findLast(item=>matches(item.draft))?.draft;
  const calculated=workspace?.calculations.findLast(item=>matches(item.draft))?.draft;
  return saved??attached??calculated??null;
}
export function restoredBundleResult(workspace:BundleWorkspace|null,draft:BundleDraft):BundleResult|null {
  const sameContext=(item:{draft:BundleDraft})=>actionBindingKey(item.draft.binding)===actionBindingKey(draft.binding)&&item.draft.bundle.id===draft.bundle.id;
  const results=[...(workspace?.attachments??[]),...(workspace?.calculations??[])].filter(sameContext);
  return results.findLast(item=>item.result.inputKey===bundleInputKey(draft))?.result??results.at(-1)?.result??null;
}
