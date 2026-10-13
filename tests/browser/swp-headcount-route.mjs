// Real shell + populated synthetic APIs. Never sends database or AI requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3478';
const output=await fs.mkdtemp('/tmp/swp-headcount-route-');
const defaults={annual_growth_pct:3,salary_inflation_pct:2,annual_attrition_pct:10,fill_rate_pct:90,productivity_hiring_reduction_pct:0};
const points=Array.from({length:6},(_,i)=>({planning_month:new Date(Date.UTC(2026,9+i,1)).toISOString().slice(0,10),planned_headcount:10050+i*50,planned_fte:10050+i*50,planned_hires:100,planned_exits:50,planned_labor_cost_usd:1000000+i*1000}));
const planning={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',description:'Authored navigation fixture only',assumptions:[],points}]};
const options={countries:[{value:'UK',label:'United Kingdom'}],business_units:[{value:'ENG',label:'Engineering'}],levels:[{value:'L3',label:'Level 3'}]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try {for(const width of [1366,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],ai=[],api=[],external=[],modelInputs=[];
  await context.route('**/*',route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin!==base){external.push(u.origin);return route.abort();}
    if(u.pathname.startsWith('/api/')){
      api.push(u.pathname);
      if(/chat|conversation|openai|intake/.test(u.pathname)||(r.method()!=='GET'&&u.pathname!=='/api/scenario-modeler'))ai.push(u.pathname);
      if(u.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:10000,fte:10000,open_positions:0,snapshot_date:'2026-09-30'},trend:[],filter_options:options}});
      if(u.pathname==='/api/workforce-planning')return route.fulfill({json:planning});
      if(u.pathname==='/api/scenario-modeler'){
        if(r.method()==='GET')return route.fulfill({json:{defaults}});
        const assumptions=r.postDataJSON().assumptions;modelInputs.push(assumptions);
        return route.fulfill({json:runScenarioModel({asOf:'2026-09-30',startingHeadcount:10000,baselinePoints:points,defaults,assumptions})});
      }
      return route.fulfill({status:503,json:{error:'Other synthetic source unavailable.'}});
    }
    return route.continue();
  });
  page.on('pageerror',e=>errors.push(e.message));
  const demo=()=>page.getByRole('region',{name:'Synthetic headcount demo',exact:true});
  const heading=()=>demo().getByRole('heading',{name:'Compare company headcount',exact:true}).waitFor();
  const scenario=()=>page.locator('#app-page-title').filter({hasText:'Scenario Modeling'}).waitFor();
  const launch=()=>page.getByRole('button',{name:'Compare headcount — synthetic demo baseline',exact:true}).click();
  const close=()=>demo().getByRole('button',{name:'Back to Scenario Modeling',exact:true}).click();
  await page.goto(base+'/?page=planning-overview');
  await page.locator('#app-page-title').filter({hasText:'Planning Overview'}).waitFor();
  const navigation=page.getByRole('button',{name:'Open navigation',exact:true});
  if(await navigation.isVisible())await navigation.click();
  const destination=page.locator('[data-nav-destination="scenario-modeling"]');
  const group=await destination.evaluate(node=>node.parentElement.id),toggle=page.locator(`button[aria-controls="${group}"]`);
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  await destination.click();await scenario();
  const country=page.getByLabel('Country',{exact:true});
  if(!await country.isVisible())await page.locator('.workforce-filter-disclosure summary').click();
  await page.waitForFunction(()=>document.querySelector('select[aria-label="Country"] option[value="UK"]'));
  for(const [label,value] of [['Country','UK'],['Business Unit','ENG'],['Level','L3']])await page.getByLabel(label,{exact:true}).selectOption(value);
  assert.equal(await page.getByLabel('Selected goal',{exact:true}).inputValue(),'');
  const custom=page.getByRole('heading',{name:'Custom Scenario',exact:true}).locator('..').locator('..').locator('..');
  const growth=custom.getByRole('spinbutton').nth(0),inflation=custom.getByRole('spinbutton').nth(1);
  await growth.fill('7');await inflation.fill('4');
  await custom.getByRole('button',{name:'Run Scenario',exact:true}).click();
  const name=custom.getByPlaceholder('Scenario name',{exact:true});await name.fill('Unassigned engineering draft');
  await page.waitForLoadState('networkidle');
  const result=custom.getByText('Deterministic result anchored to the stored Baseline curve',{exact:true}).locator('..').locator('..').locator('..');
  const originalResult=await result.innerText(),originalInputs=await custom.getByRole('spinbutton').evaluateAll(nodes=>nodes.map(n=>n.value));
  assert.equal(modelInputs.length,1);assert.equal(modelInputs[0].annual_growth_pct,7);
  await name.evaluate(node=>{window.__planningDraftNode=node;});
  const assertPreserved=async()=>{
    await scenario();await name.waitFor({state:'visible'});
    for(const [label,value] of [['Country','UK'],['Business Unit','ENG'],['Level','L3']])assert.equal(await page.getByLabel(label,{exact:true}).inputValue(),value);
    assert.equal(await page.getByLabel('Selected goal',{exact:true}).inputValue(),'');
    assert.equal(await name.inputValue(),'Unassigned engineering draft');
    assert.equal(await name.evaluate(node=>window.__planningDraftNode===node),true,'original draft DOM remained mounted');
    assert.deepEqual(await custom.getByRole('spinbutton').evaluateAll(nodes=>nodes.map(n=>n.value)),originalInputs);
    assert.equal(await result.innerText(),originalResult);assert.equal(modelInputs.length,1,'no scenario rerun');
  };
  const beforeDemo=api.length;
  await launch();await heading();assert.equal(new URL(page.url()).pathname,'/');assert.equal(new URL(page.url()).searchParams.get('demo'),'headcount');
  assert.equal(await custom.isVisible(),false);
  const hires=()=>demo().getByLabel('Monthly hires',{exact:true}),departures=()=>demo().getByLabel('Monthly departures',{exact:true});
  await hires().fill('100');await departures().fill('60');await demo().getByRole('button',{name:'Compare',exact:true}).click();
  assert.deepEqual(await demo().locator('tbody tr').last().locator('td').allTextContents(),['10,300','10,240','-60']);
  const costRate=demo().getByLabel('Monthly USD cost per employee (optional)',{exact:true});await costRate.fill('12.50');await demo().getByRole('button',{name:'Compare',exact:true}).click();assert.deepEqual(await demo().getByRole('region',{name:'Assumed monthly cost run-rates',exact:true}).locator('tbody tr').last().locator('td').allTextContents(),['128,750.00','128,000.00','-750.00']);
  await demo().getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await costRate.inputValue(),'');assert.equal(await hires().inputValue(),'');
  await close();await assertPreserved();
  await page.goBack();await heading();await page.goForward();await assertPreserved();
  await launch();await heading();await page.goBack();await assertPreserved();await page.goForward();await heading();
  assert.equal(api.length,beforeDemo,'round trips trigger no data or AI requests');
  assert.ok(await demo().getByText(/does not use your workspace filters/).isVisible());
  assert.equal(await demo().getByRole('combobox').count(),0);assert.ok(await demo().getByText(/Costs unavailable/).isVisible());
  await close();await assertPreserved();await page.screenshot({path:`${output}/${width}-restored-draft.png`,fullPage:true});
  await launch();await heading();await hires().fill('100');await departures().fill('60');await demo().getByRole('button',{name:'Compare',exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/${width}-in-shell-demo.png`,fullPage:true});
  await page.reload();await heading();assert.equal(await hires().inputValue(),'');
  await page.goto(base+'/planning/headcount-demo');await heading();assert.equal(new URL(page.url()).pathname,'/');assert.equal(new URL(page.url()).searchParams.get('demo'),'headcount');
  assert.deepEqual(ai,[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  evidence.push({width,entry:'Planning → Scenario Modeling → in-shell demo',filters:{country:'UK',businessUnit:'ENG',level:'L3'},unassigned:true,assumptions:originalInputs,draftName:'Unassigned engineering draft',roundTrips:['explicit return','Back then Forward after return','Back then Forward after open'],sameDraftDOM:true,calculatedResultPreserved:true,modelInputs,aiRequests:ai,externalRequests:external,checks:'reset, reload, old route redirect, scope gates, no round-trip requests'});
  await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/checks.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
