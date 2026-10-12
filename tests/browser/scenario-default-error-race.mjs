// Local built app only: delayed defaults GET and failed scenario POST are fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {legacyAttritionDefaultSource} from '../../lib/legacy-source-contracts.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3416';
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:11.3,fill_rate_pct:90,productivity_hiring_reduction_pct:5},assumptions={...defaults,annual_attrition_pct:4};
const points=[{planning_month:'2027-12-01',planned_headcount:1000,planned_fte:980,planned_hires:15,planned_exits:5,planned_labor_cost_usd:10000000}];
const previous=runScenarioModel({asOf:'2026-09-30',startingHeadcount:1000,baselinePoints:points,defaults,assumptions});
const seed={version:1,revision:1,goals:{version:1,activeId:'race',goals:[{id:'race',statement:'Review staffing assumptions'}]},workspaces:{race:{savedAt:'2026-10-12T00:00:00Z',fields:{'planning.customAssumptions':assumptions,'planning.customScenario':previous}}}};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const width of [1366,390])for(const outcome of ['success','failure']){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(15000);
 let heldGet,posts=0,external=0;const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(url.pathname==='/api/scenario-modeler'){
   if(request.method()==='GET'){heldGet=route;return}
   posts++;return route.fulfill({status:503,json:{error:'Scenario run failed (fixture).'}});
  }
  let data=scopeEnterprise[url.pathname.slice(5)];
  if(url.pathname==='/api/dashboard')data=scopeDashboard(url.search);
  if(url.pathname==='/api/workforce-planning')data={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',assumptions:[],points}]};
  if(url.pathname==='/api/position-modeling')data={current:{current_positions:1100,filled_positions:1000,vacant_positions:100,vacancy_rate_pct:9.09},scenarios:[]};
  if(url.pathname==='/api/business-unit-scenario')data={defaults,business_units:[]};
  return route.fulfill(data?{json:data}:{status:503,json:{error:'Fixture unavailable'}});
 });
 await page.goto(base);await page.getByLabel('Selected goal',{exact:true}).waitFor();
 const nav=page.locator('[data-nav-destination="scenario-modeling"]');
 if(!await nav.isVisible()){
  const open=page.getByRole('button',{name:'Open navigation',exact:true});if(await open.isVisible())await open.click();
  const strategy=page.locator('[aria-controls="navigation-strategy"]');if(await strategy.getAttribute('aria-expanded')!=='true')await strategy.click();
 }
 await nav.click();const panel=page.locator('[data-planning-destination="scenario-modeling"]');
 const run=panel.getByRole('button',{name:'Run Scenario',exact:true}),reset=panel.getByRole('button',{name:'Reset',exact:true}).first();
 await run.waitFor();check(`${width} ${outcome} preserved inputs permit run during GET`,await run.isEnabled()&&await reset.isDisabled());
 await run.click();await panel.getByText('Scenario run failed (fixture).',{exact:true}).waitFor();
 check(`${width} ${outcome} one failed POST`,posts===1);assert.ok(heldGet,'defaults GET remains held');
 await heldGet.fulfill(outcome==='success'?{json:{defaults,default_provenance:legacyAttritionDefaultSource}}:{status:503,json:{error:'Defaults fetch failed (fixture).'}});
 if(outcome==='success')await panel.getByText(/Default: all separations/).waitFor();else await panel.getByText(/Defaults unavailable: Defaults fetch failed/).waitFor();
 check(`${width} ${outcome} POST error survives GET completion`,await panel.getByText('Scenario run failed (fixture).',{exact:true}).isVisible());
 check(`${width} ${outcome} Reset follows GET availability`,await reset.isDisabled()===(outcome==='failure'));
 const fields=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload.workspaces.race.fields,DECISIONS_STORAGE_KEY);
 check(`${width} ${outcome} custom assumptions retained`,JSON.stringify(fields['planning.customAssumptions'])===JSON.stringify(assumptions));
 check(`${width} ${outcome} previous result retained with visible failure`,JSON.stringify(fields['planning.customScenario'])===JSON.stringify(previous)&&await panel.getByText('Modeled Outcome',{exact:true}).isVisible());
 check(`${width} ${outcome} no external requests or runtime errors`,external===0&&errors.length===0);
 await context.close();
}}finally{await browser.close()}
if(process.env.SCENARIO_ERROR_OUTPUT)await fs.writeFile(process.env.SCENARIO_ERROR_OUTPUT,JSON.stringify({checks,base,fixtureOnly:true},null,2));
console.log(JSON.stringify({checks,base,fixtureOnly:true}));
