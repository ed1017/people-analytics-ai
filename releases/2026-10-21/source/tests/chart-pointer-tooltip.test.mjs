import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('focused tooltip is suppressed immediately when evidence changes or loading removes the chart',()=>{
 let state=null;const exports={};
 const js=ts.transpileModule(fs.readFileSync(new URL('../components/chart-pointer-tooltip.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(js,{exports,document:{body:{}},window:{innerWidth:390,innerHeight:844},require:id=>id==='react'?{useId:()=>':tip:',useState:()=>[state,next=>{state=next;}],useEffect:()=>{}}:id==='react-dom'?{createPortal:node=>node}:require(id)});
 const render=key=>exports.useChartPointerTooltip(key),first=render('US:2026-09:ready');
 first.point('100 people').onFocus({currentTarget:{getBoundingClientRect:()=>({x:380,y:820,width:10})}});
 const shown=render('US:2026-09:ready');assert.equal(shown.tooltip.props.children,'100 people');assert.ok(shown.tooltip.props.style.left+224<=390);assert.ok(shown.tooltip.props.style.top<820);
 assert.equal(render('GB:2026-09:ready').tooltip,null);assert.equal(render('US:2026-09:loading').tooltip,null);assert.equal(render('US:2026-10:ready').tooltip,null);assert.equal(render('US:2026-09:stock-mismatch').tooltip,null);
 const next=render('GB:2026-09:ready');next.point('75 people').onFocus({currentTarget:{getBoundingClientRect:()=>({x:10,y:20,width:10})}});assert.equal(render('GB:2026-09:ready').tooltip.props.children,'75 people');
});
