/** Planning-only adaptation. Never creates workforce evidence, availability or a cost quote. */
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft, type BundleDraft, type Assumption, type CapacityMix} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {emptyWorkforcePlanInput, workforcePlanFields} from './workforce-increment.ts';
import type {HomeMixRequest, HomeMixObjective} from './home-mix-context';
export type HomeMixConstraints={maxAddedEmployees?:Assumption<number>;maxStaffHours?:Assumption<number>;deadlineMonth?:Assumption<string>;objective?:Assumption<HomeMixObjective>};
export const homeMixPlanningVersion='home-planning-source-v1';
const assumed=<T>(value:T,basis:string):Assumption<T>=>({value,kind:'illustrative',basis});
export function homeMixPlanningRequest(original:BundleDraft):{request:HomeMixRequest;notes:string[]}{
 const draft=readBundleDraft(original);if(!draft)throw Error('The current Home assumptions cannot be verified.');
 const request:HomeMixRequest={draft},notes:string[]=[];
 const controls=draft.inputs.mixConstraints;
 if(controls?.maxStaffHours)request.maxStaffHours=controls.maxStaffHours;
 if(controls?.objective?.value)request.objective=controls.objective.value;
 if(draft.inputs.capacity){
  for(const field of ['maxAddedEmployees','deadlineMonth'] as const)if(controls?.[field]){
   const value=controls[field];draft.inputs.capacity.input[field]=value.value===null?'':String(value.value);draft.inputs.capacity.origins[field]={kind:value.kind,basis:value.basis};
  }
  return {request,notes};
 }
 const scenario=draft.inputs.whatIf,scope=draft.inputs.scope;
 if(scenario?.kind!=='capacity')return {request,notes};
 // A full-period external-hire scenario already states this paid schedule. Partial/FTE/internal cases remain unresolved.
 if(scenario.capacityBasis!=='full-period-hire'||scenario.scopeKey!==JSON.stringify([scope.population.value,scope.startMonth.value,scope.months.value])||!scenario.target.value||!scope.startMonth.value||!scope.months.value)return {request,notes};
 const hiring=draft.bundle.components.filter(item=>item.domain==='hiring');
 if(!hiring.length)return {request,notes:['No hiring component is mapped; staffing search needs an explicit whole-flow mapping.']};
 const basis='Conditional full-period hiring scenario; planning assumption only, not verified workforce scope or a hiring commitment.';
 const start=scope.startMonth.value,months=scope.months.value,roles=scenario.target.value;
 const end=new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7))-1+months-1,1)).toISOString().slice(0,7);
 if(scope.capacityRequired.value===false||scope.demand.value!==null&&scope.demand.value!==roles)return {request,notes};
 if(scope.capacityRequired.value===null)scope.capacityRequired=assumed(true,basis);
 if(scope.demand.value===null)scope.demand=structuredClone(scenario.target);
 if(scope.businessUnit.value===null)scope.businessUnit=assumed('Hypothetical Home planning scope',basis);
 if(scope.jobProfile.value===null)scope.jobProfile=assumed('Additional whole positions for the pinned goal',basis);
 const input={...emptyWorkforcePlanInput(),businessUnit:scope.businessUnit.value!,jobProfile:scope.jobProfile.value!,intent:'additional',roles:String(roles),build:'0',move:'0',buy:String(roles),backfills:'0',planningMonth:start,months:String(months),arrivalMode:'explicit',arrivalDate:start+'-01',annualHireCost:scenario.unitCost.value===null?'':String(scenario.unitCost.value*12),budget:draft.inputs.budget?.amount.value==null?'':String(draft.inputs.budget.amount.value),maxAddedEmployees:controls?.maxAddedEmployees?controls.maxAddedEmployees.value===null?'':String(controls.maxAddedEmployees.value):String(roles),deadlineMonth:controls?.deadlineMonth?controls.deadlineMonth.value??'':end};
 const origins=Object.fromEntries(workforcePlanFields.map(field=>[field,input[field]?{kind:'illustrative',basis}:{kind:'unknown',basis:null}])) as CapacityMix['origins'];
 for(const [field,value] of [['roles',scenario.target],['annualHireCost',scenario.unitCost],['planningMonth',scope.startMonth],['months',scope.months],['businessUnit',scope.businessUnit],['jobProfile',scope.jobProfile],['maxAddedEmployees',controls?.maxAddedEmployees],['deadlineMonth',controls?.deadlineMonth],['budget',draft.inputs.budget?.amount]] as const)if(value)origins[field]={kind:value.kind,basis:field==='annualHireCost'&&value.basis?`${value.basis} Monthly USD assumption × 12; no FX.`:value.basis};
 draft.inputs.capacity={input,origins,flows:[{id:'home-assumed-buy',path:'buy',componentIds:hiring.map(item=>item.id),groupId:null}]};
 for(const field of ['hireStaffingCost','recruitingFees'])if(!draft.inputs.expenseLinks.some(link=>link.expenseId==='capacity:'+field))draft.inputs.expenseLinks.push({expenseId:'capacity:'+field,componentIds:hiring.map(item=>item.id),allocations:null});
 request.bounds={build:assumed({min:0,max:0},'Internal availability and group mappings are unresolved; Build excluded, not assumed impossible.'),move:assumed({min:0,max:0},'Internal availability and group mappings are unresolved; Move excluded, not assumed impossible.'),buy:assumed({min:roles,max:roles},'Evaluate the existing full-period external-hire scenario. No alternate internal availability is invented.')};
 notes.push('Starting search covers the existing full-period hiring scenario only. Build and Move remain outside these bounds until internal groups and whole-flow mappings are reviewed.','Paid arrival is assumed at the planning start. Monthly USD cost × 12 supplies the annual rate; recruiting fees remain unknown unless entered.','Business unit and job profile labels are hypothetical Home scope, not governed workforce mappings. The added-employee ceiling defaults to the stated roles and coverage deadline to the horizon end unless changed.');
 return {request,notes};
}
