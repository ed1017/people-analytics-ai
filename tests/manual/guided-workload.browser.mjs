// Deterministic acceptance: blocks AI, writes and external requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.WORKLOAD_BASE_URL||'http://127.0.0.1:4198';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
try { for(const width of [1440,390]) {
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),blocked=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==origin||r.method()!=='GET'){blocked.push(u.pathname);return route.abort();}if(!process.env.WORKLOAD_FIXTURES||!u.pathname.startsWith('/api/'))return route.continue();try{return route.fulfill({contentType:'application/json',body:await fs.readFile(process.env.WORKLOAD_FIXTURES+'/history-'+u.pathname.slice(5)+'.json','utf8')});}catch{return route.fulfill({status:503,json:{error:'Source unavailable in isolated fixture'}});}});
 await page.goto(origin,{timeout:90000});await page.getByRole('button',{name:'Start the 3-minute demo',exact:true}).click();
 const summary=page.getByRole('region',{name:'Modeled workload and capacity',exact:true});await summary.waitFor();assert.match(await summary.innerText(),/15,360/);
 await page.getByRole('spinbutton',{name:'Service units per month',exact:true}).fill('1120');
 await page.getByRole('spinbutton',{name:'Incremental cash ceiling',exact:true}).fill('500000');
 await page.getByRole('button',{name:'Review input changes',exact:true}).click();await page.getByRole('button',{name:'Use changes in this draft',exact:true}).click();
 assert.match(await summary.innerText(),/4 additional whole roles/);
 await page.getByRole('button',{name:'Compare these demo assumptions',exact:true}).click();await page.getByRole('radio').first().waitFor();
 const options=await page.getByRole('radio').count();assert.ok(options>=2);
 for(const radio of await page.getByRole('radio').all())if(await radio.isEnabled()){await radio.check();break;}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
 if(process.env.WORKLOAD_OUTPUT_DIR)await page.screenshot({path:process.env.WORKLOAD_OUTPUT_DIR+'/workload-compare-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:'Review selected Action Plan',exact:true}).click();await page.getByRole('button',{name:'Save reviewed plan and goal',exact:true}).click();await page.getByRole('heading',{name:'4. Reopen and track',exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'Service growth: a guided decision',exact:true}).waitFor();assert.equal(await page.getByRole('spinbutton',{name:'Service units per month',exact:true}).inputValue(),'1120');
 await page.getByRole('button',{name:'Review target and tracking',exact:true}).click();await page.getByRole('heading',{name:'Track your plan',exact:true}).waitFor();assert.match(await page.getByRole('region',{name:'Track',exact:true}).innerText(),/4 roles/);
 if(process.env.WORKLOAD_OUTPUT_DIR)await page.screenshot({path:process.env.WORKLOAD_OUTPUT_DIR+'/workload-track-'+width+'.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);console.log(JSON.stringify({width,options,reopenedUnits:1120,targetRoles:4,errors,blocked}));await context.close();
}} finally {await browser.close();}
