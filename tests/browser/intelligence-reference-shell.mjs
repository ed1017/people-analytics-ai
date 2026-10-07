// Production-shell integration, with synthetic responses and every API intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3113';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'intelligence-reference-shell-'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[];
const check=(name,result)=>{assert.ok(result,name);checks.push(name);console.log('PASS '+name)};
try {
  for(const [device,width,height] of [['desktop',1366,900],['mobile',390,844],['zoom',683,450]]){
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
    const errors=[],requests=[],posts=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==base)return route.abort();
      if(url.pathname.startsWith('/api/')){
        requests.push(url.pathname);
        if(request.method()!=='GET'){
          posts.push(request.postDataJSON());
          return route.fulfill({json:{answer:'Synthetic reference explanation for this browser check.'}});
        }
        if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:20,fte:18,open_positions:2,snapshot_date:'2026-09-30',voluntary_turnover_ytd_pct:3,labor_cost_usd:500000},trend:[],filter_options:{countries:[{value:'UK',label:'United Kingdom'}],business_units:[],levels:[]}}});
        return route.fulfill({status:503,json:{error:'Synthetic source unavailable.'}});
      }
      return route.continue();
    });
    const button=name=>page.getByRole('button',{name,exact:true});
    const nav=async key=>{
      const trigger=button('Open navigation');if(await trigger.isVisible())await trigger.click();
      const target=page.locator(`[data-nav-destination="${key}"]`);
      if(!await target.isVisible())await target.evaluate(el=>el.closest('section').querySelector('.nav-group-label').click());
      await target.click();
    };
    await page.goto(base);
    await page.getByLabel('Ask Workforce AI',{exact:true}).waitFor();
    await page.waitForFunction(()=>Boolean(document.querySelector('select[aria-label="Country"] option[value="UK"]')));
    if(width<768)await page.locator('.workforce-filter-disclosure').waitFor();
    const filter=page.getByLabel('Country',{exact:true});
    if(!await filter.isVisible())await page.locator('.workforce-filter-disclosure summary').click();
    await filter.selectOption('UK');
    await nav('occupational-references');
    const explorer=page.getByRole('region',{name:'Occupational reference explorer',exact:true});
    await explorer.getByText(/Internal job profiles unavailable/).waitFor();
    check(device+' reference content mounts despite source outage',await explorer.getByRole('heading',{name:'Tasks and preparation',exact:true}).isVisible());
    const referenceStart=requests.length;
    await explorer.getByLabel('Browse public occupations',{exact:true}).selectOption('15-2051.00');
    await explorer.getByRole('heading',{name:'Data Scientists',exact:true}).waitFor();
    check(device+' selection remains independent of workforce filters',await filter.inputValue()==='UK'&&await explorer.getByRole('link',{name:/View official occupation profile/}).getAttribute('href')==='https://www.onetonline.org/link/summary/15-2051.00');
    const ai=page.getByLabel('Ask People Analytics AI',{exact:true});
    if(!await ai.isVisible())await button('Open AI panel').click();
    await ai.fill('Explain the selected occupation reference.');
    await button('Send message').click();
    await page.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reference explanation for this browser check.',{exact:true}).waitFor();
    check(device+' explicit chat uses selected occupation rather than skills aggregates',posts.length===1&&posts[0].page==='occupational-references'&&posts[0].intelligenceContext.occupationalReference.occupation.code==='15-2051.00'&&posts[0].intelligenceContext.occupationalReference.selectedProfile===null);
    check(device+' reference selections do not load employee skills',!requests.slice(referenceStart).includes('/api/skills'));
    await nav('labor-market');
    const market=page.getByRole('region',{name:'Occupation and location comparison',exact:true});
    await market.getByRole('heading',{name:'Occupation pay, employment and outlook',exact:true}).waitFor();
    await market.getByLabel('Market occupation',{exact:true}).selectOption('29-1141');
    await market.getByLabel('Market location',{exact:true}).selectOption('35620');
    check(device+' market content retains its own geography',await filter.inputValue()==='UK'&&await market.getByRole('region',{name:'Location comparison',exact:true}).isVisible()&&await market.getByText('United States only · BLS Employment Projections · Released August 27, 2026',{exact:true}).isVisible());
    await page.locator('summary').filter({hasText:'National labor indicators'}).click();
    await page.getByText('BLS unavailable',{exact:true}).waitFor();
    check(device+' macro failure preserves wage and outlook comparisons',await market.getByRole('region',{name:'Occupation comparison',exact:true}).isVisible()&&await market.getByRole('region',{name:'National outlook comparison',exact:true}).isVisible());
    if(!await ai.isVisible())await button('Open AI panel').click();
    await ai.fill('Explain this market selection and its outlook.');
    await button('Send message').click();
    await page.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reference explanation for this browser check.',{exact:true}).last().waitFor();
    check(device+' explicit market chat keeps exact SOC and area',posts.length===2&&posts[1].page==='labor-market'&&posts[1].intelligenceContext.marketSelection.soc==='29-1141'&&posts[1].intelligenceContext.marketSelection.area==='35620');
    check(device+' shell fits viewport with no runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0);
    await page.screenshot({path:path.join(output,device+'-market-shell.png')});
    await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks:checks.length,results:checks},null,2));
  console.log(JSON.stringify({checks:checks.length,output}));
} finally {await browser.close()}
