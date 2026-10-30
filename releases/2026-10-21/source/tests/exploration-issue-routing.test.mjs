import test from 'node:test';import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {emptySolutionState} from '../lib/home-solution-conversation.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {readDatasetQuestions} from '../lib/home-dataset-query.mjs';
import {readPublicHomeAggregate} from '../lib/public-home-aggregate.server.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const question='Which business units have the most open positions and the longest average time to fill?';
const digest='a'.repeat(64),hostname='people-analytics-test-ed-56dc.vercel.app',identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest};
const data=()=>({as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{applications:60,hires:60},business_units:[{org_code:'A',org_name:'Alpha',applications:10,hires:10,open_positions:12,avg_time_to_fill_days:20},{org_code:'B',org_name:'Beta',applications:20,hires:20,open_positions:4,avg_time_to_fill_days:55},{org_code:'C',org_name:'Gamma',applications:30,hires:30,open_positions:8,avg_time_to_fill_days:35}]});
const parts=['open_positions','avg_time_to_fill_days'].map(metric=>({kind:'comparison',history:null,comparison:{registryId:'recruiting.business_units',metric,order:'descending',limit:3,scope:'company-wide',asOf:'current'}}));
async function run({filters={country:'all',org:'all',level:'all'},alter=()=>{}}={}){
 const payload=data();alter(payload);const calls=[],reads=[];let completions=0;
 const request={version:1,requestId:'recruiting-dual-qa',goal:{id:'',statement:''},scope:'Selected workforce snapshot: Global workforce; All business units; All levels',filters,timeZone:'UTC',evidence:buildHomePack({},'Company-wide'),goalContext:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'recruiting-dual-question',text:question}};
 const binding={router:{current:()=>identity,bootstrapToken:()=>P.token},handle:async req=>{reads.push(new URL(req.url).pathname);assert.equal(new URL(req.url).pathname,'/api/talent-acquisition');assert.equal(req.headers.get('x-workforce-dataset'),P.token);return Response.json(payload,{headers:{'x-workforce-dataset':P.token}});}};
 const reply=await converseSolutions(request,{now:()=>new Date('2026-10-30T00:00:00.000Z'),complete:async(input)=>{completions++;if(completions>1)throw Error(JSON.stringify(input.at(-1)));assert.match(JSON.stringify(input),/Which business units have the most open positions and the longest average time to fill\?/);return {items:[],completed:true,text:'',calls:[{id:'both-recruiting-metrics',name:'read_dataset_questions',arguments:JSON.stringify({parts})}]};},loadProjection:()=>{throw Error('Recruiting must not invoke a staffing projection');},readDatasetQuestions:(args,signal)=>{calls.push(structuredClone(args));return readDatasetQuestions(args,{signal,history:()=>{throw Error('No requested workforce history');},comparison:args=>readPublicHomeAggregate({binding,hostname,identity,filters,args,signal,requestId:request.requestId})});}},new AbortController().signal);
 return {reply,request,calls,reads,completions};
}
test('actual solution service routes the two-part recruiting prompt and retains both ranked metrics',async()=>{
 const {reply,request,calls,reads,completions}=await run();assert.equal(completions,1);assert.deepEqual(calls,[{parts}]);assert.deepEqual(reads,['/api/talent-acquisition','/api/talent-acquisition']);assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});
 assert.match(reply.answer,/Part 1/);assert.match(reply.answer,/Part 2/);assert.match(reply.answer,/1\. Alpha: 12 positions/);assert.match(reply.answer,/1\. Beta: 55 days/);assert.match(reply.answer,/average completed fill duration/i);assert.match(reply.answer,/Company-wide/);assert.match(reply.answer,/2026-09-30/);assert.doesNotMatch(reply.answer,/caused by|because of|will take|median time|available candidates/i);
 assert.equal(reply.state.turns.at(-2).text,question);assert.equal(reply.state.turns.at(-1).text,reply.answer);assert.deepEqual(reply.candidateIds,[]);assert.equal(reply.charts.length,2);assert.deepEqual(reply.charts.map(chart=>chart.unit),['positions','days']);assert.deepEqual(request.state.turns,[]);
});
test('selected geography is not silently replaced with company-wide recruiting rankings',async()=>{const {reply,reads}=await run({filters:{country:'US',org:'all',level:'all'}});assert.match(reply.answer,/Part 1/);assert.match(reply.answer,/Part 2/);assert.match(reply.answer,/Clear the workforce filters/);assert.doesNotMatch(reply.answer,/Alpha: 12|Beta: 55/);assert.deepEqual(reads,[]);});
test('missing time-to-fill value does not discard open positions or become zero days',async()=>{const {reply}=await run({alter:d=>d.business_units[1].avg_time_to_fill_days=null});assert.match(reply.answer,/Alpha: 12 positions/);assert.match(reply.answer,/Gamma: 35 days/);assert.doesNotMatch(reply.answer,/Beta: (55|0) days/);assert.match(reply.answer,/1 groups excluded/);});
test('changed source provenance fails instead of returning a partially verified answer',async()=>{await assert.rejects(run({alter:d=>d.data_meta.bundleDigest='b'.repeat(64)}));});



