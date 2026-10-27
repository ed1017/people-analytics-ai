import test from 'node:test';import assert from 'node:assert/strict';
import {businessUnitTurnoverIntent,businessUnitTurnoverReply} from '../lib/home-bu-turnover-chat.mjs';
import {turnoverIntent} from '../lib/home-turnover-chat.ts';
import {readDatasetQuestions} from '../lib/home-dataset-query.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {readPublicHomeAggregate} from '../lib/public-home-aggregate.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {emptySolutionState} from '../lib/home-solution-conversation.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {readChatEvidenceSeries} from '../lib/chat-evidence-series.ts';
const filters={country:'all',org:'all',level:'all'},hostname='people-analytics-test-ed-56dc.vercel.app';
// Public CI has no private source bundle. This deliberately authored fixture uses
// 1,000 people per BU, simple integer exits and 13.6% voluntary turnover for the
// selected winner. It is not an export of private source records. Both modes use
// the real aggregate reader, denominator reconciliation and chart validation.
function fixtureBinding(){
 const digest='a'.repeat(64),identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest};
 const codes=['BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH'];
 const exits=[100,80,60,70,90,160,50,40],voluntary=[70,60,40,50,60,136,30,20];
 const rows=codes.map((org_code,i)=>({org_code,org_name:org_code,exits:exits[i],voluntary_exits:voluntary[i],voluntary_turnover_ytd_pct:voluntary[i]/10}));
 const total=exits.reduce((a,b)=>a+b,0),voluntaryTotal=voluntary.reduce((a,b)=>a+b,0);
 const attrition={as_of:P.cutoff,data_meta:public9037Metadata(digest),business_units:rows,summary:{total_exits:total,voluntary_exits:voluntaryTotal,total_turnover_ytd_pct:Math.round(1000*total/8000)/10}};
 return {router:{current:()=>identity,bootstrapToken:async()=>P.token},handle:async request=>{
  const url=new URL(request.url);let data;
  if(url.pathname==='/api/attrition')data=attrition;
  else{
   assert.equal(url.pathname,'/api/dashboard');const org=url.searchParams.get('org'),i=codes.indexOf(org);assert.ok(org==='all'||i>=0);
   const headcount=org==='all'?8000:1000,v=org==='all'?voluntaryTotal:voluntary[i],scope={country:'all',org,level:'all'};
   data={data_meta:public9037Metadata(digest),workforce_filter_scope:{status:'verified_public_aggregate',requested:scope,effective:scope,cutoff:P.cutoff},turnover_evidence:{contract:'voluntary-ytd-nine-month-average-stock-v2',calendar_months:9,status:'available',voluntary_exits:v,sum_month_end_headcount:headcount*9,average_month_end_headcount:headcount,rate_pct:Math.round(1000*v/headcount)/10},trend:Array.from({length:9},(_,j)=>({snapshot_date:new Date(Date.UTC(2026,j+1,0)).toISOString().slice(0,10),headcount}))};
  }
  return Response.json(data,{headers:{'x-workforce-dataset':P.token}});
 }};
}
const actualSource=existsSync(path.join(process.cwd(),'.private-9037','integrity-manifest.json'));
const binding=actualSource?await loadPublic9037Binding({hostname,production:false}):fixtureBinding(),identity=binding.router.current();
console.log('BU comparison evidence mode: '+(actualSource?'local validated source':'authored public CI fixture'));
const prior=[{id:'year-question',role:'user',text:'What was total turnover last year?'},{id:'year-answer',role:'assistant',text:'2025 company-wide turnover.'}];
const request=(text,turns=prior)=>({version:1,requestId:'bu-followup',goal:{id:'',statement:''},scope:'Company-wide',filters,timeZone:'UTC',evidence:buildHomePack({},'Company-wide',text),goalContext:null,selectedId:null,catalog:null,state:{...emptySolutionState(),turns},message:{id:'current-question',text}});
let reads=0;
const read=(args,signal)=>readDatasetQuestions(args,{signal,comparison:query=>{reads++;return readPublicHomeAggregate({binding,hostname,identity,filters,args:query,signal,requestId:'bu-followup'});}});
const runtime={readDatasetQuestions:read,complete:()=>assert.fail('no provider request'),loadProjection:()=>assert.fail('no projection')};

