import test from 'node:test';import assert from 'node:assert/strict';
import * as lab from '../lib/fow-lab-reference.ts';
import catalog from '../data/fow-lab-reference-catalog.json' with {type:'json'};
import {DecisionStore,encodeDecisions} from '../lib/local-decisions.ts';
const at='2026-10-28T05:00:00.000Z',goal='Explore work redesign',job=catalog.jobs[0];
function setup(activeId='a'){
 let raw=encodeDecisions({version:1,revision:1,goals:{version:1,activeId,goals:[{id:'a',statement:goal},{id:'b',statement:'Other goal'}]},workspaces:{a:{savedAt:at,fields:{capacity:{fte:'0',volume:'',confirmed:false},marketCarry:{soc:'15-1252',area:'99',goal},evidence:[{page:'home',capturedAt:at,schemaVersion:1,evidence:{keep:true}}]}},b:{savedAt:at,fields:{savedPlan:{keep:true}}}}}),fail=false;
 const port={getItem:()=>raw,setItem:(_,value)=>{if(fail)throw Error('Storage blocked');raw=value;},removeItem:()=>{}};
 const store=new DecisionStore();store.initialize(port);
 const context={goalId:'a',goal,datasetToken:store.getDatasetToken()};
 return {store,port,context,raw:()=>raw,fail:()=>{fail=true;},change:()=>{raw+=' ';},save:(selection,revision=store.getSnapshot().data.revision)=>lab.saveFoWLabReference({store,...context,revision,selection,at})};
}
test('canonical reference keeps Lab provenance separate and validates exact function/job relationships',()=>{
 const all=lab.canonicalFoWLabReference({}),selected=lab.canonicalFoWLabReference({jobKey:job.job_key,sourceCommit:'forged',fte:100});
 assert.equal(all.source.dataset.id,'builtin');assert.equal(all.source.dataset.headcount,10000);assert.equal(all.source.functionCount,15);assert.equal(all.source.sourceCommit,'295fe31e511d708e2261947a17a96f29257a3f65');assert.equal(all.source.dataset.asOf,'2026-09-30');
 assert.equal(selected.selection.functionName,job.function_name);assert.equal(selected.selection.jobTitle,job.title);assert.equal(selected.selection.jobKey,job.job_key);assert.equal(all.selection.jobKey,null);assert.equal(all.selection.functionName,null);
 assert.doesNotMatch(JSON.stringify(selected),/forged|"fte"|"capacity"|exposure_score|labor_cost/);
 assert.deepEqual(lab.canonicalFoWLabReference({functionName:'',jobKey:''}),all);
 for(const selection of [null,[],{jobKey:'unknown'},{functionName:'unknown'},{functionName:0},{jobKey:0},{jobKey:job.job_key,functionName:catalog.functions.find(x=>x.function_name!==job.function_name).function_name}])assert.throws(()=>lab.canonicalFoWLabReference(selection));
});
test('explicit save/reload retains all previous fields, unknown/zero inputs and other goals; duplicate clicks are no-ops',()=>{
 const h=setup(),before=structuredClone(h.store.getSnapshot().data.workspaces);assert.equal(h.save({jobKey:job.job_key}),2);assert.equal(h.save({jobKey:job.job_key}),2);
 const fields=h.store.getSnapshot().data.workspaces.a.fields;assert.deepEqual(fields.capacity,before.a.fields.capacity);assert.deepEqual(fields.marketCarry,before.a.fields.marketCarry);assert.deepEqual(h.store.getSnapshot().data.workspaces.b,before.b);assert.deepEqual(fields.evidence[0],before.a.fields.evidence[0]);assert.equal(fields.evidence.length,2);
 const reloaded=new DecisionStore();reloaded.initialize(h.port);const record=lab.readFoWLabReference(reloaded.getField('a',lab.fowLabReferenceField,null),h.context);assert.equal(record.selection.jobKey,job.job_key);assert.equal(record.destinationDatasetToken,h.context.datasetToken);assert.equal(record.source.dataset.id,'builtin');
 assert.equal(h.save({functionName:job.function_name}),3);assert.equal(h.store.getField('a','evidence',[]).length,3);
});
test('removal persists while preserving history and saved capacity',()=>{
 const h=setup();h.save({});const history=structuredClone(h.store.getField('a','evidence',[]));h.save(null);assert.equal(h.save(null),3);assert.deepEqual(h.store.getField('a','evidence',[]),history);assert.deepEqual(h.store.getField('a','capacity',null),{fte:'0',volume:'',confirmed:false});
 const reloaded=new DecisionStore();reloaded.initialize(h.port);assert.equal(reloaded.getSnapshot().data.workspaces.a.fields[lab.fowLabReferenceField],null);
});
test('stale goal, revision, dataset, absent goal and unknown selection never publish a reference',()=>{
 for(const mode of ['goal','revision','dataset','absent','selection']){
  const h=setup(),raw=h.raw();assert.throws(()=>lab.saveFoWLabReference({store:h.store,...h.context,goal:mode==='goal'?'Changed':goal,goalId:mode==='absent'?'':'a',datasetToken:mode==='dataset'?'builtin':h.context.datasetToken,revision:mode==='revision'?0:1,selection:mode==='selection'?{jobKey:'bad'}:{},at}));assert.equal(h.raw(),raw);
 }
 const h=setup('b'),raw=h.raw();assert.throws(()=>h.save({}));assert.equal(h.raw(),raw);
});
test('failed writes and backing-store conflicts preserve saved values, including repeated identical carry',()=>{
 for(const mode of ['write','conflict','duplicate']){const h=setup();h.save({});const before=structuredClone(h.store.getSnapshot().data);if(mode==='write')h.fail();else h.change();const raw=h.raw();assert.throws(()=>h.save(mode==='duplicate'?{}:{jobKey:job.job_key}));assert.equal(h.raw(),raw);assert.deepEqual(h.store.getSnapshot().data,before);}
});
test('saved reader rejects tampering and older snapshots without silently upgrading or cross-goal reuse',()=>{
 const h=setup();h.save({jobKey:job.job_key});const record=h.store.getField('a',lab.fowLabReferenceField,null),before=JSON.stringify(record);
 assert.ok(lab.readFoWLabReference(record,h.context));
 for(const edited of [{...record,version:2},{...record,source:{...record.source,sourceCommit:'old'}},{...record,source:{...record.source,dataset:{...record.source.dataset,headcount:9037}}},{...record,selection:{...record.selection,jobTitle:'Forged'}}])assert.equal(lab.readFoWLabReference(edited,h.context),null);
 assert.equal(lab.readFoWLabReference(record,{...h.context,goalId:'b'}),null);assert.equal(lab.readFoWLabReference(record,{...h.context,datasetToken:'other'}),null);assert.equal(JSON.stringify(record),before);
});

