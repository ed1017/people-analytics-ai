import test from 'node:test';import assert from 'node:assert/strict';
import {createFoWWorkModel,handoffFoWWorkModel} from '../lib/fow-work-model.ts';
import {canonicalFoWLabReference} from '../lib/fow-lab-reference.ts';
import {futureWorkDefaults,calculateFutureWork} from '../lib/future-work-example.ts';
import catalog from '../data/fow-lab-reference-catalog.json' with {type:'json'};
const job=catalog.jobs[0],otherFunction=catalog.functions.find(f=>f.function_name!==job.function_name).function_name;
const numericKeys=Object.keys(futureWorkDefaults).filter(k=>k!=='scope');
test('company, function and role models retain explicit example defaults, not Lab scores or stock',()=>{
 const original=structuredClone(futureWorkDefaults);
 for(const selection of [{},{functionName:job.function_name},{jobKey:job.job_key},{jobKey:job.job_key,functionName:job.function_name,exposure:99,adoption:99,headcount:10000,fte:10000}]){
  const before=structuredClone(selection),model=createFoWWorkModel(selection);
  assert.equal(typeof model.key,'string');assert.ok(model.key);assert.deepEqual(model.reference,canonicalFoWLabReference(selection));
  for(const key of numericKeys)assert.equal(model.inputs[key],futureWorkDefaults[key],key);
  assert.deepEqual(selection,before);assert.ok(model.inputs.scope.length<=100);assert.ok(model.inputs.scope.trim());
 }
 assert.deepEqual(futureWorkDefaults,original);
});
test('canonical role/function identity is reflected in scope and model key',()=>{
 const role=createFoWWorkModel({jobKey:job.job_key}),explicit=createFoWWorkModel({jobKey:job.job_key,functionName:job.function_name}),fn=createFoWWorkModel({functionName:job.function_name}),all=createFoWWorkModel({});
 assert.equal(role.key,explicit.key);assert.notEqual(role.key,fn.key);assert.notEqual(fn.key,all.key);
 assert.equal(role.reference.selection.jobTitle,job.title);assert.equal(role.reference.selection.functionName,job.function_name);
 assert.ok(role.inputs.scope.includes(job.title));assert.ok(fn.inputs.scope.includes(job.function_name));
});
test('unknown or mismatched selections reject without fallback to a different role',()=>{
 for(const selection of [null,[],{jobKey:'missing'},{functionName:'missing'},{jobKey:job.job_key,functionName:otherFunction}]){
  assert.throws(()=>createFoWWorkModel(selection));assert.throws(()=>handoffFoWWorkModel({...futureWorkDefaults},selection));
 }
});
test('explicit handoff applies modeled effort once and retains canonical reference provenance',()=>{
 const selection={jobKey:job.job_key},model=createFoWWorkModel(selection),input={...model.inputs},before=structuredClone(input),selectionBefore=structuredClone(selection);
 const expected=calculateFutureWork(input),draft=handoffFoWWorkModel(input,selection);
 assert.deepEqual({...draft,sourceNote:expected.draft.sourceNote},expected.draft);
 assert.equal(draft.effort,'0.92');assert.equal(draft.productivity,'0');assert.equal(draft.fte,'10');assert.equal(draft.people,'10');assert.equal(draft.confirmed,false);
 assert.ok(draft.sourceNote.length<=300);
 for(const text of [catalog.meta.version,catalog.dataset.id,catalog.dataset.asOf,job.job_key])assert.ok(draft.sourceNote.includes(text),text);
 assert.deepEqual(input,before);assert.deepEqual(selection,selectionBefore);
});
test('edited assumptions drive actual calculation; Lab values never replace explicit values',()=>{
 const selection={functionName:job.function_name,exposure:100,adoption:100},input={...futureWorkDefaults,scope:'Chosen task',volume:'800',effort:'2',exposure:'0',adoption:'0'};
 const expected=calculateFutureWork(input),draft=handoffFoWWorkModel(input,selection);
 assert.equal(draft.effort,'2');assert.equal(draft.volume,'800');assert.equal(draft.productivity,'0');assert.deepEqual({...draft,sourceNote:expected.draft.sourceNote},expected.draft);
 assert.throws(()=>handoffFoWWorkModel({...input,volume:''},selection));
 assert.throws(()=>handoffFoWWorkModel({...input,months:'1.5'},selection));
});

import {capacitySpec} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
test('every Lab selection transfers a bounded note accepted by downstream capacity calculation',()=>{
 const selections=[{},...catalog.functions.map(f=>({functionName:f.function_name})),...catalog.jobs.map(j=>({jobKey:j.job_key}))];
 for(const selection of selections){
  const input={...futureWorkDefaults,scope:'A'.repeat(100),volume:'100000',effort:'24',exposure:'100.00',saving:'100.00',adoption:'100.00',realization:'100.00',release:'100.00'};
  const draft=handoffFoWWorkModel(input,selection);assert.ok(draft.sourceNote.length<=300);assert.equal(draft.confirmed,false);
  const result=calculateMonthlyWorkload(capacitySpec({...draft,confirmed:true}));assert.equal(result.status,'calculated');assert.equal(draft.effort,'0');assert.equal(draft.fte,'10');assert.equal(draft.costRate,'');
 }
});
import {DecisionStore,encodeDecisions} from '../lib/local-decisions.ts';
import {capacityBinding,saveCapacityScenario,openCapacityScenario} from '../lib/swp-capacity-store.ts';
import {calculateCapacityCost,capacityCostAssumptions,capacityCalculationKey} from '../lib/swp-capacity-cost.ts';
test('transferred task assumptions save and reopen through existing scenario versions without changing prior fields',()=>{
 const context={datasetToken:'legacy-v1:0',goalId:'task',goal:'Review task redesign'},at='2026-10-28T20:00:00.000Z';
 let raw=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'task',goals:[{id:'task',statement:context.goal}]},workspaces:{task:{savedAt:at,fields:{priorPlan:{id:'keep'}}}}});
 const store=new DecisionStore();store.initialize({getItem:()=>raw,setItem:(_k,v)=>{raw=v;},removeItem:()=>{}});
 const draft={...handoffFoWWorkModel({...futureWorkDefaults},{jobKey:job.job_key}),confirmed:true};
 const scope={id:'task-scope',label:draft.scope,workUnit:draft.scope},result=calculateMonthlyWorkload(capacitySpec(draft)),cost=calculateCapacityCost(result,capacityCostAssumptions(draft.costRate));
 saveCapacityScenario({store,context,scope,capture:{inputKey:capacityCalculationKey(result,cost),binding:capacityBinding(context,scope)},session:{draft,result,cost,error:''},name:'Task scenario',id:'task-scenario',at,revision:store.getSnapshot().data.revision,assertActive:()=>{}});
 const opened=openCapacityScenario(store,context,'task-scenario',store.getSnapshot().data.revision,()=>{});
 assert.deepEqual(opened.entry.draft,draft);assert.deepEqual(opened.entry.record.result,result);assert.deepEqual(store.getSnapshot().data.workspaces.task.fields.priorPlan,{id:'keep'});assert.equal(opened.entry.draft.productivity,'0');assert.equal(opened.entry.draft.costRate,'');
});
