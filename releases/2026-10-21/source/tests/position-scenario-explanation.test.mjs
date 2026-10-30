import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import ts from 'typescript';
import * as context from '../lib/position-chat-context.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {DEMO_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {unknownPositionFinance,noPositionAddition,POSITION_FINANCE_MODEL} from '../lib/position-finance-assessment.ts';
const require=createRequire(import.meta.url);
const source=ts.transpileModule(fs.readFileSync(new URL('../components/workforce-planning/position-scenario-explanation.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const identity={datasetToken:'test',goalId:'selected-goal',goal:'Review vacancies'};
const ids=DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id);
const packet=()=>context.positionChatContext({draft:createPositionAllocation(ids,true),scenario:{id:'saved-one',revision:1}},identity);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(initial=packet()){
 let props={packet:initial},cursor=0,hooks=[],effects=[],pendingEffects=[];const requests=[],exports={};
 const useState=initial=>{const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],next=>{hooks[i]=typeof next==='function'?next(hooks[i]):next;}];};
 const react={...React,useState,useMemo:fn=>fn(),useRef:initial=>{const i=cursor++;if(!(i in hooks))hooks[i]={current:initial};return hooks[i];},useEffect:(fn,deps)=>{const i=cursor++;if(!effects[i]||JSON.stringify(effects[i].deps)!==JSON.stringify(deps)){pendingEffects.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});}}};
 vm.runInNewContext(source,{exports,require:name=>name==='react'?react:name==='@/components/chat-content'?{ChatContent:'ChatContent'}:name==='@/lib/position-chat-context'?context:name==='@/lib/public-ai-readiness-client.mjs'?{publicAiFetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,init,resolve,reject}))}:require(name),AbortController,structuredClone,JSON,console});
 function render(next){if(next!==undefined)props={packet:next};cursor=0;const nodes=[];const tree=exports.PositionScenarioExplanation(props);function walk(node){if(!node||typeof node!=='object')return;nodes.push(node);React.Children.forEach(node.props?.children,walk);}walk(tree);pendingEffects.splice(0).forEach(fn=>fn());return nodes;}
 function click(label){const node=render().find(n=>n.type==='button'&&n.props.children===label);assert.ok(node,`Missing ${label}`);node.props.onClick();}
 function resolve(index,patch={},status=200){const req=requests[index],input=JSON.parse(req.init.body),p=input.positionContext,evidence=context.readPositionChatContext(p,{datasetToken:p.datasetToken,goalId:p.goalId,goal:p.goal}).evidence;req.resolve(new Response(JSON.stringify({answer:'Six FTE are ready under these assumptions.',positionEvidence:evidence,...patch}),{status}));}
 return {render,click,requests,resolve,setActive:value=>{props={...props,active:value};},unmount:()=>effects.forEach(e=>e?.cleanup?.())};
}
const chat=h=>h.render().find(n=>n.type==='ChatContent');

test('mount, rerender and scenario edits never send automatically; funding status is deterministic',()=>{
 const h=harness();let nodes=h.render();h.render();const edited=packet();edited.draft.input.budgetUsd=200000;nodes=h.render(edited);assert.equal(h.requests.length,0);
 assert.ok(nodes.some(n=>n.props?.['data-position-funding-status']==='funding-unknown'));assert.equal(chat(h),undefined);
});

test('explicit click submits exact scope once, disables repeated clicks and renders only verified evidence',async()=>{
 const h=harness(),original=packet();h.render(original);const before=JSON.stringify(original);h.click('Explain this scenario');
 const pending=h.render().find(n=>n.type==='button'&&n.props.children==='Explaining…');assert.equal(pending.props.disabled,true);pending.props.onClick();assert.equal(h.requests.length,1);
 const req=h.requests[0],body=JSON.parse(req.init.body);assert.equal(req.path,'/api/chat');assert.equal(body.page,'workforce-planning');assert.equal(body.goalId,identity.goalId);assert.equal(body.goalContext.goal,identity.goal);assert.deepEqual(body.positionContext,original);assert.deepEqual(body.history,[]);
 h.resolve(0);await tick();assert.ok(chat(h));assert.equal(JSON.stringify(original),before);
});

