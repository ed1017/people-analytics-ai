import test from 'node:test';
import assert from 'node:assert/strict';
import {packPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
import {appendGoalProgressEvent,goalProgressField} from '../lib/goal-progress.ts';
import {activeResults,commitManualResult,manualPlanResultsField,prepareManualResult,readManualResults,resultDifference} from '../lib/manual-plan-results.ts';

import {manualResultFixture as fixture} from './fixtures/manual-plan-results.mjs';
const at='2027-12-31T12:00:00.000Z';
const input=(target,extra={})=>({value:0,measuredOn:target.date,sourceNote:'Aggregate count from the dated staffing report; manually reviewed.',supersedes:null,scopeConfirmed:true,...extra});

test('guided target is explicit scenario coverage, never headcount or verified outcome',async()=>{
 const f=await fixture(),t=prepareManualResult(f.store,'plan-one');
 assert.equal(t.target.metric,'additional-role-coverage');assert.equal(t.target.unit,'roles');assert.equal(t.target.illustrative,true);assert.match(t.target.definition,/Training completion alone does not count/);assert.match(t.target.population,/Service Analyst/);
 assert.equal(f.read().entries.length,0);assert.equal(f.fields()[goalProgressField].events.length,0);
});
test('zero and negative/positive neutral differences are safe, with no division by zero',async()=>{
 const f=await fixture({headcount:true,value:0}),t=prepareManualResult(f.store,'plan-one');
 assert.equal(resultDifference(t.target,{value:0,measuredOn:t.target.date}).difference,0);
 assert.equal(resultDifference(t.target,{value:7,measuredOn:t.target.date}).difference,7);
 const negative={...t.target,value:10};assert.equal(resultDifference(negative,{value:0,measuredOn:negative.date}).difference,-10);
 commitManualResult(f.store,t,input(t.target),at,'zero');assert.equal(f.read().entries[0].value,0);
});
test('unknown stays null, blank cannot become zero, and missing remains empty',async()=>{
 const f=await fixture(),t=prepareManualResult(f.store,'plan-one');assert.deepEqual(activeResults(f.read(),t.target),[]);
 for(const value of ['',undefined,NaN,Infinity,-1,1.5])assert.throws(()=>commitManualResult(f.store,t,input(t.target,{value}),at,'bad'));
 commitManualResult(f.store,t,input(t.target,{value:null}),at,'unknown');assert.equal(f.read().entries[0].value,null);assert.equal(resultDifference(t.target,f.read().entries[0]).difference,null);
});
test('interim and late point measurements are preserved without incompatible end-date arithmetic',async()=>{
 const f=await fixture({headcount:true}),t=prepareManualResult(f.store,'plan-one');
 const interim=input(t.target,{value:10,measuredOn:'2026-11-30'});assert.match(resultDifference(t.target,interim).note,/Interim measurement/);assert.equal(resultDifference(t.target,interim).difference,null);
 assert.equal(resultDifference(t.target,{value:121,measuredOn:'2027-01-31'}).difference,null);
 commitManualResult(f.store,t,interim,at,'interim');assert.equal(f.read().entries[0].measuredOn,'2026-11-30');assert.equal(f.read().entries[0].recordedAt,at);
});
test('percentage, interval and partial-period contracts are unavailable, never inferred or divided',async()=>{
 const f=await fixture({headcount:true,metric:'turnover',value:8});
 assert.throws(()=>prepareManualResult(f.store,'plan-one'),/percentages, rates and period totals/);
 const g=await fixture(),t=prepareManualResult(g.store,'plan-one');
 assert.throws(()=>resultDifference({...t.target,unit:'percent'},{value:7,measuredOn:t.target.date}),/Unsupported measurement contract/);
 assert.throws(()=>commitManualResult(g.store,t,{...input(t.target),period:{kind:'interval',start:'2026-01-01',end:'2026-06-30'}},at,'partial'),/Unsupported saved result fields/);
 assert.equal(g.read().entries.length,0);
});
test('corrections preserve original entry, exact target and recording times through reload',async()=>{
 const f=await fixture(),t=prepareManualResult(f.store,'plan-one');commitManualResult(f.store,t,input(t.target,{value:3}),at,'first');
 const next=prepareManualResult(f.store,'plan-one');commitManualResult(f.store,next,input(t.target,{value:2,sourceNote:'Correction: aggregate roster included an unreleased role.',supersedes:'first'}),'2028-01-01T12:00:00.000Z','correction');
 const reopened=new DecisionStore();reopened.initialize(f.port);const ledger=readManualResults(reopened.getField(f.goalId,manualPlanResultsField,null),f.goalId);
 assert.equal(ledger.entries.length,2);assert.equal(ledger.entries[0].value,3);assert.equal(ledger.entries[1].supersedes,'first');assert.deepEqual(ledger.targets[0].target,t.target);assert.deepEqual(activeResults(ledger,t.target).map(e=>e.id),['correction']);
});
test('cross-plan correction and duplicate date are rejected; plans keep distinct results',async()=>{
 const f=await fixture(),one=prepareManualResult(f.store,'plan-one');commitManualResult(f.store,one,input(one.target,{value:3}),at,'one');
 const two=prepareManualResult(f.store,'plan-two');assert.throws(()=>commitManualResult(f.store,two,input(two.target,{supersedes:'one'}),at,'bad'),/exact plan target/);
 commitManualResult(f.store,two,input(two.target,{value:1}),at,'two');
 assert.deepEqual(activeResults(f.read(),one.target).map(e=>e.value),[3]);assert.deepEqual(activeResults(f.read(),two.target).map(e=>e.value),[1]);
 assert.throws(()=>commitManualResult(f.store,prepareManualResult(f.store,'plan-one'),input(one.target),at,'duplicate'),/Correct entry/);
});
test('scope, unit, target, goal, revision or dataset cannot be swapped after review',async()=>{
 for(const change of [t=>({...t,target:{...t.target,population:'Other team'}}),t=>({...t,target:{...t.target,unit:'percent'}}),t=>({...t,target:{...t.target,value:999}}),t=>({...t,write:{...t.write,goalId:'other'}}),t=>({...t,write:{...t.write,decisionRevision:0}}),t=>({...t,write:{...t.write,datasetToken:'legacy-v1:1'}})]){
  const f=await fixture(),t=prepareManualResult(f.store,'plan-one');assert.throws(()=>commitManualResult(f.store,change(t),input(t.target),at,'bad'),/changed/);assert.equal(f.read().entries.length,0);
 }
});
test('source note, scope confirmation, valid date and bounded count are mandatory',async()=>{
 const f=await fixture(),t=prepareManualResult(f.store,'plan-one');
 for(const extra of [{sourceNote:''},{sourceNote:'x'.repeat(601)},{scopeConfirmed:false},{measuredOn:'2029-01-01'},{measuredOn:'2027-02-30'},{value:1e9+1}])assert.throws(()=>commitManualResult(f.store,t,input(t.target,extra),at,'invalid'));
 assert.equal(f.read().entries.length,0);
});
test('failed quota and another-tab writes never publish a candidate result',async()=>{
 for(const failure of ['quota','conflict']){
  const f=await fixture(),t=prepareManualResult(f.store,'plan-one'),before=structuredClone(f.store.getSnapshot().data);
  if(failure==='quota')f.port.setItem=()=>{throw Error('Quota exceeded');};else {const other=new DecisionStore();other.initialize(f.port);other.setField(f.goalId,'unrelated','another tab');}
  assert.throws(()=>commitManualResult(f.store,t,input(t.target),at,'failed'));
  assert.deepEqual(f.store.getSnapshot().data,before);assert.equal(f.read().entries.length,0);
 }
});
test('target revision at original plan link is retained when goal measurement changes',async()=>{
 const f=await fixture({headcount:true}),t=prepareManualResult(f.store,'plan-one');commitManualResult(f.store,t,input(t.target,{value:100}),at,'first');
 let ledger=f.fields()[goalProgressField];const old=ledger.events.find(e=>e.kind==='measurement');
 ledger=appendGoalProgressEvent(ledger,{...old,id:'measurement-two',at,supersedes:old.id,data:{...old.data,target:{...old.data.target,value:150}}});f.store.setField(f.goalId,goalProgressField,ledger);
 assert.equal(prepareManualResult(f.store,'plan-one').target.value,120);assert.equal(f.read().targets[0].target.measurementId,'measurement-one');
});
test('unattached or deleted plans cannot receive results and old fields are untouched',async()=>{
 const f=await fixture(),before=structuredClone(f.fields()),t=prepareManualResult(f.store,'plan-one');commitManualResult(f.store,t,input(t.target),at,'first');
 assert.deepEqual(f.fields()[planAlternativesField],before[planAlternativesField]);assert.deepEqual(f.fields()[goalProgressField],before[goalProgressField]);
 f.catalog.attachments=[];f.store.setField(f.goalId,planAlternativesField,packPlanAlternatives(f.catalog));assert.throws(()=>prepareManualResult(f.store,'plan-one'),/attached saved plan/);assert.equal(f.read().entries.length,1);
});
test('corrupted history fails closed, never resets or silently prunes prior records',async()=>{
 const f=await fixture(),t=prepareManualResult(f.store,'plan-one');commitManualResult(f.store,t,input(t.target),at,'first');
 const ledger=f.read();ledger.entries[0].value='0';f.store.setField(f.goalId,manualPlanResultsField,ledger);
 assert.throws(()=>prepareManualResult(f.store,'plan-one'));assert.equal(f.fields()[manualPlanResultsField].entries[0].value,'0');
});
test('backfilled measurements do not replace the latest measured result',async()=>{
 const f=await fixture({headcount:true}),t=prepareManualResult(f.store,'plan-one');
 commitManualResult(f.store,t,input(t.target,{value:10,measuredOn:'2026-12-31'}),at,'latest');
 commitManualResult(f.store,prepareManualResult(f.store,'plan-one'),input(t.target,{value:4,measuredOn:'2026-11-30'}),'2028-01-01T12:00:00.000Z','backfill');
 assert.equal(activeResults(f.read(),t.target).at(-1).id,'latest');
});
test('changing real stored revision, active goal or dataset after opening invalidates review',async()=>{
 for(const change of ['revision','goal','dataset']){
  const f=await fixture(),t=prepareManualResult(f.store,'plan-one');let store=f.store;
  if(change==='revision')store.setField(f.goalId,'unrelated','saved during review');
  if(change==='goal'){const goals=structuredClone(store.getSnapshot().data.goals);goals.activeId=null;store.saveGoals(goals);}
  if(change==='dataset'){store=new DecisionStore('fictional-other:1',f.store.getSnapshot().data.goals);store.initialize(f.port);}
  assert.throws(()=>commitManualResult(store,t,input(t.target),at,'stale'));assert.equal(f.read().entries.length,0);
 }
});
test('bounded history refuses the 101st entry without pruning or marking saved data unsaved',async()=>{
 const f=await fixture(),t=prepareManualResult(f.store,'plan-one');
 for(let i=0;i<100;i++){const measuredOn=new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10);commitManualResult(f.store,prepareManualResult(f.store,'plan-one'),input(t.target,{measuredOn}),at,'entry-'+i);}
 const before=f.read();assert.throws(()=>commitManualResult(f.store,prepareManualResult(f.store,'plan-one'),input(t.target,{measuredOn:'2026-05-01'}),at,'over-limit'),/invalid or full/);
 assert.deepEqual(f.read(),before);assert.equal(f.store.getSnapshot().saved,true);
});
