// Local-only synthetic regression: no hosted requests or model/data mutations.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FILTER_BASE_URL??'http://localhost:3524';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use an isolated local app only');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'filter-label-readability-'));
const label='Senior Analyst / Senior Specialist';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1165,1440,500]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],blocked=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin==='https://va.vercel-scripts.com')return route.abort();
  if(url.origin!==new URL(base).origin||request.method()!=='GET'){blocked.push(request.url());return route.abort();}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(url.pathname==='/api/dashboard'){
   const scope=Object.fromEntries(['country','org','level'].map(key=>[key,url.searchParams.get(key)??'all']));
   return route.fulfill({json:scopedDashboardResponse({overview:{headcount:100,fte:80,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[{value:'L3',label}]}},scope)});
  }
  return route.fulfill({status:503,json:{error:'Synthetic source unavailable'}});
 });
 await page.goto(base+'/?page=home');
 const region=page.getByRole('region',{name:'Shared workforce filters',exact:true}),level=region.getByLabel('Level',{exact:true});
 if(width<768)await region.getByText('Filters',{exact:true}).click();
 await level.selectOption('L3');await page.waitForFunction(()=>document.querySelector('[aria-label="Level"]')?.value==='L3');
 await page.evaluate(()=>document.fonts.ready);
 // Native selects do not expose clipped text fragments. Measure the selected
 // label in the actual font and reserve 32px for the native dropdown arrow.
 const metrics=await level.evaluate(select=>{const style=getComputedStyle(select),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;return {selected:select.selectedOptions[0].textContent,text:ctx.measureText(select.selectedOptions[0].textContent).width,available:select.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-32,width:select.getBoundingClientRect().width};});
 assert.equal(metrics.selected,label);assert(metrics.text<=metrics.available,JSON.stringify({width,...metrics}));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document overflow');
 await region.screenshot({path:path.join(output,`${width}-level.png`)});
 await region.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await level.inputValue(),'all');
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);evidence.push({viewport:width,...metrics});await context.close();
}}finally{await browser.close();}
await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
