import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import * as summary from '../lib/guided-plan-summary.ts';
import {createSwpDemo,compareSwpDemo} from '../lib/swp-demo.ts';
const require=createRequire(import.meta.url);
function component(file){const filename=path.resolve(file),mod=new Module(filename);mod.require=id=>id==='@/lib/guided-plan-summary'?summary:id==='./staffing-option-cost'?component('components/staffing-option-cost.tsx'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return mod.exports;}
const {GuidedPlanSummary}=component('components/guided-plan-summary.tsx');
test('compact review retains both choices, exact costs, targets and measurement safeguards without changing drafts',async()=>{
 const comparison=await compareSwpDemo(await createSwpDemo('guided-review-summary','2026-10-17T00:00:00Z'));
 for(const option of comparison.options){const before=JSON.stringify(option.draft),view=summary.guidedPlanSummary(option.draft),html=renderToStaticMarkup(React.createElement(GuidedPlanSummary,{draft:option.draft,compact:true})).replaceAll('<!-- -->','');
  assert.match(html,new RegExp(view.cash.toLocaleString('en-US')));assert.ok(html.includes(view.effort.shortfallHours.toLocaleString('en-US')+' hours'));
  assert.ok(html.includes(`${view.target.roles} whole roles by ${view.target.deadline}`));
  assert.match(html,/Baseline: Unknown\. Measured outcome: Unknown/);assert.match(html,/Roles are not added company headcount/);
  assert.match(html,/<details><summary[^>]*>Measurement details and assumptions/);assert.match(html,/automated progress arithmetic is not supported/);assert.match(html,/Partial readiness months are excluded/);
  assert.equal(JSON.stringify(option.draft),before);
 }
});
