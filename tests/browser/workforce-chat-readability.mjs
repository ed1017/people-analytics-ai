// Real app shell with every API intercepted. Never calls a model or a database.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {workforce} from '../fixtures/theme-audit-data.mjs';
import {homeStarterGroups} from '../../lib/contextual-prompts.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3107';
const output=process.env.READABILITY_OUTPUT??'/tmp/workforce-chat-readability';
await fs.mkdir(output,{recursive:true});
const answer='The recorded findings support a review of workload and manager support. They do not establish the cause of turnover.\n\n### Which findings apply to your selected scope?\n| Recorded finding | What it supports—and its boundary |\n| --- | --- |\n| **2026 engagement** | Review the participation and population before interpreting results. [S1] |\n| **Manager survey** | Review manager support; survey associations do not establish causes. [S1] |\n| **Exit feedback** | Compare reported reasons with the available population. [S2] |\n\n- **Next step:** confirm the scope and review assumptions.\n- **Boundary:** intervention effects remain unknown.\n\n[W1] See [Workforce](app:workforce).';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[];
try {for(const [mode,width,height] of [['desktop',1440,1000],['phone',390,844],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];let calls=0;
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();if(url.pathname==='/api/chat'){if(req.postDataJSON().summaryOnly)return route.fulfill({json:{answer:'Synthetic goal summary.'}});calls++;return route.fulfill({json:{answer,nextStep:'none'}});}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):url.pathname==='/api/workforce'?workforce:scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue();});
 const check=(name,pass)=>{assert.ok(pass,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await page.goto(base);await dismissHomeOnboarding(page);
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=page.getByRole('button',{name:'Send overview question',exact:true});
 check('header controls stay inside the viewport',await page.locator('.home-workspace > section > header button').evaluateAll(nodes=>nodes.every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})));
 check('Workforce AI heading is prominent',await page.locator('#overall-overview-heading').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=24));
 check('composer and suggested questions use readable text',await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16)&&await page.locator('[aria-label="Suggested questions"] button').evaluateAll(nodes=>nodes.length>0&&nodes.every(el=>parseFloat(getComputedStyle(el).fontSize)>=16)));
 await page.screenshot({path:path.join(output,mode+'-start.png'),fullPage:true});
 await input.fill('Explain the workforce evidence');await send.click();const body=page.locator('[aria-label="Overview conversation"] .home-answer').last();await body.waitFor();
 check('assistant body uses 16px type and comfortable leading',await body.evaluate(el=>getComputedStyle(el).fontSize==='16px'&&parseFloat(getComputedStyle(el).lineHeight)>=24));
 check('assistant identity is larger than body copy',await body.locator('..').locator(':scope > p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=20));
 check('table keeps rounded border, readable cells and padded labels',await body.locator('table').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16&&parseFloat(getComputedStyle(el.parentElement).borderRadius)>=8&&parseFloat(getComputedStyle(el.querySelector('td')).paddingTop)>=12));
 check('source citations remain subordinate',await body.locator('sup').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)===11));
 check('no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await body.screenshot({path:path.join(output,mode+'-answer.png')});await page.screenshot({path:path.join(output,mode+'-conversation.png'),fullPage:true});
 const dock=page.locator('.home-composer-dock');
 check('responsive composer remains usable',await dock.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return innerWidth<768?s.position==='static':s.position==='fixed'&&r.bottom<=innerHeight+1;})&&await input.evaluate(el=>getComputedStyle(el).resize==='vertical'));
 await page.getByRole('button',{name:'Open goal: Reduce turnover',exact:true}).click();await page.locator('[data-plan-current="true"]').waitFor();
 const summary=page.getByRole('list',{name:'Selected plan summary',exact:true}).first();await summary.waitFor();
 check('plan labels and boxed sections are readable',await summary.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16&&[...el.children].every(n=>parseFloat(getComputedStyle(n).paddingTop)>=16&&getComputedStyle(n).borderTopStyle==='solid')));
 check('plan controls have readable type',await page.getByRole('tab',{name:'Action Plan #1',exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
 if(mode==='desktop'){await summary.locator(':scope > li').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,mode+'-plan.png')});}else await summary.screenshot({path:path.join(output,mode+'-plan.png')});
 const filters=page.locator('.global-workforce-filters');
 check('form fields use 16px type',await filters.locator('select').evaluateAll(nodes=>nodes.length>0&&nodes.every(el=>parseFloat(getComputedStyle(el).fontSize)>=16)));
 check('plan has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Real navigation to the resizable chat panel. Exercise keyboard bounds and pointer drag.
 const nav=page.getByRole('button',{name:'Open navigation',exact:true});if(await nav.isVisible())await nav.click();
 await page.locator('[data-nav-destination="workforce"]').click();await page.getByLabel('Ask People Analytics AI',{exact:true}).waitFor();
 if(mode==='desktop'){
  const resizer=page.getByRole('separator',{name:'Resize AI panel',exact:true});await resizer.focus();await page.keyboard.press('Home');const min=Number(await resizer.getAttribute('aria-valuenow'));await page.keyboard.press('End');const max=Number(await resizer.getAttribute('aria-valuenow'));
  check('keyboard panel resize retains both bounds',min===0&&max===100);await page.evaluate(()=>scrollTo(0,0));const r=await resizer.boundingBox(),dragY=Math.max(r.y+50,300);await page.mouse.move(r.x+r.width/2,dragY);await page.mouse.down();await page.mouse.move(r.x-70,dragY,{steps:5});await page.mouse.up();await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Resize AI panel"]').getAttribute('aria-valuenow'))<100);check('pointer panel resize still works',Number(await resizer.getAttribute('aria-valuenow'))<100);
 }
 check('secondary chat heading and composer stay readable',await page.locator('.app-ai-panel h2').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=24)&&await page.getByLabel('Ask People Analytics AI',{exact:true}).evaluate(el=>getComputedStyle(el).fontSize==='16px'));
 const introClose=page.getByRole('button',{name:'Close chatbot introduction',exact:true});if(await introClose.isVisible())await introClose.click();
 const panelInput=page.getByLabel('Ask People Analytics AI',{exact:true});await panelInput.scrollIntoViewIfNeeded();check('secondary composer is reachable without clipping',await panelInput.evaluate(el=>{const r=el.getBoundingClientRect(),panel=el.closest('.app-ai-panel').getBoundingClientRect();return r.top>=panel.top&&r.bottom<=panel.bottom+1;}));
 await page.locator('.app-ai-panel').screenshot({path:path.join(output,mode+'-ai-panel.png')});check('no runtime errors and only one mocked chat call',errors.length===0&&calls===1);
 await context.close();
 }
 for(const item of homeStarterGroups.flatMap(group=>group.prompts)){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),sent=[];
  await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();if(url.pathname==='/api/chat'){sent.push(req.postDataJSON());return route.fulfill({json:{answer:'Review the known inputs and editable assumptions before choosing a plan.',nextStep:'none'}});}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue();});
  await page.goto(base);await dismissHomeOnboarding(page);const input=page.getByLabel('Ask Workforce AI',{exact:true});await input.fill('Keep my draft');
  await page.getByRole('button',{name:item.label,exact:true}).click();await page.locator('[aria-label="Overview conversation"] .home-answer').last().waitFor();
  assert.equal(sent.length,1,item.label+' sends once');assert.equal(sent[0].message.split('\n\n')[0],item.prompt,item.label+' sends exact prompt');assert.equal(await input.inputValue(),'Keep my draft',item.label+' preserves the draft');checks.push('click-to-send: '+item.label);console.log('PASS click-to-send: '+item.label);await context.close();
 }
}finally{await browser.close();}
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({count:checks.length,output}));
