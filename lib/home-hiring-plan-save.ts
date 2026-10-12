import type {HiringBudgetReview} from './home-hiring-budget';
import type {PlanAlternatives} from './home-plan-alternatives';
// @ts-expect-error Native fixtures share source.
import {hiringPlanFacts,hiringPlanBrief,hiringPlanInputs,type HiringPlanReceipt} from './home-hiring-plan.ts';
// @ts-expect-error Native fixtures share source.
import {createBundleDraft,reviewBundleProposal} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native fixtures share source.
import {actionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native fixtures share source.
import {appendConversationAlternative,associatePlanProposal,packPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
export async function prepareHiringPlan(review:HiringBudgetReview,externalHires:number,goal:{id:string;statement:string}){
 const receipt:HiringPlanReceipt={version:1,review:structuredClone(review),externalHires},facts=hiringPlanFacts(receipt),brief=hiringPlanBrief(receipt);
 const bundle={origin:'conversation-v1' as const,id:'A' as const,name:'Conditional hiring route',objective:goal.statement.slice(0,160),coordination:'Validate external hiring and unresolved internal capacity before commitment.',components:[{id:'c1',name:`Review ${externalHires} external hires`,domain:'hiring' as const,firstStep:'Confirm the quoted costs, hiring readiness and remaining-role coverage before commitment.',ownerRole:'To be assigned',evidence:[],dependsOn:[],limitation:'Internal availability, release, backfill and full costs are unknown.'}],limitation:'Scenario review only; no staffing availability, funding or approval established.'};
 const binding=await actionBinding(goal.id,goal.statement,{sources:[]},{origin:'hiring-plan-v1',receipt}),draft=createBundleDraft(bundle,binding);
 draft.inputs=hiringPlanInputs(receipt);
 const result=reviewBundleProposal(draft);if(result.budget?.status==='over')throw Error('Known hiring costs exceed the budget.');if(result.cashEstimate?.cash!==facts.externalSubtotal||result.cashEstimate.coverage!=='partial')throw Error('The hiring plan did not preserve its checked partial subtotal.');
 return {receipt,facts,brief,draft,result,goal};
}
export type HiringPlanSelection=Awaited<ReturnType<typeof prepareHiringPlan>>;
export function hiringPlanFields(selection:HiringPlanSelection,catalog:PlanAlternatives|null,requestId:string,at:string){
 const {goal,draft}=selection,brief=hiringPlanBrief(selection.receipt),context={goalId:goal.id,goal:goal.statement};
 if(JSON.stringify(draft.inputs.hiringPlan)!==JSON.stringify(selection.receipt))throw Error('Review the current hiring receipt before pinning.');
 if(reviewBundleProposal(draft).budget?.status==='over')throw Error('Known hiring costs exceed the budget.');
 if(catalog&&(catalog.goalId!==goal.id||catalog.goal!==goal.statement))throw Error('The hiring plan belongs to another goal.');
 if(catalog?.plans.some(plan=>!plan.deleted&&plan.operation?.proposalKey===JSON.stringify(selection.receipt)))return {[planAlternativesField]:packPlanAlternatives(catalog)};
 const outcome=appendConversationAlternative(catalog,context,{requestId,text:'Explicit review of a conditional hiring route, not staffing approval.',sourceIds:[],expectedInputs:{}},draft,[brief],JSON.stringify(selection.receipt),1);
 if(outcome.status!=='ready')throw Error('The reviewed hiring plan could not be prepared.');
 const selected=associatePlanProposal(outcome.catalog,context,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:requestId,at,acknowledgeUnknowns:true});
 return {[planAlternativesField]:packPlanAlternatives(selected)};
}
