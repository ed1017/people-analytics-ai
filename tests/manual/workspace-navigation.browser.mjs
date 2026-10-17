// Targeted navigation acceptance; no model calls or server writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.NAV_BASE_URL||'http://127.0.0.1:4210',out=process.env.NAV_OUTPUT_DIR;
if(out)await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{for(const width of process.env.NAV_WIDTH?[Number(process.env.NAV_WIDTH)]:[1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[],blocked=[];
 p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);
 p.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(q.method()!=='GET'||u.origin!==origin){blocked.push(u.pathname);return r.abort();}if(process.env.NAV_FIXTURES&&u.pathname.startsWith('/api/')){try{return r.fulfill({contentType:'application/json',body:await fs.readFile(process.env.NAV_FIXTURES+'/history-'+u.pathname.slice(5)+'.json','utf8')});}catch{return r.fulfill({status:503,json:{error:'Unavailable fixture'}});}}return r.continue();});
 await p.goto(origin);await p.getByRole('button',{name:'Start the 3-minute demo',exact:true}).waitFor();
 const main=p.getByRole('navigation',{name:'Main navigation',exact:true}),side=p.getByRole('navigation',{name:'Workforce navigation',exact:true,includeHidden:true});
 async function drawer(){if(width===390&&!await p.locator('#phone-navigation').evaluate(e=>e.matches(':popover-open'))){const open=p.getByRole('button',{name:'Open navigation',exact:true});if(!await open.isVisible())await p.getByRole('button',{name:'Menu',exact:true}).click();await open.click();}}
 async function section(label,current){const buttons=p.locator('.calm-main-nav button[aria-current]');assert.equal(await buttons.count(),1);assert.equal(await buttons.innerText(),label);assert.equal(await buttons.getAttribute('aria-current'),current);}
 async function destination(page,label){console.log(JSON.stringify({width,navigate:page}));await drawer();await side.locator(`[data-nav-destination="${page}"]`).click();await p.waitForFunction(expected=>document.querySelector('#app-page-title')?.textContent===expected,label,{timeout:15000});assert.equal(await side.locator(`[data-nav-destination="${page}"]`).getAttribute('aria-current'),'page');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 async function top(label){if(width===390&&!await main.isVisible())await p.getByRole('button',{name:'Menu',exact:true}).click();await main.getByRole('button',{name:label,exact:true}).click();}
 await section('Overview','page');await top('Evidence');await section('Evidence','page');
 await destination('skills','Skills Intelligence');await section('Evidence','location');
 await drawer();const more=side.getByRole('button',{name:'More evidence and tools',exact:true});assert.equal(await more.getAttribute('aria-expanded'),'false');await more.focus();await p.keyboard.press('Enter');assert.equal(await more.getAttribute('aria-expanded'),'true');
 const evidence=side.getByRole('button',{name:'More evidence',exact:true});await evidence.click();await destination('talent-acquisition','Talent Acquisition');await section('Evidence','location');
 await top('Plan');await section('Plan','page');await destination('action-plans','Action plans');await section('Plan','location');await destination('plan-track','Track');await section('Plan','location');
 await drawer();if(await more.getAttribute('aria-expanded')==='false')await more.click();const tools=side.getByRole('button',{name:'Planning tools',exact:true});if(await tools.getAttribute('aria-expanded')==='false')await tools.click();await destination('decision-brief','Decision brief');await section('Plan','location');
 await drawer();assert.equal(await tools.getAttribute('aria-expanded'),'true');const destinations=await side.locator('[data-nav-destination]').evaluateAll(es=>es.map(e=>e.dataset.navDestination));assert.equal(new Set(destinations).size,destinations.length);assert.ok(destinations.includes('assess-evaluate'));assert.ok(destinations.includes('training-coaching'));
 if(out)await p.screenshot({path:out+`/navigation-${width}.png`});
 if(width===390){await p.keyboard.press('Escape');assert.equal(await p.locator('#phone-navigation').evaluate(e=>e.matches(':popover-open')),false);}
 await top('Overview');await section('Overview','page');await p.getByRole('button',{name:'Start the 3-minute demo',exact:true}).waitFor();assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 console.log(JSON.stringify({origin,width,fixtures:!!process.env.NAV_FIXTURES,destinations:destinations.length,sectionNavigation:true,keyboardDisclosure:true,errors,blocked}));await context.close();
}}finally{await browser.close();}
