// Local production build, fixture APIs/model only. Both ordinary chat and the
// explicit adjustment panel must produce one proposal, never apply it on Send.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {bundleProposalFixture} from '../fixtures/home-bundles.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3280',output='/tmp/next-integration-compound-plan';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
await fs.mkdir(output,{recursive:true});
try{for(const width of [1366,390])for(const entry of ['conversation','adjustment']){
 const name=width+'-'+entry,context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.clock.install({time:new Date('2026-10-07T12:00:00Z')});
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);
   if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.'){
    const proposal=bundleProposalFixture(body.goalContext.goal);
    proposal.bundles.forEach((bundle,index)=>{bundle.name=['Manager support pilot','Workload practice pilot','Staged feedback pilot'][index];bundle.objective='Run a ten-person pilot with ten participants.';bundle.components=[{...bundle.components[0],name:['Manager toolkit','Workload practice','Feedback sessions'][index],firstStep:['Pilot manager conversations using a shared toolkit.','Pilot team workload reviews and reprioritization.','Pilot regular team feedback sessions.'][index]},{...bundle.components[5],id:'c2',dependsOn:['c1'],firstStep:'Review pilot delivery and record follow-up actions.'}];});
    return route.fulfill({json:{proposal}});
   }
   return route.fulfill({json:{answer:'Review a manager support pilot for employee satisfaction; improvement is unproven.',nextStep:'none',findingFollowups:[]}});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await input.fill(text);await button('Send overview question').click()};
 await page.goto(base);await input.waitFor();
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[]},workspaces:{},homeDemoSeedV1:undefined})});await page.reload();
 await send('Improve employee satisfaction');await page.getByRole('button',{name:/^Pin as goal$/}).click();await page.locator('[data-plan-current=true]').waitFor();
 const id=(await state()).goals.activeId,fields=async()=>(await state()).workspaces[id].fields;
 check(name+' starting plan matches the reported assumptions',await panel.getByText(/Assumed cash \$3,500 USD/).isVisible()&&await panel.getByText(/36 hours/).isVisible());
 await button('Attach Action Plan').click();await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1?.attachments.length===1,{key:DECISIONS_STORAGE_KEY,id});
 const before=structuredClone((await fields()).homeSolutionBundlesV1),oldDraft=before.drafts[0],count=posts.length;
 check(name+' baseline has ten participants, three months and USD1000 per occurrence',oldDraft.inputs.groups[0].count.value===10&&oldDraft.inputs.scope.months.value===3&&oldDraft.inputs.expenses.find(item=>item.id==='pilot-manager_workload').amount.value===1000&&oldDraft.inputs.scope.startMonth.value==='2026-11');
 if(entry==='adjustment'){
  await send('i have a budget');await page.getByRole('region',{name:'Review chat changes'}).waitFor();
  check(name+' incomplete first request opens adjustment panel without losing or applying work',await input.inputValue()==='i have a budget'&&JSON.stringify((await fields()).homeSolutionBundlesV1)===JSON.stringify(before));
 }
 await send('i have 20 participants and a budget of $8000');await panel.getByLabel('Plan budget check').waitFor();
 const after=await fields(),history=after.homePlanRevisionsV1,record=history.revisions.at(-1);
 check(name+' one atomic proposal retains both values and creates no model call',history.revisions.length===1&&record.draft.inputs.groups[0].count.value===20&&record.draft.inputs.budget.amount.value===8000&&posts.length===count);
 check(name+' Send leaves saved draft and attached history unchanged',JSON.stringify(after.homeSolutionBundlesV1)===JSON.stringify(before));
 check(name+' allowance amounts, occurrences, horizon and dates stay unchanged',JSON.stringify(record.draft.inputs.expenses)===JSON.stringify(oldDraft.inputs.expenses)&&JSON.stringify(record.draft.inputs.scope)===JSON.stringify(oldDraft.inputs.scope)&&JSON.stringify(record.draft.inputs.timing)===JSON.stringify(oldDraft.inputs.timing));
 check(name+' quantities recalculate with a labeled cash-cap assumption',record.result.deliveryEstimate.hours===56&&record.result.budget.cash===3500&&record.result.budget.employeeTime===3360&&record.result.budget.headroom===4500&&await panel.getByLabel('Plan budget check').getByText(/Proposed cash-budget assumption.*\$8,000 USD.*\$4,500 USD/).isVisible());
 check(name+' current description and visible chat reflect the whole accepted request',await panel.getByLabel('Plan description').getByText('Run a 20-person pilot with 20 participants.',{exact:true}).isVisible()&&(await page.locator('[data-chat-role=user]').last().innerText()).includes('i have 20 participants and a budget of $8000')&&await input.inputValue()==='');
 check(name+' fresh controls are visible once',await button('Apply changes').count()===1&&await button('Apply changes').isEnabled()&&await button('Attach Action Plan').isEnabled()&&await button('Compare Action Plans').isEnabled());
 await button('Compare Action Plans').click();const comparison=page.getByRole('article',{name:'Comparison Action Plan 1'});
 check(name+' comparison uses fresh quantities and cap',await comparison.getByText(/Budget limit \$8,000/).isVisible()&&await comparison.getByText(/Staff time: \$3,360 USD; hours: 56/).isVisible());await button('Hide comparison').click();
 await panel.screenshot({path:output+'/'+name+'.png'});
 await page.reload();await panel.getByLabel('Plan budget check').waitFor();check(name+' pending revision restores without automatic application',await button('Apply changes').isEnabled()&&JSON.stringify((await fields()).homeSolutionBundlesV1)===JSON.stringify(before));
 await button('Apply changes').click();check(name+' explicit Apply saves both changes together and preserves attachment',await button('Apply changes').isDisabled()&&(await fields()).homeSolutionBundlesV1.drafts[0].inputs.groups[0].count.value===20&&(await fields()).homeSolutionBundlesV1.drafts[0].inputs.budget.amount.value===8000&&JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===JSON.stringify(before.attachments));
 await button('Attach Action Plan').click();await button('Confirm revised attachment').waitFor();check(name+' attachment replacement still requires its explicit confirmation',(await fields()).homeSolutionBundlesV1.attachments.length===1);await button('Confirm revised attachment').click();
 await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeSolutionBundlesV1.attachments.length===2,{key:DECISIONS_STORAGE_KEY,id});
 check(name+' both immutable attachment versions are retained',JSON.stringify((await fields()).homeSolutionBundlesV1.attachments[0])===JSON.stringify(before.attachments[0]));
 check(name+' no runtime errors, external calls or horizontal overflow',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
