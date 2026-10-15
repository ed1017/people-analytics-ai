// Real app assets; synthetic reads, no API writes or paid AI. Works against local production or an accessible Preview.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3530';
const output=process.env.SKILL_OUTPUT??'tests/artifacts/skill-client-demand';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],unexpected=[];
 page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
 const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Synthetic skill demand review'},{id:'b',statement:'Separate goal'}]},workspaces:{}};
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 let missingReceipt=false;
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin==='https://va.vercel-scripts.com')return route.abort();if(url.origin!==base||req.method()!=='GET'){unexpected.push(url.pathname);return route.abort();}if(!url.pathname.startsWith('/api/'))return route.continue();if(url.pathname==='/api/skills')return route.fulfill({headers:missingReceipt?{}:{'x-workforce-dataset':req.headers()['x-workforce-dataset']},json:{as_of:'2026-09-30',summary:{current_workforce:10000},largest_gaps:[{skill_id:1,skill_code:'DATA',skill_name:'Data analysis',employees_meeting_requirement:9999},{skill_id:2,skill_code:'COMM',skill_name:'Communication'}],highest_demand:[],strongest_coverage:[]}});const defaults={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:0,fill_rate_pct:100,productivity_hiring_reduction_pct:0};const data=url.pathname==='/api/dashboard'?scopedDashboardResponse({overview:{headcount:100,fte:80,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}},{country:'all',org:'all',level:'all'}):url.pathname==='/api/workforce-planning'?{scenarios:[]}:url.pathname==='/api/scenario-modeler'?{defaults}:url.pathname==='/api/business-unit-scenario'?{defaults,business_units:[]}:null;return route.fulfill(data?{json:data}:{status:503,json:{error:'Synthetic source unavailable'}});});

 await page.goto(base+'/?page=planning-overview');
 const area=page.getByRole('region',{name:'Workload capacity planning',exact:true});await area.waitFor();
 const input=label=>area.getByLabel(label,{exact:true});
 assert.equal(await input('People at the start').isVisible(),true);assert.equal(await input('Working time at the start (FTE)').isVisible(),true);assert.equal(await input('Opening date (month end)').isVisible(),false);assert.equal(await input('Work items each month').isVisible(),true);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:output+'/'+width+'-first-view.png',fullPage:true});
 await input('Work to plan').fill('Unsent manual workload');
 await area.getByText('Choose a skill (optional)',{exact:true}).click();
 const setup=area.getByRole('region',{name:'Skill client demand setup',exact:true});
 await setup.getByLabel('Skill reference',{exact:true}).selectOption('1');
 assert.equal(await input('Work to plan').inputValue(),'Unsent manual workload','selection alone must not replace draft');
 await setup.getByRole('button',{name:'Start new skill workload',exact:true}).click();
 assert.match(await input('Work to plan').inputValue(),/Data analysis.*DATA; reference 2026-09-30.*clients/);
 for(const label of ['People at the start','Working time at the start (FTE)','Work items each month','Opening date (month end)'])assert.equal(await input(label).inputValue(),'');
 await area.getByText('Timing & capacity assumptions (required)',{exact:true}).click();
 for(const [label,value] of Object.entries({'Opening date (month end)':'2026-09-30','Planning months':'2','Work items each month':'20','Hours per item':'8','Work hours per FTE each month':'160'}))await input(label).fill(value);

 for(const [label,value] of Object.entries({'Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await input(label).fill(value);
 await area.getByRole('checkbox',{name:/Assume every hire/}).check();
 assert.match(await area.innerText(),/Incomplete/);assert(await area.getByRole('button',{name:'Save scenario',exact:true}).isDisabled());
 await input('People at the start').fill('3');await input('Working time at the start (FTE)').fill('2');
 const calculate=async()=>{await area.getByRole('checkbox',{name:/I confirm/}).check();await area.getByRole('button',{name:'Calculate capacity',exact:true}).click();};
 const save=async name=>{await input('Capacity scenario name').fill(name);await area.getByRole('button',{name:'Save scenario',exact:true}).click();};
 await calculate();await save('20 clients');
 await input('Work items each month').fill('40');assert.equal(await area.getByRole('slider',{name:'Work items each month slider',exact:true}).inputValue(),'40');assert(await area.getByRole('button',{name:'Save scenario',exact:true}).isDisabled());
 await calculate();await save('40 clients');
 await input('Saved capacity scenario').selectOption({label:'20 clients'});await input('Compare capacity scenario').selectOption({label:'40 clients'});
 const comparison=area.getByRole('region',{name:'Saved capacity comparison',exact:true});assert.deepEqual(await comparison.locator('tbody tr').first().locator('td').allTextContents(),['0','+1']);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:output+'/'+width+'-skill-demand.png',fullPage:true});await comparison.screenshot({path:output+'/'+width+'-comparison.png'});
 await page.reload();await input('Saved capacity scenario').selectOption({label:'40 clients'});await area.getByRole('button',{name:'Open saved scenario',exact:true}).click();
 assert.equal(await input('Work items each month').inputValue(),'40');assert.match(await input('Work to plan').inputValue(),/DATA; reference 2026-09-30/);
 await area.getByText('Choose a skill (optional)',{exact:true}).click();await setup.getByLabel('Skill reference',{exact:true}).selectOption('2');await setup.getByRole('button',{name:'Start new skill workload',exact:true}).click();assert.equal(await input('Working time at the start (FTE)').inputValue(),'');assert.equal(await input('Work items each month').inputValue(),'');assert.match(await input('Work to plan').inputValue(),/Communication/);
 assert.equal(await input('Saved capacity scenario').locator('option').count(),3);
 await page.getByLabel('Selected goal',{exact:true}).selectOption('b');if(!await setup.isVisible())await area.getByText('Choose a skill (optional)',{exact:true}).click();await setup.getByLabel('Skill reference',{exact:true}).locator('option[value="1"]').waitFor({state:'attached'});assert.equal(await setup.getByLabel('Skill reference',{exact:true}).inputValue(),'');assert.equal(await input('Work to plan').inputValue(),'');
 missingReceipt=true;await page.reload();await area.getByText('Choose a skill (optional)',{exact:true}).click();await setup.getByRole('alert').waitFor();assert.equal(await setup.getByLabel('Skill reference',{exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 evidence.push({width,verifiedReference:true,noInferredSupply:true,monthlyClientDemand:true,saveCompareReopen:true,newSkillClearsInputs:true,missingReceiptClosed:true,errors,unexpected});await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
