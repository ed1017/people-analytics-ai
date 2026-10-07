import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
// Production build, intercepted synthetic evidence/model transport. Two real browser
// tabs exercise localStorage conflicts; this does not verify a hosted live model.
import assert from 'node:assert/strict';
import {retentionProposal} from '../fixtures/home-retention-proposal.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {DECISIONS_STORAGE_KEY,DECISION_RECOVERY_KEY} from '../../lib/local-decisions.ts';
import {readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3385',browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const goal='Reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget.';
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]])for(const scenario of (process.env.RECOVERY_SCENARIO?[process.env.RECOVERY_SCENARIO]:['identity','direct-attach','competing-plan-4'])){
 const label=mode+' '+scenario,context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];let external=0;
 const button=(p,name)=>p.getByRole('button',{name,exact:true}),chat=p=>p.getByLabel('Ask Workforce AI',{exact:true}),panel=p=>p.getByRole('region',{name:'Action Plans for your goal',exact:true}),tab=(p,n)=>panel(p).getByRole('tab',{name:'Action Plan #'+n,exact:true});
 const setup=p=>{p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));};setup(page);
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==base){external++;return route.abort()}if(u.pathname==='/api/chat'){const body=req.postDataJSON();posts.push(body);return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:retentionProposal(body.goalContext.goal)}:{answer:'The requested target is a 2-percentage-point reduction over 12 months. The illustrative budget is $100,000. A matching baseline and population are unknown.',nextStep:'none'}})}if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname==='/api/dashboard'?scopeDashboard(u.search):scopeEnterprise[u.pathname.slice(5)]??{}});return route.continue()});
 // Deterministically delay only the test tab's storage-event delivery to reproduce
 // the atomic commit race. The application's getItem/write guards remain intact.
 if(scenario!=='identity')await page.addInitScript(()=>window.addEventListener('storage',event=>event.stopImmediatePropagation(),true));
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY),send=async(p,text)=>{await chat(p).fill(text);await button(p,'Send overview question').click()},ready=async p=>{await tab(p,1).waitFor();await p.locator('[data-plan-current="true"]').waitFor()};
 const attach=async p=>{const ack=panel(p).getByRole('checkbox');if(await ack.count())await ack.check();await button(p,'Attach Action Plan').click()};
 let id;const fields=async()=>(await state()).workspaces[id].fields,catalog=async()=>readPlanAlternatives((await fields()).homePlanAlternativesV1,{goalId:id,goal}),history=async()=>({legacy:(await fields()).homeSolutionBundlesV1?.attachments??[],numbered:(await catalog())?.attachments??[]});
 const recover=async()=>{await button(page,'Retry saving').click();if(await button(page,'Keep saved versions and my request').count())await button(page,'Keep saved versions and my request').click();await page.locator('[data-plan-current="true"]').waitFor()};
 try{
  await page.goto(base);await dismissHomeOnboarding(page);await chat(page).waitFor();await send(page,goal);await page.locator('[data-guide-target="pin"]').click();await ready(page);id=(await state()).goals.activeId;
  await attach(page);await page.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();const originalHistory=JSON.stringify((await history()).legacy);
  if(scenario==='direct-attach')await tab(page,3).click();else await chat(page).fill('Set coordination hours to 24');
  // Wait until tab A's original selection/request is actually saved before B reads it.
  await page.waitForFunction(({key,id,text})=>JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.chat.input===text,{key:DECISIONS_STORAGE_KEY,id,text:scenario==='direct-attach'?'':'Set coordination hours to 24'});
  const other=await context.newPage();setup(other);await other.goto(base);await dismissHomeOnboarding(other);await ready(other);
  if(scenario==='direct-attach'){
   await tab(other,2).click();await attach(other);await other.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();const remoteHistory=JSON.stringify(await history());
   check(label+' has no typed draft before direct Attach',await chat(page).inputValue()==='');await button(page,'Attach Action Plan').click();await button(page,'Retry saving').waitFor();
   check(label+' failed Attach leaves newer attachments unchanged',JSON.stringify(await history())===remoteHistory);
   check(label+' direct atomic conflict creates a tab recovery journal',await page.evaluate(key=>!!sessionStorage.getItem(key),DECISION_RECOVERY_KEY));
   await recover();await tab(page,3).click();await attach(page);await page.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();
   const current=await history();check(label+' explicit retry retains all three distinct attachments',current.legacy.length===3&&JSON.stringify(current.legacy.slice(0,2))===JSON.stringify(JSON.parse(remoteHistory).legacy)&&JSON.stringify(current.legacy[0])===JSON.stringify(JSON.parse(originalHistory)[0]));
   await page.reload();await ready(page);check(label+' attachment history survives reload without replay',(await history()).legacy.length===3&&posts.length===2);
  }else{
   await send(other,'In Action Plan #2 set coordination hours to 30');await tab(other,4).waitFor();await attach(other);await other.getByRole('status').filter({hasText:/Action Plan #4 attached/}).waitFor();
   const winner=await catalog(),winnerPlan=JSON.stringify(winner.plans.find(plan=>plan.number===4)),winnerHistory=JSON.stringify(await history());
   if(scenario==='competing-plan-4'){
    await button(page,'Send overview question').click();await button(page,'Retry saving').waitFor();
    const journal=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),DECISION_RECOVERY_KEY);
    check(label+' stale competing #4 is never published or placed in recovery',JSON.stringify((await catalog()).plans.find(plan=>plan.number===4))===winnerPlan&&!JSON.parse(journal.draft).payload.workspaces[id].fields.homePlanAlternativesV1&&JSON.stringify(await history())===winnerHistory);
    await page.reload();await button(page,'Retry saving').waitFor();
   }
   await recover();await tab(page,4).waitFor();await page.getByRole('region',{name:'Confirm plan for recovered request'}).waitFor();
   check(label+' recovery preserves exact unsent request and saved selected #4',await chat(page).inputValue()==='Set coordination hours to 24'&&await tab(page,4).getAttribute('aria-selected')==='true'&&JSON.stringify((await catalog()).plans.find(plan=>plan.number===4))===winnerPlan);
   await page.reload();await ready(page);await page.getByRole('region',{name:'Confirm plan for recovered request'}).waitFor();await button(page,'Send overview question').click();
   check(label+' actual unconfirmed resubmission cannot silently edit #4',(await catalog()).nextNumber===5&&await chat(page).inputValue()==='Set coordination hours to 24'&&JSON.stringify(await history())===winnerHistory);
   // Confirming #4 then changing selection must invalidate that acknowledgment.
   await button(page,'Use Action Plan #4 for this recovered request').click();await tab(page,1).click();await button(page,'Send overview question').click();
   check(label+' selecting another plan invalidates the previous confirmation',(await catalog()).nextNumber===5);
   const confirm=button(page,'Use Action Plan #1 for this recovered request');await confirm.scrollIntoViewIfNeeded();check(label+' confirmation is reachable above the composer',await confirm.evaluate(node=>{const rect=node.getBoundingClientRect();return node.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2));}));if(scenario==='identity')await page.screenshot({path:'/tmp/pr176-recovery-confirm-'+mode+'.png'});await confirm.click();await chat(page).fill('Set coordination hours to 25');await button(page,'Send overview question').click();
   check(label+' changing the request invalidates confirmation and preserves the requirement',(await catalog()).nextNumber===5);
   await chat(page).fill('Set coordination hours to 24');await button(page,'Use Action Plan #1 for this recovered request').click();await button(page,'Send overview question').click();await tab(page,5).waitFor();
   const revised=(await catalog()).plans.find(plan=>plan.number===5),source=(await catalog()).plans.find(plan=>plan.number===1);
   check(label+' confirmed real resubmission creates #5 from Plan 1 only',revised.sourceRefs[0].id===source.id&&revised.draft.inputs.deliveryEstimate.coordinationHours.value===24&&JSON.stringify((await catalog()).plans.find(plan=>plan.number===4))===winnerPlan);
   await attach(page);await page.getByRole('status').filter({hasText:/Action Plan #5 attached/}).waitFor();const finalHistory=JSON.stringify(await history());
   check(label+' attaching #5 preserves original and winning #4 history',JSON.stringify((await history()).legacy)===originalHistory&&(await history()).numbered.length===2&&(await history()).numbered[0].planId===winner.plans.find(plan=>plan.number===4).id&&(await history()).numbered[1].planId===revised.id);
   await page.reload();await ready(page);check(label+' reload keeps stable next number and all attachments',(await catalog()).nextNumber===6&&JSON.stringify(await history())===finalHistory&&!(await fields()).chat.recoveredPlanSelectionRequired);
  }
  check(label+' no model replay, external requests, errors, or overflow',posts.length===2&&external===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await other.close();
 }catch(error){console.log(label,await page.getByRole('alert').allTextContents());await page.screenshot({path:'/tmp/pr176-recovery-'+mode+'-'+scenario+'-failure.png',fullPage:true});throw error}finally{await context.close()}
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
