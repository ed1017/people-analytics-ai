// @ts-expect-error Native Node tests share TypeScript source.
import {withHomeMixScenario} from './home-mix-scenario.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {initialWhatIf} from './home-plan-what-if.ts';
// First-run browser examples only. No evidence fetch, model call or planning-tool write.
// @ts-expect-error Native Node tests share TypeScript source.
import {homeDemoExamples,homeDemoField,demoBundle,demoBinding,readHomeDemo} from './home-demo-catalog.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeGuideOriginField,readHomeGuideOrigin} from './home-guide-origin.ts';
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
  if(readHomeGuideOrigin(data.workspaces[goal.id]?.fields[homeGuideOriginField],goal.id))return false;
  const demo=readHomeDemo(data.workspaces[goal.id]?.fields[homeDemoField],goal.id);
  return !demo||demo.example.goal!==goal.statement;
 });
}

export function createHomeDemoGoals(now=new Date().toISOString()):Pick<DecisionData,'goals'|'workspaces'> {
 return {goals:{version:1,activeId:'',goals:homeDemoExamples.map(example=>({id:example.id,statement:example.goal}))},workspaces:Object.fromEntries(homeDemoExamples.map(example=>{
  const binding=demoBinding(example),prepared=createHomeDemoDraft(example,now),workspace=attachBundlePatch(undefined,prepared,{confirmed:true,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(prepared),acknowledgeUnknowns:true},`${example.id}-attached`,now).value;
  return [example.id,{savedAt:now,fields:{[homeDemoField]:{version:1,key:example.key,preparedAt:now},[bundleWorkspaceField]:workspace} as unknown as Record<string,Json>}];
 }))};
}

/** Pure draft factory shared by first-run examples and an explicitly opened unsaved review. */
export function createHomeDemoDraft(example:typeof homeDemoExamples[number],now:string){
 const date=new Date(now),start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)).toISOString().slice(0,10),finish=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+4,0)).toISOString().slice(0,10);
 const assumed=<T>(value:T):Assumption<T>=>({value,kind:'illustrative',basis:'Fictional demo assumption; editable in chat. Not workforce evidence or an approved commitment.'});
  const binding=demoBinding(example),draft=createBundleDraft(demoBundle(example),binding),input=draft.inputs;
  Object.assign(input.scope,{population:assumed('Fictional volunteer pilot group'),startMonth:assumed(start.slice(0,7)),months:assumed(3),capacityRequired:assumed(false),requirements:assumed('Example plan only; review scope, owners, funding and measures before acting.')});
  input.timing=[{componentId:'c1',start:assumed(start),finish:assumed(finish)}];
  input.groups=[{id:'demo-group',label:'Fictional pilot participants',count:assumed(example.participants)}];
  input.memberships=[{componentId:'c1',groupIds:['demo-group'],complete:assumed(true)}];
  input.groupsDisjoint=assumed(true);input.dependenciesConfirmed=assumed(true);input.costsDistinct=assumed(true);
  input.costReviews=[{componentId:'c1',complete:{value:true,kind:'illustrative',basis:'Fictional demo assumes the listed pilot allowance covers this component; real costs and funding remain unverified.'}}];
  input.expenses=[{id:'demo-budget',label:'Pilot allowance',kind:'cash',amount:assumed(example.budget),startMonth:assumed(start.slice(0,7)),months:assumed(1)}];
  input.expenseLinks=[{expenseId:'demo-budget',componentIds:['c1'],allocations:null}];
  input.deliveryEstimate={hoursPerParticipant:assumed(4),coordinationHours:assumed(8),hourlyRate:{value:null,kind:'unknown',basis:null},acceptance:assumed(example.acceptance)};
  if(example.key==='capacity'){
   Object.assign(input.scope,{population:assumed('Fictional capacity scenario'),businessUnit:assumed('Fictional business unit'),jobProfile:assumed('Fictional whole roles'),months:assumed(12),capacityRequired:assumed(true),demand:assumed(5)});
   input.groups=[];input.memberships=[];input.expenses=[];input.expenseLinks=[];
   input.timing=draft.bundle.components.map(component=>({componentId:component.id,start:assumed(start),finish:assumed(start)}));
   input.costReviews=draft.bundle.components.map(component=>({componentId:component.id,complete:assumed(true)}));
   input.budget={amount:assumed(example.budget),basis:assumed('cash')};
   input.whatIf=initialWhatIf(example.goal,input)!;
   // Keep delivery effort out of this staffing-only example; training is stated separately in hours.
   delete input.deliveryEstimate;
   Object.assign(input,withHomeMixScenario(draft));
  }
  const prepared=reviseBundleDraft(draft,input);
  return prepared;
}
