import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack} from '../releases/2026-10-21/source/lib/home-pack.mjs';
import {createPublicHomeGroundingTestAdapter} from '../releases/2026-10-21/source/lib/public-home-grounding.server.mjs';
import {PUBLIC_9037 as P} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
import {public9037Metadata} from '../releases/2026-10-21/source/lib/public-9037-projection.mjs';
import {converseSolutions} from '../releases/2026-10-21/source/lib/home-solution-conversation-service.ts';
import {turnoverChatReply,turnoverIntent,annualTurnoverEvidenceQuestion} from '../releases/2026-10-21/source/lib/home-turnover-chat.ts';
import {annualTurnoverSelection} from '../releases/2026-10-21/source/lib/home-turnover-year.ts';
import {readChatEvidenceSeries} from '../releases/2026-10-21/source/lib/chat-evidence-series.ts';
const filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels',digest='a'.repeat(64),hostname='people-analytics-test-ed-56dc.vercel.app';
async function fixture(change=()=>{},question='what was turnover rate last year?'){
 const months=Array.from({length:12},(_,i)=>`2025-${String(i+1).padStart(2,'0')}`);
 const attrition={data_meta:public9037Metadata(digest),as_of:P.cutoff,summary:{},trend:months.map(m=>({month:m+'-01',total_exits:10,voluntary_exits:5,monthly_turnover_pct:1,monthly_voluntary_turnover_pct:0.5}))};
 const dashboard={data_meta:public9037Metadata(digest),overview:{snapshot_date:P.cutoff,headcount:1000},trend:months.map((m,i)=>({snapshot_date:new Date(Date.UTC(2025,i+1,0)).toISOString().slice(0,10),headcount:1000})),workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:filters,effective:filters,label:scope,basis:'Synthetic fixture',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'}};
 change({attrition,dashboard});
 const data={attrition,dashboard},pack=buildHomePack(Object.fromEntries(Object.entries(data).map(([k,data])=>[k,{status:'loaded',data}])),scope,question);
 const binding={router:{bootstrapToken:()=>P.token,current:()=>({datasetId:P.datasetId,token:P.token,digest,generation:P.generation})},handle:async r=>Response.json(data[new URL(r.url).pathname.slice(5)],{headers:{'x-workforce-dataset':P.token}})};
 const receipt=await createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:()=>binding}).verify({datasetToken:P.token,filters,scope,evidence:pack});
 const request={version:1,requestId:'annual-test',goal:{id:'',statement:''},scope,filters,timeZone:'UTC',evidence:pack,goalContext:null,selectedId:null,catalog:null,state:{version:1,verifiedMetrics:[],turns:[],constraints:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null},message:{id:'annual-message',text:question}};
 return {request,receipt};
}
const answer=f=>turnoverChatReply(f.request,f.receipt,new Date('2026-10-21T00:00:00Z')).answer;
test('annual follow-ups recompute the selected year, distinguish voluntary YTD and return the verified year chart',async()=>{
 const f=await fixture(({attrition})=>{attrition.summary.voluntary_turnover_ytd_pct=8.8;});
 const runtime={grounding:f.receipt,requestTime:new Date('2026-10-21T00:00:00Z'),complete:()=>{throw Error('Unexpected paid call');}};
 const first=await converseSolutions(f.request,runtime,new AbortController().signal);
 assert.equal(first.charts[0].points.length,12);assert.equal(readChatEvidenceSeries(first.charts,f.request.requestId,P.token).length,1);
 let state=first.state;
 for(const [index,text] of ['How does that compare with the 8.8% voluntary YTD on Home?','Show me a chart'].entries()){
  const selection=annualTurnoverEvidenceQuestion(text,state,scope,filters,P.token);
  const fresh=await fixture(({attrition})=>{attrition.summary.voluntary_turnover_ytd_pct=8.8;},selection);
  const r={...fresh.request,requestId:'follow-'+index,state,message:{id:'message-'+index,text}},reply=await converseSolutions(r,{...runtime,grounding:fresh.receipt},new AbortController().signal);
  assert.equal(reply.usage.modelRounds,0);assert.match(reply.answer,/2025-01-01 through 2025-12-31/);assert.match(reply.answer,/12%/);assert.equal(reply.charts[0].points.length,12);assert.equal(reply.charts[0].metric,'monthly_turnover_pct');assert.ok(reply.charts[0].points.every(p=>p.date.startsWith('2025-')));
  if(index===0){assert.match(reply.answer,/8.8%/);assert.match(reply.answer,/different measures and periods/);}
  state=reply.state;
 }
 const stale={...f.request,state:{...state,turnoverChat:{...state.turnoverChat,datasetToken:'stale'}},message:{id:'stale',text:'Show me a chart'}};
 assert.equal(annualTurnoverEvidenceQuestion(stale.message.text,stale.state,scope,filters,P.token),'Show me a chart');
 assert.equal(turnoverChatReply(stale,f.receipt,new Date('2026-10-21T00:00:00Z')),null);
 const malformed=structuredClone(first.charts);malformed[0].points[11].date='2026-01-01';assert.deepEqual(readChatEvidenceSeries(malformed,f.request.requestId,P.token),[]);
});
test('actual question routes through grounded annual arithmetic without provider calls',async()=>{
 const f=await fixture();const reply=await converseSolutions(f.request,{grounding:f.receipt,requestTime:new Date('2026-10-21T00:00:00Z'),complete:()=>{throw Error('Unexpected paid call');}},new AbortController().signal);
 assert.match(reply.answer??reply.state.turns.at(-1).text,/12%/);assert.equal(reply.usage.modelRounds,0);assert.match(answer(f),/2025-01-01 through 2025-12-31/);assert.match(answer(f),/120 recorded total exits/);
});
test('explicit voluntary year uses voluntary counts',async()=>assert.match(answer(await fixture(()=>{},'voluntary turnover for 2025')),/6%/));
test('conversational phrasing retains annual evidence and exact year/measure',async()=>{
 for(const q of ['Could you tell me our turnover rate last year?','Please show me voluntary turnover for 2025.','Would you please show our turnover for the previous calendar year?']){
  const f=await fixture(()=>{},q);assert.match(answer(f),q.includes('voluntary')?/6%/:/12%/);assert.match(answer(f),/2025-01-01/);
 }
});
test('politeness and past tense preserve monthly selections without swallowing scope or causality',()=>{
 const months=['2026-07','2026-08','2026-09'];
 assert.deepEqual(turnoverIntent('Can you show me monthly turnover?',months),turnoverIntent('Show me monthly turnover',months));
 assert.deepEqual(turnoverIntent('What was voluntary turnover in September 2026?',months),{kind:'selected',selection:{metric:'voluntary',period:'monthly',months:['2026-09']}});
 assert.equal(annualTurnoverSelection('Could you show turnover in India last year?'),null);
 assert.equal(turnoverIntent('Could you explain why turnover rose?',months).kind,'other');
 assert.equal(turnoverIntent('Could you show monthly turnover in India?',months).kind,'unsupported');
 assert.equal(annualTurnoverSelection('Could you show turnover last year 2024?'),null);
});
for(const [name,change] of [['missing month',({attrition})=>attrition.trend.pop()],['duplicate month',({dashboard})=>dashboard.trend.push(dashboard.trend[0])],['unknown count',({attrition})=>attrition.trend[0].total_exits=null],['negative count',({attrition})=>attrition.trend[0].total_exits=-1]])test(name+' never supplies annual rate',async()=>assert.match(answer(await fixture(change)),/Missing, duplicate or unknown/));
test('zero exits are known zero, zero denominator is undefined',async()=>{assert.match(answer(await fixture(({attrition})=>attrition.trend.forEach(r=>r.total_exits=0))),/was 0%/);assert.match(answer(await fixture(({dashboard})=>dashboard.trend.forEach(r=>r.headcount=0))),/undefined/);});
test('last year uses clock and timezone, not observation cutoff',async()=>{const f=await fixture();assert.match(turnoverChatReply(f.request,f.receipt,new Date('2027-02-01')).answer,/2026-01-01.*full calendar year is not covered/);f.request.timeZone='America/Los_Angeles';assert.match(turnoverChatReply(f.request,f.receipt,new Date('2026-01-01T01:00:00Z')).answer,/2024-01-01/);});
test('tampered packet cannot authorize arithmetic',async()=>{const f=await fixture();f.request.evidence.sources.find(s=>s.id==='A1').facts.monthly[0].total_exits=999;assert.match(answer(f),/could not be verified/);});
test('bounded annual grammar does not swallow monthly or subgroup requests',()=>{for(const q of ['monthly turnover 2025','US turnover last year','turnover last year 2024','annualized turnover last year'])assert.equal(annualTurnoverSelection(q),null);});

test('varying stocks use all twelve closing counts instead of current snapshot',async()=>{const f=await fixture(({dashboard})=>dashboard.trend.forEach((r,i)=>r.headcount=100*(i+1)));assert.match(answer(f),/18.46%/);assert.match(answer(f),/650 average month-end headcount/);});
