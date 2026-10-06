import type {Assumption,BundleDraft,BundleInputs} from './home-bundle-reconciliation';
export type DeliveryEstimateInputs={hoursPerParticipant:Assumption<number>;coordinationHours:Assumption<number>;hourlyRate:Assumption<number>;acceptance:Assumption<string>};
const assumed=<T>(value:T):Assumption<T>=>({value,kind:'illustrative',basis:'Explicit starting planning assumption; editable through chat, not evidence or an assigned resource.'});
/** Fill the new estimate only once; existing/user/adopted inputs are never replaced. */
export function withDeliveryAssumptions(input:BundleInputs,components:number):BundleInputs {
 const next=structuredClone(input);if(next.deliveryEstimate)return next;
 next.deliveryEstimate={hoursPerParticipant:assumed(2),coordinationHours:assumed(components*8),hourlyRate:assumed(60),acceptance:assumed('Complete the listed deliverables, document evidence gaps and assumptions, and obtain a proposed owner-role review by the planned finish.')};
 return next;
}
export function planDeliveryEstimate(draft:BundleDraft){
 const input=draft.inputs,e=input.deliveryEstimate;if(!e)return null;
 const participantValues=input.groups.map(g=>g.count.value);
 const participants=participantValues.length===1?participantValues[0]:input.groupsDisjoint.value===true&&participantValues.every(n=>n!==null)?participantValues.reduce<number>((n,v)=>n+v!,0):null;
 const hours=participants!==null&&e.hoursPerParticipant.value!==null&&e.coordinationHours.value!==null?participants*e.hoursPerParticipant.value+e.coordinationHours.value:null;
 const cost=(kind:'cash'|'employee_time')=>{const rows=input.expenses.filter(row=>row.kind===kind);return rows.every(row=>row.amount.value!==null&&row.months.value!==null)?rows.reduce((n,row)=>n+row.amount.value!*row.months.value!,0):null;};
 const hasEnteredTime=input.expenses.some(row=>row.kind==='employee_time');
 const employeeTime=hasEnteredTime?cost('employee_time'):hours!==null&&e.hourlyRate.value!==null?Math.round(hours*e.hourlyRate.value*100)/100:null;
 const cash=cost('cash'),finish=input.timing.map(row=>row.finish.value).every(Boolean)?input.timing.map(row=>row.finish.value!).sort().at(-1)??null:null;
 const deliverables=draft.bundle.components.map(component=>{
  const text=component.name+' '+component.firstStep;
  if(!/^(?:propose(?: to)?\s+)?(?:review|investigate|analy[zs]e|assess|compare|examine|audit|diagnose|summari[sz]e|triangulate|identify|define)\b/i.test(component.firstStep.trim()))return `one completed work package: ${component.name}`;
  if(/\b(?:skills?|assessment)\b/i.test(text))return `${participants??'reviewed number of'} skills assessments and one evidence-ranked skill-gap list`;
  if(/\b(?:pathway|mobility|career)\b/i.test(text))return 'one documented pathway audit';
  return `one completed work package: ${component.name}`;
 });
 return {participants,hours,employeeTime,cash,finish,deliverables:[...new Set(deliverables)],usesEnteredTime:hasEnteredTime,acceptance:e.acceptance.value};
}
