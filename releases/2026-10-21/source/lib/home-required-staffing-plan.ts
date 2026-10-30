import type {BundleInputs,Assumption} from './home-bundle-reconciliation';
import type {RequiredStaffingReview} from './home-required-staffing';
// @ts-expect-error Native fixtures share source.
import {readRequiredStaffingReview,staffingDeliveryConflict} from './home-required-staffing.ts';
// @ts-expect-error Native fixtures share source.
import {calculateRequiredStaffing} from './required-staffing.ts';
export type RequiredStaffingPlanReceipt={version:1;review:RequiredStaffingReview;optionId:string;deliveryTarget:{months:number;turnId:string;quote:string}|null};
export function requiredStaffingPlanFacts(receipt:RequiredStaffingPlanReceipt){
 if(!receipt||Object.keys(receipt).sort().join()!=='deliveryTarget,optionId,review,version'||receipt.version!==1)throw Error('Invalid staffing plan receipt.');
 const review=readRequiredStaffingReview(receipt.review);if(!review)throw Error('A checked staffing comparison is required.');
 if(review.costBasis?.budget.amount!==undefined&&review.costBasis.budget.amount!==null&&review.costBasis.budget.quotedMonths!==review.inputs.months)throw Error('Confirm the scenario budget for this cost horizon before saving.');
 const result=calculateRequiredStaffing(review.inputs),option=result.options.find(o=>o.id===receipt.optionId);
 if(!option||option.budgetStatus==='over'||option.coverage==='not-met')throw Error('Review a supported staffing option within the entered constraints.');
 const d=receipt.deliveryTarget;
 if(d&&(Object.keys(d).sort().join()!=='months,quote,turnId'||!Number.isInteger(d.months)||d.months<1||d.months>24||typeof d.turnId!=='string'||!d.turnId||typeof d.quote!=='string'||!d.quote||d.quote.length>10000))throw Error('Invalid delivery target provenance.');
 if(staffingDeliveryConflict(option,review.inputs,d?.months??null))throw Error('The staffing option misses the stated delivery target. Review the timing before pinning.');
 return {review,result,option,deliveryTarget:d};
}
/** Native cash, hours and cost horizon stay in the exact receipt, outside the shared USD ledger. */
export function requiredStaffingPlanInputs(receipt:RequiredStaffingPlanReceipt):BundleInputs{
 const f=requiredStaffingPlanFacts(receipt),unknown=<T>():Assumption<T>=>({value:null,kind:'unknown',basis:null});
 const entered=<T>(value:T):Assumption<T>=>({value,kind:'illustrative',basis:'Checked staffing scenario; original user/model provenance retained in the native receipt, not verified workforce facts.'});
 return {costPolicy:'cash-hours-v2',requiredStaffingPlan:structuredClone(receipt),scope:{population:entered(`Proposed ${f.review.inputs.requiredRoles} ${f.review.inputs.role??'roles'}`),businessUnit:unknown(),jobProfile:unknown(),startMonth:unknown(),months:unknown(),demand:entered(f.review.inputs.requiredRoles!),capacityRequired:unknown(),requirements:entered('Validate staffing release, readiness and full costs before commitment.'),comparisonConfirmed:unknown(),currency:f.review.inputs.currency},capacity:null,timing:[{componentId:'c1',start:unknown(),finish:unknown()}],dependenciesConfirmed:unknown(),groups:[],memberships:[],groupsDisjoint:unknown(),expenses:[],expenseLinks:[],costReviews:[{componentId:'c1',complete:unknown()}],costsDistinct:unknown()};
}
export function requiredStaffingPlanIdentity(receipt:RequiredStaffingPlanReceipt){requiredStaffingPlanFacts(receipt);return JSON.stringify([receipt.review.datasetToken,receipt.review.scopeKey,receipt.review.inputs,receipt.review.origins,receipt.optionId,receipt.deliveryTarget,...(receipt.review.costBasis?[receipt.review.costBasis]:[])]);}
