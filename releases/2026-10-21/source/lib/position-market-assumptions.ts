import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native tests share canonical TypeScript.
import {requirePositionAllocationDraft,type PositionAllocationDraft} from './position-allocation.ts';
// @ts-expect-error Native tests share canonical TypeScript.
import {resolvePositionInventory,positionInventoryKey} from './position-inventory.ts';
// @ts-expect-error Native tests share canonical TypeScript.
import {POSITION_ALLOCATION_DRAFT_FIELD,readPositionScenarioLedger,type PositionScenarioCapture} from './position-allocation-store.ts';
import {marketEvidence} from './oews-reference.mjs';
import {validDatasetToken} from './dataset-identity.mjs';

export const POSITION_MARKET_FIELD='planning.positionMarketAssumptionsV1';
export const POSITION_MARKET_SOURCE_VERSION='oews-may2025-us-software-v1';
const softwareRoles=['Software Engineer','Backend Software Engineer','Frontend Software Engineer','Full Stack Software Engineer'];
const source=marketEvidence({soc:'15-1252',area:'99'});
export const POSITION_MARKET_REFERENCE=Object.freeze({
 version:POSITION_MARKET_SOURCE_VERSION,sourceSha256:'62bc04880b12993e9170e79efab49980a8ab909bb01cfad2d507844ba85fe85b',
 occupation:'Software Developers',occupationCode:'15-1252',taxonomy:'2018 SOC',geography:'United States',area:'99',
 period:'May 2025',currency:'USD',wageBasis:'Annual wages per occupational worker; excludes employer benefits',
 medianUsd:135980,meanUsd:148100,sourceUrl:'https://www.bls.gov/oes/special-requests/oesm25nat.zip',
});
const exact=(value:unknown,keys:string[]):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()===keys.sort().join();
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const assert=(condition:unknown,message:string):void=>{if(!condition)throw Error(message);};
const validAt=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const signature=(draft:PositionAllocationDraft)=>JSON.stringify(draft);
const cost=(wage:number,percent:number)=>Math.round((wage*(1+percent/100)+Number.EPSILON)*100)/100;
function reviewedSource(){
 assert(source&&source.currency==='USD'&&source.period===POSITION_MARKET_REFERENCE.period&&source.sourceUrl===POSITION_MARKET_REFERENCE.sourceUrl&&source.selected.OCC_CODE==='15-1252'&&source.selected.AREA==='99'&&source.selected.A_MEDIAN===135980&&source.selected.A_MEAN===148100,'The reviewed market source changed.');
 return POSITION_MARKET_REFERENCE;
}
function eligibleScope(inventoryVersion:string,inventoryKey:string,selectedIds:readonly string[]){
 assert(inventoryVersion==='company-position-model-v2','Choose US software vacancies in the company register.');
 const inventory=resolvePositionInventory(inventoryVersion);
 assert(inventoryKey===positionInventoryKey(inventory),'The position inventory changed.');
 assert(Array.isArray(selectedIds)&&selectedIds.length>0&&selectedIds.length<=500&&new Set(selectedIds).size===selectedIds.length,'Select position vacancies first.');
 const rows=selectedIds.map(id=>inventory.positions.find(row=>row.id===id));
 assert(rows.every(row=>row&&row.status==='vacant'&&row.location==='United States'&&softwareRoles.includes(row.role)),'Select only US software vacancies for this reference.');
 const role=rows[0]!.role;
 assert(rows.every(row=>row!.role===role),'Choose vacancies for one software role before adopting a pay reference.');
 return role;
}
export function positionMarketEligibility(draft:PositionAllocationDraft){
 try{requirePositionAllocationDraft(draft);const role=eligibleScope(draft.inventory.version,draft.inventoryKey,draft.input.selectedIds);return {eligible:true,reason:null,role,selectedIds:[...draft.input.selectedIds],reference:reviewedSource()};}
 catch(error){return {eligible:false,reason:error instanceof Error?error.message:'This position scope has no supported pay reference.',role:null,selectedIds:[],reference:null};}
}
export type PositionMarketAdoption={version:1;sourceVersion:typeof POSITION_MARKET_SOURCE_VERSION;reference:typeof POSITION_MARKET_REFERENCE;inventoryVersion:string;inventoryKey:string;selectedIds:string[];role:string;statistic:'median'|'mean';wageUsd:number;employerOncostPercent:number;annualCostUsd:number;mappingConfirmed:true;fullTimeBasisConfirmed:true;adoptedAt:string};
export type PositionMarketRecord={scenarioId:string;allocationRevision:number;allocationSignature:string;adoption:PositionMarketAdoption};
export type PositionMarketLedger={version:1;datasetToken:string;goalId:string;current:PositionMarketAdoption|null;records:PositionMarketRecord[]};
function requireAdoption(value:unknown):asserts value is PositionMarketAdoption{
 assert(exact(value,['version','sourceVersion','reference','inventoryVersion','inventoryKey','selectedIds','role','statistic','wageUsd','employerOncostPercent','annualCostUsd','mappingConfirmed','fullTimeBasisConfirmed','adoptedAt']),'Unsupported saved market assumption.');
 const a=value as PositionMarketAdoption;
 assert(a.version===1&&a.sourceVersion===POSITION_MARKET_SOURCE_VERSION&&same(a.reference,reviewedSource())&&a.mappingConfirmed===true&&a.fullTimeBasisConfirmed===true&&validAt(a.adoptedAt),'Saved market evidence cannot be verified.');
 assert(a.role===eligibleScope(a.inventoryVersion,a.inventoryKey,a.selectedIds),'Saved role mapping changed.');
 assert(['median','mean'].includes(a.statistic)&&Number.isFinite(a.employerOncostPercent)&&a.employerOncostPercent>=0&&a.employerOncostPercent<=200,'Review the wage statistic and employer-cost assumption.');
 assert(a.wageUsd===(a.statistic==='median'?a.reference.medianUsd:a.reference.meanUsd)&&a.annualCostUsd===cost(a.wageUsd,a.employerOncostPercent),'Saved market cost does not match the reviewed inputs.');
}
function matches(a:PositionMarketAdoption,draft:PositionAllocationDraft){return a.inventoryVersion===draft.inventory.version&&a.inventoryKey===draft.inventoryKey&&same([...a.selectedIds].sort(),[...draft.input.selectedIds].sort())&&a.annualCostUsd===draft.input.annualHireCostUsd;}
/** An absent extension is a compatible old save. Malformed extensions never default away. */
export function readPositionMarketLedger(raw:unknown,datasetToken:string,goalId:string,allocationRaw:unknown):PositionMarketLedger|null{
 try{
  assert(validDatasetToken(datasetToken),'Invalid dataset.');
  const allocations=readPositionScenarioLedger(allocationRaw,datasetToken,goalId);assert(allocations,'Saved allocations cannot be verified.');
  if(raw===undefined)return {version:1,datasetToken,goalId,current:null,records:[]};
  assert(exact(raw,['version','datasetToken','goalId','current','records']),'Unsupported market assumption ledger.');const ledger=raw as PositionMarketLedger;
  assert(ledger.version===1&&ledger.datasetToken===datasetToken&&ledger.goalId===goalId&&Array.isArray(ledger.records)&&ledger.records.length<=20,'Market assumptions belong to another workspace or exceed the limit.');
  if(ledger.current!==null)requireAdoption(ledger.current);
  const seen=new Set<string>();
  for(const row of ledger.records){
   assert(exact(row,['scenarioId','allocationRevision','allocationSignature','adoption']),'Unsupported saved market binding.');
   const capture=allocations!.records.find(c=>c.scenarioId===row.scenarioId&&c.revision===row.allocationRevision),key=`${row.scenarioId}:${row.allocationRevision}`;
   assert(capture&&!seen.has(key)&&row.allocationSignature===signature(capture.draft),'Market assumptions do not match the exact saved allocation.');
   requireAdoption(row.adoption);assert(matches(row.adoption,capture!.draft),'Saved allocation cost or scope no longer matches its market assumption.');seen.add(key);
  }
  return structuredClone(ledger);
 }catch{return null;}
}
export function currentPositionMarketEvidence(ledger:PositionMarketLedger|null,draft:PositionAllocationDraft){return ledger?.current&&matches(ledger.current,draft)?structuredClone(ledger.current):null;}
export function positionMarketForCapture(ledger:PositionMarketLedger|null,capture:PositionScenarioCapture){return structuredClone(ledger?.records.find(r=>r.scenarioId===capture.scenarioId&&r.allocationRevision===capture.revision&&r.allocationSignature===signature(capture.draft))?.adoption??null);}