test('proves the legacy monthly path rejects a supported BU question; new route takes priority',()=>{
 assert.equal(turnoverIntent('Show voluntary turnover by business unit',[]).kind,'unsupported');
 assert.equal(businessUnitTurnoverIntent('Show voluntary turnover by business unit').comparison.metric,'voluntary_turnover_ytd_pct');
});
test('standalone BU question after last-year exchange uses explicitly dated current source, with complete chart and unchanged state',async()=>{
 const start=reads,reply=await converseSolutions(request('Show voluntary turnover by business unit'),runtime,new AbortController().signal);
 assert.equal(reads,start+1);assert.equal(reply.usage.modelRounds,0);assert.equal(reply.charts.length,1);assert.equal(reply.charts[0].points.length,8);
 assert.equal(readChatEvidenceSeries(reply.charts,'bu-followup',P.token).length,1);assert.match(reply.answer,/Voluntary YTD turnover/);assert.match(reply.answer,/January-September 2026/);assert.doesNotMatch(reply.answer,/2025|unsupported|cross-domain join/);
 const source=await(await binding.handle(new Request('https://'+hostname+'/api/attrition'))).json();
 const expected=source.business_units.map(r=>({code:r.org_code,value:r.voluntary_turnover_ytd_pct})).sort((a,b)=>b.value-a.value);
 assert.deepEqual(reply.charts[0].points.map(p=>({code:p.date,value:p.value})),expected);assert.equal(expected[0].code,'BU-MGSVC');assert.equal(expected[0].value,13.6);assert.deepEqual(reply.state.turns.slice(0,2),prior);assert.deepEqual(reply.state.working,[]);
});
test('rank plus generic drivers returns full chart, winner and investigation guidance without causal finding',async()=>{
 for(const text of ['Which business unit has the highest voluntary turnover, and what should an HR leader investigate before acting?','Which business unit has the highest attrition and what are the key drivers?','Show voluntary turnover by BU and possible drivers']){
  const reply=await converseSolutions(request(text),runtime,new AbortController().signal);
  assert.equal(reply.usage.modelRounds,0);assert.equal(reply.charts[0].points.length,8);assert.match(reply.answer,/What to investigate/);assert.match(reply.answer,/possible drivers/);assert.doesNotMatch(reply.answer,/caused by|management caused|not findings|cross-domain join/);
 }
});
test('explicit and elliptical historical followups never silently substitute current BU figures',async()=>{
 for(const text of ['Show voluntary turnover by business unit last year','And show voluntary turnover by business unit','What about by business unit?','Show voluntary turnover by business unit for that period','Show voluntary turnover by business unit in 2025']){
  const start=reads,reply=await converseSolutions(request(text),runtime,new AbortController().signal);assert.equal(reads,start);assert.equal(reply.usage.modelRounds,0);assert.equal(reply.charts.length,0);assert.match(reply.answer,/Would you like the available YTD comparison/);assert.doesNotMatch(reply.answer,/13\.6|cross-domain|supported stock/);
 }
 const reply=await converseSolutions(request('What about the latest voluntary turnover by business unit?'),runtime,new AbortController().signal);assert.equal(reply.charts[0].points.length,8);
});
test('unsupported metrics and ambiguous context clarify; qualified causal hypotheses remain ordinary questions',async()=>{
 const answer=await businessUnitTurnoverReply('Show involuntary turnover by business unit',[],()=>assert.fail('unsupported metric read'),new AbortController().signal);assert.match(answer.answer,/Choose total or voluntary/);
 const ambiguous=await businessUnitTurnoverReply('And show voluntary turnover by business unit',[],()=>assert.fail('ambiguous period read'),new AbortController().signal);assert.match(ambiguous.answer,/Do you mean/);
 for(const text of ['Which business unit has highest turnover and what should HR investigate in Canada?','Which business unit has highest turnover and did pay cause it?','Which business unit has highest turnover and create a hiring plan'])assert.equal(businessUnitTurnoverIntent(text,prior),null);
});
test('cancelled reads remain cancelled',async()=>{const c=new AbortController();c.abort();await assert.rejects(businessUnitTurnoverReply('Show voluntary turnover by business unit',[],()=>assert.fail('read after abort'),c.signal));});

