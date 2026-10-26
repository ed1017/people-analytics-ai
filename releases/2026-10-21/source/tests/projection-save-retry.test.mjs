import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function harness(onSave,{savedDemand=true}={}){
 const state=[],deps=[],effects=[];let cursor=0,disabled=false;
 const base={id:'base',revision:1,spec:{months:3},assumptions:{monthly_hires:5},inputs:{scope:'Test',asOf:'2026-09-30',opening:100},points:[{month:'2026-12-01',headcount:115}],demand:{inputs:{volume:'120'}}};
 if(!savedDemand)delete base.demand;
 const exports={};
 const source=ts.transpileModule(fs.readFileSync(new URL('../components/headcount-projection-planner.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,crypto:{randomUUID:()=> 'retry-turn'},require:name=>name==='react'?{...React,useState:initial=>{const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},useEffect:(effect,next)=>{const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;effects.push(effect);}}}:name==='@/lib/headcount-projection-edit'?{projectionEditFields:()=>['monthly_hires'],previewProjectionEdit:async(analysis,edit)=>{if(edit.demand?.volume==='invalid')throw Error('Invalid demand');return {...analysis,demand:{inputs:edit.demand}};}}:name==='./projection-demand-panel'?{ProjectionDemandPanel:'planner'}:name==='./planning-assumption-slider'?{PlanningAssumptionSlider:'slider'}:require(name)});
 const render=()=>{cursor=0;return exports.HeadcountProjectionPlanner({analysis:base,disabled,onSave,visual:()=>null});};
 async function flush(){let tree;for(let i=0;i<3;i++){tree=render();for(const effect of effects.splice(0))effect();await new Promise(r=>setImmediate(r));}return render();}
 return {flush,render,base,setDisabled:v=>{disabled=v;}};
}
test('failed save keeps demand and explicit retry available after storage readiness recovers',async()=>{
 let calls=0,received;
 const h=harness(async(base,edit)=>{calls++;received=edit;if(calls===1)throw Error('Storage full');});
 let tree=await h.flush();tree.props.onDemandChange({volume:'140'});tree=await h.flush();
 assert.equal(tree.props.actions.props.disabled,false);
 await tree.props.actions.props.onClick();tree=await h.flush();
 assert.equal(calls,1);assert.equal(tree.props.demand.volume,'140');assert.equal(h.base.demand.inputs.volume,'120');
 h.setDisabled(true);assert.equal(h.render().props.actions.props.disabled,true);
 h.setDisabled(false);tree=await h.flush();assert.equal(tree.props.actions.props.disabled,false);
 assert.equal(calls,1,'recovery must not auto-save');
 await tree.props.actions.props.onClick();assert.equal(calls,2);assert.equal(received.demand.volume,'140');
});
test('pending save and invalid current demand remain blocked after a recoverable source error',async()=>{
 let release,calls=0;
 const h=harness(()=>{calls++;return new Promise((resolve,reject)=>{release=()=>reject(Error('Source check failed'));});});
 let tree=await h.flush();tree.props.onDemandChange({volume:'140'});tree=await h.flush();
 const pending=tree.props.actions.props.onClick();assert.equal(h.render().props.actions.props.disabled,true);
 release();await pending;tree=await h.flush();assert.equal(tree.props.actions.props.disabled,false);assert.equal(calls,1);
 tree.props.onDemandChange({volume:'invalid'});tree=await h.flush();assert.equal(tree.props.actions.props.disabled,true);
});

function resetButton(tree){return React.Children.toArray(tree.props.levers.props.children).find(n=>n?.type==='button'&&n.props.children==='Reset to saved revision');}
test('reset restores saved demand visibility after hide, edits and repeated resets without saving',async()=>{
 let calls=0;const h=harness(async()=>{calls++;});
 let tree=await h.flush();assert.equal(tree.props.demandOpen,true);
 tree.props.onDemandChange({volume:'140'});tree=await h.flush();
 tree.props.onDemandOpenChange(false);tree=await h.flush();assert.equal(tree.props.demandOpen,false);
 tree.props.onDemandChange({volume:'160'});tree=await h.flush();assert.equal(tree.props.demandOpen,false,'ordinary edits preserve hidden demand');
 assert.equal(resetButton(tree).props.disabled,false);resetButton(tree).props.onClick();tree=await h.flush();
 assert.equal(tree.props.demandOpen,true);assert.equal(tree.props.demand.volume,'120');assert.equal(tree.props.actions.props.disabled,true);
 tree.props.onDemandOpenChange(false);tree.props.onDemandChange(null);tree=await h.flush();resetButton(tree).props.onClick();tree=await h.flush();
 assert.equal(tree.props.demandOpen,true);assert.equal(tree.props.demand.volume,'120');assert.equal(h.base.demand.inputs.volume,'120');assert.equal(calls,0);
});
test('reset of a headcount-only saved revision removes added demand and restores headcount mode',async()=>{
 const h=harness(async()=>assert.fail('reset must not save'),{savedDemand:false});
 let tree=await h.flush();assert.equal(tree.props.demandOpen,false);
 tree.props.onDemandChange({volume:'140'});tree.props.onDemandOpenChange(true);tree=await h.flush();
 assert.equal(tree.props.demandOpen,true);resetButton(tree).props.onClick();tree=await h.flush();
 assert.equal(tree.props.demand,null);assert.equal(tree.props.demandOpen,false);assert.equal(tree.props.actions.props.disabled,true);
});
