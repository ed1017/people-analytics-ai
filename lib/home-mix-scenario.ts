/** Explicitly requested fictional staffing premises, never observed employee availability. */
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft, unknownAssumption, type Assumption, type BundleDraft, type BundleInputs, type StaffingFlow} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeMixPlanningRequest} from './home-mix-planning.ts';
import type {HomeMixBounds} from './home-mix-context';
export type HomeMixScenario={version:1;basis:Assumption<'conditional-scenario'>;bounds:HomeMixBounds;flows:StaffingFlow[]};
export const homeMixScenarioCommand='Use illustrative staffing assumptions';
const premise='Explicit fictional staffing scenario; not observed eligibility, available employees, approved release or a cost quote.';
const assumed=<T>(value:T,basis=premise):Assumption<T>=>({value,kind:'illustrative',basis});
const reviewed=(value:Assumption<unknown>)=>value.kind==='user-entered'||value.kind==='adopted';
export function withHomeMixScenario(original:BundleDraft):BundleInputs{
 const checked=readBundleDraft(original);if(!checked)throw Error('Review a valid Home draft first.');
 if(checked.inputs.capacity||checked.inputs.mixScenario)throw Error('This plan already has staffing mappings. Edit its displayed counts, limits, dates and costs; existing mappings are kept.');
 if(checked.inputs.whatIf?.kind!=='capacity'||checked.inputs.whatIf.capacityBasis!=='full-period-hire')throw Error('State the whole additional roles, full paid period and USD cost first. Fractional, phased or internal schedules need explicit review.');
 if(checked.inputs.groups.some(group=>reviewed(group.count))||checked.inputs.memberships.some(row=>reviewed(row.complete))||reviewed(checked.inputs.groupsDisjoint))throw Error('This plan has reviewed participant groups. Specify distinct Build and Move groups, their release limits and component ownership before adding internal paths; the existing groups are kept.');
 const local=checked.bundle.origin==='local-assumptions-v1';
 const owner=(domain:string)=>checked.bundle.components.filter(item=>item.domain===domain).map(item=>item.id);
 const hire=owner('hiring'),build=local?hire:owner('learning'),move=local?hire:owner('mobility');
 if(hire.length!==1||build.length!==1||move.length!==1)throw Error('Which existing components own Build, Move and Hire? One learning, mobility and hiring component, or the local capacity-review template, is needed for this fictional preset. No component or evidence mapping was invented.');
 const prepared=homeMixPlanningRequest(checked).request.draft,inputs=prepared.inputs,capacity=inputs.capacity;
 if(!capacity)throw Error('Confirm the current whole-role target, population, start month and horizon before adding staffing assumptions.');
 const roles=Number(capacity.input.roles),start=capacity.input.planningMonth,months=Number(capacity.input.months);
 const month=(offset:number)=>new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5))-1+Math.min(offset,months-1),1)).toISOString().slice(0,7);
 const maxBuild=Math.min(3,roles),maxMove=Math.min(2,roles);
 const groups=[{id:'scenario-build',label:'Fictional Build group',count:assumed(maxBuild)},{id:'scenario-move',label:'Fictional Move group',count:assumed(maxMove)}];
 if(inputs.groups.some(item=>groups.some(group=>group.id===item.id)))throw Error('Scenario group IDs already exist; review their mappings first.');
 inputs.groups.push(...groups);
 const flows:StaffingFlow[]=[{id:'scenario-build',path:'build',componentIds:build,groupId:'scenario-build'},{id:'scenario-move',path:'move',componentIds:move,groupId:'scenario-move'},{id:'scenario-buy',path:'buy',componentIds:hire,groupId:null}];
 inputs.mixScenario={version:1,basis:assumed('conditional-scenario'),flows,bounds:{build:assumed({min:0,max:maxBuild}),move:assumed({min:0,max:maxMove}),buy:assumed({min:0,max:roles})}};
 capacity.flows=flows.filter(flow=>flow.path==='buy');
 const fields={buildMonth:month(2),moveMonth:month(1),hireFee:'3000',internalAnnualCostChange:'24000',trainingCash:'6000',trainingHours:'80'};
 for(const [field,value] of Object.entries(fields)){const key=field as keyof typeof capacity.input;capacity.input[key]=value;capacity.origins[key]={kind:'illustrative',basis:premise};}
 capacity.origins.backfills={kind:'illustrative',basis:'Fictional zero-backfill and release premise only. Source-team capacity and permission to release people remain unverified.'};
 for(const component of checked.bundle.components){
  const extra=flows.filter(flow=>flow.groupId&&flow.componentIds.includes(component.id)).map(flow=>flow.groupId!);
  const membership=inputs.memberships.find(row=>row.componentId===component.id);
  if(membership){membership.groupIds=[...new Set([...membership.groupIds,...extra])];membership.complete=assumed(true);}
  else inputs.memberships.push({componentId:component.id,groupIds:extra,complete:assumed(true)});
 }
 inputs.groupsDisjoint=assumed(true,'Fictional groups are assumed distinct, including any pilot group. No employee membership or release availability has been verified.');
 if(!reviewed(inputs.dependenciesConfirmed))inputs.dependenciesConfirmed=assumed(true);
 if(!reviewed(inputs.costsDistinct))inputs.costsDistinct=assumed(true,'This fictional scenario assumes the listed incremental costs are distinct and exhaustive; review omitted obligations before any decision.');
 for(const row of inputs.costReviews)if(!reviewed(row.complete))row.complete=assumed(true,'Fictional completeness premise for the listed costs only; no quote, funding approval or operational verification.');
 for(const row of inputs.timing){if(row.start.value===null)row.start=assumed(start+'-01');if(row.finish.value===null)row.finish=assumed((build.includes(row.componentId)?month(2):move.includes(row.componentId)?month(1):start)+'-01');}
 const costs:{field:string;owners:string[]}[]=[{field:'hireStaffingCost',owners:hire},{field:'recruitingFees',owners:hire},{field:'internalSalaryUplift',owners:[...new Set([...build,...move])]},{field:'trainingCash',owners:build}];
 for(const {field,owners} of costs)if(!inputs.expenseLinks.some(link=>link.expenseId==='capacity:'+field))inputs.expenseLinks.push({expenseId:'capacity:'+field,componentIds:owners,allocations:null});
 inputs.scope.comparisonConfirmed=unknownAssumption();
 if(!readBundleDraft({...prepared,inputs}))throw Error('The fictional scenario exceeds the existing plan contract. Existing work is kept.');
 return inputs;
}
