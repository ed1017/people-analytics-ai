import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack,homeDefinitions} from '../lib/home-pack.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {publicHomeSourceVersion,publicSolutionEnvelope,canRefreshPublicEvidence} from '../lib/public-ai-evidence-client.mjs';
import {HomeSourceRequests} from '../lib/home-source-client.ts';
import {SourceRequests} from '../lib/source-request-cache.ts';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const scope='All countries; All business units; All levels',filters={country:'all',org:'all',level:'all'};
const loaded=()=>({status:'loaded',data:{data_meta:public9037Metadata('a'.repeat(64)),overview:{headcount:12,snapshot_date:P.cutoff}}});
const request=results=>({goal:{id:'',statement:''},scope,filters,evidence:buildHomePack(results,scope),state:{working:[],constraints:[]}});
for(const status of ['timeout','unavailable'])test(`${status}: local examples cannot substitute for verified workforce evidence`,async()=>{
 const results=Object.fromEntries(homeDefinitions.map(d=>[d[1],{status,data:null}])),r=request(results),before=JSON.stringify(r);
 assert.ok(r.evidence.coverage.available>0);assert.equal(publicHomeSourceVersion(results),null);
 await assert.rejects(publicSolutionEnvelope(r,null,undefined),error=>canRefreshPublicEvidence(error)&&/Refresh evidence/.test(error.message)&&!/saved plan/.test(error.message));
 assert.equal(JSON.stringify(r),before);
});
test('mixed source publications fail closed and can be refreshed; partial valid retrieval remains supported',async()=>{
 const a=loaded(),b=loaded();b.data.data_meta.bundleDigest='b'.repeat(64);
 assert.equal(publicHomeSourceVersion({a,b}),null);
 const results={dashboard:a,workforce:{status:'timeout',data:null}},r=request(results);
 const envelope=await publicSolutionEnvelope(r,publicHomeSourceVersion(results),undefined);
 assert.equal(envelope.request,r);assert.equal(envelope.current.source.publicDigest,'a'.repeat(64));
});
test('explicit refresh invalidates failure cache and allows the unchanged request, without an AI retry',async()=>{
 let failed=true,reads=0;const load=async()=>{reads++;return failed?{status:'unavailable',data:null}:loaded();};
 const sources=new HomeSourceRequests(load,new SourceRequests(load),()=>0,()=>P.token);
 const first=await sources.read(''),r=request(first);await assert.rejects(publicSolutionEnvelope(r,publicHomeSourceVersion(first),undefined),canRefreshPublicEvidence);
 const count=reads;failed=false;await sources.read('');assert.equal(reads,count);
 sources.invalidate('');const recovered=await sources.read('');assert.ok(reads>count);
 const envelope=await publicSolutionEnvelope(r,publicHomeSourceVersion(recovered),undefined);assert.equal(envelope.request,r);
});
test('refresh classification never hides corrupt saved recipes or missing plan bindings',async()=>{
 const results={dashboard:loaded()},r=request(results),source=publicHomeSourceVersion(results);
 await assert.rejects(publicSolutionEnvelope(r,source,[{bad:true}]),error=>!canRefreshPublicEvidence(error));
 const bound={...r,state:{...r.state,working:[{binding:{goalId:'missing',goal:'Missing evidence',evidenceHash:'x',planningHash:'y'}}]}};
 await assert.rejects(publicSolutionEnvelope(bound,source,undefined),error=>!canRefreshPublicEvidence(error));
 assert.equal(canRefreshPublicEvidence(new Error('network failure')),false);
});
