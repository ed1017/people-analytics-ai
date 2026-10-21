import type {LocalGoal} from './local-goals';
// @ts-expect-error Native Node tests share TypeScript source.
import {readPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleWorkspace,bundleWorkspaceField} from './home-bundle-records.ts';

export type PinnedActionPlan={key:string;goal:LocalGoal;planId:string|null;name:string;legacy:boolean};
/** Read-only compatibility view. Only explicitly attached proposals are pins;
 * old goal-only workspaces remain accessible, without manufacturing a plan. */
export function pinnedActionPlans(goals:LocalGoal[],workspaces:Record<string,{fields:Record<string,unknown>}>){
 return goals.flatMap<PinnedActionPlan>(goal=>{
  const fields=workspaces[goal.id]?.fields;
  const catalog=readPlanAlternatives(fields?.[planAlternativesField],{goalId:goal.id,goal:goal.statement});
  const plans=catalog?.plans.filter(plan=>!plan.deleted&&catalog.attachments.some(item=>item.planId===plan.id))??[];
  if(plans.length)return plans.map(plan=>({key:JSON.stringify([goal.id,plan.id]),goal,planId:plan.id,name:`${plan.draft.bundle.name} · #${plan.number}`,legacy:false}));
  const attached=readBundleWorkspace(fields?.[bundleWorkspaceField],goal.id)?.attachments.at(-1);
  return [{key:JSON.stringify([goal.id,null]),goal,planId:null,name:attached?.draft.bundle.name??goal.statement,legacy:!attached}];
 });
}
