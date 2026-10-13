import test from 'node:test';
import assert from 'node:assert/strict';
import {DecisionStore,DECISIONS_STORAGE_KEY,encodeDecisions} from '../lib/local-decisions.ts';
import {capacitySpec,emptyCapacityDraft} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
import {monthlyScenarioInputKey as key} from '../lib/monthly-scenario-compatibility.mjs';
import {capacityContext,capacityBinding,monthlyCapacityField,readCapacityBucket,saveCapacityScenario,openCapacityScenario,compareSavedCapacity} from '../lib/swp-capacity-store.ts';
const at='2026-10-13T20:00:00.000Z';
const scope={id:'scope-a',label:'Service desk — tickets',workUnit:'Service desk — tickets'};
const makeSession=(patch={})=>{const draft={...emptyCapacityDraft,scope:scope.label,openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true,...patch};return {draft,result:calculateMonthlyWorkload(capacitySpec(draft)),error:''};};
function setup(){
 const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Review capacity'},{id:'b',statement:'Other goal'}]},workspaces:{a:{savedAt:at,fields:{'planning.savedScenarios':[{id:'legacy'}]}}}};
 let bytes=encodeDecisions(seed),fail=false;
 const port={getItem:k=>k===DECISIONS_STORAGE_KEY?bytes:null,setItem:(k,v)=>{if(fail)throw Error('Quota fixture');if(k===DECISIONS_STORAGE_KEY)bytes=v;},removeItem:()=>{}};
 const store=new DecisionStore();store.initialize(port);
 const context=capacityContext(store,'legacy-v1:0','a');
 const args=(session=makeSession(),name='Base')=>({store,context,scope,session,capture:{inputKey:key(session.result.assumptions),binding:capacityBinding(context,scope)},name,id:name.replaceAll(' ','-'),at,revision:store.getSnapshot().data.revision,assertActive:()=>{if(store.getSnapshot().data.goals.activeId!=='a')throw Error('Context changed');}});
 return {store,context,args,bytes:()=>bytes,setBytes:value=>bytes=value,fail:()=>fail=true};
}

