import type {DashboardFilters} from './dashboard-scope';
import {PUBLIC_9037} from './public-9037-contract.mjs';
// @ts-expect-error Native tests share source.
import {capacitySpec,type CapacityDraft} from './swp-capacity-draft.ts';
// @ts-expect-error Native tests share source.
import {calculateMonthlyWorkload} from './swp-monthly-workload.ts';
/** Independent fictional workload slice, never a measured subset or additive company stock. */
export const syntheticCapacityRisk=Object.freeze({version:1,id:'synthetic-clientops-workload-v1',asOf:'2026-09-30',startMonth:'2026-10',endMonth:'2026-12',businessUnit:'BU-CLIENTOPS',role:'OPS-CLIENT',scope:'Fictional Client Operations / Client Operations Specialist - service units'});
export function syntheticCapacityDraft():CapacityDraft {
 return {scope:syntheticCapacityRisk.scope,openingDate:syntheticCapacityRisk.asOf,months:'3',people:'10',fte:'10',volume:'1280',effort:'1',hours:'160',hires:'0',exits:'0',hireFte:'1',exitFte:'1',allocation:'30',productivity:'0',costRate:'',fullTimeMovements:true,confirmed:false,sourceNote:'Synthetic ClientOps workload v1; Oct-Dec 2026. Fictional 10-person role slice, not observed BU staffing or additional company headcount. 30% of contracted time assigned to this work; no proficiency or availability evidence. Costs unknown. Editable assumptions, not a forecast.'};
}
export function syntheticCapacityCalculation(draft:CapacityDraft=syntheticCapacityDraft()) {
 return calculateMonthlyWorkload(capacitySpec({...draft,confirmed:true}));
}
export function visibleSyntheticCapacityRisk(filters:DashboardFilters,asOf:string,token:string){
 if(token!==PUBLIC_9037.token||asOf!==syntheticCapacityRisk.asOf||filters.country!=='all'||filters.level!=='all'||!['all',syntheticCapacityRisk.businessUnit].includes(filters.org))return null;
 const result=syntheticCapacityCalculation(),point=result.points.at(-1);
 return point?.gapFte!==null&&point?.gapFte!==undefined&&point.gapFte>0?{...syntheticCapacityRisk,result,point}:null;
}
