/** Optional manual cost layer. The v1 capacity engine and its output are unchanged. */
import type {calculateMonthlyWorkload} from './swp-monthly-workload';
import {monthlyScenarioInputKey as key} from './monthly-scenario-compatibility.mjs';
export const capacityCostVersion='contracted-fte-run-rate/v1' as const;
const semantics={version:capacityCostVersion,currency:'USD',rateUnit:'USD/contracted-FTE/month',outputUnit:'USD/month',method:'monthly-contracted-supply-times-rate',rounding:'nearest-cent-half-up'} as const;
export type CapacityCostAssumptions=typeof semantics & {rateCents:number|null;basis:'user-assumption'|'unknown'};
export type CapacityCost={assumptions:CapacityCostAssumptions;points:{month:string;runRateCents:number|null}[]};
type Result=ReturnType<typeof calculateMonthlyWorkload>;
export function capacityCostAssumptions(raw:string):CapacityCostAssumptions {
 if(typeof raw!=='string')throw Error('Cost rate must be text.');
 const value=raw.trim();
 if(!value)return {...semantics,rateCents:null,basis:'unknown'};
 if(!/^\d+(?:\.\d{1,2})?$/.test(value)||value.length>20||Number(value)>100000)throw Error('Cost rate: use USD 0–100,000 per contracted FTE per month, with at most two decimal places.');
 const [whole,fraction='']=value.split('.');
 const rateCents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 return {...semantics,rateCents,basis:'user-assumption'};
}
export function calculateCapacityCost(result:Result,assumptions:CapacityCostAssumptions):CapacityCost {
 key(assumptions);
 const rate=assumptions.rateCents;
 if(rate!==null&&(!Number.isSafeInteger(rate)||rate<0||rate>10000000))throw Error('Unsupported cost rate.');
 if(key(assumptions)!==key({...semantics,rateCents:rate,basis:rate===null?'unknown':'user-assumption'}))throw Error('Unsupported cost assumptions.');
 const points=result.points.map(p=>{
  const fte=p.contractedFte;
  if(fte!==null&&(!Number.isFinite(fte)||fte<0||fte>1000000||Number(fte.toFixed(6))!==fte))throw Error('Contracted FTE exceeds the cost calculation bounds.');
  // Recover the engine's exact micro-FTE integer. At <=1e12 this is safe;
  // multiplication by cents is NOT safe as a Number (up to 1e19).
  const micro=fte===null?null:Math.round(fte*1000000);
  const cents=micro===null||rate===null?null:(BigInt(micro)*BigInt(rate)+BigInt(500000))/BigInt(1000000);
  if(cents!==null&&cents>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Cost output exceeds the safe integer bound.');
  return {month:p.month,runRateCents:cents===null?null:Number(cents)};
 });
 return {assumptions:structuredClone(assumptions),points};
}
export function capacityCalculationKey(result:Result,cost?:CapacityCost|null):string {
 return key(cost?{capacity:result.assumptions,cost:cost.assumptions}:result.assumptions);
}
export const formatCapacityCost=(cents:number|null|undefined)=>cents==null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
