import test from 'node:test';
import assert from 'node:assert/strict';
import {quarterlyTurnoverIntent,calculateQuarterlyTurnover,readQuarterlyTurnover,QUARTERLY_CLARIFICATION} from '../releases/2026-10-21/source/lib/home-quarterly-turnover.mjs';
import {readPublicQuarterlyTurnover} from '../releases/2026-10-21/source/lib/public-quarterly-turnover.server.mjs';
import {readChatEvidenceSeries} from '../releases/2026-10-21/source/lib/chat-evidence-series.ts';
import {PUBLIC_9037 as P} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
import {public9037Metadata} from '../releases/2026-10-21/source/lib/public-9037-projection.mjs';
const question='what are turnover rates by group quarter by quarter';
const history=()=>Array.from({length:33},(_,i)=>({month:new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10),headcount:(i%3+1)*100,total_exits:i?10:null,voluntary_exits:i?5:null}));
const selection={groupBy:'org',metric:'total',year:2026,quarters:[]};
test('ambiguous group asks a dimension and preserves quarterly intent in the immediate answer',()=>{
 assert.deepEqual(quarterlyTurnoverIntent(question),{answer:QUARTERLY_CLARIFICATION});
 const turns=[{role:'user',text:question},{role:'assistant',text:QUARTERLY_CLARIFICATION}];
 assert.equal(quarterlyTurnoverIntent('business units',turns).groupBy,'org');
 assert.equal(quarterlyTurnoverIntent('countries',turns).groupBy,'country');
 const mixed=[{role:'user',text:'quarterly voluntary turnover by country and level in 2025'},{role:'assistant',text:QUARTERLY_CLARIFICATION}];
 assert.deepEqual(quarterlyTurnoverIntent('countries',mixed),{groupBy:'country',metric:'voluntary',year:2025,quarters:[]});
 assert.equal(quarterlyTurnoverIntent('levels',[]),null);
 assert.equal(quarterlyTurnoverIntent('Show monthly turnover'),null);
 for(const connector of ['to','through','-'])assert.deepEqual(quarterlyTurnoverIntent(`quarterly turnover by country from Q1 ${connector} Q3 2026`).quarters,[1,2,3]);
 assert.ok(quarterlyTurnoverIntent('quarterly turnover by country Q3 to Q1 2026').answer);
});
test('quarterly arithmetic uses exit counts and three varying closing stocks; partial quarters unavailable',()=>{
 const rows=calculateQuarterlyTurnover(history(),selection,P.cutoff);
 assert.deepEqual(rows.map(r=>r.ratePct),[15,15,15,null]);
 assert.equal(rows[0].exitCount,30);assert.equal(rows[0].averageMonthEndHeadcount,200);
 assert.equal(rows[3].reason,'Quarter is not fully observed');
 assert.equal(calculateQuarterlyTurnover(history(),{...selection,year:2024},P.cutoff)[0].reason,'Grouped exit counts are incomplete');
 const all=calculateQuarterlyTurnover(history(),{...selection,year:null},P.cutoff);assert.equal(all.length,10);assert.equal(all[0].quarter,'2024-Q2');assert.equal(all.at(-1).quarter,'2026-Q3');
});
test('zero exits, zero stock, missing/duplicate/invalid evidence remain distinct',()=>{
 const zero=history().map((r,i)=>({...r,total_exits:i?0:null,voluntary_exits:i?0:null}));assert.equal(calculateQuarterlyTurnover(zero,selection,P.cutoff)[0].ratePct,0);
 zero.forEach(r=>r.headcount=0);assert.equal(calculateQuarterlyTurnover(zero,selection,P.cutoff)[0].reason,'Average headcount is zero');
 for(const mutate of [h=>h.pop(),h=>h[1]=h[2],h=>h[5].total_exits=null,h=>h[5].voluntary_exits=11,h=>h[5].headcount=-1]){const h=history();mutate(h);assert.throws(()=>calculateQuarterlyTurnover(h,selection,P.cutoff));}
});
const identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest:'a'.repeat(64)},filters={country:'US',org:'all',level:'all'};
function fixture(mutate=()=>{}){
 const requests=[];
 const binding={router:{current:()=>identity,bootstrapToken:()=>P.token},turnoverHistory:async f=>{requests.push(f);const data={turnover_history:history()};mutate(data);return {contract:'public-group-turnover-history-v1',datasetToken:P.token,bundleDigest:identity.digest,asOf:P.cutoff,filters:f,rows:data.turnover_history};},handle:async request=>{
  const f=Object.fromEntries(new URL(request.url).searchParams);requests.push(f);
  const data={data_meta:public9037Metadata(identity.digest),filter_options:{business_units:[{value:'BU-CORP',label:'Corporate'},{value:'BU-TECH',label:'Technology'}]},workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:f,effective:f,label:'United States; All business units; All levels',basis:'Synthetic fixture',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'},turnover_history:history()};mutate(data);return Response.json(data,{headers:{'x-workforce-dataset':P.token}});
 }};
 return {requests,run:()=>readPublicQuarterlyTurnover({binding,identity,hostname:'people-analytics-test-ed-56dc.vercel.app',filters,selection,signal:new AbortController().signal,requestId:'quarter-test'})};
}
test('verified scoped reader and answer/chart share arithmetic without model or raw cells',async()=>{
 const f=fixture(),result=await f.run();assert.equal(f.requests.length,3);assert.ok(f.requests.every(r=>r.country==='US'));assert.match(result.answer,/2026-Q1: 15%/);assert.match(result.answer,/2026-Q4: unavailable/);
 assert.equal(readChatEvidenceSeries(result.charts,'quarter-test',P.token).length,1);
 assert.ok(readQuarterlyTurnover(result.charts[0].quarterly));
 const bad=structuredClone(result.charts);bad[0].quarterly.rows[0].ratePct=99;assert.deepEqual(readChatEvidenceSeries(bad,'quarter-test',P.token),[]);
 assert.doesNotMatch(JSON.stringify(result),/rawFlows|cellIndex|employeeId/);
});
test('source and scope mismatches fail closed',async()=>{
 await assert.rejects(fixture(d=>d.data_meta.bundleDigest='b'.repeat(64)).run());
 await assert.rejects(fixture(d=>d.workforce_filter_scope.effective={...filters,country:'all'}).run());
 await assert.rejects(fixture(d=>d.turnover_history.pop()).run());
});
