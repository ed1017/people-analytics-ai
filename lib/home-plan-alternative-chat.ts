// @ts-expect-error Native Node tests share TypeScript source.
import {combinationIntent,resolveNumberedPlans,type PlanAlternatives,type PlanAlternative} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planBudgetText} from './home-plan-revisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planCashEstimate} from './home-plan-cash.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planStaffEffortText} from './home-plan-delivery-estimate.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleChatEditIntent} from './home-bundle-chat-edit.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planReferenceNumbers} from './home-plan-references.ts';
export const alternativeViewField='homePlanAlternativeViewV1';
export const planCombinationQuestion=(text:string)=>/\b(?:combine|combination|merge|join)\b/i.test(text)&&/\b(?:action\s+)?plans?\b/i.test(text)&&!combinationIntent(text);
export function localPlanDiscussion(text:string){return combinationIntent(text)||planCombinationQuestion(text)||planReferenceNumbers(text).length>0||/\b(?:this|selected) (?:action )?plan\b/i.test(text);}
export function alternativeView(raw:unknown,catalog:PlanAlternatives){
 const value=raw as {version?:unknown;selectedId?:unknown;collapsed?:unknown}|undefined;
 const selectedId=value?.version===1&&typeof value.selectedId==='string'&&catalog.order.includes(value.selectedId)?value.selectedId:catalog.order.at(-1)??'';
 return {version:1 as const,selectedId,collapsed:value?.version===1&&value.collapsed===true};
}
export function planAlternativeSummary(plan:PlanAlternative){
 const cash=planCashEstimate(plan.draft,plan.result.cashTotal),amount=cash.cash===null?'Unknown':`$${cash.cash.toLocaleString('en-US')} USD`;
 return `Action Plan #${plan.number}: ${plan.draft.bundle.name}. ${planBudgetText(plan.result)} Cash estimate: ${amount}. ${cash.reason} Staff effort: ${planStaffEffortText(plan.draft)} Deliverables by ${plan.result.deliveryEstimate?.finish??plan.result.planFinish??'an unresolved date'}. This is a proposal, not an approved or predicted outcome.`;
}
/** Read actual snapshots for questions; never convert explanation into an edit. */
export function alternativeQuestionReply(text:string,catalog:PlanAlternatives,selectedId:string):string|null{
 if(combinationIntent(text)||bundleChatEditIntent(text).edit)return null;
 const named=planReferenceNumbers(text).length>0;
 if(planCombinationQuestion(text))return `${named?resolveNumberedPlans(text,catalog,catalog).map(planAlternativeSummary).join('\n\n'):'Available in this goal: '+catalog.order.map(id=>{const plan=catalog.plans.find(item=>item.id===id)!;return `Action Plan #${plan.number} (${plan.draft.bundle.name})`;}).join('; ')}. To propose a combination, name two numbers, for example “Combine Action Plan #1 and #2”. Review participant and cash overlap before creating it. The originals stay saved; staffing mixes and incompatible scopes may require further review.`;
 if(!localPlanDiscussion(text))return null;
 const plans=named?resolveNumberedPlans(text,catalog,catalog):catalog.plans.filter(plan=>plan.id===selectedId&&!plan.deleted);
 return plans.map(planAlternativeSummary).join('\n\n');
}