import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';import * as React from 'react';
const require=createRequire(import.meta.url);
function ui(h){let states=[],index=0;const exports={},navigations=[];const code=ts.transpileModule(fs.readFileSync(new URL('../components/fow-lab-reference.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,Date,require:name=>name==='react'?{...React,useState:initial=>{const i=index++;if(states[i]===undefined)states[i]=initial;return [states[i],value=>{states[i]=value;}];},useSyncExternalStore:()=>h.context.datasetToken}:name==='./decision-store'?{decisionStore:h.store,useDecisionStorage:()=>h.store.getSnapshot()}:name==='@/lib/dataset-client.mjs'?{datasetSession:{}}:name==='@/lib/fow-lab-reference'?lab:require(name)});
 return {render:(saved=false)=>{index=0;return saved?exports.SavedFoWLabReference({}):exports.FoWLabReferenceHandoff({jobKey:job.job_key,onNavigate:page=>navigations.push(page)});},navigations};
}
function nodes(tree){if(!tree||typeof tree!=='object')return [];return [tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];}
test('UI requires an explicit save, missing goal routes Overview, and repeated click does not overwrite inputs',()=>{
 const absent=setup(''),missing=ui(absent),before=absent.raw(),button=nodes(missing.render()).find(n=>n.type==='button');assert.equal(button.props.children,'Select a goal on Overview');button.props.onClick();assert.deepEqual(missing.navigations,['home']);assert.equal(absent.raw(),before);
 const h=setup(),view=ui(h);assert.equal(h.store.getSnapshot().data.revision,1);nodes(view.render()).find(n=>n.type==='button').props.onClick();assert.deepEqual(view.navigations,['planning-overview']);assert.equal(h.store.getSnapshot().data.revision,2);nodes(view.render()).find(n=>n.type==='button').props.onClick();assert.equal(h.store.getSnapshot().data.revision,2);
 const strip=view.render(true);assert.equal(strip.props['aria-label'],'Saved FoW Lab reference');nodes(strip).find(n=>n.type==='button').props.onClick();assert.equal(h.store.getSnapshot().data.workspaces.a.fields[lab.fowLabReferenceField],null);
});
