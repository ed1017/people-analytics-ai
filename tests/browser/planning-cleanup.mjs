// Real shell + populated synthetic APIs. Never sends database or AI requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3478';
const output=await fs.mkdtemp('/tmp/planning-cleanup-');
const defaults={annual_growth_pct:3,salary_inflation_pct:2,annual_attrition_pct:10,fill_rate_pct:90,productivity_hiring_reduction_pct:0};
const points=Array.from({length:6},(_,i)=>({planning_month:new Date(Date.UTC(2026,9+i,1)).toISOString().slice(0,10),planned_headcount:10050+i*50,planned_fte:10050+i*50,planned_hires:100,planned_exits:50,planned_labor_cost_usd:1000000+i*1000}));
const planning={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',description:'Authored navigation fixture only',assumptions:[],points}]};
const options={countries:[{value:'UK',label:'United Kingdom'}],business_units:[{value:'ENG',label:'Engineering'}],levels:[{value:'L3',label:'Level 3'}]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try {for(const width of [1366,1180,390,320]) {
  const context=await browser.newContext({viewport:{width,height:757}}),page=await context.newPage(),errors=[],ai=[],api=[],external=[],modelInputs=[];
  await context.route('**/*',route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin!==base){external.push(u.origin);return route.abort();}
    if(u.pathname.startsWith('/api/')){
      api.push(u.pathname);
      if(/chat|conversation|openai|intake/.test(u.pathname)||(r.method()!=='GET'&&u.pathname!=='/api/scenario-modeler'))ai.push(u.pathname);
      if(u.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:10000,fte:10000,open_positions:0,snapshot_date:'2026-09-30'},trend:[],filter_options:options}});
      if(u.pathname==='/api/workforce-planning')return route.fulfill({json:planning});
      if(u.pathname==='/api/business-unit-scenario'&&r.method()==='GET')return route.fulfill({json:{business_units:[{org_code:'ENG',org_name:'Engineering',headcount:2000,fte:1900}],defaults}});
      if(u.pathname==='/api/scenario-modeler'){
        if(r.method()==='GET')return route.fulfill({json:{defaults}});
        const assumptions=r.postDataJSON().assumptions;modelInputs.push(assumptions);
        const result=runScenarioModel({asOf:'2026-09-30',startingHeadcount:10000,baselinePoints:points,defaults,assumptions});
        assert.deepEqual(result.points.map(point=>point.planning_month),points.map(point=>point.planning_month),'non-January returned window is preserved');
        return route.fulfill({json:result});
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
  assert.ok(await page.getByTitle('Open AI panel',{exact:true}).isVisible(),'Planning defaults to collapsed AI');
  await page.screenshot({path:`${output}/${width}-overview.png`,fullPage:true});
  const navigation=page.getByRole('button',{name:'Open navigation',exact:true});
  if(await navigation.isVisible())await navigation.click();
  const destination=page.locator('[data-nav-destination="scenario-modeling"]');
  const group=await destination.evaluate(node=>node.parentElement.id),toggle=page.locator(`button[aria-controls="${group}"]`);
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  await destination.click();await scenario();
  await page.getByRole('heading',{name:'Custom Scenario',exact:true}).waitFor();
  const windowNote=page.locator('[data-planning-destination="scenario-modeling"] p').filter({hasText:'Company what-if ·'});
  assert.match(await windowNote.innerText(),/returned Baseline window/);
  assert.doesNotMatch(await windowNote.innerText(),/Jan–Dec 2027|September stock carries to January|Oct–Dec 2026 are unmodeled/);

  const layout=await page.getByRole('heading',{name:'Custom Scenario',exact:true}).evaluate(n=>({customHeadingY:n.getBoundingClientRect().top,documentHeight:document.documentElement.scrollHeight,viewport:innerWidth}));
  if(width>=1180)assert.ok(layout.customHeadingY<757,'Scenario editor begins within desktop first screen');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'initial page has no horizontal overflow');
  await page.screenshot({path:`${output}/${width}-scenario-initial.png`,fullPage:true});
  // Explicit panel preference wins over the Planning default, including Back/Forward.
  await page.getByTitle('Open AI panel',{exact:true}).click();
  await page.getByRole('button',{name:'Open Planning Overview',exact:true}).click();
  assert.ok(await page.getByTitle('Collapse AI panel',{exact:true}).isVisible());
  await page.goBack();await scenario();assert.ok(await page.getByTitle('Collapse AI panel',{exact:true}).isVisible());
  await page.getByTitle('Collapse AI panel',{exact:true}).click();
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
  const buDisclosure=page.locator('summary').filter({hasText:'Business-unit what-if — separate inputs and result'});
  await buDisclosure.focus();await page.keyboard.press('Enter');
  const bu=page.getByRole('heading',{name:'Business Unit What-if',exact:true}).locator('..').locator('..').locator('..');
  await bu.getByRole('spinbutton').nth(0).fill('9');
  await buDisclosure.click();await buDisclosure.click();assert.equal(await bu.getByRole('spinbutton').nth(0).inputValue(),'9');
  assert.equal(await growth.inputValue(),'7');await buDisclosure.click();
  for(const [label,destination] of [['Position & Workforce Design','position-workforce-design'],['Workforce Response','workforce-response'],['Execution & Feasibility','execution-feasibility']]){
    await page.getByRole('button',{name:'Open '+label,exact:true}).click();
    await page.locator(`[data-planning-destination="${destination}"]`).waitFor({state:'visible'});
    assert.ok(await page.getByTitle('Open AI panel',{exact:true}).isVisible());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${output}/${width}-${destination}.png`,fullPage:true});
    await page.getByRole('button',{name:'Open Scenario Modeling',exact:true}).click();await assertPreserved();
  }
  await buDisclosure.click();assert.equal(await bu.getByRole('spinbutton').nth(0).inputValue(),'9');await buDisclosure.click();
  const source=page.locator('summary').filter({hasText:'Assumptions & source details — stored company plan'});
  await source.focus();await page.keyboard.press('Enter');
  const sourceDetails=source.locator('..');
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-planning-destination="scenario-modeling"] .recharts-surface')).filter(n=>n.getBoundingClientRect().width>0).length>=2);
  await source.click();
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
  await close();await assertPreserved();
  await source.click();assert.ok(await sourceDetails.locator('.recharts-surface').evaluate(n=>n.getBoundingClientRect().width>0));await source.click();
  await custom.getByRole('button',{name:'Save Scenario',exact:true}).click();
  await page.getByRole('heading',{name:'Saved Scenario Comparison',exact:true}).waitFor();
  assert.ok(await page.getByRole('region',{name:'Saved scenario comparison',exact:true}).isVisible());
  const saved=page.getByRole('heading',{name:'Saved Scenario Comparison',exact:true}).locator('..').locator('..').locator('..');
  const selected=saved.getByRole('checkbox').first();assert.equal(await selected.isChecked(),true);await selected.uncheck();
  await page.getByRole('button',{name:'Open Planning Overview',exact:true}).click();await page.goBack();await scenario();
  assert.equal(await selected.isChecked(),false);await selected.check();
  assert.equal(modelInputs.length,1,'comparison selection never reruns the model');

  await page.screenshot({path:`${output}/${width}-restored-draft.png`,fullPage:true});
  await launch();await heading();await hires().fill('100');await departures().fill('60');await demo().getByRole('button',{name:'Compare',exact:true}).click();
  await costRate.fill('12.34');await demo().getByRole('button',{name:'Compare',exact:true}).click();
  const costTable=demo().getByRole('region',{name:'Monthly cost table',exact:true});assert.ok(await costTable.isVisible());
  assert.ok(await demo().getByRole('heading',{name:'Assumed monthly cost run-rate · USD/month',exact:true}).isVisible());
  if(width===390){await costTable.evaluate(n=>n.scrollLeft=n.scrollWidth);assert.ok(await costTable.evaluate(n=>n.scrollLeft>0));await page.screenshot({path:`${output}/${width}-cost-scrolled.png`,fullPage:true});await costTable.evaluate(n=>n.scrollLeft=0);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/${width}-in-shell-demo.png`,fullPage:true});
  await page.reload();await heading();assert.equal(await hires().inputValue(),'');assert.equal(await departures().inputValue(),'');assert.equal(await costRate.inputValue(),'');assert.equal(await demo().getByRole('region',{name:'Assumed monthly cost run-rates',exact:true}).count(),0);
  await page.goto(base+'/planning/headcount-demo');await heading();assert.equal(new URL(page.url()).pathname,'/');assert.equal(new URL(page.url()).searchParams.get('demo'),'headcount');
  assert.deepEqual(ai,[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  evidence.push({width,layout,baselineWindow:points.map(point=>point.planning_month),windowNote:"generic returned Baseline window; no unsupported January/gap claim",aiPreference:'default collapsed; explicit open/collapse preserved',independentBuDraft:true,keyboardDisclosures:true,chartsRestored:true,savedComparison:true,entry:'Planning → Scenario Modeling → in-shell demo',filters:{country:'UK',businessUnit:'ENG',level:'L3'},unassigned:true,assumptions:originalInputs,draftName:'Unassigned engineering draft',roundTrips:['explicit return','Back then Forward after return','Back then Forward after open'],sameDraftDOM:true,calculatedResultPreserved:true,modelInputs,aiRequests:ai,externalRequests:external,checks:'reset, populated-cost reload, full-shell cost table/mobile scroll, old route redirect, scope gates, no round-trip requests'});
  await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/checks.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
