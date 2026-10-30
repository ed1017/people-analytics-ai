import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import vm from 'node:vm';
import {createPositionAllocation,calculatePositionAllocation} from '../lib/position-allocation.ts';
import {DEMO_POSITION_INVENTORY,COMPANY_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {positionAllocationSignature,buildPositionFinanceCapture,POSITION_FINANCE_LEDGER_FIELD} from '../lib/position-finance-store.ts';
import {unknownPositionFinance,noPositionAddition,POSITION_FINANCE_MODEL} from '../lib/position-finance-assessment.ts';
import {POSITION_ALLOCATION_LEDGER_FIELD} from '../lib/position-allocation-store.ts';
const require=createRequire(process.env.POSITION_FINANCE_TEST_MODULE_ROOT??new URL('../package.json',import.meta.url));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const file=new URL('../components/workforce-planning/position-finance-panel.tsx',import.meta.url);
const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const nativeRequire=createRequire(import.meta.url),at='2026-10-30T03:00:00.000Z',token='workforce-demo-9037-public-aggregates-v4:5';
function fixture(inventory=DEMO_POSITION_INVENTORY){const ids=inventory.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').slice(0,12).map(p=>p.id),allocation=createPositionAllocation(ids,inventory===DEMO_POSITION_INVENTORY,inventory),savedCapture={scenarioId:'one',scenarioNumber:1,revision:1,sequence:1,savedAt:at,draft:structuredClone(allocation),result:calculatePositionAllocation(allocation)},allocationLedger={version:1,datasetToken:token,goalId:'a',records:[savedCapture]};return {allocation,savedCapture,allocationLedger,datasetToken:token,goalId:'a'};}
function render(props,extraFields={}){
 const state={ready:true,saved:true,data:{revision:1,goals:{activeId:'a',goals:[{id:'a',statement:'Goal A'}]},workspaces:{a:{fields:extraFields}}}};
 const module={exports:{}};const customRequire=name=>name==='./position-scenario-explanation'?{PositionScenarioExplanation:()=>null}:name==='@/components/decision-store'?{useDecisionStorage:()=>state,decisionStore:{getSnapshot:()=>state,getDatasetToken:()=>token}}:name.startsWith('@/lib/')?nativeRequire(fileURLToPath(new URL('../lib/'+name.slice('@/lib/'.length)+'.ts',import.meta.url))):require(name);
 vm.runInNewContext(compiled,{module,exports:module.exports,require:customRequire,console,structuredClone},{filename:fileURLToPath(file)});
 return renderToStaticMarkup(React.createElement(module.exports.PositionFinancePanel,props));
}
test('unsaved allocation presents explicit save boundary and disabled controls',()=>{const props=fixture();props.savedCapture=null;const html=render(props);assert.match(html,/Save allocation first/);assert.match(html,/<fieldset disabled=/);assert.match(html,/Save the current allocation/);});
test('company inventory remains funding unknown without an approval selector or demo adoption control',()=>{const html=render(fixture(COMPANY_POSITION_INVENTORY));assert.match(html,/Funding not verified/);assert.doesNotMatch(html,/Adopt demo funding envelope/);assert.doesNotMatch(html,/Within supplied approved funding/);assert.match(html,/Scenario allowance/);assert.match(html,/Add a position/);});
test('worked example offers explicit adoption, does not silently adopt on render',()=>{const html=render(fixture());assert.match(html,/Adopt demo funding envelope/);assert.match(html,/Funding not verified/);assert.doesNotMatch(html,/Within demo allowance/);assert.doesNotMatch(html,/<fieldset disabled=/);});
test('matching saved comparison renders exact addition and cash without asserting ready staff',()=>{
 const props=fixture(),input={version:1,modelVersion:POSITION_FINANCE_MODEL,allocation:props.allocation,finance:unknownPositionFinance(props.allocation),addition:{count:2,ftePerPosition:0.5,incrementalCashAllowanceUsd:10000,availableFromMonth:3}};
 const fields={[POSITION_ALLOCATION_LEDGER_FIELD]:props.allocationLedger};const {patch}=buildPositionFinanceCapture(fields,{datasetToken:token,goalId:'a',at,scenarioId:'one',allocationRevision:1,allocationSignature:positionAllocationSignature(props.allocation),input});const html=render(props,patch);
 assert.match(html,/Approval required/);assert.match(html,/\$137,500/);assert.match(html,/2 proposed/);assert.match(html,/Proposed vacant positions/);assert.match(html,/Reopen funding/);
});
test('changed allocation and corrupt finance records cannot display a funded saved state',()=>{
 const props=fixture();props.allocation.input.budgetUsd=5;assert.match(render(props),/Save allocation first/);
 const good=fixture();assert.match(render(good,{[POSITION_FINANCE_LEDGER_FIELD]:{version:99}}),/Saved funding comparisons could not be read/);
});

function eventHarness(initial){
 let cursor=0,hooks=[],props=initial;
 const state={ready:true,saved:true,data:{revision:1,goals:{activeId:'a',goals:[{id:'a',statement:'Goal A'},{id:'b',statement:'Goal B'}]},workspaces:{a:{fields:{}},b:{fields:{}}}}};
 const module={exports:{}};
 const customRequire=name=>name==='react'?{...React,useId:()=>':finance:',useMemo:fn=>fn(),useState:initial=>{const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],next=>{hooks[i]=typeof next==='function'?next(hooks[i]):next;}];}}:name==='./position-scenario-explanation'?{PositionScenarioExplanation:'Explanation'}:name==='@/components/decision-store'?{useDecisionStorage:()=>state,decisionStore:{getSnapshot:()=>state,getDatasetToken:()=>token}}:name.startsWith('@/lib/')?nativeRequire(fileURLToPath(new URL('../lib/'+name.slice('@/lib/'.length)+'.ts',import.meta.url))):require(name);
 vm.runInNewContext(compiled,{module,exports:module.exports,require:customRequire,console,structuredClone});
 function render(next){if(next)props=next;cursor=0;const nodes=[];function walk(n){if(!n||typeof n!=='object')return;nodes.push(n);React.Children.forEach(n.props?.children,walk);}walk(module.exports.PositionFinancePanel(props));return nodes;}
 const packet=()=>render().find(n=>n.type==='Explanation').props.packet;
 const click=label=>render().find(n=>n.type==='button'&&n.props.children===label).props.onClick();
 const change=(label,value)=>{const wrapper=render().find(n=>n.type==='label'&&Array.isArray(n.props.children)&&String(n.props.children[0]).startsWith(label));assert.ok(wrapper,label);React.Children.toArray(wrapper.props.children).find(n=>n.type==='input').props.onChange({target:{value:String(value)}});};
 return {render,packet,click,change,state};
}

