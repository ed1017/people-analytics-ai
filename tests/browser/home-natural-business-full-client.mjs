/** Full client app, intercepted HTTP fixture only; no server, model or database. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {solutionConversationField} from '../../lib/home-solution-conversation.ts';
import {businessPlanningReceiptField} from '../../lib/home-business-planning-save.ts';
import {planAlternativesField} from '../../lib/home-plan-alternatives.ts';
import {offlineBusinessRoute} from '../helpers/offline-business-route.mjs';
import {messages,replies,naturalSteps,responseForStep,roleSlice} from '../fixtures/natural-business-planning.mjs';
const isolated=await offlineBusinessRoute();

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'home-natural-business-full-client-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,
 plugins:[new webpackPackage.webpack.DefinePlugin({
  'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),
  'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),
  'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false'),
 })],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),
 output:{path:output,filename:'fixture.js',publicPath:'/assets/'},
 resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]},
});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const artifact=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; font-src data:"><style>${css.replaceAll('</style','<\\/style')}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
await fs.writeFile(path.join(output,'fixture.html'),artifact);
const base='http://127.0.0.1:3100',assertions=[],transport=[];
const check=(name,pass)=>{assert.ok(pass,name);assertions.push(name);console.log('PASS '+name);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const [mode,width,height] of [['desktop',1280,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:mode==='mobile',hasTouch:mode==='mobile'}),page=await context.newPage(),errors=[],blocked=[],requests=[],api=[];
 page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 transport.push({mode,errors,blocked,interceptedApi:api});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.href===base+'/'&&req.method()==='GET'&&req.resourceType()==='document'&&req.isNavigationRequest()&&req.frame()===page.mainFrame())return route.fulfill({contentType:'text/html',body:artifact});
  if(url.origin!==base||!url.pathname.startsWith('/api/')){blocked.push(req.url());return route.abort();}
  api.push(url.pathname);
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON(),headers=req.headers(),bytes=req.postData();requests.push(body);
   assert.equal(headers['x-workforce-conversation'],undefined);assert.equal(body.goalContext?.scenarioReview,undefined);
   isolated.sandbox.__replies.push(...naturalSteps(body).map(responseForStep));
   // The actual client bytes and headers enter the actual route. Only the model
   // response transport is stubbed; no demand/goal/mode is injected into requests.
   const response=await isolated.post(new Request(req.url(),{method:req.method(),headers,body:bytes})),result=await response.text();
   assert.equal(response.status,200,result);assert.equal(isolated.sandbox.__replies.length,0);
   for(const sent of isolated.sandbox.__requests){
    assert.equal(sent.model,'gpt-6.1-sol');assert.deepEqual(JSON.parse(JSON.stringify(sent.reasoning)),{effort:'medium'});assert.equal(sent.service_tier,'default');
    assert.ok(sent.tools.some(t=>t.name==='compare_service_staffing'));assert.ok(sent.tools.some(t=>t.name==='evaluate_candidate'));
   }
   return route.fulfill({status:response.status,contentType:'application/json',body:result});
  }
  return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}]}});
 });
 const button=n=>page.getByRole('button',{name:n,exact:true}),card=page.getByRole('region',{name:'Business planning assumptions'});
 const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).payload,DECISIONS_STORAGE_KEY);
 const conversation=s=>(s.goals.activeId?s.workspaces[s.goals.activeId]:s.exploration).fields[solutionConversationField];
 const send=async kind=>{await page.getByLabel('Ask Workforce AI',{exact:true}).fill(messages[kind]);await button('Send overview question').click();await page.getByText(replies[kind],{exact:true}).filter({visible:true}).first().waitFor();};
 await page.goto(base+'/');await dismissHomeOnboarding(page);
 const originalGoals=JSON.stringify((await state()).goals);
 // No starter, business-objective button, goal pin, form, mode or fixture binding.
 await send('opener');await card.waitFor();let s=await state();
 check(mode+' ordinary typed opener creates code-owned context from an unbound UI request',requests[0].state.businessPlanning==null&&!requests[0].goal.id&&!requests[0].goalContext?.scenarioReview&&!!conversation(s).businessPlanning);
 check(mode+' opener clarifies without assumed scope, capacity or accepted plan',conversation(s).businessPlanning.review.spec.scope===null&&conversation(s).businessPlanning.staffing===null&&JSON.stringify(s.goals)===originalGoals&&!s.exploration.fields[planAlternativesField]);
 await send('clarify');s=await state();let business=conversation(s).businessPlanning;
 check(mode+' typed scope and workload calculate a two-role gap without example substitution',business.review.spec.scope===roleSlice&&business.review.result.workloadHours===3600&&business.review.result.capacityHours===1200&&business.review.result.additionalRoles===2&&!JSON.stringify(business).includes('Service Analyst'));
 await send('compare');s=await state();business=conversation(s).businessPlanning;
 check(mode+' explicit typed staffing produces four mixes and preserves delivery shortfall',business.staffing.result.enumerated===4&&business.staffing.result.options.length===4&&business.staffing.result.options[0].cash===117000&&business.staffing.result.options[0].shortfallHours>266);
 check(mode+' comparison does not save or accept assumptions',JSON.stringify(s.goals)===originalGoals&&!s.exploration.fields[planAlternativesField]&&business.staffing.result.accepted===false&&business.staffing.result.operationalFeasibilityVerified===false);
 await page.screenshot({path:path.join(output,mode+'-comparison.png'),fullPage:true});
 const before=JSON.stringify(business);await page.reload();await dismissHomeOnboarding(page);await card.waitFor();
 check(mode+' reload retains exact provisional state through the normal conversation envelope',JSON.stringify(conversation(await state()).businessPlanning)===before);
 await button('Review 0/0/2').click();await page.getByRole('region',{name:'Review provisional staffing selection'}).waitFor();
 check(mode+' review alone preserves no-save boundary',JSON.stringify((await state()).goals)===originalGoals&&!((await state()).exploration.fields[planAlternativesField]));
 await button('Cancel plan review').click();await send('correct');s=await state();const corrected=conversation(s).businessPlanning;
 check(mode+' correction uses retained actual UI state and recalculates to one role',requests.at(-1).state.businessPlanning.review.key===business.review.key&&corrected.review.result.additionalRoles===1&&corrected.staffing.inputs.values.trainingCash.value===7000&&corrected.staffing.result.options[0].cash===58500);
 check(mode+' omitted staffing values and provenance remain exact',Object.keys(business.staffing.inputs.values).filter(k=>k!=='trainingCash').every(k=>JSON.stringify(corrected.staffing.inputs.values[k])===JSON.stringify(business.staffing.inputs.values[k])));
 await button('Review 0/0/1').click();await page.getByRole('region',{name:'Review provisional staffing selection'}).waitFor();await button('Save this provisional plan with its unknowns').click();
 await card.getByRole('button',{name:'Selected as Action Plan #1',exact:true}).waitFor();
 s=await state();const goalId=s.goals.activeId,fields=s.workspaces[goalId].fields;
 check(mode+' deliberate selection saves the calculated plan with a preserved assumption receipt',!!goalId&&fields[businessPlanningReceiptField].length===1&&fields[businessPlanningReceiptField][0].state.review.result.additionalRoles===1&&!!fields[planAlternativesField]);
 const savedArtifacts=JSON.stringify([s.goals,fields[planAlternativesField],fields[businessPlanningReceiptField]]);
 await send('topic');await card.waitFor({state:'detached'});s=await state();
 check(mode+' typed topic change clears provisional context but preserves saved goal and proposal',conversation(s).businessPlanning===null&&JSON.stringify([s.goals,s.workspaces[goalId].fields[planAlternativesField],s.workspaces[goalId].fields[businessPlanningReceiptField]])===savedArtifacts);
 await send('opener');await card.waitFor();const count=requests.length;await button('Clear provisional business discussion').click();await card.waitFor({state:'detached'});
 check(mode+' explicit clear is local and preserves saved proposals',requests.length===count&&conversation(await state()).businessPlanning===null&&JSON.stringify((await state()).workspaces[goalId].fields[planAlternativesField])===JSON.stringify(fields[planAlternativesField]));
 await send('opener');await card.waitFor();await button('Reset conversation').click();await card.waitFor({state:'detached'});
 check(mode+' Home reset clears provisional context without changing the saved proposal',conversation(await state()).businessPlanning==null&&JSON.stringify((await state()).workspaces[goalId].fields[planAlternativesField])===JSON.stringify(fields[planAlternativesField]));
 await page.screenshot({path:path.join(output,mode+'-after-reset.png'),fullPage:true});
 check(mode+' full client remains within viewport with no browser or network errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&blocked.length===0);
 transport.at(-1).actualClientRequests=requests.length;
 await fs.writeFile(path.join(output,mode+'-requests.json'),JSON.stringify(requests,null,2));await context.close();
}}catch(error){for(const context of browser.contexts())for(const page of context.pages()){
 await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
}console.error(JSON.stringify({output,transport}));throw error;}finally{await browser.close();}
await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),artifactSha256:createHash('sha256').update(artifact).digest('hex'),checks:assertions.length,assertions,transport,actualRootPage:true,actualDatasetBoundary:true,actualDecisionStore:true,actualPOST:true,clientRequestsUnmodified:true,modelResponses:'synthetic fixtures, not independent semantic acceptance',deploymentTest:false,httpServerStarted:false,providerCalls:0,databaseCalls:0},null,2));
console.log(JSON.stringify({checks:assertions.length,output}));
