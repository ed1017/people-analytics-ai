import test from 'node:test';import assert from 'node:assert/strict';
import {syntheticCapacityDraft,syntheticCapacityCalculation,visibleSyntheticCapacityRisk} from '../lib/synthetic-capacity-risk.ts';
import {PUBLIC_9037} from '../lib/public-9037-contract.mjs';
import {DecisionStore,encodeDecisions} from '../lib/local-decisions.ts';
import {capacityBinding,saveCapacityScenario,openCapacityScenario,monthlyCapacityField} from '../lib/swp-capacity-store.ts';
import {calculateCapacityCost,capacityCostAssumptions,capacityCalculationKey} from '../lib/swp-capacity-cost.ts';
const filters={country:'all',org:'all',level:'all'};
test('versioned fictional slice computes same monthly handoff and excludes unsupported scope',()=>{
 const draft=syntheticCapacityDraft(),before=structuredClone(draft),risk=visibleSyntheticCapacityRisk(filters,'2026-09-30',PUBLIC_9037.token);
 assert.equal(draft.confirmed,false);assert.equal(draft.costRate,'');assert.ok(draft.sourceNote.length<=300);
 assert.deepEqual(risk.result,syntheticCapacityCalculation(draft));assert.deepEqual(risk.result.points.map(p=>[p.month,p.headcount,p.contractedFte,p.allocatedFte,p.requiredFte,p.gapFte]),['2026-10','2026-11','2026-12'].map(m=>[m,10,10,3,8,5]));assert.deepEqual(draft,before);
 for(const [f,date,token] of [[{...filters,country:'US'},'2026-09-30',PUBLIC_9037.token],[{...filters,org:'BU-TECH'},'2026-09-30',PUBLIC_9037.token],[filters,'2026-10-31',PUBLIC_9037.token],[filters,'2026-09-30','legacy-v1:0']])assert.equal(visibleSyntheticCapacityRisk(f,date,token),null);
 assert.equal(visibleSyntheticCapacityRisk({...filters,org:'BU-CLIENTOPS'},'2026-09-30',PUBLIC_9037.token),null);
 assert.equal(visibleSyntheticCapacityRisk({...filters,org:'Fictional Service Operations'},'2026-09-30',PUBLIC_9037.token),null);
});
test('editing workload changes calculated risk; unknown and zero retain their meanings',()=>{
 const d=syntheticCapacityDraft();assert.equal(syntheticCapacityCalculation({...d,volume:'480'}).points[0].gapFte,0);assert.equal(syntheticCapacityCalculation({...d,volume:'0'}).points[0].requiredFte,0);assert.equal(syntheticCapacityCalculation({...d,volume:''}).points[0].gapFte,null);assert.equal(syntheticCapacityCalculation({...d,allocation:''}).points[0].allocatedFte,null);
});
test('existing selected-goal store appends scenarios, increments revision and reopens exact editable source without touching prior plans',()=>{
 const context={datasetToken:'legacy-v1:0',goalId:'a',goal:'Review fictional capacity'},at='2026-10-27T12:00:00.000Z';
 let raw=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:context.goal}]},workspaces:{a:{savedAt:at,fields:{priorPlan:{id:'keep',value:'untouched'}}}}});
 const store=new DecisionStore();store.initialize({getItem:()=>raw,setItem:(k,v)=>{raw=v;},removeItem:()=>{}});
 const scope={id:'synthetic-clientops-v1',label:syntheticCapacityDraft().scope,workUnit:syntheticCapacityDraft().scope},binding=capacityBinding(context,scope);
 const save=(id,volume)=>{const draft={...syntheticCapacityDraft(),volume,confirmed:true},result=syntheticCapacityCalculation(draft),cost=calculateCapacityCost(result,capacityCostAssumptions(draft.costRate));return saveCapacityScenario({store,context,scope,capture:{inputKey:capacityCalculationKey(result,cost),binding},session:{draft,result,cost,error:''},name:id,id,at,revision:store.getSnapshot().data.revision,assertActive:()=>{}});};
 const first=save('demo-one','1280'),before=JSON.stringify(first),second=save('demo-two','1440');
 assert.equal(store.getSnapshot().data.revision,3);assert.deepEqual(store.getSnapshot().data.workspaces.a.fields.priorPlan,{id:'keep',value:'untouched'});
 const opened=openCapacityScenario(store,context,first.record.id,3,()=>{});assert.equal(JSON.stringify(opened.entry),before);assert.equal(opened.entry.draft.sourceNote,syntheticCapacityDraft().sourceNote);assert.equal(second.record.result.points[0].gapFte,6);assert.equal(store.getSnapshot().data.workspaces.a.fields[monthlyCapacityField].entries.length,2);
});
import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import ts from 'typescript';import React from 'react';
import {emptyCapacityDraft} from '../lib/swp-capacity-draft.ts';
const require=createRequire(import.meta.url);
function sessionHarness(){let state={};const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/workforce-planning/planning-session-context.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,structuredClone,require:name=>name==='react'?{...React,useState:()=>[state,v=>{state=typeof v==='function'?v(state):v;}],useSyncExternalStore:()=> 'legacy-v1:0'}:name==='@/lib/dataset-client.mjs'?{datasetSession:{}}:name==='@/lib/swp-capacity-draft'?{emptyCapacityDraft}:require(name)});
 return key=>exports.useCapacitySessionState(key);
}
test('actual shared session hook carries edited draft through explicit new/existing goal choices, cancel keeps it, then saves and reopens unchanged',()=>{
 for(const existing of [false,true]){
  const hook=sessionHarness(),draft={...syntheticCapacityDraft(),volume:'1600',allocation:'40',confirmed:false},session={draft,result:null,cost:null,error:'',scope:null,capture:null};
  hook('goal:').setCapacitySession(session);const canceled=hook('goal:');assert.deepEqual(canceled.capacitySession.draft,draft);
  const at='2026-10-27T12:00:00.000Z',id=existing?'existing-goal':'new-goal',statement='Test edited capacity',prior={id:'keep',value:'untouched'};
  let raw=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:existing?[{id,statement}]:[]},workspaces:existing?{[id]:{savedAt:at,fields:{priorPlan:prior}}}:{}});
  const store=new DecisionStore();store.initialize({getItem:()=>raw,setItem:(k,v)=>{raw=v;},removeItem:()=>{}});
  // Goal-only callbacks select/create; the wrapper carries its own snapshot using the actual shared hook.
  const snapshot=canceled.capacitySession;
  const goals=store.getSnapshot().data.goals;store.saveGoals({...goals,activeId:id,goals:existing?goals.goals:[...goals.goals,{id,statement}]});
  canceled.setCapacitySessionForGoal(id,snapshot);
  const carried=hook('goal:'+id).capacitySession;assert.deepEqual(carried.draft,draft);assert.equal(carried.capture,null);assert.deepEqual(hook('goal:').capacitySession.draft,draft);
  const context={datasetToken:'legacy-v1:0',goalId:id,goal:statement},scope={id:'test-scope',label:draft.scope,workUnit:draft.scope},confirmed={...carried.draft,confirmed:true},result=syntheticCapacityCalculation(confirmed),cost=calculateCapacityCost(result,capacityCostAssumptions(''));
  saveCapacityScenario({store,context,scope,capture:{inputKey:capacityCalculationKey(result,cost),binding:capacityBinding(context,scope)},session:{draft:confirmed,result,cost,error:''},name:'Edited demo',id:'saved-demo',at,revision:store.getSnapshot().data.revision,assertActive:()=>{}});
  const reopened=openCapacityScenario(store,context,'saved-demo',store.getSnapshot().data.revision,()=>{});assert.deepEqual(reopened.entry.draft,confirmed);assert.equal(reopened.entry.record.result.points[0].gapFte,6);
  if(existing)assert.deepEqual(store.getSnapshot().data.workspaces[id].fields.priorPlan,prior);
 }
});

