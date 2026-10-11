import type {HiringBudgetReview} from './home-hiring-budget';
// @ts-expect-error Native fixture tests share source.
import {readHiringBudgetReview} from './home-hiring-budget.ts';
// @ts-expect-error Native fixture tests share source.
import {calculateHiringBudget} from './hiring-budget.ts';
export type HiringPlanReceipt={version:1;review:HiringBudgetReview;externalHires:number};
/** Native hiring inputs remain intact; a reviewed route count never replaces required roles. */
export function hiringPlanFacts(raw:HiringPlanReceipt){
 if(!raw||Object.keys(raw).sort().join()!=='externalHires,review,version'||raw.version!==1)throw Error('Invalid hiring plan receipt.');
 const review=readHiringBudgetReview(raw.review)!;if(!review||review.inputs.currency!=='USD'||!Number.isInteger(raw.externalHires)||raw.externalHires<1||review.inputs.hires===null||raw.externalHires>review.inputs.hires)throw Error('Review a supported USD hiring route count.');
 const result=calculateHiringBudget({...review.inputs,hires:raw.externalHires},review.datasetToken);
 if(result.listedCost===null||!review.inputs.startMonth||!review.inputs.months||review.inputs.ftePerHire===null)throw Error('A hiring plan needs checked external costs, budget period and FTE basis.');
 const end=new Date(review.inputs.startMonth+'-01T00:00:00Z');end.setUTCMonth(end.getUTCMonth()+review.inputs.months);end.setUTCDate(0);
 return {monthlyCosts:result.rows.map(row=>({month:row.month,cash:row.listedCost!})),requiredRoles:review.inputs.hires,externalHires:raw.externalHires,externalFte:raw.externalHires*review.inputs.ftePerHire,ftePerHire:review.inputs.ftePerHire,remainingRoles:review.inputs.hires-raw.externalHires,externalSubtotal:result.listedCost,budget:review.inputs.budget,remainingBeforeUnknownCosts:review.inputs.budget===null?null:Math.round((review.inputs.budget-result.listedCost)*100)/100,start:review.inputs.startMonth,end:end.toISOString().slice(0,10),arrival:review.inputs.arrivalDate,months:review.inputs.months,fullCost:null,internalAvailability:null};
}
export function hiringPlanBrief(receipt:HiringPlanReceipt){const f=hiringPlanFacts(receipt);return `Required ${f.requiredRoles} roles; reviewed route: ${f.externalHires} external hires (${f.externalFte} FTE; ${f.ftePerHire} FTE per hire), ${f.remainingRoles} roles unresolved. Listed external cash subtotal: ${f.externalSubtotal} USD. Budget period: ${f.start} through ${f.end}; hire arrival: ${f.arrival}. Remaining before unknown costs: ${f.remainingBeforeUnknownCosts??'Unknown'} USD. Internal availability, release, backfill, payroll and full mixed-route costs remain unknown; this is not an affordability or readiness claim.`;}
