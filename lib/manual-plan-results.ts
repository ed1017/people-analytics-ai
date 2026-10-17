/** Browser-local, manually reported results. No ingestion, assessment or model calls. */
import type {DecisionStore,Json} from './local-decisions';
import type {PlanAlternative} from './home-plan-alternatives';
// @ts-expect-error Native Node tests share TypeScript source.
import {readPlanAlternatives,planAlternativesField} from './home-plan-alternatives.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {guidedPlanTarget} from './guided-plan-summary.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {goalProgressField,readGoalProgressLedger,HEADCOUNT_DEFINITION,progressDay} from './goal-progress.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {prepareGoalProgressWrite,type ProgressWriteTicket} from './goal-progress-store.ts';
import {validDatasetToken} from './dataset-identity.mjs';

export const manualPlanResultsField='manualPlanResultsV1';
export const roleResultDefinition='Additional whole roles beyond the starting workforce, each with 1 qualified, allocated FTE in this unit and role. Count only roles supported by dated proficiency, allocation and release or hire-start evidence. Training completion alone does not count.';
export type ResultTarget={
 planId:string;planNumber:number;revision:number;inputKey:string;evidenceDigest:string;datasetToken:string;
 metric:'headcount'|'additional-role-coverage';definition:string;unit:'people'|'roles';population:string;
 value:number;date:string;startDate:string|null;measurementId:string|null;illustrative:boolean;provenance:string;
};
export type ManualResult={id:string;targetId:string;recordedAt:string;measuredOn:string;value:number|null;sourceNote:string;supersedes:string|null;scopeConfirmed:true};
export type ManualResults={version:1;goalId:string;targets:Array<{id:string;target:ResultTarget}>;entries:ManualResult[]};
export type ResultInput={measuredOn:string;value:number|null;sourceNote:string;supersedes:string|null;scopeConfirmed:boolean};
export type ResultTicket={write:ProgressWriteTicket;target:ResultTarget};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const must=(value:unknown,message:string):void=>{if(!value)throw Error(message);};
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const id=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const amount=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=1e9;
const instant=(v:unknown):v is string=>typeof v==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v.slice(0,10);
function exact(v:unknown,keys:string[]):asserts v is Record<string,unknown>{must(!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join(),'Unsupported saved result fields.');}
function validateTarget(v:unknown):asserts v is ResultTarget{
 exact(v,['planId','planNumber','revision','inputKey','evidenceDigest','datasetToken','metric','definition','unit','population','value','date','startDate','measurementId','illustrative','provenance']);
 must(id(v.planId)&&Number.isSafeInteger(v.planNumber)&&Number(v.planNumber)>0&&Number.isSafeInteger(v.revision)&&Number(v.revision)>0&&text(v.inputKey,50000)&&typeof v.evidenceDigest==='string'&&/^[a-f0-9]{64}$/.test(v.evidenceDigest)&&validDatasetToken(v.datasetToken),'Exact saved plan identity required.');
 must(text(v.population,1000)&&amount(v.value)&&progressDay(v.date)&&(v.startDate===null||progressDay(v.startDate)&&v.startDate<=v.date)&&typeof v.illustrative==='boolean'&&text(v.provenance,500),'Incomplete target scope, value or date.');
 must(v.metric==='headcount'&&v.definition===HEADCOUNT_DEFINITION&&v.unit==='people'&&id(v.measurementId)&&v.startDate===null||v.metric==='additional-role-coverage'&&v.definition===roleResultDefinition&&v.unit==='roles'&&v.measurementId===null&&progressDay(v.startDate),'Unsupported measurement contract. Percentages, rates and period totals require their own definition and period contract.');
}

