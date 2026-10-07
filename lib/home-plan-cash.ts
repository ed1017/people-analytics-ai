import type {BundleDraft} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {calculatePlanWhatIf} from './home-plan-what-if.ts';
export type PlanCashEstimate={cash:number|null;coverage:'reviewed'|'partial'|'unknown';reason:string};
const month=(value:string)=>Number(value.slice(0,4))*12+Number(value.slice(5,7))-1;
/** A scheduled allowance subtotal is not evidence that all costs were entered. */
export function listedPlanCash(draft:BundleDraft):number|null{
 const input=draft.inputs,start=input.scope.startMonth.value,months=input.scope.months.value,rows=input.expenses.filter(row=>row.kind==='cash');
 if(input.costsDistinct.value===false||!start||!months||!rows.length&&!input.costReviews.every(row=>row.complete.value===true))return null;
 if(rows.some(row=>row.amount.value===null||row.months.value===null||row.startMonth.value===null||month(row.startMonth.value)<month(start)||month(row.startMonth.value)+row.months.value>month(start)+months))return null;
 return Math.round(rows.reduce((total,row)=>total+row.amount.value!*row.months.value!,0)*100)/100;
}
/** Shared by Home, revisions, comparison and attachment snapshots. No fallback can hide missing payroll. */
export function planCashEstimate(draft:BundleDraft,reviewedCash:number|null=null):PlanCashEstimate{
 const input=draft.inputs;
 const unknown=(reason:string):PlanCashEstimate=>({cash:null,coverage:'unknown',reason});
 if(input.costsDistinct.value===false)return unknown('Costs overlap. Reconcile shared costs before using a total.');
 if(input.capacity)return reviewedCash===null?unknown('Staffing payroll, vendor costs, funding or cost coverage remain unresolved. Existing employee effort stays in hours.'):{cash:reviewedCash,coverage:'reviewed',reason:'Reviewed incremental cash includes new-hire and backfill payroll, recruiting fees, vendor cash and salary uplifts; existing employee effort stays in hours.'};
 const scenario=calculatePlanWhatIf(input);
 if(input.whatIf?.kind==='capacity'&&scenario?.status!=='ready')return unknown(scenario?.reason??'Role costs and their paid period remain unresolved.');
 const cash=input.whatIf?.kind==='capacity'&&scenario?.status==='ready'?scenario.cash:reviewedCash??listedPlanCash(draft);
 if(cash===null)return unknown('Cash amounts or funding dates are missing. Unknown costs are not zero.');
 if(reviewedCash!==null&&input.whatIf?.kind!=='capacity')return {cash,coverage:'reviewed',reason:'Reviewed incremental cash for the stated horizon; existing employee effort stays in hours.'};
 return {cash,coverage:'partial',reason:'Assumption-based subtotal. Listed costs are assumed distinct; omitted payroll, vendor costs or other obligations remain unresolved. This does not establish available headroom.'};
}
