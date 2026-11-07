import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createSwpDemo,compareSwpDemo,swpTradeoffOptions,guidedOptionEffort} from '../lib/swp-demo.ts';
const jsx=(type,props)=>({type,props});
const exports={};
const code=ts.transpileModule(fs.readFileSync(new URL('../components/guided-capacity-steps.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInNewContext(code,{exports,require:name=>name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='@/lib/swp-demo'?{swpTradeoffOptions,guidedOptionEffort}:name==='@/lib/staffing-option-title'?{staffingOptionTitle:mix=>`${mix.build}/${mix.move}/${mix.buy}`}:name==='@/lib/scenario-chat-continuity'?{staffingAssumptions:()=> 'Fictional assumptions'}:new Proxy({},{get:(_,key)=>key})});
const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
const draft=await createSwpDemo('guided-popup-test','2026-11-07T12:00:00Z');
const comparison=await compareSwpDemo(draft);
const props={draft,comparison:null,selection:null,reviewing:false,disabled:false,pending:false,onCalculate(){},onSelect(){},onPrepare(){}};
test('fixed input step exposes only explicit compare, not editable assumptions or automatic calculation',()=>{
 const tree=nodes(exports.GuidedCapacitySteps(props));
 assert.equal(tree.filter(node=>node.type==='button').length,1);
 assert.equal(tree.find(node=>node.type==='button').props.children,'Compare staffing options');
 assert.equal(tree.some(node=>node.type==='input'||node.type==='textarea'),false);
 assert.equal(tree.some(node=>node.type==='SwpDemoInputs'),false);
});
test('comparison requires a feasible selection, then a separate review action',()=>{
 const render=selection=>nodes(exports.GuidedCapacitySteps({...props,comparison,selection}));
 let tree=render(null),review=tree.find(node=>node.type==='button');assert.equal(review.props.disabled,true);
 const table=tree.find(node=>node.type==='StaffingOptionsTable');
 for(const option of table.props.options){const radio=nodes(table.props.action(option)).find(node=>node.type==='input');assert.equal(radio.props.disabled,option.status!=='met');}
 const candidate=swpTradeoffOptions(comparison.evaluation).find(option=>option.candidate.status==='met');assert.ok(candidate);
 tree=render(candidate.id);review=tree.find(node=>node.type==='button');assert.equal(review.props.disabled,false);assert.equal(review.props.onClick,props.onPrepare);
});
test('pending disables actions; final review hides comparison and option controls',()=>{
 const pending=nodes(exports.GuidedCapacitySteps({...props,disabled:true,pending:true}));assert.equal(pending.find(node=>node.type==='button').props.disabled,true);
 const final=nodes(exports.GuidedCapacitySteps({...props,comparison,reviewing:true}));assert.equal(final.some(node=>node.type==='button'||node.type==='StaffingOptionsTable'),false);
});
