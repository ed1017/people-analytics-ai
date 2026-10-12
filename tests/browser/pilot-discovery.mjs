/** Actual Page, fresh/existing stores; no live source or model requests. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'pilot-discovery-')),build=output;
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/pilot-discovery.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;

const base='http://127.0.0.1:3196',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),report={checks:[],errors:[],blocked:[],modelCalls:0};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
const settle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try{for(const width of [1366,390])for(const scenario of ['fresh','existing-empty','existing-plan']){
 const label=width+' '+scenario,context=await browser.newContext({viewport:{width,height:950},offline:true,serviceWorkers:'block'}),page=await context.newPage();let watching=false,requests=0;
 const seed=scenario==='fresh'?null:encodeDecisions({version:1,revision:1,removedGoalIds:[],goals:{version:1,activeId:scenario==='existing-plan'?'real':'',goals:scenario==='existing-plan'?[{id:'real',statement:'Preserve my real goal'}]:[]},workspaces:scenario==='existing-plan'?{real:{savedAt:'2026-10-01T00:00:00.000Z',fields:{privateUserPlan:{keep:'Original plan and history'},chat:{messages:[],input:'Keep my unsent draft',problem:null,questionUnanswered:false,resetMarks:{}}}}}:{}});
 await context.addInitScript(({key,value})=>{
  if(value!==null)localStorage.setItem(key,value);
  window.pilotWrites=[];window.pilotWatch=false;
  for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];Storage.prototype[method]=function(...args){if(window.pilotWatch)window.pilotWrites.push({method,key:args[0]??null});return original.apply(this,args);};}
 },{key:DECISIONS_STORAGE_KEY,value:seed});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(watching)requests++;
  if(req.isNavigationRequest()&&url.origin===base)return route.fulfill({contentType:'text/html',body:html});
  if(url.origin!==base){report.blocked.push(url.href);return route.abort();}
  if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:'text/javascript',body:await fs.readFile(path.join(build,path.basename(url.pathname)))});
  const headers={'x-workforce-dataset':req.headers()['x-workforce-dataset']??'legacy-v1:0'};
  if(req.method()==='POST'){report.modelCalls++;return route.abort();}
  if(url.pathname==='/api/dashboard')return route.fulfill({headers,json:scopeDashboard(url.search)});
  return route.fulfill({status:503,headers,json:{error:'Offline fixture source unavailable'}});
 });
 page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base);await dismissHomeOnboarding(page);await settle(page);
 const summary=page.locator('summary').filter({hasText:/^View sample plan and results$/});await summary.waitFor();
 check(label+' always available without saved demo attachment',await summary.count()===1);
 check(label+' static sample explanation visible while collapsed',await page.getByText('Fictional, read-only example. Viewing it does not run AI or save a plan.',{exact:true}).isVisible());
 if(scenario==='existing-empty')check(label+' dropdown only General exploration',await page.getByLabel('Selected Action Plan',{exact:true}).locator('option').count()===1);
 const input=page.locator('#overview-question');await input.fill('Preserve this unsent question');await settle(page);await page.waitForTimeout(150);
 const state=()=>page.evaluate(()=>({local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)])),memory:window.pilotDiscovery.snapshot().data,input:document.querySelector('#overview-question').value}));
 const before=await state();watching=true;await page.evaluate(()=>{window.pilotWatch=true;window.pilotWrites=[];});
 await summary.focus();await page.keyboard.press('Enter');const card=summary.locator('..').getByRole('region',{name:'Fictional pilot lifecycle',exact:true});await card.waitFor();await settle(page);
 check(label+' keyboard opens fictional outcome',await card.innerText().then(t=>t.includes('Invented teaching example')&&t.includes('7 → 6.5')&&t.includes('30/30')&&t.includes('38 total labor hours')));
 check(label+' focus stays on disclosure',await summary.evaluate(n=>n===document.activeElement));
 await card.screenshot({path:path.join(output,`${width}-${scenario}-compact.png`)});
 await card.locator('summary').focus();await page.keyboard.press('Space');
 check(label+' full details explicitly independent',await card.innerText().then(t=>t.includes('not attached to your selected goal')&&t.includes('Labor cost is unknown')&&!t.includes('binding verified within this browser')));
 check(label+' mobile containment and touch target',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await summary.evaluate(n=>n.getBoundingClientRect().height>=44));
 await card.screenshot({path:path.join(output,`${width}-${scenario}.png`)});
 await summary.focus();await page.keyboard.press('Space');await card.waitFor({state:'detached'});check(label+' close keeps keyboard focus',await summary.evaluate(n=>n===document.activeElement));
 await summary.click();await card.waitFor();check(label+' reopen has one standalone example',await card.count()===1);await summary.click();await card.waitFor({state:'detached'});await settle(page);
 check(label+' zero requests while viewing',requests===0);check(label+' zero storage write/remove/clear calls',await page.evaluate(()=>window.pilotWrites.length===0));
 check(label+' all goals/plans/progress/history/draft unchanged',JSON.stringify(await state())===JSON.stringify(before));
 await context.close();
}
check('no model calls',report.modelCalls===0);check('no external calls',report.blocked.length===0);check('no runtime errors',report.errors.length===0);
}finally{await browser.close();}
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,checks:report.checks.length}));