test('review: explicit zero survives save and reload; unknown never becomes zero',()=>{
 const f=setup();const saved=saveCapacityScenario(f.args(makeSession({people:'0',fte:'0',volume:'0',allocation:'0'}),'Zero'));
 const opened=openCapacityScenario(f.store,f.context,saved.record.id,f.store.getSnapshot().data.revision,()=>{});
 for(const field of ['headcount','contractedFte','allocatedFte','requiredFte','gapFte'])assert.equal(opened.entry.record.result.points[0][field],0,field);
 for(const field of ['people','fte','volume','allocation']){const args=f.args(makeSession({[field]:''}),'Unknown-'+field),before=f.bytes();assert.throws(()=>saveCapacityScenario(args),/missing assumptions/);assert.equal(f.bytes(),before);}
});
test('review: reload rejects changed draft, missing scope and duplicate records',()=>{
 const f=setup();saveCapacityScenario(f.args());const original=f.store.getField('a',monthlyCapacityField,null);
 for(const mutate of [b=>b.entries[0].draft.volume='801',b=>b.scopes=[],b=>b.scopes.push(structuredClone(b.scopes[0])),b=>b.entries.push(structuredClone(b.entries[0])),b=>b.entries[0].record.result.points[0].gapFte=55]){const b=structuredClone(original);mutate(b);assert.throws(()=>readCapacityBucket(b,f.context));}
 assert.equal(readCapacityBucket(original,f.context).entries.length,1);
});
test('review: reopen rejects wrong dataset, goal, goal text and revision',()=>{
 const f=setup();const saved=saveCapacityScenario(f.args()),revision=f.store.getSnapshot().data.revision;
 for(const patch of [{datasetToken:'other:1'},{goalId:'b'},{goal:'Renamed'}])assert.throws(()=>openCapacityScenario(f.store,{...f.context,...patch},saved.record.id,revision,()=>{}));
 assert.throws(()=>openCapacityScenario(f.store,f.context,saved.record.id,revision-1,()=>{}));
});
test('review: all intended numerical alternatives compare with explicit differences',()=>{
 const f=setup(),base=saveCapacityScenario(f.args());
 const variants={hires:'1',exits:'1',volume:'850',effort:'2',hours:'155',allocation:'60',productivity:'10',people:'11',fte:'7'};
 for(const [field,value] of Object.entries(variants)){const alternate=saveCapacityScenario(f.args(makeSession({[field]:value}),'Change-'+field)),bucket=readCapacityBucket(f.store.getField('a',monthlyCapacityField,null),f.context),comparison=compareSavedCapacity(base,alternate,f.context,bucket.scopes);assert.equal(comparison.compatible,true,field);assert.ok(comparison.assumptionDifferences.length>0,field);}
});
test('review: overflow must reject before publishing and keep earlier scenarios readable',()=>{
 const f=setup();for(let i=0;i<8;i++)saveCapacityScenario(f.args(makeSession({months:'6',volume:String(800+i)}),'Scenario '+i));
 const before=f.bytes(),session=makeSession({months:'6',volume:'808'}),copy=structuredClone(session);
 assert.throws(()=>saveCapacityScenario(f.args(session,'Scenario 8')),/size limit/);
 assert.equal(f.store.getSnapshot().saved,true);
 assert.equal(f.bytes(),before);assert.deepEqual(session,copy);assert.equal(readCapacityBucket(f.store.getField('a',monthlyCapacityField,null),f.context).entries.length,8);
 const restored=new DecisionStore();restored.initialize({getItem:k=>k===DECISIONS_STORAGE_KEY?f.bytes():null,setItem:()=>{},removeItem:()=>{}});assert.equal(readCapacityBucket(restored.getField('a',monthlyCapacityField,null),capacityContext(restored,'legacy-v1:0','a')).entries.length,8);
});

// Supply different validated fields to the actual transaction callback. This
// makes a preflight-only fix fail without weakening DecisionStore's revision
// and cross-tab checks in production.
test('review: complete candidate is revalidated inside the commit callback',()=>{
 const f=setup(),full=setup();
 for(let i=0;i<8;i++){
  const session=makeSession({months:'6',volume:String(800+i)});
  saveCapacityScenario(full.args(session,'Scenario '+i));
  if(i<7)saveCapacityScenario(f.args(session,'Scenario '+i));
 }
 const eight=full.store.getField('a',monthlyCapacityField,null),commit=f.store.commitGoalFields.bind(f.store);
 let callbacks=0;
 f.store.commitGoalFields=(goalId,goal,revision,at,build)=>commit(goalId,goal,revision,at,fields=>{
  callbacks++;
  return build({...fields,[monthlyCapacityField]:eight});
 });
 const before=f.bytes(),session=makeSession({months:'6',volume:'809'}),copy=structuredClone(session);
 assert.throws(()=>saveCapacityScenario(f.args(session,'Scenario 9')),/size limit/);
 assert.equal(callbacks,1);assert.equal(f.bytes(),before);assert.deepEqual(session,copy);
 assert.equal(readCapacityBucket(f.store.getField('a',monthlyCapacityField,null),f.context).entries.length,7);
});
test('review: twenty small scenarios stay readable and the count limit rejects safely',()=>{
 const f=setup();for(let i=0;i<20;i++)saveCapacityScenario(f.args(makeSession({months:'1',volume:String(800+i)}),'Scenario '+i));
 const before=f.bytes(),session=makeSession({months:'1',volume:'820'}),copy=structuredClone(session);
 assert.throws(()=>saveCapacityScenario(f.args(session,'Scenario 20')),/20 saved/);
 assert.equal(f.bytes(),before);assert.deepEqual(session,copy);assert.equal(f.store.getSnapshot().saved,true);
 assert.equal(readCapacityBucket(f.store.getField('a',monthlyCapacityField,null),f.context).entries.length,20);
});
