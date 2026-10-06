// Shared production shell acceptance. All API responses are synthetic and intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildCompensationResponse} from '../../lib/compensation.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3113',output=await fs.mkdtemp(path.join(os.tmpdir(),'compensation-shell-'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
const goalName='Review software developer staffing costs';
const good=buildCompensationResponse([{org_code:'A',org_name:'Synthetic service unit',org_type:'business_unit',headcount:100,fte:80,labor_cost_usd:8000000},{org_code:'B',org_name:'Synthetic smaller unit',org_type:'business_unit',headcount:50,fte:20,labor_cost_usd:4000000}]);
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let posts=0,unexpected=0,bad=false,hold=false,release=null;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const seed={version:1,revision:1,goals:{version:1,activeId:'cost',goals:[{id:'cost',statement:goalName}]},workspaces:{cost:{savedAt:'2026-10-05T00:00:00.000Z',fields:{chat:{messages:[],input:'Keep my goal draft',problem:null,questionUnanswered:false},sentinel:{keep:true}}}}};
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname.startsWith('/api/')&&request.method()!=='GET'){posts++;return route.fulfill({status:503,json:{error:'Model requests are disabled in this fixture.'}});}
  if(url.pathname==='/api/compensation'){requests.push(url.search);if(hold)await new Promise(resolve=>release=resolve);return route.fulfill({status:bad?503:200,json:bad?{error:'PRIVATE_SOURCE_ERROR'}:good}).catch(()=>{});}
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:20,fte:18,open_positions:2,snapshot_date:'2026-09-30',voluntary_turnover_ytd_pct:3,labor_cost_usd:500000},trend:[],filter_options:{countries:[{value:'UK',label:'United Kingdom'}],business_units:[],levels:[]}}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Synthetic source unavailable.'}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),home=page.getByLabel('Ask Workforce AI',{exact:true}),goal=page.getByLabel('Selected goal',{exact:true});
 const nav=async key=>{const trigger=button('Open navigation');if(await trigger.isVisible())await trigger.click();if(key==='home'){await button('Action Planning').click();return;}const target=page.locator('[data-nav-destination="'+key+'"]');if(!await target.isVisible())await target.evaluate(el=>el.closest('section').querySelector('.nav-group-label').click());await target.click()};
 const enter=async()=>{await nav('compensation');await page.getByRole('heading',{name:'Compensation',level:1,exact:true}).waitFor();};
 await page.goto(base);await goal.waitFor();await home.waitFor();await page.waitForFunction(()=>document.querySelector('[aria-label="Selected goal"]').value==='cost');
 const filters=page.locator('.workforce-filter-disclosure');if(!await page.getByLabel('Country',{exact:true}).isVisible())await filters.locator('summary').click();await page.getByLabel('Country',{exact:true}).selectOption('UK');
 check(mode+' Home does not fetch Compensation or start model work',requests.length===0&&posts===0);
 await enter();const cost=page.getByRole('region',{name:'Compensation cost context',exact:true}),benchmarks=page.getByRole('region',{name:'US occupation wage benchmarks',exact:true});await cost.getByText('$12,000,000',{exact:true}).waitFor();
 check(mode+' Compensation route mounts cost and public reference sections',await cost.getByRole('heading',{name:'Workforce cost context',exact:true}).isVisible()&&await benchmarks.getByRole('heading',{name:'US occupation wage benchmarks',exact:true}).isVisible()&&await page.getByText('TBD',{exact:true}).count()===0);
 check(mode+' selected goal and shared country survive navigation',await goal.inputValue()==='cost'&&await page.getByLabel('Country',{exact:true}).inputValue()==='UK'&&await page.locator('.app-ai-panel').getByText('Goal: '+goalName,{exact:true}).isVisible());
 check(mode+' independent company scope is explicit and request unfiltered',requests.length===1&&requests[0]===''&&await cost.getByText(/Company scope · 2 business units · Snapshot: September 30, 2026. Workforce filters do not apply here./).isVisible());
 check(mode+' cost source shows reported weighted totals with unknown period',await cost.getByText('$120,000',{exact:true}).isVisible()&&await cost.getByText('Cost period and source refresh date are not supplied. Employee-level cost coverage is unknown.',{exact:true}).isVisible());
 check(mode+' goal wording does not automatically match a public occupation',await benchmarks.getByRole('combobox',{name:/Reference occupation/}).inputValue()===''&&await benchmarks.getByText(/No internal role has been matched/).isVisible());
 check(mode+' Compensation chat remains unavailable and draft is preserved',await page.getByLabel('Ask People Analytics AI',{exact:true}).isDisabled()&&await button('Send message').isDisabled()&&await page.getByLabel('Ask People Analytics AI',{exact:true}).inputValue()==='Keep my goal draft'&&await page.locator('.app-ai-panel').getByText('AI analysis is not available on this page.',{exact:true}).first().isVisible()&&posts===0);
 await benchmarks.getByRole('combobox',{name:/Reference occupation/}).selectOption('15-1252.00');await benchmarks.getByRole('combobox',{name:/Benchmark geography/}).selectOption('35620');
 check(mode+' public reference changes only after explicit selection',await benchmarks.getByRole('region',{name:'Annual wage percentile comparison',exact:true}).isVisible()&&await benchmarks.getByText(/This metro includes parts of New York and New Jersey/).isVisible()&&await page.getByLabel('Country',{exact:true}).inputValue()==='UK'&&posts===0&&requests.length===1);
 check(mode+' source dates and wage-versus-cost limits remain visible',await benchmarks.getByText(/Published annual wages in USD · May 2025/).isVisible()&&await benchmarks.getByText(/not seniority levels, salary bands or total compensation/).isVisible());
 await button('Open conversation details').click();check(mode+' unsupported page retains explicit AI source boundary',await page.getByRole('dialog',{name:'Conversation details',exact:true}).getByText(/AI does not analyze the local content on this page/).isVisible());await button('Close conversation details').click();
 const wageTable=benchmarks.getByRole('region',{name:'Annual wage percentile comparison',exact:true});await wageTable.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(80);
 check(mode+' nested reference table scrolls by keyboard within the page',await wageTable.evaluate(n=>n===document.activeElement&&n.scrollLeft>0)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await benchmarks.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,mode+'-compensation.png')});
 await nav('home');check(mode+' Home draft and goal survive return',await home.inputValue()==='Keep my goal draft'&&await goal.inputValue()==='cost');
 bad=true;await enter();await cost.getByRole('alert').waitFor();check(mode+' source error is sanitized while public references remain usable',await page.getByText('PRIVATE_SOURCE_ERROR',{exact:true}).count()===0&&await benchmarks.getByRole('combobox',{name:/Reference occupation/}).isEnabled());
 bad=false;await cost.getByRole('button',{name:'Try again',exact:true}).click();await cost.getByText('$12,000,000',{exact:true}).waitFor();check(mode+' explicit retry recovers the cost context',requests.length===3&&posts===0);
 await nav('home');hold=true;release=null;await enter();for(let i=0;!release&&i<100;i++)await page.waitForTimeout(10);assert.ok(release);await nav('home');hold=false;release();await page.waitForTimeout(80);check(mode+' leaving a pending page keeps Home and its draft intact',await home.inputValue()==='Keep my goal draft'&&await cost.count()===0);
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);check(mode+' no plans or private-field changes are created',stored.workspaces.cost.fields.sentinel.keep&&Object.keys(stored.workspaces.cost.fields).every(key=>['chat','sentinel'].includes(key)));
 check(mode+' responsive layout and runtime/model boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&posts===0&&unexpected===0);
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
