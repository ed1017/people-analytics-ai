import test from 'node:test';
import assert from 'node:assert/strict';
import {DecisionStore,DECISIONS_STORAGE_KEY,encodeDecisions} from '../lib/local-decisions.ts';
import {capacitySpec,emptyCapacityDraft} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
import {capacityCostAssumptions,calculateCapacityCost,capacityCalculationKey} from '../lib/swp-capacity-cost.ts';
import {capacityContext,capacityBinding,monthlyCapacityField,readCapacityBucket,saveCapacityScenario,openCapacityScenario,compareSavedCapacity} from '../lib/swp-capacity-store.ts';
const at='2026-10-13T20:00:00.000Z';
const scope={id:'scope-a',label:'Service desk — tickets',workUnit:'Service desk — tickets'};
const makeSession=(patch={})=>{const draft={...emptyCapacityDraft,scope:scope.label,openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true,costRate:'12.34',...patch};const result=calculateMonthlyWorkload(capacitySpec(draft));return {draft,result,cost:calculateCapacityCost(result,capacityCostAssumptions(draft.costRate)),error:''};};
function setup(){
 const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Review capacity'},{id:'b',statement:'Other goal'}]},workspaces:{a:{savedAt:at,fields:{'planning.savedScenarios':[{id:'legacy'}]}}}};
 let bytes=encodeDecisions(seed),fail=false;
 const port={getItem:k=>k===DECISIONS_STORAGE_KEY?bytes:null,setItem:(k,v)=>{if(fail)throw Error('Quota fixture');if(k===DECISIONS_STORAGE_KEY)bytes=v;},removeItem:()=>{}};
 const store=new DecisionStore();store.initialize(port);
 const context=capacityContext(store,'legacy-v1:0','a');
 const args=(session=makeSession(),name='Base')=>({store,context,scope,session,capture:{inputKey:capacityCalculationKey(session.result,session.cost),binding:capacityBinding(context,scope)},name,id:name.replaceAll(' ','-'),at,revision:store.getSnapshot().data.revision,assertActive:()=>{if(store.getSnapshot().data.goals.activeId!=='a')throw Error('Context changed');}});
 return {store,context,args,bytes:()=>bytes,setBytes:value=>bytes=value,fail:()=>fail=true};
}
test('explicit transaction preserves legacy fields, reload recomputes, and returned data is detached',()=>{
 const f=setup(),s=makeSession(),before=structuredClone(s),saved=saveCapacityScenario(f.args(s));
 assert.deepEqual(f.store.getField('a','planning.savedScenarios',[]),[{id:'legacy'}]);assert.deepEqual(s,before);
 const reopened=openCapacityScenario(f.store,f.context,saved.record.id,f.store.getSnapshot().data.revision,()=>{});
 assert.deepEqual(reopened.entry.record.result,s.result);reopened.entry.draft.people='99';assert.equal(f.store.getField('a',monthlyCapacityField,null).entries[0].draft.people,'10');
 const restored=new DecisionStore();restored.initialize({getItem:k=>k===DECISIONS_STORAGE_KEY?f.bytes():null,setItem:()=>{},removeItem:()=>{}});
 assert.equal(readCapacityBucket(restored.getField('a',monthlyCapacityField,undefined),capacityContext(restored,'legacy-v1:0','a')).entries[0].record.result.points[0].gapFte,1);
});
test('changed assumptions compare while another scope or date does not',()=>{
 const f=setup(),a=saveCapacityScenario(f.args()),b=saveCapacityScenario(f.args(makeSession({productivity:'25',hires:'1'}),'Option'));
 const bucket=readCapacityBucket(f.store.getField('a',monthlyCapacityField,undefined),f.context);
 assert.equal(compareSavedCapacity(a,b,f.context,bucket.scopes).compatible,true);
 const c=saveCapacityScenario(f.args(makeSession({openingDate:'2026-08-31'}),'Earlier'));
 assert.equal(compareSavedCapacity(a,c,f.context,bucket.scopes).compatible,false);
 const other=structuredClone(b);other.record.binding.scopeId='other';assert.equal(compareSavedCapacity(a,other,f.context,bucket.scopes).compatible,false);
});
test('captured input/context, confirmed draft and displayed result must all stay current',()=>{
 for(const change of [a=>a.session.draft.volume='900',a=>a.capture.inputKey='stale',a=>a.capture.binding.goalId='b',a=>a.session.draft.confirmed=false,a=>a.session.result.points[0].gapFte=99,a=>a.scope={...scope,id:'different'}]){
  const f=setup(),a=f.args(),before=f.bytes();change(a);assert.throws(()=>saveCapacityScenario(a));assert.equal(f.bytes(),before);
 }
});
test('duplicate names and identical calculations do not poison storage or overwrite saved history',()=>{
 const f=setup();saveCapacityScenario(f.args());const before=f.bytes();
 assert.throws(()=>saveCapacityScenario(f.args(makeSession({productivity:'25'}),'Base')),/already saved/);
 assert.throws(()=>saveCapacityScenario(f.args(makeSession(),'Same inputs')),/already saved/);
 assert.equal(f.bytes(),before);assert.equal(f.store.getSnapshot().saved,true);
});
test('quota and another-tab conflict keep inputs and prior saved values intact',()=>{
 for(const kind of ['quota','conflict']){
  const f=setup();saveCapacityScenario(f.args());const args=f.args(makeSession({productivity:'25'}),'Option'),before=structuredClone(args.session),saved=f.bytes();
  if(kind==='quota')f.fail();else f.setBytes(saved+' ');
  const actual=f.bytes();assert.throws(()=>saveCapacityScenario(args),kind==='quota'?/Quota/:/Another tab/);assert.equal(f.bytes(),actual);assert.deepEqual(args.session,before);assert.equal(f.store.getField('a',monthlyCapacityField,null).entries.length,1);
 }
});
test('active dataset/goal and optimistic revision are rechecked rather than trusting render-time context',()=>{
 const f=setup();assert.throws(()=>capacityContext(f.store,'other:1','a'));assert.throws(()=>capacityContext(f.store,'legacy-v1:0',''));assert.throws(()=>capacityContext(f.store,'legacy-v1:0','b'));
 const args=f.args();f.store.setField('a','other',1);assert.throws(()=>saveCapacityScenario(args),/revision changed/);
 const g=setup(),candidate=g.args();let checks=0;candidate.assertActive=()=>{if(++checks===2)throw Error('Dataset changed during preparation');};const before=g.bytes();assert.throws(()=>saveCapacityScenario(candidate),/Dataset changed/);assert.equal(g.bytes(),before);
 const h=setup(),stale=h.args();h.store.saveGoals({...h.store.getSnapshot().data.goals,activeId:'b'});assert.throws(()=>saveCapacityScenario(stale),/Context changed/);
});
test('tampered storage and renamed goal fail visibly; same-name scopes cannot replace registered identity',()=>{
 const f=setup();saveCapacityScenario(f.args());const bucket=f.store.getField('a',monthlyCapacityField,null);bucket.entries[0].record.result.points[0].gapFte=20;assert.throws(()=>readCapacityBucket(bucket,f.context));
 const g=setup();saveCapacityScenario(g.args());assert.throws(()=>readCapacityBucket(g.store.getField('a',monthlyCapacityField,null),{...g.context,goal:'Renamed goal'}),/different dataset, goal or scope/);
 const changed=makeSession({scope:'Other work'}),args=g.args(changed,'Other');args.scope={...scope,label:'Other work',workUnit:'Other work'};args.capture.binding=capacityBinding(g.context,args.scope);assert.throws(()=>saveCapacityScenario(args),/identity changed/);
});
test('existing per-goal byte limit rejects a save atomically and retains the working calculation',()=>{
 const f=setup();f.store.setField('a','large-existing-evidence',{a:'x'.repeat(180000),b:'x'.repeat(180000),c:'x'.repeat(150000)});
 const args=f.args(),draft=structuredClone(args.session),before=f.bytes();assert.throws(()=>saveCapacityScenario(args),/512 KiB/);assert.equal(f.bytes(),before);assert.deepEqual(args.session,draft);assert.equal(f.store.getField('a',monthlyCapacityField,null),null);
});

