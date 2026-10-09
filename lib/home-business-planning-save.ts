/** Explicit UI selection only. Uses existing proposal snapshots and the atomic goal transaction. */
import type {BusinessPlanning} from './home-business-planning';
import type {StaffingAtom} from './home-service-staffing';
import type {SolutionBundle} from './home-solution-bundles';
import type {Assumption,CapacityMix} from './home-bundle-reconciliation';
import type {PlanAlternatives} from './home-plan-alternatives';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBusinessPlanning} from './home-business-planning.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {createBundleDraft,reviewBundleProposal,unknownAssumption} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {workforcePlanFields} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {appendConversationAlternative,associatePlanProposal,packPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
export const businessPlanningReceiptField='businessPlanningSelectionsV1';
const note='Provisional planning assumption, not verified availability, funding or an operational instruction.';
const proposed=<T>(value:T|null,basis=note):Assumption<T>=>value===null?unknownAssumption<T>():({value,kind:'illustrative',basis:basis.slice(0,240)});
const fromAtom=<T>(a:StaffingAtom):Assumption<T>=>proposed(a.value as T|null,`${a.basis.kind}: ${a.basis.explanation}`);
export async function prepareBusinessPlanningSelection(raw:BusinessPlanning,optionId:string){
 const state=readBusinessPlanning(raw)!;
 const option=state.staffing?.result.options.find(o=>o.id===optionId);
 if(!option||option.status==='invalid'||!option.monthly.length)throw Error('Choose a current calculable provisional option.');
 const s=state.review.spec,values=state.staffing!.inputs.values;
 const goal={id:state.context.boundGoal.id||state.context.intakeId,statement:state.context.boundGoal.statement||s.objective};
 const components:SolutionBundle['components']=[];
 for(const [path,id,domain,name] of [['buy','c1','hiring','Hire'],['build','c2','learning','Develop'],['move','c3','mobility','Redeploy']] as const)if(option.mix[path])components.push({id,name:`${name} ${option.mix[path]} roles`,domain,firstStep:`Validate the ${path} cost, timing and readiness assumptions before commitment.`,ownerRole:'To be assigned',evidence:[],dependsOn:[],limitation:note});
 const bundle:SolutionBundle={origin:'conversation-v1',id:'A',name:'Provisional staffing option',objective:s.objective.slice(0,160),coordination:'Review scope, workload shortfall, distinct internal pools, costs and delivery dates before operational action.',components,limitation:note};
 const binding=await actionBinding(goal.id,goal.statement,{sources:[]},{origin:'natural-business-planning-v1',context:state.context,review:state.review,staffing:state.staffing!.inputs,optionId});
 const draft=createBundleDraft(bundle,binding),i=draft.inputs;
 i.scope={population:proposed(s.scope),businessUnit:proposed(s.scope),jobProfile:proposed(s.scope),startMonth:proposed(s.startMonth),months:proposed(s.months),demand:proposed(state.review.result.additionalRoles),capacityRequired:proposed(true),requirements:proposed(s.objective),comparisonConfirmed:unknownAssumption(),currency:'USD'};
 const origins=Object.fromEntries(workforcePlanFields.map(field=>[field,option.input[field]?{kind:'illustrative',basis:field in values?`${values[field as keyof typeof values].basis.kind}: ${values[field as keyof typeof values].basis.explanation}`.slice(0,240):note}:{kind:'unknown',basis:null}])) as CapacityMix['origins'];
 i.capacity={input:structuredClone(option.input),origins,flows:components.map(c=>({id:'business-'+c.id,path:c.domain==='hiring'?'buy' as const:c.domain==='learning'?'build' as const:'move' as const,componentIds:[c.id],groupId:c.domain==='hiring'?null:'business-'+c.id}))};
 i.groups=components.filter(c=>c.domain!=='hiring').map(c=>({id:'business-'+c.id,label:c.name,count:proposed(c.domain==='learning'?option.mix.build:option.mix.move)}));
 i.memberships=components.map(c=>({componentId:c.id,groupIds:c.domain==='hiring'?[]:['business-'+c.id],complete:unknownAssumption()}));
 i.groupsDisjoint=fromAtom<boolean>(values.internalPoolsDistinct);
 i.dependenciesConfirmed=proposed(true,'This provisional comparison models independent paths only; no actual dependency or release approval is verified.');
 i.timing=components.map(c=>({componentId:c.id,start:proposed(s.startMonth+'-01'),finish:proposed(c.domain==='hiring'?option.input.arrivalDate||null:(c.domain==='learning'?option.input.buildMonth:option.input.moveMonth)?(c.domain==='learning'?option.input.buildMonth:option.input.moveMonth)+'-01':null)}));
 i.costsDistinct=fromAtom<boolean>(values.costsCompleteAndDistinct);
 i.costReviews=components.map(c=>({componentId:c.id,complete:fromAtom<boolean>(values.costsCompleteAndDistinct)}));
 i.expenseLinks=[['hireStaffingCost','c1'],['recruitingFees',option.mix.buy?'c1':components[0].id],['backfillStaffingCost',components.find(c=>c.domain!=='hiring')?.id??components[0].id],['internalSalaryUplift',components.find(c=>c.domain!=='hiring')?.id??components[0].id],['trainingCash','c2']].filter(([,id])=>components.some(c=>c.id===id)).map(([field,id])=>({expenseId:'capacity:'+field,componentIds:[id],allocations:null}));
 i.budget={amount:proposed(s.budgetUsd.value,`${s.budgetUsd.basis.kind}: ${s.budgetUsd.basis.explanation}`),basis:proposed('cash')};
 const result=reviewBundleProposal(draft);
 if(result.cashEstimate?.cash!==option.cash)throw Error('The selected proposal cash does not match its checked comparison.');
 return {state,option,draft,result,goal};
}
export type BusinessPlanningSelection=Awaited<ReturnType<typeof prepareBusinessPlanningSelection>>;
export function businessPlanningSelectionFields(selection:BusinessPlanningSelection,catalog:PlanAlternatives|null,requestId:string,at:string,previous:unknown){
 const receipts=previous===undefined?[]:previous;
 if(!Array.isArray(receipts)||receipts.length>=12)throw Error('Earlier business planning receipts cannot be extended safely. They are retained.');
 const {draft,goal,state,option}=selection,context={goalId:goal.id,goal:goal.statement};
 const outcome=appendConversationAlternative(catalog,context,{requestId,text:'Explicitly reviewed provisional staffing selection; not operational authorization.',sourceIds:[],expectedInputs:{}},draft,[note,...state.staffing!.result.limitations],JSON.stringify({reviewKey:state.review.key,staffing:state.staffing!.inputs,optionId:option.id}),1);
 if(outcome.status!=='ready')throw Error('The selected proposal could not be prepared.');
 const selected=associatePlanProposal(outcome.catalog,context,outcome.plan.id,{inputKey:outcome.plan.result.inputKey,attachmentId:requestId,at,acknowledgeUnknowns:true});
 return {[planAlternativesField]:packPlanAlternatives(selected),[businessPlanningReceiptField]:[...structuredClone(receipts),{version:1,selectedAt:at,planId:outcome.plan.id,state,optionId:option.id,acceptance:'Explicit proposal selection only; all input provenance and unknowns retained.'}]};
}
