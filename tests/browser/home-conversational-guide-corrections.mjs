// Fictional fixtures only: exercise guide ordering through real browser controls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {homeGuideOriginField} from '../../lib/home-guide-origin.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {candidate,activity,evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3521',out=process.env.SOLUTION_SCREENSHOTS??'/tmp/guide-corrections';
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),records=[];
const check=(name,pass)=>{assert.ok(pass,name);records.push(name);console.log('PASS '+name);};
try{for(const [mode,width,height]of [['desktop',1366,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],posts=[];let unexpected=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 const originalChat={messages:[{role:'user',content:'Keep earlier fictional discussion'}],input:'Keep my unsent question',problem:null,questionUnanswered:false,resetMarks:{}};
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'existing',statement:'Protect existing work'}]},workspaces:{existing:{savedAt:'2026-10-01T00:00:00Z',fields:{previousPlan:{keep:true}}}},exploration:{savedAt:'2026-10-01T00:00:00Z',fields:{chat:originalChat,otherWorking:{keep:'previous proposal'}}}})});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.href==='https://va.vercel-scripts.com/v1/script.debug.js')return route.fulfill({contentType:'application/javascript',body:''});if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();posts.push(body);
   try{
    const old=body.state.working.filter(item=>item.id==='mentoring').at(-1),c=candidate();c.goal={statement:'Reduce turnover',turnId:old?.candidate.goal.turnId??body.message.id};
    if(old){c.base={kind:'working',id:old.id,revision:old.revision};c.activities=old.candidate.activities.map(item=>({...item,mode:'retain',source:{...c.base,activityId:item.id}}));c.activities.push({...activity('c2','Peer check-in'),audienceOf:'c1'});}
    const alternative=candidate('earlier-alternative');alternative.name='Earlier unchosen alternative';alternative.goal={...c.goal};
    const steps=old?[evaluate(c),final('Review the refined mentoring proposal.',['mentoring'])]:[evaluate(c),evaluate(alternative),final('Compare these two fictional approaches.',['mentoring','earlier-alternative'])];
    return route.fulfill({json:await converseSolutions(body,fixtureRuntime(steps),new AbortController().signal)});
   }catch(error){return route.fulfill({status:422,json:{error:String(error)}});}
  }
  if(url.pathname==='/api/chat'||url.pathname==='/api/home-plan-conversation'){unexpected++;return route.fulfill({status:500,json:{error:'Unexpected model route'}});}
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:123,fte:123,open_positions:3,snapshot_date:'2026-09-30'}}});return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),guide=page.getByRole('dialog',{name:'Optional guided demo'}),review=page.getByRole('region',{name:'Solution conversation review'});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY),step=n=>guide.getByRole('heading',{name:new RegExp('^Step '+n+' of 6:')}).waitFor(),choose=id=>review.locator(`[data-guide-target="choose-proposal"][data-guide-candidate="${id}"]`);
 const send=async text=>{if(text)await input.fill(text);await button('Send overview question').click();};
 const open=async()=>{await button('Show instructions').click();await button('Try a guided example').click();await button('Next → Start example').click();await step(2);};
 const waitDraft=async text=>page.waitForFunction(text=>document.querySelector('[aria-label="Ask Workforce AI"]')?.value===text,text);
 try{
  await page.goto(base);await input.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-guide-target="submit"]').disabled);const before=await state();
  await open();await send();await step(3);await input.fill('Keep the main approach and add a peer check-in using the same participants.');const draft=await input.inputValue();await choose('mentoring').click();await step(5);
  const chosen=await state(),id=chosen.goals.activeId,first=chosen.workspaces[id].fields.homePlanAlternativesV1;
  check(mode+' early choice adopts saved goal and preserves unsent refinement',id.startsWith('guided-')&&first.attachments.length===1&&await guide.getByRole('alert').count()===0&&await input.inputValue()===draft);
  check(mode+' guide-first save is explicitly fictional and preserves prior work',chosen.workspaces[id].fields[homeGuideOriginField].goalId===id&&JSON.stringify(chosen.workspaces.existing)===JSON.stringify(before.workspaces.existing)&&JSON.stringify(chosen.exploration)===JSON.stringify(before.exploration));
  const calls=posts.length;for(let n=4;n>=1;n--){await button('Back').click();await step(n);}for(let n=2;n<=5;n++){await button('Continue walkthrough').click();await step(n);}
  check(mode+' early selection Back and Continue preserve saved history without replay',posts.length===calls&&(await state()).workspaces[id].fields.homePlanAlternativesV1.attachments.length===1&&await input.inputValue()===draft&&await guide.getByRole('alert').count()===0);
  await send();await step(6);const lastRequest=posts.at(-1).requestId;
  await page.waitForFunction(request=>{const b=document.querySelector('[data-guided-highlight="true"]');return b?.dataset.guideCandidate==='mentoring'&&b.dataset.guideRevision==='2'&&b.dataset.guideRequest===request;},lastRequest);
  check(mode+' final arrow identifies refined candidate among multiple choices',await choose('earlier-alternative').isEnabled()&&await choose('mentoring').isEnabled());
  await choose('earlier-alternative').click();await guide.getByRole('status').filter({hasText:'That alternative is saved.'}).waitFor();
  check(mode+' older alternative is saved without falsely completing refinement',await guide.getByRole('heading',{name:/^Step 6/}).isVisible()&&(await state()).workspaces[id].fields.homePlanAlternativesV1.attachments.length===2);
  await page.screenshot({path:out+'/'+mode+'-older-alternative-kept.png',fullPage:true});await choose('mentoring').click();await guide.getByRole('heading',{name:'Original and revised plans attached',exact:true}).waitFor();
  const complete=await state(),catalog=complete.workspaces[id].fields.homePlanAlternativesV1;
  check(mode+' exact refined choice completes with all three attachments intact',catalog.attachments.length===3&&catalog.plans.length===3&&JSON.stringify(catalog.plans[0])===JSON.stringify(first.plans[0]));
  await button('Finish example').click();await guide.waitFor({state:'hidden'});await waitDraft(originalChat.input);await page.reload();await waitDraft(originalChat.input);
  check(mode+' completed guide retains Demo example label after reload',await button('Open goal: Reduce turnover').getByText('Demo example',{exact:true}).count()===1&&(await state()).goals.activeId==='');
  const savedExample=JSON.stringify((await state()).workspaces[id]);await send('I want to reduce turnover for my own goal. Keep missing information unknown.');await choose('mentoring').waitFor();await choose('mentoring').click();await button('Selected as Action Plan #1').waitFor();
  const real=await state(),realId=real.goals.activeId;
  check(mode+' real same-worded goal can be selected after guide completion and reload',realId!==id&&!realId.startsWith('guided-')&&real.goals.goals.filter(g=>g.statement==='Reduce turnover').length===2&&real.workspaces[realId].fields[homeGuideOriginField]===undefined&&JSON.stringify(real.workspaces[id])===savedExample);
  await page.reload();await button('Selected as Action Plan #1').waitFor();
  check(mode+' fictional and real labels stay distinct after real-goal reload',await button('Open goal: Reduce turnover').count()===2&&await button('Open goal: Reduce turnover').getByText('Demo example',{exact:true}).count()===1);
  // Exit and reload after an early choice both keep saved example work and return to the real goal.
  for(const leave of ['exit','reload']){
   await open();await send();await step(3);await choose('mentoring').click();await step(5);const earlyId=(await state()).goals.activeId,earlyPlan=JSON.stringify((await state()).workspaces[earlyId].fields.homePlanAlternativesV1),count=posts.length;
   if(leave==='exit')await button('Exit guide').click();else await page.reload();await guide.waitFor({state:'hidden'});await button('Selected as Action Plan #1').waitFor();const after=await state();
   check(mode+' '+leave+' after early choice restores real goal without losing example or replaying',after.goals.activeId===realId&&JSON.stringify(after.workspaces[earlyId].fields.homePlanAlternativesV1)===earlyPlan&&posts.length===count&&JSON.stringify(after.workspaces.existing)===JSON.stringify(before.workspaces.existing));
  }
  check(mode+' no runtime errors, unexpected network or horizontal overflow',!errors.length&&!unexpected&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }catch(error){await page.screenshot({path:out+'/'+mode+'-failure.png',fullPage:true});await writeFile(out+'/'+mode+'-failure.txt',await page.locator('body').innerText());console.log(JSON.stringify({errors,unexpected,posts:posts.length,status:await page.getByRole('status').allTextContents()}));throw error;}finally{await context.close();}
}}finally{await browser.close();}
await writeFile(out+'/results.json',JSON.stringify({checks:records.length,records,fixturesOnly:true,paidModelCalls:0},null,2)+'\n');console.log(JSON.stringify({checks:records.length,fixturesOnly:true,paidModelCalls:0}));
