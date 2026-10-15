// Actual client app and deterministic solution service; synthetic premises, no provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {createDomainRace,hasDomainRace} from './dataset-domain-race.mjs';
import {runDatasetRollback} from './dataset-rollback.mjs';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {accountabilityMessage,accountabilityScopeChange,accountabilityCandidate,accountabilityQuantity} from '../fixtures/plan-accountability.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions,datasetDecisionKey} from '../../lib/local-decisions.ts';
import {DATASET_HEADER} from '../../lib/dataset-identity.mjs';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {workforce,attrition,survey,talent,career} from '../fixtures/theme-audit-data.mjs';
const playwright=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const chromium=playwright.chromium??playwright.default.chromium;
const output=process.env.AUDIT_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'dataset-lifecycle-'));
const build=process.env.AUDIT_BUILD??await fs.mkdtemp(path.join(os.tmpdir(),'turnover-context-client-'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(build,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,experiments:{css:true},plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/dataset-lifecycle-client.tsx'),output:{path:build,filename:'fixture.js',cssFilename:'fixture.css',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.css$/,type:'css/module',parser:{namedExports:false}},{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/fixture.css"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3188';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-domain-reliability','--disable-sync','--metrics-recording-only','--host-resolver-rules=MAP * ~NOTFOUND']});
const domains=[['Action Planning','home','/api/dashboard'],['Workforce','workforce','/api/workforce'],['Attrition/listening','attrition','/api/attrition'],['Finance/compensation','finance','/api/finance'],['Hiring','talent-acquisition','/api/talent-acquisition'],['Skills/mobility','skills','/api/skills'],['Planning/scenarios','planning-overview','/api/position-modeling'],['Planning/scenarios','scenario-modeling','/api/scenario-modeler'],['Saved Decision brief','decision-brief','/api/dashboard'],['Attrition/listening','survey-sentiment','/api/survey-sentiment'],['Finance/compensation','compensation','/api/compensation'],['Skills/mobility','career-growth-mobility','/api/career-growth-mobility']];
const report={scope:'Actual Page + DatasetBoundary, synthetic server-layout token changes. Production selection is not exercised.',cases:[]};
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
try{
 if(!process.env.LIFECYCLE_CASE&&!process.env.LIFECYCLE_DOMAIN_RACES)await runDatasetRollback({browser,base,html,build,payload,report});
 for(const [domain,destination,endpoint] of domains)for(const [size,width,height] of [['desktop',1350,1000],['phone',390,844]])for(const phase of process.env.LIFECYCLE_DOMAIN_RACES?['headers','body']:[null]){
  if(process.env.LIFECYCLE_ROLLBACK_ONLY)continue;
  if(phase&&!hasDomainRace(destination))continue;
  if(process.env.LIFECYCLE_CASE&&!`${destination}-${size}`.includes(process.env.LIFECYCLE_CASE))continue;
  const item={domain,destination,size,phase,checks:[],errors:[],requests:[],blocked:[],solutionCalls:0};report.cases.push(item);
  const context=await browser.newContext({viewport:{width,height},offline:true,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);
  const race=phase?createDomainRace(destination,phase,payload):null;
  if(race)await race.install(context);
  page.on('pageerror',e=>item.errors.push(e.message));let holdDashboard=false,held,release;
  const check=(name,ok)=>{assert.ok(ok,domain+' '+size+' '+name);item.checks.push(name);console.log('PASS '+domain+' '+size+' '+name);};
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.isNavigationRequest()&&url.origin===base)return route.fulfill({contentType:'text/html',body:html});
   if(url.origin!==base){item.blocked.push(url.href);return route.abort();}
   if(url.pathname.startsWith('/assets/'))return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:await fs.readFile(path.join(build,path.basename(url.pathname)))});
   const token=req.headers()[DATASET_HEADER],next=token==='fixture-next:1';item.requests.push({path:url.pathname,token,method:req.method()});
   const headers={[DATASET_HEADER]:token??'legacy-v1:0'};
   if(url.pathname==='/api/home-solution-conversation'){
    item.solutionCalls++;const body=req.postDataJSON();let steps;
    if(body.message.text===accountabilityScopeChange){const prior=body.state.working.at(-1);steps=[{name:'revise_parameters',args:{edit:{id:prior.id,source:{kind:'working',id:prior.id,revision:prior.revision},quantities:[accountabilityQuantity(body,'population','Another fictional test group','text')]},constraintUpdates:[]}},final('Review the revised population. Saved snapshots are unchanged.',[prior.id])];}
    else{assert.equal(body.message.text,accountabilityMessage);const c=accountabilityCandidate(body);c.quantities=c.quantities.filter(q=>!['success_baseline','success_target'].includes(q.field));steps=[evaluate(c),final('Review this fictional plan.',[c.id])];}
    return route.fulfill({headers,json:await converseSolutions(body,fixtureRuntime(steps),new AbortController().signal)});
   }
   if(race&&await race.respond(route))return;
   if(url.pathname==='/api/compensation'||url.pathname==='/api/compensation-job-release')return route.fulfill({status:503,headers,json:{error:'Synthetic release unavailable'}});
   if(url.pathname.startsWith('/api/')){
    const data=payload(url.pathname,url.search,next);
    if(!data)return route.fulfill({status:503,headers,json:{error:'Synthetic source unavailable'}});
    if(holdDashboard&&url.pathname==='/api/dashboard'&&!next){holdDashboard=false;held=true;await new Promise(resolve=>release=resolve);data.overview.headcount=777777;}
    return route.fulfill({headers,json:data}).catch(()=>{});
   }
   item.blocked.push(url.href);return route.abort();
  });
  const oldId=legacy.raw.attachments[0].draft.binding.goalId;
  const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:oldId,statement:legacy.goal}]},workspaces:{[oldId]:{savedAt:'2026-10-09T00:00:00Z',fields:{homeSolutionBundlesV1:legacy.raw,sentinel:'immutable legacy attachment'}}}};
  await context.addInitScript(({key,value})=>{
   if(!localStorage.getItem(key))localStorage.setItem(key,value);
   window.__datasetAborts=[];const transport=window.fetch;
   window.fetch=(input,init)=>{if(String(input).startsWith('/api/dashboard')&&init?.signal){init.signal.addEventListener('abort',()=>window.__datasetAborts.push(String(input)),{once:true});if(window.__ignoreDatasetAbort)init={...init,signal:undefined};}return transport(input,init);};
  },{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
  const state=key=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).payload,key);
  async function navigate(target){if(target==='scenario-modeling'){await navigate('planning-overview');const nav=page.getByRole('navigation',{name:'Planning sections'});await nav.locator('summary').click();await nav.getByRole('button',{name:'Open Stored scenario tools',exact:true}).click();return;}const trigger=page.getByRole('button',{name:'Open navigation',exact:true});if(await trigger.isVisible())await trigger.click();if(target==='home')await page.getByRole('button',{name:'Action Planning',exact:true}).click();else{const link=page.locator(`[data-nav-destination="${target}"]`),group=await link.evaluate(n=>n.parentElement.id),toggle=page.locator(`button[aria-controls="${group}"]`);if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await link.click();}await page.waitForFunction(target=>new URLSearchParams(location.search).get('page')===target||(target==='home'&&!location.search),target);}
  await page.goto(base);await dismissHomeOnboarding(page);
  async function send(text){const input=page.getByLabel('Ask Workforce AI',{exact:true});if(!await input.isVisible())await page.locator('summary').filter({hasText:/^Chat & saved goals$/}).click();await input.fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();}
  const card=page.getByRole('article',{name:'Working proposal: Accountability review',exact:true});
  await send(accountabilityMessage);await card.waitFor();await card.getByRole('button',{name:/^Save plan/}).click();await card.getByRole('button',{name:/^Pinned Action Plan/}).waitFor();
  const pinned=await state(DECISIONS_STORAGE_KEY),id=pinned.goals.activeId,attached=pinned.workspaces[id].fields.homePlanAlternativesV1;
  await send(accountabilityScopeChange);await card.getByText(/revision 2/).waitFor();
  check('working revision differs from immutable pinned and attached revision',JSON.stringify((await state(DECISIONS_STORAGE_KEY)).workspaces[id].fields.homePlanAlternativesV1)===JSON.stringify(attached));
  if(race){
   await race.exercise({page,navigate,check,state,key:DECISIONS_STORAGE_KEY,nextKey:datasetDecisionKey('fixture-next:1'),id,oldId,attached,legacy,card,item});
   check('no browser exceptions or network escapes',item.errors.length===0&&item.blocked.length===0);
   await page.screenshot({path:path.join(output,destination+'-'+size+'-'+phase+'.png')});
   await context.close();await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
   continue;
  }
  if(destination!=='home')await navigate(destination);
  await page.waitForFunction(()=>!document.querySelector('[aria-label="AI generation status"]'));
  check('actual domain requested version-bound evidence',item.requests.some(r=>r.path===endpoint&&r.token==='legacy-v1:0'));
  const hasFilters=await page.getByLabel('Country',{exact:true}).count()>0;
  if(!hasFilters)await navigate('home');
  await page.getByLabel('Country',{exact:true}).evaluate(n=>n.closest('details')?.setAttribute('open',''));
  holdDashboard=true;await page.evaluate(()=>window.__ignoreDatasetAbort=true);await page.getByLabel('Country',{exact:true}).selectOption('US');
  for(let i=0;!held&&i<100;i++)await page.waitForTimeout(20);assert.ok(held,'old dataset request held');
  if(!hasFilters)await navigate(destination);
  const before=(await state(DECISIONS_STORAGE_KEY));
  await page.getByLabel('Fixture server bootstrap token',{exact:true}).selectOption('fixture-next:1');
  await page.getByText('Dataset changed. Saved goals and requirements are retained. Earlier evidence and planning drafts remain in their previous dataset workspace.',{exact:true}).waitFor();
  const nextKey=datasetDecisionKey('fixture-next:1');await page.waitForFunction(k=>!!localStorage.getItem(k),nextKey);
  for(let i=0;!item.requests.some(r=>r.path===endpoint&&r.token==='fixture-next:1')&&i<100;i++)await page.waitForTimeout(20);
  release();await page.waitForTimeout(150);
  check('old request received cancellation intent and late completion cannot paint stale values',await page.evaluate(()=>window.__datasetAborts.length>0)&&!await page.locator('body').innerText().then(t=>/777,?777/.test(t)));
  check('new domain evidence uses the new token',item.requests.some(r=>r.path===endpoint&&r.token==='fixture-next:1'));
  const fresh=await state(nextKey),retained=await state(DECISIONS_STORAGE_KEY);
  check('authored goals retained, old working and saved fields not adopted',JSON.stringify(fresh.goals.goals)===JSON.stringify(before.goals.goals)&&Object.values(fresh.workspaces).every(w=>!w.fields.homePlanAlternativesV1&&!w.fields.homeSolutionBundlesV1&&!w.fields.homeSolutionConversationV1));
  check('old pinned, attached, legacy and working records unchanged',JSON.stringify(retained.workspaces[id].fields.homePlanAlternativesV1)===JSON.stringify(attached)&&JSON.stringify(retained.workspaces[oldId].fields.homeSolutionBundlesV1)===JSON.stringify(legacy.raw)&&JSON.stringify(retained.workspaces[id].fields.homeSolutionConversationV1)===JSON.stringify(before.workspaces[id].fields.homeSolutionConversationV1));
  check('old working proposal absent after boundary remount',await card.count()===0);
  item.visibleText=await page.locator('body').innerText();
  const freshValue={workforce:'9,100',attrition:'4.2%',finance:'$910,000','talent-acquisition':'39 days',skills:'82.0%','survey-sentiment':'81.0%'}[destination];
  if(freshValue)check('new dataset value is rendered on the visible domain page',item.visibleText.includes(freshValue));
  if(destination==='workforce')check('workforce scope resets to the current global selection',(await page.getByLabel('Workforce snapshot scope').innerText()).includes('Global workforce · All business units · All levels'));
  if(['skills','career-growth-mobility'].includes(destination))check('evidence scope distinguishes current global business context',(await page.locator('.evidence-scope-notice').innerText()).includes('Selected business context: Global workforce · All business units · All levels.'));
  if(destination==='finance')check('fresh finance scope remains company-wide',await page.getByLabel('Finance metric scope').innerText()==='Company-wide · workforce filters not applied');
  if(!hasFilters)await navigate('home');
  check('fresh filter selection is visible and no old scoped response is reused',await page.getByLabel('Country',{exact:true}).inputValue()==='all');
  if(!hasFilters)await navigate(destination);
  await page.reload();await dismissHomeOnboarding(page);await page.getByText('Dataset changed. Saved goals and requirements are retained. Earlier evidence and planning drafts remain in their previous dataset workspace.',{exact:true}).waitFor();
  check('reload keeps the new workspace and cannot revive old plans',await card.count()===0&&JSON.stringify((await state(DECISIONS_STORAGE_KEY)).workspaces[id].fields.homePlanAlternativesV1)===JSON.stringify(attached)&&item.solutionCalls===2);
  check('no browser exceptions or network escapes',item.errors.length===0&&item.blocked.length===0);
  await page.screenshot({path:path.join(output,destination+'-'+size+'.png')});await context.close();await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
 }
}catch(error){report.failure={message:error.message,stack:error.stack};throw error;}finally{await browser.close();await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,cases:report.cases.length}));}
