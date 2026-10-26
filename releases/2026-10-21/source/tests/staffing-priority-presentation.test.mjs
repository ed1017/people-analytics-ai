import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as demo from '../lib/swp-demo.ts';
import * as leaders from '../lib/staffing-choice-summary.ts';
import * as workload from '../lib/guided-workload.ts';
import * as display from '../lib/workforce-input-display.ts';
import {acceptBundleChatEdit,previewBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
const require=createRequire(import.meta.url);
function component(file,imports={}){const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:id=>id in imports?imports[id]:id.startsWith('./')||id.startsWith('@/')?new Proxy({},{get:()=>()=>null}):require(id)});return exports;}
const load=(model=demo)=>component('staffing-priority-summary.tsx',{'@/lib/staffing-choice-summary':leaders,'@/lib/swp-demo':model}).StaffingPrioritySummary;
const render=(comparison,model=demo)=>renderToStaticMarkup(React.createElement(load(model),{comparison}));
const draft=await demo.createSwpDemo('guided-priority-view','2026-10-21T12:00:00Z');
const compared=await demo.compareSwpDemo(draft);
test('325k result shows distinct eligible cost and uncovered-work leaders with their exact quantities',()=>{
 const before=JSON.stringify(compared),html=render(compared);
 assert.match(html,/Least uncovered work/);assert.match(html,/Lowest incremental cash/);
 assert.match(html,/Redeploy 2 · Hire 3/);assert.match(html,/\$319,000 USD · 320 uncovered hours/);
 assert.match(html,/Develop 3 · Redeploy 2/);assert.match(html,/\$26,800 USD · 1,280 uncovered hours/);
 assert.doesNotMatch(html,/\$495,000|\$418,000|optimal|guarantee/i);assert.equal(JSON.stringify(compared),before);
});
test('200k result presents one shared leader without pretending the earlier affordable mix still qualifies',async()=>{
 const adjusted=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 200000')),html=render(await demo.compareSwpDemo(adjusted));
 assert.match(html,/Lowest cash and least uncovered work/);assert.equal((html.match(/Develop 3 · Redeploy 2/g)||[]).length,1);assert.doesNotMatch(html,/319,000|Redeploy 2 · Hire 3/);
});
test('no eligible option remains an actionable empty state',async()=>{
 const adjusted=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 0'));assert.match(render(await demo.compareSwpDemo(adjusted)),/No eligible option\. Review inputs and limits\./);
});
test('unknown readiness remains explicit; unknown cash or work cannot manufacture a leader',()=>{
 const option={id:'x',candidate:{mix:{build:1,move:0,buy:0},cash:{complete:0},status:'met',metrics:{fullCoverageDate:null}}};
 const model={swpTradeoffOptions:()=>[option],guidedOptionEffort:()=>({shortfallHours:0})};
 const html=render({},model);assert.match(html,/\$0 USD · 0 uncovered hours/);assert.match(html,/Readiness: Unknown/);
 assert.match(render({},{...model,guidedOptionEffort:()=>null}),/No eligible option/);
 option.candidate.cash.complete=null;assert.match(render({},model),/No eligible option/);
});
function nodes(tree){const out=[];function walk(n){if(!n||typeof n!=='object')return;out.push(n);React.Children.forEach(n.props?.children,walk);}walk(tree);return out;}
function planner(props={},valid=true){const exports=component('simple-swp-demo.tsx',{'react':{...React,useState:v=>[typeof v==='boolean'?valid:v,()=>{}]},'@/lib/swp-demo':demo,'@/lib/guided-workload':workload,'@/lib/workforce-input-display':display,'./staffing-priority-summary':{StaffingPrioritySummary:load()}});return exports.SimpleSwpDemo({draft,comparison:null,reviewing:false,edit:null,selection:null,disabled:false,editingDisabled:false,pending:false,alreadySaved:false,onCalculate:()=>{},onSelect:()=>{},onEdit:()=>{},onAccept:()=>{},onCancel:()=>{},onPrepare:()=>{},onPrimaryChange:()=>{},...props});}
test('progress is not a tab and Compare remains explicit, prominent and guarded',()=>{
 let calls=0;const all=nodes(planner({onCalculate:()=>calls++}));
 const progress=all.find(n=>n.type==='progress');assert.equal(progress.props.value,1);assert.equal(progress.props.max,3);assert.equal(all.some(n=>n.props?.role==='tab'||n.props?.className==='demo-stepper'),false);
 const button=all.find(n=>n.type==='button'&&n.props.children==='Compare staffing options');assert.ok(button);assert.equal(calls,0);button.props.onClick();assert.equal(calls,1);
 assert.ok(all.indexOf(button)<all.findIndex(n=>n.props?.scope!==undefined&&n.props?.outcome!==undefined));
 assert.equal(nodes(planner({},false)).find(n=>n.type==='button'&&n.props.children==='Compare staffing options').props.disabled,true);
 assert.equal(nodes(planner({pending:true})).some(n=>n.type==='button'&&n.props.children==='Compare staffing options'),false);
 assert.equal(nodes(planner({comparison:compared})).find(n=>n.type==='progress').props.value,2);
 assert.equal(nodes(planner({comparison:compared,reviewing:true})).find(n=>n.type==='progress').props.value,3);
});
test('pending edits keep review/cancel actions and suppress stale hero priorities',()=>{
 let accepted=0,cancelled=0;const edit={changes:[{field:'budget',before:{value:325000},after:{value:200000}}]};
 const all=nodes(planner({comparison:compared,edit,onAccept:()=>accepted++,onCancel:()=>cancelled++}));
 assert.equal(all.find(n=>n.type==='progress').props.value,1);
 assert.equal(all.find(n=>n.props?.scope!==undefined&&n.props?.outcome!==undefined).props.outcome,'Review your input changes.');
 all.find(n=>n.type==='button'&&n.props.children==='Use changes in this draft').props.onClick();all.find(n=>n.type==='button'&&n.props.children==='Cancel changes').props.onClick();assert.equal(accepted,1);assert.equal(cancelled,1);
});
