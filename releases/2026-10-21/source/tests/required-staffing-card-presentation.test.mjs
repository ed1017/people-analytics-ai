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


const staffing=await import('../lib/required-staffing.ts'),homeStaffing=await import('../lib/home-required-staffing.ts'),intake=await import('../lib/normal-staffing-intake.ts');
const element=(type,props)=>({type,props}),component={exports:{}};
const compiledReview=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInNewContext(compiledReview,{module:component,exports:component.exports,require:name=>name==='react/jsx-runtime'?{jsx:element,jsxs:element}:name==='react'?{useId:()=> 'identity-test',useState:value=>[typeof value==='function'?value():value,()=>{}]}:name==='@/lib/required-staffing'?staffing:name==='@/lib/home-required-staffing'?homeStaffing:name==='@/lib/normal-staffing-intake'?intake:name==='@/lib/catalog-display'?{catalogProseDisplay:v=>v}:new Proxy({},{get:(_,key)=>key})});
const descendants=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(descendants):[value,...descendants(value.props?.children),...descendants(value.props?.levers)];
function identityControls(values,costBasis){
 const review={version:1,revision:1,inputs:{...emptyRequiredStaffing(),requiredRoles:5,months:12,...values},origins:{},basisTurns:[],...(costBasis?{costBasis}:{})};
 return descendants(component.exports.HomeRequiredStaffingReview({review,onApply(){},onClear(){},disabled:false})).filter(n=>['Required role','Currency'].includes(n.props?.['aria-label'])).map(n=>n.props['aria-label']);
}
test('budgeted missing roles expose the role control without unlocking known currency',()=>{
 for(const budget of [240000,0])assert.deepEqual(identityControls({currency:'GBP',budget}),['Required role']);
 assert.deepEqual(identityControls({}),['Required role','Currency']);
});
test('identity controls retain cost, unknown-currency and known-role safeguards',()=>{
 for(const values of [{budget:0},{currency:'GBP',budget:240000,trainablePeople:0},{currency:'GBP',budget:240000,hireCostPerPerson:0},{currency:'GBP',role:'Nurse',budget:240000}])assert.deepEqual(identityControls(values),[]);
 const basis=staffing.defaultRequiredStaffingCostBasis({...emptyRequiredStaffing(),months:12});basis.budget={amount:0,quotedMonths:6};assert.deepEqual(identityControls({},basis),[]);
});
