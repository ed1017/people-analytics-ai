import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native tests share this canonical TypeScript source.
import {POSITION_ALLOCATION_LEDGER_FIELD,readPositionScenarioLedger,type PositionScenarioCapture} from './position-allocation-store.ts';
// @ts-expect-error Native tests share this canonical TypeScript source.
import {requirePositionAllocationDraft,type PositionAllocationDraft} from './position-allocation.ts';
// @ts-expect-error Native tests share this canonical TypeScript source.
import {assessPositionFinance,requirePositionFinanceAssessment,type PositionFinanceAssessmentInput,type PositionFinanceEnvelope,type PositionAdditionProposal} from './position-finance-assessment.ts';

export const POSITION_FINANCE_LEDGER_FIELD='planning.positionFinanceScenariosV1';
export const MAX_POSITION_FINANCE_CAPTURES=20;
/** Exact serialized draft identity, not a short hash or an authenticity claim. */
export function positionAllocationSignature(draft:PositionAllocationDraft){requirePositionAllocationDraft(draft);return JSON.stringify(draft);}
function summary(input:PositionFinanceAssessmentInput){const {allocation:_,evidence:__,...result}=assessPositionFinance(input);return result;}
export type PositionFinanceCapture={
 scenarioId:string;allocationRevision:number;allocationSignature:string;revision:number;sequence:number;savedAt:string;
 finance:PositionFinanceEnvelope;addition:PositionAdditionProposal;result:ReturnType<typeof summary>;
};
export type PositionFinanceLedger={version:1;datasetToken:string;goalId:string;records:PositionFinanceCapture[]};
export const emptyPositionFinanceLedger=(datasetToken:string,goalId:string):PositionFinanceLedger=>({version:1,datasetToken,goalId,records:[]});
const exactKeys=(value:object,expected:string[])=>Object.keys(value).sort().join()===expected.sort().join();
function validAt(at:unknown):at is string{return typeof at==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)&&Number.isFinite(Date.parse(at))&&new Date(at).toISOString()===at;}
function assessment(allocation:PositionScenarioCapture,finance:PositionFinanceEnvelope,addition:PositionAdditionProposal):PositionFinanceAssessmentInput {
 return {version:1,modelVersion:'position-finance-assessment-v1',allocation:allocation.draft,finance,addition};
}
/** Every record must resolve to a verified v1 allocation in this same goal/dataset.
 * Missing extension means old saves; malformed extensions are never defaulted away. */
export function readPositionFinanceLedger(raw:unknown,datasetToken:string,goalId:string,allocationRaw:unknown):PositionFinanceLedger|null{
 try{
  const allocations=readPositionScenarioLedger(allocationRaw,datasetToken,goalId);if(!allocations)return null;
  if(raw===undefined)return emptyPositionFinanceLedger(datasetToken,goalId);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const ledger=raw as PositionFinanceLedger;
  if(!exactKeys(ledger,['version','datasetToken','goalId','records'])||ledger.version!==1||ledger.datasetToken!==datasetToken||ledger.goalId!==goalId||!Array.isArray(ledger.records)||ledger.records.length>MAX_POSITION_FINANCE_CAPTURES)return null;
  let sequence=0;const revisions=new Map<string,number>();
  for(const row of ledger.records){
   if(!row||typeof row!=='object'||Array.isArray(row)||!exactKeys(row,['scenarioId','allocationRevision','allocationSignature','revision','sequence','savedAt','finance','addition','result'])||row.sequence!==++sequence||row.revision!==(revisions.get(row.scenarioId)??0)+1||!validAt(row.savedAt))return null;
   const allocation=allocations.records.find(r=>r.scenarioId===row.scenarioId&&r.revision===row.allocationRevision);
   if(!allocation||row.allocationSignature!==positionAllocationSignature(allocation.draft))return null;
   const input=assessment(allocation,row.finance,row.addition);requirePositionFinanceAssessment(input);
   // Browser records and portable imports are not an authenticated Finance source.
   if(input.finance.basis==='approved-source')return null;
   const result=summary(input);if(result.status==='invalid-scenario'||JSON.stringify(row.result)!==JSON.stringify(result))return null;
   revisions.set(row.scenarioId,row.revision);
  }
  return structuredClone(ledger);
 }catch{return null;}
}
/** No fallback from another allocation revision. A legacy allocation has no Finance evidence. */
export function positionFinanceForAllocation(ledger:PositionFinanceLedger,scenarioId:string,allocationRevision:number){
 return structuredClone(ledger.records.filter(row=>row.scenarioId===scenarioId&&row.allocationRevision===allocationRevision).at(-1)??null);
}
export type BuildPositionFinanceOptions={
 datasetToken:string;goalId:string;at:string;scenarioId:string;allocationRevision:number;allocationSignature:string;
 input:PositionFinanceAssessmentInput;baseFinanceRevision?:number;
};
/** Reusable transaction builder. The caller may pass a candidate v1 ledger from the
 * same transaction, then merge this patch atomically; no v1 fields are returned. */
