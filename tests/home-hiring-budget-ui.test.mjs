/** Real React server render of the card; browser interaction is a separate check. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as calculator from '../lib/hiring-budget.ts';
import {editHiringBudget,editHiringBudgetLocally} from '../lib/home-hiring-budget.ts';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';
const require=createRequire(import.meta.url),module={exports:{}};
const code=ts.transpileModule(readFileSync(new URL('../components/home-hiring-budget-review.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{module,exports:module.exports,require:name=>name==='@/lib/hiring-budget'?calculator:require(name)});
const Card=module.exports.HomeHiringBudgetReview;
const request=solutionRequest('Ten engineers within a budget of one million.'),basis={kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Fictional test interpretation.'};
const review=editHiringBudget(request,'fixture:0',[{field:'hires',value:10,basis},{field:'budget',value:1000000,basis}]);
const render=(value,disabled=false)=>renderToStaticMarkup(React.createElement(Card,{review:value,onUpdate(){},disabled}));
test('initial card labels the period allowance, unavailable salary and editable unknowns',()=>{
 const html=render(review);assert.match(html,/100,000 currency unspecified/);assert.match(html,/not an annual salary/);assert.match(html,/salary data is unavailable for this estimate/);assert.match(html,/Annual base pay override/);assert.match(html,/<option value="" selected="">Unknown/);assert.match(html,/One-time recruiting cost per hire is unknown/);
});
test('card distinguishes a scenario override, subtotal, complete cost and annual recurring cost',()=>{
 const edited=editHiringBudgetLocally(review,{...review.inputs,currency:'USD',startMonth:'2027-01',months:12,arrivalDate:'2027-07-01',ftePerHire:1,annualBasePay:120000,payBasis:'per_hire',annualAdditionalCostPerHire:30000,recruitingFeePerHire:10000,otherCostsComplete:true});
 const html=render(edited);assert.match(html,/600,000 USD/);assert.match(html,/850,000 USD/);assert.match(html,/1,500,000 USD/);assert.match(html,/unverified scenario input/);assert.match(html,/user entry/);assert.match(html,/do not approve a hiring plan/);
 const missing=render(editHiringBudgetLocally(edited,{...edited.inputs,recruitingFeePerHire:null}));assert.match(missing,/Complete period cost<\/dt><dd class="font-medium">Unknown/);assert.match(missing,/Budget check:<\/strong> Unknown/);
});
test('pending or stale controller disables updates and clear controls',()=>{
 const html=render(review,true);assert.match(html,/<fieldset disabled=""/);assert.match(html,/disabled="">Update estimate/);assert.match(html,/disabled="">Clear hiring estimate/);
});
