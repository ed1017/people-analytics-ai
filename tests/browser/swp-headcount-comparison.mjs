// Local component fixture only; no app route, external network, database or AI.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp('/tmp/swp-comparison-browser-');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/swp-headcount-comparison.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const script=await fs.readFile(output+'/fixture.js','utf8');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try {for(const width of [1366,390,320]) {
  const context=await browser.newContext({viewport:{width,height:1000}}), page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin==='http://fixture.local'&&url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script src="/fixture.js"></script>'});
    if(url.origin==='http://fixture.local'&&url.pathname==='/fixture.js')return route.fulfill({contentType:'text/javascript',body:script});
    errors.push('Unexpected request '+url);return route.abort();
  });
  await page.goto('http://fixture.local');
  await page.getByRole('heading',{name:'Compare company headcount'}).waitFor();
  assert.equal(await page.getByText('Synthetic demo baseline. Conditional retrospective evaluation; not validated for operational planning.',{exact:true}).count(),1);
  const hires=page.getByLabel('Monthly hires',{exact:true}),departures=page.getByLabel('Monthly departures',{exact:true}),compare=page.getByRole('button',{name:'Compare',exact:true});
  assert.equal(await hires.inputValue(),'');assert.equal(await departures.inputValue(),'');
  const baseline=await page.locator('tbody tr td:first-of-type').allTextContents();
  assert.deepEqual(baseline,['10,050','10,100','10,150','10,200','10,250','10,300']);
  await compare.click();assert.match(await page.getByRole('alert').innerText(),/Enter both/);
  await hires.fill('100');await compare.click();assert.match(await page.getByRole('alert').innerText(),/Enter both/);
  await departures.fill('60');await compare.click();assert.match(await page.getByRole('status').innerText(),/100 hires and 60 departures/);
  assert.deepEqual(await page.locator('tbody tr').last().locator('td').allTextContents(),['10,300','10,240','-60']);
  await departures.fill('0');assert.ok((await page.locator('tbody tr td:nth-of-type(2)').allTextContents()).every(t=>t==='—'));
  await compare.click();assert.deepEqual(await page.locator('tbody tr').last().locator('td').allTextContents(),['10,300','10,600','+300']);
  await hires.fill('0');await compare.click();assert.deepEqual(await page.locator('tbody tr').last().locator('td').allTextContents(),['10,300','10,000','-300']);
  for(const invalid of ['-1','1.5','abc']) {await hires.fill(invalid);await compare.click();assert.ok(await page.getByRole('alert').isVisible());}
  await hires.fill('0');await departures.fill('10000');await compare.click();assert.match(await page.getByRole('alert').innerText(),/infeasible/);
  await hires.fill('100');await departures.fill('60');await departures.press('Enter');assert.match(await page.getByRole('status').innerText(),/100 hires and 60 departures/);
  assert.deepEqual(await page.locator('tbody tr td:first-of-type').allTextContents(),baseline);
  assert.ok(await page.getByText(/Costs unavailable/).isVisible());assert.equal(await page.getByRole('combobox').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const rate=page.getByLabel('Monthly USD cost per employee (optional)',{exact:true});
  assert.equal(await rate.inputValue(),'');assert.equal(await page.getByRole('region',{name:'Assumed monthly cost run-rates',exact:true}).count(),0);
  await rate.fill('12.34');await compare.click();
  const cost=()=>page.getByRole('region',{name:'Assumed monthly cost run-rates',exact:true});
  assert.deepEqual(await cost().locator('tbody tr').last().locator('td').allTextContents(),['127,102.00','126,361.60','-740.40']);
  assert.ok(await cost().getByText(/not sourced actual cost or statistically predicted spend/).isVisible());
  assert.ok(await cost().getByRole('heading',{name:'Assumed monthly cost run-rate · USD/month',exact:true}).isVisible());
  if(width<520){const scroll=cost().getByRole('region',{name:'Monthly cost table',exact:true});await scroll.evaluate(n=>n.scrollLeft=n.scrollWidth);assert.ok(await scroll.evaluate(n=>n.scrollLeft>0));await scroll.evaluate(n=>n.scrollLeft=0);}
  await rate.fill('0');assert.equal(await cost().count(),0);await compare.click();assert.ok((await cost().locator('tbody td').allTextContents()).every(t=>t==='0.00'));
  for(const invalid of ['-1','abc','1.001','1e3','Infinity','999999999999999','8744853645.37','100000.01']){await rate.fill(invalid);await compare.click();assert.ok(await page.getByRole('alert').isVisible());assert.equal(await cost().count(),0);}
  await rate.fill('');await compare.click();assert.equal(await cost().count(),0);
  await rate.fill('12.34');await compare.click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/${width}-comparison.png`,fullPage:true});
  await page.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await rate.inputValue(),'');assert.equal(await cost().count(),0);assert.equal(await hires.inputValue(),'');assert.equal(await departures.inputValue(),'');assert.match(await page.getByRole('status').innerText(),/Blank values are unknown/);
  await hires.fill('1');await departures.fill('0');await rate.fill('12.34');await compare.click();assert.ok(await cost().isVisible());
  await page.reload();await page.getByRole('heading',{name:'Compare company headcount',exact:true}).waitFor();assert.equal(await hires.inputValue(),'');assert.equal(await departures.inputValue(),'');assert.equal(await rate.inputValue(),'');assert.equal(await cost().count(),0);
  await page.goto('http://fixture.local/?invalid');assert.match(await page.getByRole('alert').innerText(),/history could not be verified/);assert.equal(await page.getByRole('table').count(),0);
  assert.deepEqual(errors,[]);evidence.push({width,flow:'headcount regression; optional rate blank → decimal → edit invalidation → zero → invalid/overflow → blank → reset/reload; exact monthly USD values; source gates',passed:true});
  await context.close();
}} finally {await browser.close();}
await fs.writeFile(output+'/checks.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
