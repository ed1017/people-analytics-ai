// Isolated UI exercise with the real page; all HTTP responses are intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {buildCompensationResponse} from '../../lib/compensation.ts';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.COMPENSATION_QA_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'compensation-ui-'));
await fs.mkdir(output,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/compensation.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const cssFiles=await fs.readdir('.next/static',{recursive:true});
const css=(await Promise.all(cssFiles.filter(name=>name.endsWith('.css')).map(name=>fs.readFile(path.join('.next/static',name),'utf8')))).join('\n');
assert.ok(css.length,'production CSS must exist');
const rows=[{org_code:'A',org_name:'Synthetic large unit',org_type:'business_unit',headcount:100,fte:80,labor_cost_usd:8000000},{org_code:'B',org_name:'Synthetic small unit',org_type:'business_unit',headcount:50,fte:20,labor_cost_usd:4000000}];
const good=buildCompensationResponse(rows),partial=buildCompensationResponse([{...rows[0],labor_cost_usd:null},rows[1]]),empty=buildCompensationResponse([]);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
function check(name,value){assert.ok(value,name);results.push(name);console.log('PASS '+name)}
try{
  for(const width of [1366,390]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    const errors=[],requests=[];let state='held',release;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());requests.push(url.pathname);
      if(url.href==='http://compensation.test/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>'});
      if(url.pathname==='/api/compensation-job-release')return route.fulfill({status:503,json:{status:'release_not_enabled'}});
      if(url.pathname==='/api/compensation-ranges')return route.fulfill({json:{jobs:[],levels:[],combinations:[]}});
      assert.equal(url.pathname,'/api/compensation','no unrelated APIs or model calls');
      if(state==='held')await new Promise(resolve=>{release=resolve});
      return route.fulfill({status:state==='error'?503:200,json:state==='error'?{error:'Internal source detail must not be rendered'}:state==='partial'?partial:state==='empty'?empty:good});
    });
    const mount=async()=>{await page.goto('http://compensation.test/');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});};
    await mount();
    await page.getByRole('status').filter({hasText:'Loading compensation cost context'}).waitFor();
    check(width+' loading is announced without showing placeholder money',await page.getByRole('table').count()===0);
    state='good';release();
    await page.getByRole('table').waitFor();
    check(width+' weighted total and ratio displayed',await page.getByText('$12,000,000',{exact:true}).count()===1&&await page.getByText('$120,000',{exact:true}).count()===1);
    check(width+' snapshot, synthetic provenance, scope and unknown period visible',await page.getByText(/Snapshot: September 30, 2026/).isVisible()&&await page.getByText(/Cost period and source refresh date are not supplied/).isVisible()&&await page.getByText(/Demo data · Aggregate evidence/).isVisible());
    await page.getByText('Source and limits',{exact:true}).click();
    check(width+' missing coverage and no annualization explained',await page.getByText(/Source sums can omit missing employee costs/).isVisible()&&await page.getByText(/no conversion or annualization/).isVisible());
    const tableRegion=page.getByRole('region',{name:'Business-unit cost comparison'});
    await tableRegion.focus();
    check(width+' table scroll region keyboard accessible',await tableRegion.evaluate(el=>el===document.activeElement));
    if(width===390){await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.activeElement.scrollLeft>0);}
    check(width+' page contains horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,`compensation-${width}.png`),fullPage:true});
    state='partial';await mount();await page.getByRole('table').waitFor();
    check(width+' partial source does not manufacture company total',await page.getByRole('status').filter({hasText:'Some source values'}).isVisible()&&await page.getByText('Unavailable',{exact:true}).count()>=4&&await page.getByText('$12,000,000',{exact:true}).count()===0);
    state='empty';await mount();await page.getByRole('status').filter({hasText:'No business-unit'}).waitFor();
    check(width+' empty source does not claim zero payroll',await page.getByRole('table').count()===0&&await page.getByText('$0',{exact:true}).count()===0);
    state='error';await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('alert').waitFor();
    check(width+' failure sanitized with usable retry',await page.getByText('Internal source detail must not be rendered').count()===0&&await page.getByRole('button',{name:'Try again'}).isEnabled());
    state='good';await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('table').waitFor();
    check(width+' retry recovers real page',await page.getByRole('alert').count()===0&&await page.getByText('$12,000,000',{exact:true}).count()===1);
    check(width+' no runtime errors or extra data/model calls',errors.length===0&&requests.filter(p=>p==='/api/compensation').length===5&&requests.every(p=>p==='/'||p==='/api/compensation'||p==='/api/compensation-ranges'||p==='/api/compensation-job-release'));
    await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks:results.length,results},null,2));
  console.log(`${results.length} browser checks passed. Evidence: ${output}`);
}finally{await browser.close()}
