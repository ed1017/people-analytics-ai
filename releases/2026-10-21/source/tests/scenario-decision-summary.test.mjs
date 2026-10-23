import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import * as choice from '../lib/staffing-choice-summary.ts';import * as swp from '../lib/swp-demo.ts';import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
const require=createRequire(import.meta.url),exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/scenario-decision-summary.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(code,{exports,require:id=>id==='@/lib/staffing-choice-summary'?choice:id==='@/lib/swp-demo'?swp:require(id)});
test('shared leaders preserve a cash/coverage tradeoff and ignore unverified options',()=>{
 const rows=[{mix:{build:3,move:2,buy:0},cash:26800,shortfallHours:1280,status:'met'},{mix:{build:0,move:2,buy:3},cash:319000,shortfallHours:320,status:'met'},{mix:{build:0,move:0,buy:5},cash:1,shortfallHours:0,status:'unknown'}];const before=JSON.stringify(rows),r=choice.staffingChoiceLeaders(rows);assert.equal(r.same,false);assert.equal(r.cash,rows[0]);assert.equal(r.coverage,rows[1]);assert.equal(JSON.stringify(rows),before);
});
test('decision summary renders actual revised calculations without auto-selecting or inventing affordability',async()=>{
 const draft=await swp.createSwpDemo('guided-swp-summary','2026-10-23T12:00:00Z');
 for(const budget of [325000,100000,0]){
 const next=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to '+budget));const comparison=await swp.compareSwpDemo(next),before=JSON.stringify(comparison);const html=renderToStaticMarkup(React.createElement(exports.ScenarioDecisionSummary,{comparison}));
 assert.equal(JSON.stringify(comparison),before);assert.doesNotMatch(html,/<input|<button/);
 if(budget===0)assert.match(html,/No displayed option has verified calculations/);else{assert.match(html,/26,800/);assert.match(html,/Conditional readiness/);assert.match(html,/Uncovered work/);if(budget===325000){assert.match(html,/319,000/);assert.match(html,/Choose lower cash or less uncovered work/);}else assert.doesNotMatch(html,/319,000/);}
 }
});

test('unknown and incomplete comparisons do not imply demonstrated infeasibility',()=>{for(const options of [[],[{id:'unknown',candidate:{mix:{build:0,move:0,buy:1},cash:{complete:null},status:'unknown',metrics:null}}]]){const isolated={};vm.runInNewContext(code,{exports:isolated,require:id=>id==='@/lib/staffing-choice-summary'?choice:id==='@/lib/swp-demo'?{swpTradeoffOptions:()=>options,guidedOptionEffort:()=>null}:require(id)});const html=renderToStaticMarkup(React.createElement(isolated.ScenarioDecisionSummary,{comparison:{evaluation:{}}}));assert.match(html,/No displayed option has verified calculations/);assert.match(html,/missing inputs/);assert.doesNotMatch(html,/No calculated option meets/);}});
