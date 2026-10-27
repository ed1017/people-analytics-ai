// @ts-expect-error Native tests share source.
import {guidedExample,guidedExampleCapacityDraft} from './guided-workload.ts';
import type {DashboardFilters} from './dashboard-scope';
import {PUBLIC_9037} from './public-9037-contract.mjs';
// @ts-expect-error Native tests share source.
import {capacitySpec,type CapacityDraft} from './swp-capacity-draft.ts';
// @ts-expect-error Native tests share source.
import {calculateMonthlyWorkload} from './swp-monthly-workload.ts';
/** Independent fictional workload slice, never a measured subset or additive company stock. */
export const syntheticCapacityRisk=Object.freeze({version:2,id:'guided-service-workload-v2',asOf:'2026-09-30',startMonth:'2026-10',endMonth:'2026-12',businessUnit:guidedExample.businessUnit,role:guidedExample.role,scope:guidedExample.scope+' - service units'});
export function syntheticCapacityDraft():CapacityDraft {
 return guidedExampleCapacityDraft();
}
export function syntheticCapacityCalculation(draft:CapacityDraft=syntheticCapacityDraft()) {
 return calculateMonthlyWorkload(capacitySpec({...draft,confirmed:true}));
}
export function visibleSyntheticCapacityRisk(filters:DashboardFilters,asOf:string,token:string){
 if(token!==PUBLIC_9037.token||asOf!==syntheticCapacityRisk.asOf||filters.country!=='all'||filters.level!=='all'||filters.org!=='all')return null;
 const result=syntheticCapacityCalculation(),point=result.points.at(-1);
 return point?.gapFte!==null&&point?.gapFte!==undefined&&point.gapFte>0?{...syntheticCapacityRisk,result,point}:null;
}
