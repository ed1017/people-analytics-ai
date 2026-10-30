// @ts-expect-error Native tests share this canonical TypeScript source.
import {calculatePositionAllocation,requirePositionAllocationDraft,type PositionAllocationDraft} from './position-allocation.ts';
// @ts-expect-error Native tests share this canonical TypeScript source.
import {resolvePositionInventory} from './position-inventory.ts';

/** Additive assessment: never changes v1 allocation drafts, inventory or saved results.
 * Approval evidence must be supplied by a reviewed source adapter or explicit scenario
 * assumptions. A modeled budgeted flag is never an approval source. */
export const POSITION_FINANCE_MODEL='position-finance-assessment-v1';
export type PositionFinanceEnvelope={
 version:1;basis:'unknown'|'approved-source'|'illustrative-demo';
 inventoryKey:string;asOf:string;horizonMonths:number;currency:'USD';
 reference:string|null;fundedPositionIds:string[]|null;incrementalFundingUsd:number|null;
};
/** A proposed vacant slot is not a hire. The allowance is a total incremental
 * cash assumption over the same horizon, not annual salary or realized spend. */
export type PositionAdditionProposal={
 count:number;ftePerPosition:number|null;incrementalCashAllowanceUsd:number|null;
 availableFromMonth:number|null;
};
export type PositionFinanceAssessmentInput={
 version:1;modelVersion:typeof POSITION_FINANCE_MODEL;
 allocation:PositionAllocationDraft;finance:PositionFinanceEnvelope;addition:PositionAdditionProposal;
};
const keys=(value:object,expected:string[])=>Object.keys(value).sort().join()===expected.sort().join();
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const amount=(v:unknown,max=100000000)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export const noPositionAddition=():PositionAdditionProposal=>({count:0,ftePerPosition:null,incrementalCashAllowanceUsd:null,availableFromMonth:null});
export function unknownPositionFinance(allocation:PositionAllocationDraft):PositionFinanceEnvelope{
 requirePositionAllocationDraft(allocation);
 return {version:1,basis:'unknown',inventoryKey:allocation.inventoryKey,asOf:allocation.inventory.asOf,horizonMonths:allocation.input.horizonMonths,currency:'USD',reference:null,fundedPositionIds:null,incrementalFundingUsd:null};
}
export function requirePositionFinanceAssessment(value:unknown):asserts value is PositionFinanceAssessmentInput{
 if(!object(value)||!keys(value,['version','modelVersion','allocation','finance','addition'])||value.version!==1||value.modelVersion!==POSITION_FINANCE_MODEL)throw Error('Unsupported position funding assessment.');
 requirePositionAllocationDraft(value.allocation);
 const draft=value.allocation,f=value.finance,a=value.addition,inventory=resolvePositionInventory(draft.inventory.version);
 if(!object(f)||!keys(f,['version','basis','inventoryKey','asOf','horizonMonths','currency','reference','fundedPositionIds','incrementalFundingUsd'])||f.version!==1||!['unknown','approved-source','illustrative-demo'].includes(f.basis as string))throw Error('Unsupported position funding evidence.');
 if(f.inventoryKey!==draft.inventoryKey||f.asOf!==draft.inventory.asOf||f.horizonMonths!==draft.input.horizonMonths||f.currency!=='USD')throw Error('Funding evidence must match the inventory, date, horizon and USD cost basis.');
 if(f.reference!==null&&(typeof f.reference!=='string'||!f.reference.trim()||f.reference.length>300))throw Error('Funding evidence needs a concise source reference.');
 if(!amount(f.incrementalFundingUsd))throw Error('Funding must be nonnegative or unknown.');
 const ids=f.fundedPositionIds,inventoryIds=new Set(inventory.positions.map(p=>p.id));
 if(ids!==null&&(!Array.isArray(ids)||ids.length>inventory.positions.length||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!inventoryIds.has(id))))throw Error('Funded position IDs must belong to this inventory without duplicates.');
 if(f.basis==='unknown'&&(f.reference!==null||ids!==null||f.incrementalFundingUsd!==null))throw Error('Unknown approval cannot carry an approved envelope.');
 if(f.basis!=='unknown'&&f.reference===null)throw Error('Approval or demo assumptions need a source reference.');
 if(!object(a)||!keys(a,['count','ftePerPosition','incrementalCashAllowanceUsd','availableFromMonth'])||!Number.isSafeInteger(a.count)||Number(a.count)<0||Number(a.count)>500)throw Error('Proposed positions must be a whole count between zero and 500.');
 if(!amount(a.ftePerPosition,2)||a.ftePerPosition===0||!amount(a.incrementalCashAllowanceUsd)||a.availableFromMonth!==null&&(!Number.isSafeInteger(a.availableFromMonth)||Number(a.availableFromMonth)<1||Number(a.availableFromMonth)>24))throw Error('Invalid added-position FTE, funding or timing assumption.');
 if(a.count===0&&(a.ftePerPosition!==null||a.incrementalCashAllowanceUsd!==null||a.availableFromMonth!==null))throw Error('An empty addition must not carry phantom position assumptions.');
}
/** Applied only to routes produced by the canonical allocator, not every contextual selection. */
export function positionReleaseRequirements(allocatedIds:readonly string[],positions:readonly {id:string;vacancyStatus:string|null}[]){
 const selected=new Set(allocatedIds);
 const frozenPositionIds=positions.filter(p=>selected.has(p.id)&&p.vacancyStatus==='frozen').map(p=>p.id);
 const onHoldPositionIds=positions.filter(p=>selected.has(p.id)&&p.vacancyStatus==='on-hold').map(p=>p.id);
 return {frozenPositionIds,onHoldPositionIds,approvalReasons:[...(frozenPositionIds.length?['frozen-positions']:[]),...(onHoldPositionIds.length?['on-hold-positions']:[])]};
}
export function assessPositionFinance(value:PositionFinanceAssessmentInput){
 requirePositionFinanceAssessment(value);
 const allocation=calculatePositionAllocation(value.allocation),f=value.finance,a=value.addition;
 const inventory=resolvePositionInventory(value.allocation.inventory.version);
 const allocatedIds=Object.values(allocation.routes).flat();
 const fundedIds=f.fundedPositionIds===null?null:new Set(f.fundedPositionIds);
 const unfundedPositionIds=fundedIds===null?null:allocatedIds.filter(id=>!fundedIds.has(id));
 // Scenario thaw or a cash allowance does not authorize resuming frozen/paused work.
 const {frozenPositionIds,onHoldPositionIds,approvalReasons:releaseReasons}=positionReleaseRequirements(allocatedIds,inventory.positions);
 const additionCash=a.count===0?0:a.incrementalCashAllowanceUsd;
 const requiredCash=allocation.cashTotal===null||additionCash===null?null:round(allocation.cashTotal+additionCash);
 const fundingRemaining=f.incrementalFundingUsd===null||requiredCash===null?null:round(f.incrementalFundingUsd-requiredCash);
 const approvalReasons:string[]=[];
 if(a.count>0)approvalReasons.push('new-positions');
 if(unfundedPositionIds?.length)approvalReasons.push('positions-outside-funded-envelope');
 approvalReasons.push(...releaseReasons);
 if(fundingRemaining!==null&&fundingRemaining<0)approvalReasons.push('funding-exceeded');
 const unknowns:string[]=[];
 if(f.basis==='unknown')unknowns.push('approval-source');
 if(fundedIds===null)unknowns.push('funded-positions');
 if(f.incrementalFundingUsd===null)unknowns.push('funding-amount');
 if(requiredCash===null)unknowns.push('scenario-cost');
 if(a.count>0&&a.ftePerPosition===null)unknowns.push('added-position-fte');
 if(a.count>0&&a.availableFromMonth===null)unknowns.push('added-position-timing');
 const status=!allocation.valid?'invalid-scenario':approvalReasons.length?'approval-required':unknowns.length?'funding-unknown':f.basis==='illustrative-demo'?'within-demo-envelope':'within-supplied-approved-envelope';
 return {modelVersion:POSITION_FINANCE_MODEL,status,approvalReasons,unknowns,allocation,
  evidence:structuredClone(f),allocatedPositionCount:allocatedIds.length,fundedPositionCount:fundedIds?.size??null,unfundedPositionIds,frozenPositionIds,onHoldPositionIds,
  existingAllocationCashUsd:allocation.cashTotal,proposedAdditionCashAllowanceUsd:additionCash,requiredCashUsd:requiredCash,fundingRemainingUsd:fundingRemaining,
  proposedAddition:{positions:a.count,positionFte:a.count===0?0:a.ftePerPosition===null?null:round(a.count*a.ftePerPosition),availableFromMonth:a.availableFromMonth,filledPositions:0,readyFte:0,approval:a.count>0?'required' as const:'not-applicable' as const},
  baselineInventoryUnchanged:true as const,
 };
}
