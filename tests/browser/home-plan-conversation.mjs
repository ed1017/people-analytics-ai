import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {conversationBundleProposal,operation,proposal} from '../fixtures/home-plan-conversation.mjs';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3501',output=process.env.PLAN_CONVERSATION_SCREENSHOTS??'/tmp/plan-conversation-preview';
// An explicit target uses the preserved success-measure contract, not a legacy illustrative-baseline what-if.
const goal='Reduce turnover by 3 percentage points';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name);};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let unexpected=0,release=null,held=false,failNext=false,injectedResponse=null;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:new Date('2026-10-07T12:00:00Z')});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname==='/api/home-plan-conversation'){
   const body=req.postDataJSON();requests.push(body);
   if(held){held=false;await new Promise(resolve=>{release=resolve;});}
   if(failNext){failNext=false;return route.fulfill({status:422,json:{error:'Fixture response unavailable. Nothing was saved.'}});}
   const raw=readPlanAlternatives(body.catalog,body.context),selected=raw.plans.find(plan=>plan.id===body.selectedId);
   let response;
   if(injectedResponse){response=injectedResponse(body,selected);injectedResponse=null;}
   else if(body.text==='Can we weave these two together?')response=body.comparisonIds.length===2?proposal('combine',body.comparisonIds):proposal('clarify',[],[],'Which two displayed plans should I combine?');
   else if(body.text==='How do action plan one and two differ?')response=proposal('compare',['A','B']);
   else response=proposal('revise',[selected.id],[operation('budget_usd','4500','at most 4500')]);
   try{return await route.fulfill({json:{requestId:body.requestId,proposal:response}});}catch{return;}
  }
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();
   if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.')return route.fulfill({json:{proposal:conversationBundleProposal(body.goalContext.goal)}});
   return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Review manager support; its turnover effect is unknown.',next_step:'none',problem:'Review manager support',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']}],question:null}),Boolean(body.hasFocusedIssue),body.overviewBriefingContext)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),review=page.getByRole('region',{name:'Review saved-plan conversation',exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await page.goto(base);await dismissHomeOnboarding(page);await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'other',statement:'Improve support'}]},workspaces:{}})});await page.reload();
 const send=async text=>{await input.fill(text);await button('Send overview question').click();};
 await send(goal);await page.getByRole('button',{name:/^Pin (as goal|overall turnover goal)$/}).click();await page.locator('[data-plan-current="true"]').waitFor();
 const goalId=(await state()).goals.activeId,fields=async()=>(await state()).workspaces[goalId].fields;
 const catalog=async()=>{const raw=(await fields()).homePlanAlternativesV1;return raw?readPlanAlternatives(raw,{goalId,goal}):null;};
 check(mode+' opt-in composer uses existing real selected plans',await page.getByRole('checkbox',{name:/Discuss saved plans/}).isChecked());
 await send('We can spend at most 4500 on this.');await review.waitFor();
 check(mode+' request contains active goal, visible originals and selected stable ID',requests[0].context.goalId===goalId&&requests[0].selectedId==='A'&&readPlanAlternatives(requests[0].catalog,requests[0].context).plans.length===3);
 check(mode+' proposal is transient until explicit Save',await catalog()===null&&await button('Save as new alternative').isEnabled());
 await review.screenshot({path:output+'/'+mode+'-proposal.png'});
 await button('Save as new alternative').click();await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();
 const original=JSON.stringify((await catalog()).plans.slice(0,3));
 check(mode+' explicit Save creates unapplied unattached #4',(await catalog()).plans.length===4&&!(await catalog()).plans[3].applied&&(await catalog()).attachments.length===0);
 check(mode+' code computes the cap separately from cash',(await catalog()).plans[3].draft.inputs.budget.amount.value===4500&&(await catalog()).plans[3].draft.inputs.expenses[0].amount.value===1000);
 const beforeCompare=JSON.stringify(await catalog());await send('How do action plan one and two differ?');await review.waitFor();
 check(mode+' conversational comparison is read-only',await review.getByRole('article').count()===2&&await button('Save as new alternative').count()===0&&JSON.stringify(await catalog())===beforeCompare);await review.screenshot({path:output+'/'+mode+'-comparison.png'});await button('Close comparison').click();
 await send('Can we weave these two together?');await review.waitFor();check(mode+' ambiguous references ask one question and create nothing',await review.getByText('Which two displayed plans should I combine?',{exact:true}).isVisible()&&JSON.stringify(await catalog())===beforeCompare);await button('Cancel proposal').click();
 await panel.getByText('Choose plans to discuss together',{exact:true}).click();await page.getByLabel('Discuss Action Plan #1',{exact:true}).check();await page.getByLabel('Discuss Action Plan #2',{exact:true}).check();
 await send('Can we weave these two together?');await review.waitFor();check(mode+' selected pair is captured without guessing',JSON.stringify(requests.at(-1).comparisonIds)===JSON.stringify(['A','B']));
 await button('Save as new alternative').click();await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).waitFor();
 check(mode+' combined plan retains unknown overlap and originals',(await catalog()).plans[4].result.cashEstimate.cash===null&&JSON.stringify((await catalog()).plans.slice(0,3))===original);
 await panel.getByLabel('Confirm unresolved-assumption review').check();await button('Attach Action Plan').click();const attached=JSON.stringify((await catalog()).attachments);await page.reload();await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).waitFor();
 check(mode+' reload preserves new alternative, originals and attachment',JSON.stringify((await catalog()).attachments)===attached&&JSON.stringify((await catalog()).plans.slice(0,3))===original);
 await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).click();
 held=true;await send('We can spend at most 4500 on this.');await page.waitForFunction(()=>document.querySelector('[aria-label="Send overview question"]')?.textContent.includes('Reviewing'));while(!release)await new Promise(resolve=>setTimeout(resolve,10));
 await panel.getByRole('tab',{name:'Action Plan #2',exact:true}).click();await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).click();release();release=null;
 await page.getByText('The goal, selection or saved plans changed. Send the request again; nothing was saved.',{exact:true}).waitFor();
 check(mode+' selection A to B to A rejects the in-flight response',(await catalog()).plans.length===5&&await review.count()===0);
 await send('We can spend at most 4500 on this.');await review.waitFor();await panel.getByRole('tab',{name:'Action Plan #2',exact:true}).click();check(mode+' selection change disables Save on an existing review',await button('Save as new alternative').isDisabled());await button('Cancel proposal').click();
 await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).click();held=true;await send('We can spend at most 4500 on this.');while(!release)await new Promise(resolve=>setTimeout(resolve,10));await page.getByLabel('Selected goal',{exact:true}).selectOption('other');await button('Generate Action Plan').waitFor();await page.getByLabel('Selected goal',{exact:true}).selectOption(goalId);await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).waitFor();release();release=null;
 await page.waitForTimeout(100);check(mode+' goal A to B to A preserves plans and rejects late work',(await catalog()).plans.length===5&&await review.count()===0);
 const retained=JSON.stringify(await catalog());
 for(const [message,field,value,quote,error] of [
  ['Use twenty-one participants.','participants','twenty','twenty-one participants',/Quote the complete literal quantity/],
  ['Use ten thousand participants.','participants','ten','ten thousand participants',/quantity has an unsupported continuation/],
  ['Run this for 2 quarters.','horizon_months','2','2 quarters',/quoted units are unsupported/],
  ['Budget 9000 AUD.','budget_usd','9000','9000 AUD',/quoted units are unsupported/],
 ]){
  injectedResponse=(_body,selected)=>proposal('revise',[selected.id],[operation(field,value,quote,field==='participants'?selected.draft.inputs.groups[0].id:null)]);
  await send(message);await page.getByText(error).last().waitFor();check(mode+' rejects incomplete or unsupported model quantity: '+message,await input.inputValue()===message&&await review.count()===0&&JSON.stringify(await catalog())===retained);
 }
 for(const [message,ids] of [['What are the assumptions in this plan?',['B']],['Compare Action Plan #1 and #2.',['A','B','C']]]){
  injectedResponse=()=>proposal('compare',ids);await send(message);await page.getByText(/response does not match the requested current plan references/).last().waitFor();check(mode+' rejects wrong comparison identity: '+message,await input.inputValue()===message&&await review.count()===0&&JSON.stringify(await catalog())===retained);
 }
 failNext=true;await send('We can spend at most 4500 on this.');await page.getByText('Fixture response unavailable. Nothing was saved.',{exact:true}).waitFor();const count=requests.length;await page.waitForTimeout(100);check(mode+' errors preserve draft and never auto-retry',await input.inputValue()==='We can spend at most 4500 on this.'&&requests.length===count&&(await catalog()).plans.length===5);
 await page.getByRole('checkbox',{name:/Discuss saved plans/}).uncheck();await send('have a budget of 9000');await panel.getByRole('tab',{name:'Action Plan #6',exact:true}).waitFor();check(mode+' existing chat controls remain a working fallback',requests.length===count&&(await catalog()).plans[5].draft.inputs.budget.amount.value===9000);
 check(mode+' runtime and viewport stay valid',errors.length===0&&unexpected===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/'+mode+'.png',fullPage:true});await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks,fixturesOnly:true,paidModelCalls:0}));
