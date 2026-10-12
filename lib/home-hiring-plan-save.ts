import type {HiringBudgetReview} from './home-hiring-budget';
import type {PlanAlternatives} from './home-plan-alternatives';
// @ts-expect-error Native fixtures share source.
import {hiringPlanFacts,hiringPlanBrief,hiringPlanInputs,hiringPlanIdentity,conditionalHiringPlanFacts,conditionalHiringSteps,type CostedHiringPlanReceipt,type ConditionalHiringPlanReceipt} from './home-hiring-plan.ts';
// @ts-expect-error Native fixtures share source.
import {createBundleDraft,reviewBundleProposal} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native fixtures share source.
import {actionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native fixtures share source.
import {appendConversationAlternative,associatePlanProposal,packPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
export async function prepareHiringPlan(review:HiringBudgetReview,externalHires:number,goal:{id:string;statement:string}){
 const receipt:CostedHiringPlanReceipt={version:1,review:structuredClone(review),externalHires},facts=hiringPlanFacts(receipt),brief=hiringPlanBrief(receipt);
 const bundle={origin:'conversation-v1' as const,id:'A' as const,name:'Conditional hiring route',objective:goal.statement.slice(0,160),coordination:'Validate external hiring and unresolved internal capacity before commitment.',components:[{id:'c1',name:`Review ${externalHires} external hires`,domain:'hiring' as const,firstStep:'Confirm the quoted costs, hiring readiness and remaining-role coverage before commitment.',ownerRole:'To be assigned',evidence:[],dependsOn:[],limitation:'Internal availability, release, backfill and full costs are unknown.'}],limitation:'Scenario review only; no staffing availability, funding or approval established.'};
 const binding=await actionBinding(goal.id,goal.statement,{sources:[]},{origin:'hiring-plan-v1',receipt}),draft=createBundleDraft(bundle,binding);
 draft.inputs=hiringPlanInputs(receipt);
 const result=reviewBundleProposal(draft);if(result.budget?.status==='over')throw Error('Known hiring costs exceed the budget.');if(result.cashEstimate?.cash!==facts.externalSubtotal||result.cashEstimate.coverage!=='partial')throw Error('The hiring plan did not preserve its checked partial subtotal.');
 return {receipt,facts,brief,draft,result,goal};
}
export async function prepareConditionalHiringPlan(review:HiringBudgetReview,goal:{id:string;statement:string}){
 const receipt:ConditionalHiringPlanReceipt={version:2,kind:'conditional',review:structuredClone(review)},facts=conditionalHiringPlanFacts(receipt),brief=hiringPlanBrief(receipt);
 if(facts.result.budgetStatus==='over')throw Error('Known hiring costs exceed the budget.');
 const bundle={origin:'conversation-v1' as const,id:'A' as const,name:'Conditional hiring plan',objective:goal.statement.slice(0,160),coordination:'Validate the hiring budget before choosing a staffing commitment.',components:[{id:'c1',name:'Validate the hiring budget',domain:'hiring' as const,firstStep:conditionalHiringSteps.join(' '),ownerRole:'Hiring owner and Finance · unconfirmed',evidence:[],dependsOn:[],limitation:'A budget allowance is not salary, full hiring cost or proof of available staffing.'}],limitation:'Conditional proposal only; affordability, readiness, staffing and funding are unverified.'};
 const binding=await actionBinding(goal.id,goal.statement,{sources:[]},{origin:'conditional-hiring-plan-v2',receipt}),draft=createBundleDraft(bundle,binding);
 draft.inputs=hiringPlanInputs(receipt);const result=reviewBundleProposal(draft);
 if(result.cashEstimate?.cash!==null||result.cashEstimate.coverage!=='unknown')throw Error('Conditional hiring cannot assert reviewed cash.');
 return {receipt,facts,brief,draft,result,goal};
}
export type HiringPlanSelection=Awaited<ReturnType<typeof prepareHiringPlan>>|Awaited<ReturnType<typeof prepareConditionalHiringPlan>>;
export function hiringPlanFields(selection:HiringPlanSelection,catalog:PlanAlternatives|null,requestId:string,at:string){
 const {goal}=selection,draft=structuredClone(selection.draft),brief=hiringPlanBrief(selection.receipt),context={goalId:goal.id,goal:goal.statement};
 if(draft.binding.goalId!==goal.id||draft.binding.goal!==goal.statement)throw Error('The hiring plan belongs to another goal.');
 if(JSON.stringify(draft.inputs.hiringPlan)!==JSON.stringify(selection.receipt))throw Error('Review the current hiring receipt before pinning.');
 if((selection.receipt.version===2&&conditionalHiringPlanFacts(selection.receipt).result.budgetStatus==='over')||reviewBundleProposal(draft).budget?.status==='over')throw Error('Known hiring costs exceed the budget.');
 if(catalog&&(catalog.goalId!==goal.id||catalog.goal!==goal.statement))throw Error('The hiring plan belongs to another goal.');
 if(catalog?.plans.some(plan=>!plan.deleted&&plan.draft.inputs.hiringPlan&&hiringPlanIdentity(plan.draft.inputs.hiringPlan)===hiringPlanIdentity(selection.receipt)))return {[planAlternativesField]:packPlanAlternatives(catalog)};
 const prior=catalog?.plans.findLast(plan=>!plan.deleted&&plan.draft.inputs.hiringPlan?.review.datasetToken===selection.receipt.review.datasetToken&&plan.draft.inputs.hiringPlan.review.scopeKey===selection.receipt.review.scopeKey);
 if(prior)draft.revision=prior.draft.revision+1;
 const outcome=appendConversationAlternative(catalog,context,{requestId,text:'Explicit review of a conditional hiring route, not staffing approval.',sourceIds:prior?[prior.id]:[],expectedInputs:prior?{[prior.id]:prior.result.inputKey}:{}},draft,[brief],JSON.stringify(selection.receipt),1);
 if(outcome.status!=='ready')throw Error('The reviewed hiring plan could not be prepared.');
 const selected=associatePlanProposal(outcome.catalog,context,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:requestId,at,acknowledgeUnknowns:true});
 return {[planAlternativesField]:packPlanAlternatives(selected)};
}
