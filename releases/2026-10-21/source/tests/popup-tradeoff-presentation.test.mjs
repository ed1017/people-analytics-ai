import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as demo from '../lib/swp-demo.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import * as workload from '../lib/guided-workload.ts';
import * as title from '../lib/staffing-option-title.ts';
import * as summary from '../lib/guided-plan-summary.ts';
import * as parity from '../lib/scenario-planning-parity.ts';
import * as inputDisplay from '../lib/workforce-input-display.ts';
import {componentModule} from './fixtures/component-module.mjs';
import * as catalog from '../lib/catalog-display.ts';
import * as choice from '../lib/staffing-choice-summary.ts';
const planner=componentModule('interactive-planner.tsx',{'@/lib/catalog-display':catalog});
const decision=componentModule('scenario-decision-summary.tsx',{'@/lib/staffing-choice-summary':choice,'@/lib/swp-demo':demo});
const require=createRequire(import.meta.url);
function component(path,modules={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/'+path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>modules[id]??require(id)});return exports;}
const cost=component('staffing-option-cost.tsx',{'@/lib/guided-plan-summary':summary});
const table=component('staffing-options-table.tsx');
const priority=component('staffing-priority-summary.tsx',{'@/lib/staffing-choice-summary':choice,'@/lib/swp-demo':demo});
const {SimpleSwpDemo}=component('simple-swp-demo.tsx',{'./staffing-priority-summary':priority,'./interactive-planner':planner,'./scenario-decision-summary':decision,'./staffing-options-table':table,'@/lib/workforce-input-display':inputDisplay,'@/lib/scenario-planning-parity':parity,'./staffing-option-cost':cost,'@/lib/staffing-option-title':title,'@/lib/guided-workload':workload,'@/lib/swp-demo':demo,'./swp-demo-inputs':{SwpDemoInputs:()=>null},'./guided-workload-summary':{GuidedWorkloadSummary:()=>null},'./swp-outcome-chart':{SwpOutcomeChart:()=>null}});
const draft=await demo.createSwpDemo('guided-popup-test','2026-10-20T12:00:00Z'),comparison=await demo.compareSwpDemo(draft);
const noop=()=>{};
const render=(selection=null,value=comparison,scenario=draft)=>renderToStaticMarkup(React.createElement(SimpleSwpDemo,{draft:scenario,comparison:value,selection,reviewing:false,edit:null,disabled:false,editingDisabled:false,pending:false,onSelect:noop,onEdit:noop,onAccept:noop,onCancel:noop,onCalculate:noop,onPrepare:noop,onPrimaryChange:noop,alreadySaved:false}));
test('business question follows accepted gap and budget without treating zero or unknown as defaults',()=>{
 const question=scenario=>render(null,null,scenario).match(/<h3 id="scenario-business-question">([\s\S]*?)<\/h3>/)[1].replace(/<[^>]*>/g,'');
 assert.equal(question(draft),'How would you close a 5 FTE capacity gap with a $325,000 USD budget?');
 const changed=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set Service units per month to 1120; Set budget to 500000'));
 assert.equal(question(changed),'How would you close a 4 FTE capacity gap with a $500,000 USD budget?');
 const zero=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 0'));
 assert.match(question(zero),/\$0 USD budget/);
 const unknown=structuredClone(draft);unknown.inputs.budget.amount.value=null;
 assert.equal(question(unknown),'What capacity gap and budget should this plan address?');
});
test('shared table retains six bounded options and exact dates with no default selection',()=>{
 const html=render();
 assert.match(html,/<progress aria-label="Planning progress" max="3" value="2"/);assert.match(html,/Calculated staffing priorities/);assert.doesNotMatch(html.replace(/<[^>]*>/g,''),/\bdemo\b/i);
 for(const value of ['26,800','319,000','2027-01-01','2026-12-01','1,280','320','$325,000'])assert.ok(html.includes(value),value);
 assert.equal((html.match(/data-staffing-option=/g)||[]).length,6);
 assert.match(html,/Incremental cash/);assert.doesNotMatch(html,/checked=""/);
 assert.equal((html.match(/aria-label="Selected staffing option details"/g)||[]).length,1);
 assert.doesNotMatch(html,/aria-label="Incremental cash components"/);
});
test('selection renders one shared collapsed cost region and non-color selection label',()=>{
 for(const option of comparison.options.filter(o=>!o.candidate.isReferenceMix)){
  const html=render(option.id);
  assert.equal((html.match(/aria-label="Incremental cash components"/g)||[]).length,1);
  assert.match(html,/checked=""/);assert.match(html,/ - Selected/);
  assert.match(html,/Selection|Selected:/);assert.doesNotMatch(html,/<details[^>]*\bopen/);
 }
});
for(const [budget,count] of [[0,0],[10000,0],[100000,1],[325000,3]])test(`accepted budget ${budget} truthfully presents ${count} feasible alternatives`,async()=>{
 const original=await demo.createSwpDemo('guided-popup-budget-'+budget,'2026-10-20T12:00:00Z');
 const scenario=acceptBundleChatEdit(original,previewBundleChatEdit(original,`Set budget to ${budget}`));
 assert.equal(scenario.inputs.budget.amount.value,budget);
 const actual=await demo.compareSwpDemo(scenario),alternatives=actual.options.filter(o=>o.candidate.status==='met');
 assert.equal(alternatives.length,count);assert.ok(alternatives.every(o=>o.candidate.status==='met'&&o.candidate.cash.complete<=budget));
 const html=render(null,actual,scenario);
 const displayed=demo.swpTradeoffOptions(actual.evaluation);assert.equal(displayed.length,6);
 assert.deepEqual(displayed.map(o=>o.id),actual.options.map(o=>o.id));
 for(const option of displayed)assert.ok(html.includes('data-staffing-option="'+option.id+'"'));
 for(const option of displayed)assert.ok(html.includes(option.candidate.cash.complete.toLocaleString('en-US')));
 if(count>0)assert.ok(html.includes('26,800'));assert.ok(html.includes('319,000'));assert.ok(html.includes('320'));
 if(count===0)assert.match(html,/No alternative staffing option meets the entered staffing and budget limits/);
 else if(count===1)assert.match(html,/One alternative staffing option meets the entered staffing and budget limits/);
 else assert.doesNotMatch(html,/No alternative staffing option|One alternative staffing option/);
 assert.match(html,/<button[^>]*disabled=""[^>]*>Review selected Action Plan/);
 // Like ordinary entry, an over-budget proposal can be reviewed explicitly; its status remains visible.
 assert.equal((html.match(/Outside entered limits/g)||[]).length,displayed.filter(o=>o.candidate.status==='not-met').length);assert.doesNotMatch(html,/>not-met</);
});

test('compact save review separates assumed qualified capacity from measured outcomes',()=>{
 const {GuidedPlanSummary}=component('guided-plan-summary.tsx',{'@/lib/guided-plan-summary':summary,'./staffing-option-cost':cost});
 const html=renderToStaticMarkup(React.createElement(GuidedPlanSummary,{draft:comparison.options[0].draft,compact:true}));
 assert.match(html,/Starting qualified capacity assumption: 3 FTE/);
 assert.match(html,/<details><summary[^>]*>Details<\/summary><p>Starting qualified capacity is a scenario input, not measured capacity/);assert.match(html,/Actual progress remains unknown until measured/);assert.doesNotMatch(html,/Baseline: Unknown/);
});
