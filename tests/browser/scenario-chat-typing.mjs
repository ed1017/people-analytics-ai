// Local production-build regression matrix. Every API response is synthetic;
// this exercises real React state, chart rendering, and browser persistence,
// but does not establish that a reported hosted/live-data crash is fixed.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {workforceReviewFixture} from '../fixtures/workforce-review.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {createWorkforceSolution,emptySolutionInputs,beginSolutionRun,completeSolutionRun} from '../../lib/workforce-solution.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3396';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const goal='Reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget.';
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:12,fill_rate_pct:90,productivity_hiring_reduction_pct:5};
const points=Array.from({length:12},(_,i)=>({planning_month:'2027-'+String(i+1).padStart(2,'0')+'-01',planned_headcount:1000+i*10,planned_fte:980+i*10,planned_hires:15,planned_exits:5,planned_labor_cost_usd:10000000+i*100000}));
const custom=runScenarioModel({asOf:'2026-09-30',startingHeadcount:1000,baselinePoints:points,defaults,assumptions:defaults});
const planning={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',description:'Synthetic company-wide scenario',assumptions:[],points}]};
const positions={as_of:'2026-09-30',planning_month:'2027-12-01',current:{current_positions:1100,filled_positions:1000,vacant_positions:100,planned_positions:1100,frozen_positions:0,closed_positions:0,vacancy_rate_pct:9.09},scenarios:[]};
const scenarioFields={
 'planning.customAssumptions':defaults,'planning.customScenario':custom,
 'planning.scenarioName':'Synthetic saved scenario',
 'planning.savedScenarios':[{id:'s1',name:'Synthetic saved scenario',saved_at:'2026-10-07',scenario:custom}],
 'planning.comparisonScenarioIds':['s1'],
};
const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:goal},{id:'b',statement:'Review company-wide staffing options over 6 months.'}]},workspaces:{a:{savedAt:'2026-10-07T01:00:00.000Z',fields:structuredClone(scenarioFields)},b:{savedAt:'2026-10-07T01:00:00.000Z',fields:{'planning.scenarioName':'Separate goal B'}}}};
const payload=workforceReviewFixture(),inputs=emptySolutionInputs(),at='2026-10-07T01:00:00.000Z';
const sections={scope:['businessUnit','jobProfile','intent','planningMonth','months'],demand:['roles'],response:['build','move','buy','backfills'],timing:['recruitingStart','arrivalMode','arrivalDate','buildMonth','moveMonth','backfillDate'],costs:['annualHireCost','hireFee','annualBackfillCost','backfillFee','internalAnnualCostChange'],training:['trainingCash','trainingHours','loadedHourlyCost'],constraints:['budget','maxAddedEmployees','deadlineMonth']};
for(const [section,fields] of Object.entries(sections))for(const field of fields)inputs[section][field]=payload.input[field];
inputs.scope.goalStatement=goal;
const run=beginSolutionRun(createWorkforceSolution('solution','a',inputs,at),1,'run',['brief'],at);
seed.workspaces.a.fields.workforceSolution=completeSolutionRun(run.state,run.ticket,[{id:'ready-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);
let checks=0;const report={base,modes:{}};
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
 const errors=[],reactConsole=[],requests=[],external=[],counts={};
 page.setDefaultTimeout(20000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/react|update depth|too many re-renders|uncaught/i.test(message.text()))reactConsole.push(message.text())});
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)}, {key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==base){external.push(url.origin);return route.abort()}
  if(url.pathname==='/api/chat'){requests.push(request.postDataJSON());return route.fulfill({json:{answer:'Synthetic company-wide scenario evidence; no U.S.-specific scenario is inferred.',nextStep:'none'}})}
  if(url.pathname.startsWith('/api/')){
   counts[url.pathname]=(counts[url.pathname]??0)+1;
   const data=url.pathname==='/api/dashboard'?scopeDashboard(url.search):url.pathname==='/api/scenario-modeler'?custom:url.pathname==='/api/workforce-planning'?planning:url.pathname==='/api/position-modeling'?positions:url.pathname==='/api/business-unit-scenario'?{defaults,business_units:[]}:scopeEnterprise[url.pathname.slice(5)];
   return route.fulfill(data?{json:data}:{status:503,json:{error:'Synthetic source unavailable'}});
  }
  return route.continue();
 });
 const input=page.getByLabel('Ask People Analytics AI',{exact:true}),goals=page.getByLabel('Selected goal',{exact:true}),country=page.getByLabel('Country',{exact:true});
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const scenario=async()=>{
  const nav=page.locator('[data-nav-destination="scenario-modeling"]');
  if(!await nav.isVisible()){
   const open=page.getByRole('button',{name:'Open navigation',exact:true});if(await open.isVisible())await open.click();
   const strategy=page.locator('[aria-controls="navigation-strategy"]');if(await strategy.getAttribute('aria-expanded')!=='true')await strategy.click();
  }
  await nav.click();await input.waitFor();
 };
 const setCountry=async value=>{await country.evaluate(node=>node.closest('details')?.setAttribute('open',''));await country.selectOption(value);await page.waitForTimeout(400)};
 const type=async(label,text)=>{
  const before=await saved(),requestsBefore=requests.length,scenarioLoads=counts['/api/scenario-modeler'];
  await input.pressSequentially(text,{delay:12});await page.waitForTimeout(100);
  check(mode+' '+label+' retains each typed character',await input.inputValue()===text);
  check(mode+' '+label+' has no React error',errors.length===0&&reactConsole.length===0);
  check(mode+' '+label+' does not submit or reload scenario defaults',requests.length===requestsBefore&&counts['/api/scenario-modeler']===scenarioLoads);
  const after=await saved();
  check(mode+' '+label+' writes only bounded draft updates',after.revision-before.revision<=text.length+2);
  if(after.goals.activeId)check(mode+' '+label+' saves the exact draft to its goal',after.workspaces[after.goals.activeId].fields.chat.input===text);
 };
 try{
  await page.goto(base);await goals.waitFor();await scenario();await setCountry('US');
  await page.waitForTimeout(800);
  const first='Why does this scenario cover the company when United States is selected?';
  await type('active A / United States / before Send',first);
  await page.reload();await goals.waitFor();await scenario();await setCountry('US');
  check(mode+' reload restores the unfinished goal A request',await input.inputValue()===first);
  await input.fill('');await page.waitForTimeout(500);
  const second='Keep my 2-point target, 12-month horizon and $100,000 illustrative budget.';
  await type('after reload / active A',second);
  await setCountry('all');check(mode+' filter transition keeps the unfinished request',await input.inputValue()===second);
  await input.fill('');await page.waitForTimeout(500);await type('active A / all countries','Explain the source scope before changing any assumptions.');
  const draftA=await input.inputValue();await goals.selectOption('b');await page.waitForTimeout(500);
  check(mode+' selecting B does not import A draft',await input.inputValue()==='');
  await type('active B / before Send','Keep this request with goal B only.');
  await goals.selectOption('a');await page.waitForTimeout(300);check(mode+' switching back restores A draft',await input.inputValue()===draftA);
  await goals.selectOption('');await page.waitForTimeout(400);check(mode+' general exploration has a separate draft',await input.inputValue()==='');
  await type('general exploration / before Send','Review the overall scenario without selecting a saved goal.');
  await goals.selectOption('a');await page.waitForTimeout(300);
  // Home is retained during navigation; exercise its subscriptions while typing
  // elsewhere, and return to the same active goal rather than remounting a mock.
  const home=page.getByRole('button',{name:'Action Planning',exact:true});
  if(!await home.isVisible()){const open=page.getByRole('button',{name:'Open navigation',exact:true});if(await open.isVisible())await open.click()}
  await home.click();await page.getByLabel('Ask Workforce AI',{exact:true}).waitFor();
  check(mode+' Home sees the same retained A request',await page.getByLabel('Ask Workforce AI',{exact:true}).inputValue()===draftA);
  await scenario();check(mode+' return to Scenario Modeling preserves A request',await input.inputValue()===draftA);
  await setCountry('US');await input.fill('');await page.waitForTimeout(500);
  const sent='Explicitly submitted fixture question about company-wide scenario assumptions.';await type('after page transitions',sent);
  const isExplicitRequest=request=>request.message===sent||request.message?.startsWith(sent+'\n\nFocused issue');
  const beforeSend=requests.filter(isExplicitRequest).length;
  check(mode+' user request has no transport before Send',beforeSend===0);
  const reply=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/chat'&&isExplicitRequest(response.request().postDataJSON()));
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await reply;
  await input.evaluate(node=>new Promise((resolve,reject)=>{const started=Date.now();const poll=()=>{if(node.value==='')resolve();else if(Date.now()-started>10000)reject(Error('Submitted chat did not clear'));else setTimeout(poll,25)};poll()}));
  check(mode+' explicit Send submits the request exactly once',requests.filter(isExplicitRequest).length===1);
  const data=await saved();
  for(const [key,value] of Object.entries(seed.workspaces.a.fields))check(mode+' preserves saved '+key,JSON.stringify(data.workspaces.a.fields[key])===JSON.stringify(value));
  check(mode+' B request stays assigned to B',data.workspaces.b.fields.chat.input==='Keep this request with goal B only.');
  check(mode+' no unhandled or React update-depth errors throughout',errors.length===0&&reactConsole.length===0);
  check(mode+' no external requests',external.length===0);
  report.modes[mode]={width,height,errors,reactConsole,external,apiCounts:counts,chatRequests:requests.map(request=>({page:request.page,message:request.message})),savedRevision:data.revision};
 }finally{await context.close()}
}}finally{await browser.close();if(process.env.SCENARIO_TYPING_OUTPUT)await writeFile(process.env.SCENARIO_TYPING_OUTPUT,JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify({checks,base,fixtureOnly:true}));
