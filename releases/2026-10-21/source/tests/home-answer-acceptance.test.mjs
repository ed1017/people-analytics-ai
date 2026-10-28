import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {emptySolutionState,readSolutionState} from '../lib/home-solution-conversation.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {readDatasetQuestions} from '../lib/home-dataset-query.mjs';
import {readPublicHomeAggregate} from '../lib/public-home-aggregate.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {readChatEvidenceSeries} from '../lib/chat-evidence-series.ts';

// Deliberately authored aggregates. No external fetch, credentials, private bundle or provider.
const codes=['BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH'];
const digest='a'.repeat(64),identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest};
const filters={country:'all',org:'all',level:'all'};
const source=()=>({as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{total_exits:36},business_units:codes.map((org_code,i)=>({org_code,org_name:org_code,exits:i+1,voluntary_turnover_ytd_pct:i+1}))});
const request=(text,id='acceptance',state=readSolutionState(emptySolutionState()))=>({version:1,requestId:id,goal:{id:'',statement:''},scope:'Company-wide',filters,timeZone:'UTC',evidence:buildHomePack({},'Company-wide',text),goalContext:null,selectedId:null,catalog:null,state,message:{id:id+'-question',text}});
function harness(d=source(),onRead=()=>{}){
 let reads=0;
 const binding={router:{current:()=>identity,bootstrapToken:()=>P.token},handle:async()=>{reads++;await onRead();return Response.json(d,{headers:{'x-workforce-dataset':P.token}});}};
 return {reads:()=>reads,run:(q,signal=new AbortController().signal)=>converseSolutions(q,{readDatasetQuestions:(args,innerSignal)=>readDatasetQuestions(args,{signal:innerSignal,comparison:query=>readPublicHomeAggregate({binding,hostname:'people-analytics-test-ed-56dc.vercel.app',identity,filters,args:query,signal:innerSignal,requestId:q.requestId})}),complete:()=>assert.fail('Paid/provider route is forbidden in this acceptance suite.'),loadProjection:()=>assert.fail('Unexpected projection route.')},signal)};
}
test('ordinary lowest comparison keeps full numerical chart, correct ordering and concise answer',async()=>{
 const h=harness(),reply=await h.run(request('Which business unit has the lowest voluntary turnover?'));
 assert.equal(reply.usage.modelRounds,0);assert.equal(h.reads(),1);assert.match(reply.answer,/: 1 percent/);assert.doesNotMatch(reply.answer,/What to investigate/);
 const [chart]=readChatEvidenceSeries(reply.charts,'acceptance',P.token);assert.equal(chart.points.length,8);assert.deepEqual(chart.points.map(p=>p.value),[1,2,3,4,5,6,7,8]);
});
test('multipart answer preserves tied winners and actionable checks without asserting causes',async()=>{
 const d=source();d.business_units[6].voluntary_turnover_ytd_pct=8;
 const reply=await harness(d).run(request('Which business unit has highest voluntary turnover and what should HR investigate before acting?'));
 assert.equal((reply.answer.match(/: 8 percent/g)??[]).length,2);assert.match(reply.answer,/What to investigate/);assert.match(reply.answer,/possible drivers/);assert.doesNotMatch(reply.answer,/caused by|management caused/);assert.equal(reply.charts[0].points.length,8);
});
test('advice follow-up refreshes changed source evidence rather than replaying the previous winner/chart',async()=>{
 const d=source(),h=harness(d),first=await h.run(request('Which business unit has highest voluntary turnover?'));
 const before=JSON.stringify(first.state);d.business_units[0].voluntary_turnover_ytd_pct=9;
 const second=await h.run(request('What is driving it?','acceptance-followup',first.state));
 assert.equal(h.reads(),2);assert.equal(second.usage.modelRounds,0);assert.equal(second.charts[0].points[0].date,codes[0]);assert.equal(second.charts[0].points[0].value,9);
 assert.equal(readChatEvidenceSeries(second.charts,'acceptance-followup',P.token).length,1);assert.match(second.answer,/What to investigate/);assert.equal(JSON.stringify(first.state),before);assert.deepEqual(second.state.working,first.state.working);
});
test('historical followups keep the unsupported period until explicit current-data acceptance',async()=>{
 const h=harness();let q=request('Show voluntary turnover by business unit last year'),reply=await h.run(q);
 assert.equal(h.reads(),0);assert.equal(reply.charts.length,0);
 reply=await h.run(request('And voluntary turnover by business unit?','historical-next',reply.state));
 assert.equal(h.reads(),0);assert.equal(reply.charts.length,0);assert.match(reply.answer,/available YTD comparison/);
 reply=await h.run(request('Yes please','accepted-current',reply.state));
 assert.equal(h.reads(),1);assert.match(reply.answer,/January-September 2026/);assert.equal(readChatEvidenceSeries(reply.charts,'accepted-current',P.token).length,1);
});
test('missing values never become a partial ranking or zero and preserve the caller state',async()=>{
 for(const mutate of [d=>d.business_units[0].voluntary_turnover_ytd_pct=null,d=>{d.business_units.pop();d.summary.total_exits=28;},d=>delete d.business_units[0].voluntary_turnover_ytd_pct]){
  const d=source();mutate(d);
  const q=request('Which business unit has highest voluntary turnover and what should HR investigate?'),before=JSON.stringify(q.state);
  const reply=await harness(d).run(q);assert.equal(reply.charts.length,0);assert.match(reply.answer,/cannot verify|unavailable/);assert.doesNotMatch(reply.answer,/: \d+ percent|complete eight/);assert.match(reply.answer,/What to investigate/);assert.equal(JSON.stringify(q.state),before);
 }
});
test('provenance failure rejects the answer and does not mutate the conversation or call a provider',async()=>{
 const d=source();d.data_meta.bundleDigest='b'.repeat(64);
 const q=request('Show voluntary turnover by business unit'),before=JSON.stringify(q.state);
 await assert.rejects(harness(d).run(q),/could not be verified/);assert.equal(JSON.stringify(q.state),before);
});
test('cancellation during an evidence read cannot append an answer or silently retry elsewhere',async()=>{
 const c=new AbortController(),q=request('Show voluntary turnover by business unit'),before=JSON.stringify(q.state),h=harness(source(),()=>c.abort());
 await assert.rejects(h.run(q,c.signal));assert.equal(h.reads(),1);assert.equal(JSON.stringify(q.state),before);
});
