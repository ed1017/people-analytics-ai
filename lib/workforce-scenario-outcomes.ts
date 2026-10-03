/** Presentation of existing deterministic outputs; no forecast or new arithmetic model. */
// @ts-expect-error Native Node tests share TypeScript.
import {workforceIncrementMethodVersion,type WorkforceIncrement,type WorkforcePlanField} from './workforce-increment.ts';
export function workforceScenarioOutcomes(plan:WorkforceIncrement){
 const deadline=plan.input.deadlineMonth||null,row=deadline?plan.rows.find(item=>item.month===deadline):undefined;
 const full=plan.rows.find(item=>item.conditionalRoleCoverage!==null&&item.conditionalRoleCoverage>=Number(plan.input.roles))?.month??null;
 return {kind:'scenario-estimate' as const,method:workforceIncrementMethodVersion,cash:plan.totalCash,employeeTime:plan.totalTime,addedEmployees:plan.maxAddedEmployees,deadline,roles:Number(plan.input.roles),covered:row?.conditionalRoleCoverage??null,remaining:row?.remainingRoles??null,fullCoverageMonth:full,coverageTiming:full?'conditional':plan.rows.some(item=>item.conditionalRoleCoverage===null)?'unknown':'not-reached',forecast:{status:'unavailable' as const,reason:'No validated forecasting model or out-of-sample performance evidence is attached to this calculation.'}};
}
export const calculationStepFields:{mix:WorkforcePlanField[];timing:WorkforcePlanField[];costs:WorkforcePlanField[];outcomes:WorkforcePlanField[]}={
 mix:['build','move','buy','backfills'],
 timing:['buildMonth','moveMonth','recruitingStart','arrivalMode','arrivalDate','backfillDate'],
 costs:['trainingCash','trainingHours','loadedHourlyCost','annualHireCost','hireFee','annualBackfillCost','backfillFee','internalAnnualCostChange'],
 outcomes:['budget','maxAddedEmployees','deadlineMonth'],
};
export function workforceCostBreakdown(plan:WorkforceIncrement){
 const columns=['hireStaffingCost','backfillStaffingCost','internalSalaryUplift','recruitingFees','trainingCash'] as const;
 return columns.map(key=>({key,value:plan.rows.some(row=>row[key]===null)?null:Math.round((plan.rows.reduce((sum,row)=>sum+row[key]!,0)+Number.EPSILON)*100)/100}));
}
