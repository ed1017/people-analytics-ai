/** Real routes and grounding; synthetic query/provider transports, no network or database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {buildHomePack} from '../lib/home-pack.mjs';
import {solutionGroundingLimits} from '../lib/home-solution-grounding.mjs';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
const stamp='2026-10-11T00:00:00.000Z',token='legacy-v1:0';
const tables=['current_summary','engagement_trend','dimension_summary','business_unit_summary','exit_reason_summary'].map(s=>'survey_listening_'+s);
const retained=tables.filter(t=>!t.endsWith('business_unit_summary'));
const clean=value=>JSON.parse(JSON.stringify(value));
async function harness(full=false){
 const out=await fs.mkdtemp(path.join(os.tmpdir(),'survey-grounding-')),isolation=path.resolve('tests/fixtures/survey-grounding-isolation.ts'),provider=path.resolve('tests/fixtures/home-route-isolation.ts');
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',plugins:[new webpackPackage.webpack.optimize.LimitChunkCountPlugin({maxChunks:1})],entry:path.resolve('tests/fixtures/survey-grounding-entry.ts'),output:{path:out,filename:'fixture.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.ts','.mjs','.js'],alias:{'next/server$':isolation,'./supabase-server$':isolation,'../../../lib/supabase-server$':isolation,'@/lib/supabase-server$':isolation,'openai$':provider,'@/lib/openai-proxy-transport$':provider,...(full?{'./survey-sentiment-reader$':path.resolve('tests/fixtures/survey-grounding-full-reader.ts')}:{}) ,'@':process.cwd()}},module:{rules:[{test:/\.ts$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
 const sandbox={exports:{},require:createRequire(import.meta.url),Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,AbortSignal,setTimeout,clearTimeout,crypto:globalThis.crypto,structuredClone,Date:class extends Date{constructor(...args){super(...(args.length?args:[stamp]));}},console:{info(){},error(){}},process:{env:{OPENAI_API_KEY:'synthetic-only',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true'}},__requests:[],__replies:[],__requestOptions:[],fetch:()=>{throw Error('Network forbidden');}};
 sandbox.module={exports:sandbox.exports};vm.runInNewContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+await fs.readFile(path.join(out,'fixture.cjs'),'utf8'),sandbox);
 return {api:sandbox.module.exports,sandbox,calls:[]};
}
const h=await harness(),old=await harness(true);
const signal=()=>new AbortController().signal;
const req=(header=token,abort=signal())=>new Request('http://offline.invalid/api/survey-sentiment',{headers:{'x-workforce-dataset':header},signal:abort});
function rows(){return {
 [tables[0]]:{as_of:'2026-09-30',engagement_respondents:'73',engagement_eligible_population:'100',engagement_participation_pct:'73',engagement_favorable_pct:'26.5',exit_respondents:'10'},
 [tables[1]]:Array.from({length:5},(_,i)=>({survey_code:'ENG-'+i,survey_name:'Synthetic survey '+i,launch_date:'2026-0'+(i+1)+'-01',close_date:'2026-0'+(i+1)+'-20',denominator_snapshot_date:'2026-01-01',respondents:'73',eligible_population:'100',participation_pct:'73',avg_score:'2',favorable_pct:'26.5'})),
 [tables[2]]:['ENG-2026','PULSE-2026-Q2','MGR-2026','ONB-30','ONB-60','ONB-90','EXIT'].map(survey_code=>({survey_code,survey_name:'Synthetic '+survey_code,survey_type:'fixture',question_code:'CAREER',dimension:'Career',question_text:'Synthetic question',employee_respondents:'73',candidate_respondents:null,separation_respondents:'10',avg_score:'2',favorable_pct:'20'})),
 [tables[3]]:[{org_code:'SYN',org_name:'Synthetic unit',respondents:'12',avg_score:'3',favorable_pct:'30'}],
 [tables[4]]:Array.from({length:4},(_,i)=>({primary_reason:'Synthetic reason '+i,exits:String(4-i),pct_of_exit_responses:String(40-i*10)})),
};}
function setup(target=h,data=rows(),fail=null){target.calls.length=0;target.sandbox.__requests.length=0;target.sandbox.__replies.length=0;target.sandbox.__query=async(table,operations)=>{assert.ok(tables.includes(table),'unexpected relation');target.calls.push({table,operations:clean(operations)});return fail?.table===table?{data:null,error:fail.error}:{data:structuredClone(data[table]),error:null};};}
const bodyFor=(data,goal='Summarize survey participation and exit feedback.')=>{const body=solutionRequest(goal||'Summarize evidence.');body.evidence=buildHomePack({'survey-sentiment':{status:'loaded',data}},body.scope,goal);return body;};
const ground=(target,body,abort=signal())=>target.api.withDatasetRequest(req(),async()=>Response.json(await target.api.groundSolutionRequest(body,abort))).then(r=>r.json());
const post=(target,body)=>target.api.POST(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'x-workforce-dataset':token},body:JSON.stringify(body)}));
const reply=()=>({status:'completed',output:[],output_text:JSON.stringify(final('Review survey dates and populations before choosing a next step.'))});

test('public GET retains five query contracts and full response; internal reader omits only business units',async()=>{
 setup();const response=await h.api.GET(req()),full=await response.json(),fullCalls=clean(h.calls);
 assert.deepEqual(h.calls.map(c=>c.table),tables);
 assert.deepEqual(h.calls.map(c=>c.operations),[[['select','*'],['single']],[['select','*'],['order','launch_date',{ascending:true}]],[['select','*']],[['select','*'],['order','favorable_pct',{ascending:true}]],[['select','*'],['order','exits',{ascending:false}]]]);assert.equal(response.headers.get('x-workforce-dataset'),token);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(full.business_units,[{org_code:'SYN',org_name:'Synthetic unit',respondents:12,avg_score:3,favorable_pct:30}]);assert.equal(full.engagement_dimensions.length,1);assert.equal(full.onboarding_dimensions.length,3);assert.equal(full.exit_dimensions.length,1);assert.equal(full.exit_enps,null);
 assert.deepEqual(full.engagement_trend,rows()[tables[1]].map(row=>({...row,respondents:73,eligible_population:100,participation_pct:73,avg_score:2,favorable_pct:26.5})));
 setup();const internal=await h.api.readHomeSurveyEvidence(req()),reduced=await internal.json();
 assert.deepEqual(h.calls,fullCalls.filter(c=>retained.includes(c.table)));assert.equal(internal.headers.get('x-workforce-dataset'),token);assert.equal(internal.headers.get('cache-control'),'no-store');assert.deepEqual(reduced,{...full,business_units:[]});
 for(const goal of ['', 'engagement participation','exit survey reasons','career question'])assert.deepEqual(bodyFor(reduced,goal).evidence,bodyFor(full,goal).evidence);
});

test('real grounding keeps packet/hash and actual POST provider payload equal to full-reader path',async()=>{
 setup();const full=await (await h.api.GET(req())).json(),body=bodyFor(full),before=JSON.stringify(body);
 setup(old);const previous=await ground(old,body);assert.equal(old.calls.length,5);
 setup();const current=await ground(h,body);assert.deepEqual(clean(current),clean(previous));assert.match(current.packetSha256,/^[a-f0-9]{64}$/);assert.equal(h.calls.length,4);assert.equal(JSON.stringify(body),before);
 await ground(h,body);assert.equal(h.calls.length,8,'no caching of verification');
 for(const target of [old,h]){setup(target);target.sandbox.__replies.push(reply());const response=await post(target,body);assert.equal(response.status,200,JSON.stringify(await response.json()));assert.equal(target.sandbox.__requests.length,1);}
 assert.equal(old.calls.length,5);assert.equal(h.calls.length,4);assert.deepEqual(clean(h.sandbox.__requests),clean(old.sandbox.__requests));assert.deepEqual(solutionGroundingLimits,{readers:2,timeoutMs:30000});
});

test('changed retained facts, dates, denominators and sampled exit evidence fail before provider dispatch',async()=>{
 setup();const body=bodyFor(await (await h.api.GET(req())).json());
 for(const mutate of [d=>d[tables[0]].engagement_favorable_pct='99',d=>d[tables[0]].as_of='2026-10-01',d=>d[tables[1]][4].close_date='2026-06-01',d=>d[tables[1]][4].denominator_snapshot_date='2025-01-01',d=>d[tables[1]][4].eligible_population='200',d=>d[tables[4]][0].exits='9',d=>d[tables[2]].at(-1).avg_score='5']){
  const data=rows();mutate(data);setup(h,data);await assert.rejects(ground(h,body),error=>error.diagnostic?.trigger==='facts_changed');const response=await post(h,body);assert.equal(response.status,503);assert.equal(h.sandbox.__requests.length,0);
 }
});

test('retained read failures stay fail-closed; omitted dependency cannot fail Home but still fails public GET',async()=>{
 setup();const body=bodyFor(await (await h.api.GET(req())).json());
 for(const table of retained)for(const error of [Error('PRIVATE_DETAIL'),{code:'PGRST303',message:'PRIVATE_DETAIL'}]){
  setup(h,rows(),{table,error});const response=await h.api.readHomeSurveyEvidence(req());assert.equal(response.status,error.code?503:500);assert.doesNotMatch(JSON.stringify(await response.json()),/PRIVATE_DETAIL/);
  await assert.rejects(ground(h,body),e=>e.diagnostic?.trigger==='reader_failed');assert.equal((await post(h,body)).status,503);assert.equal(h.sandbox.__requests.length,0);
 }
 setup(h,rows(),{table:tables[3],error:Error('UNUSED')});assert.equal((await h.api.GET(req())).status,500);assert.equal((await h.api.readHomeSurveyEvidence(req())).status,200);await ground(h,body);
 setup(h,{...rows(),[tables[0]]:null});assert.equal((await h.api.readHomeSurveyEvidence(req())).status,500);
});

test('dataset mismatch and cancellation still stop grounding; suppressed packet facts remain suppressed',async()=>{
 setup();const body=bodyFor(await (await h.api.GET(req())).json());
 setup();assert.equal((await h.api.readHomeSurveyEvidence(req('legacy-v1:1'))).status,409);assert.equal(h.calls.length,0);
 const aborted=new AbortController();aborted.abort();await assert.rejects(ground(h,body,aborted.signal),e=>e.diagnostic?.trigger==='cancelled');assert.equal(h.calls.length,0);
 const controller=new AbortController();let release,started;const began=new Promise(r=>{started=r;});const blocked=new Promise(r=>{release=r;});h.sandbox.__query=async table=>{started();await blocked;return {data:rows()[table],error:null};};
 const pending=ground(h,body,controller.signal);await began;controller.abort();await assert.rejects(pending,e=>e.diagnostic?.trigger==='cancelled');release();
 const data=await (async()=>{setup();return (await h.api.GET(req())).json();})();data.suppressed=true;const packet=bodyFor(data).evidence;assert.ok(packet.sources.find(s=>s.id==='S2').facts.rows.every(row=>row.exits===null&&row.avg_score===null));
});
