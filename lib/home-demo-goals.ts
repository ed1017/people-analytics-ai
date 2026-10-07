// First-run browser examples only. No evidence fetch, model call or planning-tool write.
// @ts-expect-error Native Node tests share TypeScript source.
import {homeDemoExamples,homeDemoField,demoBundle,demoBinding,readHomeDemo} from './home-demo-catalog.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {createBundleDraft,reviseBundleDraft,bundleInputKey,type Assumption} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {attachBundlePatch,bundleWorkspaceField} from './home-bundle-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey} from './home-action-drafts.ts';
import type {DecisionData,Json} from './local-decisions';

/** Fictional first-run examples must not reserve the title of a user's own goal. */
export function hasSavedUserGoal(data:Pick<DecisionData,'goals'|'workspaces'>,statement:string){
 return data.goals.goals.some(goal=>{
  if(goal.statement.toLocaleLowerCase()!==statement.trim().toLocaleLowerCase())return false;
  const demo=readHomeDemo(data.workspaces[goal.id]?.fields[homeDemoField],goal.id);
  return !demo||demo.example.goal!==goal.statement;
 });
}

export function createHomeDemoGoals(now=new Date().toISOString()):Pick<DecisionData,'goals'|'workspaces'> {
 const date=new Date(now),start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)).toISOString().slice(0,10),finish=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+4,0)).toISOString().slice(0,10);
 const assumed=<T>(value:T):Assumption<T>=>({value,kind:'illustrative',basis:'Fictional demo assumption; editable in chat. Not workforce evidence or an approved commitment.'});
 return {goals:{version:1,activeId:'',goals:homeDemoExamples.map(example=>({id:example.id,statement:example.goal}))},workspaces:Object.fromEntries(homeDemoExamples.map(example=>{
  const binding=demoBinding(example),draft=createBundleDraft(demoBundle(example),binding),input=draft.inputs;
  Object.assign(input.scope,{population:assumed('Fictional volunteer pilot group'),startMonth:assumed(start.slice(0,7)),months:assumed(3),capacityRequired:assumed(false),requirements:assumed('Example plan only; review scope, owners, funding and measures before acting.')});
  input.timing=[{componentId:'c1',start:assumed(start),finish:assumed(finish)}];
  input.groups=[{id:'demo-group',label:'Fictional pilot participants',count:assumed(example.participants)}];
  input.memberships=[{componentId:'c1',groupIds:['demo-group'],complete:assumed(true)}];
  input.groupsDisjoint=assumed(true);input.dependenciesConfirmed=assumed(true);input.costsDistinct=assumed(true);
  input.costReviews=[{componentId:'c1',complete:{value:true,kind:'illustrative',basis:'Fictional demo assumes the listed pilot allowance covers this component; real costs and funding remain unverified.'}}];
  input.expenses=[{id:'demo-budget',label:'Pilot allowance',kind:'cash',amount:assumed(example.budget),startMonth:assumed(start.slice(0,7)),months:assumed(1)}];
  input.expenseLinks=[{expenseId:'demo-budget',componentIds:['c1'],allocations:null}];
  input.deliveryEstimate={hoursPerParticipant:assumed(4),coordinationHours:assumed(8),hourlyRate:assumed(60),acceptance:assumed(example.acceptance)};
  const prepared=reviseBundleDraft(draft,input),workspace=attachBundlePatch(undefined,prepared,{confirmed:true,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(prepared),acknowledgeUnknowns:true},`${example.id}-attached`,now).value;
  return [example.id,{savedAt:now,fields:{[homeDemoField]:{version:1,key:example.key,preparedAt:now},[bundleWorkspaceField]:workspace} as unknown as Record<string,Json>}];
 }))};
}