test('accepting the explicit current-YTD offer preserves measure and reads current evidence; unrelated yes is untouched',async()=>{
 const first=await converseSolutions(request('Show voluntary turnover by business unit last year'),runtime,new AbortController().signal);
 const follow={...request('Yes please'),requestId:'bu-followup-next',message:{id:'accept-ytd',text:'Yes please'},state:first.state};
 const followRuntime={...runtime,readDatasetQuestions:(args,signal)=>readDatasetQuestions(args,{signal,comparison:query=>readPublicHomeAggregate({binding,hostname,identity,filters,args:query,signal,requestId:follow.requestId})})};
 const second=await converseSolutions(follow,followRuntime,new AbortController().signal);assert.equal(readChatEvidenceSeries(second.charts,follow.requestId,P.token).length,1);assert.equal(second.usage.modelRounds,0);assert.equal(second.charts[0].metric,'bu_voluntary_turnover_pct');assert.match(second.answer,/January-September 2026/);assert.equal(businessUnitTurnoverIntent('yes',prior),null);
});

test('matching explicit YTD windows use available evidence; full-year 2026 stays unavailable',async()=>{
 for(const period of ['2026 YTD','YTD 2026','January-September 2026','Jan through Sep 2026','as of 2026-09-30','as of September 30, 2026']){
  const reply=await businessUnitTurnoverReply('Show voluntary turnover by business unit '+period,prior,read,new AbortController().signal);assert.equal(reply.charts.length,1,period);assert.equal(reply.charts[0].points.length,8);
 }
 const reply=await businessUnitTurnoverReply('Show voluntary turnover by business unit for 2026',prior,()=>assert.fail('full year cannot use YTD'),new AbortController().signal);assert.match(reply.answer,/breakdown for 2026 is unavailable/);
});
test('repeated elliptical historical turns preserve pending date instead of switching to current',async()=>{
 let turns=prior;
 for(const text of ['And by business unit?','And voluntary turnover by business unit?','What about by business unit?']){
  const reply=await businessUnitTurnoverReply(text,turns,()=>assert.fail('must not silently substitute current'),new AbortController().signal);assert.ok(reply);assert.deepEqual(reply.charts,[]);assert.match(reply.answer,/available YTD comparison|Do you mean/);turns=[...turns,{role:'user',text},{role:'assistant',text:reply.answer}];
 }
 const reply=await businessUnitTurnoverReply('Show the latest voluntary turnover by business unit',turns,read,new AbortController().signal);assert.equal(reply.charts.length,1);
});
test('generic driver followup after actual BU ranking refreshes the comparison and gives hypotheses',async()=>{
 const first=await businessUnitTurnoverReply('Which business unit has highest voluntary turnover?',[],read,new AbortController().signal);
 const turns=[{role:'user',text:'Which business unit has highest voluntary turnover?'},{role:'assistant',text:first.answer}];
 const second=await businessUnitTurnoverReply('What is driving it?',turns,read,new AbortController().signal);assert.equal(second.charts.length,1);assert.match(second.answer,/What to investigate/);assert.match(second.answer,/possible drivers/);assert.doesNotMatch(second.answer,/caused by/);
});
test('an inherited named country cannot silently become a company-wide comparison',async()=>{
 const turns=[{role:'user',text:'What is voluntary turnover in Canada?'},{role:'assistant',text:'Canada turnover.'}];
 const reply=await businessUnitTurnoverReply('And by business unit?',turns,()=>assert.fail('country scope must not be discarded'),new AbortController().signal);assert.equal(reply.charts.length,0);assert.match(reply.answer,/Do you mean/);
});
