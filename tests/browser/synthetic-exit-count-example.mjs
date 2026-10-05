// Shared production shell. Synthetic page endpoints; forecast artifact is the reviewed offline data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3115',output=await fs.mkdtemp(path.join(os.tmpdir(),'synthetic-exit-example-'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
const attrition={as_of:'2026-09-30',summary:{total_exits:4,voluntary_exits:3,involuntary_exits:1,regrettable_exits:1,retirements:0,total_turnover_ytd_pct:4,voluntary_turnover_ytd_pct:3,annualized_voluntary_turnover_pct:4,regrettable_share_of_voluntary_pct:33.3},trend:[],business_units:[],levels:[],tenure:[],reasons:[]};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],gets=[];let posts=0,unexpected=0,unavailable=false;
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Review workforce costs'},{id:'b',statement:'Review learning options'}]},workspaces:{a:{savedAt:'2026-10-05T00:00:00.000Z',fields:{chat:{messages:[],input:'Keep draft A',problem:null,questionUnanswered:false},sentinel:true}},b:{savedAt:'2026-10-05T00:00:00.000Z',fields:{chat:{messages:[],input:'Keep draft B',problem:null,questionUnanswered:false}}}}};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.route('**/*',route=>{
  const r=route.request(),url=new URL(r.url());if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname.startsWith('/api/')){if(r.method()!=='GET'){posts++;return route.fulfill({status:503,json:{error:'Synthetic unavailable.'}})}gets.push(url.pathname);}
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:100,fte:90,open_positions:3,snapshot_date:'2026-09-30',voluntary_turnover_ytd_pct:3,labor_cost_usd:1000000},trend:[],filter_options:{countries:[{value:'UK',label:'United Kingdom'}],business_units:[],levels:[]}}});
  if(url.pathname==='/api/attrition')return route.fulfill({status:unavailable?503:200,json:unavailable?{error:'Synthetic source unavailable.'}:attrition});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Synthetic source unavailable.'}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),goal=page.getByLabel('Selected goal',{exact:true}),example=page.locator('details[aria-label="Synthetic count example"]'),content=page.getByRole('region',{name:'Conditional synthetic exit counts',exact:true});
 await page.goto(base);await goal.waitFor();await page.waitForFunction(()=>document.querySelector('[aria-label="Selected goal"]').value==='a');
 check(mode+' recruiter Home flow has no count example',await example.count()===0&&await page.getByLabel('Ask Workforce AI',{exact:true}).inputValue()==='Keep draft A');
 await button('Workforce — Attrition').click();await example.waitFor();
 check(mode+' secondary count example is collapsed and follows existing evidence',await example.evaluate(n=>!n.open&&n.previousElementSibling!==null)&&!await content.isVisible());
 const getCount=gets.length;await example.locator('summary').first().focus();await page.keyboard.press('Enter');await content.waitFor();
 check(mode+' keyboard expansion performs no API or model work',gets.length===getCount&&posts===0);
 check(mode+' prominent conditional status and fixed dates are visible',await content.getByText('Synthetic retrospective example · operational forecasting is not qualified.',{exact:true}).isVisible()&&await content.getByText(/Fixed extract: 2026-10-05 · Historical origin: Sep 2026/).isVisible());
 check(mode+' recorded and conditional totals retain distinct labels',await content.getByRole('heading',{name:'Recorded dataset subtotal',exact:true}).isVisible()&&await content.getByText('605',{exact:true}).isVisible()&&await content.getByRole('heading',{name:'Conditional remaining-year estimate',exact:true}).isVisible()&&await content.getByText('201',{exact:true}).isVisible()&&await content.getByRole('heading',{name:'Conditional full-year estimate',exact:true}).isVisible()&&await content.getByText('806',{exact:true}).isVisible());
 check(mode+' subtotal is described as incomplete and January 2024 exclusion is explicit',await content.getByText("Source completeness is unverified; this is the extract's subtotal.",{exact:true}).isVisible()&&await content.getByText(/Excluded January 2024/).isVisible()&&await content.getByText(/does not certify completeness of any included month/).isVisible());
 check(mode+' expected monthly counts are conditional event counts',await content.getByRole('table').first().getByText('67',{exact:true}).count()===3&&await content.getByRole('table').first().getByText('Oct 2026',{exact:true}).isVisible());
 check(mode+' rates and uncertainty remain unavailable',await content.getByText('Uncertainty interval: Unavailable.',{exact:true}).isVisible()&&await content.getByText('Turnover rate: Unavailable.',{exact:true}).isVisible());
 check(mode+' example has no calculator or planner action',await content.getByRole('button').count()===0&&await content.getByText(/individual risk or a staffing commitment/).isVisible());
 const methods=content.locator('details').filter({has:page.locator('summary',{hasText:'Methods and evaluation'})}).first();await methods.locator('summary').first().click();
 const table=content.getByRole('region',{name:'Retrospective method comparison',exact:true});
 check(mode+' method kinds and contaminated assessment custody are disclosed',await table.getByText('Historical baseline',{exact:true}).count()===2&&await table.getByText('Fitted statistical candidate',{exact:true}).isVisible()&&await content.getByText(/not an untouched confirmatory holdout/).isVisible()&&await content.getByText(/later assessment does not change the selected method/).isVisible());
 await table.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(80);check(mode+' comparison table is keyboard-scrollable where needed',await table.evaluate(n=>n===document.activeElement&&(n.scrollWidth<=n.clientWidth||n.scrollLeft>0)));
 await content.getByText('12 / 24 / all-history sensitivity',{exact:true}).click();check(mode+' history windows preserve descriptive status and all nine comparisons',await content.getByRole('region',{name:'History window sensitivity',exact:true}).getByRole('row').count()===10&&await content.getByText(/no window is selected from the already-visible assessment/).isVisible());
 await content.getByText('Source, version and reproduction',{exact:true}).click();check(mode+' source limitations and reproducible identities are readable',await content.getByText(/History loaded retrospectively; no as-known-at-origin vintages/).isVisible()&&await content.getByText(/Dataset fingerprint: 7887ad425425356be28dc143c2776069309ced0cf05a602a842ee8216b75c280/).isVisible()&&await content.getByRole('link',{name:'Read source qualification and offline reproduction',exact:true}).getAttribute('href')==='https://github.com/ed1017/people-analytics-ai/blob/ff81aa036544dd326de87433ca4636f068ca1c98/docs/aggregate-exit-forecast.md');
 await page.getByLabel('Country',{exact:true}).selectOption('UK');await goal.selectOption('b');check(mode+' page filters and goal selection leave the fixed example unchanged',await content.getByText('605',{exact:true}).isVisible()&&await content.getByText(/selected goal and workforce filters do not narrow/).isVisible()&&await page.getByLabel('Ask People Analytics AI',{exact:true}).inputValue()==='Keep draft B'&&posts===0);
 check(mode+' expanded content remains within responsive page',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await example.screenshot({path:path.join(output,mode+'-expanded.png')});
 await button('Home').click();check(mode+' return to Home keeps draft and excludes forecast controls',await page.getByLabel('Ask Workforce AI',{exact:true}).inputValue()==='Keep draft B'&&await example.count()===0);
 unavailable=true;await button('Workforce — Attrition').click();await example.waitFor();check(mode+' live source failure does not turn fixed example into current evidence',!await content.isVisible());await example.locator('summary').first().click();check(mode+' fixed-date disclaimer remains when live source fails',await content.getByText(/This example does not refresh with live page data/).isVisible());
 await page.reload();await button('Workforce — Attrition').click();await example.waitFor();check(mode+' reload restores default-collapsed presentation',await example.evaluate(n=>!n.open));
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);check(mode+' viewing does not write forecast or planner fields',stored.workspaces.a.fields.sentinel&&Object.keys(stored.workspaces.b.fields).every(key=>key==='chat'));
 check(mode+' no runtime errors, model calls or external requests',errors.length===0&&posts===0&&unexpected===0&&gets.every(p=>!p.includes('forecast')&&!p.includes('exit-demo')));
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
