import test from 'node:test';
import assert from 'node:assert/strict';
import {DecisionStore,DATASET_WORKSPACE_POINTER,datasetDecisionKey,hasSavedDatasetTransition} from '../lib/local-decisions.ts';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {isPublicProjectionVersion,isStoredPublicProjectionVersion} from '../lib/public-projection-contract.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
const old='workforce-demo-9037-public-aggregates-v1:2';
test('salary-basis revision isolates saves and retains original bytes across new writes/reload',()=>{
 const map=new Map(),port={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const previous=new DecisionStore(old);previous.initialize(port);previous.setField('','salary-basis',{annualBase:896531119.19,source:old});port.setItem(DATASET_WORKSPACE_POINTER,old);
 const retained=port.getItem(datasetDecisionKey(old));assert.ok(hasSavedDatasetTransition(port,P.token));
 const current=new DecisionStore(P.token);current.initialize(port);assert.equal(current.getSnapshot().data.exploration,undefined);
 current.setField('','salary-basis',{annualBase:773120585.33,source:P.token});assert.equal(port.getItem(datasetDecisionKey(old)),retained);
 const reopened=new DecisionStore(old);reopened.initialize(port);assert.equal(reopened.getSnapshot().data.exploration.fields['salary-basis'].annualBase,896531119.19);
});
test('historical version is readable but never current-source authority',()=>{
 const v={datasetId:'workforce-demo-9037-public-aggregates-v1',datasetToken:old,publicDigest:'8fb1249a03037058c816ae0066a101a7401b4e71a24f7ef031cde62c247524f1',cutoff:'2026-09-30',provenance:'approved-public-projection-v1',contract:'public-synthetic-aggregates-and-calculations-v1',publicationReceiptId:'edwin-public-synthetic-and-popup-2026-10-19'};
 assert.equal(isStoredPublicProjectionVersion(v),true);assert.equal(isPublicProjectionVersion(v),false);
 for(const patch of [{datasetToken:P.token},{publicationReceiptId:'invented'},{publicDigest:'bad'},{extra:true}])assert.equal(isStoredPublicProjectionVersion({...v,...patch}),false);
});
test('actual new binding rejects old request tokens and publishes revised coherent summaries',async()=>{
 const b=await loadPublic9037Binding({hostname:'www.ed-ai.app'});
 const stale=await b.handle(new Request('https://www.ed-ai.app/api/dashboard',{headers:{'x-workforce-dataset':old}}));assert.equal(stale.status,409);
 const response=await b.handle(new Request('https://www.ed-ai.app/api/dashboard',{headers:{'x-workforce-dataset':P.token}}));assert.equal(response.status,200);const d=await response.json();assert.equal(d.overview.headcount,9037);assert.equal(d.data_meta.datasetToken,P.token);assert.equal(b.router.current().digest,'b320608fd2edd49f838e9834cdcd13dea1a2cfc3167bdc84c5fbe487a4d0dc97');
});

test('historical calculated projection reopens unchanged but cannot seed a new calculation',async()=>{
 const {calculateHeadcountProjection,readHeadcountProjections}=await import('../lib/home-solution-projection.ts');
 const {loadPublicProjectionSource}=await import('../lib/public-projection-source.server.mjs');
 const source=await loadPublicProjectionSource({hostname:'www.ed-ai.app',production:true});
 const inputs=await source.projection({country:'all',org:'all',level:'all'});
 const spec={id:'preserved-history',base:null,method:'monthly_flow',months:3,changes:[['monthly_hires',20],['monthly_exits',10]].map(([field,value])=>({field,kind:'literal',value,basis:'illustrative',turnId:null,interpretation:'Explicit synthetic assumption.'}))};
 const p=await calculateHeadcountProjection(spec,inputs,[],[]);
 p.inputs.datasetVersion={...p.inputs.datasetVersion,datasetId:'workforce-demo-9037-public-aggregates-v1',datasetToken:old,publicationReceiptId:'edwin-public-synthetic-and-popup-2026-10-19',publicDigest:'8fb1249a03037058c816ae0066a101a7401b4e71a24f7ef031cde62c247524f1'};
 const before=JSON.stringify(p);assert.deepEqual(readHeadcountProjections([p]),[p]);assert.equal(JSON.stringify(p),before);
 await assert.rejects(calculateHeadcountProjection(spec,p.inputs,[],[]),/unavailable or invalid/);
 await assert.rejects(calculateHeadcountProjection({...spec,base:{id:p.id,revision:p.revision}},inputs,[p],[]),/binding changed/);
});

test('an already-open old tab refreshes to the higher generation without consuming mixed evidence',async()=>{
 const {DatasetSession}=await import('../lib/dataset-client.mjs');
 const s=new DatasetSession(old,{requireBootstrap:true});s.bootstrap(old);
 await assert.rejects(s.fetch('/api/dashboard',{},async()=>Response.json({salary:'must not consume'},{status:409,headers:{'x-workforce-dataset':P.token}})),/Dataset changed/);
 assert.equal(s.snapshot(),'pending:'+P.token);let prepared=null;s.bootstrap(P.token,t=>prepared=t);assert.equal(prepared,P.token);assert.equal(s.current(),P.token);
 s.bootstrap(old);assert.equal(s.current(),P.token);
});
