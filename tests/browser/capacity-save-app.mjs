import {revealMonthlyCapacityDetail} from './capacity-disclosure.mjs';
// Real local application, synthetic API fixtures only; external and mutating requests are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3510';
const output=await fs.mkdtemp('/tmp/capacity-save-app-');
const points=Array.from({length:3},(_,i)=>({planning_month:`2026-${10+i}-01`,planned_headcount:10,planned_fte:8,planned_hires:0,planned_exits:0,planned_labor_cost_usd:1000}));
const defaults={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:0,fill_rate_pct:100,productivity_hiring_reduction_pct:0};
const planning={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',description:'Synthetic fixture',assumptions:[],points}]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1366,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);
 const errors=[],mutations=[],external=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{
  const r=route.request(),u=new URL(r.url());if(u.origin!==base){external.push(u.origin);return route.abort();}
  if(!u.pathname.startsWith('/api/'))return route.continue();
  if(r.method()!=='GET'){mutations.push(u.pathname);return route.abort();}
  const data=u.pathname==='/api/dashboard'?{overview:{headcount:10,fte:8,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}:u.pathname==='/api/workforce-planning'?planning:u.pathname==='/api/scenario-modeler'?{defaults}:u.pathname==='/api/business-unit-scenario'?{defaults,business_units:[]}:null;
  return route.fulfill(data?{json:data}:{status:503,json:{error:'Synthetic source unavailable.'}});
 });
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Review service capacity'}]},workspaces:{}})});
 await page.goto(base+'/?page=planning-overview');
 const area=page.getByRole('region',{name:'Workload capacity planning',exact:true}),input=name=>area.getByLabel(name,{exact:true});
 const calc=async()=>{await area.getByRole('button',{name:'Calculate capacity',exact:true}).click();await revealMonthlyCapacityDetail(page,area);};
 const confirm=()=>area.getByRole('checkbox',{name:/I confirm/}).check();
 const result=()=>area.getByRole('region',{name:'Monthly capacity comparison'});
 await area.waitFor().catch(async error=>{console.log(await page.locator('body').innerText());console.log(errors);throw error;});await calc();assert.match(await area.getByRole('alert').innerText(),/Confirm/);
 const values={'Workload scope':'Service desk — tickets','Opening date (month end)':'2026-09-30','Opening people':'10','Opening contracted FTE':'8','Work units each month':'800','Hours per work unit':'1','Productive hours per FTE each month':'160'};
 for(const [name,value] of Object.entries(values))await input(name).fill(value);
 const assumptions=area.locator('form summary');await assumptions.focus();await page.keyboard.press('Enter');
 for(const [name,value] of Object.entries({'Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await input(name).fill(value);
 await confirm();await calc();assert.match(await area.innerText(),/Incomplete/);assert.match(await result().innerText(),/Unknown/);
 await area.getByRole('checkbox',{name:/Assume every hire/}).check();assert.equal(await result().count(),0);assert.equal(await area.getByRole('checkbox',{name:/I confirm/}).isChecked(),false);
 await confirm();await calc();assert.match(await area.innerText(),/Calculated from your assumptions/);assert.match(await result().innerText(),/\+1/);
 const saved=()=>page.getByRole('region',{name:'Saved capacity scenarios',exact:true});
 await page.getByLabel('Capacity scenario name',{exact:true}).fill('Base');await saved().getByRole('button',{name:'Save scenario',exact:true}).click();await saved().getByRole('status').filter({hasText:'Saved “Base”'}).waitFor();

 const costRate=input('Cost per contracted FTE per month (USD, optional)'),costSummary=area.getByLabel('Contracted supply cost estimate',{exact:true});
 await costRate.fill('12.34');assert.ok(await saved().getByRole('button',{name:'Save scenario',exact:true}).isDisabled());assert.equal(await costSummary.count(),0);await confirm();await calc();assert.match(await costSummary.innerText(),/\$98.72/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow with manual cost');
 await page.screenshot({path:`${output}/${width}-manual-cost.png`,fullPage:true});
 await costRate.fill('0');await confirm();await calc();assert.match(await costSummary.innerText(),/\$0.00/);
 await costRate.fill('');assert.equal(await costSummary.count(),0);await confirm();await calc();assert.match(await costSummary.innerText(),/Unknown/);
 await input('Time assigned to this work (%)').fill('33.3');await input('Productivity improvement (%)').fill('66.6');await confirm();await calc();
 assert.deepEqual(await result().locator('tbody tr').first().locator('td').allTextContents(),['10','8','2.66','3','+0.34','Unknown']);
 await page.screenshot({path:`${output}/${width}-fractional-percent.png`,fullPage:true});
 await input('Time assigned to this work (%)').fill('50');await input('Productivity improvement (%)').fill('0');
 // Independent acceptance examples: throughput changes demand, never supply.
 await input('Opening contracted FTE').fill('10');await input('Time assigned to this work (%)').fill('100');await input('Work units each month').fill('1920');await confirm();await calc();
 assert.deepEqual(await result().locator('tbody tr').first().locator('td').allTextContents(),['10','10','10','12','+2','Unknown']);
 await assumptions.click();await assumptions.click();assert.match(await result().innerText(),/\+2/);assert.ok(await area.getByRole('checkbox',{name:/I confirm/}).isChecked());
 await input('Productivity improvement (%)').fill('20');await confirm();await calc();assert.deepEqual(await result().locator('tbody tr').first().locator('td').allTextContents(),['10','10','10','10','0','Unknown']);
 await input('Productivity improvement (%)').fill('0');await input('Work units each month').fill('1600');assert.equal(await result().count(),0);await confirm();await calc();assert.equal((await result().locator('tbody tr').first().locator('td').allTextContents()).at(-2),'0');
 await input('Opening contracted FTE').fill('8');await input('Time assigned to this work (%)').fill('75');await input('Work units each month').fill('1200');await confirm();await calc();assert.deepEqual(await result().locator('tbody tr').first().locator('td').allTextContents(),['10','8','6','7.5','+1.5','Unknown']);
 await page.screenshot({path:`${output}/${width}-shortfall.png`,fullPage:true});
 if(width<640)assert.ok(await result().getByText('+1.5',{exact:true}).first().isVisible(),'mobile gap visible without horizontal scrolling');
 await input('Work units each month').fill('0');await confirm();await calc();assert.equal((await result().locator('tbody tr').first().locator('td').allTextContents()).at(-2),'-6');
 await input('Work units each month').fill('800');await input('Time assigned to this work (%)').fill('50');
 await input('Productivity improvement (%)').fill('25');assert.equal(await result().count(),0);await confirm();await calc();
 const row=result().locator('tbody tr').first();assert.deepEqual(await row.locator('td').allTextContents(),['10','8','4','4','0','Unknown']);
 await page.getByLabel('Capacity scenario name',{exact:true}).fill('Improved');await saved().getByRole('button',{name:'Save scenario',exact:true}).click();
 await page.getByLabel('Saved capacity scenario',{exact:true}).selectOption({label:'Base'});await page.getByLabel('Compare capacity scenario',{exact:true}).selectOption({label:'Improved'});
 const comparison=page.getByRole('region',{name:'Saved capacity comparison',exact:true});await comparison.waitFor();assert.deepEqual(await comparison.locator('tbody tr').first().locator('td').allTextContents(),['+1','0']);
 await page.screenshot({path:`${output}/${width}-saved-comparison.png`,fullPage:true});

 // Unmount via Workforce and return with history; session context retains inputs and results.
 await page.evaluate(()=>{history.pushState(null,'','/?page=workforce');dispatchEvent(new PopStateEvent('popstate'));});await area.waitFor({state:'hidden'});
 await page.goBack();await area.waitFor();
 await page.goForward();await area.waitFor({state:'hidden'});await page.goBack();await area.waitFor();assert.equal(await input('Workload scope').inputValue(),'Service desk — tickets');await revealMonthlyCapacityDetail(page,area);await result().waitFor();
 const nav=page.getByRole('navigation',{name:'Planning sections'});await nav.locator('summary').click();
 for(const [title,destination] of [['Position & Workforce Design','position-workforce-design'],['Workforce Response','workforce-response'],['Execution & Feasibility','execution-feasibility']]){
  await nav.getByRole('button',{name:'Open '+title,exact:true}).click();await page.locator(`[data-planning-destination="${destination}"]`).waitFor({state:'visible'});
  await nav.getByRole('button',{name:'Open Planning workspace',exact:true}).click();await revealMonthlyCapacityDetail(page,area);await result().waitFor();
 }
 await nav.getByRole('button',{name:'Open Stored scenario tools',exact:true}).click();await page.getByRole('heading',{name:'Custom Scenario',exact:true}).waitFor();await revealMonthlyCapacityDetail(page,area);await result().waitFor();
 await page.goBack();await revealMonthlyCapacityDetail(page,area);await result().waitFor();
 await input('Opening contracted FTE').fill('');await confirm();await calc();assert.match(await area.innerText(),/Incomplete/);assert.match(await result().innerText(),/Unknown/);
 await input('Opening contracted FTE').fill('11');await confirm();await calc();assert.match(await area.getByRole('alert').innerText(),/exceeds/);assert.equal(await result().count(),0);
 if(!await area.locator('form details').evaluate(n=>n.open))await assumptions.click();
 await input('Opening people').fill('0');await input('Opening contracted FTE').fill('0');await input('Work units each month').fill('0');await input('Time assigned to this work (%)').fill('0');await confirm();
 await area.getByRole('button',{name:'Calculate capacity',exact:true}).focus();await page.keyboard.press('Enter');await revealMonthlyCapacityDetail(page,area);await result().waitFor();assert.deepEqual(await result().locator('tbody tr').first().locator('td').allTextContents(),['0','0','0','0','0','Unknown']);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
 await page.screenshot({path:`${output}/${width}-capacity.png`,fullPage:true});
 await page.reload();await area.waitFor();assert.equal(await input('Workload scope').inputValue(),'');assert.equal(await result().count(),0);
 await page.getByLabel('Saved capacity scenario',{exact:true}).selectOption({label:'Improved'});await saved().getByRole('button',{name:'Open saved scenario',exact:true}).click();await revealMonthlyCapacityDetail(page,area);await result().waitFor();assert.equal(await input('Workload scope').inputValue(),'Service desk — tickets');assert.equal(await input('Productivity improvement (%)').inputValue(),'25');assert.match(await saved().innerText(),/matches current inputs/);

 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);evidence.push({width,errors,mutations,external,checks:'manual cost 98.72, zero versus unknown, cost edit invalidation, confirmation, blanks, zero, invalid, edits, keyboard, monthly math, fractional percentages, navigation, old destinations, Back/Forward recovery, reload clears'});await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
