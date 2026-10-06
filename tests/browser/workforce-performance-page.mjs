// Built application with intercepted local fixtures only. Never calls database/model services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {performanceFixture} from '../fixtures/workforce-performance-release.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3240';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const directory='/tmp/ratings-recovery-screenshots';await fs.mkdir(directory,{recursive:true});
let checks=0;const check=(label,ok)=>{assert.ok(ok,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width,height] of [['desktop',1440,900],['mobile',375,812],['zoom',720,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();let external=0,posts=0,modeValue='available',releaseOld;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname.startsWith('/api/')){if(request.method()!=='GET'){posts++;return route.abort()}
   if(url.pathname==='/api/dashboard'){
    const data=scopeDashboard(url.search),country=url.searchParams.get('country')??'all',org=url.searchParams.get('org')??'all',level=url.searchParams.get('level')??'all';
    data.overview.headcount=org==='all'?10000:1000;
    const value=performanceFixture(org);value.filters={country,org,level}; // unsupported matching scopes must still fail closed
    if(country==='CA')await new Promise(resolve=>{releaseOld=resolve});
    return route.fulfill({json:{...data,performance_rating:modeValue==='available'?value:{...value,status:'inactive'}}}).catch(()=>{});
   }
   if(url.pathname==='/api/career-growth-mobility')return route.fulfill({status:503,json:{error:'Recorded movement history unavailable.'}});
   return route.fulfill({json:{overview:{headcount:10000,fte:10000,snapshot_date:'2026-09-30'}}});
  }return route.continue();
 });
 const field=page.getByRole('region',{name:'Workforce performance ratings',exact:true});
 await page.goto(base);await page.getByLabel('Ask Workforce AI',{exact:true}).waitFor();
 const nav=page.getByRole('button',{name:'Open navigation',exact:true});if(await nav.isVisible())await nav.click();await page.locator('[data-nav-destination="career-growth-mobility"]').click();await field.waitFor();
 const bars=field.getByRole('list',{name:'Ratings distribution bar chart'});
 await bars.waitFor();check(mode+' frozen company values',(await bars.innerText()).includes('5,200')&&await bars.getByRole('listitem').count()===5);
 check(mode+' three measures, no separate controls',await page.getByRole('region',{name:'Workforce career measures'}).locator('select,input,button').count()===0&&await page.getByRole('region',{name:'Promotion rate',exact:true}).getByText(/Unavailable/).count()===1&&await page.getByRole('region',{name:'Median time in prior level',exact:true}).getByText(/Unavailable/).count()===1);
 await fs.writeFile(`${directory}/${mode}-text.txt`,await page.locator('main').innerText());
 check(mode+' visible labels say demo data with truthful limits',await page.getByText(/Demo data · Original workforce/).count()===1&&!((await page.locator('main').innerText()).toLowerCase().includes('synthetic')));
 const disclosure=page.locator('.workforce-filter-disclosure');const openFilters=async()=>{if(await disclosure.count()&&!await page.getByLabel('Country',{exact:true}).isVisible())await disclosure.locator('summary').click()};
 await openFilters();await page.getByLabel('Business Unit',{exact:true}).selectOption('BU-DATAAI');await field.getByText(/1,000 rated/).waitFor();check(mode+' existing BU filter selects matching aggregate',(await bars.innerText()).includes('520'));
 await page.getByLabel('Country',{exact:true}).selectOption('US');await field.getByText(/Unavailable for this selection/).waitFor();check(mode+' unsupported country withholds even matching payload',await bars.count()===0);
 await page.getByLabel('Country',{exact:true}).selectOption('all');await bars.waitFor();await page.getByLabel('Level',{exact:true}).selectOption('IC2');await field.getByText(/Unavailable for this selection/).waitFor();check(mode+' level withholds all numbers',await bars.count()===0);
 await page.getByLabel('Level',{exact:true}).selectOption('all');await bars.waitFor();await page.getByLabel('Country',{exact:true}).selectOption('CA');await field.getByText(/Unavailable for this selection/).waitFor();check(mode+' pending scope immediately removes old values',await bars.count()===0);
 await page.getByLabel('Country',{exact:true}).selectOption('all');await bars.waitFor();releaseOld();await page.waitForTimeout(100);check(mode+' late response cannot overwrite restored BU',await field.getByText(/1,000 rated/).count()===1);
 if(await disclosure.count()&&await disclosure.evaluate(n=>n.open))await disclosure.locator('summary').click();
 await page.screenshot({path:`${directory}/${mode}-available.png`,fullPage:true});
 modeValue='inactive';await openFilters();await page.getByLabel('Business Unit',{exact:true}).selectOption('all');await field.getByText(/No active, validated aggregate/).waitFor();check(mode+' inactive is unavailable, not zero or fixture fallback',await bars.count()===0);
 if(await disclosure.count()&&await disclosure.evaluate(n=>n.open))await disclosure.locator('summary').click();
 await page.screenshot({path:`${directory}/${mode}-inactive.png`,fullPage:true});
 check(mode+' responsive and no remote/model calls',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&external===0&&posts===0&&errors.length===0);await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,screenshots:directory}));
