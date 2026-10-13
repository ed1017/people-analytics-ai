// Actual Next route/navigation; all app APIs intercepted, never live DB/AI calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3478';
const output=await fs.mkdtemp('/tmp/swp-headcount-route-');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try {for(const width of [1366,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],ai=[],api=[],external=[];
  await context.route('**/*',route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin!==base){external.push(u.origin);return route.abort();}
    if(u.pathname.startsWith('/api/')){
      api.push(u.pathname);
      if(r.method()!=='GET'||/chat|conversation|openai|intake/.test(u.pathname))ai.push(u.pathname);
      if(u.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:10000,fte:10000,open_positions:0,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}});
      return route.fulfill({status:503,json:{error:'Offline navigation fixture: source unavailable.'}});
    }
    return route.continue();
  });
  page.on('pageerror',e=>errors.push(e.message));
  const heading=()=>page.getByRole('heading',{name:'Compare company headcount',exact:true}).waitFor();
  const scenario=()=>page.locator('#app-page-title').filter({hasText:'Scenario Modeling'}).waitFor();
  const hires=()=>page.getByLabel('Monthly hires',{exact:true}),departures=()=>page.getByLabel('Monthly departures',{exact:true});
  const compare=()=>page.getByRole('button',{name:'Compare',exact:true}).click();
  await page.goto(base+'/?page=planning-overview');
  await page.locator('#app-page-title').filter({hasText:'Planning Overview'}).waitFor();
  const navigation=page.getByRole('button',{name:'Open navigation',exact:true});
  if(await navigation.isVisible())await navigation.click();
  const destination=page.locator('[data-nav-destination="scenario-modeling"]');
  const group=await destination.evaluate(node=>node.parentElement.id);
  const toggle=page.locator(`button[aria-controls="${group}"]`);
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  await destination.click();await scenario();
  await page.getByRole('link',{name:'Compare headcount — synthetic demo baseline',exact:true}).click();await heading();
  assert.equal(new URL(page.url()).pathname,'/planning/headcount-demo');
  assert.equal(await hires().inputValue(),'');
  await hires().fill('100');await departures().fill('60');await compare();
  assert.deepEqual(await page.locator('tbody tr').last().locator('td').allTextContents(),['10,300','10,240','-60']);
  const callsBefore=api.length;
  await page.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await hires().inputValue(),'');assert.equal(await departures().inputValue(),'');
  assert.ok((await page.locator('tbody tr td:nth-of-type(2)').allTextContents()).every(t=>t==='—'));
  await hires().fill('0');await departures().fill('0');await compare();assert.equal(api.length,callsBefore);
  await page.reload();await heading();assert.equal(await hires().inputValue(),'');assert.equal(await departures().inputValue(),'');
  await page.goBack();await scenario();
  await page.goForward();await heading();
  await hires().fill('100');await departures().fill('60');await compare();
  assert.equal(await page.getByText('Synthetic demo baseline. Conditional retrospective evaluation; not validated for operational planning.',{exact:true}).count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/${width}-actual-route.png`,fullPage:true});
  await page.getByRole('link',{name:'Back to Scenario Modeling',exact:true}).click();await scenario();
  assert.equal(new URL(page.url()).searchParams.get('page'),'scenario-modeling');
  await page.goBack();await heading();
  await page.goto(base+'/planning/headcount-demo');await heading();assert.equal(await hires().inputValue(),'');
  assert.equal(await page.getByRole('combobox').count(),0);assert.ok(await page.getByText(/Costs unavailable/).isVisible());
  assert.deepEqual(ai,[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  evidence.push({width,route:'/planning/headcount-demo',entry:'Planning Overview → sidebar Scenario Modeling → demo link',checks:'sidebar navigation, entry, calculation, reset, reload, back, forward, return link, direct route, no overflow',aiRequests:ai,externalRequests:external,mockedSourceRequests:api});
  await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/checks.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
