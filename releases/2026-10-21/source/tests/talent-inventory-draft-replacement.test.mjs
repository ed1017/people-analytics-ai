import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import ts from 'typescript';
import * as inventory from '../lib/position-inventory.ts';
import * as allocation from '../lib/position-allocation.ts';
import * as ledger from '../lib/position-allocation-store.ts';

const require=createRequire(import.meta.url);
const source=ts.transpileModule(fs.readFileSync(new URL('../components/workforce-planning/talent-inventory-scenarios.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
}).outputText;
const ids=inventory.DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id);
const example=()=>allocation.createPositionAllocation(ids,true);
const storedLedger=()=>({version:1,datasetToken:'test',goalId:'',records:[{
 scenarioId:'saved-original',scenarioNumber:1,revision:1,sequence:1,savedAt:'2026-10-30T00:00:00.000Z',
 draft:example(),result:allocation.calculatePositionAllocation(example()),
}]});

// Same transpiled-component hook harness used by position-dashboard.test.mjs.
// Actual allocation validators run; only browser storage and DOM focus are isolated.
function renderHarness(initialDraft=null,initialLedger=storedLedger()){
 let hooks=[],cursor=0,writes=0,focused=null;
 const callbacks=[],exports={};
 const fields={...(initialDraft?{[ledger.POSITION_ALLOCATION_DRAFT_FIELD]:structuredClone(initialDraft)}:{}),[ledger.POSITION_ALLOCATION_LEDGER_FIELD]:structuredClone(initialLedger)};
 const data={workspaces:{},exploration:{fields},goals:{goals:[],activeId:''},revision:0};
 const snapshot={data,ready:true,saved:true};
 const store={getDatasetToken:()=> 'test',getSnapshot:()=>snapshot,setField:(_goal,key,value)=>{writes++;fields[key]=value;}};
 const useState=initial=>{const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value;}];};
 const react={...React,useState,useMemo:fn=>fn(),useId:()=>':inventory:',useRef:initial=>{const i=cursor++;if(!(i in hooks))hooks[i]={current:initial};return hooks[i];}};
 vm.runInNewContext(source,{exports,require:name=>{
  if(name==='react')return react;
  if(name==='@/components/interactive-planner')return {InteractivePlanner:'Planner'};
  if(name==='@/components/decision-store')return {decisionStore:store,useDecisionStorage:()=>snapshot};
  if(name==='./planning-session-context')return {usePlanningSession:()=>({goalKey:'test:'})};
  if(name==='@/lib/position-inventory')return inventory;
  if(name==='@/lib/position-allocation')return allocation;
  if(name==='@/lib/position-allocation-store')return ledger;
  if(name==='./position-allocation-visuals')return {InventoryCharts:'InventoryCharts',AllocationVisuals:'AllocationVisuals'};
  return require(name);
 },requestAnimationFrame:fn=>callbacks.push(fn),structuredClone,Intl,crypto,console});
 function render(){
  cursor=0;const nodes=[];
  function walk(node){
   if(!node||typeof node!=='object')return;
   nodes.push(node);
   if(node.props?.ref)node.props.ref.current={focus:()=>{focused=node.props['aria-label']??node.props.children;}};
   React.Children.forEach(node.props?.children,walk);
   if(node.type==='Planner')for(const key of ['levers','visual','actions','supplement'])walk(node.props[key]);
  }
  walk(exports.PositionInventoryWorkspace({goalId:'',datasetToken:'test'}));
  return nodes;
 }
 function click(label){const node=render().find(n=>n.type==='button'&&n.props.children===label);assert.ok(node,`Missing button: ${label}`);node.props.onClick({currentTarget:{focus:()=>{focused=label;}}});}
 return {render,click,fields,data,writes:()=>writes,focused:()=>focused,flush:()=>{render();callbacks.splice(0).forEach(fn=>fn());}};
}
const confirmation=h=>h.render().find(n=>n.props?.['aria-label']==='Confirm position draft replacement');
const register=h=>h.render().find(n=>n.type==='details'&&Object.hasOwn(n.props,'open'));

