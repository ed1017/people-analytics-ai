/** Real dashboard and grounding modules; RPCs are in-memory and all network is forbidden. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {buildHomePack} from '../lib/home-pack.mjs';
import {verifySolutionEvidence,solutionGroundingLimits} from '../lib/home-solution-grounding.mjs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {performanceWireFixture} from './fixtures/workforce-performance-release.mjs';
const out=await fs.mkdtemp(path.join(os.tmpdir(),'dashboard-grounding-')),isolation=path.resolve('tests/fixtures/dashboard-grounding-isolation.ts');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',plugins:[new webpackPackage.webpack.optimize.LimitChunkCountPlugin({maxChunks:1})],entry:path.resolve('tests/fixtures/dashboard-grounding-entry.ts'),output:{path:out,filename:'fixture.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.ts','.mjs','.js'],alias:{'@':process.cwd(),'next/server$':isolation,'./supabase-server$':isolation,'../../../lib/supabase-server$':isolation,'@/lib/supabase-server$':isolation}},module:{rules:[{test:/\.ts$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const stamp='2026-10-11T00:00:00.000Z',calls=[],logs=[];
const sandbox={exports:{},require:createRequire(import.meta.url),Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,AbortSignal,setTimeout,clearTimeout,crypto:globalThis.crypto,structuredClone,Date:class extends Date{constructor(...args){super(...(args.length?args:[stamp]));}},console:{error:(...args)=>logs.push(args)},fetch:()=>{throw Error('Network forbidden');}};sandbox.module={exports:sandbox.exports};
vm.runInNewContext(await fs.readFile(path.join(out,'fixture.cjs'),'utf8'),sandbox);const api=sandbox.module.exports;
const token='legacy-v1:0',signal=()=>new AbortController().signal;
const payload=()=>({overview:{snapshot_date:'2026-09-30',headcount:10000,fte:9999},trend:[{snapshot_date:'2026-09-30',headcount:10000,fte:9999}],filter_options:{countries:[{value:'US',label:'United States'}],business_units:[],levels:[]}});
function setup(data=payload(),fail=null){calls.length=0;logs.length=0;sandbox.__rpc=async(name,args,signal)=>{calls.push({name,args,signal});signal.throwIfAborted();if(fail)throw fail;return {data:name==='dashboard_overview_filtered'?data:performanceWireFixture(),error:null};};}
const req=(query='country=all&org=all&level=all',header=token,abort=signal())=>Object.assign(new Request('http://offline.invalid/api/dashboard?'+query,{headers:{'x-workforce-dataset':header},signal:abort}),{nextUrl:new URL('http://offline.invalid/api/dashboard?'+query)});
const ground=async(body,abort=signal())=>(await api.withDatasetRequest(req(),async()=>Response.json(await api.groundSolutionRequest(body,abort)))).json();
const bodyFor=data=>{const body=solutionRequest('Summarize the workforce evidence.');body.evidence=buildHomePack({dashboard:{status:'loaded',data}},body.scope);return body;};

test('normal GET enriches; real Home grounding uses one fresh RPC and identical packet/provider input',async()=>{
 setup();const response=await api.GET(req()),full=await response.json();assert.ok(full.performance_rating);assert.deepEqual(calls.map(c=>c.name),['dashboard_overview_filtered','workforce_performance_release_v1']);
 assert.equal(response.headers.get('x-workforce-dataset'),token);assert.equal(response.headers.get('cache-control'),'no-store');
 const body=bodyFor(full),before=JSON.stringify(body);setup();const overviewResponse=await api.readDashboardOverview(req()),overview=await overviewResponse.json();
 assert.deepEqual(calls.map(c=>c.name),['dashboard_overview_filtered']);assert.equal(overview.performance_rating,undefined);assert.equal(overviewResponse.headers.get('x-workforce-dataset'),token);assert.equal(overviewResponse.headers.get('cache-control'),'no-store');
 assert.deepEqual(bodyFor(overview).evidence,body.evidence);
 const old=await verifySolutionEvidence(body,{datasetToken:token,now:()=>new Date(stamp),read:async()=>({status:'loaded',data:full})},signal());
 setup();const fresh=await ground(body);assert.deepEqual(calls.map(c=>c.name),['dashboard_overview_filtered']);assert.deepEqual(JSON.parse(JSON.stringify(fresh)),old);assert.equal(JSON.stringify(body),before);
 const run=async grounding=>{const runtime=fixtureRuntime([final('Review the supplied workforce scope before acting.')]);runtime.grounding=grounding;await converseSolutions(body,runtime,signal());return runtime.contexts;};
 assert.deepEqual(await run(fresh),await run(old));
 await ground(body);assert.equal(calls.length,2,'each grounding operation performs a fresh read');
 assert.deepEqual(solutionGroundingLimits,{readers:2,timeoutMs:30000});
});

test('scope filters, unavailable scope, changed facts and dataset mismatch retain rejection',async()=>{
 setup();const scoped=await api.readDashboardOverview(req('country=US&org=all&level=all'));assert.equal((await scoped.json()).workforce_filter_scope.effective.country,'US');assert.equal(calls[0].args.p_country_code,'US');
 setup();const full=await (await api.GET(req())).json(),body=bodyFor(full);
 for(const [change,trigger] of [[data=>data.overview.headcount++,'facts_changed'],[data=>data.applied_filters={country:'US',org:'all',level:'all'},'scope_mismatch'],[data=>{data.overview=null;data.trend=[];},'scope_mismatch']]){const data=payload();change(data);setup(data);await assert.rejects(ground(body),error=>error.diagnostic?.trigger===trigger);assert.equal(calls.length,1);}
 setup();const stale=await api.readDashboardOverview(req('', 'legacy-v1:1'));assert.equal(stale.status,409);assert.equal(calls.length,0);
 setup();const invalid=await api.readDashboardOverview(req('country=ZZ'));const data=await invalid.json();assert.equal(data.overview,null);assert.equal(data.workforce_filter_scope.status,'unsupported');assert.equal(calls.length,1);
});

test('source/auth failures remain sanitized; cancellation prevents or aborts work',async()=>{
 setup();const body=bodyFor(await (await api.GET(req())).json());
 for(const error of [Error('PRIVATE_DB_DETAIL'),{code:'PGRST303',message:'PRIVATE_DB_DETAIL'}]){setup(payload(),error);const response=await api.readDashboardOverview(req());assert.equal(response.status,error.code?503:500);assert.ok(!JSON.stringify(await response.json()).includes('PRIVATE_DB_DETAIL'));await assert.rejects(ground(body),e=>e.diagnostic.trigger==='reader_failed'&&e.diagnostic.readFailure===(error.code?'source_authentication':'http_error'));}
 setup();const already=new AbortController();already.abort();await assert.rejects(ground(body,already.signal),error=>error.diagnostic?.trigger==='cancelled');assert.equal(calls.length,0);
 const controller=new AbortController();let seen;
 sandbox.__rpc=async(_name,_args,s)=>{seen=s;return new Promise((_,reject)=>s.addEventListener('abort',()=>reject(Error('fixture abort')),{once:true}));};
 const pending=ground(body,controller.signal);while(!seen)await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(pending,error=>error.diagnostic?.trigger==='cancelled');assert.equal(seen.aborted,true);
});
