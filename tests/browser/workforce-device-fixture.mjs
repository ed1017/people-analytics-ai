// Focused smoke test for the portable artifact, not a repeat of the release suite.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
if(!process.argv[2])throw Error('Pass the generated workforce-device-acceptance.html path.');
const interactive=process.argv.includes('--interactive'),fileMode=process.argv.includes('--file');
const browser=await chromium.launch({...process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:process.platform==='win32'?{channel:'chrome'}:{executablePath:'/usr/bin/chromium'},headless:!interactive,args:process.platform==='linux'?['--no-sandbox']:[]});
let checks=0;
const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url())});
 const artifact=await fs.readFile(path.resolve(process.argv[2]),'utf8');
 const mockURL='http://127.0.0.1:3100/';
 await page.route('**/*',route=>fileMode&&route.request().url().startsWith('file:')?route.continue():!fileMode&&route.request().url()===mockURL?route.fulfill({contentType:'text/html',body:artifact}):route.abort());
 await page.goto(fileMode?pathToFileURL(path.resolve(process.argv[2])).href:mockURL);
 if(interactive){console.log('Synthetic fixture open. No HTTP server is running; Playwright supplies the page in memory. Close this browser window to finish.');await new Promise(resolve=>browser.on('disconnected',resolve));}
 else{
 const button=name=>page.getByRole('button',{name,exact:true});
 const open=()=>page.locator('summary').filter({hasText:'Review local alternatives'}).click();
 await open();check('artifact seeds one review and preserved original',await page.getByRole('status').filter({hasText:'Saved locally: true. Original plan unchanged: true. Reviews: 1.'}).count()===1);
 for(const p of ['build','move','buy']){await page.getByLabel(p+' min bound',{exact:true}).fill('0');await page.getByLabel(p+' max bound',{exact:true}).fill('3')}
 await page.getByRole('checkbox',{name:'I confirm these bounds and the unchanged cost/timing assumptions for this comparison.',exact:true}).check();
 await button('Run local mix search').click();await page.getByLabel('Select build-0-move-3-buy-0',{exact:true}).check();
 check('embedded Blob worker performs real local search',await page.getByText('10 mixes evaluated;',{exact:false}).count()===1);
 await button('Review selected mixes').click();await button('Replace alternative drafts').click();await button('Calculate alternatives locally').click();await button('Save reviewed alternatives').click();
 await page.getByRole('status').filter({hasText:'Reviews: 2.'}).waitFor();
 await page.reload();await open();await button('Verify saved review 2 locally').click();await page.locator('summary').filter({hasText:'Review 2 · version 1'}).waitFor();
 check('saved v2 survives artifact reload and verifies',true);
 await button('Publish newer synthetic calculation').click();await open();await button('Verify saved review 2 locally').click();await page.locator('summary').filter({hasText:'Review 2 · version 1 · Historical'}).waitFor();check('seeded newer calculation supports history acceptance',true);
 await button('Reset synthetic fixture').click();await open();check('reset restores only synthetic starting fixture',await page.getByRole('status').filter({hasText:'Reviews: 1.'}).count()===1);
 for(const p of ['build','move','buy']){await page.getByLabel(p+' min bound',{exact:true}).fill('0');await page.getByLabel(p+' max bound',{exact:true}).fill('3')}
 await page.getByRole('checkbox',{name:'I confirm these bounds and the unchanged cost/timing assumptions for this comparison.',exact:true}).check();
 for(const [mode,message] of [['no-worker','Local worker unavailable; saved records are retained and no service fallback is used.'],['no-crypto','Local verification needs Web Crypto; no service fallback is available.']]){
  await page.getByLabel('Worker test mode').selectOption(mode);await button('Run local mix search').click();await page.getByText(message,{exact:true}).waitFor();check(mode+' control exercises product failure path',true);
 }
 await page.getByLabel('Worker test mode').selectOption('hold');await button('Run local mix search').click();await button('Cancel local search').click();await button('Release held replies').click();
 check('held cancellation preserves state',await page.getByLabel('Select build-0-move-3-buy-0',{exact:true}).count()===0&&await page.getByRole('status').filter({hasText:'Original plan unchanged: true. Reviews: 1.'}).count()===1);
 check('390px artifact fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth===390));
 check('only intercepted fixture navigations and no browser errors',requests.every(url=>!fileMode&&url===mockURL)&&errors.length===0);
 console.log(`${checks} portable fixture checks passed`);
 }
}finally{await browser.close()}
