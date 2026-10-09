/** Fresh actual Home UI requests, checked against source-owned construction. Offline only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {compileClient,aggregateFixture} from './browser-client.mjs';
import {dismissHomeOnboarding} from '../tests/browser/dismiss-home-onboarding.mjs';
import {compileRoute,loadRoute} from './route.mjs';
import {createBoundary,model} from './run.mjs';
import {ordinaryClientRequest} from './client-request.mjs';
import {fixture,checkReply,makeReplayPayload} from './fixture.mjs';
import {successfulSteps} from './offline-replies.mjs';
import {DECISIONS_STORAGE_KEY} from '../lib/local-decisions.ts';
import {replayReceipts} from './replay.mjs';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'home-action-acceptance-ui-')),root=process.cwd();
const html=await compileClient(root,output),code=await compileRoute(root,output),steps=successfulSteps(),events=[],requests=[],replies=[],errors=[],replayPaths=[];let calls=0;
const client={responses:{create(payload){const n=++calls,step=steps[n-1],result=typeof step==='function'?step(payload):step;return {withResponse:async()=>({data:{id:'resp_offline_'+n,status:'completed',model:model.id,service_tier:'default',usage:{input_tokens:100,output_tokens:20,total_tokens:120},...result},request_id:'req_offline_'+n,response:{status:200}})};}}};
const boundary=createBoundary({client,record:(stage,value)=>events.push({stage,...value}),runId:'offline-ui',signal:new AbortController().signal,expiresAt:Date.now()+120000}),POST=loadRoute(code,boundary);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const [index,text] of fixture.questions.entries()){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),base='http://127.0.0.1:3100';page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());assert.equal(url.origin,base);
  if(request.method()==='GET'&&request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});
  assert.ok(url.pathname.startsWith('/api/'));
  if(url.pathname!=='/api/home-solution-conversation'){assert.equal(request.method(),'GET');return route.fulfill({json:aggregateFixture});}
  const body=request.postDataJSON();assert.equal(requests.length,index);assert.equal(request.headers()['x-workforce-conversation'],undefined);assert.equal(body.goalContext,null);
  const expected=ordinaryClientRequest(text);expected.requestId=body.requestId;expected.message.id=body.message.id;expected.timeZone=body.timeZone;
  assert.deepEqual(body,expected,'Fresh actual Home request equals exact-source constructor, except runtime UUIDs/timezone');
  assert.equal(body.state.turns.length,0);assert.equal(body.state.working.length,0);
  requests.push(body);boundary.beginTurn(body,index);
  const response=await POST(new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()})),replyText=await response.text(),reply=JSON.parse(replyText);assert.equal(response.status,200);
  const final=boundary.finalForTurn(index),checks=await checkReply(body,reply,index,final);replies.push(reply);
  const file=path.join(output,'replay-'+(index+1)+'.json');await fs.writeFile(file,JSON.stringify(makeReplayPayload(body,replyText,final,index,checks),null,2)+'\n',{mode:0o600});replayPaths.push(file);
  return route.fulfill({status:200,headers:{'x-workforce-dataset':fixture.datasetToken},body:replyText,contentType:'application/json'});
 });
 await page.goto(base+'/');await dismissHomeOnboarding(page);
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload.goals,DECISIONS_STORAGE_KEY);
 await page.getByLabel('Ask Workforce AI',{exact:true}).fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();
 await page.getByRole('article',{name:/^Working proposal:/}).nth(2).waitFor();
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 assert.deepEqual(after.goals,before);assert.equal(requests.length,index+1);assert.equal(after.exploration.fields.homeSolutionConversationV1.working.length,3);
 await context.close();
}
 assert.equal(calls,4);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({requests,replies,events,actualHomePage:true,actualRoute:true,constructorParity:true,independentEmptyContexts:true,normalTypedEntry:true,modeHeaders:0,savedGoalsChanged:false,providerCalls:0,databaseCalls:0,errors},null,2)+'\n',{mode:0o600});
}catch(error){console.error(JSON.stringify({output,errors,requests:requests.length}));for(const context of browser.contexts())for(const page of context.pages())await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});throw error;}finally{await browser.close();}
const replay=await replayReceipts(replayPaths);
console.log(JSON.stringify({passed:true,requests:2,syntheticGenerations:4,constructorParity:true,independentEmptyContexts:true,providerCalls:0,output,replay}));
