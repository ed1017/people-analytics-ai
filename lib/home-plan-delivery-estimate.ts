import type {Assumption,BundleDraft,BundleInputs} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {listedPlanCash} from './home-plan-cash.ts';
export type DeliveryEstimateInputs={hoursPerParticipant:Assumption<number>;coordinationHours:Assumption<number>;hourlyRate:Assumption<number>;acceptance:Assumption<string>};
const assumed=<T>(value:T):Assumption<T>=>({value,kind:'illustrative',basis:'Explicit starting planning assumption; editable through chat, not evidence or an assigned resource.'});
/** Fill the new estimate only once; existing/user/adopted inputs are never replaced. */
export function withDeliveryAssumptions(input:BundleInputs,components:number):BundleInputs {
 const next=structuredClone(input);if(next.deliveryEstimate)return next;
 next.deliveryEstimate={hoursPerParticipant:assumed(2),coordinationHours:assumed(components*8),hourlyRate:input.costPolicy?{value:null,kind:'unknown',basis:null}:assumed(60),acceptance:assumed('Complete the listed deliverables, document evidence gaps and assumptions, and obtain a proposed owner-role review by the planned finish.')};
 return next;
}
export function planDeliveryEstimate(draft:BundleDraft){
 const input=draft.inputs,e=input.deliveryEstimate;if(!e)return null;
 const participantValues=input.groups.map(g=>g.count.value);
 const participants=participantValues.length===1?participantValues[0]:input.groupsDisjoint.value===true&&participantValues.every(n=>n!==null)?participantValues.reduce<number>((n,v)=>n+v!,0):null;
 const hours=participants!==null&&e.hoursPerParticipant.value!==null&&e.coordinationHours.value!==null?participants*e.hoursPerParticipant.value+e.coordinationHours.value:null;
 const cost=(kind:'cash'|'employee_time')=>{const rows=input.expenses.filter(row=>row.kind===kind);return rows.every(row=>row.amount.value!==null&&row.months.value!==null)?rows.reduce((n,row)=>n+row.amount.value!*row.months.value!,0):null;};
 const hasEnteredTime=input.expenses.some(row=>row.kind==='employee_time');
 const employeeTime=input.costPolicy?null:hasEnteredTime?(input.costsDistinct.value===false?null:cost('employee_time')):hours!==null&&e.hourlyRate.value!==null?Math.round(hours*e.hourlyRate.value*100)/100:null;
 const cash=input.costPolicy==='cash-hours-v2'?(input.capacity?null:listedPlanCash(draft)):input.costsDistinct.value===false||input.capacity||(input.costPolicy&&!input.expenses.some(row=>row.kind==='cash')&&!input.costReviews.every(row=>row.complete.value===true))?null:cost('cash'),finish=input.timing.map(row=>row.finish.value).every(Boolean)?input.timing.map(row=>row.finish.value!).sort().at(-1)??null:null;
 const deliverables=draft.bundle.components.map(component=>{
  const text=component.name+' '+component.firstStep;
  if(!/^(?:propose(?: to)?\s+)?(?:review|investigate|analy[zs]e|assess|compare|examine|audit|diagnose|summari[sz]e|triangulate|identify|define)\b/i.test(component.firstStep.trim()))return `one completed work package: ${component.name}`;
  if(/\b(?:skills?|assessment)\b/i.test(text))return `${participants??'reviewed number of'} skills assessments and one evidence-ranked skill-gap list`;
  if(/\b(?:pathway|mobility|career)\b/i.test(text))return 'one documented pathway audit';
  return `one completed work package: ${component.name}`;
 });
 return {participants,hours,employeeTime,cash,finish,deliverables:[...new Set(deliverables)],usesEnteredTime:hasEnteredTime,acceptance:e.acceptance.value};
}

/** Separate sources stay visible; without overlap review their hours cannot be added. */
export function planStaffEffort(draft:BundleDraft){
 const delivery=planDeliveryEstimate(draft),capacity=draft.inputs.capacity?.input;
 const raw=capacity?.trainingHours;
 const training=capacity&&Number(capacity.build)===0?0:raw?.trim()&&Number.isFinite(Number(raw))&&Number(raw)>=0?Number(raw):null;
 const hours=delivery?.hours??null;
 const total=delivery&&capacity?(hours===0?training:training===0?hours:null):delivery?hours:training;
 return {deliveryHours:hours,trainingHours:training,totalHours:total,hasDelivery:!!delivery,hasCapacity:!!capacity};
}
export function planStaffHours(draft:BundleDraft):number|null{return planStaffEffort(draft).totalHours;}
export function planStaffEffortText(draft:BundleDraft):string{
 const e=planStaffEffort(draft);
 if(e.hasDelivery&&e.hasCapacity)return `${e.deliveryHours??'Unknown'} delivery staff hours; ${e.trainingHours??'Unknown'} staffing training hours. Combined staff hours: ${e.totalHours??'Unknown; review overlap before adding these efforts'}.`;
 return `${e.totalHours??'Unknown'} staff hours${e.hasCapacity?' for staffing training':''}.`;
}
