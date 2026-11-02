import type {BundleDraft} from './home-bundle-reconciliation';
// @ts-expect-error Native tests share application source.
import {readBundleDraft,bundleInputKey} from './home-bundle-reconciliation.ts';
export const scenarioChatField='guidedScenarioChatV1';
export type ScenarioChatReceipt={version:1;datasetToken:string;ownerGoalId:string;discussionKey:string;savedSignature:string;draft:BundleDraft;inputKey:string;selectedCandidateId:string|null};
export function scenarioChatReceipt(draft:BundleDraft,context:{datasetToken:string;ownerGoalId:string;discussionKey:string;savedSignature:string},selectedCandidateId:string|null):ScenarioChatReceipt{
 return {version:1,...context,draft:structuredClone(draft),inputKey:bundleInputKey(draft),selectedCandidateId};
}
export function readScenarioChatReceipt(raw:unknown,context:{datasetToken:string;ownerGoalId:string;discussionKey:string;savedSignature:string}):ScenarioChatReceipt|null{
 const r=raw as ScenarioChatReceipt;
 if(!r||r.version!==1||Object.keys(r).sort().join()!=='datasetToken,discussionKey,draft,inputKey,ownerGoalId,savedSignature,selectedCandidateId,version'||Object.entries(context).some(([k,v])=>r[k as keyof ScenarioChatReceipt]!==v)||r.selectedCandidateId!==null&&(typeof r.selectedCandidateId!=='string'||r.selectedCandidateId.length>240))return null;
 const draft=readBundleDraft(r.draft);
 if(!draft||!draft.inputs.guidedWorkload||bundleInputKey(draft)!==r.inputKey||context.ownerGoalId&&draft.binding.goalId!==context.ownerGoalId)return null;
 return structuredClone(r);
}
/** Reader language shared with AI context; no new model or cost assumptions. */
export function staffingAssumptions(draft:BundleDraft):string{
 const backfills=draft.inputs.capacity?.input.backfills;
 return `Backfills assumed: ${backfills?.trim()?backfills:'unknown'}. Donor-team capacity loss is not modeled. Attrition is not modeled. People count as ready from the entered readiness date; no gradual productivity ramp is modeled.`;
}

import type {DecisionStore} from './local-decisions';
/** Clear only the active owner's receipt, before changing conversation ownership. */
export function clearScenarioChat(store:DecisionStore,owner:string,expected?:unknown){
 const state=store.getSnapshot(),fields=owner?state.data.workspaces[owner]?.fields:state.data.exploration?.fields;
 const receipt=fields?.[scenarioChatField];
 if(!receipt||expected!==undefined&&JSON.stringify(receipt)!==JSON.stringify(expected))return;
 const patch=()=>({[scenarioChatField]:null});
 if(owner)store.commitGoalFields(owner,state.data.goals.goals.find(g=>g.id===owner)?.statement??'',state.data.revision,new Date().toISOString(),patch);
 else store.commitExplorationFields(state.data.revision,new Date().toISOString(),patch);
}
