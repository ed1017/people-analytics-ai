/** Two real tabs, real Page and store; all transport is intercepted offline. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {createHomeDemoGoals} from '../../lib/home-demo-goals.ts';
import {DECISIONS_STORAGE_KEY,DECISION_RECOVERY_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'multitab-recovery-')),build=output;
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/multitab-recovery-client.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3192',id='demo-reduce-turnover';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),report={checks:[],errors:[],blocked:[],modelCalls:0,findings:[]};
const check=(name,value)=>{report.checks.push({name,pass:!!value});assert.ok(value,name);};
const snapshot=p=>p.evaluate(()=>window.multitab.snapshot());
const raw=p=>p.evaluate(k=>localStorage.getItem(k),DECISIONS_STORAGE_KEY);
async function settled(p){await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function navigate(page,target){const trigger=page.getByRole('button',{name:'Open navigation',exact:true});if(await trigger.isVisible())await trigger.click();if(target==='home')await page.getByRole('button',{name:'Action Planning',exact:true}).click();else{const link=page.locator(`[data-nav-destination="${target}"]`),group=await link.evaluate(n=>n.parentElement.id),toggle=page.locator(`button[aria-controls="${group}"]`);if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await link.click();}await page.waitForFunction(target=>new URLSearchParams(location.search).get('page')===target||(target==='home'&&!location.search),target);await settled(page);}
async function tabs(){
 const context=await browser.newContext({viewport:{width:1366,height:950},offline:true,serviceWorkers:'block'});
 const demo=createHomeDemoGoals('2026-10-12T12:00:00Z');demo.goals.activeId=id;
 for(const slot of Object.values(demo.workspaces))slot.fields.chat={messages:[],input:'My unsent request',problem:null,questionUnanswered:false,resetMarks:{}};
 const seed={version:1,revision:1,...demo};
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.origin===base)return route.fulfill({contentType:'text/html',body:html});if(url.origin!==base){report.blocked.push(url.href);return route.abort();}if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:'text/javascript',body:await fs.readFile(path.join(build,path.basename(url.pathname)))});const headers={'x-workforce-dataset':req.headers()['x-workforce-dataset']??'legacy-v1:0'};if(req.method()==='POST'){report.modelCalls++;return route.abort();}if(url.pathname==='/api/dashboard')return route.fulfill({headers,json:scopeDashboard(url.search)});return route.fulfill({status:503,headers,json:{error:'Offline fixture source unavailable'}});});
 const a=await context.newPage(),b=await context.newPage();for(const p of [a,b])p.on('pageerror',e=>report.errors.push(e.message));
 await a.goto(base);await dismissHomeOnboarding(a);await settled(a);const before=await raw(a);
 await b.goto(base);await dismissHomeOnboarding(b);await settled(b);await settled(a);
 report.findings.push({kind:'second-tab-open',bytesChanged:before!==await raw(a),aNotice:(await snapshot(a)).notice,bNotice:(await snapshot(b)).notice});
 return {context,a,b};
}
try{
 for(const destination of ['home','planning-overview','decision-brief']){
  const {context,a,b}=await tabs();await navigate(b,destination);const before=await raw(a),aBefore=await snapshot(a);
  await b.getByRole('combobox',{name:'Select persona',exact:true}).selectOption('Finance');await settled(b);await settled(a);
  check(destination+' Perspective-only changes no saved bytes',await raw(a)===before);
  check(destination+' Perspective-only creates no conflict',JSON.stringify(await snapshot(a))===JSON.stringify(aBefore)&&!(await snapshot(a)).notice);
  check(destination+' unsent request retained',(await snapshot(a)).data.workspaces[id].fields.chat.input==='My unsent request');
  await context.close();
 }

 for(const destination of ['home','planning-overview','decision-brief']){
  const {context,a,b}=await tabs(),original=(await snapshot(a)).data.workspaces[id].fields.homeSolutionBundlesV1;
  await b.getByRole('textbox',{name:'Ask Workforce AI',exact:true}).fill('Saved request from tab B');
  await a.waitForFunction(()=>!!window.multitab.snapshot().recovery);
  await a.getByRole('textbox',{name:'Ask Workforce AI',exact:true}).fill('Unsent request from tab A');await settled(a);
  await navigate(a,destination);const savedBefore=await raw(a);
  await a.getByRole('button',{name:'Retry saving',exact:true}).click();
  await a.getByRole('region',{name:'Review recovered draft',exact:true}).waitFor();
  check(destination+' genuine conflict blocks save',!(await snapshot(a)).saved&&await raw(a)===savedBefore);
  await a.getByRole('button',{name:'Keep saved versions and my request',exact:true}).click();await settled(a);
  const after=await snapshot(a);
  check(destination+' explicit recovery keeps local request and immutable plans',after.saved&&after.data.workspaces[id].fields.chat.input==='Unsent request from tab A'&&JSON.stringify(after.data.workspaces[id].fields.homeSolutionBundlesV1)===JSON.stringify(original));
  check(destination+' both request versions retained',after.data.workspaces[id].fields.recoveredRequestsV1.some(r=>r.input==='Saved request from tab B')&&after.data.goals.activeId===id);
  await a.getByText('Recovered request copies (1)',{exact:true}).click();check(destination+' saved copy is readable without submission',await a.getByText('Saved request from tab B',{exact:true}).isVisible());
  await a.getByText('Recovered request copies (1)',{exact:true}).locator('..').screenshot({path:path.join(output,destination+'-recovered-requests.png')});
  const recovered=await raw(a);await a.reload();await dismissHomeOnboarding(a);await settled(a);check(destination+' reload preserves both drafts and history',await raw(a)===recovered);
  await context.close();
 }

 for(const destination of ['home','planning-overview','decision-brief']){
  const {context,a,b}=await tabs();await navigate(a,destination);
  const initial=(await snapshot(a)).data.workspaces[id].fields.homeSolutionBundlesV1.attachments;
  const winner=await b.evaluate(id=>window.multitab.attach(id),id);check(destination+' competing attachment saved',winner.built&&!winner.error);
  await a.waitForFunction(()=>!!window.multitab.snapshot().recovery);const saved=await raw(a),stale=await a.evaluate(id=>window.multitab.attach(id),id);
  check(destination+' stale attachment blocked before candidate construction',!stale.built&&!!stale.error&&await raw(a)===saved);
  await a.getByRole('button',{name:'Retry saving',exact:true}).click();await settled(a);
  const recovered=(await snapshot(a)).data.workspaces[id].fields.homeSolutionBundlesV1.attachments;
  check(destination+' recovery imports exact saved history without duplicate',recovered.length===2&&JSON.stringify(recovered[0])===JSON.stringify(initial[0])&&(await snapshot(a)).saved);
  const replay=await a.evaluate(id=>window.multitab.attach(id),id);check(destination+' new explicit attachment preserves preceding versions',replay.built&&!replay.error&&(await snapshot(a)).data.workspaces[id].fields.homeSolutionBundlesV1.attachments.length===3);
  const beforeSwitch=await raw(a);
  await a.getByRole('combobox',{name:'Fixture server bootstrap token',exact:true}).selectOption('fixture-next:1');await a.waitForFunction(()=>window.multitab.snapshot().saved&&window.multitab.snapshot().data.workspaces['demo-reduce-turnover']?.fields.homeSolutionBundlesV1===undefined);
  check(destination+' dataset change retains old immutable store',await raw(a)===beforeSwitch);
  await b.getByRole('button',{name:'Retry saving',exact:true}).click();await settled(b);const oldBefore=await raw(b);await b.evaluate(()=>window.multitab.field('demo-close-skill-gaps','fixture-note','Other dataset activity'));await settled(a);
  check(destination+' old-dataset save actually committed',(await snapshot(b)).saved&&await raw(b)!==oldBefore);
  const oldAfter=await raw(b);await a.waitForFunction(value=>window.multitab.events().some(e=>e.newValue===value),oldAfter);
  check(destination+' old dataset event does not invalidate new workspace',(await snapshot(a)).saved&&!(await snapshot(a)).notice);
  await context.close();
 }
 {
  const {context,a,b}=await tabs();await b.evaluate(()=>window.multitab.field('demo-close-skill-gaps','fixture-note','Independent saved edit'));await a.waitForFunction(()=>!!window.multitab.snapshot().recovery);
  await a.getByRole('button',{name:'Retry saving',exact:true}).click();await settled(a);check('different-goal recovery preserves selection and unrelated edit',(await snapshot(a)).saved&&(await snapshot(a)).data.goals.activeId===id&&(await snapshot(a)).data.workspaces['demo-close-skill-gaps'].fields['fixture-note']==='Independent saved edit');
  await a.evaluate(()=>window.multitab.quota(true));await a.getByRole('textbox',{name:'Ask Workforce AI',exact:true}).fill('Quota-protected unsent request');await settled(a);
  check('failed save preserves local draft and session recovery',!(await snapshot(a)).saved&&await a.evaluate(k=>!!sessionStorage.getItem(k),DECISION_RECOVERY_KEY));
  await a.reload();await dismissHomeOnboarding(a);await settled(a);check('reload recovers quota draft',(await snapshot(a)).data.workspaces[id].fields.chat.input==='Quota-protected unsent request');
  await a.getByRole('button',{name:'Retry saving',exact:true}).click();await settled(a);check('explicit retry persists quota draft',(await snapshot(a)).saved&&(await snapshot(a)).data.workspaces[id].fields.chat.input==='Quota-protected unsent request');
  await context.close();
 }
 check('no model calls or network escapes',report.modelCalls===0&&report.blocked.length===0);check('no runtime errors',report.errors.length===0);
}finally{await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,checks:report.checks.length,findings:report.findings,errors:report.errors}));}