/** Free-text targets are deliberately not parsed into numeric measurements. */
export function resultTarget(plan:PlanAlternative,fields:Record<string,unknown>,datasetToken:string,goalId:string):{target:ResultTarget|null;reason:string|null}{
 const base={planId:plan.id,planNumber:plan.number,revision:plan.draft.revision,inputKey:plan.result.inputKey,evidenceDigest:plan.draft.binding.evidenceDigest,datasetToken};
 try{
  const guided=guidedPlanTarget(plan.draft);
  if(guided&&guided.population&&guided.unit&&guided.role){
   const population=guided.population===`${guided.unit} / ${guided.role}`?guided.population:`${guided.population}; unit: ${guided.unit}; role: ${guided.role}`;
   const target:ResultTarget={...base,metric:'additional-role-coverage',definition:roleResultDefinition,unit:'roles',population,value:guided.roles,date:guided.deadline,startDate:plan.draft.inputs.scope.startMonth.value+'-01',measurementId:null,illustrative:true,provenance:'Saved guided scenario assumption. This is not a verified business target or an observed outcome.'};
   validateTarget(target);return {target,reason:null};
  }
  const ledger=readGoalProgressLedger(fields[goalProgressField],goalId);
  // Bind to the measurement in force when this exact plan link was recorded.
  const index=ledger.events.findLastIndex(e=>e.kind==='plan-linked'&&e.data.planId===plan.id&&e.data.revision===plan.draft.revision&&e.data.inputKey===plan.result.inputKey&&e.data.evidenceDigest===plan.draft.binding.evidenceDigest&&e.data.datasetToken===datasetToken);
  const measurement=ledger.events.slice(0,index<0?0:index).findLast(e=>e.kind==='measurement');
  if(measurement?.kind==='measurement'&&measurement.data.metric==='headcount'&&measurement.data.definition===HEADCOUNT_DEFINITION&&measurement.data.unit==='people'){
   const m=measurement.data,target:ResultTarget={...base,metric:'headcount',definition:m.definition,unit:'people',population:`Country: ${m.scope.country}; organization: ${m.scope.org}; level: ${m.scope.level}`,value:m.target.value,date:m.target.date,startDate:null,measurementId:measurement.id,illustrative:ledger.origin==='demo',provenance:m.provenance};
   validateTarget(target);return {target,reason:null};
  }
 }catch{return {target:null,reason:'The saved measurement or plan could not be read safely. Existing records are retained.'};}
 return {target:null,reason:'Recording is available for guided role-coverage targets and explicitly linked point-in-time headcount targets. This plan has no supported numeric target with a defined population, unit and measurement date. Free-text targets, percentages, rates and period totals cannot be compared here.'};
}

