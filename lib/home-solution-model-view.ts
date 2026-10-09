import type {BundleDraft,BundleResult} from './home-bundle-reconciliation';
import type {PlanAlternative} from './home-plan-alternatives';
import type {SolutionEvaluation,SolutionRequest} from './home-solution-conversation';
// @ts-expect-error Native fixture tests share TypeScript source.
import {assertSourcesCurrent} from './home-solution-conversation.ts';
/** Only omit typed internal equality keys, never arbitrary evidence or user fields. */
function omit<T extends object,K extends keyof T>(value:T,keys:K[]):Omit<T,K>{
 return Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key as K))) as Omit<T,K>;
}
export function solutionDraftView(draft:BundleDraft){return omit(draft,['signature']);}
export function solutionResultView(result:BundleResult){return omit(result,['signature','bindingKey','inputKey']);}
export function solutionPlanView(plan:PlanAlternative){return {...plan,draft:solutionDraftView(plan.draft),result:solutionResultView(plan.result)};}
/** Source IDs/revisions and bindings remain visible; exact equality keys remain server-owned. */
export function solutionEvaluationView(request:SolutionRequest,item:SolutionEvaluation){
 let sourcesCurrent=true;try{assertSourcesCurrent(request.catalog,item.sourceKeys);}catch{sourcesCurrent=false;}
 return {...omit(item,['sourceKeys','draft','result']),sourcesCurrent,draft:item.draft?solutionDraftView(item.draft):null,result:item.result?solutionResultView(item.result):null};
}
