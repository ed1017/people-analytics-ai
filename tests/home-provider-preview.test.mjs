/** Isolated Preview policy and actual route, exclusively synthetic transports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviderPreviewGuard,providerPreviewEnabled,providerPreviewBranch,ProviderPreviewIncompleteError} from '../lib/home-provider-preview.ts';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {solutionRequest,final} from './fixtures/home-solution-conversation.mjs';
const policy={model:'gpt-6.1-sol',reasoning:{effort:'medium'},service_tier:'default',instructions:'unchanged',input:[],tools:[],text:{format:{type:'text'}},tool_choice:'auto',parallel_tool_calls:false,max_output_tokens:5000};
const signal=()=>new AbortController().signal;
const enabled={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:providerPreviewBranch,VERCEL_GIT_COMMIT_SHA:'fixture-exact-commit'};
const request=()=>new Request('https://offline.invalid/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':'legacy-v1:0'},body:JSON.stringify(solutionRequest('Summarize Employee Listening evidence.'))});
const reply=()=>({status:'completed',output:[],output_text:JSON.stringify(final('Employee Listening coverage is unavailable in this synthetic fixture.'))});
test('guard is isolated to exact Preview branch and consumes before dispatch',()=>{
 assert.equal(providerPreviewEnabled(enabled),true);
 for(const env of [{},{...enabled,VERCEL_ENV:'production'},{...enabled,VERCEL_GIT_COMMIT_REF:'main'}])assert.equal(providerPreviewEnabled(env),false);
 const guard=createProviderPreviewGuard();assert.deepEqual(guard(policy,signal()),{...policy,truncation:'disabled'});
 assert.throws(()=>guard(policy,signal()),ProviderPreviewIncompleteError);
 for(const patch of [{max_output_tokens:5001},{model:'other'},{service_tier:'priority'},{truncation:'auto'},{extra:true}])assert.throws(()=>createProviderPreviewGuard()({...policy,...patch},signal()),/Unsupported/);
 const aborted=new AbortController();aborted.abort();assert.throws(()=>createProviderPreviewGuard()(policy,aborted.signal));
});
test('policy probe proves identity and limits without provider or aggregate work',async()=>{
 const h=await offlineBusinessRoute();Object.assign(h.sandbox.process.env,enabled);h.sandbox.__forbidProvider=true;h.sandbox.__aggregateRead=()=>{throw Error('Forbidden aggregate read');};
 const response=h.get(),body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(body.commit,enabled.VERCEL_GIT_COMMIT_SHA);assert.equal(body.baseCommit,'2e6e160d85dfbacefbfd9d543c6356fb5b86f609');assert.deepEqual(body.limits,{contextTokens:1050000,outputTokens:5000,rounds:1,sdkRetries:0,continuations:0});assert.equal(h.sandbox.__providerConstructions,undefined);assert.equal(h.sandbox.__requests.length,0);
 h.sandbox.process.env.VERCEL_ENV='production';assert.equal(h.get().status,405);
});
test('actual route preserves provider request except explicit disabled truncation',async()=>{
 const h=await offlineBusinessRoute();h.sandbox.__replies.push(reply());assert.equal((await h.post(request())).status,200);const original=JSON.parse(JSON.stringify(h.sandbox.__requests[0]));
 Object.assign(h.sandbox.process.env,enabled);h.sandbox.__replies.push(reply());assert.equal((await h.post(request())).status,200);assert.deepEqual(JSON.parse(JSON.stringify(h.sandbox.__requests[1])),{...original,truncation:'disabled'});assert.equal(h.sandbox.__requestOptions[1].maxRetries,0);assert.equal(h.sandbox.__requestOptions[1].timeout,60000);
});
test('tool response stops before local execution or provider continuation',async()=>{
 const h=await offlineBusinessRoute();Object.assign(h.sandbox.process.env,enabled);h.sandbox.__replies.push({status:'completed',output:[{type:'function_call',call_id:'fixture-call',name:'project_headcount',arguments:'{}'}],output_text:''},reply());const response=await h.post(request());assert.equal(response.status,422);assert.equal((await response.json()).code,'preview_single_attempt_incomplete');assert.equal(h.sandbox.__requests.length,1);assert.equal(h.sandbox.__replies.length,1);
});
test('failed provider attempt is not retried',async()=>{
 const h=await offlineBusinessRoute();Object.assign(h.sandbox.process.env,enabled);const response=await h.post(request());assert.equal(response.status,422);assert.equal(h.sandbox.__requests.length,1);assert.equal(h.sandbox.__requestOptions[0].maxRetries,0);
});
test('legacy chat gate returns before dataset or model work on guarded Preview',async()=>{
 const {readFileSync}=await import('node:fs'),vm=await import('node:vm'),ts=await import('typescript');
 const source=ts.default.createSourceFile('route.ts',readFileSync('app/api/chat/route.ts','utf8'),ts.default.ScriptTarget.Latest,true);
 const post=source.statements.find(node=>ts.default.isFunctionDeclaration(node)&&node.name?.text==='POST').getText(source);
 const sandbox={exports:{},process:{env:enabled},providerPreviewEnabled,NextResponse:Response,withDatasetRequest:()=>{throw Error('Unexpected dataset access');}};
 vm.runInNewContext(ts.default.transpileModule(post,{compilerOptions:{module:ts.default.ModuleKind.CommonJS}}).outputText,sandbox);
 const response=await sandbox.exports.POST(request());assert.equal(response.status,503);assert.equal((await response.json()).code,'preview_guarded_endpoint_required');
});
