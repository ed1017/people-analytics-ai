// Actual client app and deterministic solution service; synthetic premises, no provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {evidenceLayoutPayload} from '../fixtures/evidence-layout-data.mjs';
import {DATASET_HEADER} from '../../lib/dataset-identity.mjs';
const playwright=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const chromium=playwright.chromium??playwright.default.chromium;
const output=process.env.LAYOUT_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'evidence-pane-layout-'));
const build=process.env.AUDIT_BUILD??await fs.mkdtemp(path.join(os.tmpdir(),'turnover-context-client-'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(build,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3188';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-domain-reliability','--disable-sync','--metrics-recording-only','--host-resolver-rules=MAP * ~NOTFOUND']});
const report={scope:'Offline populated actual Page and keyboard AI-panel resize; no live data',checks:[],cases:[],runtimeErrors:[]};
const baseline=process.env.LAYOUT_BASELINE==='1';
const check=(label,value)=>{report.checks.push({label,pass:!!value});if(!baseline)assert.ok(value,label);};

const destinations=['talent-acquisition','survey-sentiment','skills','career-growth-mobility','workforce','attrition','scenario-modeling'].filter(name=>!process.env.LAYOUT_CASE||process.env.LAYOUT_CASE.split(',').includes(name));
const rootSelector=destination=>destination==='workforce'?'.app-dashboard .evidence-workspace:has(h2:text-is("Company composition"))':destination==='career-growth-mobility'?'[aria-labelledby="recorded-movement-history-heading"]':destination==='scenario-modeling'?'[data-planning-destination="scenario-modeling"]':'.app-dashboard .evidence-workspace';
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
function geometry(root){
 const rect=e=>{const r=e.getBoundingClientRect();return {width:Math.round(r.width),height:Math.round(r.height),top:Math.round(r.top+scrollY)}};
 const shown=e=>{if(!e.getClientRects().length)return false;for(let p=e;p;p=p.parentElement)if(p.hidden||p.tagName==='DETAILS'&&!p.open&&!p.querySelector(':scope > summary')?.contains(e))return false;return true;};
 return {pane:rect(root),documentOverflow:document.documentElement.scrollWidth-innerWidth,headings:[...root.querySelectorAll('h2,h3')].filter(shown).map(e=>({text:e.textContent.trim(),...rect(e)})),charts:[...root.querySelectorAll('.recharts-wrapper')].filter(shown).map(e=>({...rect(e),fonts:[...new Set([...e.querySelectorAll('text')].map(n=>getComputedStyle(n).fontSize))]})),tables:[...root.querySelectorAll('table')].filter(shown).map(t=>({rows:t.tBodies[0]?.rows.length??0,columns:t.rows[0]?.cells.length??0,...rect(t),container:t.parentElement.clientWidth,scrollWidth:t.parentElement.scrollWidth,label:t.parentElement.getAttribute('aria-label'),tabindex:t.parentElement.tabIndex,font:getComputedStyle(t).fontSize})),text:root.innerText};
}
try{for(const [size,width,height] of [['desktop',1366,768],['narrow-desktop',1024,768],['phone',390,844],['small-phone',320,740]].filter(([name])=>!process.env.LAYOUT_VIEWPORT||process.env.LAYOUT_VIEWPORT===name)){
 const context=await browser.newContext({viewport:{width,height},offline:true,serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);
 const errors=[],blocked=[],posts=[];let mode='populated';page.on('pageerror',e=>{errors.push(e.message);report.runtimeErrors.push({size,message:e.message});});
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.origin===base)return route.fulfill({contentType:'text/html',body:html});
  if(url.origin!==base){blocked.push(url.href);return route.abort();}
  if(req.method()==='POST')posts.push(url.pathname);
  if(url.pathname.startsWith('/api/')){
   const headers={[DATASET_HEADER]:req.headers()[DATASET_HEADER]??'legacy-v1:0'};let data=evidenceLayoutPayload(url.pathname,url.search,req.method()==='POST'?req.postDataJSON():null);
   if(mode==='unavailable'&&url.pathname!=='/api/dashboard')data=null;
   if(mode==='empty'&&data&&url.pathname!=='/api/dashboard'){data=structuredClone(data);for(const key of Object.keys(data))if(Array.isArray(data[key]))data[key]=[];}
   return route.fulfill(data?{headers,json:data}:{status:503,headers,json:{error:'Synthetic source unavailable'}});
  }
  blocked.push(url.href);return route.abort();
 });
 const navigate=async destination=>{
  const trigger=page.getByRole('button',{name:'Open navigation',exact:true});if(await trigger.isVisible())await trigger.click();
  const link=page.locator(`[data-nav-destination="${destination}"]`),group=await link.evaluate(n=>n.parentElement.id),toggle=page.locator(`button[aria-controls="${group}"]`);if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await link.click();
  await page.getByRole('status',{name:'Data loading status',exact:true}).waitFor({state:'hidden'});await frame(page);
 };
 await page.goto(base);await dismissHomeOnboarding(page);
 for(const destination of destinations){
  await navigate(destination);const root=page.locator(rootSelector(destination)).filter({visible:true}).first();try{await root.waitFor();}catch(error){console.log(JSON.stringify({destination,errors,text:(await page.locator('body').innerText()).slice(-2500)}));throw error;}
  await root.locator('table tbody tr').first().waitFor();
  if(destination==='scenario-modeling'){
   await root.getByRole('button',{name:'Run Scenario',exact:true}).click();await root.getByRole('button',{name:'Save Scenario',exact:true}).waitFor();
   await root.getByPlaceholder('Scenario name',{exact:true}).fill('Layout comparison');await root.getByRole('button',{name:'Save Scenario',exact:true}).click();
   await root.getByRole('checkbox',{name:/Layout comparison/}).check();await root.getByText('Fictional segment rows for layout; not reconciled planning evidence.',{exact:true}).waitFor();
  }
  if(destination==='skills')await root.getByPlaceholder('Example: Explore ways to strengthen AI capability without increasing company authorized positions.',{exact:true}).fill('Keep this unsaved planning goal.');
  const beforeBytes=await page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY),beforePosts=posts.length;
  const cases=size==='desktop'?['current','minimum-ai','maximum-ai']:['current'];
  const paneWidths=[];
  for(const pane of cases){
   if(pane!=='current'){const resize=page.getByRole('separator',{name:'Resize AI panel',exact:true});await resize.focus();await page.keyboard.press(pane==='minimum-ai'?'Home':'End');await frame(page);check(size+' '+destination+' '+pane+' resizer keeps keyboard focus',await resize.evaluate(n=>n===document.activeElement));}
   await page.evaluate(()=>scrollTo(0,0));await frame(page);await page.waitForTimeout(200);
   const g=await root.evaluate(geometry);paneWidths.push(g.pane.width);report.cases.push({size,destination,paneMode:pane,mode,...g});
   const key=[size,destination,pane].join('-');await page.screenshot({path:path.join(output,key+'.png')});
   const firstChart=root.locator('.recharts-wrapper:visible').first();if(await firstChart.count())await firstChart.screenshot({path:path.join(output,key+'-chart.png')});
   check(key+' no document overflow or clipped table region',g.documentOverflow<=0&&g.tables.every(t=>t.container<=g.pane.width));
   check(key+' populated table rows and columns retained',g.tables.length>0&&g.tables.every(t=>t.rows>=2&&t.columns>=2));
   check(key+' horizontally scrolling tables named and keyboard focusable',g.tables.every(t=>t.width<=t.container+1||t.label&&t.tabindex===0));
   check(key+' chart width follows pane without narrow desktop split',g.charts.every(c=>c.width>=Math.min(250,g.pane.width-68)));
   const regions=root.locator('[data-evidence-table]');
   for(let i=0;i<await regions.count();i++){
    const region=regions.nth(i);await region.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);
    const state=await region.evaluate(n=>({overflow:n.scrollWidth>n.clientWidth+1,left:n.scrollLeft,focus:n===document.activeElement,outline:parseFloat(getComputedStyle(n).outlineWidth),hint:n.getAttribute('aria-describedby')?document.getElementById(n.getAttribute('aria-describedby'))?.textContent:null}));
    check(key+' table '+i+' keyboard focus and overflow cue',state.focus&&state.outline>0&&(!state.overflow||state.left>0&&state.hint?.includes('Scroll horizontally')));
   }
   if(destination==='skills')check(key+' scope and unsaved handoff retained',g.text.includes('Company workforce')&&g.text.includes('Skill-level denominators')&&await root.getByPlaceholder('Example: Explore ways to strengthen AI capability without increasing company authorized positions.',{exact:true}).inputValue()==='Keep this unsaved planning goal.');
   if(destination==='career-growth-mobility')check(key+' movement scope and limitations visible',g.text.includes('Source coverage & limitations')&&g.text.includes('do not filter these movement events'));
   if(destination==='scenario-modeling')check(key+' scenario assumptions and segment limitation visible',g.text.includes('explicit planning assumptions')&&g.text.includes('not reconciled planning evidence'));
   await fs.writeFile(path.join(output,'geometry.json'),JSON.stringify(report,null,2));
  }
  if(size==='desktop')check(destination+' actual pane changed with AI separator',Math.max(...paneWidths)-Math.min(...paneWidths)>100);
  check(size+' '+destination+' resizing did not write plans or run calculations',beforeBytes===await page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY)&&posts.length===beforePosts);
  // Ordering is assessed in rendered layout, not just source text.
  const precedes=async(a,b)=>(await a.evaluate(n=>n.getBoundingClientRect().top))<(await b.evaluate(n=>n.getBoundingClientRect().top));
  if(destination==='skills')check(size+' Skills metrics precede optional handoff',await precedes(root.getByText('Active Skills',{exact:true}),root.locator('[aria-label="Prepare evidence for Planning"]')));
  if(['attrition','survey-sentiment'].includes(destination))check(size+' '+destination+' observed metrics precede synthetic projection',await precedes(root.getByText(destination==='attrition'?'Voluntary Turnover YTD':'Engagement Favorable',{exact:true}),root.locator('section[aria-label^="Simulated"]')));
  if(destination==='scenario-modeling')check(size+' scenario summary precedes optional controls',await root.getByRole('heading',{name:/Headcount Plan/}).first().evaluate((n,y)=>n.getBoundingClientRect().top<y,await root.getByRole('heading',{name:'Custom Scenario',exact:true}).evaluate(n=>n.getBoundingClientRect().top)));
  check(size+' '+destination+' no browser errors or network escapes',errors.length===0&&blocked.length===0&&!posts.some(p=>p.includes('chat')||p.includes('conversation')));
 }
 // Sparse and unavailable data paths are additional phone cases, not populated acceptance.
 if(size==='phone')for(const nextMode of ['empty','unavailable'])for(const destination of destinations){mode=nextMode;await page.reload();await dismissHomeOnboarding(page);await navigate(destination);const root=page.locator(rootSelector(destination)).filter({visible:true}).first();await root.waitFor();await page.waitForTimeout(200);const g=await root.evaluate(geometry);report.cases.push({size,destination,mode,pane:'default',...g});check(mode+' '+destination+' remains readable without exceptions',errors.length===0&&blocked.length===0&&g.documentOverflow<=0);}
 await context.close();
}}finally{await browser.close();await fs.writeFile(path.join(output,'geometry.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failures:report.checks.filter(x=>!x.pass),cases:report.cases.length,output}));}
