import {verifySolutionEvidence} from '../lib/home-solution-grounding.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicHomeGroundingTestAdapter} from '../lib/public-home-grounding.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {answerEvidenceSeries} from '../lib/chat-evidence-series.ts';
import {turnoverChatReply} from '../lib/home-turnover-chat.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
const filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels',hostname='people-analytics-test-ed-56dc.vercel.app',digest='a'.repeat(64);
async function fixture(){
 const data={data_meta:public9037Metadata(digest),as_of:P.cutoff,summary:{total_turnover_ytd_pct:9},trend:[{month:'2026-08-01',monthly_turnover_pct:1},{month:'2026-09-01',monthly_turnover_pct:2}]};
 const pack=buildHomePack({attrition:{status:'loaded',data}},scope);
 const binding={router:{bootstrapToken:()=>P.token,current:()=>({datasetId:P.datasetId,token:P.token,digest,generation:P.generation})},handle:async()=>Response.json(data,{headers:{'x-workforce-dataset':P.token}})};
 const receipt=await createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:()=>binding}).verify({datasetToken:P.token,filters,scope,evidence:pack});
 const request={version:1,requestId:'test-request',goal:{id:'',statement:''},scope,filters,timeZone:'UTC',evidence:pack,goalContext:null,selectedId:null,catalog:null,state:{version:1,verifiedMetrics:[],turns:[],constraints:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null},message:{id:'test-message',text:'monthly turnover'}};
 return {pack,receipt,request,data};
}
const chart=(pack,receipt)=>answerEvidenceSeries(pack,receipt,'test','monthly turnover','Recorded monthly turnover [A1].');
test('issued public receipt supports synthetic turnover and chart; runtime remains model-free',async()=>{
 const {pack,receipt,request}=await fixture(),before=JSON.stringify(pack);
 assert.equal(receipt.sources.find(s=>s.id==='A1').basis,'synthetic-public-aggregate');
 assert.equal(receipt.sources.find(s=>s.id==='W1').basis,'unavailable');
 assert.equal(receipt.sources.find(s=>s.id==='I3').basis,'fictional-or-unverified-session-input');
 const result=chart(pack,receipt);assert.equal(result.length,1);assert.equal(result[0].synthetic,true);assert.deepEqual(result[0].points.map(p=>p.value),[1,2]);
 assert.match(turnoverChatReply(request,receipt).answer,/synthetic recorded aggregate/);
 const reply=await converseSolutions(request,{grounding:receipt,complete:()=>{throw Error('No provider');},loadProjection:()=>{throw Error('No projection');}},new AbortController().signal);
 assert.equal(reply.charts.length,1);assert.equal(reply.usage.modelRounds,0);assert.equal(JSON.stringify(pack),before);
});
test('wrong identity, basis, scope/date and altered packet refuse without consumer throw',async()=>{
 for(const mutate of [f=>f.receipt.datasetToken='wrong',f=>f.receipt.contract='wrong',f=>f.receipt.sources.find(s=>s.id==='A1').basis='database-backed-aggregate',f=>f.receipt.sources.find(s=>s.id==='A1').scope='wrong',f=>f.receipt.sources.find(s=>s.id==='A1').asOf='2026-08-01',f=>f.pack.sources.find(s=>s.id==='A1').facts.monthly[0].monthly_turnover_pct=99,f=>delete f.receipt.sources,f=>f.receipt=structuredClone(f.receipt)]){
  const f=await fixture();mutate(f);assert.deepEqual(chart(f.pack,f.receipt),[]);assert.match(turnoverChatReply(f.request,f.receipt).answer,/unknown/);
  await assert.rejects(converseSolutions(f.request,{grounding:f.receipt,complete:()=>{throw Error('No provider');}},new AbortController().signal));
 }
});
test('legacy aggregate receipt retains existing chart and answer behavior; missing receipt no throw',async()=>{
 const {pack,request}=await fixture();const a=pack.sources.find(s=>s.id==='A1');
 const legacy={datasetToken:'legacy-v1:0',packetSha256:'b'.repeat(64),sources:[{id:'A1',status:'loaded',basis:'database-backed-aggregate',scope:a.scope,asOf:a.date}]};
 assert.equal(chart(pack,legacy).length,1);assert.doesNotMatch(turnoverChatReply(request,legacy).answer,/synthetic/);
 assert.deepEqual(chart(pack,undefined),[]);assert.match(turnoverChatReply(request,{datasetToken:'legacy-v1:0',packetSha256:'b'.repeat(64)}).answer,/unknown/);
 assert.deepEqual(answerEvidenceSeries(pack,legacy,'test','headcount','[W1]'),[]);
});

test('public runtime and turnover reject a changed request filter or scope',async()=>{
 for(const key of ['scope','filters']){
  const f=await fixture();if(key==='scope')f.request.scope='Other scope';else f.request.filters={...filters,country:'US'};
  assert.match(turnoverChatReply(f.request,f.receipt).answer,/unknown/);
  await assert.rejects(converseSolutions(f.request,{grounding:f.receipt,complete:()=>{throw Error('No provider');}},new AbortController().signal));
 }
});

test('unchanged legacy verifier receipt is consumed by the same chart and turnover functions',async()=>{
 const {pack,request,data}=await fixture();
 const receipt=await verifySolutionEvidence(request,{datasetToken:'legacy-v1:0',read:async()=>({status:'loaded',data})},new AbortController().signal);
 assert.equal(receipt.sources.find(s=>s.id==='A1').basis,'database-backed-aggregate');
 assert.equal(chart(pack,receipt).length,1);assert.doesNotMatch(turnoverChatReply(request,receipt).answer,/synthetic/);
});
