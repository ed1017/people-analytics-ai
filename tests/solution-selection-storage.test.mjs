import test from 'node:test';
import assert from 'node:assert/strict';
import {DecisionStore,DECISIONS_STORAGE_KEY,parseDecisions} from '../lib/local-decisions.ts';
import {mergeDecisionRecovery} from '../lib/decision-recovery.ts';
import {hasSavedUserGoal} from '../lib/home-demo-goals.ts';
import {homeGuideOriginField,readHomeGuideOrigin} from '../lib/home-guide-origin.ts';
const at='2026-10-08T12:00:00Z';
function setup(){const values=new Map();let fail=false,writes=0;const port={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(fail)throw Error('Disk full');values.set(key,value);writes++;},removeItem:key=>values.delete(key)},store=new DecisionStore();store.initialize(port);return {store,port,values,get writes(){return writes;},fail:()=>{fail=true;}};}
test('isolated guide selection retains real exploration and an existing same-title goal',()=>{
 const x=setup();x.store.saveGoals({version:1,activeId:'',goals:[{id:'real',statement:'Reduce turnover'}]});x.store.setField('real','proposal',{keep:true});x.store.setField('','working',{proposal:'real unpinned exploration'});const before=structuredClone(x.store.getSnapshot().data),writes=x.writes;
 x.store.commitGoalSelection('guided-example','Reduce turnover',before.revision,at,()=>({attachment:{fictional:true}}),true);
 const after=parseDecisions(x.values.get(DECISIONS_STORAGE_KEY));assert.equal(x.writes,writes+1);assert.equal(after.goals.activeId,'guided-example');assert.deepEqual(after.exploration,before.exploration);assert.deepEqual(after.workspaces.real,before.workspaces.real);
 assert.throws(()=>x.store.commitGoalSelection('real','Reduce turnover',after.revision,at,()=>({}),true),/Invalid isolated/);
});
test('guide-first selection persists fictional origin across reload and allows a later real goal with the same wording',()=>{
 const x=setup();x.store.saveGoals({version:1,activeId:'',goals:[{id:'other',statement:'Protect existing work'}]});x.store.setField('other','plan',{keep:true});const other=structuredClone(x.store.getSnapshot().data.workspaces.other);
 x.store.commitGoalSelection('guided-example','Reduce turnover',x.store.getSnapshot().data.revision,at,()=>({attachment:{fictional:true}}),true);
 const first=structuredClone(x.store.getSnapshot().data.workspaces['guided-example']);assert.equal(readHomeGuideOrigin(first.fields[homeGuideOriginField],'guided-example').origin,'conversation-guide-v1');assert.equal(hasSavedUserGoal(x.store.getSnapshot().data,'Reduce turnover'),false);
 const reloaded=new DecisionStore();reloaded.initialize(x.port);reloaded.commitGoalFields('guided-example','Reduce turnover',reloaded.getSnapshot().data.revision,'2026-10-09T12:00:00Z',()=>({[homeGuideOriginField]:null,anotherAttachment:true}));
 assert.deepEqual(reloaded.getField('guided-example',homeGuideOriginField,null),first.fields[homeGuideOriginField]);
 reloaded.saveGoals({...reloaded.getSnapshot().data.goals,activeId:''});const example=structuredClone(reloaded.getSnapshot().data.workspaces['guided-example']);
 reloaded.commitGoalSelection('real-turnover','Reduce turnover',reloaded.getSnapshot().data.revision,at,()=>({attachment:{real:true}}));
 const after=parseDecisions(x.values.get(DECISIONS_STORAGE_KEY));assert.equal(hasSavedUserGoal(after,'Reduce turnover'),true);assert.deepEqual(after.workspaces['guided-example'],example);assert.deepEqual(after.workspaces.other,other);assert.equal(after.workspaces['real-turnover'].fields[homeGuideOriginField],undefined);
 const renamed=structuredClone(after);renamed.goals.goals.find(g=>g.id==='guided-example').statement='Fictional retention trial';assert.equal(hasSavedUserGoal(renamed,'Fictional retention trial'),false);
});
test('an unmarked guided ID or invalid example marker never exempts a real duplicate',()=>{
 for(const marker of [undefined,{version:1,origin:'conversation-guide-v1',goalId:'guided-other',createdAt:at},{version:1,origin:'conversation-guide-v1',goalId:'guided-real',createdAt:'invalid'}]){
  const x=setup();x.store.saveGoals({version:1,activeId:'',goals:[{id:'guided-real',statement:'Reduce turnover'}]});if(marker)x.store.setField('guided-real',homeGuideOriginField,marker);
  assert.equal(hasSavedUserGoal(x.store.getSnapshot().data,'Reduce turnover'),true);assert.throws(()=>x.store.commitGoalSelection('real-turnover','Reduce turnover',x.store.getSnapshot().data.revision,at,()=>({attachment:true})),/already exists/);
 }
});
test('exploration reload and atomic selection preserve transcript, association and unrelated goals',()=>{
 const x=setup();x.store.saveGoals({version:1,activeId:'',goals:[{id:'other',statement:'Protect existing work'}]});x.store.setField('other','plan',{untouched:true});
 x.store.commitExplorationFields(x.store.getSnapshot().data.revision,at,()=>({chat:{messages:[{role:'user',content:'I want to reduce turnover'}],input:''},working:{proposal:'mentoring'}}));
 const reloaded=new DecisionStore();reloaded.initialize(x.port);assert.equal(reloaded.getField('','working',null).proposal,'mentoring');const before=structuredClone(reloaded.getSnapshot().data),writes=x.writes;
 reloaded.commitGoalSelection('turnover','Reduce turnover',before.revision,at,()=>({...before.exploration.fields,association:{planId:'1',purpose:'proposal-selection'}}));
 assert.equal(x.writes,writes+1);const after=parseDecisions(x.values.get(DECISIONS_STORAGE_KEY));assert.equal(after.goals.activeId,'turnover');assert.equal(after.goals.goals.length,2);assert.equal(after.exploration,undefined);assert.deepEqual(after.workspaces.other,before.workspaces.other);assert.deepEqual(after.workspaces.turnover.fields.chat,before.exploration.fields.chat);assert.equal(after.workspaces.turnover.fields.association.planId,'1');
});
test('failed selection leaves no orphan pinned goal or attachment and preserves exploration',()=>{
 const x=setup();x.store.commitExplorationFields(x.store.getSnapshot().data.revision,at,()=>({working:{proposal:'mentoring'}}));const before=structuredClone(x.store.getSnapshot().data),bytes=x.values.get(DECISIONS_STORAGE_KEY);x.fail();assert.throws(()=>x.store.commitGoalSelection('turnover','Reduce turnover',before.revision,at,()=>({attachment:'1'})),/Disk full/);assert.deepEqual(x.store.getSnapshot().data,before);assert.equal(x.values.get(DECISIONS_STORAGE_KEY),bytes);
});
test('duplicate goal, stale revision and cross-tab selection refuse to overwrite saved work',()=>{
 for(const reason of ['duplicate','revision','cross-tab']){const x=setup();x.store.saveGoals({version:1,activeId:'',goals:[{id:'existing',statement:'Reduce turnover'}]});const before=structuredClone(x.store.getSnapshot().data);if(reason==='cross-tab'){const other=new DecisionStore();other.initialize(x.port);other.setField('existing','other','preserved');}const bytes=x.values.get(DECISIONS_STORAGE_KEY);
 assert.throws(()=>x.store.commitGoalSelection('new',reason==='duplicate'?'Reduce turnover':'Improve support',before.revision+(reason==='revision'?1:0),at,()=>({attachment:'1'})),/already exists|revision changed|Another tab/);assert.equal(x.values.get(DECISIONS_STORAGE_KEY),bytes);assert.deepEqual(x.store.getSnapshot().data,before);}
});
test('exploration recovery conflicts preserve saved copy instead of dropping either silently',()=>{
 const x=setup();x.store.setField('','draft','base');const base=structuredClone(x.store.getSnapshot().data),local=structuredClone(base),remote=structuredClone(base);local.exploration.fields.draft='local';remote.exploration.fields.draft='remote';const review=mergeDecisionRecovery(base,local,remote);assert.equal(review.conflicts[0].field,'exploration');assert.equal(review.data.exploration.fields.draft,'remote');
});
test('fictional first-run example does not reserve the user goal title or lose its own work',async()=>{
 const {createHomeDemoGoals}=await import('../lib/home-demo-goals.ts');const x=setup(),demo=createHomeDemoGoals(at);x.store.saveGoals(demo.goals);for(const [id,slot]of Object.entries(demo.workspaces))for(const [key,value]of Object.entries(slot.fields))x.store.setField(id,key,value);const before=structuredClone(x.store.getSnapshot().data.workspaces);
 x.store.commitGoalSelection('user-turnover','Reduce turnover',x.store.getSnapshot().data.revision,at,()=>({proposal:'new'}));assert.equal(x.store.getSnapshot().data.goals.activeId,'user-turnover');for(const id of Object.keys(before))assert.deepEqual(x.store.getSnapshot().data.workspaces[id],before[id]);
});
