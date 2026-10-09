/** Actual hooks/store/route, synthetic model responses, controllable native digest timing. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {offlineBusinessRoute} from '../helpers/offline-business-route.mjs';
import {messages,naturalSteps,responseForStep} from '../fixtures/natural-business-planning.mjs';
import {candidate,evaluate,final} from '../fixtures/home-solution-conversation.mjs';
import {solutionConversationField} from '../../lib/home-solution-conversation.ts';
import {planAlternativesField} from '../../lib/home-plan-alternatives.ts';
const isolated=await offlineBusinessRoute(),output=await fs.mkdtemp(path.join(os.tmpdir(),'home-business-context-guards-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/home-business-context-client.mjs'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':'"true"','process.env.NEXT_PUBLIC_GOAL_PROGRESS':'"true"','process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':'"false"'})],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const artifact='<html><body><div id="root"></div><script>'+String(await fs.readFile(path.join(output,'fixture.js'))).replaceAll('</script','<\\/script')+'</script></body></html>';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],errors=[],requests=[],base='http://127.0.0.1:3100',check=(name,ok)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name);};
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);window.digestReleases=[];crypto.subtle.digest=(...args)=>{const result=digest(...args);return window.holdDigest?new Promise((resolve,reject)=>window.digestReleases.push(()=>result.then(resolve,reject))):result;};});
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.href===base+'/'&&request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:artifact});
  assert.equal(url.origin,base);assert.equal(url.pathname,'/api/home-solution-conversation');
  const body=request.postDataJSON();requests.push(body);let steps;
  if(body.message.text==='Propose a mentoring trial for this contract objective.'){
   const proposed=candidate('contract-mentoring');proposed.goal={statement:messages.opener,turnId:body.state.turns.find(t=>t.text===messages.opener).id};steps=[evaluate(proposed),final('A provisional mentoring trial is ready to review.',['contract-mentoring'])];
  }else if(body.message.text==='Continue discussing this saved objective.')steps=[final('The retained provisional assumptions are available for continued discussion.')];
  else steps=naturalSteps(body);
  isolated.sandbox.__replies.push(...steps.map(responseForStep));
  const response=await isolated.post(new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postData()}));
  return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 });
 await page.goto(base+'/');await page.waitForFunction(()=>window.businessHarness?.controller.canSend);
 const send=text=>page.evaluate(async text=>{const reply=await window.businessHarness.controller.send(text);if(!reply)throw Error('Missing conversation reply');return reply;},text);
 for(const key of ['opener','clarify','compare'])await send(messages[key]);
 const snapshot=()=>page.evaluate(()=>JSON.stringify(window.businessHarness.snapshot().data)),original=await snapshot();
 const originalContext=await page.evaluate(()=>window.businessHarness.context),option='build-0-move-0-buy-2';
 const change=next=>page.evaluate(next=>window.businessHarness.change(next),next);
 const startReview=()=>page.evaluate(id=>{window.reviewOutcome=null;window.reviewPromise=window.businessHarness.controller.reviewBusinessOption(id).then(review=>{window.review=review;window.reviewOutcome={accepted:true};},error=>{window.reviewOutcome={error:error.message};});},option);
 for(const [name,next] of [['filter',{...originalContext,query:'country=US'}],['scope',{...originalContext,scope:'Different business unit'}]]){
  await page.evaluate(()=>{window.holdDigest=true;});await startReview();await page.waitForFunction(()=>window.digestReleases.length>0);
  await change(next);await change(originalContext); // Same state/revision and final scope: epoch must reject A→B→A.
  await page.evaluate(()=>{window.holdDigest=false;window.digestReleases.splice(0).forEach(release=>release());});await page.waitForFunction(()=>window.reviewOutcome!==null);
  check(name+' change rejects delayed review completion even after returning',!!(await page.evaluate(()=>window.reviewOutcome.error))&&await snapshot()===original);
  await startReview();await page.waitForFunction(()=>window.reviewOutcome!==null);assert.equal(await page.evaluate(()=>window.reviewOutcome.accepted),true);
  await change(next);await page.evaluate(()=>window.businessHarness.controller.saveBusinessOption(window.review));
  check(name+' change blocks Save of an open review',await snapshot()===original&&/changed/.test(await page.evaluate(()=>window.businessHarness.controller.notice)));
  await startReview();await page.waitForFunction(()=>window.reviewOutcome!==null);
  check(name+' mismatch rejects a newly requested review of stale state',/source scope changed/.test(await page.evaluate(()=>window.reviewOutcome.error))&&await snapshot()===original);
  await change(originalContext);
 }
 await send(messages.correct);await send('Propose a mentoring trial for this contract objective.');
 const businessBefore=await page.evaluate(()=>window.businessHarness.controller.state.businessPlanning);
 await page.evaluate(async()=>{const c=window.businessHarness.controller,item=c.state.working.at(-1);await c.save(item,true,item.candidate.goal.statement);});
 await page.waitForFunction(()=>!!window.businessHarness.conversation.activeGoalId);
 const saved=await page.evaluate(()=>window.businessHarness.snapshot().data),goal=saved.goals.goals.find(g=>g.id===saved.goals.activeId),fields=saved.workspaces[goal.id].fields,business=fields[solutionConversationField].businessPlanning;
 check('generic explicit Save binds retained natural demand to its corresponding goal',!!fields[planAlternativesField]&&JSON.stringify(business.context.boundGoal)===JSON.stringify(goal));
 const expected=structuredClone(businessBefore);expected.context.boundGoal=goal;
 check('generic goal binding preserves every demand and staffing premise and correction source',JSON.stringify(business)===JSON.stringify(expected));
 await send('Continue discussing this saved objective.');
 check('continued natural chat after generic Save passes the actual route context guard',requests.at(-1).goal.id===goal.id&&requests.at(-1).state.businessPlanning.context.boundGoal.id===goal.id);
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await page.reload();await page.waitForFunction(()=>window.businessHarness?.controller.canSend);
 for(const key of ['opener','clarify','compare'])await send(messages[key]);await send('Propose a mentoring trial for this contract objective.');
 await page.evaluate(async()=>{const c=window.businessHarness.controller;await c.save(c.state.working.at(-1),true,'A different explicitly selected goal');});
 await page.waitForFunction(()=>!!window.businessHarness.conversation.activeGoalId);
 check('generic Save to a different objective explicitly clears incompatible provisional premises',await page.evaluate(()=>window.businessHarness.controller.state.businessPlanning===null));
 await send('Continue discussing this saved objective.');
 check('continued chat after incompatible context is cleared still passes the actual route',requests.at(-1).goal.statement==='A different explicitly selected goal'&&requests.at(-1).state.businessPlanning===null);
 check('browser regression used no provider or database and has no browser errors',errors.length===0);
 await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({checks,requests:requests.length,errors,actualHooks:true,actualDecisionStore:true,actualRoute:true,modelReplies:'synthetic',providerCalls:0,databaseCalls:0},null,2));
 console.log(JSON.stringify({checks:checks.length,output}));
}catch(error){console.error(JSON.stringify({output,errors,requests:requests.length}));throw error;}finally{await browser.close();}
