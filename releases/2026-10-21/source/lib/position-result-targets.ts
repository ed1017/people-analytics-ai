import type {DecisionStore,Json} from './local-decisions';
// @ts-expect-error Native tests share canonical TypeScript source.
import {prepareGoalProgressWrite,type ProgressWriteTicket} from './goal-progress-store.ts';
// @ts-expect-error Native tests share canonical TypeScript source.
import {progressDay} from './goal-progress.ts';
// @ts-expect-error Native tests share canonical TypeScript source.
import {POSITION_ALLOCATION_LEDGER_FIELD,readPositionScenarioLedger} from './position-allocation-store.ts';
// @ts-expect-error Native tests share canonical TypeScript source.
import {POSITION_FINANCE_LEDGER_FIELD,readPositionFinanceLedger,positionAllocationSignature} from './position-finance-store.ts';
import {validDatasetToken} from './dataset-identity.mjs';

export const POSITION_RESULT_TARGETS_FIELD='planning.positionResultTargetsV1';
export const positionReadyDefinition='Qualified and allocated FTE ready in the selected existing vacant positions on the measurement date. Count only evidenced staffing readiness, not hiring intentions, training attendance, redesigned unstaffed positions, or proposed additional positions.';
export type PositionResultTarget={planId:string;planNumber:number;revision:number;datasetToken:string;metric:'position-ready-fte';definition:string;unit:'FTE';population:string;value:number;date:string;startDate:null;measurementId:null;illustrative:true;provenance:string;position:{scenarioId:string;allocationRevision:number;allocationSignature:string;financeRevision:number|null;financeSignature:string|null;inventoryKey:string}};
export type PositionResultSelection={scenarioId:string;allocationRevision:number;financeRevision:number|null;date:string};
type Link={id:string;createdAt:string;target:PositionResultTarget};
type Ledger={version:1;datasetToken:string;goalId:string;links:Link[]};
export type PositionResultTicket={write:ProgressWriteTicket;selection:PositionResultSelection;target:PositionResultTarget};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const assert=(v:unknown,m:string):void=>{if(!v)throw Error(m);};
const exact=(v:unknown,k:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===k.sort().join();
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
export const positionFteAmount=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000&&Math.abs(v*100-Math.round(v*100))<1e-8;
export function requirePositionResultTarget(raw:unknown):asserts raw is PositionResultTarget{
 assert(exact(raw,['planId','planNumber','revision','datasetToken','metric','definition','unit','population','value','date','startDate','measurementId','illustrative','provenance','position']),'Unsupported position result target.');
 const v=raw as PositionResultTarget,b=v.position;
 assert(id(v.planId)&&v.planId.startsWith('position-result-')&&Number.isSafeInteger(v.planNumber)&&v.planNumber>0&&Number.isSafeInteger(v.revision)&&v.revision>0&&validDatasetToken(v.datasetToken),'Invalid position result identity.');
 assert(v.metric==='position-ready-fte'&&v.definition===positionReadyDefinition&&v.unit==='FTE'&&text(v.population,1000)&&positionFteAmount(v.value)&&progressDay(v.date)&&v.startDate===null&&v.measurementId===null&&v.illustrative===true&&text(v.provenance,500),'Invalid position measurement contract.');
 assert(exact(b,['scenarioId','allocationRevision','allocationSignature','financeRevision','financeSignature','inventoryKey'])&&id(b.scenarioId)&&b.allocationRevision===v.revision&&text(b.allocationSignature,100000)&&text(b.inventoryKey,100000)&&(b.financeRevision===null&&b.financeSignature===null||Number.isSafeInteger(b.financeRevision)&&Number(b.financeRevision)>0&&text(b.financeSignature,150000)),'Invalid position revision binding.');
}
function buildTarget(fields:Record<string,unknown>,datasetToken:string,goalId:string,s:PositionResultSelection,linkId:string):PositionResultTarget{
 assert(id(goalId)&&validDatasetToken(datasetToken)&&progressDay(s.date)&&Number.isSafeInteger(s.allocationRevision)&&s.allocationRevision>0&&(s.financeRevision===null||Number.isSafeInteger(s.financeRevision)&&s.financeRevision>0),'Select a saved goal, exact position revision and target date.');
 const allocations=readPositionScenarioLedger(fields[POSITION_ALLOCATION_LEDGER_FIELD],datasetToken,goalId);
 const capture=allocations?.records.find(row=>row.scenarioId===s.scenarioId&&row.revision===s.allocationRevision);
 assert(capture,'The saved position revision is unavailable.');
 const finance=readPositionFinanceLedger(fields[POSITION_FINANCE_LEDGER_FIELD],datasetToken,goalId,fields[POSITION_ALLOCATION_LEDGER_FIELD]);
 assert(finance,'Saved funding comparisons cannot be verified.');
 const funding=s.financeRevision===null?null:finance!.records.find(row=>row.scenarioId===s.scenarioId&&row.allocationRevision===s.allocationRevision&&row.revision===s.financeRevision);
 assert(s.financeRevision===null||funding,'The exact saved funding revision is unavailable.');
 const row=capture!;
 const target:PositionResultTarget={planId:linkId,planNumber:row.scenarioNumber,revision:row.revision,datasetToken,metric:'position-ready-fte',definition:positionReadyDefinition,unit:'FTE',population:`${row.draft.input.selectedIds.length} selected existing position slots; inventory ${row.draft.inventory.version}`,value:row.result.targetReadyFte,date:s.date,startDate:null,measurementId:null,illustrative:true,provenance:`Saved position scenario ${row.scenarioNumber}, revision ${row.revision}; modeled readiness at month ${row.draft.input.horizonMonths}. Target date explicitly selected for tracking.`,position:{scenarioId:row.scenarioId,allocationRevision:row.revision,allocationSignature:positionAllocationSignature(row.draft),financeRevision:s.financeRevision,financeSignature:funding?JSON.stringify(funding):null,inventoryKey:row.draft.inventoryKey}};
 requirePositionResultTarget(target);return target;
}
function readLinks(fields:Record<string,unknown>,datasetToken:string,goalId:string):Ledger{
 const raw=fields[POSITION_RESULT_TARGETS_FIELD];
 if(raw===undefined)return {version:1,datasetToken,goalId,links:[]};
 assert(exact(raw,['version','datasetToken','goalId','links']),'Saved position result links cannot be read.');
 const ledger=raw as Ledger;
 assert(ledger.version===1&&ledger.datasetToken===datasetToken&&ledger.goalId===goalId&&id(goalId)&&Array.isArray(ledger.links)&&ledger.links.length<=30&&JSON.stringify(ledger).length<=500000,'Saved position result links are invalid or full.');
 const ids=new Set<string>();let prior='';
 for(const link of ledger.links){
  assert(exact(link,['id','createdAt','target'])&&id(link.id)&&!ids.has(link.id)&&typeof link.createdAt==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(link.createdAt)&&Number.isFinite(Date.parse(link.createdAt))&&new Date(link.createdAt).toISOString()===link.createdAt&&link.createdAt>=prior,'Invalid position target link.');
  requirePositionResultTarget(link.target);assert(link.id===link.target.planId,'Position target identity changed.');
  const b=link.target.position,expected=buildTarget(fields,datasetToken,goalId,{scenarioId:b.scenarioId,allocationRevision:b.allocationRevision,financeRevision:b.financeRevision,date:link.target.date},link.id);
  assert(same(expected,link.target),'Position result target no longer matches its exact saved scenario.');ids.add(link.id);prior=link.createdAt;
 }
 return structuredClone(ledger);
}
export function listPositionResultTargets(fields:Record<string,unknown>,datasetToken:string,goalId:string){return readLinks(fields,datasetToken,goalId).links.map(link=>link.target);}
export function preparePositionResultTarget(store:DecisionStore,selection:PositionResultSelection):PositionResultTicket{
 const write=prepareGoalProgressWrite(store,store.getDatasetToken()),fields=store.getSnapshot().data.workspaces[write.goalId]?.fields??{};
 readLinks(fields,write.datasetToken,write.goalId);
 return {write,selection:structuredClone(selection),target:buildTarget(fields,write.datasetToken,write.goalId,selection,'position-result-pending')};
}
export function commitPositionResultTarget(store:DecisionStore,ticket:PositionResultTicket,at:string,idSuffix:string):PositionResultTarget{
 assert(same(preparePositionResultTarget(store,ticket.selection),ticket),'Goal, dataset or saved scenario changed. Review the target again.');
 const fields=store.getSnapshot().data.workspaces[ticket.write.goalId]?.fields??{},ledger=readLinks(fields,ticket.write.datasetToken,ticket.write.goalId);
 const existing=ledger.links.find(link=>same({...link.target,planId:'position-result-pending'},ticket.target));if(existing)return existing.target;
 const linkId='position-result-'+idSuffix;assert(id(linkId)&&ledger.links.length<30,'The target identity is invalid or the 30-target limit was reached.');
 const target={...ticket.target,planId:linkId};ledger.links.push({id:linkId,createdAt:at,target});
 readLinks({...fields,[POSITION_RESULT_TARGETS_FIELD]:ledger},ticket.write.datasetToken,ticket.write.goalId);
 store.commitGoalFields(ticket.write.goalId,ticket.write.goal,ticket.write.decisionRevision,at,()=>({[POSITION_RESULT_TARGETS_FIELD]:ledger as unknown as Json}));return structuredClone(target);
}