test('changed packet aborts pending work and rejects a late response even if transport ignores abort',async()=>{
 const h=harness();h.click('Explain this scenario');const next=packet();next.draft.input.hire=2;h.render(next);assert.equal(h.requests[0].init.signal.aborted,true);
 h.resolve(0);await tick();assert.equal(chat(h),undefined);assert.equal(h.requests.length,1);
 h.click('Explain this scenario');h.resolve(1);await tick();assert.ok(chat(h));
});

test('goal changes hide a prior answer and do not trigger another request',async()=>{
 const h=harness();h.click('Explain this scenario');h.resolve(0);await tick();assert.ok(chat(h));
 const next=packet();next.goalId='other';next.goal='Different goal';h.render(next);assert.equal(chat(h),undefined);assert.equal(h.requests.length,1);
 h.render(packet());assert.equal(chat(h),undefined,'returning to prior scope does not resurrect a cleared answer');
});

test('explicit cancellation clears pending result without changing the scenario; late result stays hidden',async()=>{
 const h=harness();h.click('Explain this scenario');h.click('Cancel explanation');assert.equal(h.requests[0].init.signal.aborted,true);
 h.resolve(0);await tick();assert.equal(chat(h),undefined);assert.ok(h.render().some(n=>n.props?.role==='status'&&n.props.children==='Explanation cancelled. Your scenario is unchanged.'));
 h.click('Explain this scenario');assert.equal(h.requests.length,2);
});

test('failure preserves scenario and retries only after an explicit click',async()=>{
 const h=harness();h.click('Explain this scenario');h.requests[0].reject(Error('Live AI is unavailable. Your saved work is kept.'));await tick();
 assert.ok(h.render().some(n=>n.props?.role==='alert'));assert.equal(chat(h),undefined);h.render();assert.equal(h.requests.length,1);
 h.click('Retry explanation');h.resolve(1);await tick();assert.ok(chat(h));assert.equal(h.requests.length,2);
});

test('mismatched evidence, empty answer and malformed success never render ChatContent',async()=>{
 for(const patch of [{positionEvidence:{finance:{status:'approved'}}},{answer:''},{answer:' '.repeat(5)}]){const h=harness();h.click('Explain this scenario');h.resolve(0,patch);await tick();assert.equal(chat(h),undefined);assert.ok(h.render().some(n=>n.props?.role==='alert'));}
 const h=harness();h.click('Explain this scenario');h.requests[0].resolve(new Response('null'));await tick();assert.equal(chat(h),undefined);assert.ok(h.render().some(n=>n.props?.role==='alert'));
});

test('invalid client approval is disabled, and unmount aborts pending requests',async()=>{
 const p=packet();p.finance={version:1,modelVersion:POSITION_FINANCE_MODEL,envelope:{...unknownPositionFinance(p.draft),basis:'approved-source',reference:'Claimed approval',fundedPositionIds:ids,incrementalFundingUsd:150000},addition:noPositionAddition()};
 const invalid=harness(p);assert.equal(invalid.render().find(n=>n.type==='button').props.disabled,true);invalid.click('Explain this scenario');assert.equal(invalid.requests.length,0);
 const h=harness();h.click('Explain this scenario');h.unmount();assert.equal(h.requests[0].init.signal.aborted,true);h.resolve(0);await tick();assert.equal(chat(h),undefined);
});


test('inactive shared planner aborts pending explanation, ignores late response and clears prior answers',async()=>{
 const h=harness();h.click('Explain this scenario');h.setActive(false);let nodes=h.render();
 assert.equal(h.requests[0].init.signal.aborted,true);assert.equal(nodes.find(n=>n.type==='button').props.disabled,true);
 h.click('Explain this scenario');assert.equal(h.requests.length,1);h.resolve(0);await tick();assert.equal(chat(h),undefined);
 h.setActive(true);h.render();assert.equal(chat(h),undefined);assert.equal(h.requests.length,1);
 h.click('Explain this scenario');h.resolve(1);await tick();assert.ok(chat(h));
 h.setActive(false);h.render();assert.equal(chat(h),undefined);h.setActive(true);h.render();assert.equal(chat(h),undefined);assert.equal(h.requests.length,2);
});
