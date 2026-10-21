import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:3098',result={checks:[],errors:[],external:[]};
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
let last;
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();last=page;
  page.on('pageerror',e=>result.errors.push(e.message));
  await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){result.external.push(r.request().url());return r.abort();}return r.continue();});
  await page.goto(origin);
  const home=page.getByRole('region',{name:'Synthetic company Home'});
  await home.getByText('lantern-invented', {exact:false}).first().waitFor();
  await home.getByRole('button',{name:'How has our headcount changed?',exact:true}).click();
  const transcript=home.getByLabel('Home chat workspace'),visual=home.getByLabel('Current answer visuals');
  await transcript.getByText(/\+2 people/).waitFor();
  assert.match(await visual.innerText(),/7\.75/);
  assert.doesNotMatch(await home.innerText(),/9,037|121 monthly/);
  const left=await transcript.boundingBox(),right=await visual.boundingBox();
  if(width>700)assert.ok(right.x>left.x);else assert.ok(right.y>left.y);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'company-home-'+width+'.png',fullPage:true});
  await home.getByRole('button',{name:'What was turnover last year?',exact:true}).click();
  await visual.getByText('No supported visual for this question. No earlier chart is reused.').waitFor();
  assert.equal(await visual.locator('svg').count(),0);
  await home.getByRole('button',{name:'What is our FTE?',exact:true}).click();
  await visual.getByText('7.75 FTE',{exact:true}).waitFor();
  await context.route('**/api/company-dashboard',r=>r.fulfill({status:503,body:'unavailable'}));
  await home.getByRole('button',{name:'Reload company source'}).click();
  await visual.getByRole('alert').waitFor();
  assert.equal(await transcript.innerText(),'');assert.equal(await visual.locator('svg').count(),0);
  assert.ok(await home.getByRole('button',{name:'What is our FTE?',exact:true}).isDisabled());
  result.checks.push({width,realApi:true,headcount:9,fte:7.75,change:2,split:true,unsupportedClears:true,reloadFailureClears:true,noOverflow:true});
  await context.close();
 }
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);
}catch(e){result.failure=String(e.stack??e);if(last&&!last.isClosed())result.body=await last.locator('body').innerText();process.exitCode=1;}
finally{await browser.close();await fs.writeFile('COMPANY-HOME-BROWSER.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
