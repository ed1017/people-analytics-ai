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
const items=homeStarterGroups.flatMap(group=>group.prompts),satisfaction=items.find(item=>item.label==='How can we improve satisfaction?');
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
  if(homeStarterGroups[0].prompts.some(entry=>entry.prompt===item.prompt))check(mode+' '+label+' stays conversational without goal or forecast shortcut',await page.getByRole('button',{name:/^Pin /}).count()===0&&await page.getByRole('region',{name:/projection for this starter$/}).count()===0&&await page.getByText('Active requisitions at month-end',{exact:true}).count()===0&&posts.at(-1).page==='home'&&posts.at(-1).hasFocusedIssue===false);
 };
 await page.goto(base+'/?page=home');await dialog.waitFor();
 await page.waitForFunction(()=>!document.querySelector('[aria-controls="home-starting-instructions"]')?.disabled);
 const initial=await geometry(button(satisfaction.label));evidence.push({mode,label:'first-visit-modal',...initial});
 check(mode+' fresh instructions are a native modal',await dialog.evaluate(node=>node.open&&node.matches(':modal')));
 if(initial.rect.top>=0&&initial.rect.bottom<=height)check(mode+' modal owns background starter hit point',initial.hitDialog==='home-starting-instructions'&&!initial.receivesPointer);
 await button(satisfaction.label).focus();
 check(mode+' background focus cannot bypass native modal',await dialog.evaluate(node=>node.contains(document.activeElement)));
 await page.keyboard.press('Enter');
 check(mode+' background keyboard attempt cannot send',posts.length===0&&await dialog.isVisible());
 await page.screenshot({path:`${output}/${mode}-instructions.png`});
 const close=button('Close instructions');await close[touch?'tap':'click']({trial:true});
 check(mode+' Close is a real hit-tested target',(await geometry(close)).receivesPointer);
 await close[touch?'tap':'click']();await dialog.waitFor({state:'hidden'});
 check(mode+' five exact planning openers and three unchanged challenges',await page.getByRole('group',{name:'Strategic Workforce Planning',exact:true}).getByRole('button').count()===5&&await page.getByRole('group',{name:'Workforce challenges',exact:true}).getByRole('button').count()===3&&await page.getByText('Skills & growth',{exact:true}).count()===0);
 await page.screenshot({path:`${output}/${mode}-starters.png`,fullPage:true});
 await page.waitForFunction(key=>localStorage.getItem(key)==='1',HOME_INSTRUCTIONS_DISMISSED_KEY);
 check(mode+' semantic dismissal persisted without a chat call',posts.length===0&&await page.evaluate(key=>localStorage.getItem(key),HOME_INSTRUCTIONS_DISMISSED_KEY)==='1');
 for(const [index,item] of items.entries()){
  if(index)await reset();
  await sendStarter(item,'fresh '+item.label);
 }
 await reset();
 await sendStarter(items[0],'planning keyboard after dismissal',true);
 // One scoped objective owns continuity; visible transcript is not replayed.
 const sendTurn=async text=>{
  const before=posts.length;await page.getByLabel('Ask Workforce AI',{exact:true}).fill(text);
  await button('Send overview question').click();
  await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText(`Synthetic pointer response ${before+1}.`,{exact:true}).waitFor();
  check(mode+' typed turn sends once with bounded history',posts.length===before+1&&posts.at(-1).message.startsWith(text)&&posts.at(-1).history.length<=8);
 };
 for(let index=0;index<12;index++){
  await sendTurn(['Or how about both?','Budget is $20000.','We need it sooner.'][index%3]);
  check(mode+' long turn '+index+' carries recognized objective and independent unavailable calculator hint',posts.at(-1).planningObjective===items[0].prompt&&posts.at(-1).planningCalculatorAvailable===false&&Object.keys(posts.at(-1)).filter(key=>key.startsWith('planning')).sort().join(',')==='planningCalculatorAvailable,planningObjective');
 }
 check(mode+' opener falls outside model window but remains in visible transcript',!posts.at(-1).history.some(turn=>turn.content===items[0].prompt)&&await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText(items[0].prompt,{exact:true}).count()===1);
 await sendTurn('New topic: movies.');
 for(let index=0;index<5;index++)await sendTurn('What movies should I watch?');
 await sendTurn('Or how about both?');
 check(mode+' cleared objective stays absent after topic change leaves model window',posts.at(-1).planningObjective===null&&!posts.at(-1).history.some(turn=>turn.content==='New topic: movies.'));
 await reset();
 await sendTurn('Or how about both?');
 check(mode+' reset visible boundary cannot carry archived objective',posts.at(-1).planningObjective===null&&posts.at(-1).history.length===0);
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
 await sendStarter(satisfaction,'after ordinary navigation and '+(touch?'touch scroll':'wheel scroll'));
 await reset();
 await page.mouse.wheel(0,220);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const beforeReload=await scrollState();await page.reload();
 await button(satisfaction.label).waitFor();
 await page.waitForFunction(()=>!document.querySelector('[aria-controls="home-starting-instructions"]')?.disabled);
 evidence.push({mode,label:'reload positions',beforeReload,afterReload:await scrollState()});
 check(mode+' reload retains dismissed instructions',!await dialog.isVisible());
 await sendStarter(satisfaction,'reload with retained dismissal');
 await page.screenshot({path:`${output}/${mode}-answered.png`});
 check(mode+' no runtime errors or horizontal overflow',errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close()}
await writeFile(output+'/geometry.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify({checks,mockedChats:totalPosts,providerCalls:0,base,output}));
