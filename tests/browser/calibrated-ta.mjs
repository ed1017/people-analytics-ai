import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'calibrated-ta-'));
const cssFiles=(await Promise.all(['.next/static/chunks','.next/static/css'].map(async d=>(await fs.readdir(d).catch(()=>[])).filter(n=>n.endsWith('.css')).map(n=>path.join(d,n))))).flat();
assert(cssFiles.length);const css=(await Promise.all(cssFiles.map(f=>fs.readFile(f,'utf8')))).join('\n');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/calibrated-ta.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd(),react:path.resolve('node_modules/react')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((e,s)=>compiler.close(()=>e?reject(e):s.hasErrors()?reject(Error(s.toString({all:false,errors:true}))):resolve())));
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');assert(!js.includes('buildCalibratedProposal'),'No generator in client bundle');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,v)=>{assert(v,name);checks++};await fs.mkdir('/tmp/calibrated-ta',{recursive:true});
try{for(const [name,width,height] of [['wide',1844,1100],['desktop',1366,900],['mobile',390,844],['small-mobile',320,740],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let calls=0;
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{if(route.request().url()==='http://fixture.local/')return route.fulfill({contentType:'text/html',body:html});calls++;return route.abort()});await page.goto('http://fixture.local/');
 const figure=page.getByRole('figure',{name:'Active requisitions: synthetic history and forecasts'});
 await figure.waitFor();check(name+' source version',await page.locator('[data-source-version="synthetic-ta-calibrated-v2"]').count()===1);
 check(name+' modeled assumption visible',await page.getByText(/Modeled stage attainment · Screening assumed/).isVisible());
 check(name+' compact chart',await figure.locator('svg[role=group]').evaluate(n=>n.getBoundingClientRect().height===194));
 await page.waitForFunction(()=>{const svg=document.querySelector('svg[aria-label="Requisition counts by month"]');return Math.abs(svg.width.baseVal.value-Math.max(760,svg.parentElement.clientWidth))<=1});
 check(name+' plot fills allocated width',await figure.locator('svg[role=group]').evaluate(n=>Math.abs(n.getBoundingClientRect().width-Math.max(760,n.parentElement.clientWidth))<=1));
 const activePanel=figure.locator('xpath=ancestor::section[1]'),comparison=activePanel.getByRole('table',{name:'Projected active requisitions at month-end',exact:true});
 check(name+' table ordered by historical MAE',JSON.stringify(await comparison.locator('tbody th').allInnerTexts())===JSON.stringify(['Recent mean (3)','Last count','Damped change']));
 check(name+' honest methods and December summary',await activePanel.getByText('3 methods ranked by backtest',{exact:true}).isVisible()&&await comparison.getByRole('columnheader',{name:'Dec 2026',exact:true}).isVisible());
 for(const [label,key] of [['Last count','carryForward'],['Recent mean (3)','recentMean'],['Damped change','dampedChange']]){const value=await comparison.getByRole('row').filter({has:page.getByRole('rowheader',{name:label,exact:true})}).getByRole('cell').innerText();check(name+' summary matches plotted '+key,(await figure.locator(`[data-forecast-method="${key}"]`).last().getAttribute('aria-label')).includes(value+' active requisitions'));}
 const split=await comparison.evaluate(n=>{const table=n.parentElement.getBoundingClientRect(),chart=n.closest('section').querySelector('figure').getBoundingClientRect();return {table:table.toJSON(),chart:chart.toJSON()}});
 check(name+' compact responsive split',split.chart.top>=split.table.bottom||(split.table.width<=340&&split.chart.width>split.table.width));
 check(name+' preserved headlines',await page.getByText('62,104',{exact:true}).count()>0&&await page.getByText('Current-status Open Requisitions',{exact:true}).isVisible()&&await page.getByText('475',{exact:true}).isVisible());
 check(name+' six actual shapes',await page.locator('polygon').count()===6);
 check(name+' no viewport overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const details=page.locator('details').first(),summary=details.locator('summary');
 check(name+' collapsed Details',!await details.evaluate(n=>n.open));
 for(let n=0;n<3;n++){await summary.focus();await page.keyboard.press(n%2?'Space':'Enter');check(name+' open '+n,await details.evaluate(n=>n.open));check(name+' provenance '+n,(await details.innerText()).includes('one active requisition opened later'));await page.keyboard.press(n%2?'Space':'Enter');check(name+' close '+n,!await details.evaluate(n=>n.open));}
 for(const method of ['carryForward','recentMean','dampedChange']){const dots=figure.locator(`[data-forecast-method="${method}"]`);check(name+' three '+method,await dots.count()===3);await dots.first().focus();check(name+' focus '+method,(await figure.locator('figcaption').innerText()).includes('Oct 26'));await dots.last().hover();check(name+' hover '+method,(await figure.locator('figcaption').innerText()).includes('Dec 26'));}
 const scroll=figure.getByRole('region');if(width<760){await scroll.evaluate(n=>n.scrollLeft=0);await scroll.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);check(name+' scroll',await scroll.evaluate(n=>n.scrollLeft>0));}
 await page.mouse.move(0,0);await figure.locator('[data-history-month="2026-09"]').focus();check(name+' 474 historical',(await figure.locator('figcaption').innerText()).includes('474 active requisitions'));await scroll.evaluate(n=>n.scrollLeft=0);await page.screenshot({path:`/tmp/calibrated-ta/${name}.png`,fullPage:true});
 await page.getByRole('button',{name:'Home',exact:true}).click();check(name+' Home shares release',await page.locator('[data-source-version="synthetic-ta-calibrated-v2"]').count()===2);check(name+' unique accessibility IDs',await page.locator('[id]').evaluateAll(nodes=>new Set(nodes.map(n=>n.id)).size===nodes.length));check(name+' Home chart only',await page.locator('polygon').count()===0);
 await page.getByRole('button',{name:'Stale',exact:true}).click();check(name+' stale hidden',await page.locator('[data-source-version]').count()===0);check(name+' stale keeps totals',await page.getByText('475',{exact:true}).isVisible());
 await page.getByRole('button',{name:'Null observations',exact:true}).click();await page.locator('[data-history-month="2025-11"]').focus();check(name+' null tooltip',(await page.locator('figcaption').innerText()).includes('Unavailable'));await page.locator('[data-history-month="2025-12"]').focus();check(name+' zero tooltip',(await page.locator('figcaption').innerText()).includes('0 active requisitions'));
 await page.getByRole('button',{name:'TA',exact:true}).click();check(name+' navigation resets Details',!await page.locator('details').first().evaluate(n=>n.open));check(name+' no runtime errors',errors.length===0);check(name+' no API/provider requests',calls===0);await context.close();
}console.log(JSON.stringify({checks,screenshots:'/tmp/calibrated-ta'}));}finally{await browser.close()}
