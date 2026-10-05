// Worker-safe adoption preview. Verification/reconciliation is local and never persists a plan.
// @ts-expect-error Native Node tests share TypeScript source.
import {matchedBundleSearch} from './home-plan-integration.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {stageWorkforceMixSelectionLocally} from './workforce-local-search.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {canonical,type WorkforceMixSearch} from './workforce-mix-search-core.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey,reviseBundleDraft,reconcileBundle,unknownAssumption,type BundleDraft} from './home-bundle-reconciliation.ts';
import type {WorkforceSelectionContext} from './workforce-mix-selection-core';
export async function previewBundleCapacityAdoption(draft:BundleDraft,context:WorkforceSelectionContext,snapshot:WorkforceMixSearch,candidateId:string){
 const matched=matchedBundleSearch(draft,context.solution);
 if(matched.evidenceResultId!==context.evidenceResultId||draft.binding.goalId!==context.activeGoalId||draft.binding.goal!==context.activeGoalStatement)throw Error('The goal or source calculation changed. Review a current selection.');
 const selected=await stageWorkforceMixSelectionLocally(context,snapshot,[candidateId]),candidate=selected.revisions[0],before=draft.inputs.capacity!.input;
 const changedFields=(['build','move','buy'] as const).filter(field=>candidate[field]!==before[field]);
 if(!changedFields.length)throw Error('This selection does not change the staffing mix.');
 if(canonical({...candidate,build:before.build,move:before.move,buy:before.buy})!==canonical(before))throw Error('This alternative changes unsupported assumptions. Review it in the workforce planner.');
 const inputs=structuredClone(draft.inputs),capacity=inputs.capacity!,removedFlows:string[]=[];
 for(const path of ['build','move','buy','backfills'] as const){
  const count=path==='backfills'&&Number(candidate.build)+Number(candidate.move)===0?0:Number(candidate[path]),flow=capacity.flows.find(item=>item.path===path);
  if(count>0&&!flow)throw Error(`${path}: no reviewed component/group mapping exists. Review the mapping in the working form first.`);
  if(count===0&&flow){removedFlows.push(path);capacity.flows=capacity.flows.filter(item=>item.path!==path);}
  if(count>0&&(path==='build'||path==='move')){
   const group=inputs.groups.find(item=>item.id===flow!.groupId);
   if(!group||group.count.value===null||!['user-entered','adopted'].includes(group.count.kind)||count>group.count.value)throw Error(`${path}: the selected count exceeds or lacks a known participant group. Review its count and mapping first.`);
   if(flow!.componentIds.some(id=>!inputs.memberships.some(item=>item.componentId===id&&item.complete.value===true&&item.groupIds.includes(group.id))))throw Error(`${path}: component participant coverage does not match the selected group. Review the mapping first.`);
  }
 }
 const internal=capacity.flows.filter(flow=>flow.path==='build'||flow.path==='move');
 if(internal.length>1&&(inputs.groupsDisjoint.value!==true||new Set(internal.map(flow=>flow.groupId)).size!==internal.length))throw Error('Internal participant overlap is unresolved. Review disjoint groups before adoption.');
 const spec=snapshot.spec,basis=`Reviewed candidate ${candidateId}; search ${snapshot.searchFingerprint}; v${snapshot.binding.version}; bounds B${spec.build.min}-${spec.build.max} M${spec.move.min}-${spec.move.max} H${spec.buy.min}-${spec.buy.max}; eval ${spec.maxEvaluations}/return ${spec.maxResults}/${spec.resultFilter==='all'?'all':'met'}; ${snapshot.methodVersion}.`;
 for(const field of changedFields){capacity.input[field]=candidate[field];capacity.origins[field]={kind:'user-entered',basis};}
 inputs.scope.comparisonConfirmed=unknownAssumption();
 const prior=reconcileBundle(draft),trial=reconcileBundle(reviseBundleDraft(draft,inputs));
 const affectedCosts=new Set(trial.ledger.filter(line=>line.id.startsWith('capacity:')&&line.total!==prior.ledger.find(old=>old.id===line.id)?.total).flatMap(line=>line.componentIds));
 // A staffing path becoming inactive must not silently declare its still-present activities funded.
 if(affectedCosts.size){inputs.costsDistinct=unknownAssumption();for(const review of inputs.costReviews)if(affectedCosts.has(review.componentId))review.complete=unknownAssumption();}
 const next=reviseBundleDraft(draft,inputs),after=reconcileBundle(next);
 return {inputKey:bundleInputKey(draft),candidateId,searchFingerprint:snapshot.searchFingerprint,source:structuredClone(snapshot.binding),next,
  costReviewComponents:[...affectedCosts],changes:changedFields.map(field=>({field,before:before[field],after:candidate[field]})),removedFlows,
  before:prior,after,notice:'Staffing comparison only. No global intervention optimum or predicted retention effect. Accept creates a working revision; Save, Calculate and attachment replacement remain explicit.'};
}
export type BundleCapacityAdoption=Awaited<ReturnType<typeof previewBundleCapacityAdoption>>;
