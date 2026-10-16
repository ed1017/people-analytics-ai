import type {SwpOption} from './swp-demo';
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
 return {mix:candidate.mix,cash:candidate.cash.complete,ready:candidate.metrics?.fullCoverageDate??null,effort:guidedOptionEffort({draft,coverage})};}catch{return null;}
}
/** Qualified role-months exclude partial readiness months, using the existing dependency gates. */
export function optionRoleMonths(option:Pick<SwpOption,'draft'|'coverage'>){
 const months=option.draft.inputs.scope.months.value!;
 if(!option.coverage||option.coverage.length!==months||option.coverage.some(v=>v===null))return null;
 const covered=[...option.coverage] as number[],start=option.draft.inputs.scope.startMonth.value!,capacity=option.draft.inputs.capacity!,ready=reviewBundleProposal(option.draft).componentReady;
 for(const flow of capacity.flows.filter(f=>f.path!=='backfills')){
  const arrival=flow.path==='buy'?capacity.input.arrivalDate:capacity.input[flow.path==='build'?'buildMonth':'moveMonth']+'-01',prerequisites=flow.componentIds.map(id=>ready[id]);
  if(prerequisites.some(v=>v===null))return null;
  const effective=[arrival,...prerequisites as string[]].sort().at(-1)!,index=(Number(effective.slice(0,4))-Number(start.slice(0,4)))*12+Number(effective.slice(5,7))-Number(start.slice(5,7));
  if(Number(effective.slice(8,10))>1&&index>=0&&index<months)covered[index]=Math.max(0,covered[index]-Number(capacity.input[flow.path]));
 }
 return covered.reduce((sum,n)=>sum+n,0);
}
export function guidedOptionEffort(option:Pick<SwpOption,'draft'|'coverage'>){
 const baseline=guidedWorkloadResult(option.draft.inputs),roleMonths=optionRoleMonths(option);
 if(!baseline||baseline.status!=='calculated'||roleMonths===null)return null;
 const additionalHours=roleMonths*option.draft.inputs.guidedWorkload!.productiveHours.value!;
 return {additionalHours,totalHours:baseline.capacityHours!+additionalHours,shortfallHours:Math.max(0,baseline.workloadHours!-baseline.capacityHours!-additionalHours)};
}
