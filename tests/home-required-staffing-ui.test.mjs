import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as calculator from '../lib/required-staffing.ts';
import {editRequiredStaffing,staffingDeliveryConflict} from '../lib/home-required-staffing.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedChanges} from './fixtures/required-staffing.mjs';
const require=createRequire(import.meta.url),compiledModule={exports:{}};
const code=ts.transpileModule(readFileSync(new URL('../components/home-required-staffing-review.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,require:name=>name==='@/lib/required-staffing'?calculator:name==='@/lib/home-required-staffing'?{staffingDeliveryConflict}:require(name)});
const request=solutionRequest(fixedMessages.start),review=editRequiredStaffing(request,'legacy-v1:0',fixedChanges(request));
const render=disabled=>renderToStaticMarkup(React.createElement(compiledModule.exports.HomeRequiredStaffingReview,{review,onClear(){},onPin(){},disabled,deliveryMonths:3}));
test('compact card shows three numerical comparisons, one conditional recommendation and optional details',()=>{
 const html=render(false);assert.equal((html.match(/<article /g)??[]).length,3);
 for(const value of ['1,600,000 USD','30,000 USD','495,000 USD','480 hours','240 hours','Recommended','Cost-only comparison:','Next step:'])assert.ok(html.includes(value),value);
 assert.match(html,/Training: <strong>Not specified/);assert.match(html,/new-hire training requirements remain unknown/);assert.match(html,/Complete cash: Unknown/);assert.match(html,/Timing: <strong>Unknown/);assert.match(html,/Cost horizon: 12 months/);assert.match(html,/Delivery target: 3 months/);assert.equal((html.match(/<details>/g)??[]).length,1);
 assert.doesNotMatch(html,/<form|<input|<select|<details open/);
});
test('pending controller disables pinning and clearing',()=>{
 const html=render(true);assert.match(html,/disabled="">Clear staffing comparison/);assert.match(html,/disabled="">Pin Action Plan/);assert.doesNotMatch(html,/>Save|>Approve/);
});

test('a known delivery miss is explicit and cannot be recommended or pinned; unknown readiness remains conditional',()=>{
 const late=structuredClone(review);late.inputs.trainingReadyAfterMonths=6;late.inputs.redeployReadyAfterMonths=6;
 const html=renderToStaticMarkup(React.createElement(compiledModule.exports.HomeRequiredStaffingReview,{review:late,onClear(){},onPin(){},disabled:false,deliveryMonths:3}));
 assert.match(html,/Misses the 3-month delivery target/);assert.doesNotMatch(html,/>Recommended<|>Pin Action Plan</);assert.match(html,/Cost horizon: 12 months/);
 const unknown=render(false);assert.match(unknown,/>Recommended</);assert.match(unknown,/>Pin Action Plan</);assert.match(unknown,/Timing: <strong>Unknown/);
});
