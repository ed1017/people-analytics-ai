import test from 'node:test';
import assert from 'node:assert/strict';
import {fteInvestigationSelection,fteInvestigationReply} from '../lib/home-fte-investigation.mjs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {emptySolutionState} from '../lib/home-solution-conversation.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {readDatasetQuestions} from '../lib/home-dataset-query.mjs';
import {readPublicWorkforceHistory} from '../lib/public-home-aggregate.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {readChatEvidenceSeries} from '../lib/chat-evidence-series.ts';
const exact='Why is Managed Services losing FTE, and what should we do?';
const filters={country:'all',org:'all',level:'all'},digest='a'.repeat(64),identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest};
function reader(delta=-2,missing=false){let reads=0;return {count:()=>reads,read:(args,signal)=>readDatasetQuestions(args,{signal,history:history=>readPublicWorkforceHistory({identity,hostname:'people-analytics-test-ed-56dc.vercel.app',args:history,signal,requestId:'fte-investigation',binding:{router:{current:()=>identity,bootstrapToken:()=>P.token},handle:async request=>{reads++;const q=Object.fromEntries(new URL(request.url).searchParams);assert.equal(q.org,'BU-MGSVC');return Response.json({trend:Array.from({length:33},(_,i)=>({snapshot_date:new Date(Date.UTC(2024,i+1,0)).toISOString().slice(0,10),headcount:300,fte:200+i*delta})),data_meta:public9037Metadata(digest),workforce_filter_scope:{version:3,status:'verified_public_aggregate',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive',requested:q,effective:missing?{...q,org:'all'}:q,label:'All countries; Managed Services; All levels',basis:'Synthetic fixture receipt'}},{headers:{'x-workforce-dataset':P.token}});}}})})};}

test('exact why/action question and paraphrases retain scoped evidence, chart and meaningful next steps',async()=>{
 for(const question of [exact,'Why has Managed Services FTE decreased and what actions should we take?','Explain the recent FTE decline in Managed Services']){
  const r=reader(),reply=await fteInvestigationReply(question,filters,r.read,new AbortController().signal);
  assert.equal(r.count(),1);assert.match(reply.answer,/Managed Services lost 6 FTE/);assert.match(reply.answer,/Jun 2026 to Sep 2026/);assert.match(reply.answer,/movement-level FTE breakdown/);assert.match(reply.answer,/transfers and contracted-hours/);assert.match(reply.answer,/Scenario Planning/);assert.doesNotMatch(reply.answer,/caused by|not hires|turnover caused|13\.6/);
  assert.equal(readChatEvidenceSeries(reply.charts,'fte-investigation',P.token).length,1);assert.equal(reply.charts[0].points.length,4);
 }
});

test('selection generalizes named BUs while preserving explicit filter intersections',()=>{
 const s=fteInvestigationSelection('Why is Consulting losing FTE and what should HR do?',{country:'CA',org:'BU-TECH',level:'L2'});
 assert.equal(s.history.org,'BU-CONS');assert.equal(s.history.country,'CA');assert.equal(s.history.level,'L2');assert.equal(s.history.start,'2026-06-30');
 for(const q of ['Why is Managed Services losing FTE in Canada, and what should we do?','Why is Managed Services losing FTE in 2025?','Why is Managed Services losing FTE because of pay?','Why are Managed Services and Consulting losing FTE?','Why is Managed Services losing people?','Which BU is losing FTE?','Why is Managed Services losing FTE and create a hiring plan?'])assert.equal(fteInvestigationSelection(q,filters),null,q);
});

test('gains, flat history and unavailable intersection do not affirm an assumed decline',async()=>{
 for(const [delta,expected] of [[1,/gained 3 FTE/],[0,/FTE was unchanged/]]){const r=reader(delta),reply=await fteInvestigationReply(exact,filters,r.read,new AbortController().signal);assert.match(reply.answer,expected);assert.doesNotMatch(reply.answer,/lost \d|locations losing FTE/);}
 const r=reader(-2,true),reply=await fteInvestigationReply(exact,filters,r.read,new AbortController().signal);assert.equal(reply.charts.length,0);assert.match(reply.answer,/not verified/);assert.doesNotMatch(reply.answer,/lost \d|locations losing FTE/);
});

test('cancelled and malformed history cannot become a diagnosis',async()=>{
 const c=new AbortController();c.abort();await assert.rejects(fteInvestigationReply(exact,filters,()=>assert.fail('read after abort'),c.signal));
 await assert.rejects(fteInvestigationReply(exact,filters,async()=>({answer:'data',charts:[{kind:'recorded',metric:'fte',unit:'FTE',points:[]}]}),new AbortController().signal),/could not be verified/);
});

test('actual conversation completes the why/action request with no provider call and preserves existing plan state',async()=>{
 const r=reader(),state=emptySolutionState(),request={version:1,requestId:'fte-investigation',goal:{id:'',statement:''},scope:'Company-wide',filters,timeZone:'UTC',evidence:buildHomePack({},'Company-wide',exact),goalContext:null,selectedId:null,catalog:null,state,message:{id:'question',text:exact}};
 const reply=await converseSolutions(request,{readDatasetQuestions:r.read,complete:()=>assert.fail('no provider call'),loadProjection:()=>assert.fail('no projection')},new AbortController().signal);
 assert.equal(reply.usage.modelRounds,0);assert.equal(reply.charts.length,1);assert.match(reply.answer,/Next steps/);assert.equal(reply.state.turns.at(-1).text,reply.answer);assert.deepEqual(reply.state.analyses,state.analyses);assert.deepEqual(reply.state.working,state.working);
});
