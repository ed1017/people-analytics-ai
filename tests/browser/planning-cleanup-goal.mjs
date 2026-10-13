// Real local shell; goal-linked saved results and drafts, synthetic intercepted APIs only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {structural,rolePlan} from '../fixtures/scenario-typing-branches.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3510';
const output=await fs.mkdtemp('/tmp/planning-cleanup-goal-');
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:12,fill_rate_pct:90,productivity_hiring_reduction_pct:5};
const points=Array.from({length:12},(_,i)=>({planning_month:`2027-${String(i+1).padStart(2,'0')}-01`,planned_headcount:1000+i*10,planned_fte:980+i*10,planned_hires:15,planned_exits:5,planned_labor_cost_usd:10000000+i*100000}));
const custom=runScenarioModel({asOf:'2026-09-30',startingHeadcount:1000,baselinePoints:points,defaults,assumptions:defaults});
const fields={'planning.customScenario':custom,'planning.customAssumptions':defaults,'planning.scenarioName':'Retained goal draft','planning.structuralPositionResult':structural,'planning.roleResponsePlanProfile':'SYN-ROLE','planning.roleResponsePlanResult':rolePlan,'planning.roleResponsePlanAllocation':rolePlan.allocation,'planning.savedScenarios':[{id:'saved',name:'Retained comparison',saved_at:'2026-10-13T00:00:00.000Z',scenario:custom}],'planning.comparisonScenarioIds':['saved']};
const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Explore a synthetic workforce scenario.'}]},workspaces:{a:{savedAt:'2026-10-13T00:00:00.000Z',fields}}};
const planning={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',description:'Synthetic goal fixture',assumptions:[],points}]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1366,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(15000);
 await context.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 const errors=[],posts=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external.push(url.origin);return route.abort();}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(request.method()!=='GET'){posts.push(url.pathname);return route.abort();}
  const data=url.pathname==='/api/dashboard'?scopeDashboard(url.search):url.pathname==='/api/workforce-planning'?planning:url.pathname==='/api/scenario-modeler'?{defaults}:url.pathname==='/api/business-unit-scenario'?{defaults,business_units:[]}:null;
  return route.fulfill(data?{json:data}:{status:503,json:{error:'Synthetic source unavailable.'}});
 });
 await page.goto(base+'/?page=scenario-modeling');
 await page.getByPlaceholder('Scenario name',{exact:true}).waitFor();assert.equal(await page.getByPlaceholder('Scenario name',{exact:true}).inputValue(),'Retained goal draft');
 await page.getByRole('navigation',{name:'Planning sections'}).locator('summary').click();
 const readFields=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload.workspaces.a.fields,DECISIONS_STORAGE_KEY);
 for(const [title,destination] of [['Position & Workforce Design','position-workforce-design'],['Workforce Response','workforce-response'],['Execution & Feasibility','execution-feasibility']]){
  await page.getByRole('button',{name:'Open '+title,exact:true}).click();
  const area=page.locator(`[data-planning-destination="${destination}"]`);await area.waitFor({state:'visible'});
  if(destination!=='position-workforce-design'){
   const inherited=area.locator('summary').filter({hasText:'Inherited design assumptions'});await inherited.focus();await page.keyboard.press('Enter');
   assert.ok((await area.innerText()).includes('1,102'));await inherited.click();
  }else assert.ok((await area.innerText()).includes('1,102'));
  if(destination==='workforce-response'){
    const talent=area.locator('summary').filter({hasText:'Talent and recruiting evidence'});await talent.focus();await page.keyboard.press('Enter');
    assert.ok(await area.getByText('Internal Talent Readiness',{exact:true}).isVisible());await talent.click();
    const compare=area.locator('summary').filter({hasText:'Compare additional talent evidence'});await compare.click();
    await area.getByRole('region',{name:'Talent evidence for response options',exact:true}).getByRole('textbox').fill('Retained evidence draft');await compare.click();await compare.click();
    assert.equal(await area.getByRole('region',{name:'Talent evidence for response options',exact:true}).getByRole('textbox').inputValue(),'Retained evidence draft');await compare.click();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/${width}-${destination}.png`,fullPage:true});
  const current=await readFields();for(const [key,value] of Object.entries(fields))assert.deepEqual(current[key],value,'retained '+key);
 }
 await page.getByRole('button',{name:'Open Scenario Modeling',exact:true}).click();
 assert.equal(await page.getByPlaceholder('Scenario name',{exact:true}).inputValue(),'Retained goal draft');
 assert.ok(await page.getByRole('region',{name:'Saved scenario comparison',exact:true}).isVisible());
 assert.equal(await page.getByRole('checkbox').filter({visible:true}).count()>=1,true);
 assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);assert.ok(external.every(origin=>origin==='https://va.vercel-scripts.com'),'only the blocked analytics script may be attempted');
 evidence.push({width,goal:'a',retainedFields:Object.keys(fields),keyboardDisclosures:true,overflow:false,errors,posts,external});await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/checks.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
