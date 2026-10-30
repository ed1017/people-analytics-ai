// @ts-expect-error Native tests share this canonical TypeScript source.
import {DEMO_POSITION_INVENTORY,inventorySummary,requireReviewedPositionInventory,positionInventoryKey,positionInventoryReference,resolvePositionInventory,type PositionInventory,type PositionInventoryReference} from './position-inventory.ts';
export const POSITION_ALLOCATION_MODEL='position-allocation-v1';
export type PositionAllocationInput={
 selectedIds:string[];hire:number;repurpose:number;train:number;thawFrozen:boolean;
 repurposeMode:'redesign'|'redeploy';repurposeRole:string;sourceTeam:string;releaseFte:number;
 assumedFtePerUnknownSlot:number;assumedSourceCapacityFte:number;budgetUsd:number|null;horizonMonths:number;hireMonth:number;hireReadyMonth:number;redeployMonth:number;trainReadyMonth:number;
 hireFeeUsd:number|null;annualHireCostUsd:number|null;repurposeCostUsd:number|null;trainingFeeUsd:number|null;
 trainingHoursPerSlot:number|null;hourlyTimeValueUsd:number|null;backfill:'none'|'temporary';backfillMonthlyFteUsd:number|null;
};
export type PositionAllocationDraft={version:1;modelVersion:typeof POSITION_ALLOCATION_MODEL;inventory:PositionInventoryReference;inventoryKey:string;input:PositionAllocationInput};
const moneyKeys=['budgetUsd','hireFeeUsd','annualHireCostUsd','repurposeCostUsd','trainingFeeUsd','trainingHoursPerSlot','hourlyTimeValueUsd','backfillMonthlyFteUsd'] as const;
const countKeys=['hire','repurpose','train','horizonMonths','hireMonth','hireReadyMonth','redeployMonth','trainReadyMonth'] as const;
export function defaultPositionAllocation(selectedIds:string[]):PositionAllocationInput {
 return {selectedIds:[...selectedIds],hire:0,repurpose:0,train:0,thawFrozen:false,repurposeMode:'redesign',repurposeRole:'Data Analyst',sourceTeam:'Client Operations',releaseFte:3,
  assumedFtePerUnknownSlot:1,assumedSourceCapacityFte:20,budgetUsd:150000,horizonMonths:6,hireMonth:3,hireReadyMonth:5,redeployMonth:1,trainReadyMonth:4,
  hireFeeUsd:6000,annualHireCostUsd:90000,repurposeCostUsd:2000,trainingFeeUsd:2500,trainingHoursPerSlot:80,hourlyTimeValueUsd:50,backfill:'none',backfillMonthlyFteUsd:7500};
}
export function createPositionAllocation(selectedIds:string[],example=false,source:PositionInventory=DEMO_POSITION_INVENTORY):PositionAllocationDraft {
 const input=defaultPositionAllocation(selectedIds);if(example)Object.assign(input,{hire:3,repurpose:6,train:3});
 const inventory=positionInventoryReference(source);
 if(!source.positions.some(p=>p.team===input.sourceTeam&&p.status==='filled'))input.sourceTeam=source.positions.find(p=>p.status==='filled')?.team??input.sourceTeam;
 if(!source.positions.some(p=>p.role===input.repurposeRole))input.repurposeRole=source.positions[0]?.role??input.repurposeRole;
 return {version:1,modelVersion:POSITION_ALLOCATION_MODEL,inventory,inventoryKey:positionInventoryKey(source),input};
}
/** Validate shape separately: an overallocated working draft may be retained, but cannot be saved as a valid scenario. */
export function requirePositionAllocationDraft(value:unknown):asserts value is PositionAllocationDraft {
 if(!value||typeof value!=='object')throw Error('Unsupported position scenario draft.');
 const draft=value as PositionAllocationDraft;
 if(draft.version!==1||draft.modelVersion!==POSITION_ALLOCATION_MODEL)throw Error('Unsupported position calculation version; no silent recalculation.');
 requireReviewedPositionInventory(draft.inventory);
 const inventory=resolvePositionInventory(draft.inventory.version);
 if(draft.inventoryKey!==positionInventoryKey(inventory))throw Error('Position baseline identity changed.');
 const a=draft.input,inventoryIds=new Set(inventory.positions.map(p=>p.id));
 if(!a||typeof a!=='object'||Object.keys(a).sort().join()!==Object.keys(defaultPositionAllocation([])).sort().join())throw Error('Unsupported position assumptions.');
 if(!Array.isArray(a.selectedIds)||a.selectedIds.length>500||new Set(a.selectedIds).size!==a.selectedIds.length||a.selectedIds.some(id=>typeof id!=='string'||!inventoryIds.has(id)))throw Error('Position selection is missing, duplicated or belongs to another inventory.');
 for(const key of countKeys)if(!Number.isSafeInteger(a[key])||a[key]<0||a[key]>1000)throw Error('Position counts and months must be nonnegative whole numbers.');
 for(const key of moneyKeys)if(a[key]!==null&&(typeof a[key]!=='number'||!Number.isFinite(a[key])||a[key]!<0||a[key]!>100000000))throw Error('Costs and hours must be nonnegative numbers or unknown.');
 if(!Number.isFinite(a.releaseFte)||a.releaseFte<0||a.releaseFte>1000)throw Error('Invalid source-team release assumption.');
 if(!Number.isFinite(a.assumedFtePerUnknownSlot)||a.assumedFtePerUnknownSlot<=0||a.assumedFtePerUnknownSlot>2||!Number.isFinite(a.assumedSourceCapacityFte)||a.assumedSourceCapacityFte<0||a.assumedSourceCapacityFte>100000)throw Error('Invalid modeled FTE assumptions.');
 if(typeof a.thawFrozen!=='boolean'||!['redesign','redeploy'].includes(a.repurposeMode)||!inventory.positions.some(p=>p.role===a.repurposeRole)||!inventory.positions.some(p=>p.team===a.sourceTeam&&p.status==='filled')||!['none','temporary'].includes(a.backfill))throw Error('Unsupported position route or source team.');
}
const rounded=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const multiply=(count:number,value:number|null)=>count===0?0:value===null?null:count*value;
function total(values:(number|null)[]){return values.some(n=>n===null)?null:rounded(values.reduce<number>((sum,n)=>sum+(n??0),0));}
export function calculatePositionAllocation(draft:PositionAllocationDraft){
 requirePositionAllocationDraft(draft);
 const inventory=resolvePositionInventory(draft.inventory.version),a=draft.input,selectedIds=new Set(a.selectedIds),selected=inventory.positions.filter(p=>selectedIds.has(p.id)),vacancies=selected.filter(p=>p.status==='vacant');
 const frozen=vacancies.filter(p=>p.vacancyStatus==='frozen'&&!a.thawFrozen),eligible=vacancies.filter(p=>a.thawFrozen||p.vacancyStatus!=='frozen');
 const allocated=a.hire+a.repurpose+a.train,errors:string[]=[];
 if(!eligible.length)errors.push('Select at least one unfrozen vacancy to plan.');
 if(allocated>eligible.length)errors.push(`${allocated} allocations exceed ${eligible.length} eligible vacant positions.`);
 if(a.horizonMonths<1||a.horizonMonths>24)errors.push('Choose a scenario horizon between 1 and 24 months.');
 for(const key of ['hireMonth','hireReadyMonth','redeployMonth','trainReadyMonth'] as const)if(a[key]<1||a[key]>24)errors.push('Timing assumptions must be between month 1 and month 24.');
 if(a.hireReadyMonth<a.hireMonth)errors.push('Hire readiness cannot precede the assumed arrival month.');
 // A deterministic ID order assigns the explicitly selected capacity slots to routes; no employee match is inferred.
 const routed=[...eligible].sort((x,y)=>x.id.localeCompare(y.id));
 const hired=routed.slice(0,a.hire),repurposed=routed.slice(a.hire,a.hire+a.repurpose),trained=routed.slice(a.hire+a.repurpose,a.hire+a.repurpose+a.train);
 const fte=(rows:typeof eligible)=>rows.reduce((sum,p)=>sum+(p.fte??a.assumedFtePerUnknownSlot),0);
 const hireFte=fte(hired),moveFte=a.repurposeMode==='redeploy'?fte(repurposed):0,trainFte=fte(trained),internalFte=moveFte+trainFte;
 const sourceFilledFte=inventorySummary(inventory.positions.filter(p=>p.team===a.sourceTeam)).filledPositionFte;
 if(internalFte>a.releaseFte+0.000001)errors.push(`${rounded(internalFte)} FTE of internal transfers exceed the ${a.releaseFte} FTE source-team release assumption.`);
 const sourceCapacityLimitFte=sourceFilledFte??a.assumedSourceCapacityFte;
 if(a.releaseFte>sourceCapacityLimitFte+0.000001)errors.push(`Release assumption exceeds ${sourceCapacityLimitFte} FTE in the recorded or assumed source capacity.`);
 if(trained.length&&a.trainingHoursPerSlot!==null&&trained.length*a.trainingHoursPerSlot>trainFte*160*Math.max(0,a.trainReadyMonth-1)+0.000001)errors.push('Training hours exceed modeled capacity before the ready month. Increase lead time or review training effort.');
 const horizon=Math.min(24,Math.max(1,a.horizonMonths));
 const timeline=Array.from({length:horizon+1},(_,month)=>{
  const hireReady=month>=a.hireReadyMonth?hireFte:0,moveReady=month>=a.redeployMonth?moveFte:0,trainReady=month>=a.trainReadyMonth?trainFte:0;
  const trainingLoad=trained.length>0&&month>0&&month<a.trainReadyMonth?(a.trainingHoursPerSlot===null?null:trained.length*a.trainingHoursPerSlot/(Math.max(1,a.trainReadyMonth-1)*160)):0;
  const released=moveReady+trainReady,backfill=a.backfill==='temporary'?released:0;
  return {month,targetReadyFte:rounded(hireReady+moveReady+trainReady),sourceReleasedFte:rounded(released),trainingLoadFte:trainingLoad===null?null:rounded(trainingLoad),backfillFte:rounded(backfill),sourceGapFte:trainingLoad===null?null:rounded(released-backfill+trainingLoad),netCapacityDeltaFte:trainingLoad===null?null:rounded(hireReady+moveReady+trainReady-released+backfill-trainingLoad)};
 });
 const last=timeline.at(-1)!;
 const salaryMonths=Math.max(0,horizon-a.hireMonth+1);
 const backfillFteMonths=timeline.slice(1).reduce((sum,p)=>sum+p.backfillFte,0);
 const cash={hiringFees:multiply(a.hire,a.hireFeeUsd),hirePayroll:multiply(hireFte,salaryMonths===0?0:a.annualHireCostUsd===null?null:a.annualHireCostUsd*salaryMonths/12),repurpose:multiply(a.repurpose,a.repurposeCostUsd),training:multiply(a.train,a.trainingFeeUsd),backfill:a.backfill==='none'?0:multiply(backfillFteMonths,a.backfillMonthlyFteUsd)};
 const cashTotal=total(Object.values(cash));
 const timeValue= a.train===0?0:a.trainingHoursPerSlot===null||a.hourlyTimeValueUsd===null?null:rounded(a.train*a.trainingHoursPerSlot*a.hourlyTimeValueUsd);
 return {valid:errors.length===0,errors,baseline:inventorySummary(selected),selectedIds:selected.map(p=>p.id),vacancies:vacancies.length,eligible:eligible.length,frozen:frozen.length,allocated,unassigned:Math.max(0,eligible.length-allocated),overallocated:Math.max(0,allocated-eligible.length),redesignedUnstaffed:a.repurposeMode==='redesign'?a.repurpose:0,
  routes:{hire:hired.map(p=>p.id),repurpose:repurposed.map(p=>p.id),train:trained.map(p=>p.id)},hireFte,moveFte,trainFte,internalFte:rounded(internalFte),sourceFilledFte,sourceCapacityLimitFte,sourceFilledPositions:inventorySummary(inventory.positions.filter(p=>p.team===a.sourceTeam)).filled,timeline,
  targetReadyFte:last.targetReadyFte,remainingTargetFte:rounded(Math.max(0,fte(vacancies)-last.targetReadyFte)),sourceGapFte:last.sourceGapFte,netCapacityDeltaFte:last.netCapacityDeltaFte,
  cash,cashTotal:cashTotal===null?null:rounded(cashTotal),timeValue,totalWithTime:total([cashTotal,timeValue]),budgetRemaining:a.budgetUsd===null||cashTotal===null?null:rounded(a.budgetUsd-cashTotal),budgetBasis:'Incremental cash in USD over the selected horizon; employee time value is separate.'};
}
export type PositionAllocationResult=ReturnType<typeof calculatePositionAllocation>;
