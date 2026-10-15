import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import * as demand from '../lib/swp-demand.ts';
import * as staffing from '../lib/home-service-staffing.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionRequest,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
import {messages,naturalSteps} from './fixtures/natural-business-planning.mjs';
const require=createRequire(import.meta.url);
const nodes=element=>!element||typeof element!=='object'?[]:[element,...React.Children.toArray(element.props?.children).flatMap(nodes)];
function harness(controller){
 const state=[];let cursor=0;
 const exports={},source=fs.readFileSync(new URL('../components/home-business-planning-review.tsx',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>name==='react'?{useState:initial=>{const index=cursor++;if(!(index in state))state[index]=initial;return [state[index],value=>{state[index]=value;}];}}:name==='@/lib/swp-demand'?demand:name==='@/lib/home-service-staffing'?staffing:require(name)});
 return ()=>{cursor=0;return exports.HomeBusinessPlanningReview({controller});};
}
async function journey(count=3){let reply;for(const [index,text] of Object.values(messages).slice(0,count).entries()){
 const request=solutionRequest(text,false,reply?.state,index+1),runtime=fixtureRuntime(naturalSteps(request));runtime.natural={datasetToken:'legacy-v1:0'};
 reply=await converseSolutions(request,runtime,new AbortController().signal);
 }return reply.state;}
test('incomplete mocked reply explains why save is unavailable without inventing an action',async()=>{
 const state=await journey(1),render=harness({state,canSend:true});
 const tree=render(),html=renderToStaticMarkup(tree);
 assert.match(html,/Plan cannot be saved yet/);assert.match(html,/Clarify the operational role slice/);
 assert.equal(nodes(tree).filter(n=>n.type==='button'&&String(n.props.children).startsWith('Save plan')).length,0);
});
test('no-gap calculation explains there is no staffing plan to save and offers no save action',async()=>{
 const state=await journey(),business=state.businessPlanning;
 // Local scenario fixture: sufficient capacity, recalculated by the real kernels.
 business.review.spec.availabilityPct.value=100;
 business.review.result=demand.calculateServiceDemand(business.review.spec);
 business.staffing.result=staffing.calculateServiceStaffing(business.review,business.staffing.inputs);
 assert.equal(business.review.result.additionalRoles,0);
 assert.equal(business.staffing.result.status,'no-gap');
 const calls=[],tree=harness({state,canSend:true,reviewBusinessOption:()=>calls.push('review'),saveBusinessOption:()=>calls.push('save')})();
 const html=renderToStaticMarkup(tree);
 assert.match(html,/No staffing plan to save: the calculated workload has no positive gap\./);
 assert.doesNotMatch(html,/Plan cannot be saved yet|Choose an option to review below/);
 assert.equal(nodes(tree).some(n=>n.type==='button'&&/^(Save plan|Review to save:)/.test(String(n.props.children))),false);
 assert.deepEqual(calls,[]);
});
test('reviewable mocked response requires explicit review then explicit save; stale review disappears',async()=>{
 const state=await journey(),calls=[];
 const review={key:JSON.stringify(state.businessPlanning),selection:{goal:{statement:'Cover contract workload'},draft:{inputs:{}},option:state.businessPlanning.staffing.result.options[0],result:{issues:[]}}};
 const controller={state,canSend:true,reviewBusinessOption:async id=>{calls.push(['review',id]);return review;},saveBusinessOption:value=>calls.push(['save',value])};
 const render=harness(controller),first=render();assert.match(renderToStaticMarkup(first),/Save plan:/);assert.deepEqual(calls,[]);
 const button=nodes(first).find(n=>n.type==='button'&&String(n.props.children).startsWith('Review to save:'));
 assert.equal(Boolean(button.props.disabled),false);await button.props.onClick();assert.equal(calls.length,1);
 const reviewed=render(),save=nodes(reviewed).find(n=>n.type==='button'&&n.props.children==='Save plan with unknowns');assert.ok(save);assert.equal(Boolean(save.props.disabled),false);
 save.props.onClick();assert.equal(calls.length,2);assert.equal(calls[1][1],review);
 controller.state={...state,businessPlanning:{...state.businessPlanning,revision:99}};
 assert.equal(nodes(render()).some(n=>n.type==='button'&&n.props.children==='Save plan with unknowns'),false);
});
test('qualitative proposal Save plan uses the existing explicit action and preserves blockers',()=>{
 const exports={},source=fs.readFileSync(new URL('../components/home-solution-conversation-review.tsx',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js+'\nexports.ProposalForTest=Proposal;',{exports,require:name=>name==='react/jsx-runtime'?require(name):name==='react'?React:new Proxy({},{get:()=>()=>null})});
 const calls=[],item={id:'current',revision:1,requestId:'r1',constraints:[],candidate:{name:'Capacity review',activities:[]},draft:{},blocking:[]};
 const controller={state:{constraints:[]},canSend:true,save:(...args)=>calls.push(args)};
 const render=(changes={},edit={})=>exports.ProposalForTest({item,...changes,controller:changes.controller??controller,goal:'Improve delivery',number:1,edit:{statement:'Improve delivery',dirty:false,...edit},onEdit:()=>{}});
 const saveButton=tree=>nodes(tree).find(n=>n.type==='button'&&n.props.children==='Save plan');
 const tree=render();assert.equal(calls.length,0);assert.equal(Boolean(saveButton(tree).props.disabled),false);
 saveButton(tree).props.onClick();assert.equal(calls.length,1);assert.equal(calls[0][0],item);assert.equal(calls[0][1],true);
 for(const props of [{item:{...item,blocking:['Scope changed']}},{item:{...item,draft:null}},{controller:{...controller,state:{constraints:['changed']}}},{controller:{...controller,canSend:false}},{controller:{...controller,pending:true}},{controller:{...controller,saving:true}}])assert.ok(saveButton(render(props)).props.disabled);
 assert.ok(saveButton(render({}, {dirty:true})).props.disabled);
 assert.ok(saveButton(render({}, {statement:''})).props.disabled);
});
test('pending, storage unavailable and invalid options keep review disabled',async()=>{
 const state=await journey();
 for(const flags of [{pending:true,canSend:true},{saving:true,canSend:true},{canSend:false}]){
  const tree=harness({state,...flags})();
  assert.ok(nodes(tree).filter(n=>n.type==='button'&&String(n.props.children).startsWith('Review to save:')).every(n=>n.props.disabled));
 }
 const invalid=structuredClone(state);invalid.businessPlanning.staffing.result.options.forEach(o=>{o.status='invalid';});
 const tree=harness({state:invalid,canSend:true})();assert.match(renderToStaticMarkup(tree),/Plan cannot be saved yet/);
 assert.ok(nodes(tree).filter(n=>n.type==='button'&&String(n.props.children).startsWith('Review to save:')).every(n=>n.props.disabled));
});
