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

/** Small footer copy for verified searches; the threshold affects presentation only. */
export function workforceSearchCountCopy(summary: {enumerated:number;calculatorInvocations:number;enumerationComplete:boolean;counts:{invalid:number};emitted:number;omittedByCap:number;excludedByFilter:number;truncated:boolean}|null){
 if(!summary)return {headline:null,detail:'No verified search count is attached to these options.'};
 const calculated=summary.enumerated-summary.counts.invalid;
 return {
  headline:calculated>=100?`${summary.enumerationComplete?'Compared':'Partial search: compared'} ${calculated.toLocaleString('en-US')} scenarios${summary.truncated?' • Output capped':''}`:!summary.enumerationComplete?'Partial search':summary.truncated?'Saved search output capped':null,
  detail:`${summary.enumerated} combinations enumerated; ${summary.enumerated} candidate calculation attempts: ${calculated} calculated, ${summary.counts.invalid} invalid. ${summary.calculatorInvocations} total calculator calls including the separate reference. ${summary.emitted} search results returned; ${summary.omittedByCap} omitted by the output cap; ${summary.excludedByFilter} excluded by the filter. ${summary.enumerationComplete?'Complete within the explicit bounds.':'Search incomplete.'} Displayed options are not a global top ranking.`,
 };
}

/** Short card copy from calculated values only; no inferred skill or hiring evidence. */
export function workforceOptionBullets(plan:WorkforceIncrement){
 const outcome=workforceScenarioOutcomes(plan);
 const number=(value:number|null)=>value===null?'Unknown':value.toLocaleString('en-US',{maximumFractionDigits:2});
 const bullets=[
  {label:'Expected result',text:outcome.deadline?`${number(outcome.covered)} of ${outcome.roles} roles by ${outcome.deadline}; gap ${number(outcome.remaining)}. Conditional.`:'Deadline coverage unknown; no deadline specified.'},
  {label:'Cost',text:`USD ${number(plan.totalCash)} cash / ${plan.input.months} months; time USD ${number(plan.totalTime)} separately.`},
  {label:'Timing',text:outcome.fullCoverageMonth?`Full coverage ${outcome.fullCoverageMonth}, if assumptions hold.`:outcome.coverageTiming==='unknown'?'Full coverage timing unknown.':'Full coverage not reached within this plan.'},
  {label:'Staffing',text:`Train ${plan.input.build}; move ${plan.input.move}; hire ${plan.input.buy}. Added employees: ${number(plan.maxAddedEmployees)}.`},
  {label:'Why',text:plan.checks.some(check=>check.status==='not met')?'Some entered limits are not met.':plan.checks.length!==3||plan.checks.some(check=>check.status!=='met')?'Some entered limits cannot be checked.':'Meets entered limits; feasibility unverified.'},
 ];
 if(Number(plan.input.backfills)>0)bullets.push({label:'Backfills',text:`${plan.input.backfills} external backfills included; source-team impact needs review.`});
 return bullets.map(item=>({...item,emphasis:item.label==='Expected result'?[`${number(outcome.covered)} of ${outcome.roles} roles`,`gap ${number(outcome.remaining)}`]:item.label==='Cost'?[`USD ${number(plan.totalCash)}`,`${plan.input.months} months`,`USD ${number(plan.totalTime)}`]:item.label==='Timing'&&outcome.fullCoverageMonth?[outcome.fullCoverageMonth]:item.label==='Staffing'?[`Train ${plan.input.build}`,`move ${plan.input.move}`,`hire ${plan.input.buy}`,`Added employees: ${number(plan.maxAddedEmployees)}`]:item.label==='Backfills'?[`${plan.input.backfills} external backfills`]:[]}));
}

/** Report original verified enumeration, never a new run or an unsupported ranking. */
export function workforceOptionsLead(summary:Parameters<typeof workforceSearchCountCopy>[0],options:number):string|null{
 if(!summary||!Number.isSafeInteger(options)||options<1)return null;
 const calculated=summary.enumerated-summary.counts.invalid;
 if(calculated<100)return null;
 return `Original ${summary.enumerationComplete?'search':'partial search'}: ${calculated.toLocaleString('en-US')} scenarios calculated. Here ${options===1?'is 1 option':`are ${options} options`} to consider.`;
}
