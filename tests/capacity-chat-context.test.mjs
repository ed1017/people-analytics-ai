import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {capacityChatContext,readCapacityChatContext,capacityChatPrompt} from '../lib/capacity-chat-context.ts';
import {emptyCapacityDraft,capacitySpec} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
import {calculateCapacityCost,capacityCostAssumptions,capacityCalculationKey} from '../lib/swp-capacity-cost.ts';
import {completeScopedChatTurn,getScopedChatHistory} from '../lib/chat-context-history.ts';
const identity={datasetToken:'legacy-v1:0',goalId:'support',goal:'Plan support capacity'};
function session(patch={}) {
 const draft={...emptyCapacityDraft,costRate:'',scope:'Support team - tickets',openingDate:'2026-09-30',months:'3',people:'5',fte:'5',volume:'1000',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'100',productivity:'0',fullTimeMovements:true,confirmed:true,...patch};
 const result=calculateMonthlyWorkload(capacitySpec(draft)),cost=calculateCapacityCost(result,capacityCostAssumptions(draft.costRate));
 return {draft,result,cost,error:'',scope:{id:'support-scope',label:draft.scope,workUnit:draft.scope},capture:{inputKey:capacityCalculationKey(result,cost),binding:{...identity,scopeId:'support-scope',scopeLabel:draft.scope,workUnit:draft.scope}}};
}
test('support fixture preserves workload, time, units, assumptions and exact shortfall',()=>{
 const packet=capacityChatContext(session(),identity),evidence=readCapacityChatContext(JSON.parse(JSON.stringify(packet)),identity);
 assert.equal(evidence.result.points.length,3);
 for(const p of evidence.result.points)assert.deepEqual([p.allocatedFte,p.requiredFte,p.gapFte],[5,6.25,1.25]);
 assert.equal(evidence.result.assumptions.months[0].volume.value,1000);
 assert.equal(evidence.result.assumptions.months[0].volume.unit,'work-units/month');
 assert.equal(evidence.result.assumptions.opening.asOf,'2026-09-30');
 assert.equal(evidence.result.assumptions.months[0].volume.basis.kind,'user-assumption');
 assert.equal(evidence.cost.points[0].runRateCents,null);
 const prompt=capacityChatPrompt(packet,identity);
 assert.match(prompt,/workforceFiltersApplied":false/);assert.match(prompt,/not observed workforce facts/);assert.match(prompt,/Distinguish facts, assumptions and proposals/);
 assert.doesNotMatch(prompt,/legacy-v1|support-scope/);
});
test('edits, unconfirmation, errors, tampered results and goal/dataset changes cannot carry old results',()=>{
 const s=session();
 for(const changed of [{...s,draft:{...s.draft,volume:'1200'}},{...s,draft:{...s.draft,confirmed:false}},{...s,result:null},{...s,error:'Invalid'},{...s,capture:null},{...s,result:{...s.result,points:[]}}])assert.equal(capacityChatContext(changed,identity),null);
 for(const expected of [{...identity,goalId:'other'},{...identity,goal:'Changed goal'},{...identity,datasetToken:'new:1'}]){
  assert.equal(capacityChatContext(s,expected),null);assert.throws(()=>readCapacityChatContext(capacityChatContext(s,identity),expected));
 }
 const oldKey=JSON.stringify(capacityChatContext(s,identity)),history=completeScopedChatTurn(oldKey,[],'Explain','Old capacity');
 assert.deepEqual(getScopedChatHistory(history,JSON.stringify(capacityChatContext({...s,result:null},identity))),[]);
 assert.deepEqual(getScopedChatHistory(history,JSON.stringify(capacityChatContext(session({volume:'1200'}),identity))),[]);
});
test('saved identity is current only while input key matches; unknown and zero remain distinct',()=>{
 const s=session(),openedScenario={id:'saved-a',name:'Support base',inputKey:s.capture.inputKey};
 assert.deepEqual(capacityChatContext({...s,openedScenario},identity).scenario,{id:'saved-a',name:'Support base'});
 assert.equal(capacityChatContext({...session({volume:'1200'}),openedScenario},identity).scenario,null);
 const zero=readCapacityChatContext(capacityChatContext(session({volume:'0',costRate:'0'}),identity),identity);
 assert.equal(zero.result.points[0].requiredFte,0);assert.equal(zero.cost.points[0].runRateCents,0);
 const partial=readCapacityChatContext(capacityChatContext(session({fte:''}),identity),identity);
 assert.equal(partial.result.status,'needs-inputs');assert.equal(partial.result.points[0].allocatedFte,null);assert.equal(partial.result.points[0].requiredFte,6.25);
});
test('boundary rejects excess data and malformed drafts rather than forwarding arbitrary client evidence',()=>{
 const packet=capacityChatContext(session(),identity);
 for(const bad of [{...packet,result:{gapFte:100}},{...packet,draft:{...packet.draft,ownerNotes:'private'}},{...packet,draft:{...packet.draft,scope:'x'.repeat(9000)}},{...packet,draft:{...packet.draft,confirmed:false}},{...packet,scenario:{id:'a',name:'b',private:'secret'}}])assert.throws(()=>readCapacityChatContext(bad,identity));
});

test('actual chat POST includes calculator in HR and Leader model inputs; mismatches never call model',async()=>{
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'capacity-chat-route-')),isolation=path.resolve('tests/fixtures/home-route-isolation.ts');
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.resolve('app/api/chat/route.ts'),output:{path:out,filename:'route.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'openai$':isolation,'next/server$':isolation,'@/lib/openai-proxy-transport$':isolation,'../../../lib/people-analytics-tools$':isolation,'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
 const sandbox={exports:{},require:createRequire(import.meta.url),Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,console,process:{env:{OPENAI_API_KEY:'synthetic-harness-only'}},__requests:[],__replies:[],__requestOptions:[],fetch:()=>{throw Error('Network forbidden')}};
 sandbox.module={exports:sandbox.exports};
 vm.createContext(sandbox);
 vm.runInContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'route.cjs'),'utf8'),sandbox);
 const body={page:'workforce-planning',goalId:identity.goalId,goalContext:{goal:identity.goal},message:'Explain my support-team calculation',history:[],capacityContext:capacityChatContext(session(),identity),context:{snapshotDate:'2026-09-30',country:'US',businessUnit:'Support',level:'all',headcount:5,fte:5,voluntaryTurnoverYtdPct:null,laborCostUsd:null,openPositions:null,headcountGrowthPct:null,trendStart:null,trendEnd:null}};
 const post=body=>{
  const request=new Request('http://synthetic.invalid/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  // Request parsing belongs to the route's realm, just as in a real server.
  request.json=async()=>vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(body))})`,sandbox);
  return sandbox.module.exports.POST(request);
 };
 for(const persona of ['HR','Leader']){
  sandbox.__replies.push({status:'completed',output:[],output_text:JSON.stringify({answer:{discussion:'Synthetic answer.'}})});
  const response=await post({...body,persona});assert.equal(response.status,200,await response.text());
  const request=sandbox.__requests.at(-1),input=JSON.stringify(request.input);
  for(const value of ['CURRENT WORKLOAD CAPACITY CALCULATOR','Support team - tickets','6.25','1.25','1000','workforceFiltersApplied'])assert.ok(input.includes(value),value);
  assert.match(input,/global workforce filters do not narrow it/);
 }
 const before=sandbox.__requests.length;
 for(const capacityContext of [{...body.capacityContext,datasetToken:'other:1'},{...body.capacityContext,goalId:'wrong'},{...body.capacityContext,result:{gapFte:99}}])assert.equal((await post({...body,capacityContext})).status,400);
 assert.equal(sandbox.__requests.length,before);
});

test('lifted session state isolates goals/datasets and provider exposes the parent-owned state',async()=>{
 const file=path.resolve('components/workforce-planning/planning-session-context.tsx'),source=await fs.readFile(file,'utf8');
 let slots=[],cursor=0,token=identity.datasetToken;
 const mocks={react:{...React,useState(initial){const index=cursor++;if(!(index in slots))slots[index]=initial;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];},useSyncExternalStore:()=>token},'@/lib/dataset-client.mjs':{datasetSession:{}},'@/lib/swp-capacity-draft':{emptyCapacityDraft}};
 const compiled=new Module(file),require=createRequire(import.meta.url);compiled.filename=file;compiled.require=id=>mocks[id]??require(id);
 compiled._compile(ts.transpileModule(source,{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 const {useCapacitySessionState,PlanningSessionProvider}=compiled.exports;
 const render=goal=>{cursor=0;return useCapacitySessionState(goal);};
 const a=render('goal:support');a.setCapacitySession(session());assert.equal(render('goal:support').capacitySession.result.points[0].gapFte,1.25);
 assert.equal(render('goal:other').capacitySession.result,null);token='other:1';assert.equal(render('goal:support').capacitySession.result,null);
 token=identity.datasetToken;const current=render('goal:support');assert.equal(current.capacitySession.result.points[0].gapFte,1.25);
 slots=[];cursor=0;const tree=PlanningSessionProvider({children:null,goalKey:'goal:support',capacityState:current,onTalentEvidenceContextChange(){}});
 assert.equal(tree.props.value.capacitySession,current.capacitySession);assert.equal(tree.props.value.setCapacitySession,current.setCapacitySession);
 const app=await fs.readFile('app/page.tsx','utf8');
 assert.match(app,/capacityState=useCapacitySessionState\(conversation.workspaceKey\)/);
 assert.match(app,/capacityContext:planningWorkspaceActive\?capacityChatContext\(capacityState.capacitySession/);
 assert.match(app,/capacityState=\{capacityState\}/);
 assert.match(app,/chatEvidenceKey = JSON.stringify[\s\S]*?\.\.\.chatEvidence/);
});
