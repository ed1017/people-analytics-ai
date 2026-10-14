// Local production app with isolated synthetic read fixtures; no hosted or AI requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.FILTER_BASE_URL??'http://localhost:3524';
const output=process.env.FILTER_OUTPUT??'/tmp/filter-applicability';
await fs.mkdir(output,{recursive:true});
const cases={home:/workforce snapshot; other evidence/,workforce:/workforce snapshot; workforce detail/, 'career-growth-mobility':/performance scope; unsupported selections/,compensation:/catalog assumptions; filtered pay results/, 'planning-overview':/do not narrow planning calculations/,attrition:/do not filter this page’s evidence/};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
 const errors=[],blocked=[],dashboardQueries=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin==='https://va.vercel-scripts.com')return route.abort();
  if(url.origin!==base||request.method()!=='GET'){blocked.push(request.url());return route.abort();}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(url.pathname==='/api/dashboard'){
   dashboardQueries.push(url.search);
   const scope={country:url.searchParams.get('country')??'all',org:url.searchParams.get('org')??'all',level:url.searchParams.get('level')??'all'};
   return route.fulfill({json:scopedDashboardResponse({overview:{headcount:100,fte:80,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[{value:'CA',label:'Canada'}],business_units:[],levels:[]}},scope)});
  }
  return route.fulfill({status:503,json:{error:'Synthetic source unavailable'}});
 });
 for(const [destination,expected] of Object.entries(cases)){
  await page.goto(`${base}/?page=${destination}`);
  const region=page.getByRole('region',{name:'Shared workforce filters',exact:true}),note=region.getByLabel('Filter applicability',{exact:true});
  await note.waitFor();assert.match(await note.innerText(),expected);
  if(width===390){assert.equal(await region.getByLabel('Country',{exact:true}).isVisible(),false);assert.equal(await note.isVisible(),true);await region.getByText('Filters',{exact:true}).click();}
  await region.getByLabel('Country',{exact:true}).selectOption('CA');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Country"]')?.value==='CA');
  assert.match(await note.innerText(),expected);
  const bounds=await note.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await region.screenshot({path:`${output}/${width}-${destination}.png`});
  await region.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await region.getByLabel('Country',{exact:true}).inputValue(),'all');
  evidence.push({width,page:destination,note:await note.innerText(),readable:true,filterAndReset:true});
 }
 assert(dashboardQueries.some(query=>query.includes('country=CA')));assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);await context.close();
}}finally{await browser.close();}
await fs.writeFile(`${output}/evidence.json`,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