function validateEntry(entry:unknown,ledger:ManualResults){
 exact(entry,['id','targetId','recordedAt','measuredOn','value','sourceNote','supersedes','scopeConfirmed']);
 must(id(entry.id)&&id(entry.targetId)&&instant(entry.recordedAt)&&progressDay(entry.measuredOn)&&entry.measuredOn<=String(entry.recordedAt).slice(0,10)&&(entry.value===null||amount(entry.value))&&text(entry.sourceNote,600)&&entry.scopeConfirmed===true&&(entry.supersedes===null||id(entry.supersedes)),'Enter a whole-number result (or explicitly unknown), a non-future measurement date, a source note, and confirm the definition and population.');
 must(ledger.targets.some(t=>t.id===entry.targetId)&&!ledger.entries.some(e=>e.id===entry.id),'Result target is missing or entry identity is duplicated.');
 must(!ledger.entries.length||Date.parse(String(entry.recordedAt))>=Date.parse(ledger.entries.at(-1)!.recordedAt),'Recording times must append in order.');
 const active=ledger.entries.filter(e=>!ledger.entries.some(next=>next.supersedes===e.id));
 if(entry.supersedes){const old=active.find(e=>e.id===entry.supersedes);must(old&&old.targetId===entry.targetId,'A correction must refer to a current entry for this exact plan target.');}
 must(!active.some(e=>e.id!==entry.supersedes&&e.targetId===entry.targetId&&e.measuredOn===entry.measuredOn),'A result already exists for this date. Use Correct entry to preserve its history.');
}
export function readManualResults(raw:unknown,goalId:string):ManualResults{
 if(raw===undefined||raw===null)return {version:1,goalId,targets:[],entries:[]};
 exact(raw,['version','goalId','targets','entries']);
 must(raw.version===1&&raw.goalId===goalId&&id(goalId)&&Array.isArray(raw.targets)&&raw.targets.length<=30&&Array.isArray(raw.entries)&&raw.entries.length<=100&&new TextEncoder().encode(JSON.stringify(raw)).length<=220000,'Saved result history is invalid or full. It has not been removed.');
 const ledger:ManualResults={version:1,goalId,targets:[],entries:[]};
 for(const saved of raw.targets as ManualResults['targets']){exact(saved,['id','target']);validateTarget(saved.target);must(id(saved.id)&&!ledger.targets.some(t=>t.id===saved.id||same(t.target,saved.target)),'Duplicate result target.');ledger.targets.push(structuredClone(saved));}
 for(const entry of raw.entries as ManualResult[]){validateEntry(entry,ledger);ledger.entries.push(structuredClone(entry));}
 return ledger;
}
export function activeResults(ledger:ManualResults,target:ResultTarget){
 const saved=ledger.targets.find(t=>same(t.target,target));
 return ledger.entries.filter(e=>e.targetId===saved?.id&&!ledger.entries.some(next=>next.supersedes===e.id)).sort((a,b)=>a.measuredOn.localeCompare(b.measuredOn)||a.recordedAt.localeCompare(b.recordedAt));
}
/** Only a matching point-in-time date gets a difference. Missing is never zero. */
export function resultDifference(target:ResultTarget,entry:Pick<ManualResult,'value'|'measuredOn'>){
 validateTarget(target);
 must(progressDay(entry.measuredOn)&&(entry.value===null||amount(entry.value)),'Invalid point-in-time result.');
 if(entry.value===null)return {difference:null,note:'Result is unknown; no difference calculated.'};
 if(entry.measuredOn<target.date)return {difference:null,note:'Interim measurement. The target date has not been measured; no end-date difference calculated.'};
 if(entry.measuredOn>target.date)return {difference:null,note:'Measured after the target date; no end-date difference calculated.'};
 return {difference:entry.value-target.value,note:'Reported result minus saved target. This does not verify delivery, completion or the effect of the plan.'};
}
export function prepareManualResult(store:DecisionStore,planId:string):ResultTicket{
 const write=prepareGoalProgressWrite(store,store.getDatasetToken()),fields=store.getSnapshot().data.workspaces[write.goalId]?.fields??{};
 const catalog=readPlanAlternatives(fields[planAlternativesField],{goalId:write.goalId,goal:write.goal});
 const plan=catalog?.plans.find(p=>p.id===planId&&!p.deleted&&catalog.attachments.some(a=>a.planId===p.id));
 if(!plan)throw Error('Select an attached saved plan before recording a result.');
 const eligible=resultTarget(plan,fields,write.datasetToken,write.goalId);if(!eligible.target)throw Error(eligible.reason!);
 readManualResults(fields[manualPlanResultsField],write.goalId);
 return {write,target:eligible.target};
}
export function commitManualResult(store:DecisionStore,ticket:ResultTicket,input:ResultInput,at:string,entryId:string){
 const fresh=prepareManualResult(store,ticket.target.planId);
 must(same(fresh,ticket),'The saved goal, plan, target or dataset changed. Close this form and review the current plan again.');
 // Validate user input before entering the storage transaction: validation errors
 // must not mark otherwise healthy saved work as an unsaved storage failure.
 const fields=store.getSnapshot().data.workspaces[ticket.write.goalId]?.fields??{};
  const ledger=readManualResults(fields[manualPlanResultsField],ticket.write.goalId);
  let target=ledger.targets.find(t=>same(t.target,ticket.target));
  if(!target){target={id:'target-'+(ledger.targets.length+1),target:structuredClone(ticket.target)};ledger.targets.push(target);}
  const entry={id:entryId,targetId:target.id,recordedAt:at,...input,sourceNote:input.sourceNote.trim()};
  validateEntry(entry,ledger);ledger.entries.push(entry as ManualResult);
  const checked=readManualResults(ledger,ticket.write.goalId);
 return store.commitGoalFields(ticket.write.goalId,ticket.write.goal,ticket.write.decisionRevision,at,()=>({[manualPlanResultsField]:checked as unknown as Json}));
}
