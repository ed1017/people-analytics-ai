// Actual client app and deterministic solution service; synthetic premises, no provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from '../browser/dismiss-home-onboarding.mjs';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {accountabilityMessage,accountabilityCandidate} from '../fixtures/plan-accountability.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {DATASET_HEADER} from '../../lib/dataset-identity.mjs';
import {readBundleWorkspace} from '../../lib/home-bundle-records.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {workforce,attrition,survey,talent,career} from '../fixtures/theme-audit-data.mjs';
const playwright=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const chromium=playwright.chromium??playwright.default.chromium;
const output=process.env.LAYOUT_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'plan-presentation-'));
const baseline=process.env.LAYOUT_BASELINE==='1';
const build=process.env.AUDIT_BUILD??await fs.mkdtemp(path.join(os.tmpdir(),'turnover-context-client-'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(build,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3188';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-domain-reliability','--disable-sync','--metrics-recording-only','--host-resolver-rules=MAP * ~NOTFOUND']});
const knownRaw=JSON.parse(await fs.readFile('tests/fixtures/pre-layout-known-receipt.json','utf8')).raw;
const knownReceipt=knownRaw.attachments[0],knownId=knownRaw.goalId;
const oldBudget=JSON.parse(await fs.readFile('tests/fixtures/home-plan-legacy-costs.json','utf8')).workspace;
assert.ok(readBundleWorkspace(knownRaw,knownId));
const report={scope:'Actual Page and read-only numbered/legacy plan presentation; offline fixtures only.',cases:[],checks:[]};
const check=(label,pass)=>{report.checks.push({label,pass:!!pass});if(!baseline)assert.ok(pass,label);};
const legacy=JSON.parse(await fs.readFile('tests/fixtures/pre-shared-metric-context.json','utf8')).cases[0];
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
  progress:all('[aria-label="Goal progress"]').map(e=>({...box(e),text:text(e)})),
  headings:all('h1,h2,h3,h4').map(e=>({text:text(e),...box(e)})),
  sections:all('section[aria-label],article[aria-label],[aria-label="Action Plan quick summary"],[aria-label="Selected plan summary"]').map(e=>({label:e.getAttribute('aria-label'),...box(e)})),
  charts:all('.recharts-wrapper').map(e=>({...box(e),label:text(e.parentElement.querySelector('h2,h3,h4')??e.parentElement),fontSizes:[...new Set([...e.querySelectorAll('text')].map(n=>getComputedStyle(n).fontSize))]})),
  tables:all('table').map(e=>({...box(e),rows:e.rows.length,columns:e.rows[0]?.cells.length,containerWidth:e.parentElement.clientWidth,scrollWidth:e.parentElement.scrollWidth,overflowX:getComputedStyle(e.parentElement).overflowX,role:e.parentElement.getAttribute('role'),tabIndex:e.parentElement.getAttribute('tabindex'),label:e.parentElement.getAttribute('aria-label')})),
  disclosures:all('details').map(e=>({label:text(e.querySelector('summary')),open:e.open,...box(e),summaryHeight:Math.round(e.querySelector('summary').getBoundingClientRect().height)})),
  scrollContainers:all('*').filter(e=>['auto','scroll'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+8).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label'),class:e.className,client:e.clientHeight,scroll:e.scrollHeight})),
  text:document.querySelector('.app-dashboard')?.innerText??document.body.innerText};
}
try{for(const [size,width,height] of [['laptop',1366,768],['phone',390,844],['small-phone',320,740]]){
 const context=await browser.newContext({viewport:{width,height},offline:true,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);
 let serviceCalls=0;const errors=[],blocked=[];page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.isNavigationRequest()&&url.origin===base)return route.fulfill({contentType:'text/html',body:html});
  if(url.origin!==base){blocked.push(url.href);return route.abort();}
  const token=request.headers()[DATASET_HEADER]??'legacy-v1:0',headers={[DATASET_HEADER]:token};
  if(url.pathname==='/api/home-solution-conversation'){
   serviceCalls++;
   const body=request.postDataJSON(),candidate=accountabilityCandidate(body);candidate.quantities=candidate.quantities.filter(q=>!['success_baseline','success_target'].includes(q.field));
   return route.fulfill({headers,json:await converseSolutions(body,fixtureRuntime([evaluate(candidate),final('Review this fictional plan.',[candidate.id])]),new AbortController().signal)});
  }
  if(url.pathname.startsWith('/api/')){const data=payload(url.pathname,url.search,false);return route.fulfill(data?{headers,json:data}:{status:503,headers,json:{error:'Synthetic source unavailable'}});}
  blocked.push(url.href);return route.abort();
 });
 const oldId=legacy.raw.attachments[0].draft.binding.goalId;
 const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:oldId,statement:legacy.goal}]},workspaces:{[oldId]:{savedAt:'2026-10-09T00:00:00Z',fields:{homeSolutionBundlesV1:legacy.raw}}}};
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.goto(base);await dismissHomeOnboarding(page);
 async function capture(name){await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);const m=await page.evaluate(measure);report.cases.push({name,size,errors:[...errors],blocked:[...blocked],...m});await page.screenshot({path:path.join(output,name+'-'+size+'.png'),fullPage:true});await page.screenshot({path:path.join(output,name+'-'+size+'-viewport.png')});await fs.writeFile(path.join(output,'geometry.json'),JSON.stringify(report,null,2));console.log(name,size,m.height,m.charts.length,m.tables.length);}
 async function navigate(target){const trigger=page.getByRole('button',{name:'Open navigation',exact:true});if(await trigger.isVisible())await trigger.click();if(target==='home')await page.getByRole('button',{name:'Action Planning',exact:true}).click();else{const link=page.locator(`[data-nav-destination="${target}"]`),group=await link.evaluate(n=>n.parentElement.id),toggle=page.locator(`button[aria-controls="${group}"]`);if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await link.click();}await page.waitForTimeout(250);}
 const bytes=()=>page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY);
 async function inspect(name,root){
  await root.waitFor();await page.waitForTimeout(200);
  const before=await bytes();
  check(size+' '+name+' exactly one cost/time/resource overview',await root.getByRole('region',{name:'Action Plan quick summary',exact:true}).count()===1);
  const quick=root.getByRole('region',{name:'Action Plan quick summary',exact:true});
  if(await quick.count())check(size+' '+name+' summary font remains readable',await quick.evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=16));
  const details=root.locator('details').filter({visible:true});
  for(let i=0;i<await details.count();i++){
   const detail=details.nth(i),summary=detail.locator(':scope > summary');
   if(!await summary.isVisible()||await detail.evaluate(n=>n.open))continue;
   await summary.focus();await page.keyboard.press('Enter');
   check(size+' '+name+' disclosure '+i+' keyboard opens and keeps focus',await detail.evaluate(n=>n.open)&&await summary.evaluate(n=>n===document.activeElement&&(n.textContent!=='Plan details and assumptions'||parseFloat(getComputedStyle(n).outlineWidth)>0)));
   await page.keyboard.press('Space');check(size+' '+name+' disclosure '+i+' closes with keyboard',await detail.evaluate(n=>!n.open));
  }
  check(size+' '+name+' reading preserves saved bytes',await bytes()===before);
 }
 await capture('home-initial');
 await page.getByLabel('Ask Workforce AI',{exact:true}).fill(accountabilityMessage);await page.getByRole('button',{name:'Send overview question',exact:true}).click();
 const card=page.getByRole('article',{name:'Working proposal: Accountability review',exact:true});await card.waitFor();await capture('home-working');
 await card.screenshot({path:path.join(output,'working-card-'+size+'.png')});
 const composer=page.getByLabel('Ask Workforce AI',{exact:true}),unsent='Unsent revision: keep my proposed coordination hours at 24.';
 await composer.fill(unsent);const beforeDisclosureCalls=serviceCalls;await inspect('working',card);
 check(size+' disclosure preserves unsent revision without requests',await composer.inputValue()===unsent&&serviceCalls===beforeDisclosureCalls);await composer.fill('');
 await card.getByRole('button',{name:/^Pin Action Plan/}).click();await card.getByRole('button',{name:/^Pinned Action Plan/}).waitFor();await capture('home-pinned');
 const saved=page.locator('summary').filter({hasText:/^Saved Action Plans$/});if(await saved.count()){await saved.click();await capture('home-saved-expanded');await inspect('saved',page.getByRole('article',{name:'Action Plan option 1',exact:true}).first());await saved.click();}
 await navigate('decision-brief');await capture('decision-brief');
 const attached=page.getByRole('region',{name:'Attached Action Plans',exact:true}),attachedCard=attached.getByRole('article').first();
 await inspect('attached',attachedCard);
 if(size==='phone')check(size+' numbered attachment is compact with details closed',await attached.evaluate(n=>n.getBoundingClientRect().height)<=1520);
 const fields=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const currentId=fields.goals.activeId,savedRecords=JSON.stringify(fields.workspaces[currentId].fields.homePlanAlternativesV1);
 await page.reload();await dismissHomeOnboarding(page);await navigate('decision-brief');
 check(size+' reload preserves numbered snapshot bytes',await page.evaluate(({key,id,expected})=>JSON.stringify(JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homePlanAlternativesV1)===expected,{key:DECISIONS_STORAGE_KEY,id:currentId,expected:savedRecords}));
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({...seed,goals:{...seed.goals,activeId:oldId}})});await page.reload();await dismissHomeOnboarding(page);await navigate('decision-brief');await capture('legacy-decision-brief');
 const legacyCard=page.getByRole('region',{name:'Attached Action Plans',exact:true}).getByRole('article').first();
 await inspect('legacy-attached',legacyCard);
 check(size+' legacy source value remains unverified with exact provenance visible',await legacyCard.innerText().then(t=>t.includes('6.2%')&&t.includes('Unverified')&&t.includes('A1.voluntary_turnover_ytd_pct')&&t.includes('2026-09-30')));
 check(size+' legacy historical record bytes unchanged',await page.evaluate(({key,id,expected})=>JSON.stringify(JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1)===expected,{key:DECISIONS_STORAGE_KEY,id:oldId,expected:JSON.stringify(legacy.raw)}));
 const changedGoal='Review a much longer fictional goal across research, engineering, customer support, finance and corporate services while preserving the original attached assumptions and historical measurement provenance.';
 const changedSeed={...seed,goals:{...seed.goals,activeId:oldId,goals:[{id:oldId,statement:changedGoal}]}};
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(changedSeed)});await page.reload();await dismissHomeOnboarding(page);await navigate('decision-brief');await capture('legacy-goal-changed');
 check(size+' changed long goal keeps historical mismatch visible',await page.getByText('Goal wording has changed since this attachment.',{exact:true}).isVisible()&&await page.evaluate(({key,id,expected})=>JSON.stringify(JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1)===expected,{key:DECISIONS_STORAGE_KEY,id:oldId,expected:JSON.stringify(legacy.raw)}));
 const invalid={...seed,goals:{...seed.goals,activeId:oldId},workspaces:{[oldId]:{...seed.workspaces[oldId],fields:{homeSolutionBundlesV1:{...legacy.raw,version:99}}}}};
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(invalid)});await page.reload();await dismissHomeOnboarding(page);await navigate('decision-brief');await capture('unverifiable-attachment');
 check(size+' unreadable saved record keeps its error visible',await page.getByText('Saved Action Plan records cannot be verified. They are kept unchanged; review them on Home.',{exact:true}).isVisible()&&await page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1.version===99,{key:DECISIONS_STORAGE_KEY,id:oldId}));
 const knownSeed={version:1,revision:1,goals:{version:1,activeId:knownId,goals:[{id:knownId,statement:knownReceipt.draft.binding.goal}]},workspaces:{[knownId]:{savedAt:'2026-10-07T12:00:00Z',fields:{homeSolutionBundlesV1:knownRaw}}}};
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(knownSeed)});await page.reload();await dismissHomeOnboarding(page);await navigate('decision-brief');await capture('legacy-known-receipt');
 const knownCard=page.getByRole('region',{name:'Attached Action Plans',exact:true}).getByRole('article').first();await inspect('legacy-known',knownCard);
 check(size+' legacy known receipt retains exact cash and finish',await knownCard.innerText().then(text=>text.includes('$3,000')&&(!knownReceipt.result.planFinish||text.includes(knownReceipt.result.planFinish)))&&await page.evaluate(({key,id,expected})=>JSON.stringify(JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1)===expected,{key:DECISIONS_STORAGE_KEY,id:knownId,expected:JSON.stringify(knownRaw)}));
 check(size+' accepted historical cash, hours, people and finish are visible with details closed',await knownCard.getByRole('region',{name:'Total cost',exact:true}).getByText('$3,000',{exact:true}).isVisible()&&await knownCard.getByRole('region',{name:'Resources',exact:true}).innerText().then(t=>t.includes('Delivery hours: 36')&&/People\s+10/.test(t))&&await knownCard.getByRole('region',{name:'Timeline',exact:true}).innerText().then(t=>t.includes('2026-11-28'))&&await knownCard.getByText('Plan details and assumptions',{exact:true}).evaluate(n=>!n.parentElement.open));
 check(size+' historical proposal status remains visible',await knownCard.getByText('Attached 2026-10-07 · Latest attached version',{exact:true}).isVisible()&&await knownCard.getByText('Proposal · effects, owners and funding unconfirmed.',{exact:true}).isVisible());
 await page.getByRole('button',{name:'Review Action Plans on Home',exact:true}).click();
 check(size+' review button returns to Home without changing snapshot',await page.getByLabel('Ask Workforce AI',{exact:true}).isVisible()&&await page.evaluate(({key,id,expected})=>JSON.stringify(JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1)===expected,{key:DECISIONS_STORAGE_KEY,id:knownId,expected:JSON.stringify(knownRaw)}));
 const budgetId=oldBudget.goalId,budgetSeed={version:1,revision:1,goals:{version:1,activeId:budgetId,goals:[{id:budgetId,statement:oldBudget.attachments[0].draft.binding.goal}]},workspaces:{[budgetId]:{savedAt:'2026-10-06T12:05:00Z',fields:{homeSolutionBundlesV1:oldBudget}}}};
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(budgetSeed)});await page.reload();await dismissHomeOnboarding(page);await navigate('decision-brief');await capture('legacy-budget-receipt');
 const budgetCard=page.getByRole('region',{name:'Attached Action Plans',exact:true}).getByRole('article').first();
 check(size+' original legacy budget cash headroom and uncertainty remain visible',await budgetCard.getByText(/\$2,500 USD headroom under the listed assumptions/).filter({visible:true}).isVisible()&&await budgetCard.getByRole('region',{name:'Resources',exact:true}).innerText().then(t=>t.includes('Delivery hours: 36'))&&await budgetCard.innerText().then(t=>t.includes('actual costs and funding remain unverified')&&!t.includes('$2,700')&&!t.includes('$6,200')));
 await budgetCard.getByText('Plan details and assumptions',{exact:true}).click();
 check(size+' expanded detail preserves the same historical budget wording',await budgetCard.getByLabel('Selected plan summary').getByText(/\$2,500 USD headroom under the listed assumptions/).isVisible()&&await budgetCard.getByLabel('Selected plan summary').getByText(/no available headroom is established/).count()===0);
 check(size+' legacy budget receipt is not rewritten',await page.evaluate(({key,id,expected})=>JSON.stringify(JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1)===expected,{key:DECISIONS_STORAGE_KEY,id:budgetId,expected:JSON.stringify(oldBudget)}));
 check(size+' no document overflow, runtime errors or network escapes',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&blocked.length===0);
 await context.close();
}}finally{await browser.close();await fs.writeFile(path.join(output,'geometry.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failures:report.checks.filter(x=>!x.pass),states:report.cases.length,output}));}
