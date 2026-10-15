/** Actual exported POST and request boundary; in-memory aggregate/provider ports only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {withDatasetRequest,datasetRouter} from '../lib/dataset-runtime.ts';
import {DATASET_HEADER} from '../lib/dataset-identity.mjs';
import {readSolutionRequest} from '../lib/home-solution-conversation.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {verifySolutionEvidence,SolutionEvidenceError} from '../lib/home-solution-grounding.mjs';
import {createSolutionDiagnostics} from '../lib/home-solution-diagnostics.ts';
import {chatSeriesFixture} from './fixtures/chat-evidence-series.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
import {final} from './fixtures/home-solution-conversation.mjs';

function route(results){
 let modelCalls=0,readerCalls=0;
 const source=ts.createSourceFile('route.ts',readFileSync(new URL('../app/api/home-solution-conversation/route.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const code=source.statements.filter(node=>!ts.isImportDeclaration(node)).map(node=>node.getText(source)).join('\n');
 const sandbox={exports:{},Response,AbortSignal,TextEncoder,Date,JSON,console,process:{env:{OPENAI_API_KEY:'offline-fixture-not-a-key'}},
  withDatasetRequest,datasetRouter,readSolutionRequest,converseSolutions,SolutionEvidenceError,createSolutionDiagnostics,
  solutionConversationEnabled:true,goalProgressConversationEnabled:false,SWP_CONVERSATION_HEADER:'x-offline-swp',SWP_DEMAND_MODE:'demand',
  swpConversationModel:()=>({}),readStaffingScenario:()=>null,solutionPlanningInstructions:()=>'',businessPlanningInstructions:'',hiringBudgetInstructions:'',requiredStaffingInstructions:'',
  openAIProxyTransport:()=>({}),OpenAI:class {responses={create(){modelCalls++;throw Error('Provider must not run for bounded turnover.');}};},
  groundSolutionRequest:(request,signal)=>verifySolutionEvidence(request,{datasetToken:datasetRouter.current().token,read:async key=>{readerCalls++;return structuredClone(results[key]);}},signal),
 };
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return {POST:sandbox.exports.POST,get modelCalls(){return modelCalls;},get readerCalls(){return readerCalls;}};
}
const post=(handler,body,headers={})=>handler.POST(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}));
test('actual POST grounds first question and follow-up; no provider dispatch or extra data reads',async()=>{
 const {request,results}=chatSeriesFixture("What's turnover looking like?"),handler=route(results);
 const first=await post(handler,request);assert.equal(first.status,200);assert.equal(first.headers.get('cache-control'),'no-store');
 const reply=await first.json();assert.equal(reply.charts[0].metric,'monthly_turnover_pct');assert.equal(handler.readerCalls,3);
 const second=await post(handler,{...request,requestId:'request-2',message:{id:'user-2',text:'Just voluntary'},state:reply.state});
 assert.equal(second.status,200);assert.equal((await second.json()).charts[0].metric,'monthly_voluntary_turnover_pct');
 assert.equal(handler.readerCalls,6);assert.equal(handler.modelCalls,0);
 assert.throws(()=>datasetRouter.current(),/context required/);
});
test('actual POST rejects changed evidence and stale dataset before chart/provider use',async()=>{
 const {request,results}=chatSeriesFixture('Monthly turnover'),handler=route(results);
 request.evidence.sources.find(s=>s.id==='A1').facts.monthly[0].monthly_turnover_pct=99;
 const changed=await post(handler,request);assert.equal(changed.status,503);assert.equal((await changed.json()).charts,undefined);assert.equal(handler.modelCalls,0);
 const calls=handler.readerCalls,stale=await post(handler,request,{[DATASET_HEADER]:'other:1'});
 // The route's real request boundary, rather than this helper, owns dataset-header validation.
 assert.ok(stale.status>=400);assert.equal(handler.readerCalls,calls);assert.equal(handler.modelCalls,0);
});
test('actual POST routes unrelated follow-ups through the existing conversation and clears turnover context',async()=>{
 const isolated=await offlineBusinessRoute();
 const send=body=>isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{[DATASET_HEADER]:'legacy-v1:0'},body:JSON.stringify(body)}));
 for(const topic of ['employee satisfaction','succession coverage','overall employee satisfaction','annual employee satisfaction','Engineering']){
  const {request,results}=chatSeriesFixture('Monthly turnover');isolated.sandbox.__aggregateSources=results;
  const first=await send(request);assert.equal(first.status,200);const initial=await first.json();assert.equal(initial.charts.length,1);
  const calls=isolated.sandbox.__requests.length,expected=`Discussion of ${topic} requires its own available evidence.`;
  isolated.sandbox.__replies.push(responseForStep(final(expected)));
  const follow=await send({...request,requestId:'request-2',message:{id:'user-2',text:`What about ${topic}?`},state:initial.state});
  assert.equal(follow.status,200);const reply=await follow.json();
  assert.equal(reply.answer,expected);assert.equal(reply.usage.modelRounds,1);assert.equal(isolated.sandbox.__requests.length,calls+1);
  assert.deepEqual(Array.from(reply.charts),[]);assert.equal(reply.state.turnoverChat,undefined);
  const ambiguous=await send({...request,requestId:'request-3',message:{id:'user-3',text:'Just voluntary'},state:reply.state});
  assert.equal(ambiguous.status,200);const clarified=await ambiguous.json();assert.match(clarified.answer,/Which turnover measure/);assert.deepEqual(Array.from(clarified.charts),[]);
 }
});
test('actual POST expands named and ISO hyphen/en-dash/em-dash ranges including intermediate months',async()=>{
 for(const separator of ['-',' - ','\u2013',' \u2013 ','\u2014',' \u2014 '])for(const [start,end] of [['July 2026','September 2026'],['2026-07','2026-09'],['2026-07-01','2026-09-01']]){
  const {request,results}=chatSeriesFixture(`Turnover ${start}${separator}${end}`),handler=route(results);
  const response=await post(handler,request);assert.equal(response.status,200);const reply=await response.json();
  assert.deepEqual(reply.charts[0].points.map(p=>p.date),['2026-07-01','2026-08-01','2026-09-01']);
  assert.deepEqual(reply.charts[0].points.map(p=>p.value),[1,2,1.5]);assert.equal(handler.modelCalls,0);
 }
 const singleFixture=chatSeriesFixture('Turnover 2026-07');
 const one=await post(route(singleFixture.results),singleFixture.request),single=await one.json();assert.equal(one.status,200);assert.match(single.answer,/2026-07: 1%/);assert.deepEqual(single.charts,[]);
 const {request,results}=chatSeriesFixture('Turnover July 2026-September 2026');
 request.evidence.sources.find(s=>s.id==='A1').facts.monthly=request.evidence.sources.find(s=>s.id==='A1').facts.monthly.filter(row=>row.month!=='2026-08-01');
 results.attrition.data.trend=results.attrition.data.trend.filter(row=>row.month!=='2026-08-01');
 assert.deepEqual(request.evidence.sources.find(s=>s.id==='A1').facts.monthly.map(row=>row.month).sort(),['2026-07-01','2026-09-01']);
 const missing=await post(route(results),request);assert.equal(missing.status,200);const unknown=await missing.json();assert.match(unknown.answer,/unknown/);assert.deepEqual(unknown.charts,[]);
});
