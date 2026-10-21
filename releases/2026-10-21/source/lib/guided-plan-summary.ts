// @ts-expect-error Native Node tests share application source.
import {unavailableMonthFraction} from './staffing-monthly-capacity.ts';
import type {SwpOption} from './swp-demo';
import type {HomeMixCandidate} from './home-mix-search';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleHorizonEnd} from './home-bundle-display.ts';
import type {BundleDraft} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {reviewBundleProposal,readBundleDraft} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {guidedWorkloadResult} from './guided-workload.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {projectSavedStaffingChoice} from './home-mix-search.ts';
/** Presentation only: retain the full canonical bundle and all calculation links. */
export function applicablePlanComponents(draft:BundleDraft){
 if(!draft.inputs.guidedWorkload||!draft.inputs.capacity)return draft.bundle.components;
 const ids=new Set(draft.inputs.capacity.flows.filter(f=>Number(draft.inputs.capacity!.input[f.path])>0).flatMap(f=>f.componentIds));
 const include=(id:string)=>{const c=draft.bundle.components.find(c=>c.id===id);for(const parent of c?.dependsOn??[])if(!ids.has(parent)){ids.add(parent);include(parent);}};
 for(const id of [...ids])include(id);
 return draft.bundle.components.filter(c=>ids.has(c.id));
}
export function guidedPlanSummary(draft:BundleDraft){
 if(!draft.inputs.guidedWorkload||!draft.inputs.capacity||!readBundleDraft(draft))return null;
 try{const candidate=projectSavedStaffingChoice(draft),coverage=reviewBundleProposal(draft).conditionalCoverage;
 return {mix:candidate.mix,cash:candidate.cash.complete,cashBreakdown:candidate.cash,target:guidedPlanTarget(draft),ready:candidate.metrics?.fullCoverageDate??null,effort:guidedOptionEffort({draft,coverage})};}catch{return null;}
}
/** Monthly qualified roles prorate calendar days after all existing dependency gates. */
export function optionMonthlyCoverage(option:Pick<SwpOption,'draft'|'coverage'>){
 const months=option.draft.inputs.scope.months.value!;
 if(!option.coverage||option.coverage.length!==months||option.coverage.some(v=>v===null))return null;
 const covered=[...option.coverage] as number[],start=option.draft.inputs.scope.startMonth.value!,capacity=option.draft.inputs.capacity!,ready=reviewBundleProposal(option.draft).componentReady;
 for(const flow of capacity.flows.filter(f=>f.path!=='backfills')){
  const arrival=flow.path==='buy'?capacity.input.arrivalDate:capacity.input[flow.path==='build'?'buildMonth':'moveMonth']+'-01',prerequisites=flow.componentIds.map(id=>ready[id]);
  if(prerequisites.some(v=>v===null))return null;
  const effective=[arrival,...prerequisites as string[]].sort().at(-1)!,index=(Number(effective.slice(0,4))-Number(start.slice(0,4)))*12+Number(effective.slice(5,7))-Number(start.slice(5,7));
  if(Number(effective.slice(8,10))>1&&index>=0&&index<months)covered[index]=Math.max(0,covered[index]-Number(capacity.input[flow.path])*unavailableMonthFraction(effective));
 }
 return covered;
}
export function optionRoleMonths(option:Pick<SwpOption,'draft'|'coverage'>){
 const covered=optionMonthlyCoverage(option);
 return covered===null?null:covered.reduce((sum,n)=>sum+n,0);
}
/** Work is due in its month: later surplus cannot recover an earlier shortage. */
export function monthlyCapacityEffort(coveredRoles:number[],workloadHoursPerMonth:number,baselineHoursPerMonth:number,productiveHoursPerRoleMonth:number){
 return coveredRoles.reduce((total,roles)=>{
  const additionalHours=roles*productiveHoursPerRoleMonth,totalHours=baselineHoursPerMonth+additionalHours;
  return {additionalHours:total.additionalHours+additionalHours,totalHours:total.totalHours+totalHours,
   shortfallHours:total.shortfallHours+Math.max(0,workloadHoursPerMonth-totalHours)};
 },{additionalHours:0,totalHours:0,shortfallHours:0});
}
export function guidedOptionEffort(option:Pick<SwpOption,'draft'|'coverage'>){
 const baseline=guidedWorkloadResult(option.draft.inputs),covered=optionMonthlyCoverage(option);
 if(!baseline||baseline.status!=='calculated'||covered===null)return null;
 return monthlyCapacityEffort(covered,baseline.workloadHours!/covered.length,baseline.capacityHours!/covered.length,option.draft.inputs.guidedWorkload!.productiveHours.value!);
}

export const conditionalRoleEvidence='Record a dated baseline and later comparable count for this exact unit and role, with proficiency/work-sample validation, contracted FTE, allocation and source-team release or hire-start evidence. Training completion alone is insufficient. Actual progress remains unknown until measured; automated progress arithmetic is not supported for this metric.';
/** Read the saved scenario; never add assumptions or alter its input identity. */
export function guidedPlanTarget(draft:BundleDraft){
 if(!draft.inputs.guidedWorkload||!draft.inputs.capacity||!readBundleDraft(draft))return null;
 const scope=draft.inputs.scope,deadline=bundleHorizonEnd(scope).value,roles=scope.demand.value,workload=guidedWorkloadResult(draft.inputs);
 if(!deadline||roles===null||Number(draft.inputs.capacity.input.roles)!==roles)return null;
 return {baselineFte:workload?.qualifiedAllocatedFte??null,metric:'Conditional additional-role coverage',roles,deadline,population:scope.population.value,unit:scope.businessUnit.value,role:scope.jobProfile.value,fteGap:workload?.additionalFte??null,
  lines:[`Metric: Conditional additional-role coverage.`,`Scenario target: ${roles} whole roles by ${deadline}.`,`Scope: ${scope.population.value}; unit: ${scope.businessUnit.value}; role: ${scope.jobProfile.value}.`,
   `The model rounds the additional FTE gap (${workload?.additionalFte??'Unknown'} FTE) up to whole roles and assumes 1 qualified, allocated FTE per additional role. Roles are not added company headcount.`,
   `Starting qualified capacity assumption: ${workload?.qualifiedAllocatedFte??'Unknown'} FTE. This is the entered scenario baseline, not a measured outcome. Measured baseline and later outcome for additional-role delivery remain unknown. Delivery milestones are proposed steps, not evidence of capacity achieved. End-date role coverage does not erase earlier uncovered workload.`,conditionalRoleEvidence]};
}
const cashLabels:Record<string,string>={'capacity:hireStaffingCost':'New-hire payroll','capacity:backfillStaffingCost':'Backfill payroll','capacity:internalSalaryUplift':'Internal salary uplift','capacity:recruitingFees':'Recruiting fees','capacity:trainingCash':'Training cash'};
export function staffingCashBreakdown(draft:BundleDraft,cash:HomeMixCandidate['cash']){
 return {start:draft.inputs.scope.startMonth.value,end:bundleHorizonEnd(draft.inputs.scope).value,months:draft.inputs.scope.months.value,total:cash.complete,knownSubtotal:cash.knownSubtotal,
  lines:cash.ledger.map(line=>({id:line.id,label:cashLabels[line.id]??draft.inputs.expenses.find(e=>e.id===line.id)?.label??line.id,total:line.total}))};
}
