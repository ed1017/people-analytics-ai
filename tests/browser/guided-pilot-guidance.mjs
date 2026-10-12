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
import {planAlternativesField} from '../../lib/home-plan-alternatives.ts';
import {offlineBusinessRoute} from '../helpers/offline-business-route.mjs';
import {responseForStep} from '../fixtures/natural-business-planning.mjs';
import {actionPlans} from '../fixtures/action-plan-recommendations.mjs';
import {final,evaluate} from '../fixtures/home-solution-conversation.mjs';
import {homeDefinitions} from '../../lib/home-pack.mjs';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
const isolated=await offlineBusinessRoute();
const aggregateFixture=scopedDashboardResponse({overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}]},{country:'all',org:'all',level:'all'});
isolated.sandbox.__aggregateSources=Object.fromEntries(homeDefinitions.map(def=>[def[1],{status:'loaded',data:aggregateFixture}]));
isolated.sandbox.__aggregateReads=[];

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'guided-pilot-guidance-'));
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
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},offline:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[],blocked=[],requests=[];
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.isNavigationRequest()&&url.origin===base)return route.fulfill({contentType:'text/html',body:artifact});
  if(url.origin!==base){blocked.push('external');return route.abort();}
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();requests.push(body);
   const candidate=actionPlans('turnover',body)[0];
   isolated.sandbox.__replies.push(...[evaluate(candidate),final('Review this proposed workload pilot; its effectiveness is unproven.',[candidate.id])].map(responseForStep));
   const response=await isolated.post(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()}));
   assert.equal(response.status,200);return route.fulfill({status:200,contentType:'application/json',body:await response.text()});
  }
  assert.equal(req.method(),'GET');return route.fulfill({json:aggregateFixture});
 });
 await page.goto(base);await dismissHomeOnboarding(page);const original=await state(),originalGoals=JSON.stringify(original.goals);
 check(mode+' standalone entry absent',await page.getByText('View sample plan and results',{exact:true}).count()===0&&await page.getByText('View fictional pilot example',{exact:true}).count()===0);
 const guide=page.getByRole('dialog',{name:'Optional guided demo'});
 async function open(){await button('Show instructions').click();await button('Try a guided example').click();await guide.waitFor();const start=guide.getByRole('button',{name:'Next → Start example',exact:true});await start.focus();await page.keyboard.press('Enter');await guide.getByRole('heading',{name:/^Step 2/}).waitFor();}
 await chat.fill('Keep my unfinished question');await open();
 check(mode+' start only prefills editable accountability request',requests.length===0&&await chat.inputValue().then(t=>t.includes('proposed owner, baseline, target and review date')&&t.includes('leave missing scope, costs, dates, baselines and targets unknown')));
 await guide.getByRole('button',{name:'Exit guide',exact:true}).click();await guide.waitFor({state:'detached'});
 check(mode+' cancellation preserves draft and goals without submission',requests.length===0&&await chat.inputValue()==='Keep my unfinished question'&&JSON.stringify((await state()).goals)===originalGoals);
 await open();await button('Send overview question').click();await guide.getByRole('heading',{name:/^Step 3/}).waitFor();
 check(mode+' review explains accountability and distinguishes activity from outcome',await guide.innerText().then(t=>t.includes('owner, baseline, target and review date')&&t.includes('Keep unverified values unknown')&&t.includes('Activities completed are not measured outcomes')));
 const card=page.getByRole('article',{name:'Working proposal: Reduce avoidable workload',exact:true});await card.waitFor();
 check(mode+' actual plan retains proposed owners and unknown baseline/target',await card.innerText().then(t=>t.includes('Suggested owners · unconfirmed')&&t.includes('Baseline: Unknown')&&t.includes('Target: Unknown')));
 check(mode+' reading neither submits again nor saves',requests.length===1&&JSON.stringify((await state()).goals)===originalGoals);
 check(mode+' keyboard focus and mobile containment',await guide.getByRole('heading',{name:/^Step 3/}).evaluate(n=>n===document.activeElement)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await guide.screenshot({path:path.join(output,mode+'-guide.png')});
 await card.getByRole('button',{name:'Pin Action Plan with unknowns',exact:true}).click();await guide.getByRole('heading',{name:/^Step 5/}).waitFor();
 const saved=await state(),id=saved.goals.activeId,catalog=saved.workspaces[id].fields[planAlternativesField];
 check(mode+' explicit pin saves exactly one plan without applying it or submitting',requests.length===1&&catalog.plans.length===1&&catalog.attachments.length===1&&!catalog.plans[0].applied);
 check(mode+' saved original goals and content preserved',original.goals.goals.every(g=>saved.goals.goals.some(n=>n.id===g.id&&n.statement===g.statement)&&JSON.stringify(saved.workspaces[g.id].fields)===JSON.stringify(original.workspaces[g.id].fields)));
 await guide.getByRole('button',{name:'Exit guide',exact:true}).click();await guide.waitFor({state:'detached'});await page.reload();await dismissHomeOnboarding(page);
 check(mode+' reload retains pinned plan without automatic submission',requests.length===1&&JSON.stringify((await state()).workspaces[id].fields[planAlternativesField])===JSON.stringify(catalog));
 check(mode+' no browser errors or external traffic',errors.length===0&&blocked.length===0);
 transport.push({mode,requests:requests.length,errors,blocked});await context.close();
}}catch(error){for(const context of browser.contexts())for(const page of context.pages()){await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});}console.error(JSON.stringify({output,transport}));throw error;}finally{await browser.close();}
await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),artifactSha256:createHash('sha256').update(artifact).digest('hex'),checks:assertions.length,assertions,transport,actualRootPage:true,actualPOST:true,providerCalls:0,databaseCalls:0},null,2));
console.log(JSON.stringify({checks:assertions.length,output}));
