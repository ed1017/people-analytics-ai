import type {RequiredStaffingReview} from './home-required-staffing';
// @ts-expect-error Native tests share the calculator.
import {calculateRequiredStaffing} from './required-staffing.ts';
export const currentStaffingPresentationField='planning.currentStaffingPresentationV1';
type Turn={id:string;role:string;text:string};
export type CurrentStaffingReceipt={version:1;datasetToken:string;scopeKey:string;reviewSignature:string;answerId:string};
export function captureCurrentStaffingPresentation(review:RequiredStaffingReview,turns:Turn[]):CurrentStaffingReceipt|null{
 const answer=turns.filter(turn=>turn.role==='assistant').at(-1);
 return answer?{version:1,datasetToken:review.datasetToken,scopeKey:review.scopeKey,reviewSignature:JSON.stringify(review),answerId:answer.id}:null;
}
export function currentStaffingPresentation(raw:unknown,review:RequiredStaffingReview|null|undefined,turns:Turn[]):CurrentStaffingReceipt|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!review)return null;
 const value=raw as CurrentStaffingReceipt,last=turns.filter(turn=>turn.role==='assistant').at(-1);
 if(Object.keys(value).sort().join()!=='answerId,datasetToken,reviewSignature,scopeKey,version'||value.version!==1||typeof value.answerId!=='string'||!last||last.id!==value.answerId||value.datasetToken!==review.datasetToken||value.scopeKey!==review.scopeKey||value.reviewSignature!==JSON.stringify(review))return null;
 return structuredClone(value);
}
export function currentRequiredStaffingSummary(review:RequiredStaffingReview,deliveryMonths:number|null){
 const result=calculateRequiredStaffing(review.inputs),input=result.input;
 const recommended=result.options.find(option=>option.id===result.recommendation?.optionId);
 // A listed-cost preference is not a readiness or funding approval.
 const pendingBudget=review.costBasis?.budget.amount!=null&&review.costBasis.budget.quotedMonths!==input.months;
 const actionable=!pendingBudget&&recommended&&recommended.readyAfterMonths!==null&&(deliveryMonths===null||recommended.readyAfterMonths<=deliveryMonths)?recommended:null;
 return {revision:review.revision,requiredPeople:input.requiredRoles,costHorizonMonths:input.months,deliveryMonths,
  decision:actionable?`Compare training ${actionable.train}, redeploying ${actionable.redeploy} and hiring ${actionable.hire}.`:'Compare staffing mixes using the current inputs.',
  readyAfterMonths:actionable?.readyAfterMonths??null,
  missing:[result.options.some(option=>option.completeCash===null)?'costs':null,result.options.some(option=>option.readyAfterMonths===null)?'ready dates':null].filter(Boolean).join(' and ')};
}

