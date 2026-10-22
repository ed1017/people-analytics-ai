import type {BundleInputs,Assumption} from './home-bundle-reconciliation';
import type {HiringBudgetReview} from './home-hiring-budget';
// @ts-expect-error Native fixture tests share source.
import {readHiringBudgetReview} from './home-hiring-budget.ts';
// @ts-expect-error Native fixture tests share source.
import {calculateHiringBudget,hiringBudgetFields} from './hiring-budget.ts';
export type CostedHiringPlanReceipt={version:1;review:HiringBudgetReview;externalHires:number};
export type ConditionalHiringPlanReceipt={version:2;kind:'conditional';review:HiringBudgetReview};
export type HiringPlanReceipt=CostedHiringPlanReceipt|ConditionalHiringPlanReceipt;
export const conditionalHiringSteps=['Compare hiring, internal moves and development against the role need and readiness date; availability is not yet confirmed.', 'Estimate costs from supported references or explicit scenario assumptions, then confirm timing and resources. A budget ceiling is optional; affordability is not assessed without one.'];
export function conditionalHiringPlanFacts(raw:ConditionalHiringPlanReceipt){
 if(!raw||Object.keys(raw).sort().join()!=='kind,review,version'||raw.version!==2||raw.kind!=='conditional')throw Error('Invalid conditional hiring receipt.');
 const review=readHiringBudgetReview(raw.review);if(!review||review.inputs.hires===null||review.inputs.hires<1||review.inputs.hires>1000)throw Error('An exploratory hiring plan needs a positive supported count.');
 const result=calculateHiringBudget(review.inputs,review.datasetToken);
 return {review,result,requiredRoles:review.inputs.hires,budget:review.inputs.budget,currency:review.inputs.currency,allowance:result.budgetPerHire,months:review.inputs.months,start:review.inputs.startMonth,arrival:review.inputs.arrivalDate,ftePerHire:review.inputs.ftePerHire,fullCost:null,affordability:null,availability:null};
}
export function canReviewCostedHiringPlan(review:HiringBudgetReview){return review.inputs.currency==='USD'&&calculateHiringBudget(review.inputs,review.datasetToken).listedCost!==null&&review.inputs.ftePerHire!==null;}
export function canReviewConditionalHiringPlan(review:HiringBudgetReview){try{conditionalHiringPlanFacts({version:2,kind:'conditional',review});return true;}catch{return false;}}
/** Match model presentation guidance to the same eligibility checks used by final validation. */
export function hiringAnswerContract(review:HiringBudgetReview){
 const costed=canReviewCostedHiringPlan(review),conditional=canReviewConditionalHiringPlan(review)&&!costed;
 return {allowedAnswerKinds:costed?['recommendedPlan','unsupportedPlan']:conditional?['conditionalHiringPlan']:['discussionOnly'],presentation:costed?'Use the exact current hiring calculation reference for a costed plan; preserve all unknowns and operational limits.':conditional?'Use conditionalHiringPlan with the exact current hiring calculation reference. Budget is optional. Without it, propose useful exploratory options and cost estimates only from supported references or explicit labeled assumptions; affordability is not assessed. A supplied budget supports an allowance, not a salary or availability claim. Ask only for genuinely necessary cost, scope or readiness inputs; do not gate exploration on asking Finance for a budget.':'The current count does not support a conditional hiring plan. Use discussionOnly to explain the checked inputs and clarify the required staffing quantity. A budget is optional. Do not return conditionalHiringPlan, invent a budget, or claim a calculated recommendation.'};
}
/** Native hiring inputs remain intact; a reviewed route count never replaces required roles. */
export function hiringPlanFacts(raw:CostedHiringPlanReceipt){
 if(!raw||Object.keys(raw).sort().join()!=='externalHires,review,version'||raw.version!==1)throw Error('Invalid hiring plan receipt.');
 const review=readHiringBudgetReview(raw.review)!;if(!review||review.inputs.currency!=='USD'||!Number.isInteger(raw.externalHires)||raw.externalHires<1||review.inputs.hires===null||raw.externalHires>review.inputs.hires)throw Error('Review a supported USD hiring route count.');
 const result=calculateHiringBudget({...review.inputs,hires:raw.externalHires},review.datasetToken);
 if(result.listedCost===null||!review.inputs.startMonth||!review.inputs.months||review.inputs.ftePerHire===null)throw Error('A hiring plan needs checked external costs, budget period and FTE basis.');
 const end=new Date(review.inputs.startMonth+'-01T00:00:00Z');end.setUTCMonth(end.getUTCMonth()+review.inputs.months);end.setUTCDate(0);
 return {monthlyCosts:result.rows.map(row=>({month:row.month,cash:row.listedCost!})),requiredRoles:review.inputs.hires,externalHires:raw.externalHires,externalFte:raw.externalHires*review.inputs.ftePerHire,ftePerHire:review.inputs.ftePerHire,remainingRoles:review.inputs.hires-raw.externalHires,externalSubtotal:result.listedCost,budget:review.inputs.budget,remainingBeforeUnknownCosts:review.inputs.budget===null?null:Math.round((review.inputs.budget-result.listedCost)*100)/100,start:review.inputs.startMonth,end:end.toISOString().slice(0,10),arrival:review.inputs.arrivalDate,months:review.inputs.months,fullCost:null,internalAvailability:null};
}
export function hiringPlanBrief(receipt:HiringPlanReceipt){if(receipt.version===2){const f=conditionalHiringPlanFacts(receipt);return `Conditional hiring proposal: ${f.requiredRoles} ${f.review.inputs.role??'roles'}; budget ${f.budget===null?'not provided; affordability not assessed':f.budget} ${f.currency??'currency unknown'}; allowance per hire ${f.allowance===null?'not calculated without a budget':f.allowance} for ${f.months===null?'an unconfirmed budget period':f.months+' months'}. This is not salary or reviewed complete cash. Cost coverage, available staffing, dates and affordability remain unverified.`;}const f=hiringPlanFacts(receipt);return `Required ${f.requiredRoles} roles; reviewed route: ${f.externalHires} external hires (${f.externalFte} FTE; ${f.ftePerHire} FTE per hire), ${f.remainingRoles} roles unresolved. Listed external cash subtotal: ${f.externalSubtotal} USD. Budget period: ${f.start} through ${f.end}; hire arrival: ${f.arrival}. Remaining before unknown costs: ${f.remainingBeforeUnknownCosts??'Unknown'} USD. Internal availability, release, backfill, payroll and full mixed-route costs remain unknown; this is not an affordability or readiness claim.`;}

