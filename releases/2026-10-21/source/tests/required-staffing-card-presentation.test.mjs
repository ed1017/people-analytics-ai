import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {emptyRequiredStaffing,calculateRequiredStaffing} from '../lib/required-staffing.ts';
const require=createRequire(process.env.POSITION_FINANCE_TEST_MODULE_ROOT??new URL('../package.json',import.meta.url));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=readFileSync(new URL('../components/home-required-staffing-review.tsx',import.meta.url),'utf8');
const isolated=source.slice(source.indexOf('const number='),source.indexOf('export function HomeRequiredStaffingReview'));
const compiled=ts.transpileModule(isolated,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const module={exports:{}};vm.runInNewContext(compiled,{module,exports:module.exports,require});
const render=(option,extra={})=>renderToStaticMarkup(React.createElement(module.exports.StaffingOptionSummary,{option,currency:'USD',costMonths:null,deliveryMonths:null,...extra}));
function option(extra={}){return calculateRequiredStaffing({...emptyRequiredStaffing(),role:'Analyst',requiredRoles:2,...extra}).options[0];}
test('unentered training, timing and delivery produce no repeated empty rows',()=>{const html=render(option());assert.doesNotMatch(html,/Unknown|Not specified|Training:|Timing:|Delivery target:|Cost:/);});
test('explicit zero cost, training and ready-at-start remain visible',()=>{const html=render(option({currency:'USD',months:4,hireCostPerPerson:0,hireTrainingHoursPerPerson:0,hireReadyAfterMonths:0,costsComplete:true}),{costMonths:4});assert.match(html,/Scenario cost/);assert.match(html,/0 USD/);assert.match(html,/0 hours/);assert.match(html,/Ready at start/);});
test('partial subtotal is labeled and budget blocker remains visible',()=>{const html=render(option({currency:'USD',months:4,hireCostPerPerson:100,budget:100}),{costMonths:4,deliveryMonths:2});assert.match(html,/Known cost subtotal/);assert.match(html,/200 USD/);assert.match(html,/Over budget/);assert.match(html,/Delivery target: 2 months/);});
