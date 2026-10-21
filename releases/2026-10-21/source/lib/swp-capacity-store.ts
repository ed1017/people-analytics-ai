// Browser-local integration only. The existing DecisionStore owns all writes.
import type {DecisionStore,Json} from './local-decisions';
import type {CapacityCost} from './swp-capacity-cost';
import type {CapacityDraft} from './swp-capacity-draft';
import type {calculateMonthlyWorkload} from './swp-monthly-workload';
// @ts-expect-error Native Node tests share TypeScript source.
import {prepareCapacityRecord,readCapacityRecord,capacityRecordIsCurrent,compareCapacityRecords,type CapacityRecord,type CapacityRecordBinding} from './swp-capacity-record.ts';
import {monthlyScenarioInputKey as key} from './monthly-scenario-compatibility.mjs';
export const monthlyCapacityField='planning.monthlyWorkloadScenarios';
export type CapacityScope={id:string;label:string;workUnit:string};
export type CapacityCapture={inputKey:string;binding:CapacityRecordBinding|null};
export type CapacityCalculation={draft:CapacityDraft;result:ReturnType<typeof calculateMonthlyWorkload>|null;error:string;cost?:CapacityCost|null};
export type CapacityEntry={record:CapacityRecord;draft:CapacityDraft};
export type CapacityBucket={version:1;scopes:CapacityScope[];entries:CapacityEntry[]};
export type CapacityContext={datasetToken:string;goalId:string;goal:string};
const empty=():CapacityBucket=>({version:1,scopes:[],entries:[]});
function fail(message:string):never {throw Error(message);}
const exact=(value:unknown,fields:string[])=>{
 key(value);
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join('|')!==fields.sort().join('|'))fail('Saved capacity data has an unsupported shape.');
 return value as Record<string,unknown>;
};
function scopeValue(raw:unknown):CapacityScope {
 const s=exact(raw,['id','label','workUnit']);
 if(typeof s.id!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(s.id)||[s.label,s.workUnit].some(v=>typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>400))fail('The workload identity is invalid.');
 return s as CapacityScope;
}
/** Active identity comes from the initialized dataset store, never from record labels. */
export function capacityContext(store:DecisionStore,datasetToken:string,goalId:string):CapacityContext {
 const state=store.getSnapshot(),goal=state.data.goals.goals.find(g=>g.id===goalId);
 if(!state.ready||store.getDatasetToken()!==datasetToken||!goalId||state.data.goals.activeId!==goalId||!goal)fail('Select a saved goal in the current dataset before saving or opening scenarios.');
 return {datasetToken,goalId,goal:goal!.statement};
}
export function capacityBinding(context:CapacityContext,scope:CapacityScope):CapacityRecordBinding {
 const s=scopeValue(scope);return {...context,scopeId:s.id,scopeLabel:s.label,workUnit:s.workUnit};
}
export function readCapacityBucket(raw:unknown,context:CapacityContext):CapacityBucket {
 if(raw===undefined)return empty();
 const b=exact(raw,['version','scopes','entries']);
 if(b.version!==1||!Array.isArray(b.scopes)||!Array.isArray(b.entries)||b.scopes.length>20||b.entries.length>20)fail('Saved capacity scenarios have an unsupported version or exceed the 20-scenario limit.');
 const scopes=(b.scopes as unknown[]).map(scopeValue),ids=new Set(scopes.map(s=>s.id));
 if(ids.size!==scopes.length)fail('Saved workload identities are duplicated.');
 const entryIds=new Set<string>(),names=new Set<string>();
 const entries=(b.entries as unknown[]).map(rawEntry=>{
  const entry=exact(rawEntry,['record','draft']);
  const rawRecord=exact(entry.record,['schemaVersion','kind','id','name','createdAt','binding','calculatorVersion','inputKey','inputs','result',...((entry.record as CapacityRecord)?.schemaVersion===2?['cost']:[])]);
  const binding=exact(rawRecord.binding,['datasetToken','goalId','goal','scopeId','scopeLabel','workUnit']);
  const scope=scopes.find(s=>s.id===binding.scopeId);if(!scope)fail('Saved scenario has no registered workload identity.');
  const expected=capacityBinding(context,scope!),record=readCapacityRecord(entry.record,expected);
  if((record.schemaVersion===2)!==Object.hasOwn(entry.draft as object,'costRate'))fail('Saved draft and record versions do not match.');
  if(!capacityRecordIsCurrent(record,expected,entry.draft as CapacityDraft))fail('Saved editable inputs do not match the recalculated scenario.');
  if(entryIds.has(record.id)||names.has(record.name.toLocaleLowerCase()))fail('Saved scenario identities or names are duplicated.');
  entryIds.add(record.id);names.add(record.name.toLocaleLowerCase());
  return {record,draft:structuredClone(entry.draft) as CapacityDraft};
 });
 return structuredClone({version:1,scopes,entries});
}
export function saveCapacityScenario(args:{store:DecisionStore;context:CapacityContext;scope:CapacityScope;capture:CapacityCapture|null;session:CapacityCalculation;name:string;id:string;at:string;revision:number;assertActive:()=>void}) {
 const {store,context,scope,capture,session,revision,assertActive}=args;
 assertActive();
 if(key(capacityContext(store,context.datasetToken,context.goalId))!==key(context))fail('Goal context changed; calculate again.');
 const expected=capacityBinding(context,scope);
 if(!capture?.binding||key(capture.binding)!==key(expected))fail('Calculation context changed; calculate again before saving.');
 const record=prepareCapacityRecord(session,expected,{id:args.id,name:args.name.trim(),createdAt:args.at});
 if(capture.inputKey!==record.inputKey||!capacityRecordIsCurrent(record,expected,session.draft))fail('Inputs changed after calculation; calculate again before saving.');
 const entry:CapacityEntry={record,draft:structuredClone(session.draft)};
 const patch=(fields:Record<string,Json>)=>{
  const bucket=readCapacityBucket(fields[monthlyCapacityField],context);
  if(bucket.entries.length>=20)fail('This goal already has 20 saved capacity scenarios. Your draft is kept.');
  if(bucket.entries.some(e=>e.record.id===record.id||e.record.name.toLocaleLowerCase()===record.name.toLocaleLowerCase()))fail('That scenario name is already saved. Choose a different name.');
  if(bucket.entries.some(e=>e.record.binding.scopeId===scope.id&&e.record.inputKey===record.inputKey))fail('These assumptions are already saved for this workload.');
  const registered=bucket.scopes.find(s=>s.id===scope.id);
  if(registered&&key(registered)!==key(scope))fail('The workload identity changed; reopen or calculate a new workload.');
  const next:CapacityBucket={version:1,scopes:registered?bucket.scopes:[...bucket.scopes,structuredClone(scope)],entries:[...bucket.entries,entry]};
  // A writable bucket must also pass the exact reload reader, including its
  // whole-bucket byte bound. Checking only the existing entries can publish an
  // unreadable ninth six-month scenario and hide all earlier saved work.
  let validated:CapacityBucket;
  try{validated=readCapacityBucket(next,context);}
  catch(error){
   if(error instanceof Error&&error.message==='Scenario input size is excessive.')fail('This goal has reached the saved capacity-scenario size limit. Your draft and earlier saved scenarios are kept.');
   throw error;
  }
  return {[monthlyCapacityField]:validated as unknown as Json};
 };
 // Validate the complete candidate before entering a transaction, so ordinary
 // duplicate/name/size-limit rejection does not mark the saved store unsaved.
 // Repeat against its actual fields inside the optimistic commit.
 patch(store.getSnapshot().data.workspaces[context.goalId]?.fields??{});
 store.commitGoalFields(context.goalId,context.goal,revision,args.at,fields=>{
  assertActive();
  if(key(capacityContext(store,context.datasetToken,context.goalId))!==key(context))fail('Goal context changed before save.');
  return patch(fields);
 });
 return structuredClone(entry);
}
export function openCapacityScenario(store:DecisionStore,context:CapacityContext,id:string,revision:number,assertActive:()=>void) {
 assertActive();const state=store.getSnapshot();
 if(state.data.revision!==revision||key(capacityContext(store,context.datasetToken,context.goalId))!==key(context))fail('Saved context changed; select the scenario again.');
 const bucket=readCapacityBucket(state.data.workspaces[context.goalId]?.fields[monthlyCapacityField],context),entry=bucket.entries.find(e=>e.record.id===id);
 if(!entry)fail('Saved scenario is no longer available.');
 const scope=bucket.scopes.find(s=>s.id===entry!.record.binding.scopeId)!;
 assertActive();
 if(store.getSnapshot()!==state)fail('Saved context changed while reopening.');
 return {entry:structuredClone(entry!),scope:structuredClone(scope),capture:{inputKey:entry!.record.inputKey,binding:capacityBinding(context,scope)}};
}
export function compareSavedCapacity(left:CapacityEntry,right:CapacityEntry,context:CapacityContext,scopes:CapacityScope[]) {
 if(left.record.binding.scopeId!==right.record.binding.scopeId)return {compatible:false,reason:'Choose scenarios for the same workload.',assumptionDifferences:[]};
 const scope=scopes.find(s=>s.id===left.record.binding.scopeId);if(!scope)fail('Workload identity is missing.');
 const result=compareCapacityRecords(left.record,right.record,capacityBinding(context,scope!));
 return {...result,reason:result.compatible?'':'Opening date, horizon or calculation conventions differ.'};
}
