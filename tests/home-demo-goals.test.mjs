import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeDemoGoals,hasSavedUserGoal} from '../lib/home-demo-goals.ts';
import {homeDemoExamples,homeDemoField,homeDemoOrigin,demoBinding,readHomeDemo} from '../lib/home-demo-catalog.ts';
import {DecisionStore,DECISIONS_STORAGE_KEY,encodeDecisions,parseDecisions} from '../lib/local-decisions.ts';
import {GOALS_STORAGE_KEY} from '../lib/local-goals.ts';
import {actionBinding,actionBindingKey} from '../lib/home-action-drafts.ts';
import {bundleWorkspaceField,readBundleWorkspace,saveBundleDraftPatch,attachBundlePatch} from '../lib/home-bundle-records.ts';
import {readBundleDraft,bundleInputKey,reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {pinnedGoalPlanStatus,restoredBundleDraft,restoredBundleResult} from '../lib/home-pinned-goals.ts';
const now='2026-10-06T00:00:00.000Z',seed=()=>createHomeDemoGoals(now);
test('a fictional example does not block an explicit user goal, while saved user duplicates remain blocked',()=>{
 const data=seed(),before=JSON.stringify(data);
 assert.equal(hasSavedUserGoal(data,'Reduce turnover'),false);assert.equal(JSON.stringify(data),before);
 data.goals.goals.push({id:'my-goal',statement:'Reduce turnover'});assert.equal(hasSavedUserGoal(data,'reduce TURNOVER'),true);
 data.goals.goals.pop();delete data.workspaces['demo-reduce-turnover'].fields[homeDemoField];assert.equal(hasSavedUserGoal(data,'Reduce turnover'),true);
 const edited=seed();edited.goals.goals[0].statement='My revised target';assert.equal(hasSavedUserGoal(edited,'My revised target'),true);
});
const port=(entries=[])=>{const map=new Map(entries);return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}};
test('first run has two clearly identifiable attached examples and starts in General exploration',async()=>{
 const p=port(),store=new DecisionStore();store.initialize(p,seed);
 const data=parseDecisions(p.getItem(DECISIONS_STORAGE_KEY));assert.equal(data.goals.activeId,'');assert.equal(data.goals.goals.length,2);
 for(const example of homeDemoExamples){
  const fields=data.workspaces[example.id].fields,record=readHomeDemo(fields[homeDemoField],example.id),workspace=readBundleWorkspace(fields[bundleWorkspaceField],example.id),draft=workspace.attachments[0].draft;
  assert.equal(record.example.key,example.key);assert.equal(pinnedGoalPlanStatus(example.id,fields,{}),'saved');assert.equal(workspace.attachments.length,1);
  assert.deepEqual(demoBinding(example),await actionBinding(example.id,example.goal,{sources:[]},{origin:homeDemoOrigin,key:example.key}));
  assert.ok(draft.bundle.name.split(' ').length<=5);assert.equal(draft.bundle.origin,homeDemoOrigin);assert.deepEqual(draft.bundle.components[0].evidence,[]);
  assert.equal(draft.inputs.expenses[0].amount.kind,'illustrative');assert.equal(draft.inputs.groups[0].count.kind,'illustrative');assert.equal(draft.inputs.scope.startMonth.value,'2026-11');assert.equal(draft.inputs.whatIf,undefined);
  assert.equal(draft.inputs.costReviews[0].complete.kind,'illustrative');
  assert.equal(workspace.attachments[0].result.cashTotal,example.budget); // Complete only within the fictional example scope.
 }
});
test('existing current, empty, legacy, invalid and deleted state never trigger seeding',()=>{
 const existing={version:1,revision:7,goals:{version:1,activeId:'mine',goals:[{id:'mine',statement:'My own goal'}]},workspaces:{mine:{savedAt:now,fields:{chat:{messages:[{role:'user',content:'My question'}],input:'Unsent draft'},filters:{country:'CA'},custom:{keep:true}}}}};
 const empty={version:1,revision:1,removedGoalIds:homeDemoExamples.map(item=>item.id),goals:{version:1,activeId:'',goals:[]},workspaces:{}};
 for(const data of [existing,empty]){const raw=encodeDecisions(data),p=port([[DECISIONS_STORAGE_KEY,raw]]),store=new DecisionStore();store.initialize(p,()=>assert.fail('Must not seed existing data'));assert.equal(p.getItem(DECISIONS_STORAGE_KEY),raw);assert.deepEqual(store.getSnapshot().data,data);}
 for(const legacy of [existing.goals,empty.goals]){const p=port([[GOALS_STORAGE_KEY,JSON.stringify(legacy)]]),store=new DecisionStore();store.initialize(p,()=>assert.fail('Must not seed legacy data'));assert.deepEqual(store.getSnapshot().data.goals,legacy);}
 for(const raw of ['broken',encodeDecisions({...empty,version:99})]){const p=port([[DECISIONS_STORAGE_KEY,raw]]),store=new DecisionStore();store.initialize(p,()=>assert.fail('Must not seed corrupt data'));assert.equal(p.getItem(DECISIONS_STORAGE_KEY),raw);assert.equal(store.getSnapshot().saved,false);}
});
test('reload, repeated hydration, remove and clear all never duplicate or resurrect examples',()=>{
 const p=port(),store=new DecisionStore();store.initialize(p,seed);const before=p.getItem(DECISIONS_STORAGE_KEY);
 store.initialize(p,()=>assert.fail());new DecisionStore().initialize(p,()=>assert.fail());assert.equal(p.getItem(DECISIONS_STORAGE_KEY),before);
 store.saveGoals({...store.getSnapshot().data.goals,goals:[store.getSnapshot().data.goals.goals[1]]});
 const reopened=new DecisionStore();reopened.initialize(p,()=>assert.fail());assert.deepEqual(reopened.getSnapshot().data.goals.goals.map(item=>item.id),[homeDemoExamples[1].id]);
 reopened.clearAll();const cleared=new DecisionStore();cleared.initialize(p,()=>assert.fail());assert.deepEqual(cleared.getSnapshot().data.goals.goals,[]);
});
test('older saved examples keep their original unknown-cost snapshot on reload',()=>{
 const data={version:1,revision:1,...seed()},example=homeDemoExamples[0],attachment=data.workspaces[example.id].fields[bundleWorkspaceField].attachments[0];
 attachment.draft.inputs.costReviews[0].complete={value:null,kind:'unknown',basis:null};attachment.result=reconcileBundle(attachment.draft);
 const raw=encodeDecisions(data),p=port([[DECISIONS_STORAGE_KEY,raw]]),store=new DecisionStore();store.initialize(p,seed);
 assert.equal(p.getItem(DECISIONS_STORAGE_KEY),raw);assert.equal(store.getSnapshot().data.workspaces[example.id].fields[bundleWorkspaceField].attachments[0].result.cashTotal,null);
});
test('supported chat edits persist as latest drafts and attachments preserve the original example',()=>{
 const data=seed(),example=homeDemoExamples[1],binding=demoBinding(example),fields=data.workspaces[example.id].fields,original=structuredClone(fields[bundleWorkspaceField]),before=original.attachments[0],draft=before.draft;
 const preview=previewBundleChatEdit(draft,'set participants to 18',{option:1,count:1}),next=acceptBundleChatEdit(draft,preview,{option:1,count:1});
 const edited=saveBundleDraftPatch(original,next).value,attached=attachBundlePatch(edited,next,{confirmed:true,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(next),acknowledgeUnknowns:true},'new-version',now,before.id).value;
 assert.equal(attached.attachments.length,2);assert.deepEqual(attached.attachments[0],before);assert.equal(attached.attachments[1].supersedes,before.id);
 assert.equal(restoredBundleDraft(attached,binding,'A').inputs.groups[0].count.value,18);assert.equal(restoredBundleResult(attached,next).inputKey,bundleInputKey(next));
 assert.equal(readBundleWorkspace(attached,homeDemoExamples[0].id),null);
 const tampered=structuredClone(next);tampered.bundle.name='Invented validated plan';tampered.signature=JSON.stringify(tampered.bundle);assert.equal(readBundleDraft(tampered),null);
});
test('storage failure keeps the prior bytes and retries the same seed without duplicates',()=>{
 const p=port(),write=p.setItem,store=new DecisionStore();p.setItem=()=>{throw Error('Quota exceeded')};store.initialize(p,seed);assert.equal(store.getSnapshot().saved,false);assert.equal(p.getItem(DECISIONS_STORAGE_KEY),null);
 p.setItem=write;store.retry();assert.equal(store.getSnapshot().saved,true);assert.equal(parseDecisions(p.getItem(DECISIONS_STORAGE_KEY)).goals.goals.length,2);
});
