/** Actual Home UI → unchanged body → actual POST, synthetic transports only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {dismissHomeOnboarding} from '../tests/browser/dismiss-home-onboarding.mjs';
import {compileRoute,loadRoute} from './route.mjs';
import {createBoundary,model} from './run.mjs';
import {ordinaryClientRequest} from './client-request.mjs';
import {fixture,checkReply} from './fixture.mjs';
import {successfulSteps} from './offline-replies.mjs';
import {DECISIONS_STORAGE_KEY} from '../lib/local-decisions.ts';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'home-natural-acceptance-ui-')),root=process.cwd();
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.join(root,'tests/fixtures/swp-editor-full-client.tsx'),output:{path:output,filename:'client.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':root}},plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':'"true"','process.env.NEXT_PUBLIC_GOAL_PROGRESS':'"false"','process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':'"false"'})],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(root,'tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const html='<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script>'+String(await fs.readFile(path.join(output,'client.js'))).replaceAll('</script','<\\/script')+'</script></body></html>';
const code=await compileRoute(root,output),steps=successfulSteps(),events=[],requests=[],replies=[],errors=[];let calls=0;
const client={responses:{create(payload){const n=++calls,step=steps[n-1],result=typeof step==='function'?step(payload):step;return {withResponse:async()=>({data:{id:'resp_offline_'+n,status:'completed',model:model.id,service_tier:'default',usage:{input_tokens:100,output_tokens:20,total_tokens:120},...result},request_id:'req_offline_'+n,response:{status:200}})};}}};
const boundary=createBoundary({client,record:(stage,value)=>events.push({stage,...value}),runId:'offline-ui',signal:new AbortController().signal,expiresAt:Date.now()+120000}),POST=loadRoute(code,boundary);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),base='http://127.0.0.1:3100';page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());assert.equal(url.origin,base);
  if(request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});
  assert.ok(url.pathname.startsWith('/api/'));
  if(url.pathname!=='/api/home-solution-conversation')return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}]}});
  const body=request.postDataJSON(),index=requests.length;assert.ok(index<2);assert.equal(request.headers()['x-workforce-conversation'],undefined);assert.equal(body.goalContext,null);
  const expected=ordinaryClientRequest(index===0?fixture.opener:fixture.clarification,index===0?undefined:replies[0].state);
  expected.requestId=body.requestId;expected.message.id=body.message.id;expected.timeZone=body.timeZone;
  assert.deepEqual(body,expected,'Actual Home request must equal the exact-source constructor, except runtime UUIDs and timezone');
  requests.push(body);boundary.beginTurn(body,index);
  const response=await POST(new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()})),reply=await response.json();assert.equal(response.status,200);checkReply(body,reply,index);replies.push(reply);
  return route.fulfill({status:200,headers:{'x-workforce-dataset':fixture.datasetToken},json:reply});
 });
 await page.goto(base+'/');await dismissHomeOnboarding(page);
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload.goals,DECISIONS_STORAGE_KEY);
 for(const [i,text] of [fixture.opener,fixture.clarification].entries()){
  await page.getByLabel('Ask Workforce AI',{exact:true}).fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();
  await page.waitForFunction(n=>document.body.innerText.includes(n),i===0?'First assess the delivery gap':'Conditionally review redeployment plus hiring first');
 }
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 assert.deepEqual(after.goals,before);assert.equal(requests.length,2);assert.equal(calls,4);assert.deepEqual(requests[1].state,replies[0].state);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({requests,replies,events,actualHomePage:true,actualRoute:true,constructorParity:true,normalTypedEntry:true,modeHeaders:0,savedGoalsChanged:false,providerCalls:0,databaseCalls:0,errors},null,2));
 console.log(JSON.stringify({passed:true,requests:2,syntheticGenerations:4,constructorParity:true,providerCalls:0,output}));
}catch(error){console.error(JSON.stringify({output,errors,requests:requests.length}));for(const context of browser.contexts())for(const page of context.pages())await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});throw error;}finally{await browser.close();}
