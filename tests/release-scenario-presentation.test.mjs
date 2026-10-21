import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as demo from '../releases/2026-10-21/source/lib/swp-demo.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../releases/2026-10-21/source/lib/home-bundle-chat-edit.ts';
import * as workload from '../releases/2026-10-21/source/lib/guided-workload.ts';
import * as title from '../releases/2026-10-21/source/lib/staffing-option-title.ts';
import * as summary from '../releases/2026-10-21/source/lib/guided-plan-summary.ts';
const require=createRequire(import.meta.url);
function component(path,modules={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../releases/2026-10-21/source/components/'+path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>modules[id]??require(id)});return exports;}
const cost=component('staffing-option-cost.tsx',{'@/lib/guided-plan-summary':summary});
const {SimpleSwpDemo}=component('simple-swp-demo.tsx',{'./staffing-option-cost':cost,'@/lib/staffing-option-title':title,'@/lib/guided-workload':workload,'@/lib/swp-demo':demo,'./swp-demo-inputs':{SwpDemoInputs:()=>null},'./guided-workload-summary':{GuidedWorkloadSummary:()=>null},'./swp-outcome-chart':{SwpOutcomeChart:()=>null}});
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
test('two visible cards retain validated engine cash/readiness/uncovered work, with no default selection',()=>{
 const html=render();
 assert.match(html,/aria-label="Planning steps"/);assert.doesNotMatch(html.replace(/<[^>]*>/g,''),/\bdemo\b/i);
 for(const value of ['$26,800','$319,000','Jan 2027','Dec 2026','1,280 hours','320 hours','$325,000'])assert.ok(html.includes(value),value);
 assert.equal((html.match(/Incremental cash cost/g)||[]).length,3); // two visible options plus collapsed reference
 assert.match(html,/not total economic cost/);assert.doesNotMatch(html,/checked=""/);
 assert.equal((html.match(/aria-label="Selected staffing option details"/g)||[]).length,1);
 assert.doesNotMatch(html,/aria-label="Incremental cash components"/);
});
test('selection renders one shared collapsed cost region and non-color selection label',()=>{
 for(const option of comparison.options.filter(o=>!o.candidate.isReferenceMix)){
  const html=render(option.id);
  assert.equal((html.match(/aria-label="Incremental cash components"/g)||[]).length,1);
  assert.match(html,/data-selected="true"/);assert.match(html,/>Selected<\/p>/);
  assert.match(html,/Selection|Selected:/);assert.doesNotMatch(html,/<details[^>]*\bopen/);
 }
});
for(const [budget,count] of [[0,0],[10000,0],[100000,1],[325000,2]])test(`accepted budget ${budget} truthfully presents ${count} feasible alternatives`,async()=>{
 const original=await demo.createSwpDemo('guided-popup-budget-'+budget,'2026-10-20T12:00:00Z');
 const scenario=acceptBundleChatEdit(original,previewBundleChatEdit(original,`Set budget to ${budget}`));
 assert.equal(scenario.inputs.budget.amount.value,budget);
 const actual=await demo.compareSwpDemo(scenario),alternatives=actual.options.filter(o=>!o.candidate.isReferenceMix);
 assert.equal(alternatives.length,count);assert.ok(alternatives.every(o=>o.candidate.status==='met'&&o.candidate.cash.complete<=budget));
 const html=render(null,actual,scenario);
 const displayed=demo.swpTradeoffOptions(actual.evaluation);assert.equal(displayed.length,2);
 assert.deepEqual(displayed.map(o=>o.candidate.cash.complete).sort((a,b)=>a-b),[26800,319000]);
 for(const option of displayed){assert.ok(actual.evaluation.report.results.includes(option.candidate));if(option.candidate.status!=='met')assert.match(html,new RegExp('disabled=""[^>]*\\/><strong>'+title.staffingOptionTitle(option.candidate.mix)));}
 assert.ok(html.includes('$26,800'));assert.ok(html.includes('$319,000'));assert.ok(html.includes('1,280 hours'));assert.ok(html.includes('320 hours'));
 if(count===0)assert.match(html,/No alternative staffing option meets the entered staffing and budget limits/);
 else if(count===1)assert.match(html,/One alternative staffing option meets the entered staffing and budget limits/);
 else assert.doesNotMatch(html,/No alternative staffing option|One alternative staffing option/);
 assert.match(html,/<button[^>]*disabled=""[^>]*>Review selected Action Plan/);
 for(const option of actual.options.filter(o=>o.candidate.status!=='met'))assert.match(html,new RegExp('disabled=""[^>]*\\/><strong>'+title.staffingOptionTitle(option.candidate.mix)));
});
