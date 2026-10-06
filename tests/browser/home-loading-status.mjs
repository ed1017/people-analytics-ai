import assert from 'node:assert/strict';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3181',browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],posts=[];let release,gate=new Promise(resolve=>release=resolve),failure=false,hold=true,chatRelease,chatGate=new Promise(resolve=>chatRelease=resolve);
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base)return route.abort();
  if(url.pathname==='/api/chat'){posts.push(request.postDataJSON());await chatGate;return route.fulfill({json:{answer:'FTE means full-time equivalent.',nextStep:'none'}}).catch(()=>{});}
  if(url.pathname.startsWith('/api/')){
   const wait=hold?gate:null;if(wait)await wait;
   if(failure||url.pathname!=='/api/dashboard')return route.fulfill({status:503,json:{error:'Test source unavailable'}}).catch(()=>{});
   return route.fulfill({json:{overview:{headcount:123,fte:120,open_positions:3,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}}).catch(()=>{});
  }
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true}),status=page.getByRole('status',{name:'Home data status',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await page.goto(base);await status.getByText('Loading data…',{exact:true}).waitFor();await chat.fill('Keep this draft');
 check(mode+' slow load has a prominent indeterminate accessible status',await status.getAttribute('aria-live')==='polite'&&await status.locator('svg[aria-hidden="true"]').count()===1&&!/\d+%/.test(await status.innerText())&&await chat.inputValue()==='Keep this draft');
 await page.screenshot({path:'/tmp/home-loading-'+mode+'.png'});
 hold=false;release();await status.getByText('Some data is unavailable',{exact:true}).waitFor();
 check(mode+' slow success becomes honest partial data with Refresh',!(await status.innerText()).includes('Loading data')&&/1 of \d+ source summaries available/.test(await status.innerText())&&await button('Refresh data').isVisible());
 failure=true;await button('Refresh data').focus();await page.keyboard.press('Enter');await status.getByText('Data unavailable',{exact:true}).waitFor();
 check(mode+' complete failure stops spinner and preserves draft and goals',await status.locator('svg').count()===0&&await chat.inputValue()==='Keep this draft'&&(await state()).goals.goals.length===2);
 await button('Open goal: Close AI skill gaps').click();await chat.fill('set participants to 15');await button('Send overview question').click();await button('Apply changes').click();await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan attached/}).waitFor();
 check(mode+' demo chat edits work without evidence or paid requests',posts.length===0&&(await state()).workspaces['demo-close-skill-gaps'].fields.homeSolutionBundlesV1.attachments.length===2);
 await page.getByLabel('Selected goal',{exact:true}).selectOption('');failure=false;await button('Refresh data').click();await status.getByText('Some data is unavailable',{exact:true}).waitFor();
 await chat.fill('What does FTE mean?');await button('Send overview question').click();await page.getByRole('status',{name:'AI answer status'}).waitFor();
 check(mode+' answer preparation is distinct from data loading',await page.getByText('Preparing your answer…',{exact:true}).isVisible()&&!await status.getByText('Loading data…',{exact:true}).count());
 chatRelease();await page.getByText('FTE means full-time equivalent.',{exact:true}).last().waitFor();
 // The production source timeout must finish naturally; do not change timers or concurrency.
 hold=true;gate=new Promise(resolve=>release=resolve);await button('Refresh data').click();await status.getByText('Loading data…',{exact:true}).waitFor();await status.getByText('Data unavailable',{exact:true}).waitFor({timeout:18000});
 check(mode+' timeout ends loading and leaves a real retry action',await status.locator('svg').count()===0&&await button('Refresh data').isEnabled());
 hold=false;release();await button('Refresh data').click();await status.getByText('Some data is unavailable',{exact:true}).waitFor();
 // Leave Home during another load, then return. Late results must not settle the new request.
 hold=true;gate=new Promise(resolve=>release=resolve);await button('Refresh data').click();await status.getByText('Loading data…',{exact:true}).waitFor();await button('Show instructions').click();await button('explore your data').click();
 await page.getByRole('status',{name:'Data loading status',exact:true}).waitFor();
 hold=false;failure=true;release();await page.getByRole('status',{name:'Data loading status',exact:true}).waitFor({state:'hidden'});
 if(await button('Open navigation').isVisible())await button('Open navigation').click();await button('Action Planning').click();await status.getByText('Data unavailable',{exact:true}).waitFor();
 check(mode+' navigation cancellation and shared-page failure do not leave a spinner',await status.locator('svg').count()===0&&(await state()).goals.goals.length===2&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks}));
