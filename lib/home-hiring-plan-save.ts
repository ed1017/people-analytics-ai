import type {HiringBudgetReview} from './home-hiring-budget';
import type {PlanAlternatives} from './home-plan-alternatives';
import type {Assumption} from './home-bundle-reconciliation';
// @ts-expect-error Native fixtures share source.
import {hiringPlanFacts,hiringPlanBrief,type HiringPlanReceipt} from './home-hiring-plan.ts';
// @ts-expect-error Native fixtures share source.
import {createBundleDraft,reviewBundleProposal,unknownAssumption} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native fixtures share source.
import {actionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native fixtures share source.
import {appendConversationAlternative,associatePlanProposal,packPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
const assumption=<T>(value:T,basis:string):Assumption<T>=>({value,kind:'illustrative',basis});
export async function prepareHiringPlan(review:HiringBudgetReview,externalHires:number,goal:{id:string;statement:string}){
 const receipt:HiringPlanReceipt={version:1,review:structuredClone(review),externalHires},facts=hiringPlanFacts(receipt),brief=hiringPlanBrief(receipt);
 const bundle={origin:'conversation-v1' as const,id:'A' as const,name:'Conditional hiring route',objective:goal.statement.slice(0,160),coordination:'Validate external hiring and unresolved internal capacity before commitment.',components:[{id:'c1',name:`Review ${externalHires} external hires`,domain:'hiring' as const,firstStep:'Confirm the quoted costs, hiring readiness and remaining-role coverage before commitment.',ownerRole:'To be assigned',evidence:[],dependsOn:[],limitation:'Internal availability, release, backfill and full costs are unknown.'}],limitation:'Scenario review only; no staffing availability, funding or approval established.'};
 const binding=await actionBinding(goal.id,goal.statement,{sources:[]},{origin:'hiring-plan-v1',receipt}),draft=createBundleDraft(bundle,binding),i=draft.inputs;
 const basis='Exact checked hiring scenario receipt; original user/model provenance retained, not verified company facts.';
 i.hiringPlan=receipt;i.scope.population=assumption(`Proposed ${facts.requiredRoles} ${review.inputs.role??'roles'}`,basis);i.scope.startMonth=assumption(facts.start,basis);i.scope.months=assumption(facts.months,basis);i.scope.demand=assumption(facts.requiredRoles,basis);i.scope.requirements=assumption('Cover the required roles; validate unresolved internal staffing and full costs.',basis);
 i.budget={amount:facts.budget===null?unknownAssumption():assumption(facts.budget,basis),basis:assumption('cash','Budget for the entered period, not funding approval.')};
 i.costsDistinct=assumption(true,'One native external subtotal only; no internal costs or other paths are added.');i.costReviews=[{componentId:'c1',complete:unknownAssumption()}];
 i.expenses=facts.monthlyCosts.map(row=>({id:'hiring-external-'+row.month,label:'External hiring cash for '+row.month,kind:'cash',amount:assumption(row.cash,basis),startMonth:assumption(row.month,basis),months:assumption(1,'One checked calendar month from the native hiring calculator.')}));i.expenseLinks=i.expenses.map(row=>({expenseId:row.id,componentIds:['c1'],allocations:null}));
 i.timing=[{componentId:'c1',start:assumption(facts.start+'-01',basis),finish:unknownAssumption()}];
 const result=reviewBundleProposal(draft);if(result.cashEstimate?.cash!==facts.externalSubtotal||result.cashEstimate.coverage!=='partial')throw Error('The hiring plan did not preserve its checked partial subtotal.');
 return {receipt,facts,brief,draft,result,goal};
}
export type HiringPlanSelection=Awaited<ReturnType<typeof prepareHiringPlan>>;
export function hiringPlanFields(selection:HiringPlanSelection,catalog:PlanAlternatives|null,requestId:string,at:string){
 const {goal,draft,brief}=selection,context={goalId:goal.id,goal:goal.statement};
 if(catalog&&(catalog.goalId!==goal.id||catalog.goal!==goal.statement))throw Error('The hiring plan belongs to another goal.');
 if(catalog?.plans.some(plan=>!plan.deleted&&plan.operation?.proposalKey===JSON.stringify(selection.receipt)))return {[planAlternativesField]:packPlanAlternatives(catalog)};
 const outcome=appendConversationAlternative(catalog,context,{requestId,text:'Explicit review of a conditional hiring route, not staffing approval.',sourceIds:[],expectedInputs:{}},draft,[brief],JSON.stringify(selection.receipt),1);
 if(outcome.status!=='ready')throw Error('The reviewed hiring plan could not be prepared.');
 const selected=associatePlanProposal(outcome.catalog,context,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:requestId,at,acknowledgeUnknowns:true});
 return {[planAlternativesField]:packPlanAlternatives(selected)};
}
