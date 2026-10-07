import type {HomeMixConstraints} from './home-mix-planning';
// @ts-expect-error Native Node tests share TypeScript source.
import {validAssumptionsOnlyBundle} from './home-assumptions-fallback.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validWhatIf,calculatePlanWhatIf,initialWhatIf,type PlanWhatIf} from './home-plan-what-if.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planDeliveryEstimate,type DeliveryEstimateInputs} from "./home-plan-delivery-estimate.ts";
import type {SuccessMeasure} from './home-success-measures';
// Local, aggregate planning arithmetic. No services, model calls or operational writes.
// @ts-expect-error Native Node tests share TypeScript source.
import {componentOrder,bundleSignature,bundleDomains,type SolutionBundle} from './home-solution-bundles.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {calculateWorkforceIncrement,workforcePlanFields,planDate,type WorkforcePlanInput} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey,validActionBinding,type ActionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {plain,exactKeys} from './home-action-proposal.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planCashEstimate,type PlanCashEstimate} from './home-plan-cash.ts';
import type {ScenarioOrigins} from './home-action-scenarios';

export const planCostPolicy='cash-hours-v2' as const;
export type PlanCostPolicy=typeof planCostPolicy|'cash-hours-v1';
export const bundleMethod='coordinated-bundle-v1' as const;
export type Assumption<T>={value:T|null;kind:'unknown'|'user-entered'|'illustrative'|'adopted';basis:string|null};
export const unknownAssumption=<T>():Assumption<T>=>({value:null,kind:'unknown',basis:null});
export type BundleScope={population:Assumption<string>;businessUnit:Assumption<string>;jobProfile:Assumption<string>;startMonth:Assumption<string>;months:Assumption<number>;demand:Assumption<number>;capacityRequired:Assumption<boolean>;requirements:Assumption<string>;comparisonConfirmed:Assumption<boolean>;currency:'USD'};
export type ComponentTiming={componentId:string;start:Assumption<string>;finish:Assumption<string>};
export type PopulationGroup={id:string;label:string;count:Assumption<number>};
export type PopulationMembership={componentId:string;groupIds:string[];complete:Assumption<boolean>};
export type StaffingFlow={id:string;path:'build'|'move'|'buy'|'backfills';componentIds:string[];groupId:string|null};
export type CapacityMix={input:WorkforcePlanInput;origins:ScenarioOrigins;flows:StaffingFlow[]};
export type ExpenseAllocation={componentId:string;percent:number};
export type ExpenseLink={expenseId:string;componentIds:string[];allocations:ExpenseAllocation[]|null};
export type ManualExpense={id:string;label:string;kind:'cash'|'employee_time';amount:Assumption<number>;startMonth:Assumption<string>;months:Assumption<number>};
export type ComponentCostReview={componentId:string;complete:Assumption<boolean>};
export type PlanBudget={amount:Assumption<number>;basis:Assumption<'cash'|'all-in'>};
export type BudgetCheck={limit:number|null;basis:'cash'|'all-in'|null;cash:number|null;employeeTime:number|null;comparedCost:number|null;headroom:number|null;status:'within'|'over'|'unknown';assumed:boolean};
export type BundleInputs={mixConstraints?:HomeMixConstraints;costPolicy?:PlanCostPolicy;budget?:PlanBudget;deliveryEstimate?:DeliveryEstimateInputs;whatIf?:PlanWhatIf;successMeasure?:SuccessMeasure;scope:BundleScope;capacity:CapacityMix|null;timing:ComponentTiming[];dependenciesConfirmed:Assumption<boolean>;groups:PopulationGroup[];memberships:PopulationMembership[];groupsDisjoint:Assumption<boolean>;expenses:ManualExpense[];expenseLinks:ExpenseLink[];costReviews:ComponentCostReview[];costsDistinct:Assumption<boolean>};
export type BundleDraft={pilot?:{version:'illustrative-pilot-v1';preparedAt:string;timezone:'UTC'};version:1;status:'proposal';binding:ActionBinding;bundle:SolutionBundle;signature:string;revision:number;inputs:BundleInputs};
export type LedgerLine={id:string;label:string;kind:'cash'|'employee_time';monthly:(number|null)[];total:number|null;componentIds:string[];allocations:ExpenseAllocation[]|null};
export type BundleResult={cashEstimate?:PlanCashEstimate;costPolicy?:PlanCostPolicy;budget?:BudgetCheck;deliveryEstimate?:ReturnType<typeof planDeliveryEstimate>;whatIf?:ReturnType<typeof calculatePlanWhatIf>;method:typeof bundleMethod;revision:number;signature:string;bindingKey:string;scope:BundleScope;ledger:LedgerLine[];knownCashSubtotal:number|null;cashTotal:number|null;knownEmployeeTimeSubtotal:number|null;employeeTimeTotal:number|null;componentCash:Record<string,number|null>;uniqueParticipants:number|null;componentReady:Record<string,string|null>;planFinish:string|null;capacityReadyMonth:string|null;conditionalCoverage:(number|null)[]|null;plannedAddedEmployees:number|null;issues:string[];limitations:string[];inputKey:string};
function fail(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message)}
const bounded=(value:unknown,max=240):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=max;
const identifier=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value);
const cents=(value:number)=>{fail(Number.isFinite(value)&&Number.isSafeInteger(Math.round(value*100)),'Budget exceeds supported precision.');return Math.round((value+Number.EPSILON)*100)/100};
const sum=(values:(number|null)[])=>values.some(value=>value===null)?null:cents((values as number[]).reduce((total,value)=>total+value,0));
function allocatedCents(total:number,ids:string[],allocations:ExpenseAllocation[]):Record<string,number>{
 const pennies=Math.round(total*100),shares=ids.map(id=>{const raw=pennies*allocations.find(item=>item.componentId===id)!.percent/100;return {id,whole:Math.floor(raw),fraction:raw-Math.floor(raw)}});
 let remaining=pennies-shares.reduce((count,item)=>count+item.whole,0);
 for(const share of [...shares].sort((a,b)=>b.fraction-a.fraction||a.id.localeCompare(b.id))){if(remaining<=0)break;share.whole++;remaining--;}
 fail(remaining===0,'Expense allocation could not reconcile supported precision.');return Object.fromEntries(shares.map(item=>[item.id,item.whole/100]));
}
function assumption<T>(raw:Assumption<T>,valid:(value:unknown)=>boolean):void{
 const value=plain(raw);fail(value&&exactKeys(value,['value','kind','basis']),'Unsupported assumption record.');
 fail(['unknown','user-entered','illustrative','adopted'].includes(String(value.kind)),'Unknown assumption provenance.');
 fail(value.value===null?value.kind==='unknown'&&value.basis===null:value.kind!=='unknown'&&bounded(value.basis)&&valid(value.value),'Supply a reviewed value and its basis, or leave it Unknown.');
}
const numeric=(raw:Assumption<number>,max:number,whole=false,min=0)=>assumption(raw,value=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max&&(!whole||Number.isInteger(value)));
const bool=(raw:Assumption<boolean>)=>assumption(raw,value=>typeof value==='boolean');
const monthIndex=(value:string)=>{fail(/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&planDate(value+'-01')!==null,'Use a valid planning month.');return Number(value.slice(0,4))*12+Number(value.slice(5))-1};
const monthName=(value:number)=>`${Math.floor(value/12)}-${String(value%12+1).padStart(2,'0')}`;
export const bundleInputKey=(draft:BundleDraft)=>JSON.stringify([actionBindingKey(draft.binding),draft.signature,draft.revision,draft.inputs]);
export function emptyBundleInputs(bundle:SolutionBundle):BundleInputs{
 return {costPolicy:planCostPolicy,scope:{population:unknownAssumption(),businessUnit:unknownAssumption(),jobProfile:unknownAssumption(),startMonth:unknownAssumption(),months:unknownAssumption(),demand:unknownAssumption(),capacityRequired:unknownAssumption(),requirements:unknownAssumption(),comparisonConfirmed:unknownAssumption(),currency:'USD'},capacity:null,timing:bundle.components.map(component=>({componentId:component.id,start:unknownAssumption(),finish:unknownAssumption()})),dependenciesConfirmed:unknownAssumption(),groups:[],memberships:[],groupsDisjoint:unknownAssumption(),expenses:[],expenseLinks:[],costReviews:bundle.components.map(component=>({componentId:component.id,complete:unknownAssumption()})),costsDistinct:unknownAssumption()};
}
export function createBundleDraft(bundle:SolutionBundle,binding:ActionBinding):BundleDraft{
 fail(validActionBinding(binding),'Invalid exact goal/evidence binding.');componentOrder(bundle.components);
 return {version:1,status:'proposal',binding:structuredClone(binding),bundle:structuredClone(bundle),signature:bundleSignature(bundle),revision:1,inputs:emptyBundleInputs(bundle)};
}
function validateDraft(draft:BundleDraft){
 fail(validateJson(draft)&&new TextEncoder().encode(JSON.stringify(draft)).length<=65536,'Bundle draft exceeds the bounded local contract.');
 fail(exactKeys(draft as unknown as Record<string,unknown>,['version','status','binding','bundle','signature','revision','inputs',...(draft.pilot?['pilot']:[])])&&draft.version===1&&draft.status==='proposal'&&validActionBinding(draft.binding)&&draft.signature===bundleSignature(draft.bundle)&&Number.isSafeInteger(draft.revision)&&draft.revision>=1&&draft.revision<=100000,'Invalid bundle identity or revision.');
 if(draft.pilot)fail(exactKeys(draft.pilot as unknown as Record<string,unknown>,['version','preparedAt','timezone'])&&draft.pilot.version==='illustrative-pilot-v1'&&draft.pilot.timezone==='UTC'&&typeof draft.pilot.preparedAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(draft.pilot.preparedAt)&&Number.isFinite(Date.parse(draft.pilot.preparedAt)),'Invalid frozen illustrative preset.');
 const bundle=draft.bundle,local=validAssumptionsOnlyBundle(draft.bundle,draft.binding.goal);
 fail(bundle.origin===undefined||local,'Only the exact local assumptions-only template may omit evidence.');
 fail(exactKeys(bundle as unknown as Record<string,unknown>,['id','name','objective','coordination','components','limitation',...(local?['origin']:[])])&&['A','B','C'].includes(bundle.id)&&bounded(bundle.name,80)&&bounded(bundle.objective,160)&&bounded(bundle.coordination)&&bounded(bundle.limitation),'Invalid saved bundle structure.');
 for(const item of bundle.components)fail(exactKeys(item as unknown as Record<string,unknown>,['id','name','domain','firstStep','evidence','ownerRole','dependsOn','limitation'])&&/^c[1-6]$/.test(item.id)&&bounded(item.name,80)&&bundleDomains.includes(item.domain)&&bounded(item.firstStep,360)&&bounded(item.ownerRole,80)&&bounded(item.limitation,200)&&Array.isArray(item.evidence)&&(local?item.evidence.length===0:item.evidence.length>0)&&item.evidence.length<=3&&new Set(item.evidence).size===item.evidence.length&&item.evidence.every(id=>bounded(id,100)),'Invalid saved component structure.');
 const order=componentOrder(draft.bundle.components),ids=new Set(order),input=draft.inputs,scope=input.scope;
 fail(exactKeys(input as unknown as Record<string,unknown>,[...(input.costPolicy!==undefined?['costPolicy']:[]),'scope','capacity','timing','dependenciesConfirmed','groups','memberships','groupsDisjoint','expenses','expenseLinks','costReviews','costsDistinct',...(input.budget!==undefined?['budget']:[]),...(input.deliveryEstimate!==undefined?['deliveryEstimate']:[]),...(input.successMeasure!==undefined?['successMeasure']:[]),...(input.whatIf!==undefined?['whatIf']:[]),...(input.mixConstraints!==undefined?['mixConstraints']:[])]),'Unsupported bundle inputs.');
 if(input.mixConstraints!==undefined){const c=input.mixConstraints;fail(plain(c)&&Object.keys(c).length>0&&Object.keys(c).every(key=>['maxAddedEmployees','maxStaffHours','deadlineMonth','objective'].includes(key)),'Invalid Home search constraints.');if(Object.hasOwn(c,'maxAddedEmployees'))numeric(c.maxAddedEmployees!,2000,true);if(Object.hasOwn(c,'maxStaffHours'))numeric(c.maxStaffHours!,100000000);if(Object.hasOwn(c,'deadlineMonth'))assumption(c.deadlineMonth!,value=>typeof value==='string'&&Number.isFinite(monthIndex(value)));if(Object.hasOwn(c,'objective'))assumption(c.objective!,value=>['lowest-complete-cash','earliest-coverage','lowest-staff-hours','fewest-added-employees'].includes(String(value)));}
 if(input.costPolicy!==undefined)fail((input.costPolicy===planCostPolicy||input.costPolicy==='cash-hours-v1'),'Unsupported Action Plan cost policy.');
 if(input.budget!==undefined){const budget=input.budget;fail(plain(budget)&&exactKeys(budget as unknown as Record<string,unknown>,['amount','basis']),'Invalid budget constraint.');numeric(budget.amount,1000000000);assumption(budget.basis,value=>value==='cash'||value==='all-in');}
 if(input.deliveryEstimate!==undefined){const e=input.deliveryEstimate;fail(plain(e)&&exactKeys(e as unknown as Record<string,unknown>,['hoursPerParticipant','coordinationHours','hourlyRate','acceptance']),'Invalid delivery estimate.');numeric(e.hoursPerParticipant,1000);numeric(e.coordinationHours,1000000);numeric(e.hourlyRate,100000);assumption(e.acceptance,value=>bounded(value));}
 if(input.whatIf!==undefined)fail(validWhatIf(input.whatIf,draft.binding.goal),'Review a supported what-if with valid units and assumptions.');
 if(input.successMeasure!==undefined){const measure=input.successMeasure;fail(plain(measure)&&exactKeys(measure as unknown as Record<string,unknown>,['goal','scopeKey','name','baseline','target'])&&measure.goal===draft.binding.goal&&bounded(measure.scopeKey,1000)&&bounded(measure.name),'Review the measure for this exact goal.');assumption(measure.baseline,value=>bounded(value));assumption(measure.target,value=>bounded(value));fail(measure.target.kind!=='adopted','Targets are user or illustrative assumptions, not observed outcomes.');}
 fail(exactKeys(scope as unknown as Record<string,unknown>,['population','businessUnit','jobProfile','startMonth','months','demand','capacityRequired','requirements','comparisonConfirmed','currency'])&&scope.currency==='USD','Use the supported shared USD scope.');
 for(const key of ['population','businessUnit','jobProfile','requirements'] as const)assumption(scope[key],value=>bounded(value));
 assumption(scope.startMonth,value=>typeof value==='string'&&Number.isFinite(monthIndex(value)));numeric(scope.months,24,true,1);numeric(scope.demand,1000,true,1);bool(scope.comparisonConfirmed);bool(scope.capacityRequired);
 bool(input.dependenciesConfirmed);bool(input.groupsDisjoint);bool(input.costsDistinct);
 const unique=(items:{id:string}[],max:number)=>items.length<=max&&new Set(items.map(item=>item.id)).size===items.length&&items.every(item=>identifier(item.id));
 fail(Array.isArray(input.timing)&&input.timing.length===ids.size&&new Set(input.timing.map(item=>item.componentId)).size===ids.size,'Review timing for each component once.');
 for(const item of input.timing){fail(exactKeys(item as unknown as Record<string,unknown>,['componentId','start','finish'])&&ids.has(item.componentId),'Unknown timing component.');for(const value of [item.start,item.finish])assumption(value,date=>typeof date==='string'&&planDate(date)!==null);}
 fail(Array.isArray(input.groups)&&unique(input.groups,12),'Use at most twelve distinct aggregate population groups.');
 for(const group of input.groups){fail(exactKeys(group as unknown as Record<string,unknown>,['id','label','count'])&&bounded(group.label),'Invalid population group.');numeric(group.count,1000000,true);}
 const groups=new Set(input.groups.map(item=>item.id));
 fail(Array.isArray(input.memberships)&&input.memberships.length<=6&&new Set(input.memberships.map(item=>item.componentId)).size===input.memberships.length,'Review each component population once.');
 for(const membership of input.memberships){fail(exactKeys(membership as unknown as Record<string,unknown>,['componentId','groupIds','complete'])&&ids.has(membership.componentId)&&Array.isArray(membership.groupIds)&&membership.groupIds.length<=12&&new Set(membership.groupIds).size===membership.groupIds.length&&membership.groupIds.every(id=>groups.has(id)),'Unknown or repeated aggregate population reference.');bool(membership.complete);}
 fail(Array.isArray(input.expenses)&&unique(input.expenses,24),'Use at most twenty-four uniquely identified expenses.');
 for(const expense of input.expenses){fail(exactKeys(expense as unknown as Record<string,unknown>,['id','label','kind','amount','startMonth','months'])&&bounded(expense.label)&&['cash','employee_time'].includes(expense.kind),'Invalid local expense.');numeric(expense.amount,1000000000);numeric(expense.months,24,true,1);assumption(expense.startMonth,value=>typeof value==='string'&&Number.isFinite(monthIndex(value)));}
 fail(Array.isArray(input.expenseLinks)&&input.expenseLinks.length<=31&&new Set(input.expenseLinks.map(item=>item.expenseId)).size===input.expenseLinks.length,'Link each expense once, sharing it across components where needed.');
 for(const link of input.expenseLinks){
  fail(exactKeys(link as unknown as Record<string,unknown>,['expenseId','componentIds','allocations'])&&bounded(link.expenseId,100)&&Array.isArray(link.componentIds)&&link.componentIds.length>0&&link.componentIds.length<=6&&new Set(link.componentIds).size===link.componentIds.length&&link.componentIds.every(id=>ids.has(id)),'Invalid expense ownership.');
  if(link.allocations!==null){fail(Array.isArray(link.allocations)&&link.allocations.length===link.componentIds.length&&new Set(link.allocations.map(item=>item.componentId)).size===link.allocations.length,'Allocate to each linked component once.');for(const item of link.allocations)fail(exactKeys(item as unknown as Record<string,unknown>,['componentId','percent'])&&link.componentIds.includes(item.componentId)&&typeof item.percent==='number'&&Number.isFinite(item.percent)&&item.percent>=0&&item.percent<=100&&Math.abs(item.percent*100-Math.round(item.percent*100))<1e-6,'Use allocation percentages with at most two decimals.');fail(link.allocations.reduce((total,item)=>total+Math.round(item.percent*100),0)===10000,'Shared expense allocations must total 100%.');}
 }
 fail(Array.isArray(input.costReviews)&&input.costReviews.length===ids.size&&new Set(input.costReviews.map(item=>item.componentId)).size===ids.size,'Review costs for each component once.');
 for(const item of input.costReviews){fail(exactKeys(item as unknown as Record<string,unknown>,['componentId','complete'])&&ids.has(item.componentId),'Unknown component cost review.');bool(item.complete);}
 if(input.capacity){
  const capacity=input.capacity;fail(exactKeys(capacity as unknown as Record<string,unknown>,['input','origins','flows'])&&exactKeys(capacity.origins, [...workforcePlanFields]),'Unsupported capacity review.');
  for(const field of workforcePlanFields){const origin=capacity.origins[field];fail(plain(origin)&&exactKeys(origin,['kind','basis']),'Invalid capacity assumption origin.');assumption({value:capacity.input[field]?.trim()?capacity.input[field]:null,...origin},value=>typeof value==='string'&&value.length<=100);}
  fail(Array.isArray(capacity.flows)&&unique(capacity.flows,4)&&new Set(capacity.flows.map(item=>item.path)).size===capacity.flows.length,'A staffing transition must occur once, with one flow per path.');
  for(const flow of capacity.flows)fail(exactKeys(flow as unknown as Record<string,unknown>,['id','path','componentIds','groupId'])&&['build','move','buy','backfills'].includes(flow.path)&&Array.isArray(flow.componentIds)&&flow.componentIds.length>0&&flow.componentIds.length<=6&&new Set(flow.componentIds).size===flow.componentIds.length&&flow.componentIds.every(id=>ids.has(id))&&(flow.groupId===null||groups.has(flow.groupId)),'Invalid staffing flow or aggregate population reference.');
 }
 return order;
}
/** Stored references retain their original binding; this does not relabel them as current evidence. */
export function readBundleDraft(raw:unknown):BundleDraft|null{
 try{validateDraft(raw as BundleDraft);return structuredClone(raw) as BundleDraft}catch{return null}
}
/** A new working revision uses cash costs and staff hours. Old snapshots replay unchanged. */
export function cashHoursInputs(inputs:BundleInputs,goal?:string):BundleInputs{
 const next=structuredClone(inputs);next.costPolicy=planCostPolicy;
 if(inputs.costPolicy!==planCostPolicy&&next.whatIf?.kind==='capacity'&&goal){
  const parsed=initialWhatIf(goal,next);
  if(parsed){
   if(next.whatIf.target.kind==='illustrative')next.whatIf.target=parsed.target;
   if(next.whatIf.unitCost.kind==='illustrative'||next.whatIf.unitCost.basis?.includes('pinned goal'))next.whatIf.unitCost=parsed.unitCost;
   next.whatIf.capacityBasis=parsed.capacityBasis;
  }
 }
 if(next.budget?.basis.value==='all-in')next.budget.basis={value:'cash',kind:'adopted',basis:'Action Plan cash budget; staff effort is tracked in hours without a monetary value.'};
 return next;
}
export function reviseBundleDraft(draft:BundleDraft,inputs:BundleInputs,legacyReplay:boolean|'cash-hours-v1'=false):BundleDraft{
 validateDraft(draft);fail(draft.revision<100000,'Bundle revision limit reached; previous work is kept.');
 const next={...structuredClone(draft),revision:draft.revision+1,inputs:legacyReplay?structuredClone(inputs):cashHoursInputs(inputs,draft.binding.goal)};validateDraft(next);return next;
}
/** Keep entered values when editing the plan, but require renewed cost/dependency alignment. */
export function reviseBundleProposal(draft:BundleDraft,bundle:SolutionBundle):BundleDraft{
 validateDraft(draft);fail(draft.revision<100000&&draft.bundle.id===bundle.id,'Preserve bundle identity when revising a proposal.');
 fail(JSON.stringify(draft.bundle.components.map(item=>item.id).sort())===JSON.stringify(bundle.components.map(item=>item.id).sort()),'Adding or removing components requires explicit assumption reconciliation; existing work is kept.');
 const next=structuredClone(draft);next.bundle=structuredClone(bundle);next.signature=bundleSignature(bundle);next.revision++;
 next.inputs.dependenciesConfirmed=unknownAssumption();next.inputs.costsDistinct=unknownAssumption();next.inputs.scope.comparisonConfirmed=unknownAssumption();
 next.inputs.costReviews=next.inputs.costReviews.map(item=>({...item,complete:unknownAssumption()}));
 validateDraft(next);return next;
}
export function reconcileBundle(draft:BundleDraft):BundleResult{
 const order=validateDraft(draft),input=draft.inputs,scope=input.scope,cashHours=!!input.costPolicy,issues:string[]=[];
 if(input.whatIf&&calculatePlanWhatIf(input)?.status!=='ready')issues.push('Conditional what-if needs current scope and complete assumptions.');
 if(input.successMeasure&&input.successMeasure.scopeKey!==JSON.stringify([scope.population.value,scope.startMonth.value,scope.months.value]))issues.push('Success measure population or horizon changed; review the baseline and target again.');
 fail(scope.population.value&&scope.startMonth.value&&scope.months.value,'Confirm the aggregate population and shared planning horizon.');
 const start=monthIndex(scope.startMonth.value),months=scope.months.value,end=monthName(start+months),componentReady:Record<string,string|null>={};
 const timings=new Map(input.timing.map(item=>[item.componentId,item]));
 for(const id of order){
  const component=draft.bundle.components.find(item=>item.id===id)!,timing=timings.get(id)!;
  if(timing.start.value&&timing.finish.value)fail(timing.start.value<=timing.finish.value,'Component finish cannot precede its start.');
  for(const date of [timing.start.value,timing.finish.value])if(date)fail(date>=scope.startMonth.value+'-01'&&date<end+'-01','Component dates must fit the shared horizon.');
  const predecessors=component.dependsOn.map(dependency=>componentReady[dependency]);
  for(const predecessor of component.dependsOn){const finish=timings.get(predecessor)!.finish.value;if(finish&&timing.start.value)fail(timing.start.value>=finish,'A component cannot start before its prerequisite finishes.');}
  componentReady[id]=input.dependenciesConfirmed.value===true&&timing.start.value&&timing.finish.value&&predecessors.every(date=>date!==null)?timing.finish.value:null;
  if(componentReady[id]===null)issues.push(`Timing/readiness is unresolved for ${component.name}.`);
 }
 const readyDates=Object.values(componentReady),planFinish=readyDates.every(date=>date!==null)?(readyDates as string[]).sort().at(-1)!:null;
 const groupById=new Map(input.groups.map(item=>[item.id,item])),usedGroups=new Set(input.memberships.flatMap(item=>item.groupIds));
 let uniqueParticipants:number|null=null;
 const populationsReviewed=input.memberships.length===order.length&&input.memberships.every(item=>item.complete.value===true);
 if(populationsReviewed&&(usedGroups.size<=1||input.groupsDisjoint.value===true))uniqueParticipants=sum([...usedGroups].map(id=>groupById.get(id)!.count.value));
 if(uniqueParticipants===null)issues.push('Unique participants are unknown until population coverage, counts and overlaps are reviewed.');
 const ledger:LedgerLine[]=[],coverage:(number|null)[]=[];let plannedAddedEmployees:number|null=null;
 const capacity=input.capacity;
 if(capacity){
  fail(scope.capacityRequired.value===true,'Confirm that this bundle requires additional role capacity.');
  fail(scope.businessUnit.value===capacity.input.businessUnit&&scope.jobProfile.value===capacity.input.jobProfile&&scope.startMonth.value===capacity.input.planningMonth&&scope.months.value===Number(capacity.input.months)&&scope.demand.value===Number(capacity.input.roles),'Capacity assumptions must match the bundle’s shared scope, demand and horizon.');
  fail(capacity.input.arrivalMode!=='historical-median','Use an explicit timing assumption; this local bundle does not fetch recruiting evidence.');
  const calculated=calculateWorkforceIncrement(capacity.input,null),paths=['build','move','buy','backfills'] as const;
  for(const path of paths){const count=path==='backfills'&&Number(capacity.input.build)+Number(capacity.input.move)===0?0:Number(capacity.input[path]);fail(count===0?!capacity.flows.some(flow=>flow.path===path):capacity.flows.some(flow=>flow.path===path),'Map each active staffing path exactly once; inactive paths have no flow.');}
  const internal=capacity.flows.filter(flow=>flow.path==='build'||flow.path==='move');
  fail(internal.every(flow=>flow.groupId!==null),'Internal transitions need an explicit aggregate source group.');
  fail(new Set(internal.map(flow=>flow.groupId)).size===internal.length,'Do not allocate the same internal group to both development and moves; use one transition or reviewed disjoint groups.');
  const internalOverlapUnknown=internal.length>1&&input.groupsDisjoint.value!==true;
  if(internalOverlapUnknown)issues.push('Internal transition overlap is unresolved; combined capacity and complete budget remain Unknown.');
  for(const flow of internal){const available=groupById.get(flow.groupId!)!.count.value;if(available!==null)fail(Number(capacity.input[flow.path])<=available,'Planned internal transitions exceed their reviewed aggregate group count.');}
  const costs=[['hireStaffingCost','External hire staffing','cash'],['backfillStaffingCost','Backfill staffing','cash'],['internalSalaryUplift','Internal salary uplift','cash'],['recruitingFees','Recruiting fees','cash'],['trainingCash','Training cash','cash'],['employeeTimeValue','Employee time value','employee_time']] as const;
  for(const [field,label,kind] of costs){if(cashHours&&kind==='employee_time')continue;const monthly=calculated.rows.map(row=>row[field]);ledger.push({id:`capacity:${field}`,label,kind,monthly,total:sum(monthly),componentIds:[],allocations:null});}
  const pathDate=(path:StaffingFlow['path'])=>path==='buy'?calculated.arrivalDate:path==='backfills'?calculated.backfillArrival:capacity.input[path==='build'?'buildMonth':'moveMonth']?capacity.input[path==='build'?'buildMonth':'moveMonth']+'-01':null;
  const readiness=capacity.flows.filter(flow=>flow.path!=='backfills').map(flow=>{const arrival=pathDate(flow.path),prerequisites=flow.componentIds.map(id=>componentReady[id]);return {count:Number(capacity.input[flow.path]),date:arrival&&prerequisites.every(date=>date!==null)?[arrival,...prerequisites as string[]].sort().at(-1)!:null};});
  for(let index=0;index<months;index++){const month=monthName(start+index);coverage.push(internalOverlapUnknown?null:sum(readiness.map(flow=>flow.date===null?null:flow.date.slice(0,7)<=month?flow.count:0)));}
  plannedAddedEmployees=calculated.maxAddedEmployees;
  if(internalOverlapUnknown)issues.push('budget: unresolved staffing overlap');
 }
 for(const expense of input.expenses){
  if(cashHours&&expense.kind==='employee_time')continue;
  const first=expense.startMonth.value===null?null:monthIndex(expense.startMonth.value),duration=expense.months.value;
  if(first!==null)fail(first>=start&&first<start+months,'Expense start must be in the shared horizon.');if(first!==null&&duration!==null)fail(first+duration<=start+months,'Expense duration must fit the shared horizon.');
  const monthly=Array.from({length:months},(_,index)=>first===null||duration===null?null:index+start>=first&&index+start<first+duration?expense.amount.value:0);
  ledger.push({id:expense.id,label:expense.label,kind:expense.kind,monthly,total:sum(monthly),componentIds:[],allocations:null});
 }
 for(const link of input.expenseLinks){if(cashHours&&(link.expenseId==='capacity:employeeTimeValue'||input.expenses.some(expense=>expense.id===link.expenseId&&expense.kind==='employee_time')))continue;const line=ledger.find(item=>item.id===link.expenseId);fail(line,'Expense link refers to an unavailable cost source.');line.componentIds=[...link.componentIds];line.allocations=structuredClone(link.allocations);}
 const capacityUnreviewed=scope.capacityRequired.value===null||scope.capacityRequired.value===true&&!capacity||input.costPolicy===planCostPolicy&&!capacity&&input.whatIf?.kind==='capacity';
 if(capacityUnreviewed)issues.push('Confirm whether additional capacity is required and review its mix before a complete budget.');
 const overlapUnresolved=input.costsDistinct.value!==true||issues.some(issue=>issue.startsWith('budget:'));
 const incompleteCosts=capacityUnreviewed||input.costReviews.some(item=>item.complete.value!==true)||overlapUnresolved||ledger.some(line=>line.total!==0&&line.componentIds.length===0);
 if(incompleteCosts)issues.push('Complete budget is Unknown: review each component’s costs, shared sources and distinct additional expenses.');
 const cash=ledger.filter(line=>line.kind==='cash'),time=ledger.filter(line=>line.kind==='employee_time'),cashTotal=incompleteCosts?null:sum(cash.map(line=>line.total)),employeeTimeTotal=cashHours||incompleteCosts?null:sum(time.map(line=>line.total));
 const componentCash:Record<string,number|null>=Object.fromEntries(order.map(id=>[id,input.costReviews.find(item=>item.componentId===id)!.complete.value===true?0:null]));
 for(const line of cash){
  // Largest-remainder pennies preserve the total without negative tiny final shares.
  const allocated=line.total!==null&&line.allocations?allocatedCents(line.total,line.componentIds,line.allocations):null;
  for(const id of line.componentIds){
   const share=line.total===null?null:allocated?allocated[id]:line.componentIds.length===1?line.total:null;
   componentCash[id]=componentCash[id]===null||share===null?null:cents(componentCash[id]+share);
  }
 }
 if(overlapUnresolved)for(const id of order)componentCash[id]=null;
 const cashUnknown=cash.some(line=>line.total===null);if(cashUnknown)issues.push('Some cash amounts or funding dates remain Unknown.');
 const capacityReadyMonth=capacity&&scope.demand.value!==null?coverage.findIndex(value=>value!==null&&value>=scope.demand.value!):-1;
 const delivery=planDeliveryEstimate(draft),budget=input.budget;
 const cashEstimate=input.costPolicy===planCostPolicy?planCashEstimate(draft,cashTotal):null;
 const budgetCash=cashEstimate?cashEstimate.cash:cashTotal??delivery?.cash??null,budgetTime=cashHours?null:time.length?employeeTimeTotal:delivery?.employeeTime??null;
 const comparedCost=cashHours&&budget?budgetCash:budget?.basis.value==='cash'?budgetCash:budget?.basis.value==='all-in'&&budgetCash!==null&&budgetTime!==null?cents(budgetCash+budgetTime):null;
 const balance=budget?.amount.value!=null&&comparedCost!==null?cents(budget.amount.value-comparedCost):null;
 const headroom=cashEstimate&&cashEstimate.coverage!=='reviewed'&&balance!==null&&balance>=0?null:balance;
 const budgetCheck:BudgetCheck|undefined=budget?{limit:budget.amount.value,basis:cashHours?'cash':budget.basis.value,cash:budgetCash,employeeTime:budgetTime,comparedCost,headroom,status:headroom===null?'unknown':headroom<0?'over':'within',assumed:cashTotal===null||budget.basis.kind==='illustrative'}:undefined;
 return {...(cashEstimate?{cashEstimate}:{}),...(cashHours?{costPolicy:input.costPolicy}:{}),...(budgetCheck?{budget:budgetCheck}:{}),...(input.deliveryEstimate?{deliveryEstimate:planDeliveryEstimate(draft)}:{}),...(input.whatIf?{whatIf:calculatePlanWhatIf(input)}:{}),method:bundleMethod,revision:draft.revision,signature:draft.signature,bindingKey:actionBindingKey(draft.binding),scope:structuredClone(scope),ledger,knownCashSubtotal:overlapUnresolved?null:cents(cash.reduce((total,line)=>total+(line.total??0),0)),cashTotal,knownEmployeeTimeSubtotal:cashHours||overlapUnresolved?null:cents(time.reduce((total,line)=>total+(line.total??0),0)),employeeTimeTotal,componentCash,uniqueParticipants,componentReady,planFinish,capacityReadyMonth:capacityReadyMonth>=0?monthName(start+capacityReadyMonth):null,conditionalCoverage:capacity?coverage:null,plannedAddedEmployees,issues,limitations:['All values are reviewed planning assumptions, not causal estimates or operational approvals.','No retention effects, avoided exits, savings or ROI are summed into this bundle.','Internal transitions do not add company employees; availability and source-team impact remain unverified.',cashHours?'Cash costs exclude employee-time valuation; staff effort is tracked in hours. Existing payroll and structural budgets are not added.':'Cash and employee time are separate; existing payroll and structural budgets are not added.','Unique participants covers explicitly reviewed component groups only; it is not company headcount.','Dependency-gated coverage is conditional and may be later than a paid hire arrival; unknown prerequisites keep readiness Unknown.'],inputKey:bundleInputKey(draft)};
}
export function compareBundleDrafts(leftDraft:BundleDraft,rightDraft:BundleDraft){
 const left=reconcileBundle(leftDraft),right=reconcileBundle(rightDraft);
 return compareCurrentBundleResults(left,right,leftDraft,rightDraft);
}
/** Compare only explicitly calculated current snapshots; do not calculate during rendering. */
export function compareCurrentBundleResults(left:BundleResult,right:BundleResult,leftDraft:BundleDraft,rightDraft:BundleDraft){
 const keys=['population','businessUnit','jobProfile','startMonth','months','demand','capacityRequired','requirements'] as const;
 const scenarioKey=(draft:BundleDraft)=>{const s=draft.inputs.whatIf;return s?JSON.stringify([s.kind,s.baseline.value,s.target.value,s.population.value,s.ratePeriod??null,s.capacityBasis??null]):null;};
 const matched=scenarioKey(leftDraft)===scenarioKey(rightDraft)&&JSON.stringify(leftDraft.inputs.successMeasure??null)===JSON.stringify(rightDraft.inputs.successMeasure??null)&&left.inputKey===bundleInputKey(leftDraft)&&right.inputKey===bundleInputKey(rightDraft)&&left.bindingKey===right.bindingKey&&left.scope.currency===right.scope.currency&&left.scope.comparisonConfirmed.value===true&&right.scope.comparisonConfirmed.value===true&&left.scope.requirements.value!==null&&keys.every(key=>JSON.stringify(left.scope[key].value)===JSON.stringify(right.scope[key].value));
 if(!matched)return {comparable:false,cashDifference:null,capacityMonthsDifference:null,reason:'Confirm matching goal, evidence, target scope, requirements and horizon before comparing.'};
 return {comparable:true,cashDifference:left.cashTotal===null||right.cashTotal===null?null:cents(left.cashTotal-right.cashTotal),capacityMonthsDifference:left.capacityReadyMonth&&right.capacityReadyMonth?monthIndex(left.capacityReadyMonth)-monthIndex(right.capacityReadyMonth):null,reason:'Differences are conditional on reviewed assumptions; objectives are not proven outcomes.'};
}