test('closing an edited demo confirms discard, cancel preserves draft and successful close calls owner',()=>{
 const hook=sessionHarness(),draft={...syntheticCapacityDraft(),volume:'1600'};
 hook('goal:').setCapacitySession({draft,result:null,cost:null,error:'',scope:null,capture:null});
 const exports={},code=ts.transpileModule(fs.readFileSync(new URL('../components/synthetic-capacity-risk-scenario.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 let accepted=false,closed=0,asked=0;
 vm.runInNewContext(code,{exports,window:{confirm:()=>{asked++;return accepted;}},require:name=>name==='@/lib/synthetic-capacity-risk'?{syntheticCapacityDraft}:name==='./workforce-planning/planning-session-context'?{usePlanningSession:()=>({goalKey:'goal:'}),useCapacitySessionState:hook,PlanningSessionProvider:()=>null}:name==='./workforce-planning/capacity-workspace'?{CapacityWorkspace:()=>null}:require(name)});
 const tree=exports.SyntheticCapacityRiskScenario({onClose:()=>closed++}),button=tree.props.children[0];
 assert.equal(button.props.children,'Close demo workload');button.props.onClick();assert.equal(asked,1);assert.equal(closed,0);assert.deepEqual(hook('goal:').capacitySession.draft,draft);
 accepted=true;button.props.onClick();assert.equal(closed,1);
});

test('overview reset closes the demo before resetting conversation and returns focus',()=>{
 const source=fs.readFileSync(new URL('../components/pages/overall-overview-page.tsx',import.meta.url),'utf8');
 const body=source.match(/function resetHomeConversation\(\)\{([\s\S]*?)\n  \}/)[1],events=[];
 vm.runInNewContext(body,{setSyntheticRiskContext:value=>events.push(['demo',value]),setRiskRequest:value=>events.push(['risk',value]),conversation:{resetConversation:()=>events.push(['reset'])},requestAnimationFrame:fn=>fn(),composer:{current:{focus:()=>events.push(['focus'])}}});
 assert.deepEqual(events,[['demo',null],['risk',null],['reset'],['focus']]);
});

test('demo close focuses the risk heading before falling back to the workspace',()=>{
 const source=fs.readFileSync(new URL('../components/pages/overall-overview-page.tsx',import.meta.url),'utf8');
 const body=source.match(/<SyntheticCapacityRiskScenario onClose=\{\(\)=>\{([\s\S]*?)\}\}\/>/)[1];
 const code=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const hasRisk of [true,false]){
  const events=[];
  vm.runInNewContext(code,{setSyntheticRiskContext:value=>events.push(['close',value]),requestAnimationFrame:fn=>fn(),document:{querySelector:selector=>{events.push(['query',selector]);return selector.includes('Workforce risks')?(hasRisk?{focus:()=>events.push(['focus','risk'])}:null):{focus:()=>events.push(['focus','workspace'])};}}});
  assert.deepEqual(events[0],['close',null]);assert.deepEqual(events[1],['query','[aria-label="Workforce risks"] h3']);assert.deepEqual(events.at(-1),['focus',hasRisk?'risk':'workspace']);assert.equal(events.filter(e=>e[0]==='query').length,hasRisk?1:2);
 }
});
