import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {readSolutionRequest} from '../lib/home-solution-conversation.ts';
import {verifySolutionEvidence} from '../lib/home-solution-grounding.mjs';
import {answerEvidenceSeries} from '../lib/chat-evidence-series.ts';
import {chatSeriesFixture,chartGrounding} from './fixtures/chat-evidence-series.mjs';
import {fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
const signal=()=>new AbortController().signal;
async function run(request,grounding=chartGrounding(request.evidence)){
 const runtime=fixtureRuntime([]);runtime.grounding=grounding;
 const reply=await converseSolutions(request,runtime,signal());
 assert.equal(runtime.rounds,0);assert.equal(runtime.reads,0);return reply;
}
function follow(first,reply,text,number=2){return readSolutionRequest({...first,requestId:'request-'+number,message:{id:'user-'+number,text},state:reply.state});}

test('colloquial turnover question returns exact freshly grounded rates and existing chart, with no provider call',async()=>{
 const {request,results}=chatSeriesFixture("What's turnover looking like?"),reads=[];
 const grounding=await verifySolutionEvidence(request,{datasetToken:'legacy-v1:0',read:async key=>{reads.push(key);return results[key];}},signal());
 const reply=await run(request,grounding);
 assert.equal(reply.charts.length,1);assert.deepEqual(reply.charts[0].points.map(p=>p.value),[1,2,1.5]);
 assert.match(reply.answer,/Monthly total turnover/);assert.match(reply.answer,/not annual or YTD/);
 assert.equal(reply.charts[0].packetSha256,grounding.packetSha256);assert.ok(reads.includes('attrition'));
 assert.deepEqual(reply.usage,{modelRounds:0,toolCalls:0});assert.equal(reply.state.turns.length,2);
});
test('voluntary and explicit period follow-ups update chart from fresh values, preserving earlier answer',async()=>{
 const {request}=chatSeriesFixture("What's turnover looking like?"),first=await run(request);
 const secondRequest=follow(request,first,'Just voluntary'),second=await run(secondRequest);
 assert.equal(second.charts[0].metric,'monthly_voluntary_turnover_pct');
 assert.deepEqual(second.charts[0].points.map(p=>p.value),[.8,1.4,1]);
 const thirdRequest=follow(request,second,'What about July 2026 and August 2026?',3);
 thirdRequest.evidence.sources.find(s=>s.id==='A1').facts.monthly[0].monthly_voluntary_turnover_pct=.9;
 const third=await run(thirdRequest);
 assert.deepEqual(third.charts[0].points.map(p=>p.value),[.9,1.4]);assert.equal(third.charts[0].omitted,0);
 assert.equal(third.state.turns[1].text,first.answer);
 const fourth=await run(follow(request,third,'Just total',4));
 assert.deepEqual(fourth.charts[0].points.map(p=>p.value),[1,2]);
});
test('dataset, filter, scope, malformed context and intervening topic prevent inherited selection',async()=>{
 const {request}=chatSeriesFixture('Monthly turnover'),first=await run(request);
 for(const change of [r=>r.state.turnoverChat.datasetToken='other',r=>r.filters.country='US',r=>r.scope='Another scope',r=>r.state.turnoverChat.months=[null],r=>r.state.turns.push({id:'other',role:'assistant',text:'Another topic.'})]){
  const next=follow(request,first,'Just voluntary');change(next);const reply=await run(next);
  assert.match(reply.answer,/Which turnover measure/);assert.deepEqual(reply.charts,[]);assert.equal(reply.state.turnoverChat,undefined);
 }
 const next=follow(request,first,'Show headcount over time'),runtime=fixtureRuntime([final('Recorded headcount [W1].')]);runtime.grounding=chartGrounding(next.evidence);
 const other=await converseSolutions(next,runtime,signal());assert.equal(other.charts[0].metric,'headcount');assert.equal(other.state.turnoverChat,undefined);
 const after=await run(follow(request,other,'Just voluntary',3));assert.match(after.answer,/Which turnover measure/);
});
test('missing and unsupported selections remain distinct and never substitute company/monthly data',async()=>{
 for(const text of ['Turnover in Engineering','Turnover for women','Turnover last year','Monthly involuntary turnover','Turnover January 2025 and February 2025']){
  const {request}=chatSeriesFixture(text),reply=await run(request);assert.deepEqual(reply.charts,[]);
  assert.match(reply.answer,text.includes('2025')?/unknown/:/not supported/);
 }
 const {request}=chatSeriesFixture('Monthly turnover'),first=await run(request);
 const scope=await run(follow(request,first,'What about turnover in Engineering?'));assert.match(scope.answer,/not supported/);assert.deepEqual(scope.charts,[]);
});
test('YTD uses verified summary only, annual remains ambiguous, missing annualized stays unknown',async()=>{
 const {request}=chatSeriesFixture('Voluntary turnover YTD'),reply=await run(request);
 assert.match(reply.answer,/6.2%/);assert.match(reply.answer,/YTD/);assert.deepEqual(reply.charts,[]);
 assert.match((await run({...request,message:{id:'user-1',text:'Annual turnover'}})).answer,/Do you mean/);
 const annual=await run({...request,message:{id:'user-1',text:'Annualized voluntary turnover'}});assert.match(annual.answer,/unknown/);assert.deepEqual(annual.charts,[]);
 request.evidence.sources.find(s=>s.id==='A1').facts.annualized_voluntary_turnover_pct=8.4;
 const known=await run({...request,message:{id:'user-1',text:'Annualized voluntary turnover'}});assert.match(known.answer,/8.4%/);assert.deepEqual(known.charts,[]);
});
test('missing, null, suppressed, single and duplicate monthly observations do not invent a trend',async()=>{
 const {request}=chatSeriesFixture('Monthly turnover');
 const noGrounding=await run(request,null);assert.match(noGrounding.answer,/unknown/);assert.deepEqual(noGrounding.charts,[]);
 const missing=structuredClone(request);missing.evidence.sources.find(s=>s.id==='A1').facts.monthly=[];
 assert.match((await run(missing)).answer,/unknown/);
 const source=request.evidence.sources.find(s=>s.id==='A1');source.facts.monthly[0].monthly_turnover_pct=null;source.facts.monthly[1].monthly_turnover_pct=null;
 const single=await run(request);assert.match(single.answer,/2026-09: 1.5%/);assert.match(single.answer,/At least two/);assert.deepEqual(single.charts,[]);
 source.facts.monthly[1]={...source.facts.monthly[2]};assert.deepEqual((await run(request)).charts,[]);
});
test('ambiguous months and mixed measures ask for clarification',async()=>{
 const {request}=chatSeriesFixture('Turnover January');assert.match((await run(request)).answer,/Which year/);
 for(const text of ['Monthly and YTD turnover','Total and voluntary turnover'])assert.match((await run({...request,message:{id:'user-1',text}})).answer,/Please choose/);
});
test('available monthly ranges include intermediate observations; oversized or absent ranges never truncate silently',async()=>{
 const {request}=chatSeriesFixture('Turnover July 2026 through September 2026');
 assert.deepEqual((await run(request)).charts[0].points.map(p=>p.value),[1,2,1.5]);
 const tooMany=await run({...request,message:{id:'user-1',text:'Turnover June 2026 through September 2026'}});assert.deepEqual(tooMany.charts,[]);assert.match(tooMany.answer,/up to three/);
 const absent=await run({...request,message:{id:'user-1',text:'Turnover June 2026 through August 2026'}});assert.deepEqual(absent.charts,[]);assert.match(absent.answer,/unknown/);
});
test('supplemental chart compatibility rejects annual, subgroup, forecast and absent periods even with cited model prose',()=>{
 for(const question of ['Annual turnover','YTD turnover','Turnover in Engineering','Forecast turnover','Turnover 2025-01 2025-02']){
  const {request}=chatSeriesFixture(question);assert.deepEqual(answerEvidenceSeries(request.evidence,chartGrounding(request.evidence),request.requestId,question,'Recorded rates [A1].'),[]);
 }
});
