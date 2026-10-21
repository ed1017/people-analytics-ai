import type {PlanAlternatives} from './home-plan-alternatives';
// @ts-expect-error Native fixtures share source.
import {requiredStaffingPlanFacts,requiredStaffingPlanInputs,requiredStaffingPlanIdentity,type RequiredStaffingPlanReceipt} from './home-required-staffing-plan.ts';
// @ts-expect-error Native fixtures share source.
import {createBundleDraft,reviewBundleProposal} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native fixtures share source.
import {actionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native fixtures share source.
import {appendConversationAlternative,associatePlanProposal,packPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
export async function prepareRequiredStaffingPlan(receipt:RequiredStaffingPlanReceipt,goal:{id:string;statement:string}){
 const facts=requiredStaffingPlanFacts(receipt),o=facts.option;
 const bundle={origin:'conversation-v1' as const,id:'A' as const,name:`Train ${o.train} · redeploy ${o.redeploy} · hire ${o.hire}`,objective:goal.statement.slice(0,160),coordination:'Validate release, readiness and full costs before commitment.',components:[{id:'c1',name:'Validate the selected staffing route',domain:'hiring' as const,firstStep:'Confirm actual people, skills, release, readiness and missing costs with the relevant owners.',ownerRole:'Staffing owner · unconfirmed',evidence:[],dependsOn:[],limitation:'Staffing, funding and complete cost coverage are unverified.'}],limitation:'Conditional scenario only; no staffing, funding or operational approval.'};
 const binding=await actionBinding(goal.id,goal.statement,{sources:[]},{origin:'required-staffing-plan-v1',receipt}),draft=createBundleDraft(bundle,binding);draft.inputs=requiredStaffingPlanInputs(receipt);
 return {receipt:structuredClone(receipt),draft,result:reviewBundleProposal(draft),goal};
}
export function requiredStaffingPlanFields(selection:Awaited<ReturnType<typeof prepareRequiredStaffingPlan>>,catalog:PlanAlternatives|null,requestId:string,at:string){
 const {goal,receipt}=selection,draft=structuredClone(selection.draft),context={goalId:goal.id,goal:goal.statement};
 const f=requiredStaffingPlanFacts(receipt);reviewBundleProposal(draft);
 if(draft.binding.goalId!==goal.id||draft.binding.goal!==goal.statement||JSON.stringify(draft.inputs.requiredStaffingPlan)!==JSON.stringify(receipt)||catalog&&(catalog.goalId!==goal.id||catalog.goal!==goal.statement))throw Error('Review the staffing selection for the current goal.');
 const identity=requiredStaffingPlanIdentity(receipt);
 if(catalog?.plans.some(p=>!p.deleted&&p.draft.inputs.requiredStaffingPlan&&requiredStaffingPlanIdentity(p.draft.inputs.requiredStaffingPlan)===identity))return {[planAlternativesField]:packPlanAlternatives(catalog)};
 const prior=catalog?.plans.findLast(p=>!p.deleted&&p.draft.inputs.requiredStaffingPlan?.review.datasetToken===receipt.review.datasetToken&&p.draft.inputs.requiredStaffingPlan.review.scopeKey===receipt.review.scopeKey);
 if(prior)draft.revision=prior.draft.revision+1;
 const notes=[f.result.recommendation?.text??'Checked staffing selection.',...f.option.unknowns,...f.result.limitations];
 const outcome=appendConversationAlternative(catalog,context,{requestId,text:'Explicitly pin the checked staffing option; assumptions remain unconfirmed.',sourceIds:prior?[prior.id]:[],expectedInputs:prior?{[prior.id]:prior.result.inputKey}:{}},draft,notes,identity,1);
 if(outcome.status!=='ready')throw Error('The staffing plan could not be prepared.');
 const selected=associatePlanProposal(outcome.catalog,context,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:requestId,at,acknowledgeUnknowns:true});
 return {[planAlternativesField]:packPlanAlternatives(selected)};
}
