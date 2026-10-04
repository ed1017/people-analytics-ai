// Guided presentation of the existing input validator; never fills or calculates assumptions.
// @ts-expect-error Native Node tests share the TypeScript source.
import {workforceInputReadiness} from './workforce-input-readiness.ts';
import type {WorkforcePlanInput,WorkforcePlanField} from './workforce-increment';
import type {SolutionInputs} from './workforce-solution';
export const workforceInputGroups:[keyof SolutionInputs,string,[WorkforcePlanField,string][]][]=[
 ['scope','1. Which additional role requirement?',[['businessUnit','Business unit'],['jobProfile','Job profile'],['intent','Demand type'],['planningMonth','Planning start month (YYYY-MM)'],['months','Planning horizon (months)']]],
 ['demand','2. How many additional roles?',[['roles','Additional roles']]],
 ['response','3. Which response mix should be compared?',[['build','Build: existing employees after development'],['move','Move: existing employees already ready'],['buy','Buy: external hires'],['backfills','Additional external backfills for internal moves (explicit 0 if none)']]],
 ['timing','4. When would each path take effect?',[['recruitingStart','Proposed recruiting launch (YYYY-MM-DD)'],['arrivalMode','Hiring arrival assumption'],['arrivalDate','Explicit hire arrival (YYYY-MM-DD)'],['buildMonth','Assumed Build readiness month (YYYY-MM)'],['moveMonth','Assumed Move effective month (YYYY-MM)'],['backfillDate','Assumed backfill arrival (YYYY-MM-DD)']]],
 ['costs','5. Which incremental costs are known? USD only',[['annualHireCost','Annual loaded cost per external hire (USD)'],['hireFee','One-time recruiting fee per external hire (USD)'],['annualBackfillCost','Annual loaded cost per backfill (USD)'],['backfillFee','One-time fee per backfill (USD)'],['internalAnnualCostChange','Total annual salary uplift for internal cohort (USD)']]],
 ['training','6. Training assumptions',[['trainingCash','Total training cash (USD)'],['trainingHours','Total employee training hours'],['loadedHourlyCost','Loaded hourly cost (USD/hour)']]],
 ['constraints','7. What limits should the plan meet?',[['budget','Incremental cash budget over this horizon (USD)'],['maxAddedEmployees','Maximum additional employees, including backfills'],['deadlineMonth','Required coverage month (YYYY-MM)']]],
];

export function nextRequiredWorkforceStep(input:WorkforcePlanInput){
 const readiness=workforceInputReadiness(input),required=new Set(readiness.corrections.flatMap(issue=>issue.fields));
 const group=workforceInputGroups.find(([, ,fields])=>fields.some(([field])=>required.has(field)));
 return group?{section:group[0],fields:group[2].filter(([field])=>required.has(field)).map(([field])=>field)}:null;
}
