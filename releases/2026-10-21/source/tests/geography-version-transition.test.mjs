import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore,datasetDecisionKey,DATASET_WORKSPACE_POINTER,hasSavedDatasetTransition} from '../lib/local-decisions.ts';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {isPublicProjectionVersion,isStoredPublicProjectionVersion} from '../lib/public-projection-contract.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
const old='workforce-demo-9037-public-aggregates-v3:4';
test('geography saves preserve original country and pay basis without automatic rebinding',()=>{
 const map=new Map(),port={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const before=new DecisionStore(old);before.initialize(port);before.setField('','country-basis',{country:'US',headcount:896,annualBase:773120585.33});port.setItem(DATASET_WORKSPACE_POINTER,old);
 const bytes=port.getItem(datasetDecisionKey(old));assert.ok(hasSavedDatasetTransition(port,P.token));
 const next=new DecisionStore(P.token);next.initialize(port);assert.equal(next.getSnapshot().data.exploration,undefined);next.setField('','country-basis',{country:'US',headcount:2311,annualBase:773120585.33});
 assert.equal(port.getItem(datasetDecisionKey(old)),bytes);
 const reopened=new DecisionStore(old);reopened.initialize(port);assert.equal(reopened.getSnapshot().data.exploration.fields['country-basis'].headcount,896);
});
test('previous exact geography basis is read-only history, never fresh evidence',()=>{
 const v={datasetId:'workforce-demo-9037-public-aggregates-v3',datasetToken:old,publicDigest:'5918dc315d87bed5098c25405ca7c90b2d63ff277fdd41042901dbab6cbedf54',cutoff:'2026-09-30',provenance:'approved-public-projection-v1',contract:'public-synthetic-aggregates-and-calculations-v1',publicationReceiptId:'edwin-coordinated-synthetic-realism-2026-10-23'};
 assert.ok(isStoredPublicProjectionVersion(v));assert.equal(isPublicProjectionVersion(v),false);
 for(const patch of [{datasetToken:P.token},{publicDigest:'a'.repeat(64)},{cutoff:'2026-10-01'},{extra:true}])assert.equal(isStoredPublicProjectionVersion({...v,...patch}),false);
});
test('all ten revised country histories sum to company stock each month and stale tokens fail',async()=>{
 const b=await loadPublic9037Binding({hostname:'www.ed-ai.app'});
 assert.equal((await b.handle(new Request('https://www.ed-ai.app/api/dashboard',{headers:{'x-workforce-dataset':old}}))).status,409);
 const read=async q=>{const r=await b.handle(new Request('https://www.ed-ai.app/api/dashboard'+q,{headers:{'x-workforce-dataset':P.token}}));assert.equal(r.status,200);return r.json();};
 const company=await read(''),country=await Promise.all(company.filter_options.countries.map(c=>read('?country='+c.value)));
 for(let i=0;i<33;i++)assert.equal(country.reduce((n,d)=>n+d.trend[i].headcount,0),company.trend[i].headcount);
 assert.equal((await read('?country=US')).overview.headcount,2311);assert.equal((await read('?country=IN')).overview.headcount,2713);
});
