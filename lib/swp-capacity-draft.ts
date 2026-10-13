import type {MonthlyWorkloadSpec,Quantity,Unit,Movement} from './swp-monthly-workload';

export type CapacityDraft = {
 scope:string;openingDate:string;months:string;people:string;fte:string;
 volume:string;effort:string;hours:string;hires:string;exits:string;
 hireFte:string;exitFte:string;allocation:string;productivity:string;
 /** Absent only on legacy v1 drafts; blank is unknown. */
 costRate?:string;
 fullTimeMovements:boolean;confirmed:boolean;
};
export const emptyCapacityDraft:CapacityDraft={scope:'',openingDate:'',months:'3',people:'',fte:'',volume:'',effort:'',hours:'',hires:'',exits:'',hireFte:'',exitFte:'',allocation:'',productivity:'',fullTimeMovements:false,confirmed:false};
export const capacityLabels:Record<Exclude<keyof CapacityDraft,'fullTimeMovements'|'confirmed'>,string>={
 costRate:'Cost per contracted FTE per month (USD, optional)',
 scope:'Workload scope',openingDate:'Opening date (month end)',months:'Planning months',people:'Opening people',fte:'Opening contracted FTE',
 volume:'Work units each month',effort:'Hours per work unit',hours:'Productive hours per FTE each month',hires:'Hires each month (people)',exits:'Departures each month (people)',hireFte:'FTE per hire',exitFte:'FTE per departure',allocation:'Time assigned to this work (%)',productivity:'Productivity improvement (%)',
};
function number(value:string,label:string):number|null {
 if(!value.trim())return null;
 if(!/^\d+(?:\.\d{1,6})?$/.test(value.trim()))throw Error(`${label}: enter a nonnegative number with at most six decimal places.`);
 const n=Number(value);if(!Number.isFinite(n))throw Error(`${label}: enter a finite number.`);return n;
}
// Four percentage decimals map exactly to the engine's six fraction decimals.
// Round the scaled integer to remove binary floating-point noise, not input precision.
function percentageFraction(value:number|null,label:string):number|null {
 if(value===null)return null;
 if(value>100||Number(value.toFixed(4))!==value)throw Error(`${label}: use 0–100 with at most four decimal places.`);
 return Math.round(value*10_000)/1_000_000;
}
function q<U extends Unit>(value:number|null,unit:U,note:string):Quantity<U>{return {value,unit,basis:{kind:value===null?'unknown':'user-assumption',note}};}
/** Adapter only: expands explicitly confirmed recurring inputs; the reviewed engine owns all calculations. */
export function capacitySpec(draft:CapacityDraft):MonthlyWorkloadSpec {
 if(!draft.confirmed)throw Error('Confirm the recurring assumptions before calculating.');
 if(!draft.scope.trim())throw Error('Name the workload scope, including the work unit (for example, Service desk — tickets).');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.openingDate))throw Error('Choose an opening month-end date.');
 const months=number(draft.months,capacityLabels.months);
 if(months===null||!Number.isInteger(months)||months<1||months>6)throw Error('Choose 1–6 planning months.');
 const values=Object.fromEntries((['people','fte','volume','effort','hours','hires','exits','hireFte','exitFte','allocation','productivity'] as const).map(key=>[key,draft.fullTimeMovements&&(key==='hireFte'||key==='exitFte')?1:number(draft[key],capacityLabels[key])])) as Record<'people'|'fte'|'volume'|'effort'|'hours'|'hires'|'exits'|'hireFte'|'exitFte'|'allocation'|'productivity',number|null>;
 const scopeId=draft.scope.trim();
 const quantity=<U extends Unit>(key:keyof typeof values,unit:U)=>q(values[key],unit,`User entered ${capacityLabels[key]}; repeated each month where applicable.`);
 const movement=(key:'hires'|'exits',ratio:'hireFte'|'exitFte'):Movement=>({people:quantity(key,'people'),fte:{mode:'per-person',quantity:draft.fullTimeMovements?q(1,'FTE/person','User confirmed each hire and departure is one contracted FTE.'):quantity(ratio,'FTE/person')}});
 const noTransfer=():Movement=>({people:q(0,'people','User confirmed no transfers in this scenario.'),fte:{mode:'explicit',quantity:q(0,'FTE','User confirmed no transfers in this scenario.')}});
 const [year,month]=draft.openingDate.split('-').map(Number);
 return {version:'monthly-supply-workload/v1',scope:{id:scopeId,label:scopeId,kind:'workload-group',workUnit:scopeId},
  accounting:{timing:'start-of-month-outflows-from-opening',exits:'all-separations-including-retirement',movements:'disjoint',workload:'before-productivity',productiveHours:'net-of-non-work-time-before-allocation'},
  opening:{scopeId,asOf:draft.openingDate,headcount:quantity('people','people'),contractedFte:quantity('fte','FTE')},
  months:Array.from({length:months},(_,i)=>({month:new Date(Date.UTC(year,month+i,1)).toISOString().slice(0,7),scopeId,
   hires:movement('hires','hireFte'),exits:movement('exits','exitFte'),transfersIn:noTransfer(),transfersOut:noTransfer(),
   volume:quantity('volume','work-units/month'),hoursPerUnit:quantity('effort','hours/work-unit'),productiveHoursPerFte:quantity('hours','hours/FTE/month'),
   allocation:q(percentageFraction(values.allocation,capacityLabels.allocation),'fraction','User entered percentage of contracted FTE assigned to this work.'),
   productivityUplift:q(percentageFraction(values.productivity,capacityLabels.productivity),'fraction','User entered throughput improvement, applied once.'),
  }))};
}
