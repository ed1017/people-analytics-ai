import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicHomeGroundingTestAdapter as createPublicHomeGrounding,PUBLIC_HOME_GROUNDING_ENABLED} from '../lib/public-home-grounding.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {verifySolutionEvidence} from '../lib/home-solution-grounding.mjs';
const hostname='people-analytics-test-ed-56dc.vercel.app',digest='a'.repeat(64),filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels';
function setup(){
 const data={data_meta:public9037Metadata(digest),overview:{headcount:12,snapshot_date:P.cutoff},trend:[{snapshot_date:P.cutoff,headcount:12,fte:10}],workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:filters,effective:filters,label:scope,basis:'Invented aggregate fixture',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'}};
 const pack=buildHomePack({dashboard:{status:'loaded',data}},scope);
 let calls=0,token=P.token;
 const binding={router:{bootstrapToken:()=>token,current:()=>({datasetId:P.datasetId,token,digest,generation:P.generation})},handle:async r=>{calls++;assert.equal(new URL(r.url).pathname+new URL(r.url).search,'/api/dashboard?country=all&org=all&level=all');return Response.json(data,{headers:{'x-workforce-dataset':P.token}});}};
 return {data,pack,binding,request:{datasetToken:P.token,filters,scope,evidence:pack},calls:()=>calls,setToken:v=>token=v};
}
test('disabled default reads nothing; enabled public verification leaves evidence and saved hash untouched',async()=>{
 assert.equal(PUBLIC_HOME_GROUNDING_ENABLED,false);const f=setup(),before=JSON.stringify(f.pack);
 await assert.rejects(createPublicHomeGrounding({loadPublicBinding:()=>{throw Error('must not read');}}).verify(f.request));
 const hash=await actionBinding('test-goal','Review workforce',f.pack,null);
 const result=await createPublicHomeGrounding({enabled:true,hostname,loadPublicBinding:async()=>f.binding}).verify(f.request);
 assert.equal(result.provenance,'synthetic-public-projection');assert.equal(result.databaseIntegrityCertified,false);assert.deepEqual(result.verifiedSourceIds,['W1']);assert.equal(result.datasetToken,P.token);assert.equal(f.calls(),1);
 assert.equal(JSON.stringify(f.pack),before);assert.deepEqual(await actionBinding('test-goal','Review workforce',f.pack,null),hash);
 await assert.rejects(verifySolutionEvidence({evidence:f.pack,filters,scope},{datasetToken:P.token,read:()=>{}},new AbortController().signal));
});
test('receipt extensions, changed facts/rows/scope, stale identity and private context fail closed',async()=>{
 const mutations=[
  f=>f.data.data_meta.extra='unapproved',f=>f.data.data_meta.bundleDigest='b'.repeat(64),
  f=>f.data.overview.headcount=13,f=>f.data.trend[0].headcount=13,
  f=>f.request.filters={...filters,country:'UK'},f=>f.setToken('legacy-v1:0'),
  f=>f.request.evidence={...f.pack,datasetContext:{datasetId:'private'}},
  f=>f.request.datasetToken='legacy-v1:0',
  f=>f.request.evidence.extra='must not be normalized away',
  f=>f.pack.sources.find(s=>s.id==='W1').facts.extra='must not be normalized away',
  f=>f.data.workforce_filter_scope.stockStatus='known-empty',
  f=>f.binding.router.current=()=>({datasetId:P.datasetId,token:P.token,digest,generation:3}),
 ];
 for(const mutate of mutations){const f=setup();mutate(f);await assert.rejects(createPublicHomeGrounding({enabled:true,hostname,loadPublicBinding:async()=>f.binding}).verify(f.request));}
});
test('load and reader stalls respect total deadline without late evidence acceptance',async()=>{
 for(const stall of ['load','read']){
  const f=setup();if(stall==='read')f.binding.handle=()=>new Promise(()=>{});
  const start=performance.now();
  await assert.rejects(createPublicHomeGrounding({enabled:true,hostname,timeoutMs:20,loadPublicBinding:()=>stall==='load'?new Promise(()=>{}):f.binding}).verify(f.request));
  assert.ok(performance.now()-start<1000);
 }
 const f=setup(),controller=new AbortController();controller.abort();
 await assert.rejects(createPublicHomeGrounding({enabled:true,hostname,loadPublicBinding:()=>f.binding}).verify(f.request,controller.signal));assert.equal(f.calls(),0);
});
