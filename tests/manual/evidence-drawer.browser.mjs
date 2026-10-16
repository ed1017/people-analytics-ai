// Optional browser acceptance; requires Playwright and a running app. All AI/write traffic is blocked.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.EVIDENCE_BASE_URL || 'http://127.0.0.1:4197';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),blocked=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==origin||r.method()!=='GET'){blocked.push(u.pathname);return route.abort();}if(!process.env.EVIDENCE_FIXTURES || !u.pathname.startsWith('/api/'))return route.continue();try{const data=await fs.readFile(process.env.EVIDENCE_FIXTURES+'/history-'+u.pathname.slice(5)+'.json','utf8');return route.fulfill({contentType:'application/json',body:data});}catch{return route.fulfill({status:503,json:{error:'Source unavailable in isolated fixture'}})}});
page.setDefaultTimeout(15000);const layouts=[];
for(const [width,height] of [[1440,900],[390,844],[844,390],[390,390]]) for(const dest of ['workforce','skills']) {
 console.log('CHECK',dest,width,height);await page.setViewportSize({width,height});await page.goto(origin+'/?page=workforce',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Open Workforce AI',exact:true}).waitFor();if(dest==='skills'){const nav=page.getByRole('button',{name:'Open navigation',exact:true});if(width<768||(width<950&&height<500)){await nav.waitFor();await nav.click();}await page.locator('.app-sidebar').getByRole('button',{name:'Skills',exact:true}).click();}const trigger=page.getByRole('button',{name:'Open Workforce AI',exact:true});try{await trigger.waitFor();}catch(e){console.log('BODY',await page.locator('body').innerText());throw e;}console.log('TRIGGER');
 if(await page.locator('dialog[open]').count())throw Error('Drawer initially open');
 const before=await page.locator('.app-dashboard').boundingBox();
 await trigger.click();console.log('OPEN');const drawer=page.getByRole('dialog',{name:'Workforce AI',exact:true});await drawer.waitFor();
 const input=drawer.getByRole('textbox',{name:'Ask People Analytics AI'});await input.fill('Draft retained without an AI call');await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
 if(!await trigger.evaluate(el=>el===document.activeElement))throw Error('Focus did not return');
 await trigger.click();if(await input.inputValue()!=='Draft retained without an AI call')throw Error('Draft lost');
 const small=await input.boundingBox();await input.fill(Array(12).fill('Longer draft line to verify composer growth').join('\n'));const large=await input.boundingBox();
 for(let i=0;i<18;i++){await page.keyboard.press('Tab');if(!await drawer.evaluate(el=>el.contains(document.activeElement)))throw Error('Focus escaped modal');}
 await drawer.getByRole('button',{name:'Open conversation details'}).click();const details=page.getByRole('dialog',{name:'Conversation details',exact:true});await details.waitFor();await details.getByRole('button',{name:'Close conversation details'}).click();
 const metrics=await drawer.evaluate(el=>{const scroll=el.querySelector('.evidence-ai-scroll'),textarea=el.querySelector('textarea'),send=el.querySelector('[aria-label="Send message"]');return {bodyWidth:document.documentElement.scrollWidth,width:innerWidth,scrollHeight:scroll.scrollHeight,scrollClient:scroll.clientHeight,composerBottom:textarea.getBoundingClientRect().bottom,sendBottom:send.getBoundingClientRect().bottom,height:innerHeight,bodyOverflow:document.body.style.overflow};});
 if(metrics.bodyWidth>width||metrics.composerBottom>height||metrics.sendBottom>height||large.height<small.height)throw Error(JSON.stringify(metrics));
 if(process.env.EVIDENCE_OUTPUT_DIR)await page.screenshot({path:process.env.EVIDENCE_OUTPUT_DIR+'/evidence-'+dest+'-'+width+'.png'});
 await drawer.getByRole('button',{name:'Close Workforce AI',exact:true}).click();if(await page.evaluate(()=>document.body.style.overflow==='hidden'))throw Error('Body lock leaked');
 const after=await page.locator('.app-dashboard').boundingBox();if(before.width!==after.width)throw Error('Evidence width changed');
 layouts.push({dest,width,height,evidenceWidth:before.width,small:small.height,large:large.height,...metrics});
}
console.log(JSON.stringify({layouts,errors,blocked}));await browser.close();if(errors.length)throw Error('Application errors: '+errors.join('; '));
