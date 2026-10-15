// Isolated local production-build checks. Screenshots are internal QA, not hosted Preview evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
import {monthlyCapacityField} from '../../lib/swp-capacity-store.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3527',output=process.env.OVERVIEW_OUTPUT??'/tmp/intelligence-overview';
await fs.mkdir(output,{recursive:true});
const defaults={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:0,fill_rate_pct:100,productivity_hiring_reduction_pct:0};
const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'a',statement:'Synthetic workload review'}]},workspaces:{a:{savedAt:'2026-10-14T00:00:00Z',fields:{sentinel:'Preserve saved work'}}}};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const evidence=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],unexpected=[];page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin==='https://va.vercel-scripts.com')return route.abort();if(url.origin!==base||req.method()!=='GET'){unexpected.push(url.pathname);return route.abort();}if(!url.pathname.startsWith('/api/'))return route.continue();
 const data=url.pathname==='/api/dashboard'?scopedDashboardResponse({overview:{headcount:100,fte:80,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:80}],filter_options:{countries:[],business_units:[],levels:[]}},{country:'all',org:'all',level:'all'}):url.pathname==='/api/workforce-planning'?{scenarios:[]}:url.pathname==='/api/scenario-modeler'?{defaults}:url.pathname==='/api/business-unit-scenario'?{defaults,business_units:[]}:null;return route.fulfill(data?{json:data}:{status:503,json:{error:'Synthetic source unavailable'}});});
 await page.goto(base);await page.getByRole('heading',{name:'Workforce Intelligence',exact:true}).waitFor();
 const welcome=page.getByRole('region',{name:'Plan your workforce',exact:true});await welcome.getByText('100',{exact:true}).waitFor();
 assert.deepEqual(await welcome.locator('dd').allTextContents(),['100','Not configured','Not configured']);assert.equal(await welcome.getByRole('button').count(),4);
 assert.equal(await page.getByLabel('Ask Workforce AI',{exact:true}).isVisible(),true);
 const action=await welcome.getByRole('button').first().boundingBox();assert(action.y+action.height<=1000,'first question visible in first viewport');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:output+'/'+width+'-welcome.png',fullPage:true});
 async function navigate(name){if(width===390)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Workforce navigation',exact:true}).getByRole('button',{name,exact:true}).click();}
 const overview=page.getByRole('region',{name:'Workforce planning overview',exact:true});
 async function showSummary(){if(!await overview.isVisible())await page.getByText('Current scenario summary',{exact:true}).click();await overview.waitFor();}
 await navigate('Scenarios');await showSummary();await overview.getByText(/100 people/).waitFor();
 assert.deepEqual(await overview.locator('dd').allTextContents(),['80 FTE','Not set','Not set']);assert.equal(await overview.getByRole('button').count(),1);assert.match(await overview.getByLabel('Scenario supply cost').innerText(),/Not set/);
 await page.screenshot({path:output+'/'+width+'-snapshot.png',fullPage:true});
 await page.getByLabel('Selected goal',{exact:true}).selectOption('a');await page.getByRole('region',{name:'Workload capacity planning',exact:true}).waitFor();const area=page.getByRole('region',{name:'Workload capacity planning',exact:true});
 await area.getByText('Timing & capacity assumptions (required)',{exact:true}).click();
 for(const [label,value] of Object.entries({'Work to plan':'Service desk — tickets','Opening date (month end)':'2026-09-30','People at the start':'10','Working time at the start (FTE)':'8','Work items each month':'800','Hours per item':'1','Work hours per FTE each month':'160','Cost per contracted FTE per month (USD, optional)':'100'}))await area.getByLabel(label,{exact:true}).fill(value);
for(const [label,value] of Object.entries({'Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await area.getByLabel(label,{exact:true}).fill(value);
 await area.getByRole('checkbox',{name:/Assume every hire/}).check();await area.getByRole('checkbox',{name:/I confirm/}).check();await area.getByRole('button',{name:'Calculate capacity',exact:true}).click();await area.getByText('Calculated from your assumptions',{exact:true}).waitFor();
 await navigate('Plan home');assert.equal(await overview.isVisible(),false,'scenario chart stays out of Plan home');assert.equal(await page.getByLabel('Ask Workforce AI',{exact:true}).isVisible(),true);await navigate('Scenarios');await showSummary();assert.deepEqual(await overview.locator('dd').allTextContents(),['4 FTE','5 FTE','1 FTE']);assert.match(await overview.getByLabel('Scenario supply cost').innerText(),/\$800.00 USD\/month/);assert.match(await overview.innerText(),/Service desk — tickets · 2026-12/);assert.equal(await overview.getByRole('button').count(),1);
 await page.evaluate(()=>scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`${output}/${width}-scenario.png`,fullPage:true});
 const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);assert.deepEqual(state.workspaces.a.fields.sentinel,seed.workspaces.a.fields.sentinel);assert.equal(state.workspaces.a.fields[monthlyCapacityField],undefined);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);evidence.push({width,firstQuestionInViewport:true,snapshot:'100 people, 80 FTE; demand and cost unset',scenario:'4 assigned FTE; 5 required FTE; 1 FTE shortfall; $800/month from 8 contracted FTE × $100',savedWorkUnchanged:true,errors,unexpected});await context.close();
}}finally{await browser.close();}
await fs.writeFile(`${output}/evidence.json`,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
