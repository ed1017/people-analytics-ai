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
import * as finance from '../lib/position-finance-store.ts';
import * as market from '../lib/position-market-assumptions.ts';

const require=createRequire(import.meta.url);
const source=ts.transpileModule(fs.readFileSync(new URL('../components/workforce-planning/position-allocation-planner.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
}).outputText;
const ids=inventory.DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id);
const example=()=>allocation.createPositionAllocation(ids,true);
const storedLedger=()=>({version:1,datasetToken:'test:1',goalId:'',records:[{
 scenarioId:'saved-original',scenarioNumber:1,revision:1,sequence:1,savedAt:'2026-10-30T00:00:00.000Z',
 draft:example(),result:allocation.calculatePositionAllocation(example()),
}]});

// Same transpiled-component hook harness used by position-dashboard.test.mjs.
// Actual allocation validators run; only browser storage and DOM focus are isolated.
function renderHarness(initialDraft=null,initialLedger=storedLedger(),initialProps={}){
 let hooks=[],cursor=0,writes=0,focused=null,props=initialProps;const effects=[];
 const callbacks=[],exports={};
 const fields={...(initialDraft?{[ledger.POSITION_ALLOCATION_DRAFT_FIELD]:structuredClone(initialDraft)}:{}),[ledger.POSITION_ALLOCATION_LEDGER_FIELD]:structuredClone(initialLedger)};
 const data={workspaces:{},exploration:{fields},goals:{goals:[],activeId:''},revision:0};
 const snapshot={data,ready:true,saved:true};
 const store={getDatasetToken:()=> 'test:1',getSnapshot:()=>snapshot,setField:(_goal,key,value)=>{writes++;fields[key]=value;},commitExplorationFields:(revision,_at,build)=>{assert.equal(revision,data.revision);const patch=build(structuredClone(fields));Object.assign(fields,structuredClone(patch));data.revision++;writes++;}};
 const useState=initial=>{const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value;}];};
 const react={...React,useEffect:(fn,deps)=>{const i=cursor++,previous=hooks[i];if(!previous||deps.some((v,j)=>v!==previous[j]))effects.push(fn);hooks[i]=deps;},useState,useMemo:fn=>fn(),useId:()=>':inventory:',useRef:initial=>{const i=cursor++;if(!(i in hooks))hooks[i]={current:initial};return hooks[i];}};
 vm.runInNewContext(source,{exports,require:name=>{
  if(name==='react')return react;
  if(name==='@/components/interactive-planner')return {InteractivePlanner:'Planner'};
  if(name==='@/components/decision-store')return {decisionStore:store,useDecisionStorage:()=>snapshot};
  if(name==='./planning-session-context')return {usePlanningSession:()=>({goalKey:'test:'})};
  if(name==='@/lib/position-inventory')return inventory;
  if(name==='@/lib/position-allocation')return allocation;
  if(name==='@/lib/position-allocation-store')return ledger;
  if(name==='@/lib/position-finance-store')return finance;
  if(name==='@/lib/position-market-assumptions')return market;
  if(name==='./position-market-assumptions')return {PositionMarketAssumptions:'PositionMarketAssumptions'};
  if(name==='./position-finance-panel')return {PositionFinancePanel:'PositionFinancePanel'};
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
  walk(exports.PositionInventoryWorkspace({goalId:'',datasetToken:'test:1',...props}));
  return nodes;
 }
 function click(label){const node=render().find(n=>n.type==='button'&&n.props.children===label);assert.ok(node,`Missing button: ${label}`);node.props.onClick({currentTarget:{focus:()=>{focused=label;}}});}
 return {render,click,fields,data,setProps:next=>{props=next;},writes:()=>writes,focused:()=>focused,flush:()=>{render();effects.splice(0).forEach(fn=>fn());render();callbacks.splice(0).forEach(fn=>fn());}};
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


test('explicit Overview handoff preserves existing edits until confirmation and opens exact finance binding',()=>{
 const draft=example();draft.input.budgetUsd=234567;const h=renderHarness(draft),original=JSON.stringify(h.fields),saved=storedLedger().records[0];
 const request={requestId:'one',scenarioId:saved.scenarioId,revision:saved.revision,allocationSignature:finance.positionAllocationSignature(saved.draft),financeRevision:null};
 h.setProps({embedded:true,handoffRequest:request});h.flush();assert.ok(confirmation(h));assert.equal(h.writes(),0);assert.equal(h.focused(),'Cancel');
 h.click('Cancel');h.flush();assert.equal(JSON.stringify(h.fields),original);assert.equal(confirmation(h),undefined);
 h.setProps({embedded:true,handoffRequest:{...request,requestId:'two'}});h.flush();h.click('Replace current draft');h.flush();assert.equal(h.writes(),1);
 const panel=h.render().find(n=>n.type==='PositionFinancePanel');assert.equal(panel.props.initialFinanceRevision,null);assert.equal(panel.props.savedCapture.scenarioId,saved.scenarioId);assert.equal(panel.props.savedCapture.revision,1);
 assert.equal(h.fields[ledger.POSITION_ALLOCATION_DRAFT_FIELD].input.budgetUsd,saved.draft.input.budgetUsd);assert.equal(h.focused(),'Current position scenario');
});


test('native reopen requires confirmation, Cancel retains edits, then opens exact saved revision',()=>{
 const draft=example();draft.input.budgetUsd=234567;const h=renderHarness(draft),before=JSON.stringify(h.fields);
 const select=()=>h.render().find(n=>n.type==='select'&&n.props['aria-label']==='Saved position revision');
 select().props.onChange({target:{value:'saved-original:1'}});h.click('Open revision (replace draft)');h.flush();assert.ok(confirmation(h));assert.equal(h.writes(),0);assert.equal(h.focused(),'Cancel');
 h.click('Cancel');h.flush();assert.equal(JSON.stringify(h.fields),before);assert.equal(h.focused(),'Open revision (replace draft)');
 h.click('Open revision (replace draft)');h.flush();h.click('Replace current draft');h.flush();assert.equal(h.writes(),1);assert.equal(h.fields[ledger.POSITION_ALLOCATION_DRAFT_FIELD].input.budgetUsd,150000);
 assert.equal(h.render().find(n=>n.type==='PositionFinancePanel').props.initialFinanceRevision,null);assert.equal(h.focused(),'Current position scenario');
});

test('native reopen revalidates goal at confirmation and inactive planner keeps form draft',()=>{
 const draft=example();draft.input.budgetUsd=234567;const h=renderHarness(draft),before=JSON.stringify(h.fields);
 h.setProps({active:false});assert.equal(h.render().find(n=>n.type==='PositionFinancePanel').props.active,false);assert.equal(JSON.stringify(h.fields),before);
 h.render().find(n=>n.type==='select'&&n.props['aria-label']==='Saved position revision').props.onChange({target:{value:'saved-original:1'}});
 h.click('Open revision (replace draft)');h.flush();h.data.goals.activeId='different';h.click('Replace current draft');assert.equal(h.writes(),0);assert.equal(JSON.stringify(h.fields),before);
});


test('native reopen retains unsupported persisted draft rather than replacing it with a saved revision',()=>{
 const unsupported={...example(),modelVersion:'unsupported-next-version'},h=renderHarness(unsupported),before=JSON.stringify(h.fields);
 h.render().find(n=>n.type==='select'&&n.props['aria-label']==='Saved position revision').props.onChange({target:{value:'saved-original:1'}});
 h.click('Open revision (replace draft)');h.flush();assert.equal(h.writes(),0);assert.equal(JSON.stringify(h.fields),before);assert.equal(confirmation(h),undefined);
 assert.ok(h.render().some(n=>n.props?.role==='alert'&&typeof n.props.children==='string'&&n.props.children.includes('unsupported and has been retained')));
});
