// Built Compensation page; synthetic API interception only. No real pay or model calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import artifact from '../../lib/data/synthetic-pay-demo-v1.json' with {type:'json'};
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3231';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)},usd=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value),directory='/tmp/synthetic-pay-demo-screenshots';await fs.mkdir(directory,{recursive:true});
try{for(const [mode,width,height] of [['desktop',1440,900],['mobile',390,844],['zoom',720,450]])for(const palette of ['light','slate-blue']){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let external=0,posts=0;
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(p=>localStorage.setItem('people-analytics-workspace-palette-v1',p),palette);
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort()}if(url.pathname.startsWith('/api/')){requests.push(url.pathname);if(req.method()!=='GET'){posts++;return route.abort()}if(url.pathname==='/api/compensation')return route.fulfill({status:503,json:{error:'Synthetic cost source unavailable'}});return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):{overview:{headcount:100,fte:100,snapshot_date:'2026-09-30'}}})}return route.continue()});
 const nav=async()=>{const open=page.getByRole('button',{name:'Open navigation',exact:true});if(await open.isVisible())await open.click();await page.locator('[data-nav-destination="compensation"]').click();};
 await page.goto(base);await page.getByLabel('Ask Workforce AI',{exact:true}).waitFor();check(mode+palette+' Home has no pay demo or extra pay request',await page.getByRole('region',{name:'Synthetic pay demo',exact:true}).count()===0&&!requests.includes('/api/compensation'));
 await nav();const panel=page.getByRole('region',{name:'Synthetic pay demo',exact:true});await panel.waitFor();await page.getByRole('alert').filter({hasText:'Compensation cost context is unavailable'}).waitFor();
 check(mode+palette+' separate demo remains available when recorded cost source fails',(await panel.innerText()).includes('Separate simulated workforce')&&(await panel.innerText()).includes('Dashboard filters excluded')&&(await panel.innerText()).includes('DEMO ONLY')&&(await panel.innerText()).includes('Annual base pay at 1.0 FTE · USD · 30 Sep 2026'));
 const beforeRequests=requests.length;
 for(const cohort of artifact.cohorts){
  await panel.getByLabel('Demo job',{exact:true}).selectOption(cohort.job);await panel.getByLabel('Demo level',{exact:true}).selectOption(cohort.level);await panel.getByLabel('Demo location',{exact:true}).selectOption(cohort.location);
  if(cohort.status==='suppressed'){check(mode+palette+cohort.id+' full suppression',await panel.locator('dl').count()===0&&await panel.getByRole('figure').count()===0&&(await panel.innerText()).includes('counts withheld')&&!(await panel.innerText()).includes('eligible synthetic records'));continue;}
  const values=await panel.locator('dl > div > dd:first-of-type').allTextContents(),m=cohort.metrics;
  check(mode+palette+cohort.id+' exact qualified aggregate statistics',JSON.stringify(values)===JSON.stringify([m.compaRatioPct.toFixed(1)+'%',usd(m.mean),usd(m.median),usd(m.sd)])&&(await panel.innerText()).includes(`Middle 50%: ${usd(m.q1)}–${usd(m.q3)}`)&&(await panel.innerText()).includes(`${cohort.coverage.eligible} eligible synthetic records`));
  if(cohort.coverage.status==='partial')check(mode+palette+cohort.id+' small excluded count withheld',(await panel.innerText()).includes('Partial inputs; excluded count withheld'));
 }
 check(mode+palette+' selectors make no additional requests',requests.length===beforeRequests&&posts===0);
 await panel.getByLabel('Demo job',{exact:true}).selectOption(artifact.jobs[0].code);await panel.getByLabel('Demo level',{exact:true}).selectOption('L2');await panel.getByLabel('Demo location',{exact:true}).selectOption('austin');const values=await panel.locator('dl').innerText();
 const disclosure=page.locator('.workforce-filter-disclosure');if(await disclosure.count()&&!await page.getByLabel('Country',{exact:true}).isVisible())await disclosure.locator('summary').click();await page.getByLabel('Country',{exact:true}).selectOption('CA');if(await disclosure.count()&&await disclosure.evaluate(node=>node.open))await disclosure.locator('summary').click();check(mode+palette+' workforce scope never changes demo cohort or values',await panel.locator('dl').innerText()===values&&await panel.getByLabel('Demo location',{exact:true}).inputValue()==='austin');
 const details=panel.locator('summary');await details.focus();await page.keyboard.press('Enter');check(mode+palette+' keyboard Details retains qualifications and no equity claim',(await panel.innerText()).includes('not a confidence interval or an equity test')&&(await panel.innerText()).includes('never a BLS median')&&(await panel.innerText()).includes('100 × sum')&&(await panel.innerText()).includes('complementary')&&(await panel.innerText()).includes('not a general privacy guarantee'));
 await details.click();await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/${mode}-${palette}-viewport.png`});await panel.screenshot({path:`${directory}/${mode}-${palette}.png`});
 check(mode+palette+' contained panel and readable controls',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await panel.locator('select').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44)));
 check(mode+palette+' public reference remains separate and AI stays disabled',await page.getByRole('region',{name:'US occupation wage benchmarks'}).isVisible()&&await page.getByLabel('Ask People Analytics AI',{exact:true}).isDisabled()&&posts===0&&external===0&&errors.length===0);
 await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks,screenshots:directory}));
