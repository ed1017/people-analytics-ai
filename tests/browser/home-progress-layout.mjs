// Actual client app and deterministic solution service; synthetic premises, no provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {accountabilityMessage,accountabilityCandidate} from '../fixtures/plan-accountability.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {DATASET_HEADER} from '../../lib/dataset-identity.mjs';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {workforce,attrition,survey,talent,career} from '../fixtures/theme-audit-data.mjs';
const playwright=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const chromium=playwright.chromium??playwright.default.chromium;
const output=process.env.LAYOUT_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'home-progress-layout-'));
const build=process.env.AUDIT_BUILD??await fs.mkdtemp(path.join(os.tmpdir(),'turnover-context-client-'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(build,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3188';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-domain-reliability','--disable-sync','--metrics-recording-only','--host-resolver-rules=MAP * ~NOTFOUND']});
const report={scope:'Offline actual Page, progress and Home request-state layout',checks:[],cases:[]};
const check=(label,value)=>{assert.ok(value,label);report.checks.push(label);};
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:12,fill_rate_pct:90,productivity_hiring_reduction_pct:5};
const points=Array.from({length:12},(_,i)=>({planning_month:'2027-'+String(i+1).padStart(2,'0')+'-01',planned_headcount:1000+i*10,planned_fte:980+i*10,planned_hires:15,planned_exits:5,planned_labor_cost_usd:10000000+i*100000}));
function payload(path,query,next){
 const n=next?9100:5100;
 if(path==='/api/dashboard'){const data=scopeDashboard(query);data.overview.headcount=n;data.overview.fte=n-10;return data;}
 if(path==='/api/workforce')return {...workforce,summary:{...workforce.summary,headcount:n}};
 if(path==='/api/attrition')return {...attrition,summary:{...attrition.summary,voluntary_turnover_ytd_pct:next?4.2:6.2}};
 if(path==='/api/survey-sentiment')return {...survey,summary:{...survey.summary,engagement_favorable_pct:next?81:73}};
 if(path==='/api/talent-acquisition')return {...talent,summary:{...talent.summary,median_time_to_fill_days:next?39:49}};
 if(path==='/api/skills')return {as_of:'2026-09-30',summary:{active_skills:32,current_workforce:n,skills_with_demand:30,skills_below_60_pct:4,skills_below_75_pct:8,weighted_requirement_met_pct:next?82:68,average_profile_coverage_pct:75,onet_mapped_job_profiles:10,total_job_profiles:20},largest_gaps:[],highest_demand:[],strongest_coverage:[]};
 if(path==='/api/career-growth-mobility')return career;
 if(path==='/api/finance')return {as_of:'2026-09-30',current:{headcount:n,fte:n-10,labor_cost_usd:next?910000:510000,cost_per_fte_usd:100,vacant_positions:20,estimated_vacancy_cost_exposure_usd:2000},by_business_unit:[],scenarios:[]};
 if(path==='/api/workforce-planning')return {scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',description:'Synthetic company scenario',assumptions:[],points}]};
 if(path==='/api/scenario-modeler')return runScenarioModel({asOf:'2026-09-30',startingHeadcount:n,baselinePoints:points,defaults,assumptions:defaults});
 if(path==='/api/business-unit-scenario')return {defaults,business_units:[]};
 if(path==='/api/position-modeling')return {as_of:'2026-09-30',planning_month:'2026-10-01',current:{current_positions:n,filled_positions:n-20,vacant_positions:20,planned_positions:n,frozen_positions:0,closed_positions:0,vacancy_rate_pct:1},scenarios:[]};
 if(path==='/api/compensation-ranges')return {jobs:[],levels:[],combinations:[]};
 return null;
}

function measure(){
 const visible=e=>{if(!e.getClientRects().length||getComputedStyle(e).visibility==='hidden'||!e.closest('body')||e.closest('[hidden]'))return false;for(let n=e.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS'&&!n.open&&!n.querySelector(':scope > summary')?.contains(e))return false;return true;};
 const box=e=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top+scrollY),height:Math.round(r.height),width:Math.round(r.width)}};
 const all=selector=>[...document.querySelectorAll(selector)].filter(visible);
 const text=e=>(e.innerText||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,180);
 return {height:document.documentElement.scrollHeight,width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,scrollY,
  reading:all('[aria-label="Home chat workspace"]').map(e=>{const r=e.getBoundingClientRect(),header=document.querySelector('main > header'),dock=document.querySelector('.home-composer-dock');const fixed=n=>['fixed','sticky'].includes(getComputedStyle(n).position);const top=Math.max(0,r.top,fixed(header)?header.getBoundingClientRect().bottom:0),bottom=Math.min(innerHeight,r.bottom,fixed(dock)?dock.getBoundingClientRect().top:innerHeight);return {...box(e),client:e.clientHeight,visibleHeight:Math.max(0,Math.round(bottom-top))};}),
  progress:all('[aria-label="Goal progress"]').map(e=>({...box(e),text:text(e)})),
  headings:all('h1,h2,h3,h4').map(e=>({text:text(e),...box(e)})),
  sections:all('section[aria-label],article[aria-label],[aria-label="Action Plan quick summary"],[aria-label="Selected plan summary"]').map(e=>({label:e.getAttribute('aria-label'),...box(e)})),
  charts:all('.recharts-wrapper').map(e=>({...box(e),label:text(e.parentElement.querySelector('h2,h3,h4')??e.parentElement),fontSizes:[...new Set([...e.querySelectorAll('text')].map(n=>getComputedStyle(n).fontSize))]})),
  tables:all('table').map(e=>({...box(e),rows:e.rows.length,columns:e.rows[0]?.cells.length,containerWidth:e.parentElement.clientWidth,scrollWidth:e.parentElement.scrollWidth,overflowX:getComputedStyle(e.parentElement).overflowX,role:e.parentElement.getAttribute('role'),tabIndex:e.parentElement.getAttribute('tabindex'),label:e.parentElement.getAttribute('aria-label')})),
  disclosures:all('details').map(e=>({label:text(e.querySelector('summary')),open:e.open,...box(e),summaryHeight:Math.round(e.querySelector('summary').getBoundingClientRect().height)})),
  scrollContainers:all('*').filter(e=>['auto','scroll'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+8).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label'),class:e.className,client:e.clientHeight,scroll:e.scrollHeight})),
  text:document.querySelector('.app-dashboard')?.innerText??document.body.innerText};
}

try{for(const [size,width,height] of [['laptop',1366,768],['phone',390,844],['narrow',1024,768],['zoom-equivalent',683,384]])for(const pinned of [false,true]){
 const context=await browser.newContext({viewport:{width,height},offline:true,serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[],blocked=[];let phase='plan',release,started,finished,complete,posts=0;
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.origin===base)return route.fulfill({contentType:'text/html',body:html});
  if(url.origin!==base){blocked.push(url.href);return route.abort();}
  const headers={[DATASET_HEADER]:req.headers()[DATASET_HEADER]??'legacy-v1:0'};
  if(url.pathname==='/api/home-solution-conversation'){
   posts++;const body=req.postDataJSON(),current=phase;
   if(current!=='plan'){await new Promise(resolve=>{release=resolve;started?.();});}
   try{
    if(current==='fail')return await route.fulfill({status:422,headers,json:{error:'The conversation could not be verified.',code:'response_validation_failed'}});
    const candidate=accountabilityCandidate(body);candidate.quantities=candidate.quantities.filter(q=>!['success_baseline','success_target'].includes(q.field));
    const steps=current==='plan'?[evaluate(candidate),final('Review this fictional plan.',[candidate.id])]:[final('Review the recorded scope before acting.')];
    return await route.fulfill({headers,json:await converseSolutions(body,fixtureRuntime(steps),new AbortController().signal)});
   }catch(error){if(!req.failure())throw error;}finally{complete?.();}
  }
  if(url.pathname.startsWith('/api/')){const data=payload(url.pathname,url.search,false);return route.fulfill(data?{headers,json:data}:{status:503,headers,json:{error:'Synthetic source unavailable'}});}
  blocked.push(url.href);return route.abort();
 });
 await page.goto(base);await dismissHomeOnboarding(page);
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=page.getByRole('button',{name:'Send overview question',exact:true}),cancel=page.getByRole('button',{name:'Cancel request',exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const savedPlans=async()=>JSON.stringify(Object.values((await state()).workspaces).map(w=>({bundles:w.fields.homeSolutionBundlesV1,plans:w.fields.homePlanAlternativesV1,progress:w.fields.goalProgressV1})));
 const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const prefix=size+' '+(pinned?'pinned':'unpinned');
 const capture=async name=>{await frame();const g=await page.evaluate(measure);report.cases.push({name:prefix+' '+name,...g});await page.screenshot({path:path.join(output,prefix.replaceAll(' ','-')+'-'+name+'.png')});await fs.writeFile(path.join(output,'geometry.json'),JSON.stringify(report,null,2));return g;};
 const visible=async locator=>locator.evaluate(node=>{const r=node.getBoundingClientRect(),port=document.querySelector('[aria-label="Home chat workspace"]'),header=document.querySelector('main > header'),dock=document.querySelector('.home-composer-dock');const fixed=n=>['fixed','sticky'].includes(getComputedStyle(n).position);let top=Math.max(0,fixed(header)?header.getBoundingClientRect().bottom:0),bottom=Math.min(innerHeight,fixed(dock)&&!dock.contains(node)?dock.getBoundingClientRect().top:innerHeight);if(port.contains(node)&&getComputedStyle(port).overflowY==='auto'){top=Math.max(top,port.getBoundingClientRect().top);bottom=Math.min(bottom,port.getBoundingClientRect().bottom);}return r.top>=top-2&&r.bottom<=bottom+2;});
 await input.fill(accountabilityMessage);await send.click();const card=page.getByRole('article',{name:'Working proposal: Accountability review',exact:true});await card.waitFor();check(prefix+' one current recommendation',await page.getByRole('article',{name:/^Working proposal:/}).count()===1);
 if(pinned){await card.getByRole('button',{name:/^Save plan/}).click();await card.getByRole('button',{name:/^Pinned Action Plan/}).waitFor();}
 await page.evaluate(()=>scrollTo(0,0));const initial=await capture('initial');check(prefix+' reading area fits its layout',size==='zoom-equivalent'?initial.reading[0].client>240:initial.reading[0].visibleHeight>=120);const original=await savedPlans();
 if(pinned){
  const summary=page.getByText('Measurement details and plan link',{exact:true});
  await summary.focus();await page.keyboard.press('Enter');check(prefix+' keyboard expands details with focus retained',await summary.evaluate(n=>n===document.activeElement&&n.parentElement.open));
  await input.fill('Keep this draft');await summary.focus();await page.keyboard.press('Enter');check(prefix+' collapse retains focus and draft',await summary.evaluate(n=>n===document.activeElement&&!n.parentElement.open)&&await input.inputValue()==='Keep this draft');
  check(prefix+' disclosure preserves saved records',await savedPlans()===original);
 }
 const begin=async next=>{phase=next;const gate=new Promise(resolve=>started=resolve);finished=new Promise(resolve=>complete=resolve);await input.fill('What workforce risks should we investigate next?' );await input.focus();await input.evaluate(n=>n.form.requestSubmit());await Promise.race([gate,new Promise((_,reject)=>setTimeout(()=>reject(Error('Request gate did not start')),10000))]);await cancel.waitFor();await frame();};
 await begin('fail');const status=page.getByRole('status').filter({has:cancel});await status.waitFor();
 check(prefix+' pending status visible in actual reading viewport',await visible(status));
 check(prefix+' submission preserves input focus',await input.evaluate(n=>n===document.activeElement));await capture('pending');
 // Explicit focus must make the cancellation action usable, including document-flow mobile.
 await cancel.focus();await frame();check(prefix+' cancellation control reachable above any dock',await visible(cancel));
 release();await finished;await cancel.waitFor({state:'hidden'});const error=page.getByRole('alert').last();await error.waitFor();
 const automaticFailureVisible=await visible(error);await error.scrollIntoViewIfNeeded();await frame();check(prefix+' failure remains readable',await visible(error));
 check(prefix+' failed question retained as editable retry',await input.inputValue()==='What workforce risks should we investigate next?' );await capture('failed');check(prefix+' failed error appears without a manual reveal',automaticFailureVisible);
 await send.focus();await frame();check(prefix+' retry Send reachable by keyboard',await visible(send));
 const beforeRetry=posts;await begin('success');await input.fill('Keep a later draft');
 await page.evaluate(()=>{scrollTo(0,0);document.querySelector('[aria-label="Home chat workspace"]').scrollTop=0;});await frame();
 const parked=await page.evaluate(()=>({outer:scrollY,inner:document.querySelector('[aria-label="Home chat workspace"]').scrollTop}));
 release();await finished;await cancel.waitFor({state:'hidden'});await frame();
 const after=await page.evaluate(()=>({outer:scrollY,inner:document.querySelector('[aria-label="Home chat workspace"]').scrollTop}));
 check(prefix+' retry issued exactly once',posts===beforeRetry+1);check(prefix+' completion preserves later draft and focus',await input.inputValue()==='Keep a later draft'&&await input.evaluate(n=>n===document.activeElement));
 check(prefix+' completion preserves reader scroll',Math.abs(after.outer-parked.outer)<3&&Math.abs(after.inner-parked.inner)<3);await capture('retried');
 await begin('cancel');await input.fill('Preserve cancelled draft');await cancel.click();release();await finished;await cancel.waitFor({state:'hidden'});
 check(prefix+' cancellation preserves newer draft',await input.inputValue()==='Preserve cancelled draft');check(prefix+' request states preserve saved plans',await savedPlans()===original);await capture('cancelled');
 check(prefix+' no errors, network escapes or document overflow',errors.length===0&&blocked.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close();await fs.writeFile(path.join(output,'geometry.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,states:report.cases.length,output}));}
