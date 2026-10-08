import type {WorkloadCapacityInput} from './workload-capacity';
// @ts-expect-error Native tests share TypeScript source.
import {calculateWorkloadCapacity} from './workload-capacity.ts';
export const workloadFields=[
 ['tickets','Tickets per month'],['minutes','Handling minutes per ticket'],['productive','Productive hours per role'],['baseline','Existing target roles'],['availability','Target availability percent'],['sourceCapacity','Source available hours per month'],['sourceWork','Source workload hours per month'],['managerHours','Uncommitted manager hours per month'],['budget','Cash budget USD'],
] as const;
export type WorkloadField=typeof workloadFields[number][0];
export type WorkloadValues=Record<WorkloadField,string>;
export function workloadValues(input:WorkloadCapacityInput):WorkloadValues{
 const value=(n:number|null)=>n===null?'':String(n),m=input.managers[0];
 return {tickets:value(input.workload.ticketsByMonth[0].value),minutes:value(input.workload.minutesPerTicket.value),productive:value(input.workload.productiveHoursPerRole.value),baseline:value(input.target.baselineRoles.value),availability:value(input.target.availabilityPct.value),sourceCapacity:value(input.source.capacityHoursByMonth[0].value),sourceWork:value(input.source.workloadHoursByMonth[0].value),managerHours:value(m.uncommittedHoursByMonth[0].value),budget:value(input.options[0].draft.inputs.budget?.amount.value??null)};
}
/** Editing applies only changed fields; empty means unknown, never zero. */
export function previewWorkloadValues(input:WorkloadCapacityInput,values:WorkloadValues){
 const next=structuredClone(input),before=workloadValues(input),changed=workloadFields.filter(([key])=>values[key]!==before[key]);
 if(!changed.length)throw Error('No assumption changes to review.');
 for(const [key] of changed){const text=values[key].trim();if(text&&!/^\d+(\.\d{1,2})?$/.test(text))throw Error('Use nonnegative quantities with at most two decimal places, or leave unknown.');
  const a=text?{value:Number(text),kind:'user-entered' as const,basis:'User-entered scenario assumption; not observed data.'}:{value:null,kind:'unknown' as const,basis:null};
  const monthly=()=>Array.from({length:next.workload.ticketsByMonth.length},()=>structuredClone(a));
  if(key==='tickets')next.workload.ticketsByMonth=monthly();if(key==='minutes')next.workload.minutesPerTicket=a;if(key==='productive')next.workload.productiveHoursPerRole=a;if(key==='baseline')next.target.baselineRoles=a;if(key==='availability')next.target.availabilityPct=a;
  if(key==='sourceCapacity')next.source.capacityHoursByMonth=monthly();if(key==='sourceWork')next.source.workloadHoursByMonth=monthly();if(key==='managerHours')next.managers[0].uncommittedHoursByMonth=monthly();
  if(key==='budget')for(const o of next.options)o.draft.inputs.budget={amount:structuredClone(a),basis:{value:'cash',kind:'adopted',basis:'Cash-only planning budget; staff time remains hours.'}};
 }
 next.identity.revision++;for(const o of next.options)o.draft.revision=next.identity.revision;
 calculateWorkloadCapacity(next);return {input:next,changes:changed.map(([key,label])=>({label,from:before[key]||'Unknown',to:values[key]||'Unknown'}))};
}
export function workloadChatChange(input:WorkloadCapacityInput,text:string){
 const phrases:Record<WorkloadField,string>={tickets:'tickets per month',minutes:'handling minutes per ticket',productive:'productive hours per role',baseline:'existing target roles',availability:'target availability percent',sourceCapacity:'source available hours per month',sourceWork:'source workload hours per month',managerHours:'uncommitted manager hours per month',budget:'cash budget USD'};
 for(const [key,phrase] of Object.entries(phrases)){const match=text.trim().match(new RegExp('^(?:please )?(?:use|set|change) (?:the )?'+phrase+' (?:to )?(unknown|[0-9]+(?:\\.[0-9]+)?)\\.?$','i'))||text.trim().match(new RegExp('^(?:please )?use (unknown|[0-9]+(?:\\.[0-9]+)?) '+phrase+'\\.?$','i'));if(match)return previewWorkloadValues(input,{...workloadValues(input),[key]:match[1].toLowerCase()==='unknown'?'':match[1]});}
 throw Error('This preview supports one displayed assumption per message. Timing outside month starts, graded readiness, other profiles and multiple pools need separate review.');
}
