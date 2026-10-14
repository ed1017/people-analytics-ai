// Local production/dev browser evidence with synthetic read fixtures; all writes and external calls blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {prepareCapacityRecord} from '../../lib/swp-capacity-record.ts';
import {emptyCapacityDraft,capacitySpec} from '../../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../../lib/swp-monthly-workload.ts';
import {calculateCapacityCost,capacityCostAssumptions} from '../../lib/swp-capacity-cost.ts';
import {monthlyCapacityField} from '../../lib/swp-capacity-store.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3510',output=process.env.OVERVIEW_SCREENSHOTS??'/workspace/review-overview';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],external=[],errors=[];
 page.setDefaultTimeout(25000);page.on('pageerror',error=>errors.push(error.message));
 let holdScope=true;const scopeWaiters=[];
 await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url());if(u.origin==='https://va.vercel-scripts.com')return route.abort();if(u.origin!==base){external.push(u.origin);return route.abort();}if(!u.pathname.startsWith('/api/'))return route.continue();if(request.method()!=='GET'){posts.push(u.pathname);return route.abort();}
  if(u.pathname==='/api/dashboard'||u.pathname==='/api/overview'){
   const country=u.searchParams.get('country')??'all';
   if(country==='UK'&&u.pathname==='/api/dashboard'&&holdScope)await new Promise(resolve=>scopeWaiters.push(resolve));
   const raw={overview:{snapshot_date:'2026-09-30',headcount:1240,fte:1206,voluntary_turnover_ytd_pct:7.2,open_positions:28},trend:[1180,1193,1201,1197,1213,1227,1224,1235,1240].map((headcount,i)=>({headcount,fte:headcount-34,snapshot_date:new Date(Date.UTC(2026,i+1,0)).toISOString().slice(0,10)})),filter_options:{countries:[{value:'UK',label:'United Kingdom'}],business_units:[],levels:[]}};
   const data=scopedDashboardResponse(raw,{country:'all',org:'all',level:'all'});return route.fulfill({json:data});
  }
  if(u.pathname==='/api/workforce-planning')return route.fulfill({json:{scenarios:[]}});
  return route.fulfill({status:503,json:{error:'Synthetic source unavailable.'}});
 });
 await page.goto(base);const summary=page.getByRole('region',{name:'Workforce planning overview',exact:true});await summary.getByText('1,240',{exact:true}).first().waitFor();
 assert.equal(await page.getByRole('dialog',{name:'Home instructions',exact:true}).isVisible(),false,'fresh entry does not obscure overview');
 assert.deepEqual(posts,[]);assert.equal(await page.locator('#navigation-analytics').isVisible(),false,'specialist navigation is secondary on entry');
 await page.screenshot({path:`${output}/${width}-overview-local.png`,fullPage:true});await page.screenshot({path:`${output}/${width}-viewport-local.png`});
 assert.equal(await summary.getByRole('img').count(),0,'no invented projection before a scenario exists');const actions=await summary.getByRole('button',{name:'Plan a scenario'}).boundingBox();assert.ok(actions.y+actions.height<900);assert.equal(await summary.getByRole('button').count(),1);assert.equal(await page.getByLabel('Ask Workforce AI',{exact:true}).isVisible(),false);
 // Primary action keyboard navigation and repeated Back/Forward retain the user's unsent draft.
 await page.getByText('Chat & saved goals',{exact:true}).click();const chat=page.getByLabel('Ask Workforce AI',{exact:true});await chat.fill('Keep this unsent overview question');
 for(let i=0;i<2;i++){
  await summary.getByRole('button',{name:'Plan a scenario'}).focus();await page.keyboard.press('Enter');await page.getByRole('region',{name:'Illustrative workforce planning'}).waitFor();
  await page.goBack();await summary.waitFor();assert.equal(await chat.inputValue(),'Keep this unsent overview question');
  await page.goForward();await page.getByRole('region',{name:'Illustrative workforce planning'}).waitFor();
  if(width<768)await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Overview',exact:true}).click();await summary.waitFor();
 }
 await summary.getByRole('button',{name:'Plan a scenario'}).click();await page.getByRole('region',{name:'Illustrative workforce planning'}).waitFor();await page.goBack();await summary.waitFor();
 // Use the real existing capacity form: the overview only reuses confirmed results.
 await summary.getByRole('button',{name:'Plan a scenario'}).click();
 await page.getByText('Advanced tools · your capacity scenarios',{exact:true}).click();
 const capacity=page.getByRole('region',{name:'Workload capacity planning',exact:true});
 for(const [label,value] of Object.entries({'Workload scope':'Service desk — tickets','Opening date (month end)':'2026-09-30','Opening people':'10','Opening contracted FTE':'8','Work units each month':'800','Hours per work unit':'1','Productive hours per FTE each month':'160','Cost per contracted FTE per month (USD, optional)':'0'}))await capacity.getByLabel(label,{exact:true}).fill(value);
 await capacity.getByText('Recurring assumptions (required)',{exact:true}).click();
 for(const [label,value] of Object.entries({'Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await capacity.getByLabel(label,{exact:true}).fill(value);
 await capacity.getByRole('checkbox',{name:/Assume every hire/}).check();await capacity.getByRole('checkbox',{name:/I confirm/}).check();await capacity.getByRole('button',{name:'Calculate capacity',exact:true}).click();
 await capacity.getByRole('img').waitFor();assert.match(await capacity.innerText(),/\$0.00/);await page.goBack();await summary.waitFor();assert.equal(await summary.getByRole('img').count(),0);assert.doesNotMatch(await summary.innerText(),/3 months|\$0.00|Service desk/);
 await page.getByText('Chat & saved goals',{exact:true}).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/${width}-current-scenario-local.png`,fullPage:true});
 await summary.getByRole('button',{name:'Plan a scenario'}).click();
 const advanced=page.getByText('Advanced tools · your capacity scenarios',{exact:true});if(!await capacity.isVisible())await advanced.click();
 await capacity.getByLabel('Cost per contracted FTE per month (USD, optional)',{exact:true}).fill('');await page.goBack();await summary.waitFor();assert.equal(await summary.getByRole('img').count(),0,'editing inputs withholds invalidated projection');
 // A pending and then mismatched receipt must never relabel old quantities as the newly selected country.
 if(width<768)await page.getByText('Filters',{exact:true}).click();await page.getByLabel('Country',{exact:true}).selectOption('UK');
 await summary.getByText('Updating workforce…').waitFor();assert.equal(await summary.getByText('1,240',{exact:true}).count(),0);await page.waitForTimeout(100);holdScope=false;for(const resolve of scopeWaiters)resolve();
 await summary.getByRole('status').filter({hasText:'Workforce snapshot unavailable'}).waitFor().catch(async error=>{console.log(await summary.innerText());throw error;});assert.equal(await summary.getByRole('img').count(),0);assert.equal(await summary.getByText('1,240',{exact:true}).count(),0);
 await page.getByLabel('Country',{exact:true}).selectOption('all');await summary.getByText('1,240',{exact:true}).first().waitFor();
 if(width<768)await page.getByText('Filters',{exact:true}).click();await page.getByText('Chat & saved goals',{exact:true}).click();await chat.fill('');await page.reload();await summary.getByText('1,240',{exact:true}).first().waitFor();await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`${output}/${width}-overview-local.png`,fullPage:true});await page.screenshot({path:`${output}/${width}-viewport-local.png`});
 // A validated saved record is discoverable only for its active goal; it is never selected automatically.
 const savedDraft={...emptyCapacityDraft,scope:'Service desk — tickets',openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true,costRate:''};
 const savedResult=calculateMonthlyWorkload(capacitySpec(savedDraft)),savedCost=calculateCapacityCost(savedResult,capacityCostAssumptions(''));
 const binding={datasetToken:'legacy-v1:0',goalId:'goal-a',goal:'Review service desk capacity',scopeId:'scope-a',scopeLabel:savedDraft.scope,workUnit:savedDraft.scope};
 const record=prepareCapacityRecord({draft:savedDraft,result:savedResult,cost:savedCost,error:''},binding,{id:'scenario-a',name:'Reviewed service desk scenario',createdAt:'2026-10-14T00:00:00.000Z'});
 const bucket={version:1,scopes:[{id:'scope-a',label:savedDraft.scope,workUnit:savedDraft.scope}],entries:[{draft:savedDraft,record}]};
 const seed={version:1,revision:1,goals:{version:1,activeId:'goal-a',goals:[{id:'goal-a',statement:binding.goal},{id:'goal-b',statement:'A separate planning question'}]},workspaces:{'goal-a':{savedAt:'2026-10-14T00:00:00Z',fields:{[monthlyCapacityField]:bucket}}}};
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});await page.reload();
 await summary.getByText(record.name,{exact:true}).waitFor();assert.equal(await summary.getByRole('img').count(),0);
 await page.screenshot({path:`${output}/${width}-saved-scenarios-local.png`,fullPage:true});await page.getByLabel('Selected goal',{exact:true}).selectOption('goal-b');await page.waitForFunction(()=>!document.querySelector('[aria-label="Saved scenarios"]'));assert.equal(await summary.getByText(record.name,{exact:true}).count(),0);
 const retained=await page.evaluate(({key,field})=>JSON.parse(localStorage.getItem(key)).payload.workspaces['goal-a'].fields[field],{key:DECISIONS_STORAGE_KEY,field:monthlyCapacityField});assert.deepEqual(retained,bucket,'navigation never rewrites saved capacity data');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);assert.deepEqual(external,[]);
 evidence.push({width,actions,errors,posts,external,checks:'verified scope, unknown/mismatch, keyboard primary action, repeated navigation, Back/Forward, retained draft, planner intact, calculation details remain in planner, cost zero preserved, secondary chat disclosure, goal-bound saved names, saved record unchanged, no automatic AI'});await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
