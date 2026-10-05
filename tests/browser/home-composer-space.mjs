// Built Home composer geometry with intercepted aggregate responses; no live calls.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3150';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['wide',1721,1000],['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let posts=0;page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();if(url.pathname.startsWith('/api/')){if(req.method()!=='GET'){posts++;return route.abort()}return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},summary:{current_workforce:100}}})}return route.continue()});
 await page.goto(base);const input=page.getByLabel('Ask Workforce AI',{exact:true}),dock=page.locator('.home-composer-dock'),send=page.getByRole('button',{name:'Send overview question'});await input.waitFor();const phone=width<768||(width<=950&&height<=500);
 const geometry=()=>input.evaluate(el=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width,client:el.clientHeight,scroll:el.scrollHeight,font:getComputedStyle(el).fontSize,rows:el.rows}));
 let g=await geometry();check(mode+' empty input has three rows and comfortable minimum without font inflation',g.height>=112&&g.rows===3&&g.font==='16px'&&g.scroll<=g.client);
 await input.fill('A short draft');g=await geometry();check(mode+' short text retains multiline space',g.height>=112);
 const text=Array.from({length:30},(_,i)=>'Line '+i+' — review the role requirements and assumptions.').join('\n');await input.fill(text);await page.waitForTimeout(100);g=await geometry();check(mode+' long text grows to bounded scrollable area with every character retained',g.height>112&&g.height<=Math.min(phone?240:320,height*.4)+1&&g.scroll>g.client&&await input.inputValue()===text);
 await input.focus();await page.keyboard.press('Control+End');check(mode+' caret can reach final line',await input.evaluate(el=>el.selectionStart===el.value.length&&el.scrollTop>0));
 if(phone)await send.scrollIntoViewIfNeeded();
 check(mode+' dock aligns with content width and send stays visible',await dock.evaluate(el=>{const r=el.getBoundingClientRect(),slot=document.querySelector('.home-composer-slot').getBoundingClientRect(),send=el.querySelector('button').getBoundingClientRect();return Math.abs(r.width-slot.width)<2&&r.left>=0&&r.right<=innerWidth+1&&send.bottom<=innerHeight+1}));
 await page.setViewportSize({width:390,height:900});await page.waitForTimeout(100);check(mode+' width reflow preserves content without horizontal overflow',await input.inputValue()===text&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width,height});await input.fill('');await page.waitForTimeout(100);g=await geometry();check(mode+' clearing restores comfortable height and readable placeholder',g.height>=112&&g.scroll<=g.client);await input.screenshot({path:'/tmp/home-composer-'+mode+'.png'});
 // Simulate the VisualViewport dimensions provided when a mobile keyboard opens.
 await page.evaluate(()=>{const viewport=window.visualViewport;Object.defineProperty(viewport,'height',{configurable:true,value:240});viewport.dispatchEvent(new Event('resize'))});await page.waitForTimeout(100);
 if(phone)await send.scrollIntoViewIfNeeded();
 check(mode+' keyboard viewport reduces minimum safely and preserves reachable send',await input.evaluate(el=>el.getBoundingClientRect().height<=96+1)&&(phone?await dock.evaluate(el=>getComputedStyle(el).position==='static'):await dock.evaluate(el=>el.getBoundingClientRect().height<=156+1))&&await send.isVisible());
 check(mode+' no model calls or runtime errors',posts===0&&errors.length===0);await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
