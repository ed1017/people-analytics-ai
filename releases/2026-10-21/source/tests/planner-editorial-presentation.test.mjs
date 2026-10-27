import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as summary from '../lib/guided-plan-summary.ts';
import {createSwpDemo,compareSwpDemo} from '../lib/swp-demo.ts';
const require=createRequire(import.meta.url);
function component(file,imports={}){
 const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id in imports?imports[id]:id.endsWith('.css')?{default:{}}:id.startsWith('./')||id.startsWith('@/')?new Proxy({},{get:()=>()=>null}):require(id)});return exports;
}
function primary(tree){
 if(tree==null||typeof tree==='boolean')return '';
 if(typeof tree==='string'||typeof tree==='number')return String(tree);
 if(Array.isArray(tree))return tree.map(primary).join(' ');
 if(tree.type==='details')return '';
 if(typeof tree.type==='function')return primary(tree.type(tree.props));
 return primary(tree.props?.children);
}
test('shared planner keeps decision and metrics primary while method is available in a closed accessible disclosure',()=>{
 const {InteractivePlanner}=component('interactive-planner.tsx',{'@/lib/catalog-display':{catalogProseDisplay:v=>v}});
 const tree=InteractivePlanner({scope:'Client Operations · Oct-Dec 2026',outcome:'Short 5 FTE',metrics:[{label:'Required capacity',value:'8 FTE'},{label:'Available capacity',value:'3 FTE'}],levers:React.createElement('button',null,'Edit inputs'),visual:React.createElement('figure',null,'Monthly capacity'),assumptions:'Monthly averages; arrivals follow entered timing.'});
 const html=renderToStaticMarkup(tree),visible=primary(tree);
 assert.match(visible,/Short 5 FTE/);assert.match(visible,/8 FTE/);assert.match(visible,/3 FTE/);assert.doesNotMatch(visible,/Monthly averages/);
 assert.match(html,/<details[^>]*><summary[^>]*>Details<\/summary>/);assert.doesNotMatch(html,/<details[^>]*\sopen/);assert.match(html,/Monthly averages; arrivals follow entered timing/);
});
test('saved plan summary leads with exact decision and target while measurement definition remains in Details',async()=>{
 const draft=await createSwpDemo('guided-editorial-summary','2026-10-27T15:00:00Z'),comparison=await compareSwpDemo(draft),selected=comparison.options[0].draft,before=JSON.stringify(selected);
 const {GuidedPlanSummary}=component('guided-plan-summary.tsx',{'@/lib/guided-plan-summary':summary,'./staffing-option-cost':{StaffingOptionCost:()=>null}});
 for(const compact of [true,false]){
  const tree=GuidedPlanSummary({draft:selected,compact}),visible=primary(tree),html=renderToStaticMarkup(tree);
  assert.match(visible,/develop \/ .* move \/ .* hire/);assert.match(visible,/Incremental cash:/);assert.match(visible,/Uncovered work over this period:/);assert.match(visible,/Scenario target:/);
  assert.doesNotMatch(visible,/operational approval|not measured capacity|not prove|remain unverified/);assert.match(html,/Actual progress remains unknown until measured/);
 }
 assert.equal(JSON.stringify(selected),before);
});

