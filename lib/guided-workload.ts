import type {Assumption,BundleInputs} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {calculateServiceDemand,type ServiceDemand} from './swp-demand.ts';
export const guidedWorkloadFields=['volume','hoursPerUnit','productiveHours','existingPeople','ftePerPerson','allocationPct','skillCoveragePct'] as const;
export type GuidedWorkloadField=typeof guidedWorkloadFields[number];
export type GuidedWorkload={version:1}&Record<GuidedWorkloadField,Assumption<number>>;
export const guidedWorkloadLabels:Record<GuidedWorkloadField,string>={volume:'Service units per month',hoursPerUnit:'Hours per service unit',productiveHours:'Productive hours per FTE per month',existingPeople:'Existing role holders excluding develop and move pools',ftePerPerson:'Contracted FTE per existing person',allocationPct:'Available allocation percent',skillCoveragePct:'Allocated FTE meeting required proficiency percent'};
export function defaultGuidedWorkload():GuidedWorkload {
 const values=[1280,1,160,10,1,50,60];
 return {version:1,...Object.fromEntries(guidedWorkloadFields.map((key,i)=>[key,{value:values[i],kind:'illustrative',basis:'Fictional service scenario; existing role holders exclude all separate develop/move pools. Not measured workforce data.'}]))} as GuidedWorkload;
}
export function validateGuidedWorkload(raw:GuidedWorkload){
 if(!raw||raw.version!==1||Object.keys(raw).sort().join()!==['version',...guidedWorkloadFields].sort().join())throw Error('Invalid guided workload assumptions.');
 for(const key of guidedWorkloadFields){const a=raw[key],max=key.endsWith('Pct')?100:key==='ftePerPerson'?1:1000000;
  if(!a||Object.keys(a).sort().join()!=='basis,kind,value'||!['illustrative','user-entered','unknown'].includes(a.kind)||(a.value===null)!==(a.kind==='unknown')||(a.value!==null&&(!Number.isFinite(a.value)||a.value<0||a.value>max||(key==='existingPeople'||key==='volume')&&!Number.isInteger(a.value)))||(a.value!==null&&(typeof a.basis!=='string'||!a.basis.trim())))throw Error(`Review ${guidedWorkloadLabels[key]}. Unknown inputs must stay blank; counts and percentages must be valid.`);
 }
}
/** Reuses the workload engine. Qualified allocation is an explicit intersection assumption, not a productivity uplift. */
export function guidedWorkloadResult(input:Pick<BundleInputs,'guidedWorkload'|'scope'>){
 const w=input.guidedWorkload;if(!w)return null;validateGuidedWorkload(w);
 const scope=input.scope.population.value,months=input.scope.months.value;
 const basis={kind:'illustrative' as const,turnId:null,quote:null,explanation:'Guided scenario assumptions, not observed capacity.'};
 const q=(value:number|null,period:'month'|null=null)=>({value,scope,period,basis:{...basis,kind:value===null?'unknown' as const:'illustrative' as const}});
 const allocation=w.allocationPct.value,skill=w.skillCoveragePct.value;
 const spec={objective:'Cover the entered service workload',objectiveTurnId:'guided-workload',scope,scopeBasis:basis,linkageBasis:basis,startMonth:input.scope.startMonth.value,months,startBasis:basis,monthsBasis:basis,linkage:'Service units multiplied by hours per unit, repeated monthly.',contracts:q(w.volume.value),hoursPerContract:q(w.hoursPerUnit.value,'month'),productiveHoursPerFte:q(w.productiveHours.value,'month'),existingRoles:q(w.existingPeople.value),existingFtePerRole:q(w.ftePerPerson.value),availabilityPct:q(allocation===null||skill===null?null:allocation*skill/100),ftePerRole:q(1),explicitAdditionalRoles:q(null),budgetUsd:q(null)} as ServiceDemand;
 const result=calculateServiceDemand(spec),contractedFte=w.existingPeople.value===null||w.ftePerPerson.value===null?null:w.existingPeople.value*w.ftePerPerson.value;
 return {...result,contractedFte,allocatedFte:contractedFte===null||allocation===null?null:contractedFte*allocation/100,qualifiedAllocatedFte:result.availableFte};
}
export function syncGuidedWorkloadDemand(inputs:BundleInputs){
 const result=guidedWorkloadResult(inputs);if(!result)return;
 if(!inputs.capacity)throw Error('Guided workload requires its shared staffing inputs.');
 const roles=result.additionalRoles;
 if(roles!==null&&roles>1000)throw Error('Calculated demand exceeds 1,000 roles; narrow the scenario.');
 const value=roles!==null&&roles>0?roles:null;
 const basis='Calculated from the shared unverified workload, FTE, allocation and proficiency assumptions. One additional role is one qualified FTE; internal pools are excluded from existing capacity.';
 inputs.scope.demand={value,kind:value===null?'unknown':'illustrative',basis:value===null?null:basis};
 inputs.capacity.input.roles=value===null?'':String(value);inputs.capacity.origins.roles={kind:value===null?'unknown':'illustrative',basis:value===null?null:basis};
}
