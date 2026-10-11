// Production Home shell with every API response intercepted; no live AI/data calls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3100',output='/tmp/compact-output-shell';
await mkdir(output,{recursive:true});
const answer='Company-wide · as of 30 September 2026 · simulated scenario, not a trained forecast.\n\n| Month-end | Scenario headcount |\n| --- | --- |\n| October 2026 | 9,985 |\n| November 2026 | 9,970 |\n| December 2026 | 9,955 |\n| January 2027 | 9,940 |\n| February 2027 | 9,925 |\n| March 2027 | 9,910 |\n\nAll three methods are shown; none is selected as best. Results are scenario-dependent and miss unannounced reversals. Confidence intervals and operational forecasts are unavailable; method differences are not uncertainty bands.\n\nPartial costs only; full cost data unavailable. Review before saving.\n\n**Important caveat:** Company-wide scenario as of 30 September 2026. The inputs are held steady for illustration. Individual departures can vary.';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];let posts=0,external=0;
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base){external++;return route.abort()}if(url.pathname==='/api/chat'){posts++;return route.fulfill({json:{answer,nextStep:'none'}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue()});
 await page.goto(base);await dismissHomeOnboarding(page);await page.getByLabel('Ask Workforce AI',{exact:true}).fill('Explain these six-month scenario values');await page.getByRole('button',{name:'Send overview question',exact:true}).click();
 const content=page.locator('.home-answer').filter({hasText:'Month-end'}).last();await content.waitFor();const table=content.locator('table'),details=content.locator('details'),summary=details.locator('summary');
 const dimensions=await table.evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,row:n.rows[1].getBoundingClientRect().height,font:getComputedStyle(n.rows[1].cells[0]).fontSize}));
 check(mode+' production table retains all six values',await table.locator('tbody tr').count()===6&&(await table.innerText()).includes('9,910'));
 check(mode+' table stays compact and readable in actual chat styles',dimensions.row<=35&&dimensions.font==='14px');
 check(mode+' qualifiers and partial costs stay visible',await content.getByText(/simulated scenario, not a trained forecast/).isVisible()&&await content.getByText(/Partial costs only/).isVisible());
 check(mode+' critical caveat is 14px in actual Home',await content.locator('[data-chat-caveat-qualifier]').evaluate(n=>getComputedStyle(n).fontSize==='14px'));
 check(mode+' details default closed and share label',!await details.evaluate(n=>n.open)&&await summary.innerText()==='Assumptions & limits');
 await summary.focus();await page.keyboard.press('Enter');check(mode+' keyboard expansion retains full explanation',await details.getByText(/miss unannounced reversals/).isVisible()&&await details.getByText(/Individual departures can vary/).isVisible());await page.keyboard.press('Space');
 await table.scrollIntoViewIfNeeded();await content.screenshot({path:output+'/'+mode+'.png'});
 check(mode+' isolated and no page overflow',posts===1&&external===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 results.push({mode,dimensions});await context.close();
}}finally{await browser.close()}
await writeFile(output+'/checks.json',JSON.stringify({checks,results},null,2));console.log(JSON.stringify({checks,output,results}));
