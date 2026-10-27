import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {positionDashboard} from '../lib/position-dashboard.ts';
import {structuralPositionCatalog} from '../lib/structural-position-engine.ts';
const row=(patch={})=>({org_code:'BU-A',org_name:'A',level_code:'L2',level_name:'L2',level_rank:2,job_profile_code:'ROLE-A',job_profile_name:'Role A',filled:8,vacant:4,frozen:2,open_req:2,on_hold_req:1,uncovered:1,frozen_open_req:0,frozen_on_hold_req:0,frozen_uncovered:2,planned_weight:8,cost_per_position:100000,...patch});
const inventory=rows=>({asOf:'2026-09-30',rows,skillRequirements:[],skillSupply:new Map(),responseStrategySignals:new Map()});
const catalog=()=>structuralPositionCatalog(inventory([row(),row({org_code:'BU-B',org_name:'B',level_code:'L3',job_profile_code:'ROLE-B',job_profile_name:'Role B',filled:3,vacant:0,frozen:0,open_req:0,on_hold_req:0,uncovered:0})]));
test('catalog preserves old counts and exposes exact position coverage, not raw requisition demand',()=>{
 const c=catalog(),a=c.combinations[0];assert.equal(a.current_positions,12);assert.equal(a.vacant_positions,4);assert.equal(a.annual_cost_per_position_usd,100000);
 assert.equal(a.frozen_positions,2);assert.equal(a.open_requisition_vacancies,2);assert.equal(a.on_hold_requisition_vacancies,1);assert.equal(a.uncovered_vacancies,1);
 const r=positionDashboard(c);assert.equal(r.status,'ready');assert.equal(r.budgeted,17);assert.equal(r.filled,11);assert.equal(r.vacant,6);assert.equal(r.frozen+r.recruiting+r.onHold+r.other,r.vacant);assert.equal(r.filled+r.vacant,r.budgeted);assert.equal(r.recruiting,2);
});
test('business unit, role and level intersect without changing source and no-match is not zero',()=>{
 const c=catalog(),before=JSON.stringify(c);for(const scope of [{businessUnit:'BU-A',role:'',level:''},{businessUnit:'',role:'ROLE-A',level:'L2'}]){const r=positionDashboard(c,scope);assert.equal(r.budgeted,14);assert.equal(r.filled,8);}
 assert.equal(positionDashboard(c,{businessUnit:'BU-A',role:'ROLE-B',level:''}).status,'empty');assert.equal(JSON.stringify(c),before);
});
test('missing, malformed and inconsistent evidence never becomes a healthy zero',()=>{
 assert.equal(positionDashboard(null).status,'unavailable');assert.equal(positionDashboard({...catalog(),combinations:[]}).status,'empty');
 for(const patch of [{current_positions:null},{vacant_positions:99},{frozen_positions:-1},{open_requisition_vacancies:99}]){
  const c=catalog();Object.assign(c.combinations[0],patch);const r=positionDashboard(c);
  if(Object.hasOwn(patch,'frozen_positions')){assert.equal(r.frozen,null);assert.equal(r.budgeted,null);assert.equal(r.breakdownKnown,false);}else assert.equal(r.status,'unavailable');
 }
 const c=catalog();delete c.combinations[0].open_requisition_vacancies;const r=positionDashboard(c);assert.equal(r.recruiting,null);assert.equal(r.breakdownKnown,false);assert.equal(r.filled,11);
});
test('true zero vacancies remains a supported zero; frozen is separate from requisition hold',()=>{
 const zero=positionDashboard(structuralPositionCatalog(inventory([row({vacant:0,frozen:0,open_req:0,on_hold_req:0,uncovered:0})])));assert.equal(zero.vacant,0);assert.equal(zero.recruiting,0);assert.equal(zero.breakdownKnown,true);
 const r=positionDashboard(catalog());assert.equal(r.onHold,1);assert.equal(r.frozen,2);
});
test('default journey is chart-first with native labeled filters and secondary saved editor',()=>{
 const ui=fs.readFileSync(new URL('../components/workforce-planning/position-dashboard.tsx',import.meta.url),'utf8');
 assert.match(ui,/Where are the vacancies/);assert.match(ui,/Demo budget/);assert.match(ui,/role="group" aria-label/);assert.equal((ui.match(/<select /g)||[]).length,3);assert.doesNotMatch(ui,/<input|goalId|setHistory|fetch\(/);
 const destination=fs.readFileSync(new URL('../components/workforce-planning/position-workforce-design-destination.tsx',import.meta.url),'utf8');assert.ok(destination.indexOf('<PositionDashboard')<destination.indexOf('<PositionScenarioEditor'));assert.match(destination,/Edit individual positions &amp; saved revisions/);
});
test('public field allowlist permits only four added aggregate coverage fields',()=>{
 const fields=JSON.parse(fs.readFileSync(new URL('../lib/public-9037-fields.json',import.meta.url),'utf8'))['/api/position-structure'];
 for(const key of ['frozen_positions','open_requisition_vacancies','on_hold_requisition_vacancies','uncovered_vacancies'])assert.ok(fields.includes(`combinations[].${key}`));
});
import React from 'react';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as dashboardModule from '../lib/position-dashboard.ts';
import * as labels from '../lib/catalog-display.ts';
const require=createRequire(import.meta.url);
function renderHarness(initial){
 let states=[],cursor=0;const exports={};
 const source=ts.transpileModule(fs.readFileSync(new URL('../components/workforce-planning/position-dashboard.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,require:name=>name==='react'?{...React,useId:()=>':dashboard:',useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];}}:name==='@/lib/position-dashboard'?dashboardModule:name==='@/lib/catalog-display'?labels:require(name)});
 function collect(tree){const all=[];function walk(n){if(!n||typeof n!=='object')return;if(typeof n.type==='function'){walk(n.type(n.props));return;}all.push(n);React.Children.forEach(n.props?.children,walk);}walk(tree);return all;}
 return {render:(props={})=>{cursor=0;return collect(exports.PositionDashboard({...initial,...props}));}};
}
test('actual dashboard filters recalculate chart totals and loading/error hide stale metrics',()=>{
 const h=renderHarness({catalog:catalog(),loading:false,error:null});let nodes=h.render();
 assert.equal(nodes.filter(n=>n.type==='figure').length,2);assert.equal(nodes.filter(n=>n.type==='input').length,0);
 nodes.filter(n=>n.type==='select')[0].props.onChange({target:{value:'BU-A'}});nodes=h.render();
 assert.ok(nodes.some(n=>n.props?.role==='group'&&n.props['aria-label']==='Filled: 8; Vacant: 6'));
 nodes.filter(n=>n.type==='select')[1].props.onChange({target:{value:'ROLE-B'}});nodes=h.render();assert.ok(nodes.some(n=>n.props?.role==='status'));assert.equal(nodes.filter(n=>n.type==='figure').length,0);
 nodes.find(n=>n.type==='button').props.onClick();assert.equal(h.render().filter(n=>n.type==='figure').length,2);
 for(const props of [{loading:true},{error:'unavailable'}]){nodes=h.render(props);assert.equal(nodes.filter(n=>n.type==='figure').length,0);}
});
test('duplicate or malformed source rows cannot double count positions',()=>{
 for(const rows of [[null],[...catalog().combinations,catalog().combinations[0]]])assert.equal(positionDashboard({...catalog(),combinations:rows}).status,'unavailable');
});

test('frozen requisition attachments are counted once, separately from active holds',()=>{
 const r=positionDashboard(structuralPositionCatalog(inventory([row({frozen:3,frozen_open_req:1,frozen_on_hold_req:1,frozen_uncovered:1})])));
 assert.equal(r.vacant,7);assert.equal(r.frozen,3);assert.equal(r.recruiting,2);assert.equal(r.onHold,1);assert.equal(r.other,1);
 assert.equal(r.frozen+r.recruiting+r.onHold+r.other,r.vacant);
});

 test('chart and legend selections expose only matching grouped counts and clear safely',()=>{
 const h=renderHarness({catalog:catalog(),loading:false,error:null});let nodes=h.render();
 nodes.find(n=>n.type==='button'&&n.props['aria-label']==='Recruiting: 2').props.onClick();nodes=h.render();
 assert.ok(nodes.some(n=>n.type==='section'&&n.props['aria-label']==='Recruiting grouped positions'));
 assert.equal(nodes.filter(n=>n.type==='li').length,1);
 nodes.find(n=>n.type==='button'&&n.props.children==='Clear selection').props.onClick();
 assert.equal(h.render().filter(n=>n.type==='li').length,0);
 });

test('malformed catalog renders unavailable before attempting selected row access',()=>{
 const h=renderHarness({catalog:catalog(),loading:false,error:null});
 h.render().find(n=>n.type==='button'&&n.props['aria-label']==='Recruiting: 2').props.onClick();
 for(const combinations of [[null],[{org_code:null}],null]){
  const nodes=h.render({catalog:{...catalog(),combinations}});
  assert.ok(nodes.some(n=>n.props?.role==='alert'));
  assert.equal(nodes.filter(n=>n.type==='figure'||n.type==='li').length,0);
 }
});
