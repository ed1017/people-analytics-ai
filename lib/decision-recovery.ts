import type {DecisionData,Json} from './local-decisions';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export type RecoveryConflict={goalId:string;field:string};
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
  for(const field of new Set([...Object.keys(oldFields),...Object.keys(localFields),...Object.keys(remoteFields)])){const value=crossedGoalChange?remoteFields[field]:choose(oldFields[field],localFields[field],remoteFields[field],id,field);if(value!==undefined)fields[field]=structuredClone(value);}
  if(Object.keys(fields).length)next.workspaces[id]={savedAt:new Date().toISOString(),fields};
 }
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
  const differentDraft=typeof remote?.input==='string'&&!!remote.input.trim()&&remote.input!==local.input;
  if(differentDraft&&!conflicts.some(item=>item.goalId===id&&item.field==='chat'))conflicts.push({goalId:id,field:'chat'});
  if(differentDraft&&!keepSavedConflicts)continue;
  const chat=next.workspaces[id]?.fields.chat as Record<string,Json>|undefined;
  if(chat)next.workspaces[id].fields.chat={...chat,input:local.input,recoveredPlanSelectionRequired:true};
 }
 return {data:next,conflicts};
}
