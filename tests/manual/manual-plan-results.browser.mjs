/** Isolated fictional browser storage. No remote writes, model calls or real employee data. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {manualResultFixture} from '../fixtures/manual-plan-results.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.RESULTS_BASE_URL||'http://127.0.0.1:3417',out=process.env.RESULTS_OUTPUT_DIR;
if(out)await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
const today=new Date().toISOString().slice(0,10),evidence=[];
try{
 for(const width of (process.env.RESULTS_FIXTURE_ONLY?[]:[1440,390])){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],blocked=[];
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(q.method()!=='GET'||u.origin!==new URL(base).origin||u.pathname.startsWith('/api/bls')){blocked.push({method:q.method(),path:u.pathname});return r.abort();}return r.continue();});
  await page.goto(base);await page.getByRole('button',{name:'Start the 3-minute demo',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.simple-demo-option')||[...document.querySelectorAll('button')].some(b=>b.textContent==='Compare staffing options'));
  const compare=page.getByRole('button',{name:'Compare staffing options',exact:true});if(await compare.isVisible())await compare.click();
  await page.locator('.simple-demo-options .simple-demo-option').first().getByRole('radio').check();
  await page.getByRole('button',{name:'Review selected Action Plan',exact:true}).click();await page.getByRole('button',{name:'Save reviewed plan and goal',exact:true}).click();
  await page.getByRole('button',{name:'Review target and tracking',exact:true}).click();
  const results=page.getByRole('region',{name:'Recorded plan results',exact:true});await results.waitFor();
  const legacy=page.locator('details').filter({has:page.getByText('Other goal measurements',{exact:true})});if(await legacy.count()){assert.equal(await legacy.getAttribute('open'),null);await legacy.locator('summary').first().click();assert.match(await legacy.innerText(),/do not include the manually reported plan results above/);await legacy.locator('summary').first().click();}
  assert.match(await results.innerText(),/practice reports for this scenario, not company outcomes/);
  assert.match(await results.innerText(),/No result recorded/);
  await results.getByRole('button',{name:'Record a result',exact:true}).click();
  await results.getByRole('textbox',{name:'Additional qualified, allocated roles (roles)',exact:true}).fill('0');
  await results.getByLabel('Measured as of',{exact:true}).fill(today);
  await results.getByRole('textbox',{name:'Source note',exact:true}).fill('Fictional aggregate staffing report for UI verification; no individual records.');
  await results.getByRole('checkbox',{name:/I confirm this report/}).check();
  if(out)await results.screenshot({path:`${out}/form-${width}.png`});
  await results.getByRole('button',{name:'Review result',exact:true}).click();await results.getByRole('button',{name:'Save result',exact:true}).click();
  await results.getByRole('status').waitFor();assert.match(await results.innerText(),/Reported result: 0 roles/);assert.match(await results.innerText(),/Interim measurement/);
  if(out){await results.screenshot({path:`${out}/saved-${width}.png`});await page.screenshot({path:`${out}/page-${width}.png`});}
  await results.getByText('Result history (1 entries for this goal)',{exact:true}).click();
  await results.getByRole('button',{name:`Correct entry from ${today}`,exact:true}).click();
  await results.getByRole('checkbox',{name:'Result is unknown',exact:true}).check();
  await results.getByRole('textbox',{name:'Source note and reason for correction',exact:true}).fill('Correction: the fictional aggregate report was incomplete; result is unknown.');
  await results.getByRole('checkbox',{name:/I confirm this report/}).check();
  await results.getByRole('button',{name:'Review result',exact:true}).click();await results.getByRole('button',{name:'Save correction',exact:true}).click();
  await results.getByRole('status').waitFor();assert.match(await results.innerText(),/Reported result: Unknown/);assert.match(await results.innerText(),/Superseded entry/);
  await page.reload();
  // App navigation may reopen Overview after refresh; use its saved-plan entry.
  if(!await results.isVisible())await page.getByRole('button',{name:'Review target and tracking',exact:true}).click();
  await results.waitFor();assert.match(await results.innerText(),/Reported result: Unknown/);assert.match(await results.innerText(),/Result history \(2 entries/);
  await results.getByText('Result history (2 entries for this goal)',{exact:true}).click();
  assert.match(await results.innerText(),/Reported result: 0 roles/);
  await results.getByRole('button',{name:`Correct entry from ${today}`,exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('type')),'date','unknown corrections focus the usable date field');
  await results.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
  if(out)await results.screenshot({path:`${out}/history-${width}.png`});
  await page.getByRole('button',{name:'Return to Overview',exact:true}).click();await page.getByRole('button',{name:'Open saved plans',exact:true}).click();await results.waitFor();assert.match(await results.innerText(),/Reported result: Unknown/);
  assert.deepEqual(errors,[]);assert.equal(blocked.filter(q=>q.method!=='GET').length,0);evidence.push({width,guidedSave:true,zero:true,unknownCorrection:true,reload:true,actionPlans:true,pageErrors:errors,blocked});await context.close();
 }
 // Exact-date headcount arithmetic and plan isolation use a clearly fictional,
 // browser-local fixture, never an API dataset or uploaded employee records.
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());return q.method()!=='GET'||u.origin!==new URL(base).origin||u.pathname.startsWith('/api/bls')?r.abort():r.continue();});
  const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('nav[aria-label="Main navigation"]')||[...document.querySelectorAll('button')].some(b=>b.textContent==='Start the 3-minute demo'));
  const datasetToken=await page.evaluate(()=>localStorage.getItem('insights-to-action.dataset-workspace.v1')||'legacy-v1:0');
  const fixture=await manualResultFixture({headcount:true,value:0,targetDate:today,datasetToken});
  await page.evaluate(values=>{for(const [k,v]of values)localStorage.setItem(k,v);},[...fixture.values]);await page.reload();

  if(width<768)await page.getByRole('button',{name:'Browse pages',exact:true}).click();
  await page.getByRole('button',{name:'Track',exact:true}).click();
  const results=page.getByRole('region',{name:'Recorded plan results',exact:true});await results.getByRole('combobox',{name:/Saved plan/}).selectOption('plan-one');
  await results.getByRole('button',{name:'Record a result',exact:true}).click();await results.getByRole('textbox',{name:'Active employees (people)',exact:true}).fill('0');
  await results.getByRole('textbox',{name:'Source note',exact:true}).fill('Fictional dated aggregate count; zero employees in this test population.');await results.getByRole('checkbox',{name:/I confirm this report/}).check();
  await results.getByRole('button',{name:'Review result',exact:true}).click();await results.getByRole('button',{name:'Save result',exact:true}).click();await results.getByRole('status').waitFor();
  assert.match(await results.innerText(),/Difference from saved target: 0 people/);
  await results.getByRole('combobox',{name:/Saved plan/}).selectOption('plan-two');assert.match(await results.innerText(),/No result recorded for this exact saved target/);
  await results.getByRole('combobox',{name:/Saved plan/}).selectOption('plan-one');assert.match(await results.innerText(),/Reported result: 0 people/);
  if(out)await results.screenshot({path:`${out}/headcount-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  evidence.push({width,fictionalHeadcountFixture:true,zeroTarget:true,exactDateDifference:true,crossPlanIsolation:true});await context.close();
 }
 console.log(JSON.stringify({base,evidence}));
}finally{await browser.close();}