test('initial inventory is open; first launch writes once and presents planner before collapsed register',()=>{
 const h=renderHarness();assert.equal(register(h).props.open,true);
 h.click('Try the 12-vacancy example');h.flush();assert.equal(h.writes(),1);assert.equal(confirmation(h),undefined);
 assert.equal(register(h).props.open,false);assert.equal(h.focused(),'Current position scenario');
 const nodes=h.render();assert.ok(nodes.findIndex(n=>n.type==='Planner')<nodes.findIndex(n=>n.type==='details'&&Object.hasOwn(n.props,'open')));
 register(h).props.onToggle({currentTarget:{open:true}});assert.equal(register(h).props.open,true);
});

test('repeated example selection and cancel never write or discard existing edits and saved revisions',()=>{
 const draft=example();draft.input.budgetUsd=234567;
 const h=renderHarness(draft),before=JSON.stringify(h.fields);
 h.click('Try the 12-vacancy example');h.flush();assert.ok(confirmation(h));assert.equal(h.focused(),'Cancel');
 h.click('Try the 12-vacancy example');assert.equal(h.writes(),0);
 h.click('Cancel');h.flush();assert.equal(confirmation(h),undefined);assert.equal(h.writes(),0);
 assert.equal(JSON.stringify(h.fields),before);assert.equal(h.focused(),'Try the 12-vacancy example');
});

test('explicit confirmation replaces only the working draft once and preserves original ledger',()=>{
 const draft=example();draft.input.budgetUsd=234567;
 const h=renderHarness(draft),before=JSON.stringify(h.fields[ledger.POSITION_ALLOCATION_LEDGER_FIELD]);
 h.click('Try the 12-vacancy example');assert.equal(h.writes(),0);
 h.click('Replace current draft');h.flush();assert.equal(h.writes(),1);assert.equal(confirmation(h),undefined);
 assert.equal(h.fields[ledger.POSITION_ALLOCATION_DRAFT_FIELD].input.budgetUsd,150000);
 assert.equal(JSON.stringify(h.fields[ledger.POSITION_ALLOCATION_LEDGER_FIELD]),before);
 assert.equal(h.focused(),'Current position scenario');
});

test('Plan selected vacancies uses the same explicit replacement safeguard',()=>{
 const h=renderHarness(example()),before=JSON.stringify(h.fields);
 h.click('Select filtered vacancies');
 const button=h.render().find(n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children[0]==='Plan selected vacancies (');
 assert.ok(button);assert.equal(button.props.disabled,false);button.props.onClick({currentTarget:{focus(){}}});
 assert.ok(confirmation(h));assert.equal(h.writes(),0);h.click('Cancel');assert.equal(JSON.stringify(h.fields),before);
});

test('reload restores edits with register collapsed but does not persist pending replacement',()=>{
 const draft=example();draft.input.budgetUsd=234567;const h=renderHarness(draft);
 h.click('Try the 12-vacancy example');assert.ok(confirmation(h));
 const reloaded=renderHarness(h.fields[ledger.POSITION_ALLOCATION_DRAFT_FIELD],h.fields[ledger.POSITION_ALLOCATION_LEDGER_FIELD]);
 assert.equal(confirmation(reloaded),undefined);assert.equal(register(reloaded).props.open,false);
 assert.equal(reloaded.fields[ledger.POSITION_ALLOCATION_DRAFT_FIELD].input.budgetUsd,234567);assert.equal(reloaded.writes(),0);
});

test('goal changes block a previously rendered replacement before any storage write',()=>{
 const h=renderHarness(example()),before=JSON.stringify(h.fields);h.click('Try the 12-vacancy example');
 h.data.goals.activeId='another-goal';h.click('Replace current draft');assert.equal(h.writes(),0);assert.equal(JSON.stringify(h.fields),before);
 assert.ok(h.render().some(n=>n.props?.role==='alert'&&n.props.children==='The goal or dataset changed. Reopen this workspace.'));
});