test('v2 full bucket size rejection is atomic and all earlier entries remain readable',()=>{
 const f=setup();let count=0,rejected=false;
 for(let i=0;i<20;i++){
  const args=f.args(makeSession({months:'6',costRate:String(i)}),'Cost-'+i),before=f.bytes(),session=structuredClone(args.session);
  try{saveCapacityScenario(args);count++;}
  catch(error){assert.match(error.message,/size limit/);assert.equal(f.bytes(),before);assert.deepEqual(args.session,session);assert.equal(f.store.getSnapshot().saved,true);rejected=true;break;}
  assert.equal(readCapacityBucket(f.store.getField('a',monthlyCapacityField,null),f.context).entries.length,count);
 }
 assert.ok(rejected);assert.ok(count>0&&count<20);
 assert.equal(readCapacityBucket(f.store.getField('a',monthlyCapacityField,null),f.context).entries.length,count);
});
test('v2 unknown and zero costs save separately and edit or clearing rejects stale captures',()=>{
 const f=setup(),unknown=saveCapacityScenario(f.args(makeSession({costRate:''}),'Unknown')),zero=saveCapacityScenario(f.args(makeSession({costRate:'0'}),'Zero'));
 assert.equal(unknown.record.cost.points[0].runRateCents,null);assert.equal(zero.record.cost.points[0].runRateCents,0);
 for(const value of ['','0','12.35']){
  const args=f.args(makeSession(),'Stale'),before=f.bytes();args.session.draft.costRate=value;
  assert.throws(()=>saveCapacityScenario(args),/Cost inputs or results changed/);assert.equal(f.bytes(),before);
 }
});

test('optional fictional handoff origin survives the existing save and reopen transaction',()=>{
 const f=setup(),session=makeSession({sourceNote:'Fictional task example: adoption 50%; origin only, not measured results.'});
 const saved=saveCapacityScenario(f.args(session,'Task example'));
 const reopened=openCapacityScenario(f.store,f.context,saved.record.id,f.store.getSnapshot().data.revision,()=>{});
 assert.equal(reopened.entry.draft.sourceNote,session.draft.sourceNote);
 assert.match(reopened.entry.record.inputs.months[0].hoursPerUnit.basis.note,/Fictional task example/);
 assert.deepEqual(f.store.getField('a','planning.savedScenarios',[]),[{id:'legacy'}]);
});