type Options={store:DecisionStore;datasetToken:string;goalId:string};
const allocationField='planning.positionAllocationScenariosV1';
function stateFor({store,datasetToken,goalId}:Options){
 const state=store.getSnapshot();
 assert(store.getDatasetToken()===datasetToken&&validDatasetToken(datasetToken)&&state.ready&&state.saved&&!state.recovery&&state.data.goals.activeId===goalId,'The goal, dataset or saved state changed. Review again.');
 const goal=goalId?state.data.goals.goals.find(g=>g.id===goalId):null;assert(!goalId||goal,'The selected goal is unavailable.');
 const fields=(goalId?state.data.workspaces[goalId]:state.data.exploration)?.fields??{};
 const ledger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,fields[allocationField]);assert(ledger,'Saved market assumptions cannot be verified. Existing work is retained.');
 return {state,fields,ledger:ledger!,goal:goal?.statement??''};
}
export type PositionMarketTicket=Readonly<{reference:typeof POSITION_MARKET_REFERENCE;statistic:'median'|'mean';wageUsd:number;employerOncostPercent:number;annualCostUsd:number;role:string;selectedCount:number}>;
type Binding=Options&{revision:number;stateSignature:string;draft:PositionAllocationDraft};
const tickets=new WeakMap<PositionMarketTicket,Binding>();
export function preparePositionMarketAdoption(options:Options&{draft:PositionAllocationDraft;statistic:'median'|'mean';employerOncostPercent:number;mappingConfirmed:boolean;fullTimeBasisConfirmed:boolean}):PositionMarketTicket{
 const {state,fields}=stateFor(options),e=positionMarketEligibility(options.draft);
 assert(e.eligible,e.reason??'Select supported vacancies.');assert(same(fields[POSITION_ALLOCATION_DRAFT_FIELD],options.draft),'The position draft changed. Review again.');
 assert(options.mappingConfirmed===true&&options.fullTimeBasisConfirmed===true,'Confirm the role reference and full-time pay basis.');
 assert(['median','mean'].includes(options.statistic)&&Number.isFinite(options.employerOncostPercent)&&options.employerOncostPercent>=0&&options.employerOncostPercent<=200,'Enter an employer-cost percentage from 0 to 200.');
 const reference=reviewedSource(),wageUsd=options.statistic==='median'?reference.medianUsd:reference.meanUsd;
 const ticket=Object.freeze({reference,statistic:options.statistic,wageUsd,employerOncostPercent:options.employerOncostPercent,annualCostUsd:cost(wageUsd,options.employerOncostPercent),role:e.role!,selectedCount:options.draft.input.selectedIds.length});
 tickets.set(ticket,{store:options.store,datasetToken:options.datasetToken,goalId:options.goalId,revision:state.data.revision,stateSignature:JSON.stringify(state.data),draft:structuredClone(options.draft)});return ticket;
}
export function confirmPositionMarketAdoption({store,ticket,at}:{store:DecisionStore;ticket:PositionMarketTicket;at:string}):PositionAllocationDraft{
 const b=tickets.get(ticket);assert(b&&b.store===store,'Review the market assumption again.');const {state,ledger,goal}=stateFor(b!);
 assert(state.data.revision===b!.revision&&JSON.stringify(state.data)===b!.stateSignature&&validAt(at),'The saved draft changed. Review the market assumption again.');
 const draft=structuredClone(b!.draft);draft.input.annualHireCostUsd=ticket.annualCostUsd;
 const adoption:PositionMarketAdoption={version:1,sourceVersion:POSITION_MARKET_SOURCE_VERSION,reference:reviewedSource(),inventoryVersion:draft.inventory.version,inventoryKey:draft.inventoryKey,selectedIds:[...draft.input.selectedIds],role:ticket.role,statistic:ticket.statistic,wageUsd:ticket.wageUsd,employerOncostPercent:ticket.employerOncostPercent,annualCostUsd:ticket.annualCostUsd,mappingConfirmed:true,fullTimeBasisConfirmed:true,adoptedAt:at};requireAdoption(adoption);
 const patch={[POSITION_ALLOCATION_DRAFT_FIELD]:draft as unknown as Json,[POSITION_MARKET_FIELD]:{...ledger,current:adoption} as unknown as Json};
 if(b!.goalId)store.commitGoalFields(b!.goalId,goal,b!.revision,at,()=>patch);else store.commitExplorationFields(b!.revision,at,()=>patch);
 tickets.delete(ticket);return structuredClone(draft);
}
/** Draft edits clear an incompatible current adoption, never immutable saved provenance. */
export function updatePositionMarketDraft(options:Options&{draft:PositionAllocationDraft;restoreCapture?:PositionScenarioCapture}):PositionAllocationDraft{
 const {store}=options;requirePositionAllocationDraft(options.draft);const {state,ledger,goal,fields}=stateFor(options);
 let current=currentPositionMarketEvidence(ledger,options.draft);
 if(options.restoreCapture){
  const saved=readPositionScenarioLedger(fields[allocationField],options.datasetToken,options.goalId)?.records.find(c=>c.scenarioId===options.restoreCapture!.scenarioId&&c.revision===options.restoreCapture!.revision);
  assert(saved&&same(saved,options.restoreCapture)&&same(saved.draft,options.draft),'The saved revision changed. Reopen it again.');current=positionMarketForCapture(ledger,saved!);
 }
 const patch:Record<string,Json>={[POSITION_ALLOCATION_DRAFT_FIELD]:structuredClone(options.draft) as unknown as Json};
 if(fields[POSITION_MARKET_FIELD]!==undefined)patch[POSITION_MARKET_FIELD]={...ledger,current} as unknown as Json;
 const at=new Date().toISOString();if(options.goalId)store.commitGoalFields(options.goalId,goal,state.data.revision,at,()=>patch);else store.commitExplorationFields(state.data.revision,at,()=>patch);
 return structuredClone(options.draft);
}
/** Called inside the existing allocation save transaction. */
export function capturePositionMarketPatch(fields:Record<string,Json>,datasetToken:string,goalId:string,capture:PositionScenarioCapture,nextAllocationRaw:unknown):Record<string,Json>{
 const ledger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,fields[allocationField]);assert(ledger,'Saved market assumptions cannot be verified.');
 if(fields[POSITION_MARKET_FIELD]===undefined)return {};
 const adoption=currentPositionMarketEvidence(ledger,capture.draft),existing=ledger!.records.find(r=>r.scenarioId===capture.scenarioId&&r.allocationRevision===capture.revision);
 // Existing immutable records cannot acquire a later adoption under the same revision.
 if(existing)assert(same(existing.adoption,adoption),'Review the changed market assumption as a new revision.');
 const records=existing||!adoption?ledger!.records:[...ledger!.records,{scenarioId:capture.scenarioId,allocationRevision:capture.revision,allocationSignature:signature(capture.draft),adoption}];
 const next={...ledger!,current:adoption,records};assert(readPositionMarketLedger(next,datasetToken,goalId,nextAllocationRaw),'Market binding could not be saved.');return {[POSITION_MARKET_FIELD]:next as unknown as Json};
}
export function positionMarketCaptureUnchanged(fields:Record<string,Json>,datasetToken:string,goalId:string,capture:PositionScenarioCapture){
 const ledger=readPositionMarketLedger(fields[POSITION_MARKET_FIELD],datasetToken,goalId,fields[allocationField]);assert(ledger,'Saved market assumptions cannot be verified.');
 return same(currentPositionMarketEvidence(ledger,capture.draft),positionMarketForCapture(ledger,capture));
}
