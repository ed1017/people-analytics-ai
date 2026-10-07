// Isolated real React hook fixture; no product route or adapter-owned files are changed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'home-mix-orchestration-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/home-mix-orchestration.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd(),react:path.resolve('node_modules/react')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8'),html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;margin:16px}main{max-width:700px}button,input{font:inherit;min-height:44px;max-width:100%;box-sizing:border-box;margin:4px}p{overflow-wrap:anywhere}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name);};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let external=0;
 page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>route.request().url()==='http://fixture.local/'?route.fulfill({contentType:'text/html',body:html}):(external++,route.abort()));
 await context.addInitScript(()=>{localStorage.setItem('saved-plan-history','immutable attached snapshot');window.fixtureStorageWrites=0;const write=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.fixtureStorageWrites++;return write.apply(this,args);};});
 const button=name=>page.getByRole('button',{name,exact:true}),state=page.getByLabel('Search state'),candidate=page.getByLabel('Candidate'),calls=()=>page.evaluate(()=>window.homeMixFixture.calls);
 await page.goto('http://fixture.local/');await candidate.waitFor();check(mode+' initial Strict Mode preparation executes once without a search button',await calls()===1&&await candidate.innerText()==='Proposed candidate buy-5; cash 487500; budget 10000. Review before Apply or Attach.'&&await page.getByRole('button',{name:/search|explore/i}).count()===0);
 for(const event of ['explanation','compare','attach','passive','Rerender'])await button(event).click();
 check(mode+' explanation Compare Attach and unrelated renders retain the candidate without new work',await calls()===1&&await candidate.isVisible());
 await button('Toggle current guard').click();check(mode+' stale live guard hides a result even when the source and enabled flag are unchanged',await candidate.count()===0&&await state.innerText()==='idle');await button('Toggle current guard').click();
 // A passive render does not authorize another search, but an exact existing result may be reused.
 await candidate.waitFor();check(mode+' recovered guard restores only the exact cached candidate without a new search',await calls()===1);
 await page.getByLabel('Budget',{exact:true}).fill('20000');await page.getByLabel('Budget',{exact:true}).fill('30000');await page.waitForFunction(()=>window.homeMixFixture.lastBudget===30000);await page.waitForFunction(()=>document.querySelector('[aria-label="Candidate"]')?.textContent.includes('budget 30000'));
 check(mode+' changed constraints debounce to the final source',await calls()===2&&await candidate.isVisible());
 await page.getByLabel('Budget',{exact:true}).fill('12345');await page.waitForFunction(()=>window.homeMixFixture.lastBudget===12345);await button('compare').click();check(mode+' comparison while searching does not cancel the current source',await state.innerText()==='running'&&await page.evaluate(()=>window.homeMixFixture.aborts)===0);
 await page.getByLabel('Budget',{exact:true}).fill('40000');await page.waitForFunction(()=>window.homeMixFixture.aborts===1);await page.waitForFunction(()=>document.querySelector('[aria-label="Candidate"]')?.textContent.includes('budget 40000'));await page.waitForFunction(()=>window.homeMixFixture.completed===4);
 check(mode+' superseded late reply cannot replace the current proposed candidate',await calls()===4&&(await candidate.innerText()).includes('budget 40000'));
 await button('Toggle active').click();check(mode+' disabled context hides the current report',await candidate.count()===0&&await state.innerText()==='idle');await button('Toggle active').click();await candidate.waitFor();check(mode+' reactivation reuses only the exact verified source',await calls()===4);
 await button('Switch goal').click();await candidate.waitFor();await page.waitForFunction(()=>window.homeMixFixture.calls===5);await page.waitForFunction(()=>document.querySelector('[aria-label="Search state"]')?.textContent==='ready');check(mode+' goal identity creates a separate search even with equal numerical inputs',await calls()===5);
 await page.getByLabel('Budget',{exact:true}).fill('12345');await page.waitForFunction(()=>window.homeMixFixture.calls===6);await button('Toggle mount').click();await page.waitForFunction(()=>window.homeMixFixture.aborts===2);await page.waitForFunction(()=>window.homeMixFixture.completed===6);
 check(mode+' unmount cancels and suppresses uncooperative worker completion',await page.getByRole('region',{name:'Automatic mix result'}).count()===0);
 check(mode+' no saved revision Apply Attach or history mutation occurs',await page.evaluate(()=>localStorage.getItem('saved-plan-history')==='immutable attached snapshot'&&window.fixtureStorageWrites===0));
 await button('Toggle mount').click();await candidate.waitFor();await page.screenshot({path:path.join(output,mode+'.png')});
 check(mode+' responsive fixture has no runtime or external-request failures',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks,output}));
