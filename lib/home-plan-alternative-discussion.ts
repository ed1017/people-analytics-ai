import type {CombinationReview} from './home-plan-combination';
import type {AlternativeContext,AlternativeRequest,PlanAlternatives} from './home-plan-alternatives';
// @ts-expect-error Native Node tests share TypeScript source.
import {combinationIntent,readPlanAlternatives,resolveNumberedPlans} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleChatEditIntent} from './home-bundle-chat-edit.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleInputKey} from './home-bundle-reconciliation.ts';

/** Add as an optional `alternatives` property on the UI's existing BundleDiscussion.
 * The UI owns lifecycle/Reset guards and atomic persistence. This captures exact sources,
 * so a late request cannot accidentally use a different selection or source revision.
 */
export type AlternativeDiscussion={
 goalId:string;goal:string;selectedId:string;
 options:{id:string;number:number;revision:number;inputKey:string}[];
 prepareRequest:(text:string,requestId:string,review?:CombinationReview)=>AlternativeRequest|null;
};

export function alternativeDiscussion(raw:PlanAlternatives,context:AlternativeContext,selectedId:string):AlternativeDiscussion{
 const catalog=readPlanAlternatives(raw,context);
 if(!catalog||!catalog.order.includes(selectedId))throw Error('Select an available Action Plan in the current goal.');
 const contextSnapshot={...context};
 return {
  ...contextSnapshot,selectedId,
  options:catalog.order.map(id=>{const plan=catalog.plans.find(item=>item.id===id)!;return {id,number:plan.number,revision:plan.draft.revision,inputKey:bundleInputKey(plan.draft)};}),
  prepareRequest(text,requestId,review){
   const combination=combinationIntent(text);
   if(!combination&&!bundleChatEditIntent(text).edit)return null;
   const named=/(?:\b(?:action\s+)?plans?\s*#?\s*|#)\d+\b/i.test(text);
   const sources=combination||named?resolveNumberedPlans(text,catalog,contextSnapshot):[catalog.plans.find(plan=>plan.id===selectedId)!];
   return {requestId,text,sourceIds:sources.map(plan=>plan.id),expectedInputs:Object.fromEntries(sources.map(plan=>[plan.id,bundleInputKey(plan.draft)])),...(review?{review:structuredClone(review)}:{})};
  },
 };
}
