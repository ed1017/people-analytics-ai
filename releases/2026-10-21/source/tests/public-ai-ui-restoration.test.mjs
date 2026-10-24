import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {PUBLIC_AI_ROUTES} from '../lib/public-ai-capabilities.mjs';
import {createPublicAiReadiness} from '../lib/public-ai-readiness-client.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {actionBinding,actionBindingKey} from '../lib/home-action-drafts.ts';
import {publicAiRecipe,publicHomeSourceVersion,retainPublicAiRecipes,capturePublicWorkingRecipes,publicSolutionEnvelope,publicPlanEnvelope,selectedPublicObjectiveState,publicAiEvidenceField} from '../lib/public-ai-evidence-client.mjs';
import {DecisionStore} from '../lib/local-decisions.ts';
import {emptySolutionState,evaluateSolutionCandidate,readSolutionState,resolveSolutionMetric} from '../lib/home-solution-conversation.ts';
import {calculateHeadcountProjection,projectionDigest} from '../lib/home-solution-projection.ts';
import {currentPublicProjectionForDisplay} from '../lib/public-projection-currentness-client.mjs';
import {HomeProjectionSelection} from '../lib/home-projection-selection.ts';

const digest='a'.repeat(64),filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels';
const source={datasetId:P.datasetId,datasetToken:P.token,publicDigest:digest,cutoff:P.cutoff,provenance:'approved-public-projection-v1',contract:P.contract,publicationReceiptId:P.approval};
const goal={id:'saved-goal',statement:'Review an explicit staffing assumption'};
const data={data_meta:public9037Metadata(digest),overview:{headcount:12,snapshot_date:P.cutoff},trend:[{snapshot_date:P.cutoff,headcount:12,fte:12}],workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:filters,effective:filters,label:scope,basis:'Invented fixture',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'}};
const pack=buildHomePack({dashboard:{status:'loaded',data}},scope);
function session(){
 let token=P.token;const listeners=new Set();
 return {snapshot:()=>token,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},change:value=>{token=value;for(const fn of listeners)fn();}};
}
const response=(value,token=P.token)=>Response.json(value,{headers:{'x-workforce-dataset':token}});
const ready=()=>({version:2,datasetToken:P.token,status:'configured',expiresAt:new Date(Date.now()+20000).toISOString(),routes:[...PUBLIC_AI_ROUTES]});
test('configuration status states submit-time budget checks only for configured public routes',()=>{
 const require=createRequire(import.meta.url);
 const js=ts.transpileModule(fs.readFileSync(new URL('../components/public-ai-configuration-status.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
 for(const route of PUBLIC_AI_ROUTES)for(const enabled of [false,true])for(const configured of [false,true])for(const token of [P.token,'legacy-v1:0']){
  const exports={};
  vm.runInNewContext(js,{exports,require:name=>name==='@/lib/public-ai-capabilities.mjs'?{PUBLIC_AI_ENABLED:enabled}:name==='@/lib/public-9037-contract.mjs'?{PUBLIC_9037:P}:name==='@/lib/dataset-client.mjs'?{datasetSession:{snapshot:()=>token}}:name==='./use-public-ai-readiness'?{usePublicAiReadiness:r=>{assert.equal(r,route);return configured;}}:require(name)});
  const markup=renderToStaticMarkup(React.createElement(exports.PublicAiConfigurationStatus,{route}));
  if(enabled&&configured&&token===P.token)assert.match(markup,/AI configured[\s\S]*Budget and provider availability are checked when you submit\./);
  else assert.equal(markup,'');
 }
});
test('explicit disabled gate performs no read; readiness requires all routes and current identity',async()=>{
 const s=session();let calls=0;
 const off=createPublicAiReadiness({enabled:false,session:s,transport:()=>{calls++;throw Error('No call');}});
 await off.refresh();assert.equal(calls,0);assert.equal(off.available('/api/chat'),false);off.dispose();
 const store=createPublicAiReadiness({enabled:true,session:s,transport:async(path,init)=>{calls++;assert.equal(path,'/api/public-ai-capabilities');assert.equal(init.method,'GET');assert.equal(init.headers['x-workforce-dataset'],P.token);return response(ready());}});
 try{await store.refresh();for(const route of PUBLIC_AI_ROUTES)assert.equal(store.available(route),true);assert.equal(store.available('/api/private'),false);s.change('pending:'+P.token);assert.equal(store.available('/api/chat'),false);}
 finally{store.dispose();}
});
test('malformed, expired, partial and unversioned readiness do not enable AI',async()=>{
 for(const mutate of [v=>({...v,version:1,status:'ready'}),v=>({...v,status:'ready'}),v=>({...v,expiresAt:new Date(Date.now()-1).toISOString()}),v=>({...v,routes:v.routes.slice(0,1)}),v=>({...v,hidden:true}),v=>({...v,status:'unavailable'})]){
  const store=createPublicAiReadiness({enabled:true,session:session(),transport:async()=>response(mutate(ready()))});
  await store.refresh();assert.equal(store.available('/api/chat'),false);store.dispose();
 }
 const store=createPublicAiReadiness({enabled:true,session:session(),transport:async()=>Response.json(ready())});
 await store.refresh();assert.equal(store.available('/api/chat'),false);store.dispose();
});
test('same-session readiness can expire and recover through an explicit safe read',async()=>{
 let clock=Date.now(),calls=0;
 const store=createPublicAiReadiness({enabled:true,session:session(),now:()=>clock,transport:async()=>{calls++;return response({...ready(),expiresAt:new Date(clock+20000).toISOString()});}});
 try{
  await store.refresh();assert.equal(store.available('/api/chat'),true);
  clock+=21000;assert.equal(store.available('/api/chat'),false);
  await store.refresh();assert.equal(store.available('/api/chat'),true);assert.equal(calls,2);
 }finally{store.dispose();}
});
test('late readiness and ignored cancellation cannot enable a different session',async()=>{
 const s=session();let release;
 const store=createPublicAiReadiness({enabled:true,session:s,transport:()=>new Promise(resolve=>{release=resolve;}),timeoutMs:20});
 const pending=store.refresh();s.change('pending:'+P.token);release(response(ready()));await pending;assert.equal(store.available('/api/chat'),false);store.dispose();
 let signal;const hung=createPublicAiReadiness({enabled:true,session:session(),timeoutMs:10,transport:(_,init)=>{signal=init.signal;return new Promise(()=>{});}});
 await hung.refresh();assert.equal(signal.aborted,true);assert.equal(hung.available('/api/chat'),false);hung.dispose();
});
test('response arriving after the readiness timeout cancels its unread stalled body',async()=>{
 let release,cancelled=false;
 const store=createPublicAiReadiness({enabled:true,session:session(),timeoutMs:5,transport:()=>new Promise(resolve=>{release=resolve;})});
 await store.refresh();
 release(new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'x-workforce-dataset':P.token}}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(cancelled,true);assert.equal(store.available('/api/chat'),false);store.dispose();
});
test('public source version comes only from matching public response metadata',()=>{
 assert.deepEqual(publicHomeSourceVersion({dashboard:{status:'loaded',data}}),source);
 assert.equal(publicHomeSourceVersion({dashboard:{status:'loaded',data},other:{status:'loaded',data:{data_meta:{...data.data_meta,bundleDigest:'b'.repeat(64)}}}}),null);
 assert.equal(publicHomeSourceVersion({dashboard:{status:'loaded',data:{overview:{headcount:9037}}}}),null);
});
async function fixture(named=true){
 const g=named?goal:{id:'',statement:''},constraints=[];
 const request={goal:g,scope,filters,evidence:pack,state:{constraints,working:[]},catalog:null};
 const effective=named?goal:{id:'exploration',statement:'Explore staffing without adopting a goal'};
 const item={constraints,candidate:{goal:{statement:effective.statement}},binding:await actionBinding(effective.id,effective.statement,pack,{scope,constraints})};
 const state={constraints,working:[item]};
 return {request,item,state};
}
test('generation, revised constraints, reload and plan envelope retain exact existing bindings',async()=>{
 const f=await fixture(),before=JSON.stringify(f);
 let recipes=await capturePublicWorkingRecipes(f.request,f.state,source,undefined);
 const envelope=await publicSolutionEnvelope({...f.request,state:f.state},source,recipes);
 assert.equal(envelope.request.state.working[0].binding.evidenceDigest,f.item.binding.evidenceDigest);
 assert.equal(JSON.stringify(f),before);
 const revised=structuredClone(f.item);revised.constraints=[{kind:'fixture-assumption',value:2}];
 revised.binding=await actionBinding(goal.id,goal.statement,pack,{scope,constraints:revised.constraints});
 recipes=await capturePublicWorkingRecipes(f.request,{working:[revised]},source,recipes);
 assert.equal(recipes.length,2);
 const restored=JSON.parse(JSON.stringify(recipes));
 const planRequest={requestId:'plan-action',context:{goalId:goal.id,goal:goal.statement},selectedId:'plan-one',comparisonIds:['plan-two']};
 const plan=await publicPlanEnvelope(planRequest,restored,revised.binding);
 assert.deepEqual(plan.request,planRequest);assert.deepEqual(plan.current.planningInputs,{scope,constraints:revised.constraints});
 const current=await publicSolutionEnvelope({...f.request,state:{constraints:[],working:[f.item,revised]}},source,restored);
 assert.equal(current.previous.length,1);
});
test('missing recipes, changed planning inputs and different goal never manufacture current evidence',async()=>{
 const f=await fixture(),recipes=await capturePublicWorkingRecipes(f.request,f.state,source,undefined);
 const changedRequest={...f.request,state:{...f.state,constraints:[{value:7}]}};
 await assert.rejects(publicSolutionEnvelope(changedRequest,source,[]));
 const changed=structuredClone(recipes);changed[0].planningInputs={scope,constraints:[{value:99}]};
 await assert.rejects(publicSolutionEnvelope(changedRequest,source,changed));
 await assert.rejects(publicPlanEnvelope({context:{goalId:'other',goal:goal.statement}},recipes,f.item.binding));
 assert.throws(()=>retainPublicAiRecipes([],Array.from({length:17},()=>recipes[0])));
 assert.equal(actionBindingKey(f.item.binding),actionBindingKey(await actionBinding(goal.id,goal.statement,pack,{scope,constraints:[]})));
});
test('exploration replay preserves blank request goal; pinning requires an explicit new binding',async()=>{
 const f=await fixture(false),recipes=await capturePublicWorkingRecipes(f.request,f.state,source,undefined);
 assert.equal(recipes[0].goal.id,'exploration');assert.equal(f.request.goal.id,'');
 const envelope=await publicSolutionEnvelope({...f.request,state:f.state},source,recipes);
 assert.deepEqual(envelope.current.goal,{id:'',statement:''});assert.equal(envelope.previous[0].goal.statement,f.item.binding.goal);
 const pinned=structuredClone(f.item);pinned.binding=await actionBinding(goal.id,goal.statement,pack,{scope,constraints:[]});
 const next=await capturePublicWorkingRecipes({...f.request,goal},{working:[pinned]},source,recipes);
 assert.equal(next.length,2);assert.equal(next[0].goal.id,'exploration');assert.equal(next[1].goal.id,goal.id);
});
test('pinning one of two exploration objectives preserves original work through real store reload and next-turn replay',async()=>{
 const f=await fixture(false),other=structuredClone(f.item);
 other.candidate.goal.statement='Explore a different staffing objective';
 other.binding=await actionBinding('exploration',other.candidate.goal.statement,pack,{scope,constraints:[]});
 f.state.working.push(other);
 const recipes=await capturePublicWorkingRecipes(f.request,f.state,source,undefined),original=structuredClone(f.state);
 const values=new Map(),port={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const store=new DecisionStore(P.token);store.initialize(port);
 store.commitExplorationFields(store.getSnapshot().data.revision,'2026-10-20T16:00:00.000Z',()=>({state:f.state,[publicAiEvidenceField]:recipes}));
 const selected=selectedPublicObjectiveState(f.state,f.item.binding.goal);
 for(const candidate of selected.working)candidate.binding={...candidate.binding,goalId:goal.id,goal:goal.statement};
 const pinnedRecipes=await capturePublicWorkingRecipes({...f.request,goal},selected,source,recipes);
 store.commitGoalSelection(goal.id,goal.statement,store.getSnapshot().data.revision,'2026-10-20T16:00:01.000Z',()=>({state:selected,[publicAiEvidenceField]:pinnedRecipes}),false,true);
 const restored=new DecisionStore(P.token);restored.initialize(port);
 assert.deepEqual(restored.getSnapshot().data.exploration.fields.state,original);
 assert.deepEqual(restored.getSnapshot().data.exploration.fields[publicAiEvidenceField],recipes);
 const named=restored.getSnapshot().data.workspaces[goal.id].fields;
 assert.equal(named.state.working.length,1);
 const next=await publicSolutionEnvelope({...f.request,goal,state:named.state},source,named[publicAiEvidenceField]);
 assert.equal(next.request.state.working[0].binding.goalId,goal.id);
 assert.equal(next.previous.some(recipe=>recipe.goal.id==='exploration'),false);
 await publicSolutionEnvelope({...f.request,state:original},source,recipes);
});
test('selected objective deserializes with checked metrics after excluding another evaluated candidate',async()=>{
 const request={version:1,requestId:'evaluated-request',goal:{id:'',statement:''},scope,filters,timeZone:'UTC',evidence:pack,goalContext:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'evaluated-message',text:'Explore two possible coordination goals.'}};
 const candidate=(id,statement)=>({goal:{statement,turnId:request.message.id},id,base:null,name:id,objective:statement,approach:'Review a proposed coordination activity.',rationale:'A fictional planning fixture.',tradeoffs:['Effects remain unverified.'],nextStep:'Review the activity.',successMeasure:'Agree a measure.',activities:[{id:'c1',mode:'new',source:null,name:'Coordination',domain:'execution',step:'Propose a coordination session.',ownerRole:'Team lead',evidenceIds:[],dependsOn:[],audienceOf:null,limitation:'Fictional assumption.'}],quantities:[]});
 const kept=await evaluateSolutionCandidate(request,candidate('kept','Coordinate one team'),[]);
 const other=await evaluateSolutionCandidate(request,candidate('other','Coordinate another team'),[]);
 assert.ok(kept.result);assert.ok(other.result);assert.deepEqual(kept.blocking,[]);assert.deepEqual(other.blocking,[]);
 const projected=await projection(),metric=item=>({kind:'candidate',id:item.id,revision:item.revision,metric:'participants'});
 const original=readSolutionState({...emptySolutionState(),working:[kept,other],focusCandidateId:other.id,analyses:[projected.item],verifiedMetrics:[metric(kept),metric(other),{kind:'projection',id:projected.item.id,revision:projected.item.revision,metric:'closing_headcount'}]});
 const before=structuredClone(original),selected=selectedPublicObjectiveState(original,kept.binding.goal);
 const restored=readSolutionState(JSON.parse(JSON.stringify(selected)));
 assert.deepEqual(original,before);assert.equal(restored.focusCandidateId,null);
 assert.equal(restored.verifiedMetrics.length,2);
 for(const ref of restored.verifiedMetrics)assert.ok(resolveSolutionMetric(restored,ref));
 assert.equal(restored.analyses.length,1);
 const recipes=await capturePublicWorkingRecipes(request,original,source,undefined);
 await publicSolutionEnvelope({...request,state:restored},source,recipes);
 const mismatched=selectedPublicObjectiveState({...original,verifiedMetrics:[{...metric(kept),revision:kept.revision+1}]},kept.binding.goal);
 assert.deepEqual(mismatched.verifiedMetrics,[]);
});
async function projection(){
 const inputs={asOf:P.cutoff,opening:9037,filters,scope,relations:['public-dashboard'],datasetVersion:source,defaults:null,baseline:[]};
 const item=await calculateHeadcountProjection({id:'public-view',base:null,method:'monthly_flow',months:1,changes:[['monthly_hires',20],['monthly_exits',10]].map(([field,value])=>({field,kind:'literal',value,basis:'illustrative',turnId:null,interpretation:'Explicit fixture assumption'}))},inputs,[],[]);
 const receipt={version:1,provenance:'approved-public-projection-read',datasetToken:P.token,checkedAt:new Date().toISOString(),inputs,inputDigest:await projectionDigest(inputs)};
 return {inputs,item,receipt};
}
test('public projection display retains exact goal, revision, filters, inputs and provenance',async()=>{
 const f=await projection(),args={selection:{goalId:goal.id,goalStatement:goal.statement,id:f.item.id,revision:f.item.revision},activeGoal:goal,analyses:[f.item],receipt:f.receipt,filters,datasetToken:P.token,isCurrent:()=>true};
 assert.equal((await currentPublicProjectionForDisplay(args)).points[0].headcount,9047);
 for(const change of [{activeGoal:{...goal,statement:'other'}},{filters:{...filters,country:'US'}},{receipt:{...f.receipt,provenance:'legacy-live-source-read'}},{receipt:{...f.receipt,inputs:{...f.inputs,opening:10}}},{isCurrent:()=>false}])await assert.rejects(currentPublicProjectionForDisplay({...args,...change}));
});
test('projection selection rejects delayed replies after a goal change',async()=>{
 const f=await projection();let release,context={key:'one',enabled:true,goal,datasetToken:P.token,filters,analyses:[f.item],snapshot:{asOf:P.cutoff,headcount:9037}};
 const selection=new HomeProjectionSelection(()=>context,()=>new Promise(resolve=>{release=resolve;}));
 const pending=selection.show(f.item.id,f.item.revision);
 context={...context,key:'two',goal:{...goal,statement:'Other'}};selection.invalidate();release(response(f.receipt));await pending;
 assert.equal(selection.snapshot().status,'unavailable');assert.equal(selection.snapshot().value,null);
});

test('readiness distinguishes pending configuration from a failed read',async()=>{let finish;const store=createPublicAiReadiness({enabled:true,session:session(),transport:()=>new Promise(resolve=>finish=resolve)});assert.equal(store.status(),'checking');const pending=store.refresh();assert.equal(store.status(),'checking');finish(new Response('',{status:503}));await pending;assert.equal(store.status(),'unavailable');assert.equal(store.available('/api/home-solution-conversation'),false);store.dispose();});

test('valid unavailable receipt and invalidation do not claim a request is pending',async()=>{const store=createPublicAiReadiness({enabled:true,session:session(),transport:async()=>response({...ready(),status:'unavailable',routes:[]})});await store.refresh();assert.equal(store.status(),'unavailable');store.invalidate();assert.equal(store.status(),'unavailable');store.dispose();});
