import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import * as demandLib from '../lib/projection-demand.ts';
const require=createRequire(import.meta.url);
function harness(initial){
 let open,initialized=false,values=initial,changes=0;
 const exports={};
 const source=ts.transpileModule(fs.readFileSync(new URL('../components/projection-demand-panel.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,require:name=>name==='react'?{...React,useState:initial=>{if(!initialized){open=initial;initialized=true;}return [open,value=>{open=typeof value==='function'?value(open):value;}];}}:name==='@/lib/projection-demand'?demandLib:name==='./interactive-planner'?{InteractivePlanner:'planner'}:name==='./workforce-planning/capacity-projection'?{CapacityProjection:'chart'}:require(name)});
 const analysis={id:'projection',spec:{months:1},inputs:{scope:'Support',asOf:'2026-09-30',opening:40},points:[{month:'2026-10-01',hires:2,exits:1,transfersIn:0,transfersOut:0,headcount:41}]};
 const render=(extra={})=>exports.ProjectionDemandPanel({analysis,demand:values,onDemandChange:v=>{values=v;changes++;},...extra});
 return {render,get values(){return values;},get changes(){return changes;},reset:v=>{values=v;}};
}
function nodes(tree){const out=[];function visit(n){if(!n||typeof n!=='object')return;out.push(n);for(const key of ['children','levers','visual','actions'])React.Children.forEach(n.props?.[key],visit);}visit(tree);return out;}
const button=(tree,text)=>nodes(tree).find(n=>n.type==='button'&&n.props.children===text);
const inputs={ftePerPerson:'1',allocation:'100',volume:'8000',effort:'1',hours:'160',productivity:'0'};
test('saved demand opens with exact inputs; hide/show does not edit or remove it',()=>{
 const h=harness(inputs);let tree=h.render();assert.equal(nodes(tree).filter(n=>n.type==='input').length,6);
 button(tree,'Hide demand').props.onClick();tree=h.render();assert.equal(h.changes,0);assert.equal(h.values,inputs);
 button(tree,'Show demand').props.onClick();tree=h.render();assert.equal(h.changes,0);assert.equal(nodes(tree).find(n=>n.type==='input'&&n.props.value==='8000').props.value,'8000');
});
test('clear keeps unknown inputs; removal is explicit; reset can restore saved demand',()=>{
 const h=harness(inputs);button(h.render(),'Clear demand assumptions').props.onClick();assert.deepEqual(JSON.parse(JSON.stringify(h.values)),demandLib.emptyProjectionDemand);
 button(h.render(),'Remove demand from this scenario').props.onClick();assert.equal(h.values,null);
 h.reset(inputs);assert.ok(button(h.render(),'Hide demand'),'reset restores visible demand mode without another click');assert.equal(h.values,inputs);assert.equal(nodes(h.render()).filter(n=>n.type==='input').length,6);
});
test('invalid hidden demand can reopen for explicit removal and save locks its controls',()=>{
 const h=harness(inputs);button(h.render(),'Hide demand').props.onClick();const invalid=h.render({analysis:null,calculationError:'Invalid flow'});
 assert.equal(button(invalid,'Show demand').props.disabled,false);button(invalid,'Show demand').props.onClick();
 const locked=h.render({demandDisabled:true});assert.equal(nodes(locked).find(n=>n.type==='fieldset').props.disabled,true);assert.equal(button(locked,'Hide demand').props.disabled,true);
});
