// Initial load failures must be visible on advanced deep links. All APIs are intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3511';
const output=await fs.mkdtemp('/tmp/capacity-failed-load-');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1366,390])for(const destination of ['position-workforce-design','workforce-response','execution-feasibility']){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);
 const exceptions=[],mutations=[];page.on('pageerror',e=>exceptions.push(e.message));
 await context.route('**/*',route=>{
  const r=route.request(),url=new URL(r.url());if(url.origin!==base)return route.abort();
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(r.method()!=='GET'){mutations.push(url.pathname);return route.abort();}
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:10,fte:8,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}});
  return route.fulfill({status:503,json:{error:url.pathname==='/api/workforce-planning'?'Planning source temporarily unavailable — fixture':'Other fixture source unavailable'}});
 });
 await page.goto(`${base}/?page=${destination}`);
 const error=page.locator('[data-planning-load-error]');await error.waitFor({state:'visible'});
 assert.ok(await page.locator('[data-advanced-scope-note]').isVisible());assert.match(await page.locator('[data-advanced-scope-note]').innerText(),/Dashboard Country, Business Unit and Level filters do not narrow/);
 assert.equal(await error.getAttribute('role'),'alert');assert.match(await error.innerText(),/Planning source temporarily unavailable/);
 assert.equal(await page.locator(`[data-planning-destination="${destination}"]`).count(),0,'no advanced model can render without a stored plan');
 await page.screenshot({path:`${output}/${width}-${destination}.png`,fullPage:true});
 await page.getByRole('button',{name:'Open Planning workspace',exact:true}).click();
 await page.getByRole('region',{name:'Workload capacity planning',exact:true}).waitFor();assert.ok(await error.isVisible(),'failure remains visible with the stored tools collapsed');
 assert.deepEqual(exceptions,[]);assert.deepEqual(mutations,[]);evidence.push({width,destination,visibleError:true,manualPlanningAccessible:true,exceptions,mutations});await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
