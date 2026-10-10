// Actual client app and deterministic solution service; synthetic premises, no provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {accountabilityMessage,accountabilityNextStep,accountabilityScopeChange,accountabilityCandidate,accountabilityQuantity} from '../fixtures/plan-accountability.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {measurementScope} from '../../lib/home-success-measures.ts';
const playwright=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const chromium=playwright.chromium??playwright.default.chromium;
const output=process.env.AUDIT_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'plan-measure-scope-'));
const build=process.env.AUDIT_BUILD??await fs.mkdtemp(path.join(os.tmpdir(),'plan-measure-client-'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(build,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3117';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-domain-reliability','--disable-sync','--metrics-recording-only','--host-resolver-rules=MAP * ~NOTFOUND']});
const report={source:process.env.AUDIT_SOURCE??'local working tree',transport:'Offline browser; all navigation/assets/API requests fulfilled in memory. No server, route.continue, route.fetch or provider.',cases:[]};
const saveReport=()=>fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
try{
 for(const [mode,width,height] of [['desktop',1440,1000],['phone',390,844]]){
  const context=await browser.newContext({viewport:{width,height},offline:true,serviceWorkers:'block'}),page=await context.newPage();
  const item={mode,width,height,observations:[],errors:[],blockedRequests:[],interceptedRequests:0,syntheticSolutionRequests:0};report.cases.push(item);
  page.setDefaultTimeout(15000);page.on('pageerror',error=>item.errors.push(error.message));
  await context.route('**/*',async route=>{
   item.interceptedRequests++;const req=route.request(),url=new URL(req.url());
   if(req.isNavigationRequest()&&url.href===base+'/')return route.fulfill({contentType:'text/html',body:html});
   if(url.origin!==base){item.blockedRequests.push(req.url());return route.abort();}
   if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:'text/javascript',body:await fs.readFile(path.join(build,path.basename(url.pathname)))});
   if(url.pathname==='/api/home-solution-conversation'){
    item.syntheticSolutionRequests++;const body=req.postDataJSON();let steps;
    if(body.message.text===accountabilityScopeChange){
     const prior=body.state.working.filter(value=>value.id==='accountability').at(-1);assert.ok(prior);
     steps=[{name:'revise_parameters',args:{edit:{id:prior.id,source:{kind:'working',id:prior.id,revision:prior.revision},quantities:[accountabilityQuantity(body,'population','Another fictional test group','text')]},constraintUpdates:[]}},final('The population changed. Review the earlier measure for this population. The saved plan is unchanged.',[prior.id])];
    }else{assert.equal(body.message.text,accountabilityMessage);const candidate=accountabilityCandidate(body);steps=[evaluate(candidate),final('Review these proposed assumptions. Nothing has been saved.',[candidate.id])];}
    return route.fulfill({json:await converseSolutions(body,fixtureRuntime(steps),new AbortController().signal)});
   }
   if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});
   item.blockedRequests.push(req.url());return route.abort();
  });
  const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'older',statement:'Earlier goal without a plan'}]},workspaces:{older:{savedAt:'2026-10-09T00:00:00.000Z',fields:{sentinel:{keep:true}}}}};
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
  await page.goto(base);await dismissHomeOnboarding(page);
  const review=page.getByRole('region',{name:'Solution conversation review',exact:true});
  const card=()=>review.getByRole('article',{name:'Working proposal: Accountability review',exact:true});
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
  async function send(text){await page.getByLabel('Ask Workforce AI',{exact:true}).fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();}
  await send(accountabilityMessage);await card().waitFor();
  await card().getByRole('button',{name:/^Pin Action Plan/}).click();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).payload.goals.activeId,DECISIONS_STORAGE_KEY);
  const pinned=await state(),id=pinned.goals.activeId,original=pinned.workspaces[id].fields.homePlanAlternativesV1,measure=original.plans[0].draft.inputs.successMeasure;
  assert.equal(measure.scopeKey,measurementScope(original.plans[0].draft.inputs));assert.equal(measure.baseline.kind,'illustrative');assert.equal(measure.target.kind,'illustrative');
  assert.equal(pinned.goals.goals.find(goal=>goal.id===id).statement,'Reduce turnover');assert.equal(original.attachments[0].purpose,'proposal-selection');assert.ok(!original.plans[0].applied);
  async function inspect(stage){
   await card().waitFor();assert.ok(await card().getByRole('button',{name:/^Pinned Action Plan/}).isDisabled());
   const summary=review.locator('summary').filter({hasText:/^Saved Action Plans$/});if(!await summary.evaluate(node=>node.parentElement.open))await summary.click();
   const saved=review.getByRole('article',{name:'Action Plan option 1',exact:true}),list=saved.getByRole('list',{name:'How success is measured',exact:true});
   assert.ok(await list.isVisible());const text=await list.innerText();assert.match(text,/Assumed baseline: 8\.2%\./);assert.match(text,/Assumed target: 6\.56%\./);assert.doesNotMatch(text,/renewed review/);
   assert.ok(await saved.getByText(accountabilityNextStep,{exact:false}).isVisible());
   assert.deepEqual((await state()).workspaces[id].fields.homePlanAlternativesV1,original);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await list.screenshot({path:path.join(output,`${mode}-${stage}.png`)});
   item.observations.push({stage,visibleMeasure:text,savedBytesUnchanged:true,noHorizontalOverflow:true});console.log('PASS '+mode+' '+stage);await saveReport();
  }
  await inspect('pinned');
  const rail=page.getByRole('complementary',{name:'Pinned Action Plans',exact:true});await rail.getByText('Earlier saved goals and drafts',{exact:true}).click();await rail.getByRole('button',{name:'Earlier goal without a plan',exact:true}).click();
  assert.deepEqual((await state()).workspaces.older.fields.sentinel,seed.workspaces.older.fields.sentinel);assert.equal((await state()).workspaces.older.fields.homePlanAlternativesV1,undefined);
  await rail.getByRole('button',{name:/Open Action Plan: Accountability review/}).click();await inspect('reopened');
  await page.reload();await dismissHomeOnboarding(page);await inspect('refreshed');assert.equal(item.syntheticSolutionRequests,1);
  await send(accountabilityScopeChange);await card().getByText(/revision 2/).waitFor();
  const changed=(await state()).workspaces[id].fields.homeSolutionConversationV1.working.filter(value=>value.id==='accountability').at(-1);
  assert.deepEqual(changed.draft.inputs.successMeasure,measure);assert.notEqual(measure.scopeKey,measurementScope(changed.draft.inputs));assert.ok(changed.result.issues.some(issue=>issue.startsWith('Success measure')));
  // Pinning the revision preserves both numbered plans; it must not revalidate the stale measure.
  await card().getByRole('button',{name:/^Pin Action Plan/}).click();await card().getByRole('button',{name:/^Pinned Action Plan/}).waitFor();
  const summary=review.locator('summary').filter({hasText:/^Saved Action Plans$/});if(!await summary.evaluate(node=>node.parentElement.open))await summary.click();
  const stale=review.getByRole('article',{name:'Action Plan option 2',exact:true}).getByRole('list',{name:'How success is measured',exact:true});
  const staleText=await stale.innerText();assert.match(staleText,/needs renewed review/);assert.doesNotMatch(staleText,/Assumed baseline:|Assumed target:/);
  const revised=(await state()).workspaces[id].fields.homePlanAlternativesV1;assert.deepEqual(revised.plans[0],original.plans[0]);assert.equal(revised.plans.length,2);assert.deepEqual(revised.plans[1].draft.inputs.successMeasure,measure);
  await stale.screenshot({path:path.join(output,`${mode}-changed-scope.png`)});
  item.observations.push({stage:'changed-scope',visibleMeasure:staleText,originalSavedPlanUnchanged:true,existingMeasureUnchanged:true});
  assert.equal(item.syntheticSolutionRequests,2);assert.deepEqual(item.errors,[]);assert.deepEqual(item.blockedRequests,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await context.close();await saveReport();
 }
}catch(error){report.failure={message:error.message,stack:error.stack};await saveReport();throw error;}finally{await browser.close();}
console.log(JSON.stringify({completedModes:report.cases.length,output}));
