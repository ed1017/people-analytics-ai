import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HomeProjectionSelection} from '../lib/home-projection-selection.ts';
import {calculateHeadcountProjection} from '../lib/home-solution-projection.ts';
import {createProjectionCurrentnessReceipt} from '../lib/home-projection-currentness.ts';
import * as scope from '../lib/dashboard-scope.ts';
import {projectionInputs,projectionSpec} from './fixtures/home-solution-conversation.mjs';
const filters={country:'all',org:'all',level:'all'};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function fixture(){
  const inputs=projectionInputs(),analysis=await calculateHeadcountProjection(projectionSpec(),inputs,[],[]);
  const receipt=await createProjectionCurrentnessReceipt(inputs,'legacy-v1:0',filters);
  const context={key:'goal-a/workspace-1',enabled:true,goal:{id:'a',statement:'Review workforce'},datasetToken:'legacy-v1:0',filters,analyses:[analysis],snapshot:{asOf:inputs.asOf,headcount:inputs.opening}};
  return {analysis,receipt,context};
}
test('nothing is selected or fetched until an exact valid revision is explicitly chosen',async()=>{
  const f=await fixture(),calls=[];
  const selector=new HomeProjectionSelection(()=>f.context,async(url,init)=>{calls.push({url,init});return Response.json(f.receipt);});
  assert.equal(selector.snapshot().requested,false);assert.equal(calls.length,0);
  await selector.show('missing',1);await selector.show(f.analysis.id,99);assert.equal(calls.length,0);
  await selector.show(f.analysis.id,f.analysis.revision);
  assert.equal(calls.length,1);assert.equal(calls[0].init.method,'GET');assert.equal(calls[0].init.cache,'no-store');
  assert.equal(calls[0].url,'/api/home-solution-conversation?country=all&org=all&level=all');
  assert.equal(selector.snapshot().status,'ready');assert.deepEqual(selector.snapshot().value.analysis,f.analysis);
  assert.equal(selector.snapshot().value.provenance,'legacy-live-source-read');assert.equal(selector.snapshot().value.analysis.inputs.datasetVersion,null);
});
test('new explicit selection supersedes an older in-flight completion and always reads afresh',async()=>{
  const f=await fixture(),first=deferred();let calls=0;
  const selector=new HomeProjectionSelection(()=>f.context,async()=>++calls===1?first.promise:Response.json(f.receipt));
  const old=selector.show(f.analysis.id,1);await selector.show(f.analysis.id,1);
  const ready=selector.snapshot();assert.equal(ready.status,'ready');
  first.resolve(Response.json({...f.receipt,inputDigest:'0'.repeat(64)}));await old;
  assert.equal(selector.snapshot(),ready);assert.equal(calls,2);
});
test('goal, recovery, filters, analysis, snapshot and dataset transitions discard pending and ready projections',async()=>{
  for(const name of ['goal','workspace-recovery','filters','analyses','snapshot','dataset','reset']){
    const f=await fixture(),response=deferred();let context=f.context;
    const selector=new HomeProjectionSelection(()=>context,async()=>response.promise);
    const pending=selector.show(f.analysis.id,1);context={...context,key:name};selector.invalidate();
    context=f.context; // A→B→A must not revive the pending result.
    response.resolve(Response.json(f.receipt));await pending;
    assert.equal(selector.snapshot().value,null,name);assert.equal(selector.snapshot().status,'unavailable',name);
  }
  const f=await fixture(),selector=new HomeProjectionSelection(()=>f.context,async()=>Response.json(f.receipt));
  await selector.show(f.analysis.id,1);selector.invalidate();assert.equal(selector.snapshot().value,null);
});
test('body completion is guarded and current dashboard opening must match the checked projection',async()=>{
  const f=await fixture(),body=deferred();let context=f.context;
  const selector=new HomeProjectionSelection(()=>context,async()=>({ok:true,json:()=>body.promise}));
  const pending=selector.show(f.analysis.id,1);await Promise.resolve();context={...context,enabled:false};selector.invalidate();body.resolve(f.receipt);await pending;
  assert.equal(selector.snapshot().value,null);
  for(const snapshot of [{asOf:f.context.snapshot.asOf,headcount:101},{asOf:'2026-09-30',headcount:100}]){
    const wrong=new HomeProjectionSelection(()=>({...f.context,snapshot}),async()=>Response.json(f.receipt));await wrong.show(f.analysis.id,1);assert.equal(wrong.snapshot().status,'unavailable');
  }
});
test('failed or mismatched source reads retain no projected values and no raw error text',async()=>{
  const f=await fixture();
  for(const read of [async()=>Response.json({}, {status:503}),async()=>{throw Error('PRIVATE');},async()=>Response.json({...f.receipt,inputDigest:'0'.repeat(64)})]){
    const selector=new HomeProjectionSelection(()=>f.context,read);await selector.show(f.analysis.id,1);assert.equal(selector.snapshot().status,'unavailable');assert.equal(selector.snapshot().value,null);assert.doesNotMatch(JSON.stringify(selector.snapshot()),/PRIVATE/);
  }
});
function load(file,require){const exports={};const source=fs.readFileSync(file,'utf8');vm.runInNewContext(ts.transpileModule(source,{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require});return exports;}
const jsx=await import('react/jsx-runtime');
const welcome=load('components/home-chat-welcome.tsx',name=>name==='react/jsx-runtime'?jsx:name==='@/lib/dashboard-scope'?scope:name.endsWith('.module.css')?{default:{projectionLine:'projection',historyLine:'recorded'}}:{});
test('summary shows same-period projected hires/departures, transfers and qualifications; mismatch falls back to history',async()=>{
  const f=await fixture();const props={overview:{snapshot_date:f.context.snapshot.asOf,headcount:100},receipt:{version:1,status:'verified_rpc',requested:filters,effective:filters},requested:filters,scopeLabel:'All workforce',loading:false,error:null,trend:[{snapshot_date:f.context.snapshot.asOf,headcount:100}],projection:{analysis:f.analysis,checkedAt:f.receipt.checkedAt,provenance:f.receipt.provenance}};
  const render=patch=>renderToStaticMarkup(React.createElement(welcome.HomeHeadcountSummary,{...props,...patch}));
  const html=render({});
  assert.equal((html.match(/class="projection"/g)||[]).length,3);
  const recordedY=html.match(/<circle[^>]*cy="([^"]+)"/)?.[1];
  const projectedY=html.match(/<line[^>]*y1="([^"]+)"[^>]*class="projection"/)?.[1];
  assert.ok(recordedY);assert.equal(projectedY,recordedY,'projection starts at the recorded opening height');
  const format=value=>value.toLocaleString(undefined,{maximumFractionDigits:2});
  const values=[...html.matchAll(/<dd>([^<]+)<\/dd>/g)].map(match=>match[1]);
  assert.deepEqual(values,[format(f.analysis.points.reduce((sum,row)=>sum+row.hires,0)),format(f.analysis.points.reduce((sum,row)=>sum+row.exits,0))]);
  assert.match(html,/2026-09.*2026-11/);assert.match(html,/Legacy live-source read/);assert.match(html,/not a trained forecast/);assert.match(html,/Projected transfers in: 0; out: 0/);
  for(const patch of [{projection:null,projectionStatus:'unavailable'},{overview:{...props.overview,headcount:101}},{requested:{...filters,country:'US'}}])assert.doesNotMatch(render(patch),/class="projection"/);
  const unavailable=render({projection:null,projectionStatus:'unavailable'});assert.match(unavailable,/Recorded synthetic headcount/);assert.match(unavailable,/Show on Home again/);
});
test('review action forwards the exact displayed ID/revision and does nothing automatically',async()=>{
  const f=await fixture(),sent=[];
  const review=load('components/home-solution-conversation-review.tsx',name=>name==='react/jsx-runtime'?jsx:name==='react'?React:{});
  const tree=review.SolutionProjectionChart({analysis:f.analysis,onShowOnHome:(...args)=>sent.push(args)});
  let action;function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(node.type==='button'&&node.props.children==='Show on Home')action=node;visit(node.props?.children);}visit(tree);
  assert.deepEqual(sent,[]);assert.ok(action);action.props.onClick();assert.deepEqual(sent,[[f.analysis.id,f.analysis.revision]]);
  action=null;visit(review.SolutionProjectionChart({analysis:f.analysis}));assert.equal(action,null);
});
test('explicit zero flows stay zero and scoped transfers are disclosed over the same horizon',async()=>{
  const scoped={...filters,country:'US'},inputs=projectionInputs(scoped);
  const changes=Object.entries({monthly_hires:0,monthly_exits:0,monthly_transfers_in:2,monthly_transfers_out:1}).map(([field,value])=>({field,kind:'literal',value,basis:'illustrative',turnId:null,interpretation:'Explicit offline fixture assumption'}));
  const analysis=await calculateHeadcountProjection({...projectionSpec('flows'),method:'monthly_flow',months:2,changes},inputs,[],[]);
  const receipt=await createProjectionCurrentnessReceipt(inputs,'legacy-v1:0',scoped);
  const context={key:'scoped',enabled:true,goal:{id:'a',statement:'Scope'},datasetToken:'legacy-v1:0',filters:scoped,analyses:[analysis],snapshot:{asOf:inputs.asOf,headcount:inputs.opening}};
  const selector=new HomeProjectionSelection(()=>context,async()=>Response.json(receipt));await selector.show('flows',1);
  assert.equal(selector.snapshot().status,'ready');
  const html=renderToStaticMarkup(React.createElement(welcome.HomeHeadcountSummary,{overview:{snapshot_date:inputs.asOf,headcount:inputs.opening},receipt:{version:1,status:'verified_rpc',effective:scoped},requested:scoped,scopeLabel:'US',loading:false,error:null,trend:[],projection:selector.snapshot().value}));
  assert.deepEqual([...html.matchAll(/<dd>([^<]+)<\/dd>/g)].map(match=>match[1]),['0','0']);
  assert.match(html,/Projected transfers in: 4; out: 2/);assert.match(html,/2026-09.*2026-10/);assert.match(html,/Illustrative assumption/);
  assert.match(html,/Recorded history unavailable/);assert.equal((html.match(/class="projection"/g)||[]).length,2);
});
test('UI uses dataset transport and synchronous store/dataset invalidation without persistence',()=>{
  const hook=fs.readFileSync('components/use-home-projection.ts','utf8'),page=fs.readFileSync('components/pages/overall-overview-page.tsx','utf8');
  assert.match(hook,/,datasetFetch\)/);assert.match(hook,/decisionStore.subscribe\(selection.invalidate\)/);assert.match(hook,/datasetSession.subscribe\(selection.invalidate\)/);assert.doesNotMatch(hook,/localStorage|commitGoal|setField/);
  assert.match(page,/conversation.workspaceKey,conversation.resetEpoch,conversation.storageReady/);
});
