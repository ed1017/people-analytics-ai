/** Explicit guide inputs adapted to the ordinary planning contract; never a text shortcut. */
import type {BundleDraft} from './home-bundle-reconciliation';
import type {BusinessPlanning} from './home-business-planning';
import type {DemandBasis, DemandContext, DemandQuantity} from './swp-demand';
import type {StaffingInputs,StaffingField} from './home-service-staffing';
// @ts-expect-error Native Node tests share application source.
import {createDemandReview,SWP_DEMAND_MODE} from './swp-demand.ts';
// @ts-expect-error Native Node tests share application source.
import {calculateServiceStaffing,staffingFields} from './home-service-staffing.ts';
// @ts-expect-error Native Node tests share application source.
import {validateGuidedWorkload} from './guided-workload.ts';
export function guidedBusinessPlanning(draft:BundleDraft,datasetToken:string):BusinessPlanning{
 const i=draft.inputs,w=i.guidedWorkload,c=i.capacity;
 if(!w||!c||!i.mixScenario)throw Error('Review explicit workload and staffing inputs.');
 validateGuidedWorkload(w);
 // The ordinary comparison currently models independent paths. Do not drop additional constraints.
 if(draft.bundle.components.some(x=>x.dependsOn.length)||i.mixConstraints||i.mixScenario.bounds.build.value?.min!==0||i.mixScenario.bounds.move.value?.min!==0||i.mixScenario.bounds.buy.value?.min!==0)throw Error('These extra dependency or search constraints need a separate review; they cannot be discarded by the shared adapter.');
 const scope=i.scope.population.value,turn={id:'guided-explicit-objective',text:draft.binding.goal};
 const assumed:DemandBasis={kind:'illustrative',turnId:null,quote:null,explanation:'Explicit reviewed scenario inputs; not workforce facts or operational approval.'};
 const basis=(value:unknown):DemandBasis=>value===null?{kind:'unknown',turnId:null,quote:null,explanation:'Not supplied.'}:assumed;
 const q=(value:number|null,period:DemandQuantity['period']=null):DemandQuantity=>({value,scope,period,basis:basis(value)});
 const context:DemandContext={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-guided',datasetToken,boundGoal:{id:draft.binding.goalId,statement:draft.binding.goal},revision:draft.revision};
 const review=createDemandReview({objective:turn.text,objectiveTurnId:turn.id,scope,scopeBasis:basis(scope),linkageBasis:assumed,startMonth:i.scope.startMonth.value,months:i.scope.months.value,startBasis:basis(i.scope.startMonth.value),monthsBasis:basis(i.scope.months.value),linkage:'Monthly service units multiplied by work hours per service unit; qualified allocation is separate from the internal pools.',contracts:q(w.volume.value),hoursPerContract:q(w.hoursPerUnit.value,'month'),productiveHoursPerFte:q(w.productiveHours.value,'month'),existingRoles:q(w.existingPeople.value),existingFtePerRole:q(w.ftePerPerson.value),availabilityPct:q(w.allocationPct.value===null||w.skillCoveragePct.value===null?null:w.allocationPct.value*w.skillCoveragePct.value/100),ftePerRole:q(1),explicitAdditionalRoles:q(null),budgetUsd:q(i.budget?.amount.value??null)},context,'guided-explicit-inputs',[turn]);
 if(i.mixScenario.bounds.buy.value===null||review.result.additionalRoles!==null&&i.mixScenario.bounds.buy.value.max<review.result.additionalRoles)throw Error('The reviewed hiring maximum is narrower than the ordinary comparison supports; it must not be discarded.');
 const value=(field:StaffingField):number|string|boolean|null=>{
  if(field==='buildMax'||field==='moveMax'){
   const path=field==='buildMax'?'build':'move',bound=i.mixScenario!.bounds[path].value,flow=i.mixScenario!.flows.find(f=>f.path===path),count=i.groups.find(g=>g.id===flow?.groupId)?.count.value;
   return bound&&count!=null?Math.min(bound.max,count):null;
  }
  if(field==='internalPoolsDistinct')return i.groupsDisjoint.value;
  if(field==='internalRelease')return c.origins.backfills.kind!=='unknown'&&c.input.backfills!==''?true:null;
  if(field==='costsCompleteAndDistinct')return i.costsDistinct.value===true&&i.costReviews.every(r=>r.complete.value===true)?true:null;
  const raw=c.input[field];return raw===''?null:field.endsWith('Month')||field.endsWith('Date')?raw:Number(raw);
 };
 const inputs:StaffingInputs={scope:scope!,startMonth:i.scope.startMonth.value!,basisTurns:[turn],values:Object.fromEntries(staffingFields.map(field=>{const v=value(field);return [field,{value:v,basis:basis(v)}];})) as StaffingInputs['values']};
 return {version:1,context,scopeKey:'explicit-guided-inputs',review,staffing:{inputs,result:calculateServiceStaffing(review,inputs)}};
}
