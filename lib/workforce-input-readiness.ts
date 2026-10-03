// Input guidance only. No calculation, evidence retrieval, storage, or inferred defaults.
// @ts-expect-error Native Node tests share the calculator's TypeScript contract.
import {workforcePlanInputIssues,workforceArrivalIssues,type WorkforcePlanInput,type WorkforcePlanField,type WorkforceInputIssue} from './workforce-increment.ts';
export function workforceInputReadiness(input:WorkforcePlanInput){
 const corrections=workforcePlanInputIssues(input);
 const unknowns:Array<{field:WorkforcePlanField;message:string}>=[];
 const evidenceChecks:Array<{field:WorkforcePlanField;message:string}>=[];
 const invalid=new Set(corrections.flatMap(issue=>issue.fields));
 const active=(key:WorkforcePlanField)=>!invalid.has(key)&&input[key]!==''&&Number(input[key])>0;
 const blank=(field:WorkforcePlanField,message:string)=>{if(input[field]===''&&!invalid.has(field))unknowns.push({field,message})};
 const internal=active('build')||active('move');
 if(active('roles')){
  const basis=active('buy')?'External hires':'Hiring-only comparison';
  blank('annualHireCost',`${basis}: annual hire cost is unknown.`);
  blank('hireFee',`${basis}: one-time hire fee is unknown.`);
  blank('arrivalMode',`${basis}: no hiring arrival assumption is selected.`);
  if(input.arrivalMode==='explicit')blank('arrivalDate',`${basis}: explicit hire arrival is unknown.`);
  if(input.arrivalMode==='historical-median'){
   if(!active('buy'))blank('recruitingStart','Hiring-only comparison: a recruiting launch date is needed to use historical timing.');
   evidenceChecks.push({field:'arrivalMode',message:'Historical arrival requires comparable role evidence during explicit calculation. This input check does not refresh or verify that evidence.'});
  }
 }
 if(internal)blank('internalAnnualCostChange','Internal cohort salary uplift is unknown.');
 if(active('build')){
  blank('buildMonth','Build readiness month is unknown; training cost does not establish readiness.');
  blank('trainingCash','Training cash is unknown.');
  blank('trainingHours','Employee training hours are unknown.');
  if(input.trainingHours!==''&&!invalid.has('trainingHours')&&Number(input.trainingHours)>0)blank('loadedHourlyCost','Employee time value is unknown without a loaded hourly cost.');
 }
 if(active('move'))blank('moveMonth','Move effective month is unknown.');
 if(internal&&active('backfills')){
  blank('backfillDate','Backfill arrival date is unknown.');blank('annualBackfillCost','Annual backfill cost is unknown.');blank('backfillFee','One-time backfill fee is unknown.');
 }
 blank('budget','No cash-budget limit is entered; its constraint remains unknown.');
 blank('maxAddedEmployees','No employee limit is entered; its constraint remains unknown.');
 blank('deadlineMonth','No coverage deadline is entered; its constraint remains unknown.');
 if(!corrections.length){
  const arrivals:WorkforceInputIssue[]=workforceArrivalIssues(input,active('buy')&&input.arrivalMode==='explicit'?input.arrivalDate||null:null,internal&&active('backfills')?input.backfillDate||null:null);
  corrections.push(...arrivals);
 }
 return {corrections,unknowns,evidenceChecks,capacity:'Operational capacity remains unverified. Candidate pools, courses and entered counts do not establish assignable employees or readiness.'};
}
