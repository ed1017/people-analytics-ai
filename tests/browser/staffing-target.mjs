// Production-build browser check. Synthetic aggregate fixtures; no external/model/database traffic.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {STAFFING_TARGET_BASIS} from '../../lib/staffing-target.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3518',output=process.env.STAFFING_SCREENSHOTS??'/workspace/review-staffing-target';
await fs.mkdir(output,{recursive:true});
const defaults={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:0,fill_rate_pct:100,productivity_hiring_reduction_pct:0};
const units=[{org_code:'OPS',org_name:'Operations',headcount:100,fte:80},{org_code:'HR',org_name:'People team',headcount:20,fte:16}];
const catalog={as_of:'2026-09-30',defaults,business_units:units,staffing_target_basis:STAFFING_TARGET_BASIS};
function supply(code){const unit=units.find(row=>row.org_code===code);const points=[{planning_month:'2026-10-01',planned_headcount:unit.headcount,planned_fte:unit.fte,planned_labor_cost_usd:1000},{planning_month:'2026-11-01',planned_headcount:unit.headcount+5,planned_fte:unit.fte+4,planned_labor_cost_usd:1050}];return {...runScenarioModel({asOf:catalog.as_of,startingHeadcount:unit.headcount,baselinePoints:points,defaults,assumptions:defaults}),staffing_target_basis:STAFFING_TARGET_BASIS,scope:{type:'business_unit',org_code:code,org_name:unit.org_name,current_headcount:unit.headcount,current_fte:unit.fte,planning_horizon_start:points[0].planning_month,planning_horizon_end:points[1].planning_month}};}
const seed={version:1,revision:1,goals:{version:1,activeId:'goal-a',goals:[{id:'goal-a',statement:'Synthetic staffing review'},{id:'goal-b',statement:'Separate synthetic goal'}]},workspaces:{'goal-a':{savedAt:'2026-10-14T00:00:00Z',fields:{sentinel:{keep:'Unchanged saved scenario'}}}}};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const evidence=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],posts=[],external=[];
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(({key,value})=>{localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 let mode='valid',release=null;
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin==='https://va.vercel-scripts.com')return route.abort();if(url.origin!==base){external.push(url.origin);return route.abort();}if(!url.pathname.startsWith('/api/'))return route.continue();
  if(req.method()!=='GET'&&!(url.pathname==='/api/business-unit-scenario'&&url.searchParams.get('staffing_target')==='1'&&req.method()==='POST')){posts.push({unexpected:url.pathname});return route.abort();}
  if(url.pathname==='/api/business-unit-scenario'&&url.searchParams.get('staffing_target')==='1'){
   const headers=mode==='missing-receipt'?{}:{'x-workforce-dataset':'legacy-v1:0'};
   if(req.method()==='GET')return route.fulfill({json:catalog,headers});
   const body=req.postDataJSON();posts.push(body);assert.deepEqual(Object.keys(body),['business_unit']);const data=supply(body.business_unit);
   if(mode==='delay'&&body.business_unit==='OPS')await new Promise(resolve=>release=resolve);
   if(mode==='wrong-scope')data.scope.org_code='WRONG';
   return route.fulfill({json:data,headers}).catch(()=>{});
  }
  const data=url.pathname==='/api/dashboard'?{overview:{headcount:120,fte:96,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}:url.pathname==='/api/workforce-planning'?{scenarios:[]}:url.pathname==='/api/business-unit-scenario'?catalog:url.pathname==='/api/scenario-modeler'?{defaults}:null;
  return route.fulfill(data?{json:data}:{status:503,json:{error:'Synthetic fixture unavailable'}});
 });
 await page.goto(base+'/?page=planning-overview');await page.getByLabel('Selected goal',{exact:true}).selectOption('goal-a');await page.getByRole('button',{name:/Plan a staffing target/}).click();
 const region=page.getByRole('region',{name:'Staffing target planner'}),group=region.getByLabel('Business unit',{exact:true}),month=region.getByLabel('Target month',{exact:true}),target=region.getByLabel('Required people',{exact:true});
 await group.selectOption('OPS');await month.selectOption('2026-11-01');assert.equal(await target.inputValue(),'');assert.match(await region.innerText(),/Enter your target to see the gap/);
 await region.screenshot({path:`${output}/${width}-unknown.png`});
 const before=posts.length;await target.fill('110');await region.getByText('5 people short of your target',{exact:true}).waitFor();assert.equal(posts.length,before,'target input is local only');assert.deepEqual(await region.locator('dd').allTextContents(),['105 people','110 people']);
 await region.screenshot({path:`${output}/${width}-target.png`});
 await target.fill('90');await region.getByText('15 people above your target',{exact:true}).waitFor();await target.fill('105');await region.getByText('Supply matches your target',{exact:true}).waitFor();await target.fill('0');await region.getByText('105 people above your target',{exact:true}).waitFor();
 for(const invalid of ['-1','1.5','1e3']){await target.fill(invalid);await region.getByRole('alert').waitFor();assert.doesNotMatch(await region.innerText(),/people (short of|above) your target/);}
 await month.selectOption('2026-10-01');assert.equal(await target.inputValue(),'');assert.match(await region.innerText(),/100 people/);
 await group.selectOption('HR');assert.equal(await target.inputValue(),'');await month.selectOption('2026-11-01');await target.fill('30');await region.getByText('5 people short of your target',{exact:true}).waitFor();
 mode='delay';await group.selectOption('OPS');await page.waitForFunction(()=>document.querySelector('[aria-label="Staffing target planner"]')?.getAttribute('aria-busy')==='true');await page.waitForTimeout(100);await group.selectOption('HR');await month.selectOption('2026-11-01');release?.();await target.fill('30');await region.getByText('5 people short of your target',{exact:true}).waitFor();assert.match(await region.innerText(),/People team · November 2026 · people/);assert.doesNotMatch(await region.innerText(),/105 people/);
 mode='wrong-scope';await group.selectOption('OPS');await region.getByRole('alert').waitFor();assert.equal(await target.isDisabled(),true);assert.doesNotMatch(await region.innerText(),/people (short of|above) your target/);
 mode='valid';await page.getByLabel('Selected goal',{exact:true}).selectOption('goal-b');const reopen=page.getByRole('button',{name:/Plan a staffing target/});if(await reopen.getAttribute('aria-expanded')==='false')await reopen.click();await group.selectOption('OPS');assert.equal(await target.inputValue(),'');assert.equal(await month.inputValue(),'');
 mode='missing-receipt';await region.getByRole('button',{name:'Refresh supply source'}).click();await region.getByRole('alert').waitFor();assert.equal(await group.isDisabled(),true);
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);assert.deepEqual(stored.workspaces['goal-a'].fields.sentinel,seed.workspaces['goal-a'].fields.sentinel);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(posts.some(row=>row.unexpected),false);
 evidence.push({width,errors,external,deterministicSupplyRequests:posts.length,checks:'unknown target; people not FTE; one month only; immediate local gap; shortfall/surplus/zero; invalid input; unit/month/goal reset; late response ignored; scope mismatch rejected; missing dataset receipt rejected; saved sentinel unchanged; no horizontal overflow; no AI calls'});await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
