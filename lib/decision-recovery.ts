import type {DecisionData,Json} from './local-decisions';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export type RecoveryConflict={goalId:string;field:string};
export const recoveredRequestsField='recoveredRequestsV1';
export type RecoveredRequest={goal:string;input:string;recoveredAt:string};
/** Separate read-only user-text copies; never transcript messages or plan instructions. */
export function readRecoveredRequests(raw:unknown):RecoveredRequest[]|null{
 if(raw===undefined)return [];
 if(!Array.isArray(raw)||raw.length>50)return null;
 return raw.every(item=>item&&typeof item==='object'&&!Array.isArray(item)&&Object.keys(item).sort().join()==='goal,input,recoveredAt'&&typeof item.goal==='string'&&item.goal.length<=240&&typeof item.input==='string'&&!!item.input.trim()&&item.input.length<=200000&&typeof item.recoveredAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(item.recoveredAt)&&Number.isFinite(Date.parse(item.recoveredAt)))?structuredClone(raw):null;
}
function retainRequestCopies(local:unknown,remote:unknown,request?:{goal:string;input:string}){
 const copies=readRecoveredRequests(remote),previous=readRecoveredRequests(local);
 if(!copies||!previous)throw Error('Saved request recovery copies could not be verified. Keep both tabs open.');
 for(const item of previous)if(!copies.some(copy=>same(copy,item)))copies.push(item);
 if(request&&!copies.some(copy=>copy.goal===request.goal&&copy.input===request.input))copies.push({...request,recoveredAt:new Date().toISOString()});
 if(copies.length>50)throw Error('Request recovery copies are full. Keep both tabs open; neither request was replaced.');
 return copies;
}
/** Three-way review: only changes whose saved base is unchanged can be recovered automatically. */
export function mergeDecisionRecovery(base:DecisionData,draft:DecisionData,saved:DecisionData,keepSavedConflicts=false){
 const conflicts:RecoveryConflict[]=[],next=structuredClone(saved);
 const choose=<T>(old:T,local:T,remote:T,goalId:string,field:string):T=>{
  if(same(local,old)||same(local,remote))return remote;
  if(same(remote,old))return local;
  conflicts.push({goalId,field});return remote;
 };
 const ids=new Set([...base.goals.goals,...draft.goals.goals,...saved.goals.goals].map(goal=>goal.id));
 next.goals.goals=[];
 for(const id of ids){
  const old=base.goals.goals.find(goal=>goal.id===id),local=draft.goals.goals.find(goal=>goal.id===id),remote=saved.goals.goals.find(goal=>goal.id===id);
  const localWorkChanged=!same(base.workspaces[id],draft.workspaces[id]),savedWorkChanged=!same(base.workspaces[id],saved.workspaces[id]);
  const crossedGoalChange=old&&(!same(local,old)&&savedWorkChanged||!same(remote,old)&&localWorkChanged);
  if(crossedGoalChange)conflicts.push({goalId:id,field:'goal-and-plan'});
  const goal=crossedGoalChange?remote:choose(old,local,remote,id,'goal');if(!goal){delete next.workspaces[id];continue;}next.goals.goals.push(structuredClone(goal));
  const oldFields=base.workspaces[id]?.fields??{},localFields=draft.workspaces[id]?.fields??{},remoteFields=saved.workspaces[id]?.fields??{},fields:Record<string,Json>={};
  for(const field of new Set([...Object.keys(oldFields),...Object.keys(localFields),...Object.keys(remoteFields)])){const value=field===recoveredRequestsField&&keepSavedConflicts?retainRequestCopies(localFields[field],remoteFields[field]):crossedGoalChange?remoteFields[field]:choose(oldFields[field],localFields[field],remoteFields[field],id,field);if(value!==undefined)fields[field]=structuredClone(value);}
  if(Object.keys(fields).length)next.workspaces[id]={savedAt:new Date().toISOString(),fields};
 }
 const exploration=choose(base.exploration,draft.exploration,saved.exploration,'','exploration');
 if(exploration)next.exploration=structuredClone(exploration);else delete next.exploration;
 next.removedGoalIds=[...new Set([...(saved.removedGoalIds??[]),...(draft.removedGoalIds??[])])].filter(id=>!next.goals.goals.some(goal=>goal.id===id));
 const preferred=draft.goals.activeId;next.goals.activeId=next.goals.goals.some(goal=>goal.id===preferred)?preferred:next.goals.activeId;
 if(!next.goals.goals.some(goal=>goal.id===next.goals.activeId))next.goals.activeId='';
 // Keep a recovered request separate from saved transcript/catalog history. Its
 // original selected plan may no longer be selected, so resubmission needs a
 // fresh, explicit plan confirmation. This marker survives another reload.
 for(const goal of next.goals.goals){
  const id=goal.id,local=draft.workspaces[id]?.fields.chat as {input?:unknown}|undefined;
  if(typeof local?.input!=='string'||!local.input.trim())continue;
  const remote=saved.workspaces[id]?.fields.chat as {input?:unknown}|undefined;
  const savedContextChanged=!same(base.workspaces[id]?.fields,saved.workspaces[id]?.fields)||!same(base.goals.goals.find(item=>item.id===id),goal);
  if(local.input===remote?.input&&!savedContextChanged)continue;
  const differentDraft=typeof remote?.input==='string'&&!!remote.input.trim()&&remote.input!==local.input&&remote.input!==((base.workspaces[id]?.fields.chat as {input?:unknown}|undefined)?.input);
  if(differentDraft&&!conflicts.some(item=>item.goalId===id&&item.field==='chat'))conflicts.push({goalId:id,field:'chat'});
  if(differentDraft&&!keepSavedConflicts)continue;
  if(differentDraft){
   // Explicit resolution may replace the composer, but must not erase the other
   // tab's saved request. Keep both histories without merging plan catalogs.
   const fields=next.workspaces[id].fields;
   fields[recoveredRequestsField]=retainRequestCopies(draft.workspaces[id]?.fields[recoveredRequestsField],saved.workspaces[id]?.fields[recoveredRequestsField],{goal:saved.goals.goals.find(item=>item.id===id)?.statement??goal.statement,input:remote!.input as string});
  }
  const chat=next.workspaces[id]?.fields.chat as Record<string,Json>|undefined;
  if(chat)next.workspaces[id].fields.chat={...chat,input:local.input,recoveredPlanSelectionRequired:true};
 }
 return {data:next,conflicts};
}
