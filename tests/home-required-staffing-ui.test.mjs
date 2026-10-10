import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as calculator from '../lib/required-staffing.ts';
import {editRequiredStaffing} from '../lib/home-required-staffing.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedChanges} from './fixtures/required-staffing.mjs';
const require=createRequire(import.meta.url),compiledModule={exports:{}};
const code=ts.transpileModule(readFileSync(new URL('../components/home-required-staffing-review.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,require:name=>name==='@/lib/required-staffing'?calculator:require(name)});
const request=solutionRequest(fixedMessages.start),review=editRequiredStaffing(request,'legacy-v1:0',fixedChanges(request));
const render=disabled=>renderToStaticMarkup(React.createElement(compiledModule.exports.HomeRequiredStaffingReview,{review,onClear(){},disabled}));
test('compact card shows three numerical comparisons, one conditional recommendation and optional details',()=>{
 const html=render(false);assert.equal((html.match(/<article /g)??[]).length,3);
 for(const value of ['1,600,000 USD','30,000 USD','495,000 USD','480 hours','240 hours','Recommendation:','Next step:'])assert.ok(html.includes(value),value);
 assert.match(html,/Training: Not specified/);assert.match(html,/New-hire training: Not specified/);assert.match(html,/new-hire training requirements remain unknown/);assert.match(html,/Complete cash: Unknown/);assert.match(html,/Readiness: Unknown/);
 assert.doesNotMatch(html,/<form|<input|<select|<details open/);
});
test('pending controller disables clearing without introducing save or approval actions',()=>{
 const html=render(true);assert.match(html,/disabled="">Clear staffing comparison/);assert.doesNotMatch(html,/>Save|>Approve|>Pin/);
});
