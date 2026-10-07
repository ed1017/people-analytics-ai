// Production browser behavior with synthetic local API fixtures; no hosted model calls.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {workforce,attrition,survey} from '../fixtures/theme-audit-data.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {HOME_INSTRUCTIONS_DISMISSED_KEY} from '../../lib/home-onboarding.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3492',output=process.env.INTRO_OUTPUT??'/tmp/workforce-chat-intro';
const preference='insights-to-action.workforce-chat-intro-seen.v1',goal='Keep the existing workforce goal and its exact scope';
const saved=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'intro-existing',goals:[{id:'intro-existing',statement:goal,context:{constraints:'US workforce; no new plan authorized.',decisions:'',notes:[]}}]},workspaces:{}});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});await mkdir(output,{recursive:true});
let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['short-mobile',390,600]])for(const closeBy of ['close','escape','guide']){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let posts=0,external=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(({key,dismiss,saved})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,saved);localStorage.setItem(dismiss,'1')}},{key:DECISIONS_STORAGE_KEY,dismiss:HOME_INSTRUCTIONS_DISMISSED_KEY,saved});
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort()}if(url.pathname.startsWith('/api/')){if(req.method()!=='GET'){if(url.pathname==='/api/chat'&&req.postDataJSON().summaryOnly===true)return route.fulfill({json:{answer:'Synthetic goal takeaway; no plan has been created.'}});posts++;}return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):({workforce,attrition,'survey-sentiment':survey}[url.pathname.slice(5)]??scopeEnterprise[url.pathname.slice(5)]??{})})}return route.continue()});
 const intro=page.getByRole('region',{name:'Workforce chatbot introduction'}),chat=page.getByLabel('Ask People Analytics AI',{exact:true}),button=name=>page.getByRole('button',{name,exact:true}),read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const navigate=async destination=>{if(width<768)await button('Open navigation').click();await page.locator('[data-nav-destination="'+destination+'"]').click();};
 const reveal=async()=>{await page.locator('.app-ai-panel').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));};
 try{
  await page.goto(base+(closeBy==='guide'?'':'?page=workforce'));await page.getByLabel('Selected goal',{exact:true}).waitFor();const original=(await read()).goals;
  if(closeBy==='guide'){
   check(mode+' uses the singular Generate Action Plan accessible name',await button('Generate Action Plan').isVisible()&&await button('Create Action Plan').count()===0);
   await page.evaluate(()=>{window.introGuideOverlap=false;new MutationObserver(()=>{if(document.querySelector('[data-guided-popup]')&&document.querySelector('[aria-label="Workforce chatbot introduction"]'))window.introGuideOverlap=true;}).observe(document.body,{childList:true,subtree:true});});
   await button('Show instructions').click();await button('Try a guided example').click();await page.getByRole('dialog',{name:'Optional guided demo'}).waitFor();
   check(mode+' guide suppresses the intro without consuming its preference',await intro.count()===0&&await page.evaluate(key=>localStorage.getItem(key),preference)===null);
   // Leaving Home closes the existing guide through its own normal lifecycle.
   await navigate('workforce');await page.getByRole('dialog',{name:'Optional guided demo'}).waitFor({state:'hidden'});
  }
  await chat.waitFor();await reveal();await intro.waitFor();
  if(closeBy==='guide')check(mode+' guide closes before the workforce introduction appears',await page.evaluate(()=>!window.introGuideOverlap));
  check(mode+' '+closeBy+' shows once beside the actual chatbot',await intro.getByText('Use the chatbot to explore workforce questions and build an Action Plan for your goal.',{exact:true}).isVisible()&&await page.evaluate(key=>localStorage.getItem(key),preference)==='1');
  check(mode+' '+closeBy+' arrow points down to Ask AI without covering controls',await intro.evaluate(node=>{const arrow=node.querySelector('[data-workforce-intro-arrow]').getBoundingClientRect(),header=node.parentElement.nextElementSibling.getBoundingClientRect(),close=node.querySelector('button').getBoundingClientRect();return arrow.bottom<=header.top&&arrow.left>=header.left&&arrow.right<=header.right&&close.width>=44&&close.height>=44&&document.elementFromPoint(close.left+close.width/2,close.top+close.height/2)?.closest('button')===node.querySelector('button')}));
  await page.getByRole('region',{name:'Goal takeaway',exact:true}).getByText('Synthetic goal takeaway; no plan has been created.',{exact:true}).waitFor();
  await page.locator('[data-ai-conversation-body]').hover();await page.mouse.wheel(0,1500);
  await page.locator('[data-ai-conversation-body]').evaluate(node=>node.scrollTop=node.scrollHeight);
  await button('Send message').scrollIntoViewIfNeeded();
  check(mode+' '+closeBy+' composer and Send remain reachable while the intro is open',await button('Send message').evaluate(node=>{const body=node.closest('[data-ai-conversation-body]'),box=node.getBoundingClientRect();const hit=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return getComputedStyle(body).overflowY==='auto'&&(node.contains(hit)||(node.disabled&&hit===node.parentElement))}));
  await page.locator('[data-ai-conversation-body]').evaluate(node=>node.scrollTop=0);await reveal();
  if(closeBy==='close'){await page.screenshot({path:output+'/'+mode+'.png'});await button('Close chatbot introduction').click();check(mode+' close returns focus to the chatbot',await chat.evaluate(node=>node===document.activeElement));}
  else {await chat.focus();await page.keyboard.press('Escape');check(mode+' Escape keeps existing keyboard focus',await chat.evaluate(node=>node===document.activeElement));}
  check(mode+' '+closeBy+' dismisses without changing goals',await intro.count()===0&&JSON.stringify((await read()).goals)===JSON.stringify(original));
  await chat.fill('Preserve this unfinished question.');await navigate('attrition');await reveal();check(mode+' '+closeBy+' stays dismissed on another workforce page',await intro.count()===0&&await chat.inputValue()==='Preserve this unfinished question.');
  await page.reload();await chat.waitFor();await reveal();check(mode+' '+closeBy+' stays dismissed after reload without creating work',await intro.count()===0&&JSON.stringify((await read()).goals)===JSON.stringify(original)&&posts===0);
  check(mode+' '+closeBy+' has no horizontal overflow, external calls or runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&external===0&&errors.length===0);
 }catch(error){console.log({mode,closeBy,errors,posts,external});await page.screenshot({path:output+'/'+mode+'-'+closeBy+'-failure.png',fullPage:true});throw error}finally{await context.close()}
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
