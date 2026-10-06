// Real Compensation page with static references and an unavailable internal source.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {benchmarkAreas,benchmarkOccupations,compensationBenchmark,formatOewsEstimate} from '../../lib/compensation-benchmarks.ts';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.COMPENSATION_QA_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'compensation-benchmarks-ui-'));
await fs.mkdir(output,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/compensation.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const cssFiles=await fs.readdir('.next/static',{recursive:true});
const css=(await Promise.all(cssFiles.filter(name=>name.endsWith('.css')).map(name=>fs.readFile(path.join('.next/static',name),'utf8')))).join('\n');
assert.ok(css.length,'production CSS must exist');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
function check(name,value){assert.ok(value,name);results.push(name);console.log('PASS '+name)}
try{
  for(const width of [1366,390]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),requests=[],errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());requests.push(url.pathname);
      if(url.href==='http://compensation.test/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>'});
      if(url.pathname==='/api/compensation')return route.fulfill({status:503,json:{error:'Synthetic source unavailable'}});
      return route.abort();
    });
    await page.goto('http://compensation.test/');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});
    const panel=page.getByRole('region',{name:'US occupation wage benchmarks'});
    await page.getByRole('alert').waitFor();
    check(width+' no occupation guessed from internal data or goal',await panel.getByLabel('Reference occupation').inputValue()===''&&await panel.getByRole('table').count()===0);
    check(width+' available reference independent of internal failure',await panel.isVisible()&&await page.getByText('Compensation cost context is unavailable. Try again.').isVisible());
    check(width+' only three official occupation choices',await panel.getByLabel('Reference occupation').locator('option').count()===4);
    for(const occupation of benchmarkOccupations)for(const area of benchmarkAreas){
      await panel.getByLabel('Reference occupation').selectOption(occupation.onet_code);
      await panel.getByLabel('Benchmark geography').selectOption(area.code);
      const expected=compensationBenchmark(occupation.onet_code,area.code);
      await panel.getByRole('heading',{name:`${occupation.onet_title} · ${area.label}`,exact:true}).waitFor();
      const first=panel.getByRole('table').locator('tbody tr').first();
      const cells=await first.locator('td').allTextContents();
      check(width+' exact published five percentiles '+occupation.onet_code+'/'+area.code,JSON.stringify(cells)===JSON.stringify(expected.percentiles.map(p=>formatOewsEstimate(p.estimate,true))));
      check(width+' correct comparison scope '+occupation.onet_code+'/'+area.code,await panel.getByRole('table').locator('tbody tr').count()===(area.code==='99'?1:2));
    }
    check(width+' no seniority or specialty inference',await panel.getByText(/3 occupations · 3 US geographies · No internal role matched/).isVisible()&&await panel.getByText(/not specialty-specific/).isVisible());
    check(width+' metro boundary explicit',await panel.getByText(/broader than New York City/).isVisible());
    const region=panel.getByRole('region',{name:'Annual wage percentile comparison'});await region.focus();
    check(width+' keyboard scrolling available',await region.evaluate(el=>el===document.activeElement));
    if(width===390){await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.activeElement.scrollLeft>0);await region.evaluate(el=>el.scrollLeft=0);}
    check(width+' page fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await panel.getByText('Benchmark sources and limits',{exact:true}).click();
    check(width+' dates, coverage, licensing, threshold and attribution available',await panel.getByText(/released May 15, 2026/).isVisible()&&await panel.getByText(/not seniority levels, salary bands or total compensation/).isVisible()&&await panel.getByText(/cannot supply a compa-ratio/).isVisible()&&await panel.getByText(/≥ \$239,200 annually/).isVisible()&&await panel.getByRole('link',{name:'CC BY 4.0'}).isVisible()&&await panel.getByText(/Release: August 2026/).isVisible());
    check(width+' source links official and selected workbook accurate',await panel.getByRole('link',{name:'Official BLS source workbook'}).getAttribute('href')==='https://www.bls.gov/oes/special-requests/oesm25ma.zip');
    await panel.getByText('Benchmark sources and limits',{exact:true}).click();
    await page.screenshot({path:path.join(output,`benchmarks-${width}.png`),fullPage:true});
    check(width+' selections do not fetch data or call AI',requests.filter(p=>p==='/api/compensation').length===1&&requests.every(p=>p==='/'||p==='/api/compensation'));
    check(width+' no runtime errors or implicit persistence',errors.length===0&&await page.evaluate(()=>localStorage.length===0));
    await context.close();
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks:results.length,results},null,2));
  console.log(`${results.length} benchmark browser checks passed. Evidence: ${output}`);
}finally{await browser.close()}