test('explanation binds current unsaved funding edits and additions to exact saved allocation',()=>{
 const props=fixture(),h=eventHarness(props);let p=h.packet();assert.equal(p.goalId,'a');assert.equal(p.goal,'Goal A');assert.equal(p.scenario.id,'one');assert.equal(p.scenario.revision,1);assert.equal(p.finance.envelope.basis,'unknown');
 h.click('Adopt demo funding envelope');p=h.packet();assert.equal(p.finance.envelope.basis,'illustrative-demo');assert.deepEqual(p.finance.envelope.fundedPositionIds,props.allocation.input.selectedIds);
 h.change('Scenario allowance',200000);h.change('New positions',2);h.change('FTE per new position',0.5);h.change('Added-position cash allowance',10000);h.change('Position available from month',3);
 p=h.packet();assert.equal(p.finance.envelope.incrementalFundingUsd,200000);assert.deepEqual(p.finance.addition,{count:2,ftePerPosition:0.5,incrementalCashAllowanceUsd:10000,availableFromMonth:3});assert.deepEqual(p.draft,props.allocation);
 assert.deepEqual(h.state.data.workspaces.a.fields,{},'editing/explanation packet construction never saves or submits');
});

test('explanation remains disabled until current allocation is saved and clears stale goal funding edits',()=>{
 const props=fixture(),h=eventHarness({...props,savedCapture:null});assert.equal(h.packet(),null);
 h.render(props);h.click('Adopt demo funding envelope');assert.equal(h.packet().finance.envelope.basis,'illustrative-demo');
 const changed={...props,allocation:structuredClone(props.allocation)};changed.allocation.input.hire=2;h.render(changed);assert.equal(h.packet(),null);
 const next={...props,goalId:'b',allocationLedger:{...props.allocationLedger,goalId:'b'}};h.state.data.goals.activeId='b';h.render(next);assert.equal(h.packet().goal,'Goal B');assert.equal(h.packet().finance.envelope.basis,'unknown');
 h.state.saved=false;assert.equal(h.packet(),null);
});


test('explicit handoff binds old funding revision and never substitutes latest or explicit none',()=>{
 const props=fixture(),fields={[POSITION_ALLOCATION_LEDGER_FIELD]:props.allocationLedger};
 const input={version:1,modelVersion:POSITION_FINANCE_MODEL,allocation:props.allocation,finance:unknownPositionFinance(props.allocation),addition:{count:1,ftePerPosition:1,incrementalCashAllowanceUsd:10000,availableFromMonth:3}};
 const options={datasetToken:token,goalId:'a',at,scenarioId:'one',allocationRevision:1,allocationSignature:positionAllocationSignature(props.allocation),input};
 Object.assign(fields,buildPositionFinanceCapture(fields,options).patch);
 input.addition={count:2,ftePerPosition:1,incrementalCashAllowanceUsd:20000,availableFromMonth:4};
 Object.assign(fields,buildPositionFinanceCapture(fields,{...options,baseFinanceRevision:1}).patch);
 assert.match(render({...props,initialFinanceRevision:1},fields),/1 proposed/);
 assert.doesNotMatch(render({...props,initialFinanceRevision:1},fields),/2 proposed/);
 assert.match(render({...props,initialFinanceRevision:2},fields),/2 proposed/);
 assert.match(render({...props,initialFinanceRevision:null},fields),/0 proposed/);
 assert.match(render({...props,initialFinanceRevision:null},fields),/Funding not verified/);
 const missing=render({...props,initialFinanceRevision:99},fields);
 assert.match(missing,/selected funding revision is unavailable/);assert.match(missing,/<fieldset disabled=/);
});
