import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native tests share this canonical TypeScript source.
import {calculatePositionAllocation,requirePositionAllocationDraft,type PositionAllocationDraft,type PositionAllocationResult} from './position-allocation.ts';
// @ts-expect-error Native tests share this canonical TypeScript source.
import {capturePositionMarketPatch,positionMarketCaptureUnchanged} from './position-market-assumptions.ts';
export const POSITION_ALLOCATION_LEDGER_FIELD='planning.positionAllocationScenariosV1';
export const POSITION_ALLOCATION_DRAFT_FIELD='planning.positionAllocationDraftV1';
export const MAX_POSITION_CAPTURES=20;
export type PositionScenarioCapture={scenarioId:string;scenarioNumber:number;revision:number;sequence:number;savedAt:string;draft:PositionAllocationDraft;result:PositionAllocationResult};
export type PositionScenarioLedger={version:1;datasetToken:string;goalId:string;records:PositionScenarioCapture[]};
export const emptyPositionScenarioLedger=(datasetToken:string,goalId:string):PositionScenarioLedger=>({version:1,datasetToken,goalId,records:[]});
export function readPositionScenarioLedger(raw:unknown,datasetToken:string,goalId:string):PositionScenarioLedger|null {
 if(raw===undefined)return emptyPositionScenarioLedger(datasetToken,goalId);
 try{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const ledger=raw as PositionScenarioLedger;
  if(Object.keys(ledger).sort().join()!==['version','datasetToken','goalId','records'].sort().join()||ledger.version!==1||ledger.datasetToken!==datasetToken||ledger.goalId!==goalId||!Array.isArray(ledger.records)||ledger.records.length>MAX_POSITION_CAPTURES)return null;
  const revisions=new Map<string,number>(),numbers=new Map<string,number>();let sequence=0;
  for(const row of ledger.records){
   if(!row||Object.keys(row).sort().join()!==['scenarioId','scenarioNumber','revision','sequence','savedAt','draft','result'].sort().join()||typeof row.scenarioId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(row.scenarioId)||row.revision!==(revisions.get(row.scenarioId)??0)+1||row.sequence!==++sequence||typeof row.savedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(row.savedAt)||!Number.isFinite(Date.parse(row.savedAt)))return null;
   requirePositionAllocationDraft(row.draft);const result=calculatePositionAllocation(row.draft);
   if(!result.valid||JSON.stringify(row.result)!==JSON.stringify(result))return null;
   if(row.scenarioNumber!==(numbers.get(row.scenarioId)??numbers.size+1))return null;
   revisions.set(row.scenarioId,row.revision);numbers.set(row.scenarioId,row.scenarioNumber);
  }
  return structuredClone(ledger);
 }catch{return null;}
}
/** Immutable snapshot transaction, shared dataset/goal envelope and backup channel; no scenario rebasing. */
export function savePositionScenario({store,datasetToken,goalId,goal,revision,at,draft,scenarioId,baseRevision=0}:{store:DecisionStore;datasetToken:string;goalId:string;goal:string;revision:number;at:string;draft:PositionAllocationDraft;scenarioId:string;baseRevision?:number}){
 if(store.getDatasetToken()!==datasetToken)throw Error('The dataset changed. Reopen the scenario in its original workspace.');
 requirePositionAllocationDraft(draft);const result=calculatePositionAllocation(draft);
 if(!result.valid)throw Error(result.errors.join(' '));
 if(!/^[a-zA-Z0-9-]{1,80}$/.test(scenarioId))throw Error('Invalid scenario identity.');
 let capture:PositionScenarioCapture|null=null;
 const build=(fields:Record<string,Json>):Record<string,Json>=>{
  const ledger=readPositionScenarioLedger(fields[POSITION_ALLOCATION_LEDGER_FIELD],datasetToken,goalId);
  if(!ledger)throw Error('Saved position scenarios are unsupported or damaged. Existing records were retained.');
  const latest=ledger.records.filter(row=>row.scenarioId===scenarioId).at(-1);
  if((latest?.revision??0)!==baseRevision)throw Error('This scenario has a newer saved revision. Reopen it or save a separate scenario.');
  if(latest&&JSON.stringify(latest.draft)===JSON.stringify(draft)&&positionMarketCaptureUnchanged(fields,datasetToken,goalId,latest)){capture=latest;return {[POSITION_ALLOCATION_LEDGER_FIELD]:ledger as unknown as Json,...capturePositionMarketPatch(fields,datasetToken,goalId,latest,ledger)};}
  if(ledger.records.length>=MAX_POSITION_CAPTURES)throw Error('The 20-revision position scenario limit has been reached. Back up your saved work; existing scenarios were retained.');
  capture={scenarioId,scenarioNumber:latest?.scenarioNumber??new Set(ledger.records.map(row=>row.scenarioId)).size+1,revision:(latest?.revision??0)+1,sequence:ledger.records.length+1,savedAt:at,draft:structuredClone(draft),result:structuredClone(result)};
  const next={...ledger,records:[...ledger.records,capture]};
  return {[POSITION_ALLOCATION_LEDGER_FIELD]:next as unknown as Json,[POSITION_ALLOCATION_DRAFT_FIELD]:structuredClone(draft) as unknown as Json,...capturePositionMarketPatch(fields,datasetToken,goalId,capture,next)};
 };
 if(goalId)store.commitGoalFields(goalId,goal,revision,at,build);else store.commitExplorationFields(revision,at,build);
 return structuredClone(capture!);
}
