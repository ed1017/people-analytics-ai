import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as contracts from '../lib/legacy-source-contracts.ts';
import * as format from '../lib/display-format.ts';
import * as numeric from '../lib/numeric-contract.ts';
const require=createRequire(import.meta.url);
const page=fs.readFileSync('components/pages/workforce-planning-page.tsx','utf8');
// Execute the actual page effect and reset closure, including its dependency array.
const end=page.indexOf('  async function runCustomScenario()');
const effect=page.slice(page.lastIndexOf('  useEffect(() => {',end),end);
const reset=page.slice(page.indexOf('  function resetCustomScenario()'),page.indexOf('  async function runBuScenario()'));
const aliases={'@/lib/legacy-source-contracts':contracts,'@/lib/display-format':format,'@/lib/numeric-contract':numeric};
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/workforce-planning/scenario-modeling-panel.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>aliases[name]??require(name)});
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:11.3,fill_rate_pct:90,productivity_hiring_reduction_pct:5};
function harness(){
 const pending=[];let cleanup,dependencies;
 const state={scenarioDefaults:null,scenarioDefaultSource:null,customAssumptions:{...defaults,annual_attrition_pct:4},customScenario:{retained:true},customScenarioError:null};
 const context={...state,AbortController,Error,
  datasetFetch:(_url,options)=>new Promise((resolve,reject)=>pending.push({resolve,reject,signal:options.signal})),
  useEffect:(run,next)=>{if(!dependencies||next.some((item,i)=>item!==dependencies[i])){cleanup?.();dependencies=next;cleanup=run();}},
 };
 for(const name of Object.keys(state))context['set'+name[0].toUpperCase()+name.slice(1)]=value=>context[name]=typeof value==='function'?value(context[name]):value;
 vm.createContext(context);
 const render=()=>vm.runInContext(effect+reset,context);
 const html=()=>renderToStaticMarkup(React.createElement(exports.ScenarioModelingPanel,{visible:true,planningScenarios:[],scenarioDefaults:context.scenarioDefaults,scenarioDefaultSource:context.scenarioDefaultSource,customAssumptions:context.customAssumptions,customScenarioError:context.customScenarioError,buScenarioOptions:[],savedScenarios:[],comparisonScenarioIds:[]}));
 return {context,pending,render,html,dispose:()=>cleanup?.(),reload:()=>{const previous=context.setCustomAssumptions;context.setCustomAssumptions=value=>previous(value);render();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function succeed(request,extra={}){request.resolve({ok:true,json:async()=>({defaults,...extra})});await flush();}
const resetDisabled=html=>html.match(/<button[^>]*>Reset<\/button>/)?.[0].includes('disabled=""');

test('same-mount dependency reload invalidates paired defaults; failure cannot reset custom inputs or hide error',async()=>{
 const h=harness();h.render();assert.equal(h.pending.length,1);
 await succeed(h.pending[0],{default_provenance:contracts.legacyAttritionDefaultSource});
 assert.equal(h.context.customAssumptions.annual_attrition_pct,4);
 assert.match(h.html(),/Default: all separations Jan–Sep 2026/);assert.equal(resetDisabled(h.html()),false);
 h.render();assert.equal(h.pending.length,1,'unchanged dependency does not reload');
 h.reload();assert.equal(h.pending.length,2);assert.equal(h.pending[0].signal.aborted,true);
 assert.equal(h.context.scenarioDefaults,null);assert.equal(h.context.scenarioDefaultSource,null);
 assert.equal(resetDisabled(h.html()),true);assert.doesNotMatch(h.html(),/Default: all separations/);
 h.context.resetCustomScenario();assert.equal(h.context.customAssumptions.annual_attrition_pct,4);assert.deepEqual(h.context.customScenario,{retained:true});
 h.pending[1].reject(new Error('Defaults reload failed'));await flush();
 assert.equal(h.context.scenarioDefaults,null);assert.equal(h.context.scenarioDefaultSource,null);assert.equal(resetDisabled(h.html()),true);
 h.context.resetCustomScenario();assert.equal(h.context.customScenarioError,'Defaults reload failed');assert.equal(h.context.customAssumptions.annual_attrition_pct,4);
 for(const [extra,label] of [[{},/Default provenance unavailable/],[{data_meta:{dataClass:'constructed-synthetic'},default_provenance:contracts.legacyAttritionDefaultSource},/Constructed dataset planning default/]]){
  h.reload();assert.equal(resetDisabled(h.html()),true);await succeed(h.pending.at(-1),extra);
  assert.equal(h.context.customScenarioError,null);assert.match(h.html(),label);assert.equal(resetDisabled(h.html()),false);
  assert.equal(h.context.customAssumptions.annual_attrition_pct,4);
 }
 h.context.resetCustomScenario();assert.equal(h.context.customAssumptions.annual_attrition_pct,11.3);assert.equal(h.context.customScenario,null);h.dispose();
});

test('cancelled old success or rejection cannot replace current defaults, provenance, or custom assumptions',async()=>{
 for(const oldResult of ['success','failure']){
  const h=harness();h.render();h.reload();await succeed(h.pending[1],{data_meta:{dataClass:'constructed-synthetic'}});
  if(oldResult==='success')await succeed(h.pending[0],{default_provenance:contracts.legacyAttritionDefaultSource});
  else {h.pending[0].reject(new Error('Cancelled old request'));await flush();}
  assert.equal(h.context.scenarioDefaultSource.dataClass,'constructed-synthetic');assert.equal(h.context.customScenarioError,null);assert.equal(h.context.customAssumptions.annual_attrition_pct,4);h.dispose();
 }
});

test('complete chat evidence uses inventory and name order, while visible rows are only the first eight',()=>{
 const source=fs.readFileSync('app/page.tsx','utf8');
 const declaration=source.slice(source.indexOf('  const positionBusinessUnits ='),source.indexOf('  const positionLevels ='));
 const binding=source.match(/byBusinessUnit:\s*(positionBusinessUnits),\s*byLevel:/);assert.ok(binding,'chat receives complete inventory ordering');
 const rows=Array.from({length:10},(_,i)=>({org_name:String.fromCharCode(74-i),current_positions:100+i,net_position_change:100-i}));rows[9].current_positions=rows[8].current_positions;
 const original=structuredClone(rows),context={activePositionScenario:{by_business_unit:rows}};
 vm.runInNewContext(declaration+`globalThis.full=${binding[1]};globalThis.top=topPositionBusinessUnits;`,context);
 assert.deepEqual(Array.from(context.full,row=>row.org_name),['A','B','C','D','E','F','G','H','I','J']);
 assert.equal(context.full.length,10);assert.equal(context.top.length,8);assert.deepEqual(rows,original);
 assert.deepEqual(Array.from(context.full,row=>row.net_position_change),[91,92,93,94,95,96,97,98,99,100]);
});
