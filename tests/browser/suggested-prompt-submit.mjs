// Real built shell; all source/model requests intercepted, never sent to providers.
import assert from 'node:assert/strict';
import {withProblemContext} from '../../lib/problem-session.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {workforce,attrition,survey,talent,career} from '../fixtures/theme-audit-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3224';
const originalDraft='What do recorded separation patterns show, and what remains unexplained?';
const seed={version:1,revision:1,goals:{version:1,activeId:'retention',goals:[{id:'retention',statement:'Investigate workforce patterns'},{id:'other',statement:'Review a separate saved goal'}]},workspaces:{retention:{savedAt:'2026-10-08T00:00:00Z',fields:{chat:{messages:[],input:originalDraft,problem:null,questionUnanswered:false},sentinel:{keep:'Existing plan and approvals'},workforceSolutionPins:[]}}}};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['desktop',1366,900],['touch',390,844],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),posts=[],errors=[];let hold=false,fail=false,release,unexpected=0,sourceMissing=false;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base){unexpected++;return route.abort()}
  if(u.pathname==='/api/chat'){const body=req.postDataJSON();if(body.summaryOnly)return route.fulfill({json:{answer:'Synthetic summary.'}});posts.push(body);if(hold)await new Promise(resolve=>release=resolve);return route.fulfill({status:fail?502:200,json:fail?{error:'Synthetic unavailable'}:{answer:'Synthetic answer for '+body.page+': '+body.message,nextStep:'none'}}).catch(()=>{});}
  if(u.pathname.startsWith('/api/'))return route.fulfill({status:sourceMissing?503:200,json:sourceMissing?{error:'Synthetic source unavailable'}:u.pathname==='/api/dashboard'?scopeDashboard(u.search):({'/api/workforce':workforce,'/api/attrition':attrition,'/api/survey-sentiment':survey,'/api/talent-acquisition':talent,'/api/career-growth-mobility':career}[u.pathname]??{})});
  return route.continue();
 });
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 const input=page.getByRole('textbox',{name:'Ask People Analytics AI',exact:true}),suggestions=()=>page.getByRole('region',{name:'Suggested questions',exact:true}),first=()=>suggestions().getByRole('button').first();
 const idle=()=>page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);
 const count=async value=>{for(let i=0;i<100&&posts.length<value;i++)await page.waitForTimeout(20);assert.equal(posts.length,value)};
 const navigate=async destination=>{await page.evaluate(destination=>{const u=new URL(location.href);u.searchParams.set('page',destination);history.pushState(null,'',u);dispatchEvent(new PopStateEvent('popstate'));},destination);await input.waitFor()};
 await page.goto(base+'/?page=talent-acquisition');await input.waitFor();await idle();
 check(mode+' screenshot draft survives entry',await input.inputValue()===originalDraft&&await first().isEnabled());
 const chosen=await first().innerText(),before=posts.length;hold=true;
 if(mode==='touch')await first().tap();else if(mode==='zoom'){await first().focus();await page.keyboard.press('Space');}else await first().evaluate(n=>{n.click();n.click()});
 await count(before+1);await page.waitForTimeout(100);
 check(mode+' one exact clicked question with current topic and goal',posts.length===before+1&&posts.at(-1).message===withProblemContext(chosen,null,seed.goals.goals[0].statement)&&posts.at(-1).page==='talent-acquisition'&&posts.at(-1).goalContext.goal===seed.goals.goals[0].statement);
 check(mode+' unrelated draft is retained during pending request',await input.inputValue()===originalDraft&&await first().isDisabled()&&await page.getByRole('button',{name:'Send message',exact:true}).isDisabled());
 await first().evaluate(n=>n.click());check(mode+' pending activation cannot send again',posts.length===before+1);
 await input.fill(originalDraft+' Keep editing.');hold=false;release();await idle();
 check(mode+' success preserves newer draft',await input.inputValue()===originalDraft+' Keep editing.');
 await page.locator('[data-ai-conversation-body]').screenshot({path:'/tmp/suggested-prompts-'+mode+'.png'});
 await input.fill('');const next=suggestions().getByRole('button').nth(1),exact=await next.innerText(),empty=posts.length;await next.focus();await page.keyboard.press('Enter');await count(empty+1);await idle();
 check(mode+' empty composer keyboard sends without second Send',posts.at(-1).message===withProblemContext(exact,null,seed.goals.goals[0].statement)&&await input.inputValue()==='');
 await input.fill('Draft retained on error');fail=true;const failed=posts.length,last=suggestions().getByRole('button').last();await last.click();await count(failed+1);await page.getByText('Synthetic unavailable',{exact:true}).last().waitFor();
 check(mode+' failure preserves unrelated text and re-enables suggestions',await input.inputValue()==='Draft retained on error'&&await first().isEnabled());
 // Explicit Send still sends the draft through the ordinary handler.
 fail=false;const manual=posts.length;await page.getByRole('button',{name:'Send message',exact:true}).click();await count(manual+1);await idle();check(mode+' manual Send uses draft rather than last suggestion',posts.at(-1).message===withProblemContext('Draft retained on error',null,seed.goals.goals[0].statement)&&await input.inputValue()==='');
 // A selection invalidated in the same event must not use a previous page closure.
 const stale=posts.length;await first().evaluate(n=>{n.click();const u=new URL(location.href);u.searchParams.set('page','attrition');history.pushState(null,'',u);dispatchEvent(new PopStateEvent('popstate'));});await idle();await page.waitForTimeout(150);check(mode+' queued old-topic suggestion cancelled',posts.length===stale);
 // A pending response must not appear on a different topic or resend on return.
 hold=true;const pending=posts.length;await first().click();await count(pending+1);await navigate('talent-acquisition');hold=false;release();await idle();await page.waitForTimeout(100);check(mode+' navigation discards late answer without repeat',posts.length===pending+1&&!(await page.locator('[aria-label="AI conversation"]').innerText()).includes('Synthetic answer for attrition'));
 await input.fill('Draft for original goal');const switched=posts.length;
 await first().evaluate(n=>{n.click();const select=document.querySelector('select[aria-label="Selected goal"]');select.value='other';select.dispatchEvent(new Event('change',{bubbles:true}));});await idle();await page.waitForTimeout(150);
 check(mode+' goal change cancels queued question and restores separate composer',posts.length===switched&&await input.inputValue()==='');
 const currentQuestion=await first().innerText();fail=true;await first().click();await count(switched+1);await page.getByText('Synthetic unavailable',{exact:true}).last().waitFor();
 check(mode+' new goal used and failed empty-composer question recoverable',posts.at(-1).goalContext.goal===seed.goals.goals[1].statement&&posts.at(-1).message===withProblemContext(currentQuestion,null,seed.goals.goals[1].statement)&&await input.inputValue()===currentQuestion);
 fail=false;await page.getByRole('combobox',{name:'Selected goal',exact:true}).selectOption('retention');await idle();check(mode+' original goal draft remains recoverable',await input.inputValue()==='Draft for original goal');
 const snapshot=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 check(mode+' no plan saves pins approvals or goal changes',snapshot.goals.activeId===seed.goals.activeId&&JSON.stringify(snapshot.goals.goals.map(({id,statement})=>({id,statement})))===JSON.stringify(seed.goals.goals)&&JSON.stringify(snapshot.workspaces.retention.fields.sentinel)===JSON.stringify(seed.workspaces.retention.fields.sentinel)&&snapshot.workspaces.retention.fields.workforceSolutionPins.length===0&&!snapshot.workspaces.retention.fields.workforceSolution);
 sourceMissing=true;await page.reload();await input.waitFor();await page.waitForTimeout(300);check(mode+' unavailable evidence disables suggestion sends',await first().isDisabled());
 check(mode+' responsive no provider traffic or runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&unexpected===0&&errors.length===0);
 await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
