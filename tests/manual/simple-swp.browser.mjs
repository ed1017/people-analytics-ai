// Deterministic acceptance: blocks AI, writes and external requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.WORKLOAD_BASE_URL||'http://127.0.0.1:4198';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
try { for(const width of [1440,390]) {
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}}),page=await context.newPage(),blocked=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==origin||r.method()!=='GET'){blocked.push(u.pathname);return route.abort();}if(!process.env.WORKLOAD_FIXTURES||!u.pathname.startsWith('/api/'))return route.continue();try{return route.fulfill({contentType:'application/json',body:await fs.readFile(process.env.WORKLOAD_FIXTURES+'/history-'+u.pathname.slice(5)+'.json','utf8')});}catch{return route.fulfill({status:503,json:{error:'Source unavailable in isolated fixture'}});}});
 await page.goto(origin,{timeout:90000});
 const intro=page.getByRole('button',{name:'Start the 3-minute demo',exact:true});await intro.waitFor();
 if(width===390){assert.ok((await intro.boundingBox()).y<400,'ordinary Overview CTA near top');assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).isVisible(),true);}
 assert.equal(await page.locator('li').filter({has:page.getByText('Labor cost',{exact:true})}).count(),0,'undated cost is not a headline KPI');
 if(process.env.WORKLOAD_OUTPUT_DIR)await page.screenshot({path:process.env.WORKLOAD_OUTPUT_DIR+'/overview-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:'Start the 3-minute demo',exact:true}).click();
 const heading=page.getByRole('heading',{name:'How can we cover the capacity gap?',exact:true});await heading.waitFor();
 const compare=page.getByRole('button',{name:'Compare staffing options',exact:true});await compare.waitFor();
 if(process.env.WORKLOAD_OUTPUT_DIR)await page.screenshot({path:process.env.WORKLOAD_OUTPUT_DIR+'/initial-'+width+'.png',fullPage:true});
 if(width===390){
  assert.ok((await heading.boundingBox()).y<250,'demo begins near compact header');
  assert.equal(await page.getByRole('button',{name:'Open navigation',exact:true}).isVisible(),false);
  const menu=page.getByRole('button',{name:'Menu',exact:true});await menu.click();
  assert.equal(await page.getByRole('button',{name:'Open navigation',exact:true}).isVisible(),true);
  assert.equal(await page.getByText('Workspace controls and saved plans',{exact:true}).isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await menu.evaluate(e=>e===document.activeElement),true);
 }
 assert.equal(await page.locator('.demo-stepper [aria-current="step"]').innerText(),'1 Understand the gap');
 const initialBox=await compare.boundingBox();assert.ok(initialBox.y+initialBox.height<=(width===390?844:900),'primary action in first viewport');
 assert.match(await page.getByLabel('Capacity gap',{exact:true}).innerText(),/8 FTE[\s\S]*3 FTE[\s\S]*5 FTE/);
 assert.equal(await page.getByRole('textbox',{name:'Monthly service requests',exact:true}).isVisible(),false);
 if(process.env.WORKLOAD_OUTPUT_DIR)await page.screenshot({path:process.env.WORKLOAD_OUTPUT_DIR+'/gap-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:'Ask about this',exact:true}).click();
 const composer=page.locator('textarea:visible').first();await composer.fill('Keep this unsent draft');
 await page.getByRole('button',{name:'Close chat',exact:true}).click();await page.getByRole('button',{name:'Ask about this',exact:true}).click();assert.equal(await composer.inputValue(),'Keep this unsent draft');await page.getByRole('button',{name:'Close chat',exact:true}).click();
 await compare.click();await page.getByRole('radio').first().waitFor();assert.equal(await page.locator('.demo-stepper [aria-current="step"]').innerText(),'2 Compare options');
 await page.getByText('Adjust assumptions',{exact:true}).click();
 const volume=page.getByRole('textbox',{name:'Monthly service requests',exact:true}),budget=page.getByRole('textbox',{name:'Budget for this plan',exact:true});
 await budget.fill('0');await volume.fill('1120');
 assert.equal(await page.getByRole('button',{name:'Review selected Action Plan',exact:true}).isEnabled(),false);
 await budget.fill('500000');await page.getByRole('radio').first().waitFor();
 await page.waitForFunction(()=>!document.body.innerText.includes('Updating your choices.'));
 assert.match(await page.getByLabel('Capacity gap',{exact:true}).innerText(),/Gap 4 FTE/);
 if(width===390){
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Evidence',exact:true}).click();
  await page.getByRole('button',{name:'Open Workforce AI',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).isVisible(),false,'ordinary navigation stays expanded away from demo');
  await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Overview',exact:true}).click();await heading.waitFor();
  assert.equal(await volume.inputValue(),'1120','navigation preserves assumptions');assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'false');
 }
 await page.getByText('Edit detailed assumptions',{exact:true}).click();
 await page.getByRole('spinbutton',{name:'Total training effort (staff hours)',exact:true}).fill('90');
 await page.getByRole('button',{name:'Review input changes',exact:true}).click();await page.getByRole('button',{name:'Use changes in this draft',exact:true}).click();
 await page.getByRole('radio').first().waitFor();await page.waitForFunction(()=>!document.body.innerText.includes('Updating your choices.'));
 await page.getByText('Adjust assumptions',{exact:true}).click();
 const options=await page.getByRole('radio').count();assert.ok(options>=2);
 for(const radio of await page.getByRole('radio').all())if(await radio.isEnabled()){await radio.check();break;}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
 if(process.env.WORKLOAD_OUTPUT_DIR)await page.screenshot({path:process.env.WORKLOAD_OUTPUT_DIR+'/workload-compare-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:'Review selected Action Plan',exact:true}).click();assert.equal(await page.locator('.demo-stepper [aria-current="step"]').innerText(),'3 Save and review');const selectedSummary=await page.getByRole('region',{name:'Review and save workforce plan',exact:true}).getByRole('region',{name:'Selected workforce choice',exact:true}).innerText();assert.match(selectedSummary,/Incremental cash:[\s\S]*Conditional readiness:[\s\S]*Uncovered work/);await page.getByRole('button',{name:'Save reviewed plan and goal',exact:true}).click();await page.getByRole('heading',{name:'Reopen and track',exact:true}).waitFor();
 await page.reload();await heading.waitFor();await page.getByText('Adjust assumptions',{exact:true}).click();assert.equal(await volume.inputValue(),'1120');
 await page.getByRole('button',{name:'Review target and tracking',exact:true}).click();await page.getByRole('heading',{name:'Track your plan',exact:true}).waitFor();assert.match(await page.getByRole('region',{name:'Track',exact:true}).innerText(),/4 roles/);assert.equal(await page.getByRole('region',{name:'Selected workforce choice',exact:true}).innerText(),selectedSummary);
 if(process.env.WORKLOAD_OUTPUT_DIR)await page.screenshot({path:process.env.WORKLOAD_OUTPUT_DIR+'/workload-track-'+width+'.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);console.log(JSON.stringify({width,options,reopenedUnits:1120,targetRoles:4,errors,blocked}));await context.close();
}} finally {await browser.close();}