/** Canonical receipt-bound inputs: edits must return through the native hiring calculator. */
export function hiringPlanInputs(receipt:HiringPlanReceipt):BundleInputs{
 if(receipt.version===2)return conditionalHiringPlanInputs(receipt);
 const facts=hiringPlanFacts(receipt),review=receipt.review;
 const unknown=<T>():Assumption<T>=>({value:null,kind:'unknown',basis:null});
 const assumption=<T>(value:T,basis:string):Assumption<T>=>({value,kind:'illustrative',basis});
 const basis='Exact checked hiring scenario receipt; original user/model provenance retained, not verified company facts.';
 const expenses:BundleInputs['expenses']=facts.monthlyCosts.map(row=>({id:'hiring-external-'+row.month,label:'External hiring cash for '+row.month,kind:'cash',amount:assumption(row.cash,basis),startMonth:assumption(row.month,basis),months:assumption(1,'One checked calendar month from the native hiring calculator.')}));
 return {costPolicy:'cash-hours-v2',hiringPlan:structuredClone(receipt),scope:{population:assumption(`Proposed ${facts.requiredRoles} ${review.inputs.role??'roles'}`,basis),businessUnit:unknown(),jobProfile:unknown(),startMonth:assumption(facts.start,basis),months:assumption(facts.months,basis),demand:assumption(facts.requiredRoles,basis),capacityRequired:unknown(),requirements:assumption('Cover the required roles; validate unresolved internal staffing and full costs.',basis),comparisonConfirmed:unknown(),currency:'USD'},capacity:null,budget:{amount:facts.budget===null?unknown():assumption(facts.budget,basis),basis:assumption('cash','Budget for the entered period, not funding approval.')},timing:[{componentId:'c1',start:assumption(facts.start+'-01',basis),finish:unknown()}],dependenciesConfirmed:unknown(),groups:[],memberships:[],groupsDisjoint:unknown(),expenses,expenseLinks:expenses.map(row=>({expenseId:row.id,componentIds:['c1'],allocations:null})),costReviews:[{componentId:'c1',complete:unknown()}],costsDistinct:assumption(true,'One native external subtotal only; no internal costs or other paths are added.')};
}

/** No money is copied into the USD cash ledger; the native receipt retains its currency and partial results. */
function conditionalHiringPlanInputs(receipt:ConditionalHiringPlanReceipt):BundleInputs{
 const f=conditionalHiringPlanFacts(receipt),unknown=<T>():Assumption<T>=>({value:null,kind:'unknown',basis:null});
 const entered=<T>(value:T|null):Assumption<T>=>value===null?unknown():({value,kind:'illustrative',basis:'Native conditional hiring input; exact user/model provenance retained in the receipt, not a verified workforce fact.'});
 return {costPolicy:'cash-hours-v2',hiringPlan:structuredClone(receipt),scope:{population:entered(`Proposed ${f.requiredRoles} ${f.review.inputs.role??'roles'}`),businessUnit:unknown(),jobProfile:unknown(),startMonth:entered(f.start),months:entered(f.months),demand:entered(f.requiredRoles),capacityRequired:unknown(),requirements:entered('Validate hiring scope, costs and availability before commitment.'),comparisonConfirmed:unknown(),currency:f.currency},capacity:null,timing:[{componentId:'c1',start:unknown(),finish:unknown()}],dependenciesConfirmed:unknown(),groups:[],memberships:[],groupsDisjoint:unknown(),expenses:[],expenseLinks:[],costReviews:[{componentId:'c1',complete:unknown()}],costsDistinct:unknown()};
}

/** Repeated identical requests reuse a snapshot; explicit provenance-kind changes remain reviewable. */
export function hiringPlanIdentity(receipt:HiringPlanReceipt){
 if(receipt.version===2)conditionalHiringPlanFacts(receipt);else hiringPlanFacts(receipt);
 const r=receipt.review;
 return JSON.stringify([receipt.version,receipt.version===1?receipt.externalHires:null,r.datasetToken,r.scopeKey,hiringBudgetFields.map(field=>[field,r.inputs[field],r.origins[field]?.kind??null])]);
}
