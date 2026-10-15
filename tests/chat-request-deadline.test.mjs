import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {setImmediate} from 'node:timers/promises';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {createChatRequestDeadline,CHAT_REQUEST_BUDGET_MS} from '../lib/chat-request-deadline.ts';
import {HOME_ACTION_REQUEST} from '../lib/home-action-proposal.ts';
import {HOME_BUNDLE_REQUEST} from '../lib/home-bundle-preparation.ts';

function clock(){
 let now=0,id=0;const timers=new Map();
 return {now:()=>now,setTimer:(fn,ms)=>{const token=++id;timers.set(token,{fn,at:now+ms});return token;},clearTimer:token=>timers.delete(token),size:()=>timers.size,
 advance(ms){now+=ms;for(const [token,timer]of [...timers])if(timer.at<=now){timers.delete(token);timer.fn();}}};
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
test('one deadline shrinks across rounds, rejects late results and prevents new work',async()=>{
 const c=clock(),request=new AbortController(),d=createChatRequestDeadline(request.signal,c);
 assert.equal(d.options().timeout,60000);assert.equal(d.options().maxRetries,0);
 assert.equal(await d.run(()=>42),42);c.advance(12000);assert.equal(d.options().timeout,48000);
 const late=deferred(),pending=d.run(()=>late.promise);await setImmediate();const rejected=assert.rejects(pending,{code:'timeout'});
 c.advance(48000);await rejected;assert.equal(d.options.bind(d) instanceof Function,true);assert.throws(()=>d.options(),{code:'timeout'});
 let called=false;await assert.rejects(d.run(()=>{called=true;}),{code:'timeout'});assert.equal(called,false);
 late.resolve('obsolete');await setImmediate();assert.equal(d.failure().code,'timeout');d.dispose();assert.equal(c.size(),0);
});
test('client cancellation wins, detaches listeners/timers and does not expose abort reasons',async()=>{
 const c=clock(),request=new AbortController(),d=createChatRequestDeadline(request.signal,c),pending=d.run(()=>new Promise(()=>{}));
 const rejected=assert.rejects(pending,error=>error.code==='cancelled'&&!error.message.includes('private reason'));
 request.abort('private reason');await rejected;assert.equal(d.options.bind(d) instanceof Function,true);d.dispose();assert.equal(c.size(),0);
 const other=new AbortController(),done=createChatRequestDeadline(other.signal,c);await done.run(()=>1);done.dispose();other.abort();assert.equal(done.failure(),null);assert.equal(c.size(),0);
});

const out=await fs.mkdtemp(path.join(os.tmpdir(),'chat-deadline-route-')),isolation=path.join(out,'isolation.ts');
// Offline test fixture only: no SDK, source service or paid transport exists here.
await fs.writeFile(isolation,`export default class OpenAI {responses={create:async(request,options)=>{globalThis.__requests.push(request);globalThis.__options.push(options);return globalThis.__model(request,options);}}}
export const openAIProxyTransport=()=>({});export const peopleAnalyticsTools=[];
export const runPeopleAnalyticsTool=(...args)=>globalThis.__tool(...args);
export const NextResponse={json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{'content-type':'application/json'}})};`);
const compiler=webpackPackage.webpack({mode:'development',devtool:false,target:'node',entry:path.resolve('app/api/chat/route.ts'),output:{path:out,filename:'route.cjs',library:{type:'commonjs2'}},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'openai$':isolation,'next/server$':isolation,'@/lib/openai-proxy-transport$':isolation,'../../../lib/people-analytics-tools$':isolation,'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(path.join(out,'route.cjs'),'utf8'),require=createRequire(import.meta.url);
function harness(){
 const c=clock(),requests=[],options=[];
 const sandbox={exports:{},require:id=>id==='node:timers'?{setTimeout:c.setTimer,clearTimeout:c.clearTimer}:require(id),Response,Request,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,console,Date:class extends Date{static now(){return c.now();}},process:{env:{OPENAI_API_KEY:'offline-only',NEXT_PUBLIC_GOAL_PROGRESS:'true',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true'}},__requests:requests,__options:options,__model:()=>new Promise(()=>{}),__tool:()=>new Promise(()=>{}),fetch:()=>{throw Error('Network forbidden');}};
 sandbox.module={exports:sandbox.exports};vm.createContext(sandbox);vm.runInContext('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));\n'+bundle,sandbox);
 return {c,sandbox,requests,options,post(body,signal=new AbortController().signal){const request=new Request('http://offline.invalid/api/chat',{method:'POST',signal,headers:{'content-type':'application/json'},body:JSON.stringify(body)});request.json=async()=>vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(body))})`,sandbox);return sandbox.module.exports.POST(request);}};
}
const context={snapshotDate:'2026-09-30',country:'all',businessUnit:'all',level:'all',headcount:5,fte:5,voluntaryTurnoverYtdPct:null,laborCostUsd:null,openPositions:null,headcountGrowthPct:null,trendStart:null,trendEnd:null};
const base={page:'workforce-planning',persona:'HR',goalId:'support',goalContext:{goal:'Plan support capacity'},message:'Explain the current calculation',history:[],context};
async function until(predicate){for(let i=0;i<50&&!predicate();i++)await setImmediate();assert.ok(predicate(),'Expected offline operation to start');}
test('all initial provider paths get zero retries, cancellation and the shared deadline, including swallowed bundle errors',async()=>{
 const cases=[base,{...base,pageEvidenceAvailable:false},{...base,page:'labor-market',intelligenceContext:{}},{...base,page:'development-planning'},... [HOME_ACTION_REQUEST,HOME_BUNDLE_REQUEST].map(message=>({...base,page:'home',message,hasFocusedIssue:true,overviewBriefingContext:{sources:[]}}))];
 for(const body of cases){
  const h=harness(),late=deferred();h.sandbox.__model=()=>late.promise;
  const pending=h.post(body);await until(()=>h.requests.length===1);
  assert.equal(h.options[0].maxRetries,0);assert.equal(h.options[0].timeout,60000);assert.equal(h.options[0].signal.aborted,false);
  h.c.advance(CHAT_REQUEST_BUDGET_MS);const response=await pending;assert.equal(response.status,504,JSON.stringify(body));assert.equal((await response.json()).code,'timeout');
  assert.equal(h.options[0].signal.aborted,true);assert.equal(h.c.size(),0);
  late.resolve({status:'completed',output:[],output_text:'late'});await setImmediate();assert.equal(h.requests.length,1);
 }
});
test('hanging tools cannot hold the route or start a continuation after expiry',async()=>{
 const h=harness(),late=deferred();let tools=0;
 h.sandbox.__model=()=>({id:'initial',status:'completed',output:[{type:'function_call',name:'synthetic',call_id:'tool',arguments:'{}'}]});
 h.sandbox.__tool=()=>{tools++;return late.promise;};const pending=h.post(base);await until(()=>tools===1);
 h.c.advance(60000);assert.equal((await pending).status,504);late.resolve({value:123});await setImmediate();assert.equal(h.requests.length,1);assert.equal(h.c.size(),0);
});
test('continuation uses remaining budget and client cancellation stops late provider output',async()=>{
 const h=harness(),late=deferred(),client=new AbortController();
 h.sandbox.__model=()=>h.requests.length===1?{id:'initial',status:'completed',output:[{type:'function_call',name:'synthetic',call_id:'tool',arguments:'{}'}]}:late.promise;
 h.sandbox.__tool=()=>{h.c.advance(15000);return {value:1};};const pending=h.post(base,client.signal);await until(()=>h.requests.length===2);
 assert.equal(h.options[1].timeout,45000);assert.equal(h.options[1].maxRetries,0);assert.equal(h.options[0].signal,h.options[1].signal);
 client.abort();const response=await pending;assert.equal(response.status,499);assert.equal((await response.json()).code,'cancelled');assert.equal(h.options[1].signal.aborted,true);
 late.resolve({status:'completed',output:[],output_text:'obsolete'});await setImmediate();assert.equal(h.requests.length,2);assert.equal(h.c.size(),0);
});
test('success and validation exits clean up; already cancelled requests do not call provider',async()=>{
 const h=harness();h.sandbox.__model=()=>({status:'completed',output:[],output_text:JSON.stringify({answer:{discussion:'A bounded explanation.'}})});
 assert.equal((await h.post(base)).status,200);assert.equal(h.c.size(),0);
 assert.equal((await h.post({...base,capacityContext:{invalid:true}})).status,400);assert.equal(h.c.size(),0);
 const client=new AbortController();client.abort();assert.equal((await h.post(base,client.signal)).status,499);assert.equal(h.requests.length,1);assert.equal(h.c.size(),0);
 const app=await fs.readFile('app/page.tsx','utf8');assert.match(app,/if \(!response.ok\)/);assert.match(app,/setChatInput\(current => current.trim\(\) \? current : message\)/);
});