export function buildPositionFinanceCapture(fields:Record<string,Json>,options:BuildPositionFinanceOptions){
 const {datasetToken,goalId,at,scenarioId,allocationRevision,allocationSignature,input,baseFinanceRevision=0}=options;
 requirePositionFinanceAssessment(input);
 if(input.finance.basis==='approved-source')throw Error('Verified Finance approval cannot be created from browser assumptions or imported records.');
 if(!validAt(at))throw Error('Invalid Finance comparison timestamp.');
 if(!Number.isSafeInteger(baseFinanceRevision)||baseFinanceRevision<0)throw Error('Invalid Finance comparison revision.');
 const allocations=readPositionScenarioLedger(fields[POSITION_ALLOCATION_LEDGER_FIELD],datasetToken,goalId);
 if(!allocations)throw Error('Saved position scenarios cannot be verified. Existing work was retained.');
 const allocation=allocations.records.find(row=>row.scenarioId===scenarioId&&row.revision===allocationRevision);
 if(!allocation||allocationSignature!==positionAllocationSignature(allocation.draft)||positionAllocationSignature(input.allocation)!==allocationSignature)throw Error('This comparison does not match the saved allocation. Reopen the intended revision.');
 const ledger=readPositionFinanceLedger(fields[POSITION_FINANCE_LEDGER_FIELD],datasetToken,goalId,fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 if(!ledger)throw Error('Saved Finance comparisons cannot be verified. Existing work was retained.');
 const latest=ledger.records.filter(row=>row.scenarioId===scenarioId).at(-1);
 if((latest?.revision??0)!==baseFinanceRevision)throw Error('This scenario has a newer Finance comparison. Reopen it before saving.');
 const result=summary(input);if(result.status==='invalid-scenario')throw Error('Resolve allocation errors before saving the Finance comparison.');
 if(latest&&latest.allocationRevision===allocationRevision&&JSON.stringify(latest.finance)===JSON.stringify(input.finance)&&JSON.stringify(latest.addition)===JSON.stringify(input.addition))return {patch:{[POSITION_FINANCE_LEDGER_FIELD]:ledger as unknown as Json},capture:structuredClone(latest)};
 if(ledger.records.length>=MAX_POSITION_FINANCE_CAPTURES)throw Error('The 20-revision Finance comparison limit has been reached. Back up your work; existing comparisons were retained.');
 const capture:PositionFinanceCapture={scenarioId,allocationRevision,allocationSignature,revision:(latest?.revision??0)+1,sequence:ledger.records.length+1,savedAt:at,finance:structuredClone(input.finance),addition:structuredClone(input.addition),result};
 return {patch:{[POSITION_FINANCE_LEDGER_FIELD]:{...ledger,records:[...ledger.records,capture]} as unknown as Json},capture:structuredClone(capture)};
}
/** Save only the additive comparison; the referenced allocation must already exist. */
export function savePositionFinanceScenario(options:BuildPositionFinanceOptions&{store:DecisionStore;goal:string;revision:number}){
 const {store,datasetToken,goalId,goal,revision,at}=options;
 if(store.getDatasetToken()!==datasetToken)throw Error('The dataset changed. Reopen the original position workspace.');
 let capture:PositionFinanceCapture|null=null;
 const build=(fields:Record<string,Json>)=>{const next=buildPositionFinanceCapture(fields,options);capture=next.capture;return next.patch;};
 if(goalId)store.commitGoalFields(goalId,goal,revision,at,build);else store.commitExplorationFields(revision,at,build);
 return structuredClone(capture!);
}
