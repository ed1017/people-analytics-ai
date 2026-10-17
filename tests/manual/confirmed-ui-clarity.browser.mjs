import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.OUTCOME_BASE_URL||'http://127.0.0.1:4213',out=process.env.OUTCOME_OUTPUT_DIR;
if(out)await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{for(const width of [1440,390]){
 const context=await b.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[],blocked=[];
 p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(q.method()!=='GET'||u.origin!==origin){blocked.push(u.pathname);return r.abort();}if(process.env.OUTCOME_FIXTURES&&u.pathname.startsWith('/api/')){try{return r.fulfill({contentType:'application/json',body:await fs.readFile(process.env.OUTCOME_FIXTURES+'/history-'+u.pathname.slice(5)+'.json','utf8')});}catch{return r.fulfill({status:503,json:{error:'Unavailable fixture'}});}}return r.continue();});
 await p.goto(origin);await p.getByRole('button',{name:'Start the 3-minute demo',exact:true}).waitFor();
 if(width===390)await p.getByRole('button',{name:'Workspace',exact:true}).click();
 const about=p.locator('details').filter({has:p.locator('summary').filter({hasText:/^About this project$/})});
 await about.locator('summary').click();assert.equal(await about.getAttribute('open'),'');
 await p.getByRole('heading',{name:'Plan the workforce your business needs',exact:true}).click();assert.equal(await about.getAttribute('open'),null);
 await about.locator('summary').click();await p.keyboard.press('Escape');assert.equal(await about.getAttribute('open'),null);assert.equal(await about.locator('summary').evaluate(e=>e===document.activeElement),true);
 await about.locator('summary').click();
 if(width===390)await p.getByRole('button',{name:'Browse pages',exact:true}).click();
 const fow=p.locator('[data-nav-destination="future-of-work"]');await fow.focus();await p.keyboard.press('Enter');assert.equal(await about.getAttribute('open'),null);
 await p.getByText('Future of Work · Illustrative task example',{exact:true}).waitFor();await p.getByRole('button',{name:'Try fictional task example',exact:true}).click();await p.getByLabel('Task time results',{exact:true}).waitFor();assert.match(await p.getByLabel('Task time results',{exact:true}).innerText(),/128/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(out)await p.screenshot({path:out+`/future-work-${width}.png`});
 await p.goto(origin+'/?page=attrition');await p.getByRole('textbox',{name:'Ask Workforce AI',exact:true}).last().waitFor();assert.equal(await p.getByRole('textbox',{name:'Ask People Analytics AI',exact:true}).count(),0);
 await p.goto(origin);await p.getByRole('button',{name:'Start the 3-minute demo',exact:true}).click();await p.getByRole('button',{name:'Compare staffing options',exact:true}).click();
 const review=p.getByRole('button',{name:'Review selected Action Plan',exact:true});await review.waitFor();assert.equal(await review.isDisabled(),true);assert.equal(await p.locator('.simple-demo-options input:checked').count(),0);await p.getByText('Select one available staffing option above to review its Action Plan.',{exact:true}).waitFor();
 assert.match(await p.locator('.simple-demo').innerText(),/later capacity does not erase earlier shortfalls/);assert.match(await p.locator('.simple-demo-options').innerText(),/1,280 hours/);
 await p.locator('.simple-demo-options input').first().check();assert.equal(await review.isEnabled(),true);if(out){await review.scrollIntoViewIfNeeded();await p.screenshot({path:out+`/comparison-${width}.png`});}await review.click();await p.getByRole('region',{name:'Review and save workforce plan',exact:true}).waitFor();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);console.log(JSON.stringify({origin,width,fixtures:!!process.env.OUTCOME_FIXTURES,aboutDismissal:true,futureWork:true,aiLabel:true,explicitChoice:true,errors,blocked}));await context.close();
}}finally{await b.close();}
