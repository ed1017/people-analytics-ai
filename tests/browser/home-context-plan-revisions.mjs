// Production app; synthetic intercepted evidence/model responses only. No operational writes.
import assert from 'node:assert/strict';
import {bundleProposalFixture} from '../fixtures/home-bundles.mjs';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3266';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label);};
function proposal(goal){
 const result=bundleProposalFixture(goal);
 for(const [index,bundle] of result.bundles.entries()){
  bundle.name=['Manager support pilot','Workload practice pilot','Staged feedback pilot'][index];
  bundle.components=[{...bundle.components[0],name:['Manager toolkit','Workload practice','Feedback sessions'][index],firstStep:['Pilot manager stay conversations using a shared toolkit.','Pilot team workload reviews and reprioritization.','Pilot regular team feedback sessions.'][index]}, {...bundle.components[5],id:'c2',dependsOn:['c1'],firstStep:'Review pilot delivery and record follow-up actions.'}];
 }
 return result;
}
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let unexpected=0,late=null;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:new Date('2026-10-06T12:00:00Z')});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);
   if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.')return route.fulfill({json:{proposal:proposal(body.goalContext.goal)}});
   if(body.message.includes('Explain the delay')){late=()=>route.fulfill({json:{answer:'Late answer that should be ignored.'}}).catch(()=>{});return;}
   return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Review the proposed activities; their turnover effect is unknown.',next_step:'none',problem:'Review manager support',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']}],question:null}),Boolean(body.hasFocusedIssue),body.overviewBriefingContext)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await input.fill(text);await button('Send overview question').click();};
 await page.goto(base);await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'other',statement:'Improve support'}]},workspaces:{}})});await page.reload();
 await send('Reduce turnover');await button('Pin overall turnover goal').click();await page.locator('[data-plan-current="true"]').waitFor();
 const id=(await state()).goals.activeId,fields=async()=>(await state()).workspaces[id].fields;
 check(mode+' exact starting scope and costs',await panel.getByText(/Assumed cash \$3,500 USD/).isVisible()&&await panel.getByText(/36 hours/).isVisible()&&await panel.getByText(/2026-11-28/).first().isVisible());
 await button('Attach Action Plan').click();await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1?.attachments.length===1,{key:DECISIONS_STORAGE_KEY,id});
 const attached=JSON.stringify((await fields()).homeSolutionBundlesV1.attachments);
 await send('have a budget of 6000');await panel.getByLabel('Plan budget check').waitFor();
 check(mode+' budget reply inherits context and recalculates without a model request',posts.length===2&&await panel.getByLabel('Plan budget check').getByText(/\$6,000 USD.*cash only.*\$3,500 USD.*\$2,160 USD.*\$2,500 USD/).isVisible()&&await input.inputValue()==='');
 check(mode+' latest plan is after conversation with only one set of current controls',await panel.evaluate(el=>!!(document.querySelector('[aria-label="Overview conversation"]').compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING))&&await button('Apply changes').count()===1&&await button('Apply changes').isEnabled()&&await button('Attach Action Plan').count()===1&&await button('Compare Action Plans').count()===1);
 check(mode+' proposal preserves attachment and initial version',JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===attached&&(await fields()).homePlanRevisionsV1.revisions[0].before.inputs.budget===undefined);
 await button('Compare Action Plans').click();const compared=page.getByRole('article',{name:'Comparison Action Plan 1'});check(mode+' comparison uses recalculated budget and staff time',await compared.getByText(/Budget limit \$6,000/).isVisible()&&await compared.getByText(/Staff time: \$2,160 USD; hours: 36/).isVisible());await button('Hide comparison').click();
 await panel.evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:'/tmp/context-plan-budget-'+mode+'.png',fullPage:true});
 await send('use 20 participants');check(mode+' sequential edit keeps ceiling and recalculates hours',await panel.getByText(/56 total staff hours/).isVisible()&&(await fields()).homePlanRevisionsV1.revisions.at(-1).result.budget.limit===6000);
 await send('I have a budget of 6000 including staff time');check(mode+' explicit all-in override identifies infeasibility',await panel.getByLabel('Plan budget check').getByText(/including staff time.*\$860 USD over the limit/).isVisible());
 await page.reload();await panel.getByLabel('Plan budget check').waitFor();check(mode+' reload restores unapplied proposal and current actions',await button('Apply changes').isEnabled()&&await panel.getByText(/56 total staff hours/).isVisible()&&posts.length===2);
 await button('Apply changes').click();check(mode+' Apply saves only the draft and current calculation',JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===attached&&(await fields()).homeSolutionBundlesV1.drafts[0].inputs.budget.basis.value==='all-in'&&await button('Apply changes').isDisabled());
 await button('Attach Action Plan').click();await button('Confirm revised attachment').waitFor();check(mode+' attachment cannot be silently replaced',JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===attached);await button('Confirm revised attachment').click();await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1.attachments.length===2,{key:DECISIONS_STORAGE_KEY,id});
 check(mode+' explicit attachment keeps both immutable versions',JSON.stringify((await fields()).homeSolutionBundlesV1.attachments[0])===JSON.stringify(JSON.parse(attached)[0]));
 if(mode==='desktop'){
  await page.evaluate(()=>{const original=Storage.prototype.setItem;window.restorePlanStorage=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=function(key,value){if(key==='people-analytics-decisions-v1'||value.includes('homePlanRevisionsV1'))throw new DOMException('Synthetic storage failure','QuotaExceededError');return original.call(this,key,value)};});
  const savedBefore=JSON.stringify((await fields()).homePlanRevisionsV1);await send('have a budget of 8000');
  check(mode+' failed storage transaction retains request and previous proposal',await input.inputValue()==='have a budget of 8000'&&JSON.stringify((await fields()).homePlanRevisionsV1)===savedBefore);
  await page.evaluate(()=>window.restorePlanStorage());await page.getByText('Browser storage details',{exact:true}).click();await button('Retry saving').click();await send('have a budget of 8000');
  check(mode+' explicit retry produces one saved proposal',await panel.getByLabel('Plan budget check').getByText(/\$8,000 USD/).isVisible()&&(await fields()).homePlanRevisionsV1.revisions.length===4);
  const nav=page.getByRole('navigation',{name:'Workforce navigation'});await nav.locator('[data-nav-destination="workforce"]').click();await nav.getByRole('button',{name:'Action Planning',exact:true}).click();await panel.getByLabel('Plan budget check').waitFor();
  check(mode+' navigation restores the pending goal-bound proposal',await button('Apply changes').isEnabled()&&await panel.getByLabel('Plan budget check').getByText(/\$8,000 USD/).isVisible());
 }
 const history=JSON.stringify((await fields()).homePlanRevisionsV1);
 await send('What is the budget?');await page.getByRole('status',{name:'AI answer status',exact:true}).waitFor({state:'hidden'});check(mode+' ordinary question does not mutate plan or stale controls',JSON.stringify((await fields()).homePlanRevisionsV1)===history&&await button('Attach Action Plan').isEnabled()&&posts.length===3);
 await send('have a budget of 7000');await page.getByLabel('Selected goal',{exact:true}).selectOption('other');check(mode+' other goal has no leaked proposal',await panel.getByLabel('Plan budget check').count()===0);await page.getByLabel('Selected goal',{exact:true}).selectOption(id);await panel.getByLabel('Plan budget check').waitFor();check(mode+' return restores the correct goal proposal',await panel.getByLabel('Plan budget check').getByText(/\$7,000 USD/).isVisible());
 await button('Reset conversation').click();check(mode+' Reset leaves the goal and removes its controls',await panel.count()===0);await page.getByLabel('Selected goal',{exact:true}).selectOption(id);await panel.getByLabel('Plan budget check').waitFor();check(mode+' Reset closes pending revision and retains applied attachment',await button('Apply changes').isDisabled()&&await panel.getByLabel('Plan budget check').getByText(/\$6,000 USD/).isVisible()&&(await fields()).homeSolutionBundlesV1.attachments.length===2);
 await send('Explain the delay');await button('Reset conversation').click();if(late)await late();check(mode+' late ordinary response cannot resurrect conversation or alter plan',await page.getByText('Late answer that should be ignored.').count()===0&&(await fields()).homeSolutionBundlesV1.attachments.length===2);
 check(mode+' responsive layout and runtime are clean',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);
 await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks}));
