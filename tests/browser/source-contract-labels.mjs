// Actual local production build; all API traffic is intercepted with fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {legacyPositionSource,legacyAttritionDefaultSource,legacyMovementWindow} from '../../lib/legacy-source-contracts.ts';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3412';
const output=process.env.SOURCE_CONTRACT_OUTPUT??'/tmp/source-contract-labels';await fs.mkdir(output,{recursive:true});
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:11.3,fill_rate_pct:90,productivity_hiring_reduction_pct:5};
const groups=[{org_code:'LARGE',org_name:'Larger inventory',current_positions:10000,planned_positions:9999,net_position_change:-1},{org_code:'SMALL',org_name:'Smaller inventory',current_positions:475,planned_positions:440,net_position_change:-35}];
const scenario={scenario_name:'Baseline',scenario_type:'baseline',totals:{current_positions:10475,planned_positions:10439,net_position_change:-36},by_business_unit:groups,by_level:[{level_code:'L1',level_name:'Individual contributor',current_positions:10475,planned_positions:10439,net_position_change:-36}]};
const position={as_of:null,source_contract:legacyPositionSource,planning_month:'2027-12-01',current:{current_positions:10475,filled_positions:10000,vacant_positions:475,planned_positions:0,frozen_positions:0,closed_positions:0,vacancy_rate_pct:4.53},scenarios:[scenario]};
const workforce={as_of:'2026-09-30',movement_window:legacyMovementWindow,summary:{headcount:10000,fte:9900,people_managers:1000,avg_span_of_control:9,avg_tenure_years:5,full_time_headcount:9800,hybrid_headcount:1000,remote_headcount:500},trend:[],business_units:[],countries:[],levels:[],tenure:[],movements:[{month:'2026-03-01',movement_type:'promotion',movements:72}]};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const width of [1366,390])for(const mode of ['legacy','constructed','unknown']){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();let external=0,posts=0;const errors=[];
 page.on('pageerror',error=>errors.push(error.stack));page.setDefaultTimeout(15000);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(request.method()!=='GET'){posts++;return route.abort()}
  let data=scopeEnterprise[url.pathname.slice(5)];
  if(url.pathname==='/api/dashboard')data=scopeDashboard(url.search);
  if(url.pathname==='/api/position-modeling')data=mode==='legacy'?position:{...position,as_of:mode==='constructed'?'2026-09-30':null,source_contract:undefined,data_meta:mode==='constructed'?{dataClass:'constructed-synthetic',sourceLabel:'Constructed inventory',planningCaveat:'Flat draft omits current vacancies.'}:undefined};
  if(url.pathname==='/api/scenario-modeler')data={defaults,default_provenance:mode==='legacy'?legacyAttritionDefaultSource:undefined,data_meta:mode==='constructed'?{dataClass:'constructed-synthetic'}:undefined};
  if(url.pathname==='/api/workforce')data={...workforce,movement_window:mode==='legacy'?legacyMovementWindow:undefined};
  if(url.pathname==='/api/workforce-planning')data={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',assumptions:[],description:'Fixture scenario',points:[{planning_month:'2027-12-01',planned_headcount:10442,planned_fte:10000,planned_hires:0,planned_exits:0,planned_labor_cost_usd:1000}]}]};
  if(url.pathname==='/api/business-unit-scenario')data={defaults,business_units:[]};
  return route.fulfill(data?{json:data}:{status:503,json:{error:'Fixture unavailable'}});
 });
 const nav=async destination=>{
  const target=page.locator(`[data-nav-destination="${destination}"]`);
  if(!await target.isVisible()){
   const open=page.getByRole('button',{name:'Open navigation',exact:true});if(await open.isVisible())await open.click();
   if(!await target.isVisible()){
    const group=page.locator(`[aria-controls="navigation-${destination==='workforce'?'workforce':'strategy'}"]`);
    if(await group.count()&&await group.getAttribute('aria-expanded')!=='true')await group.click();
   }
  }
  await target.click();
 };
 await page.goto(base);await dismissHomeOnboarding(page);await nav('position-workforce-design');
 const area=page.locator('[data-planning-destination="position-workforce-design"]');
 const inventory=area.locator('summary').filter({hasText:'Position inventory & source details'});await inventory.focus();await page.keyboard.press('Enter');
 await area.getByText('Planned headcount · Dec 2027',{exact:true}).waitFor().catch(async error=>{await fs.writeFile(output+'/failure.txt',JSON.stringify({body:await page.locator('body').innerText(),errors},null,2));throw error});
 const text=await area.innerText();check(`${width} ${mode} distinct totals`,text.includes('10,475')&&text.includes('10,439'));
 check(`${width} ${mode} no actionable subtraction`,!text.includes('Net Position Change')&&!text.includes('-36')&&!text.includes('Position Change by'));
 check(`${width} ${mode} inventory sorting`,text.indexOf('Larger inventory')<text.indexOf('Smaller inventory'));
 check(`${width} ${mode} source-specific caveat`,mode==='legacy'?text.includes('Grouped rounding'):!text.includes('Grouped rounding'));
 check(`${width} ${mode} date`,text.includes(mode==='constructed'?'Inventory effective date: 2026-09-30':'Inventory effective date unavailable'));
 check(`${width} ${mode} position viewport`,await area.evaluate(node=>node.getBoundingClientRect().right<=innerWidth));
 for(const table of await area.locator('table').all()){
  const dimensions=await table.evaluate(node=>{const box=node.parentElement;box.scrollLeft=box.scrollWidth;return {right:node.querySelector('tbody tr td:last-child').getBoundingClientRect().right,bound:box.getBoundingClientRect().right,viewport:innerWidth,overflow:getComputedStyle(box).overflowX}});
  check(`${width} ${mode} every position column accessible`,dimensions.right<=dimensions.bound+1&&dimensions.bound<=dimensions.viewport&&dimensions.overflow==='auto');
 }
 await area.screenshot({path:`${output}/${width}-${mode}-positions.png`});
 await nav('scenario-modeling');const panel=page.locator('[data-planning-destination="scenario-modeling"]');
 const label=mode==='legacy'?'Default: all separations Jan–Sep 2026':mode==='constructed'?'Constructed dataset planning default':'Default provenance unavailable';
 await panel.getByText(new RegExp(label)).waitFor();check(`${width} ${mode} default basis through fetch and page`,await panel.getByText(new RegExp(label)).isVisible());
 const input=panel.getByLabel(/^Annual Attrition Assumption.*Planning default/);await input.fill('4');check(`${width} ${mode} edited input preserves default basis`,await input.inputValue()==='4'&&await panel.getByText(new RegExp(label)).isVisible());
 await panel.screenshot({path:`${output}/${width}-${mode}-defaults.png`});
 await nav('workforce');await page.getByText(/Recorded movement events/).waitFor();const movement=await page.getByText(/Recorded movement events/).innerText();
 check(`${width} ${mode} source window`,movement.includes('Source window: Jan–Sep 2026')===(mode==='legacy'));
 check(`${width} ${mode} returned months and event basis`,movement.includes('Returned months: Mar 26 – Mar 26')&&movement.includes('Counts are events, not distinct people'));
 check(`${width} ${mode} no page overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(`${width} ${mode} isolated and no runtime errors`,external===0&&posts===0&&errors.length===0);
 await context.close();
}}finally{await browser.close()}
await fs.writeFile(output+'/checks.json',JSON.stringify({checks,base},null,2));console.log(JSON.stringify({checks,output}));
