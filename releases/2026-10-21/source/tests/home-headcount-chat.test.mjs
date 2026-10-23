import test from 'node:test';import assert from 'node:assert/strict';
import {buildHomePack} from '../lib/home-pack.mjs';
import {createPublicHomeGroundingTestAdapter} from '../lib/public-home-grounding.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {headcountChatReply} from '../lib/home-headcount-chat.ts';
const filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels',digest='a'.repeat(64),hostname='people-analytics-test-ed-56dc.vercel.app';
async function fixture(change=()=>{}){
 const dashboard={data_meta:public9037Metadata(digest),overview:{snapshot_date:P.cutoff,headcount:30},trend:[{snapshot_date:'2026-07-31',headcount:10},{snapshot_date:'2026-08-31',headcount:20},{snapshot_date:'2026-09-30',headcount:30}],workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:filters,effective:filters,label:scope,basis:'Synthetic fixture',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'}};change(dashboard);
 const pack=buildHomePack({dashboard:{status:'loaded',data:dashboard}},scope,'How has our headcount changed?');
 const binding={router:{bootstrapToken:()=>P.token,current:()=>({datasetId:P.datasetId,token:P.token,digest,generation:P.generation})},handle:async()=>Response.json(dashboard,{headers:{'x-workforce-dataset':P.token}})};
 const request={version:1,requestId:'headcount-fixture',goal:{id:'',statement:''},scope,filters,timeZone:'UTC',evidence:pack,message:{id:'headcount-message',text:'How has our headcount changed?'}};
 const grounding=await createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:()=>binding}).verify({...request,datasetToken:P.token});return {request,grounding};
}
test('zero and decreasing stocks remain valid, no invented observations',async()=>{const f=await fixture(d=>d.trend.forEach((r,i)=>r.headcount=[20,10,0][i]));const r=headcountChatReply(f.request,f.grounding);assert.equal(r.charts.length,1);assert.match(r.answer,/decreased by 20 people/);assert.equal(r.charts[0].points.at(-1).value,0);});
for(const [name,change] of [['duplicate date',d=>d.trend[1].snapshot_date=d.trend[0].snapshot_date],['unknown',d=>d.trend[1].headcount=null],['fractional',d=>d.trend[1].headcount=1.5],['negative',d=>d.trend[1].headcount=-1],['too few',d=>d.trend.splice(1)]])test(name+' cannot produce a chart or numeric answer',async()=>{const f=await fixture(change),r=headcountChatReply(f.request,f.grounding);assert.deepEqual(r.charts,[]);assert.match(r.answer,/could not be verified/);});
test('changed scope and tampered packet fail closed',async()=>{const f=await fixture();assert.equal(headcountChatReply({...f.request,scope:'US only'},f.grounding).charts.length,0);f.request.evidence.sources[0].facts.rows[0].headcount=999;assert.equal(headcountChatReply(f.request,f.grounding).charts.length,0);});
test('dated, subgroup, forecast and causal questions remain on their existing path',async()=>{const f=await fixture();for(const text of ['Why has our headcount changed?','How has US headcount changed?','Show headcount last year','Forecast headcount','What are our recorded workforce costs?','How can we close a staffing gap?'])assert.equal(headcountChatReply({...f.request,message:{...f.request.message,text}},f.grounding),null);});
