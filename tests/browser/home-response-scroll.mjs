import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3181',browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
// Inspect actual geometry, including the fixed header, inner scrollport and dock.
const geometry=selector=>{
 const node=document.querySelector(selector),viewport=document.querySelector('[aria-label="Home chat workspace"]'),header=document.querySelector('main > header'),dock=document.querySelector('.home-composer-dock');
 if(!node||!viewport)return {visible:false};
 const rect=node.getBoundingClientRect(),port=viewport.getBoundingClientRect(),fixed=element=>element&&['fixed','sticky'].includes(getComputedStyle(element).position),top=Math.max(0,port.top,fixed(header)?header.getBoundingClientRect().bottom:0),bottom=Math.min(innerHeight,port.bottom,fixed(dock)?dock.getBoundingClientRect().top:innerHeight);
 return {visible:rect.top>=top-2&&rect.bottom<=bottom+2,topVisible:rect.top>=top-2&&rect.top+40<=bottom+2,top:rect.top,bottom:rect.bottom,readingTop:top,readingBottom:bottom,outer:scrollY,inner:viewport.scrollTop};
};
try{for(const [mode,width,height] of [['desktop-expanded',1366,900],['desktop-collapsed',1366,900],['mobile-expanded',390,900],['mobile-collapsed',390,900],['zoom-expanded',683,450],['zoom-collapsed',683,450]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];let release,posts=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base)return route.abort();
  if(url.pathname==='/api/chat'){posts++;await new Promise(resolve=>release=resolve);return route.fulfill({json:{answer:'Start reading here: review the current turnover evidence.\n\n'+Array.from({length:24},(_,index)=>'Paragraph '+(index+1)+': Review the supplied population and period before choosing an intervention. Effects and future outcomes remain unverified.').join('\n\n'),nextStep:'none'}}).catch(()=>{});}
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:123,fte:120,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true}),status=page.getByRole('status',{name:'AI answer status',exact:true});
 await page.goto(base);await button('How can we reduce turnover?').waitFor();if(mode.endsWith('expanded'))await button('Show instructions').click();await button('How can we reduce turnover?').scrollIntoViewIfNeeded();
 const before=await page.evaluate(()=>scrollY);await button('How can we reduce turnover?').click();await status.waitFor();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const pending=await page.evaluate(geometry,'[aria-label="AI answer status"]');console.log(JSON.stringify({mode,before,pending,starters:await page.getByRole('region',{name:'Starting guide'}).count()}));await page.screenshot({path:'/tmp/home-response-pending-'+mode+'.png'});
 check(mode+' starter collapse reveals pending answer in the actual reading viewport',pending.visible&&await button('Show instructions').count()===1);
 release();await status.waitFor({state:'hidden'});await page.locator('[aria-label="Overview conversation"] [data-chat-role="assistant"]').last().waitFor();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const answerBox=await page.evaluate(geometry,'[aria-label="Overview conversation"] [data-chat-role="assistant"]');console.log(JSON.stringify({mode,answerBox}));if(!answerBox.topVisible)await page.screenshot({path:'/tmp/home-response-scroll-failure-'+mode+'.png'});check(mode+' long answer opens at its top above the later Pin card',answerBox.topVisible);check(mode+' original question remains at the start of the new response',(await page.evaluate(geometry,'[data-home-response-start]')).topVisible);await page.screenshot({path:'/tmp/home-response-answer-'+mode+'.png'});
 // Submit from the keyboard while keeping composer focus, then deliberately scroll away.
 await button('Show instructions').click();await chat.fill('What should I check next?');await chat.focus();
 await chat.evaluate(node=>node.form.requestSubmit());await status.waitFor();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 check(mode+' typed submission preserves focus and reveals response once',(await page.evaluate(geometry,'[aria-label="AI answer status"]')).visible&&await chat.evaluate(node=>node===document.activeElement));
 if(mode.endsWith('expanded'))await chat.fill('Keep this follow-up draft');else await page.mouse.wheel(0,-350);
 await page.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});const port=document.querySelector('[aria-label="Home chat workspace"]');port.scrollTop=0;});
 const parked=await page.evaluate(()=>({outer:scrollY,inner:document.querySelector('[aria-label="Home chat workspace"]').scrollTop}));
 release();await status.waitFor({state:'hidden'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const after=await page.evaluate(()=>({outer:scrollY,inner:document.querySelector('[aria-label="Home chat workspace"]').scrollTop}));
 console.log(JSON.stringify({mode,parked,after,draft:await chat.inputValue(),focused:await chat.evaluate(node=>node===document.activeElement)}));check(mode+' completing the answer does not hijack later scrolling or draft',Math.abs(after.outer-parked.outer)<3&&Math.abs(after.inner-parked.inner)<3&&await chat.inputValue()===(mode.endsWith('expanded')?'Keep this follow-up draft':'')&&await chat.evaluate(node=>node===document.activeElement));
 check(mode+' reduced motion, two explicit requests and no runtime errors',await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)&&posts===2&&errors.length===0);
 await page.screenshot({path:'/tmp/home-response-scroll-'+mode+'.png'});await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks}));
