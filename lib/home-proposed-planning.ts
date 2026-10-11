import type {Assumption,BundleDraft} from './home-bundle-reconciliation';
export type PlanningRange={min:number;max:number};
export type PlanningInput={field:'horizon_months'|'participants'|'hours_per_participant'|'coordination_hours'|'cash';target:string|null;label:string;unit:string;assumption:Assumption<number>};
/** Design assumptions only. Never establishes membership, readiness, funding or an effect. */
export function proposedPlanningInputs(draft:BundleDraft):PlanningInput[]{
 const input=draft.inputs,rows:PlanningInput[]=[{field:'horizon_months',target:null,label:'Duration',unit:'months',assumption:input.scope.months}];
 for(const activity of draft.bundle.components){
  const membership=input.memberships.find(row=>row.componentId===activity.id),group=membership?.groupIds.length===1?input.groups.find(row=>row.id===membership.groupIds[0]):null;
  if(group)rows.push({field:'participants',target:activity.id,label:`Participants · ${activity.name}`,unit:'people',assumption:group.count});
 }
 if(input.deliveryEstimate)rows.push({field:'hours_per_participant',target:null,label:'Hours per participant',unit:'hours/person/total',assumption:input.deliveryEstimate.hoursPerParticipant},{field:'coordination_hours',target:null,label:'Coordination hours',unit:'hours/total',assumption:input.deliveryEstimate.coordinationHours});
 for(const expense of input.expenses.filter(row=>row.kind==='cash'&&row.months.value===1))rows.push({field:'cash',target:expense.id,label:expense.label,unit:'USD',assumption:expense.amount});
 return rows;
}
export function proposedPlanningEstimate(draft:BundleDraft){
 if(draft.bundle.origin!=='conversation-v1'||draft.inputs.capacity)return null;
 const input=draft.inputs,rows=proposedPlanningInputs(draft);
 if(!rows.some(row=>row.assumption.kind==='model-proposed'||row.assumption.basis?.includes('planning assumptions editor'))&&!input.expenses.some(row=>row.months.kind==='model-proposed'))return null;
 const ids=[...new Set(input.memberships.flatMap(row=>row.groupIds))],groups=ids.map(id=>input.groups.find(group=>group.id===id)!);
 const covered=draft.bundle.components.every(component=>input.memberships.some(row=>row.componentId===component.id&&row.groupIds.length>0));
 const counts=groups.map(group=>group.count.value);
 const participants:PlanningRange|null=covered&&counts.length&&counts.every(value=>value!==null)?{min:input.groupsDisjoint.value===true?counts.reduce<number>((sum,n)=>sum+n!,0):Math.max(...counts as number[]),max:counts.reduce<number>((sum,n)=>sum+n!,0)}:null;
 const effort=input.deliveryEstimate,perPerson=effort?.hoursPerParticipant.value??null,coordination=effort?.coordinationHours.value??null;
 const round=(n:number)=>Math.round(n*100)/100;
 const hours=participants&&perPerson!==null&&coordination!==null?{min:round(participants.min*perPerson+coordination),max:round(participants.max*perPerson+coordination)}:null;
 const cashItems=input.expenses.filter(row=>row.kind==='cash').map(row=>({id:row.id,label:row.label,amount:row.amount.value!==null&&row.months.value!==null&&(input.scope.months.value===null||row.months.value<=input.scope.months.value)?round(row.amount.value*row.months.value):null}));
 // Independent of the funding calendar: listed allowances over the whole horizon.
 // Multiple fees cannot be added until their distinctness is reviewed.
 const cash=cashItems.length&&(cashItems.length===1||input.costsDistinct.value===true)&&input.costsDistinct.value!==false&&cashItems.every(row=>row.amount!==null)?round(cashItems.reduce((sum,row)=>sum+row.amount!,0)):null;
 return {months:input.scope.months.value,participants,hours,cash,cashItems,perPerson,coordination,rows,modelProposed:rows.some(row=>row.assumption.kind==='model-proposed'),laborCost:null};
}
