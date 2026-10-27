import test from 'node:test';
import assert from 'node:assert/strict';
import {turnoverInvestigationSelection,turnoverInvestigationReply} from '../lib/home-turnover-investigation.mjs';
import {readDatasetQuestions} from '../lib/home-dataset-query.mjs';
import {readPublicHomeAggregate} from '../lib/public-home-aggregate.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {readChatEvidenceSeries} from '../lib/chat-evidence-series.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {emptySolutionState} from '../lib/home-solution-conversation.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
const exact='Which business unit has the highest voluntary turnover, and what should an HR leader investigate before acting?';
const codes=['BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH'];
const digest='a'.repeat(64),identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest};
const data=()=>({as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{total_exits:36},business_units:codes.map((org_code,i)=>({org_code,org_name:org_code,exits:i+1,voluntary_turnover_ytd_pct:i+1}))});
function reader(change=()=>{},filters={country:'all',org:'all',level:'all'}){
 let reads=0;const d=data();change(d);
 const binding={router:{current:()=>identity,bootstrapToken:()=>P.token},handle:async()=>{reads++;return Response.json(d,{headers:{'x-workforce-dataset':P.token}});}};
 return {count:()=>reads,read:(args,signal)=>readDatasetQuestions(args,{signal,comparison:query=>readPublicHomeAggregate({binding,hostname:'people-analytics-test-ed-56dc.vercel.app',identity,filters,args:query,signal,requestId:'investigation'})})};
}
test('exact question and paraphrases preserve source ranking, full BU chart and separate general checks',async()=>{
 for(const question of [exact,'Which BU has the lowest voluntary attrition? What checks should HR consider before acting?','Show the business unit with the highest voluntary turnover; what should we review before taking action?']){
  const r=reader(),reply=await turnoverInvestigationReply(question,r.read,new AbortController().signal);
  assert.equal(r.count(),1);assert.match(reply.answer,/Suggested investigation checks/);assert.match(reply.answer,/general guidance, not findings/);assert.match(reply.answer,/denominator/);assert.match(reply.answer,/Do not assume any factor caused/);
  assert.equal(reply.charts.length,1);assert.equal(reply.charts[0].points.length,8);assert.equal(readChatEvidenceSeries(reply.charts,'investigation',P.token).length,1);
  assert.match(reply.answer,question.includes('lowest') ? /: 1 percent/ : /: 8 percent/);assert.doesNotMatch(reply.answer,/13\.6/);
 }
});
test('ordinary exploration and pure ranking keep the existing route; total is not silently voluntary',()=>{
 for(const q of ['Explore turnover','Which business unit has the highest voluntary turnover?','Why is turnover high?','Which business unit has highest turnover and recommend a staffing plan'])assert.equal(turnoverInvestigationSelection(q),null);
 assert.equal(turnoverInvestigationSelection('Which business unit has highest turnover and what should HR investigate?').metric,'total_turnover_ytd_pct');
});
test('qualified investigation clauses keep ordinary routing instead of being replaced with generic advice',async()=>{
 const ranking='Which business unit has the highest voluntary turnover, and ';
 for(const second of ['investigate whether its 2024 rate proves pay caused departures','what should HR investigate in Canada before acting?','what should an HR leader review for 2024?','what should HR investigate about pay causing departures?','which checks show that poor management caused turnover?','what should HR check in Engineering?','what should HR review about engagement scores?']){
  assert.equal(turnoverInvestigationSelection(ranking+second),null,second);
  assert.equal(await turnoverInvestigationReply(ranking+second,()=>assert.fail('qualified second intent must not be consumed'),new AbortController().signal),null);
 }
});
test('unknown scope, period and measure never substitute a current ranking',async()=>{
 for(const q of [exact.replace('turnover,','turnover in Canada,'),exact.replace('turnover,','turnover last year,'),exact.replace('voluntary','involuntary'),exact.replace('turnover,','turnover in 2025,')]){
  const reply=await turnoverInvestigationReply(q,()=>assert.fail('must not read a substituted comparison'),new AbortController().signal);
  assert.match(reply.answer,/No current ranking has been substituted/);assert.deepEqual(reply.charts,[]);assert.doesNotMatch(reply.answer,/\d+ percent/);
 }
 const r=reader(()=>{},{country:'CA',org:'all',level:'all'}),reply=await turnoverInvestigationReply(exact,r.read,new AbortController().signal);
 assert.match(reply.answer,/Clear the workforce filters/);assert.deepEqual(reply.charts,[]);assert.equal(r.count(),0);
});
test('unavailable values do not become numeric facts; provenance failure and abort remain failures',async()=>{
 const missing=reader(d=>delete d.business_units[0].voluntary_turnover_ytd_pct);
 const reply=await turnoverInvestigationReply(exact,missing.read,new AbortController().signal);
 assert.match(reply.answer,/cannot verify/);assert.match(reply.answer,/general guidance, not findings/);assert.doesNotMatch(reply.answer,/: \d+ percent/);assert.deepEqual(reply.charts,[]);
 const stale=reader(d=>d.data_meta.bundleDigest='b'.repeat(64));await assert.rejects(turnoverInvestigationReply(exact,stale.read,new AbortController().signal),/could not be verified/);
 const c=new AbortController();c.abort();await assert.rejects(turnoverInvestigationReply(exact,()=>assert.fail('no read after abort'),c.signal));
});
test('actual conversation service completes both intents without invoking provider or dropping chart',async()=>{
 const r=reader(),question={version:1,requestId:'investigation',goal:{id:'',statement:''},scope:'Company-wide',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:buildHomePack({},'Company-wide',exact),goalContext:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'question',text:exact}};
 const reply=await converseSolutions(question,{readDatasetQuestions:r.read,complete:()=>assert.fail('no model request'),loadProjection:()=>assert.fail('no projection')},new AbortController().signal);
 assert.equal(reply.usage.modelRounds,0);assert.equal(r.count(),1);assert.equal(reply.charts.length,1);assert.equal(reply.state.turns.at(-1).text,reply.answer);assert.match(reply.answer,/Suggested investigation checks/);
});
test('ties retain all equal winners and the full comparison; they do not become a single winner',async()=>{
 const r=reader(d=>d.business_units[6].voluntary_turnover_ytd_pct=8);
 const reply=await turnoverInvestigationReply(exact,r.read,new AbortController().signal);
 assert.equal((reply.answer.match(/: 8 percent/g)??[]).length,2);assert.equal(reply.charts[0].points.length,8);
});
