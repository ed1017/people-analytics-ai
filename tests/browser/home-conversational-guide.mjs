// Scripted browser contract: no live model or hosted route is called.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {createHomeDemoGoals} from '../../lib/home-demo-goals.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {candidate,activity,evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3517',out=process.env.SOLUTION_SCREENSHOTS??'/tmp/conversational-guide';
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;const records=[];
const check=(name,pass)=>{assert.ok(pass,name);checks++;records.push(name);console.log('PASS '+name);};
try{for(const [mode,width,height]of [['desktop',1366,900],['mobile',390,844],['short-mobile',390,480]].filter(([mode])=>!process.env.GUIDE_QA_MODE||mode===process.env.GUIDE_QA_MODE)){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],posts=[];let failed=false,hold=false,release=null,unexpected=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 const originalChat={messages:[{role:'user',content:'Keep this previous fictional discussion'}],input:'Keep my unsent question',problem:null,questionUnanswered:false,resetMarks:{}};
 const demo=mode==='desktop'?createHomeDemoGoals('2026-10-01T00:00:00Z'):null,origin=demo?.goals.goals[0].id??'';if(demo)demo.workspaces[origin].fields.chat=originalChat;
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:origin,goals:[...(demo?.goals.goals??[]),{id:'existing',statement:'Reduce turnover'}]},workspaces:{...demo?.workspaces,existing:{savedAt:'2026-10-01T00:00:00Z',fields:{previousPlan:{keep:true}}}},exploration:{savedAt:'2026-10-01T00:00:00Z',fields:{chat:originalChat,otherWorking:{keep:'previous proposal'}}}})});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.href==='https://va.vercel-scripts.com/v1/script.debug.js')return route.fulfill({contentType:'application/javascript',body:''});if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();posts.push(body);if(hold){hold=false;await new Promise(resolve=>{release=resolve;});}if(failed){failed=false;return route.fulfill({status:422,json:{error:'Fictional reply unavailable. Your work is kept.'}});}
   try{
    const old=body.state.working.at(-1),c=candidate();c.goal={statement:'Reduce turnover',turnId:old?.candidate.goal.turnId??body.message.id};
    if(old){c.base={kind:'working',id:old.id,revision:old.revision};c.activities=old.candidate.activities.map(item=>({...item,mode:'retain',source:{...c.base,activityId:item.id}}));if(body.goal.id)c.activities.push({...activity('c2','Peer check-in'),audienceOf:'c1'});else c.activities[0]={...c.activities[0],mode:'adapt',ownerRole:'Volunteer coordinator',step:'Volunteers lead the trial and review feedback.'};}
    const reply=await converseSolutions(body,fixtureRuntime([evaluate(c),final('Review this fictional proposal; its missing resources and dates remain unknown.',['mentoring'])]),new AbortController().signal);return route.fulfill({json:reply});
   }catch(error){return route.fulfill({status:422,json:{error:String(error)}});}
  }
  if(url.pathname==='/api/chat'||url.pathname==='/api/home-plan-conversation'){unexpected++;return route.fulfill({status:500,json:{error:'Unexpected model route'}});}
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:123,fte:123,open_positions:3,snapshot_date:'2026-09-30'}}});return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),guide=page.getByRole('dialog',{name:'Optional guided demo'}),review=page.getByRole('region',{name:'Solution conversation review'});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY),step=n=>guide.getByRole('heading',{name:new RegExp('^Step '+n+' of 6:')}).waitFor();
 const open=async()=>{await button('Show instructions').click();await button('Try a guided example').click();await step(1);};
 const send=async text=>{if(text)await input.fill(text);await button('Send overview question').click();};
 const arrow=async target=>{try{await page.waitForFunction(target=>{const node=document.querySelector('[data-guided-highlight="true"]'),popup=document.querySelector('[data-guided-popup]'),arrow=document.querySelector('[data-guided-arrow]');if(!node||node.dataset.guideTarget!==target||!popup||!arrow)return false;const n=node.getBoundingClientRect(),p=popup.getBoundingClientRect(),a=arrow.getBoundingClientRect();return n.top>=0&&n.bottom<=innerHeight&&node.contains(document.elementFromPoint(n.left+n.width/2,n.top+n.height/2))&&p.top>=0&&p.bottom<=innerHeight&&a.top>=0&&a.bottom<=n.top;},target);}catch(error){console.log('ARROW',await page.evaluate(()=>Object.fromEntries(['[data-guided-highlight="true"]','[data-guided-popup]','[data-guided-arrow]'].map(selector=>[selector,document.querySelector(selector)?.getBoundingClientRect().toJSON()]))));throw error;}check(mode+' arrow targets clickable '+target,true);};
 try{
  await page.goto(base);await input.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-guide-target="submit"]').disabled);
  const before=await state();await open();check(mode+' opening guide is passive',posts.length===0&&await input.inputValue()===originalChat.input);
  await button('Next → Start example').click();await step(2);await arrow('submit');
  check(mode+' guide starts without fields or saving a goal',!(await state()).goals.activeId&&await review.locator('input,select,textarea').count()===0);
  failed=true;await send();await page.getByText('Fictional reply unavailable. Your work is kept.',{exact:true}).waitFor();check(mode+' failed reply does not advance or retry',posts.length===1&&await guide.getByRole('heading',{name:/^Step 2/}).isVisible());
  await send();await step(3);check(mode+' completed proposal advances while goal stays unsaved',!(await state()).goals.activeId&&posts.at(-1).state.working.length===0);
  await send('Make that trial volunteer-led. Keep missing dates and costs unknown.');await step(4);await arrow('choose-proposal');
  check(mode+' default review has no goal, budget, date or overlap inputs',await review.locator('input,select,textarea').count()===0&&await review.getByRole('button',{name:'Choose this plan with unknowns'}).isEnabled());
  await page.screenshot({path:out+'/'+mode+'-choose-proposal.png',fullPage:true});
  await review.getByRole('button',{name:'Open goal form',exact:true}).click();check(mode+' a form opens only when explicitly requested',await review.getByLabel('Goal for this proposal').isVisible());await review.getByRole('button',{name:'Close goal form',exact:true}).click();
  const calls=posts.length;await button('Back').click();await step(3);await button('Continue walkthrough').click();await step(4);check(mode+' Back and Continue do not replay requests or select',posts.length===calls&&!(await state()).goals.activeId);
  await review.getByRole('button',{name:'Choose this plan with unknowns',exact:true}).click();await step(5);
  const chosen=await state(),id=chosen.goals.activeId,first=chosen.workspaces[id].fields.homePlanAlternativesV1;
  check(mode+' one selection saves goal and proposal with no manual pin step',id.startsWith('guided-')&&first.attachments.length===1&&first.attachments[0].purpose==='proposal-selection'&&chosen.goals.goals.length===before.goals.goals.length+1);
  check(mode+' earlier real goal and unpinned work survive example selection',JSON.stringify(chosen.workspaces.existing)===JSON.stringify(before.workspaces.existing)&&JSON.stringify(chosen.exploration)===JSON.stringify(before.exploration));
  await send();await step(6);await arrow('choose-proposal');await review.getByRole('button',{name:'Choose this plan with unknowns',exact:true}).click();await guide.getByRole('heading',{name:'Original and revised plans attached',exact:true}).waitFor();
  const complete=await state(),catalog=complete.workspaces[id].fields.homePlanAlternativesV1;check(mode+' revised selection preserves both exact proposal versions',catalog.attachments.length===2&&catalog.plans.length===2&&JSON.stringify(catalog.plans[0])===JSON.stringify(first.plans[0]));
  await guide.screenshot({path:out+'/'+mode+'-completed.png'});await button('Finish example').click();await guide.waitFor({state:'hidden'});check(mode+' finish restores previous draft and does not replay',await input.inputValue()===originalChat.input&&(await state()).goals.activeId===origin);
  await open();await button('Next → Start example').click();await step(2);hold=true;await send();while(!release)await page.waitForTimeout(10);await button('Exit guide').click();release();release=null;await page.waitForTimeout(150);check(mode+' exit cancels pending reply and restores prior work',await input.inputValue()===originalChat.input&&(await state()).goals.activeId===origin&&(await state()).goals.goals.length===before.goals.goals.length+1);
  const priorCalls=posts.length;await page.reload();await input.waitFor();await page.waitForFunction(text=>document.querySelector('[aria-label="Ask Workforce AI"]')?.value===text,originalChat.input);check(mode+' reload keeps work without resuming a guide or request',posts.length===priorCalls&&await guide.count()===0&&await input.inputValue()===originalChat.input);
  check(mode+' runtime and viewport are intact',!errors.length&&!unexpected&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }catch(error){await page.screenshot({path:out+'/'+mode+'-failure.png',fullPage:true});await writeFile(out+'/'+mode+'-failure.txt',await page.locator('body').innerText());console.log(JSON.stringify({errors,unexpected,viewport:await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})),posts:posts.length,status:await page.getByRole('status').allTextContents()}));throw error;}finally{release?.();await context.close();}
}}finally{await browser.close();}
await writeFile(out+'/results.json',JSON.stringify({checks,records,fixturesOnly:true,paidModelCalls:0},null,2)+'\n');console.log(JSON.stringify({checks,fixturesOnly:true,paidModelCalls:0}));
