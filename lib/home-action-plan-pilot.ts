// @ts-expect-error Native Node tests share TypeScript source.
import {planningStatements,resolveHomePlanningIntent,planningRequirementText} from './home-planning-intent.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {initialWhatIf,normalizeWhatIfQuantities} from './home-plan-what-if.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {withDeliveryAssumptions} from "./home-plan-delivery-estimate.ts";
// Deterministic local DEMO assumptions. Never a quote, staffing forecast or model input.
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft,reviseBundleDraft,unknownAssumption,type Assumption,type BundleDraft} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {componentOrder} from './home-solution-bundles.ts';
export const pilotVersion='illustrative-pilot-v1' as const;
export const pilotAllowances={manager_workload:{amount:1000,months:3,label:'Manager facilitation and materials'},learning:{amount:2000,months:1,label:'Unallocated learning pilot'},mobility:{amount:1000,months:1,label:'Mobility review coordination'},compensation:{amount:500,months:1,label:'Compensation review administration'},hiring:{amount:500,months:1,label:'Hiring process review'},execution:{amount:500,months:1,label:'Pilot tracking administration'}};
const day=86400000;
export function pilotCalendar(preparedAt:string){
 const date=new Date(preparedAt);if(!Number.isFinite(date.getTime())||!/^\d{4}-\d\d-\d\dT/.test(preparedAt))throw Error('A valid preparation timestamp is required.');
 const start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)),end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+3,0));
 return {preparedAt:date.toISOString(),timezone:'UTC' as const,startMonth:start.toISOString().slice(0,7),endDate:end.toISOString().slice(0,10)};
}
export function prepareIllustrativePilot(draft:BundleDraft,preparedAt:string,context?:{goalContext?:unknown;includeDeliveryEstimate?:boolean}):BundleDraft{
 if(!readBundleDraft(draft))throw Error('Invalid Action Plan draft.');
 if(draft.pilot)return structuredClone(draft); // Never refresh frozen dates or overwrite edits.
 const calendar=pilotCalendar(preparedAt),basis=`${pilotVersion}; prepared ${calendar.preparedAt}; UTC calendar. DEMO placeholder, not evidence, quote or market benchmark.`;
 const demo=<T>(value:T):Assumption<T>=>({value,kind:'illustrative',basis});
 const input=structuredClone(draft.inputs),intent=resolveHomePlanningIntent(/\b(turnover|retention|retain)\b/i.test(draft.binding.goal)?[draft.binding.goal,...planningStatements(context?.goalContext)]:[]);
 const entered=<T>(value:T,basis:string):Assumption<T>=>({value,kind:'user-entered',basis});
 if(!input.budget&&intent.budgetCap!==null)input.budget={amount:entered(intent.budgetCap,'Explicit cash budget ceiling from the user; not an expense or confirmed funding.'),basis:entered('cash','Incremental cash only; existing employee time stays in hours.')};
 if(input.scope.months.value===null&&intent.months!==null)input.scope.months=entered(intent.months,'Explicit shared horizon retained from user conversation.');
 if(input.scope.population.value===null&&intent.companyWide)input.scope.population=entered('Company-wide turnover; all countries and business units','User-stated population; an average-workforce denominator still requires review.');
 const requirements=planningRequirementText(intent);if(input.scope.requirements.value===null&&requirements)input.scope.requirements=entered(requirements,'Explicit user planning constraints; the cap is not an expense.');
 if(input.scope.capacityRequired.value===null&&intent.existingCapacity&&intent.goal)input.scope.capacityRequired=entered(false,'Use existing HR/manager capacity, as requested; no additional staffing is assumed.');
 if(input.scope.startMonth.value===null)input.scope.startMonth=demo(calendar.startMonth);
 if(input.scope.months.value===null){const stated=normalizeWhatIfQuantities(draft.binding.goal).match(/\b(?:over|within|for|in)\s+(\d+)\s*[- ]?months?\b/i),months=stated?Number(stated[1]):null;input.scope.months=months&&months<=24?{value:months,kind:'user-entered',basis:'Explicit planning horizon in the pinned goal; not an observed result.'}:demo(3);}
 if(input.scope.population.value===null)input.scope.population=demo('Hypothetical shared pilot group — not selected employees');
 // Existing exact-draft assumptions always win. No adoption from a different option/goal.
 const start=Date.parse(input.scope.startMonth.value+'-01T00:00:00Z'),finishById=new Map<string,number>();
 for(const id of componentOrder(draft.bundle.components)){
  const component=draft.bundle.components.find(item=>item.id===id)!,timing=input.timing.find(item=>item.componentId===id)!;
  const earliest=Math.max(start,...component.dependsOn.map(parent=>(finishById.get(parent)??start-day)+day));
  if(timing.start.value===null){const proposed=new Date(earliest).toISOString().slice(0,10);if(!timing.finish.value||proposed<=timing.finish.value)timing.start=demo(proposed);}
  if(timing.finish.value===null&&timing.start.value)timing.finish=demo(new Date(Date.parse(timing.start.value+'T00:00:00Z')+13*day).toISOString().slice(0,10));
  finishById.set(id,timing.finish.value?Date.parse(timing.finish.value+'T00:00:00Z'):earliest+13*day);
 }
 if(input.groups.length===0&&input.memberships.length===0){
  const quantifiedRetention=intent.pointReduction!==null||intent.relativeReduction!==null;
  input.groups.push({id:'pilot-group',label:intent.participants!==null?'User-stated participant group':quantifiedRetention?'Shared pilot group; participant population requires review':'Illustrative shared pilot group; not selected employees',count:intent.participants!==null?entered(intent.participants,'Explicit participant population in the user goal and constraints.'):quantifiedRetention?unknownAssumption<number>():demo(10)});
  input.memberships=draft.bundle.components.map(component=>({componentId:component.id,groupIds:['pilot-group'],complete:unknownAssumption()}));
 }
 for(const domain of new Set(draft.bundle.components.map(item=>item.domain))){
  const ids=draft.bundle.components.filter(item=>item.domain===domain).map(item=>item.id);
  // Any existing expense/coverage association may overlap: never add a second allowance.
  if(input.expenses.some(item=>item.id===`pilot-${domain}`)||input.expenseLinks.some(link=>link.componentIds.some(id=>ids.includes(id)))||input.capacity||input.expenses.some(expense=>!input.expenseLinks.some(link=>link.expenseId===expense.id)))continue;
  const allowance=pilotAllowances[domain],id=`pilot-${domain}`;
  input.expenses.push({id,label:`DEMO allowance: ${allowance.label}; excludes pay, backfill and vendor quotes`,kind:'cash',amount:demo(allowance.amount),startMonth:demo(input.scope.startMonth.value!),months:demo(Math.min(allowance.months,input.scope.months.value!))});
  input.expenseLinks.push({expenseId:id,componentIds:ids,allocations:null});
 }
 input.dependenciesConfirmed=unknownAssumption();input.groupsDisjoint=unknownAssumption();input.costsDistinct=unknownAssumption();input.scope.comparisonConfirmed=unknownAssumption();input.costReviews=input.costReviews.map(item=>({...item,complete:unknownAssumption()}));
 // A desired reduction is a measurable target even when no comparable baseline exists.
 // Do not replace a user's percentage-point/relative request with the generic demo rate pair.
 if(!input.successMeasure&&!intent.rateConflict&&(intent.pointReduction!==null||intent.relativeReduction!==null&&intent.baseline===null)){
  const target=intent.pointReduction!==null?`${intent.pointReduction} percentage-point reduction`:`${intent.relativeReduction}% relative reduction`;
  input.successMeasure={goal:draft.binding.goal,scopeKey:JSON.stringify([input.scope.population.value,input.scope.startMonth.value,input.scope.months.value]),name:`Turnover rate over ${input.scope.months.value} months for the stated plan population`,baseline:intent.baseline===null?unknownAssumption():entered(`${intent.baseline}%`,'Explicit user baseline; confirm the same population, metric and period.'),target:entered(target+(intent.target===null?'':`; ending rate ${intent.target}%`),'User-requested reduction, not an estimated or validated intervention effect. A matching baseline is required before deriving an ending rate or exits.')};
 }
 const scenario=initialWhatIf(draft.binding.goal,input);if(scenario&&!input.whatIf){
  if(intent.baseline!==null){scenario.baseline=entered(intent.baseline,'Explicit baseline accepted in the user conversation; used conditionally, not a predicted effect.');scenario.population=unknownAssumption();if(intent.baselinePeriod)scenario.ratePeriod=intent.baselinePeriod;}
  if(intent.relativeReduction!==null&&scenario.baseline.value!==null)scenario.target={value:Math.round(scenario.baseline.value*(1-intent.relativeReduction/100)*1e6)/1e6,kind:scenario.baseline.kind==='illustrative'?'illustrative':'user-entered',basis:`User-stated ${intent.relativeReduction}% relative reduction applied to the retained baseline; not a predicted effect.`};
  if(intent.target!==null){const derived=scenario.target.value;scenario.target=intent.relativeReduction!==null&&derived!==null&&Math.abs(intent.target-derived)>1e-6?unknownAssumption():entered(intent.target,'Explicit target rate retained from the user conversation; not a predicted effect.');}
  if(intent.rateConflict){scenario.baseline=unknownAssumption();scenario.target=unknownAssumption();scenario.population=unknownAssumption();}
  input.whatIf=scenario;
 }
 const next=reviseBundleDraft(draft,context?.includeDeliveryEstimate?withDeliveryAssumptions(input,draft.bundle.components.length):input);next.pilot={version:pilotVersion,preparedAt:calendar.preparedAt,timezone:'UTC'};
 if(!readBundleDraft(next))throw Error('Illustrative pilot could not be validated.');return next;
}
