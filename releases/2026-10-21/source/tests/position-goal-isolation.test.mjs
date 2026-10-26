import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import * as model from '../lib/position-design-scenario.ts';
const require=createRequire(import.meta.url);

function nodes(tree){const out=[];function walk(n){if(!n||typeof n!=='object')return;if(typeof n.type==='function'){walk(n.type(n.props));return;}out.push(n);React.Children.forEach(n.props?.children,walk);}walk(tree);return out;}
function fixture(id,fte){
 const row={id:'position-'+id,role:'Analyst',level:null,businessUnit:id,location:null,fte:1,annualCostUsd:null,occupancy:'unknown'};
 const scenario=model.createPositionScenario('scenario-'+id,{version:'entered-v1',asOf:'2026-09-30',scope:id,source:'user-entered',positions:[row]});
 return {baselineRows:[row],scope:id,asOf:'2026-09-30',scenario,rows:[{...row,fte}],editing:null};
}

/** Run actual component handlers with the repository's hook-harness convention.
 * React's keyed-child identity is modeled here; provider drafts and saved fields
 * deliberately outlive child remounts, as they do in PlanningSessionProvider.
 */
function harness(){
 let goalKey='0:a',mountedKey,states=[],cursor=0,tree;
 const drafts={'0:a':fixture('a',2),'0:b':fixture('b',3)};
 const history={'0:a':[structuredClone(drafts['0:a'].scenario)],'0:b':[structuredClone(drafts['0:b'].scenario)]};
 const snapshot=()=>({ready:true,saved:true,data:{goals:{goals:[{id:'a'},{id:'b'}]}}});
 const session=()=>({goalKey,positionDesignDraft:drafts[goalKey],setPositionDesignDraft:update=>{drafts[goalKey]=typeof update==='function'?update(drafts[goalKey]):update;},canCarryPositionDesignDraft:()=>false,carryPositionDesignDraft:()=>{throw Error('Unexpected transfer');}});
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(new URL('../components/workforce-planning/position-scenario-editor.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,structuredClone,require:id=>{
  if(id==='react')return {...React,useMemo:fn=>fn(),useState:initial=>{const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];}};
  if(id==='./planning-session-context')return {usePlanningSession:session};
  if(id==='./use-planning-decision-state')return {usePlanningDecisionState:()=>[history[goalKey],value=>{history[goalKey]=value;}]};
  if(id==='@/components/decision-store')return {useDecisionStorage:snapshot,decisionStore:{getSnapshot:snapshot}};
  if(id==='@/lib/position-design-scenario')return model;
  if(id==='@/components/interactive-planner')return {InteractivePlanner:props=>React.createElement('div',null,props.levers,props.visual)};
  return require(id);
 }});
 function render(next=goalKey){goalKey=next;const child=exports.PositionScenarioEditor();if(mountedKey!==child.key){states=[];mountedKey=child.key;}cursor=0;tree=child.type(child.props);return tree;}
 const button=label=>nodes(tree).find(n=>n.type==='button'&&n.props.children===label);
 const select=()=>nodes(tree).find(n=>n.type==='select'&&n.props['aria-label']==='Saved position revisions');
 return {render,button,select,drafts,history,all:()=>nodes(tree)};
}

test('discard confirmation cannot cross goals while provider-owned position drafts survive',()=>{
 const h=harness();h.render();h.button('Reset proposal').props.onClick();h.render();
 assert.ok(h.button('Discard edits and continue'));
 const a=structuredClone(h.drafts['0:a']),b=structuredClone(h.drafts['0:b']);
 h.render('0:b');assert.equal(h.button('Discard edits and continue'),undefined);
 assert.deepEqual(h.drafts['0:b'],b);assert.deepEqual(h.drafts['0:a'],a);
 h.render('0:a');assert.equal(h.button('Discard edits and continue'),undefined);assert.equal(h.drafts['0:a'].rows[0].fte,2);
 h.button('Reset proposal').props.onClick();h.render();h.button('Discard edits and continue').props.onClick();h.render();
 assert.equal(h.drafts['0:a'].rows[0].fte,1);assert.deepEqual(h.drafts['0:b'],b);
});

test('saved status and revision selection do not leak into a different goal',()=>{
 const h=harness();h.render();h.button('Save revision').props.onClick();h.render();
 assert.ok(h.all().some(n=>n.props?.role==='status'&&n.props.children==='Revision 2 saved in this browser.'));
 h.select().props.onChange({target:{value:'scenario-a:2'}});h.render();assert.equal(h.select().props.value,'scenario-a:2');
 h.render('0:b');assert.equal(h.select().props.value,'');assert.equal(h.all().some(n=>n.props?.role==='status'),false);
 assert.equal(h.history['0:a'].length,2);assert.equal(h.history['0:b'].length,1);assert.equal(h.drafts['0:b'].rows[0].fte,3);
 h.render('0:a');assert.equal(h.select().props.value,'');assert.equal(h.history['0:a'][1].revision,2);
});
