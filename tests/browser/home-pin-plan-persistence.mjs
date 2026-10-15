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
import {candidate,evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {accountabilityMessage,accountabilityNextStep,accountabilityCandidate} from '../fixtures/plan-accountability.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
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
const report={source:'working tree',cases:[]};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]])for(const kind of ['complete','sparse']){
 const context=await browser.newContext({viewport:{width,height:900},offline:true,serviceWorkers:'block'}),page=await context.newPage();let calls=0;const errors=[],blocked=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.isNavigationRequest()&&url.href===base+'/')return route.fulfill({contentType:'text/html',body:html});
  if(url.origin!==base){blocked.push(req.url());return route.abort()}
  if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:'text/javascript',body:await fs.readFile(path.join(build,path.basename(url.pathname)))});
  if(url.pathname==='/api/home-solution-conversation'){
   calls++;const body=req.postDataJSON();const c=kind==='complete'?accountabilityCandidate(body):candidate('sparse');
   if(kind==='sparse'){c.goal={statement:'Reduce turnover',turnId:body.message.id};c.activities[0].ownerRole='Unknown';c.nextStep='Review owner, review date, participation and workload; all are unknown.';}
   return route.fulfill({json:await converseSolutions(body,fixtureRuntime([evaluate(c),final('Review this proposed plan. No outcome has been measured.',[c.id])]),new AbortController().signal)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});
  blocked.push(req.url());return route.abort();
 });
 const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'legacy',statement:'Earlier goal without a plan'}]},workspaces:{legacy:{savedAt:'2026-10-09T00:00:00.000Z',fields:{sentinel:{keep:true}}}}};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.goto(base);await dismissHomeOnboarding(page);
 await page.getByLabel('Ask Workforce AI',{exact:true}).fill(kind==='complete'?accountabilityMessage:'Reduce turnover. Owner, review date, baseline, target, participation and workload are unknown.');
 await page.getByRole('button',{name:'Send overview question',exact:true}).click();
 const review=page.getByRole('region',{name:'Solution conversation review',exact:true}),card=review.getByRole('article').filter({hasText:'Recommended Action Plan'});
 await card.waitFor();assert.equal(await card.count(),1);assert.equal(await card.getByRole('button',{name:/^Save plan/}).count(),1);
 await card.getByRole('button',{name:/^Save plan/}).click();await card.getByRole('button',{name:/^Pinned Action Plan/}).waitFor();
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const pinned=await state(),id=pinned.goals.activeId,catalog=pinned.workspaces[id].fields.homePlanAlternativesV1;
 assert.equal(catalog.plans.length,1);assert.equal(catalog.attachments.length,1);assert.equal(catalog.attachments[0].purpose,'proposal-selection');assert.ok(!catalog.plans[0].applied);
 const saved=review.getByRole('article',{name:'Action Plan option 1',exact:true});
 const stages=[];
 async function inspect(stage){
  await card.waitFor();
  const summary=review.locator('summary').filter({hasText:/^Saved Action Plans$/});
  if(!await summary.evaluate(n=>n.parentElement.open))await summary.click();
  await saved.waitFor();
  assert.deepEqual((await state()).workspaces[id].fields.homePlanAlternativesV1,catalog);
  const text=await saved.innerText();
  assert.ok(text.includes('Goal: Reduce turnover'),stage+' goal');
  assert.ok(text.includes(kind==='complete'?'Assumed baseline: 8.2%':'Baseline: Unknown'),stage+' baseline');
  assert.ok(text.includes(kind==='complete'?'Assumed target: 6.56%':'Target: Unknown'),stage+' target');
  assert.equal(await saved.count(),1);assert.ok(await card.getByRole('button',{name:/^Pinned Action Plan/}).isDisabled());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(kind==='sparse'){
   const block=saved.getByRole('region',{name:'Goal and success measure'});
   const dimensions=await block.evaluate(n=>({height:n.getBoundingClientRect().height,font:getComputedStyle(n).fontSize,width:n.getBoundingClientRect().width}));
   assert.equal(dimensions.font,'14px');assert.ok(dimensions.height<=160);
   stages.push({stage,...dimensions});
   await block.screenshot({path:path.join(output,mode+'-'+stage+'.png')});
  }else stages.push({stage});
 }
 await inspect('pinned');
 const rail=page.getByRole('complementary',{name:'Pinned Action Plans',exact:true});
 await rail.getByText('Earlier saved goals and drafts',{exact:true}).click();await rail.getByRole('button',{name:'Earlier goal without a plan',exact:true}).click();
 await rail.getByRole('button',{name:/Open Action Plan:/}).click();await inspect('reopened');
 await page.reload();await dismissHomeOnboarding(page);await inspect('reloaded');
 for(const details of await saved.locator('details').all())if(!await details.evaluate(n=>n.open))await details.locator('summary').first().click();
 const assumptions=saved.getByRole('button',{name:'Show assumptions',exact:true});if(await assumptions.count())await assumptions.click();
 const display=await saved.innerText(),working=await card.innerText(),plan=catalog.plans[0],draft=plan.draft;
 const result={kind,mode,stages,fields:{},display,working,draft,plan,checks:[]};report.cases.push(result);
 function check(name,ok){result.fields[name]=ok?'PASS':'FAIL';assert.ok(ok,mode+' '+kind+' '+name);console.log('PASS '+mode+' '+kind+' '+name)}
 check('goal',pinned.goals.goals.find(g=>g.id===id).statement==='Reduce turnover'&&draft.binding.goal==='Reduce turnover'&&draft.inputs.successMeasure.goal==='Reduce turnover'&&working.includes('Reduce turnover')&&display.includes('Goal: Reduce turnover'));
 if(kind==='complete'){
  check('baseline',draft.inputs.successMeasure.baseline.value==='8.2%'&&display.includes('Assumed baseline: 8.2%'));
  check('target',draft.inputs.successMeasure.target.value==='6.56%'&&display.includes('Assumed target: 6.56%'));
  check('owner',draft.bundle.components[0].ownerRole==='Learning lead'&&display.includes('Learning lead'));
  check('reviewDate',JSON.stringify(plan).includes(accountabilityNextStep)&&display.includes(accountabilityNextStep));
  check('participation',draft.inputs.groups.some(g=>g.count.value===10)&&display.includes('10 assumed participants.'));
  check('workload',draft.inputs.deliveryEstimate.hoursPerParticipant.value===2&&draft.inputs.deliveryEstimate.coordinationHours.value===8&&display.includes('28 total staff hours.')&&display.includes('Assumed: 2 hours per participant + Assumed: 8 coordination hours'));
 }else{
  check('baseline',draft.inputs.successMeasure.baseline.value===null&&/baseline.*unknown/i.test(display));
  check('target',draft.inputs.successMeasure.target.value===null&&/target.*unknown/i.test(display));
  check('owner',draft.bundle.components[0].ownerRole==='Unknown'&&display.includes('Unknown'));
  check('reviewDate',JSON.stringify(plan).includes('review date, participation and workload; all are unknown.')&&display.includes('review date, participation and workload; all are unknown.'));
  check('participation',!draft.inputs.groups.some(g=>g.count.value!==null)&&working.includes('People / FTE / staff hours: Unknown'));
  check('workload',working.includes('People / FTE / staff hours: Unknown'));
 }
 check('noInventedProgress',!(await state()).workspaces[id].fields.goalProgressV1&&await page.getByText('No confirmed measurement link yet. Review and confirm progress in chat.',{exact:false}).isVisible());
 await rail.getByText('Earlier saved goals and drafts',{exact:true}).click();await rail.getByRole('button',{name:'Earlier goal without a plan',exact:true}).click();
 result.legacyFields=(await state()).workspaces.legacy.fields;check('legacyNoInventedPlan',result.legacyFields.sentinel.keep===true&&!result.legacyFields.homePlanAlternativesV1&&!result.legacyFields.goalProgressV1);
 check('offline',calls===1&&blocked.length===0&&errors.length===0);
 await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2));await context.close();
}}catch(error){report.failure=error.message;await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2));throw error;}finally{await browser.close()}
console.log(JSON.stringify({output,cases:report.cases.length}));
