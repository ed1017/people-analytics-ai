// Production Home dialog, synthetic transport, browser-owned state only.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {HOME_INSTRUCTIONS_DISMISSED_KEY} from '../../lib/home-onboarding.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3399',output='/workspace/home-onboarding-review/visuals';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
const existing={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Keep my retention goal'},{id:'b',statement:'Keep a separate goal'}]},workspaces:{a:{savedAt:'2026-10-07',fields:{chat:{messages:[{role:'user',content:'Keep my exact question'}],input:'Keep my unfinished adjustment',problem:null,questionUnanswered:false},attachmentHistory:{originalPlan:'Keep original plan and receipts'}}},b:{savedAt:'2026-10-07',fields:{keep:'Other saved work'}}}};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,844],['short-mobile',390,480]]){
 for(const scenario of ['fresh','existing','empty-saved','legacy','damaged','recovery','blocked']){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let posts=0,external=0;
  page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(({scenario,key,value,empty})=>{
   if(scenario==='blocked'){Storage.prototype.getItem=function(){throw new DOMException('Storage unavailable','SecurityError')};Storage.prototype.setItem=function(){throw new DOMException('Storage unavailable','SecurityError')};return}
   if(sessionStorage.getItem('onboarding-test-initialized'))return;
   sessionStorage.setItem('onboarding-test-initialized','1');
   if(scenario==='existing')localStorage.setItem(key,value);
   if(scenario==='empty-saved')localStorage.setItem(key,empty);
   if(scenario==='damaged')localStorage.setItem(key,'Keep damaged original');
   if(scenario==='legacy')localStorage.setItem('insights-to-action.goals.v1',JSON.stringify({version:1,activeId:'',goals:[]}));
   if(scenario==='recovery')sessionStorage.setItem('insights-to-action.decisions.recovery.v1','Retained recovery record');
  },{scenario,key:DECISIONS_STORAGE_KEY,value:encodeDecisions(existing),empty:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[]},workspaces:{}})});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.href==='https://va.vercel-scripts.com/v1/script.debug.js')return route.fulfill({contentType:'application/javascript',body:''});if(url.origin!==base){external++;return route.abort()}if(url.pathname.startsWith('/api/')){if(route.request().method()==='POST')posts++;return route.fulfill({status:503,json:{error:'Synthetic source unavailable'}})}return route.continue()});
  const dialog=page.getByRole('dialog',{name:'Home instructions',exact:true}),show=page.getByRole('button',{name:'Show instructions',exact:true}),close=page.getByRole('button',{name:'Close instructions',exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true});
  await page.goto(base);await show.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-controls="home-starting-instructions"]')?.disabled);
  const before=await page.evaluate(key=>{try{return localStorage.getItem(key)}catch{return null}},DECISIONS_STORAGE_KEY);
  check(mode+' '+scenario+' correct automatic eligibility',await dialog.isVisible()===(scenario==='fresh'));
  if(scenario!=='fresh')await show.click();await dialog.waitFor();
  check(mode+' '+scenario+' accessible title receives focus',await dialog.getByRole('heading',{name:'Home instructions',exact:true}).evaluate(node=>node===document.activeElement));
  check(mode+' '+scenario+' original full explainer and five steps retained',await dialog.locator('ol > li').count()===5&&(await dialog.innerText()).includes('insight → action → outcomes')&&(await dialog.innerText()).includes('Browser storage details')&&await dialog.getByRole('button',{name:'Try a guided example',exact:true}).count()===1);
  check(mode+' '+scenario+' dialog stays in viewport',await dialog.evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight+1&&node.scrollWidth<=node.clientWidth+1}));
  if(scenario==='fresh'){
   for(let i=0;i<10;i++){await page.keyboard.press(i===0?'Shift+Tab':'Tab');check(mode+' keyboard stays inside modal '+i,await dialog.evaluate(node=>node.contains(document.activeElement)))}
   await dialog.getByRole('button',{name:'Try a guided example',exact:true}).scrollIntoViewIfNeeded();check(mode+' content scrolls internally while Close remains available',await close.isVisible()&&await close.evaluate(node=>{const r=node.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));
   await dialog.locator('.overflow-y-auto').evaluate(node=>node.scrollTop=0);await page.screenshot({path:output+'/'+mode+'.png'});
  }
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('[aria-controls="home-starting-instructions"]')?.getAttribute('aria-expanded')==='false');check(mode+' '+scenario+' Escape restores trigger focus',await show.evaluate(node=>node===document.activeElement));
  const after=await page.evaluate(key=>{try{return localStorage.getItem(key)}catch{return null}},DECISIONS_STORAGE_KEY);check(mode+' '+scenario+' instructions never rewrite saved work',after===before);
  if(scenario!=='blocked')check(mode+' '+scenario+' dismissal stored independently',await page.evaluate(key=>localStorage.getItem(key),HOME_INSTRUCTIONS_DISMISSED_KEY)==='1');
  await page.reload();await show.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-controls="home-starting-instructions"]')?.disabled);check(mode+' '+scenario+' reload does not reopen',!await dialog.isVisible());
  if(scenario==='existing'){
   check(mode+' exact existing draft restored',await chat.inputValue()==='Keep my unfinished adjustment');await page.getByLabel('Selected goal',{exact:true}).selectOption('b');check(mode+' goal switch does not reopen',!await dialog.isVisible());await page.getByLabel('Selected goal',{exact:true}).selectOption('a');
  }
  if(scenario==='fresh'||scenario==='existing'){
   const draft=await chat.inputValue();await show.click();await dialog.getByRole('button',{name:'Try a guided example',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.getByRole('dialog',{name:'Optional guided demo'}).waitFor();check(mode+' '+scenario+' guide opens passively and preserves draft',await chat.inputValue()===draft&&posts===0);await page.getByRole('button',{name:'Exit guide',exact:true}).click();
   await show.click();await dialog.getByRole('button',{name:'Intelligence',exact:true}).click();await dialog.waitFor({state:'hidden'});check(mode+' '+scenario+' navigation closes instructions',await page.locator('[data-nav-destination="occupational-references"]').getAttribute('aria-current')==='page');
  }
  check(mode+' '+scenario+' no external requests, model calls or browser errors',external===0&&posts===0&&errors.length===0);await context.close();
 }
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output,fixtureOnly:true}));
