import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as swp from '../lib/swp-demo.ts';
import {guidedWorkloadResult} from '../lib/guided-workload.ts';
const jsx=(type,props)=>typeof type==='function'?type(props):({type,props});
const common=name=>name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react'?{useState:value=>[value,()=>{}]}:name==='@/lib/swp-demo'?swp:name==='@/lib/guided-workload'?{guidedWorkloadResult}:name==='@/lib/staffing-option-title'?{staffingOptionTitle:mix=>`${mix.build}/${mix.move}/${mix.buy}`}:name==='@/lib/scenario-chat-continuity'?{staffingAssumptions:()=> 'Fictional assumptions'}:name==='@/lib/scenario-planning-parity'?{scenarioRecommendation:()=> 'Conditional recommendation'}:name==='@/lib/workforce-input-display'?{workforceInputDisplay:(key,value)=>({label:key,value})}:new Proxy({},{get:(_,key)=>key});
function load(file,require){const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,require});return exports;}
const normal=load('simple-swp-demo.tsx',common),guided=load('guided-capacity-steps.tsx',name=>name==='./simple-swp-demo'?normal:common(name));
const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children),...nodes(value.props?.levers),...nodes(value.props?.visual),...nodes(value.props?.outcome)];
const draft=await swp.createSwpDemo('guided-popup-test','2026-11-07T12:00:00Z'),comparison=await swp.compareSwpDemo(draft);
const props={draft,comparison:null,selection:null,reviewing:false,disabled:false,pending:false,onCalculate(){},onSelect(){},onPrepare(){}};
const render=overrides=>nodes(guided.GuidedCapacitySteps({...props,...overrides}));
const review=tree=>tree.find(node=>node.type==='button'&&node.props.children==='Review selected Action Plan');
const table=tree=>tree.find(node=>node.type==='StaffingOptionsTable');
const radio=(view,option)=>nodes(table(view).props.action(option)).find(node=>node.type==='input');
test('guide renders actual normal planner, with locked visible assumptions and explicit compare',()=>{
 const tree=render({});assert.ok(tree.find(n=>n.type==='InteractivePlanner'));assert.equal(tree.find(n=>n.type==='SwpDemoInputs').props.disabled,true);
 const compare=tree.find(n=>n.type==='button');assert.equal(compare.props.children,'Compare staffing options');assert.equal(compare.props.onClick,props.onCalculate);
});
test('comparison requires feasible selection then separate review, using identical normal option data',()=>{
 const tree=render({comparison});assert.equal(review(tree).props.disabled,true);
 for(const option of table(tree).props.options)assert.equal(radio(tree,option).props.disabled,option.status!=='met');
 const candidate=swp.swpTradeoffOptions(comparison.evaluation).find(o=>o.candidate.status==='met');
 assert.equal(review(render({comparison,selection:candidate.id})).props.disabled,false);
 assert.equal(review(render({comparison,selection:candidate.id})).props.onClick,props.onPrepare);
 const normalTree=nodes(normal.SimpleSwpDemo({...props,comparison,edit:null,editingDisabled:false,alreadySaved:false}));
 assert.deepEqual(JSON.parse(JSON.stringify(table(tree).props.options)),JSON.parse(JSON.stringify(table(normalTree).props.options)));
 assert.equal(normalTree.find(n=>n.type==='SwpDemoInputs').props.disabled,false);
});
test('pending disables selection; final review hides comparison and option controls',()=>{
 const tree=render({comparison,pending:true});for(const option of table(tree).props.options)assert.equal(radio(tree,option).props.disabled,true);
 const final=render({comparison,reviewing:true});assert.equal(final.some(n=>n.type==='button'||n.type==='StaffingOptionsTable'||n.type==='SwpDemoInputs'),false);
});
test('whole-app case permits only the prescribed feasible mix, normal choices remain unrestricted',()=>{
 const tree=render({comparison,forcedChoice:true});const enabled=table(tree).props.options.filter(option=>!radio(tree,option).props.disabled);
 assert.equal(enabled.length,1);assert.deepEqual(JSON.parse(JSON.stringify(enabled[0].mix)),{build:3,move:2,buy:0});
 for(const other of comparison.options.filter(o=>o.id!==enabled[0].id))assert.equal(review(render({comparison,forcedChoice:true,selection:other.id})).props.disabled,true);
 assert.equal(review(render({comparison,forcedChoice:true,selection:enabled[0].id})).props.disabled,false);
 const normalTree=nodes(normal.SimpleSwpDemo({...props,comparison,edit:null,editingDisabled:false,alreadySaved:false}));
 for(const option of table(normalTree).props.options)assert.equal(radio(normalTree,option).props.disabled,option.status==='invalid');
});

test('a needs-inputs comparison stays on compare step instead of announcing a choice',()=>{
 const incomplete={...comparison,evaluation:{...comparison.evaluation,context:{...comparison.evaluation.context,status:'needs-inputs',missing:[]}}};
 const tree=render({comparison:incomplete});assert.equal(tree.find(n=>n.type==='progress').props.value,2);
});
