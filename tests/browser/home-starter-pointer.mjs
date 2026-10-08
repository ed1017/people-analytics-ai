// Built application, isolated browser state and synthetic transport. No provider calls.
// A fresh Home visit intentionally opens a native modal. Dismiss it through its
// visible Close control before hit-testing starter buttons; do not bypass it.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {homeStarterGroups} from '../../lib/contextual-prompts.ts';
import {HOME_INSTRUCTIONS_DISMISSED_KEY} from '../../lib/home-onboarding.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {workforce,attrition,survey,talent,career} from '../fixtures/theme-audit-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3399';
const output=process.env.HOME_POINTER_OUTPUT??'/tmp/home-starter-pointer';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0,totalPosts=0;const evidence=[];
const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
const items=homeStarterGroups.flatMap(group=>group.prompts);
try{for(const [mode,width,height] of [['wide',1844,1100],['desktop',1366,900],['mobile',390,844],['small-mobile',320,740]]){
 const touch=width<640,context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,ignoreHTTPSErrors:process.env.HOME_IGNORE_HTTPS_ERRORS==='1'}),page=await context.newPage(),posts=[],errors=[];
 page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{const request=route.request(),url=new URL(request.url());
  if(url.origin!==base)return route.abort();
  if(url.pathname==='/api/chat'){posts.push(request.postDataJSON());totalPosts++;return route.fulfill({json:{answer:`Synthetic pointer response ${posts.length}.`,nextStep:'none',problem:null,findingFollowups:[]}})}
  if(url.pathname.startsWith('/api/'))return request.method()!=='GET'?route.abort():route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):({'/api/workforce':workforce,'/api/attrition':attrition,'/api/survey-sentiment':survey,'/api/talent-acquisition':talent,'/api/career-growth-mobility':career}[url.pathname]??{})});
  return route.continue();
 });
 const button=label=>page.getByRole('button',{name:label,exact:true});
 const dialog=page.getByRole('dialog',{name:'Home instructions',exact:true});
 const geometry=locator=>locator.evaluate(node=>{const rect=node.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,hit=document.elementFromPoint(x,y),header=document.querySelector('main > header');return {scrollY,rect:rect.toJSON(),hitTag:hit?.tagName,hitText:hit?.textContent?.slice(0,100),hitDialog:hit?.closest('dialog')?.id??null,receivesPointer:hit===node||node.contains(hit),headerBottom:header?.getBoundingClientRect().bottom,headerPosition:header?getComputedStyle(header).position:null,modal:document.querySelector('#home-starting-instructions')?.matches(':modal')??false}});
 // A trial performs normal Playwright scrolling/actionability checks, never a
 // forced click. Then inspect the actual hit target and use real mouse/touch.
 const activate=async(locator,label)=>{
  await locator[touch?'tap':'click']({trial:true});
  const g=await geometry(locator);evidence.push({mode,label,...g});
  check(mode+' '+label+' actual pointer hit target',g.receivesPointer&&!g.modal);
  await locator[touch?'tap':'click']();
 };
 const reset=async()=>{await activate(button('Reset conversation'),'reset');await button(items[0].label).waitFor();};
 const sendStarter=async(item,label,keyboard=false)=>{
  const before=posts.length,target=button(item.label);
  if(keyboard){await target.focus();await page.keyboard.press('Enter');}else await activate(target,label);
  await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText(`Synthetic pointer response ${before+1}.`,{exact:true}).waitFor();
  check(mode+' '+label+' submits exactly once',posts.length===before+1&&posts.at(-1).message===item.prompt);
 };
 await page.goto(base+'/?page=home');await dialog.waitFor();
 await page.waitForFunction(()=>!document.querySelector('[aria-controls="home-starting-instructions"]')?.disabled);
 const initial=await geometry(button(items[3].label));evidence.push({mode,label:'first-visit-modal',...initial});
 check(mode+' fresh instructions are a native modal',await dialog.evaluate(node=>node.open&&node.matches(':modal')));
 if(initial.rect.top>=0&&initial.rect.bottom<=height)check(mode+' modal owns background starter hit point',initial.hitDialog==='home-starting-instructions'&&!initial.receivesPointer);
 await button(items[3].label).focus();
 check(mode+' background focus cannot bypass native modal',await dialog.evaluate(node=>node.contains(document.activeElement)));
 await page.keyboard.press('Enter');
 check(mode+' background keyboard attempt cannot send',posts.length===0&&await dialog.isVisible());
 await page.screenshot({path:`${output}/${mode}-instructions.png`});
 const close=button('Close instructions');await close[touch?'tap':'click']({trial:true});
 check(mode+' Close is a real hit-tested target',(await geometry(close)).receivesPointer);
 await close[touch?'tap':'click']();await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(key=>localStorage.getItem(key)==='1',HOME_INSTRUCTIONS_DISMISSED_KEY);
 check(mode+' semantic dismissal persisted without a chat call',posts.length===0&&await page.evaluate(key=>localStorage.getItem(key),HOME_INSTRUCTIONS_DISMISSED_KEY)==='1');
 for(const [index,item] of items.entries()){
  if(index)await reset();
  await sendStarter(item,'fresh '+item.label);
 }
 await reset();
 await sendStarter(items[3],'keyboard after dismissal',true);
 await reset();
 // Use real navigation controls, including the phone drawer, then return Home.
 if(touch)await activate(button('Open navigation'),'open navigation');
 await activate(page.locator('[data-nav-destination="workforce"]'),'navigate Workforce');
 if(touch)await activate(button('Open navigation'),'reopen navigation');
 await activate(button('Action Planning'),'return Home');
 check(mode+' ordinary navigation does not reopen instructions',!await dialog.isVisible());
 const pane=page.getByRole('region',{name:'Home chat workspace',exact:true});
 await pane.scrollIntoViewIfNeeded();
 const gesturePoint=await pane.evaluate(node=>{const r=node.getBoundingClientRect(),header=document.querySelector('main > header'),dock=document.querySelector('.home-composer-dock'),top=Math.max(0,r.top,header&&getComputedStyle(header).position==='sticky'?header.getBoundingClientRect().bottom:0),bottom=Math.min(innerHeight,r.bottom,dock&&getComputedStyle(dock).position==='fixed'?dock.getBoundingClientRect().top:innerHeight),x=Math.round(r.x+r.width/2),y=Math.round((top+bottom)/2),hit=document.elementFromPoint(x,y);return {x,y,hitTag:hit?.tagName,hitText:hit?.textContent?.slice(0,80),insidePane:hit===node||node.contains(hit)}});
 const {x,y}=gesturePoint;check(mode+' gesture starts on unobscured chat content',gesturePoint.insidePane);console.log('GESTURE '+JSON.stringify({mode,...gesturePoint}));
 const scrollState=()=>page.evaluate(()=>{const pane=document.querySelector('[aria-label="Home chat workspace"]');return {page:scrollY,pane:pane.scrollTop,range:document.documentElement.scrollHeight-innerHeight+Math.max(0,pane.scrollHeight-pane.clientHeight)}});
 const beforeScroll=await scrollState();let afterDown;
 if(touch){const cdp=await context.newCDPSession(page);const swipe=async distance=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+distance*step/8}]});await page.waitForTimeout(16);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};await swipe(-Math.min(220,y-30));afterDown=await scrollState();await swipe(Math.min(120,height-y-30));await cdp.detach();}
 else{await page.mouse.move(x,y);await page.mouse.wheel(0,280);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));afterDown=await scrollState();await page.mouse.wheel(0,-140);}
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const afterUp=await scrollState();
 evidence.push({mode,label:'ordinary scroll',gesturePoint,beforeScroll,afterDown,afterUp});
 console.log('SCROLL '+JSON.stringify({mode,beforeScroll,afterDown,afterUp}));
 check(mode+' ordinary gesture scrolls available content',beforeScroll.range===0||[afterDown,afterUp].some(state=>state.page!==beforeScroll.page||state.pane!==beforeScroll.pane));
 await sendStarter(items[3],'after ordinary navigation and '+(touch?'touch scroll':'wheel scroll'));
 await reset();
 await page.mouse.wheel(0,220);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const beforeReload=await scrollState();await page.reload();
 await button(items[3].label).waitFor();
 await page.waitForFunction(()=>!document.querySelector('[aria-controls="home-starting-instructions"]')?.disabled);
 evidence.push({mode,label:'reload positions',beforeReload,afterReload:await scrollState()});
 check(mode+' reload retains dismissed instructions',!await dialog.isVisible());
 await sendStarter(items[3],'reload with retained dismissal');
 await page.screenshot({path:`${output}/${mode}-answered.png`});
 check(mode+' no runtime errors or horizontal overflow',errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close()}
await writeFile(output+'/geometry.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify({checks,mockedChats:totalPosts,providerCalls:0,base,output}));
