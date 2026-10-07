// Exact reported prompt; synthetic malformed discovery and plan fixtures, never live generation.
import assert from 'node:assert/strict';
import {aiSkillsGoalPrompt} from '../fixtures/home-ai-skills-goal.mjs';
import {deliveryAcceptanceWire} from '../fixtures/home-exact-acceptance.mjs';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {inspectBundleResponse} from '../../lib/home-bundle-response.ts';
import {homeBundleTask} from '../../lib/home-bundle-task.ts';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3203';
const reproduce=process.env.EXPECT_PIN_BLOCKED==='1';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{
 for(const [mode,width,height] of (reproduce?[['desktop',1366,900]]:[['desktop',1366,900],['mobile',390,900],['zoom',683,450]])){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];
  let unexpected=0;
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==base){unexpected++;return route.abort()}
   if(url.pathname==='/api/chat'){
    const body=request.postDataJSON();posts.push(body);
    if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.'){
     const wire=deliveryAcceptanceWire(body.goalContext.goal);wire.bundles=wire.bundles.slice(0,2);
     for(const [index,bundle] of wire.bundles.entries()){
      bundle.name=['AI practice sessions','AI peer learning','AI workflow pilot'][index];
      bundle.objective='Propose an internal AI skills pilot using reviewed existing capacity.';
      bundle.components.c1.name=bundle.name;bundle.components.c1.domain='learning';
      bundle.components.c1.firstStep='Run reviewed AI practice sessions for the pilot group using existing capacity.';
     }
     const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(wire)}),body.goalContext.goal,body.overviewBriefingContext,homeBundleTask(body.goalContext));
     return route.fulfill({status:result.proposal?200:502,json:result});
    }
    return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Synthetic response: review the AI skills goal and supplied planning assumptions.',next_step:'none',problem:'Build AI skills within 90 days',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']},{operation:'review_capacity',evidence:['W1.headcount']}],question:null}),false,body.overviewBriefingContext)});
   }
   if(url.pathname.startsWith('/api/')){
    if(request.method()!=='GET'){unexpected++;return route.abort()}
    return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'}}});
   }
   return route.continue();
  });
  const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true});
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
  const panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true});
  await page.goto(base);
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'other',statement:'Improve manager support'}]},workspaces:{other:{savedAt:'2026-10-05T00:00:00Z',fields:{sentinel:{keep:'unrelated work'}}}}})});
  await page.reload();await chat.fill(aiSkillsGoalPrompt);await button('Send overview question').click();
  const status=page.getByRole('status',{name:'Problem and options not prepared'});
  await status.waitFor();await status.getByText('Preparation details',{exact:true}).click();
  check(mode+' exact bounded server diagnostic retained',await status.getByText(/Stage: server. Reason: invalid_problem. Field: problem. Candidate count.*: 2. Missing fields: 0/).isVisible());
  if(reproduce){check('old build reproduces missing Pin for the exact prompt',await button('Pin as goal').count()===0&&posts.length===1&&!(await state()).goals.activeId);await context.close();continue}
  await button('Pin as goal').waitFor();
  check(mode+' user wording including name and day units remains independently pinnable',await page.getByRole('region',{name:'Pin this problem'}).getByText(aiSkillsGoalPrompt,{exact:true}).isVisible()&&posts.length===1&&!(await state()).goals.activeId);
  await button('Pin as goal').focus();await page.keyboard.press('Enter');await page.locator('[data-plan-current="true"]').waitFor();
  const initial=await state(),id=initial.goals.activeId;
  check(mode+' explicit Pin prepares once with unchanged complete user context',posts.length===2&&posts[1].goalContext.goal===aiSkillsGoalPrompt&&posts[1].goalContext.notes.map(note=>note.text).join(' ')===aiSkillsGoalPrompt&&initial.goals.goals.find(goal=>goal.id===id).statement===aiSkillsGoalPrompt);
  check(mode+' rejected investigation is never stored and warning clears',!initial.workspaces[id].fields.homeCandidateOptions&&await status.count()===0);
  check(mode+' both returned synthetic plans render without an automatic attachment',await panel.getByRole('tab').count()===2&&!initial.workspaces[id].fields.homeSolutionBundlesV1);
  const originalGoalState=JSON.stringify(initial.goals),originalPreparation=JSON.stringify(initial.workspaces[id].fields.homeBundlePreparationV1);
  const editReview=page.getByRole('region',{name:'Review chat changes'});
  await chat.fill('Increase the Unallocated learning pilot one-time cash allowance in Action Plan #1 from USD 1,000 to USD 2,500.');await button('Send overview question').click();await editReview.getByText(/differs from the stated starting value/).waitFor();
  check(mode+' rejected natural edit remains local and changes no goal or preparation',posts.length===2&&JSON.stringify((await state()).goals)===originalGoalState&&JSON.stringify((await state()).workspaces[id].fields.homeBundlePreparationV1)===originalPreparation&&await button('Apply changes').isDisabled());
  await chat.fill('In Action Plan #1, set Unallocated learning pilot amount (USD) to $2500.');await button('Send overview question').click();await panel.getByText(/Proposed revision \d+ · not yet applied/).waitFor();
  check(mode+' consecutive valid prefixed edit previews without chat request or planning staleness',posts.length===2&&await panel.getByText(/Proposed revision \d+ · not yet applied/).isVisible()&&await button('Apply changes').isEnabled()&&await page.locator('[data-plan-current="true"]').count()===1&&JSON.stringify((await state()).goals)===originalGoalState&&JSON.stringify((await state()).workspaces[id].fields.homeBundlePreparationV1)===originalPreparation);
  await chat.fill('Change the Unallocated learning pilot one-time cash allowance in Action Plan #1 from USD 2,000 to USD 2,500. Keep other assumptions unchanged except participants.');await button('Send overview question').click();await editReview.getByText(/Restate the desired value without a negation or exception/).waitFor();
  check(mode+' ambiguous preservation request keeps the earlier unapplied proposal and saved context',await button('Apply changes').isEnabled()&&(await state()).workspaces[id].fields.homePlanRevisionsV1.revisions.length===1&&!(await state()).workspaces[id].fields.homeSolutionBundlesV1&&posts.length===2&&JSON.stringify((await state()).goals)===originalGoalState&&JSON.stringify((await state()).workspaces[id].fields.homeBundlePreparationV1)===originalPreparation);
  await chat.fill('Change the Unallocated learning pilot one-time cash allowance in Action Plan #1 from USD 2,500 to USD 2,600. Keep other assumptions unchanged.');await button('Send overview question').click();await panel.getByText(/Proposed revision \d+ · not yet applied/).waitFor();
  check(mode+' reported natural allowance wording resolves one explicit from-to change',posts.length===2&&await button('Apply changes').isEnabled()&&(await state()).workspaces[id].fields.homePlanRevisionsV1.revisions.at(-1).draft.inputs.expenses.find(e=>e.id==='pilot-learning').amount.value===2600&&JSON.stringify((await state()).goals)===originalGoalState);
  await panel.getByRole('tab',{name:'Action Plan #2',exact:true}).click();await chat.fill('In Action Plan #1, set Unallocated learning pilot amount (USD) to $2500.');await button('Send overview question').click();await editReview.getByText(/Select Action Plan #1, then send/).waitFor();
  check(mode+' a different numbered plan requires explicit selection and changes nothing',posts.length===2&&await button('Apply changes').isDisabled()&&JSON.stringify((await state()).goals)===originalGoalState);
  await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).click();await panel.getByText(/Proposed revision \d+ · not yet applied/).waitFor();await button('Apply changes').click();
  check(mode+' Apply changes only the reviewed allowance and keeps context current',posts.length===2&&JSON.stringify((await state()).goals)===originalGoalState&&JSON.stringify((await state()).workspaces[id].fields.homeBundlePreparationV1)===originalPreparation&&(await state()).workspaces[id].fields.homeSolutionBundlesV1.drafts.find(d=>d.bundle.id==='A').inputs.expenses.find(e=>e.id==='pilot-learning').amount.value===2600&&await button('Attach Action Plan').isEnabled());
  await chat.fill('use twelve participants');await button('Send overview question').click();
  await button('Apply changes').waitFor();
  check(mode+' chat edit needs Apply and no further model request',await button('Apply changes').isEnabled()&&await panel.getByText(/Proposed revision \d+ · not yet applied/).isVisible()&&posts.length===2&&(await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments.length===0);
  await button('Apply changes').click();await button('Attach Action Plan').click();
  await page.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();
  check(mode+' one-click attachment has no routine confirmation or manual editor',await button('Continue to attachment').count()===0&&await button('Review calculation').count()===0&&await page.getByRole('region',{name:'Action Plan editor'}).count()===0);
  const snapshot=(await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0];
  check(mode+' reviewed attachment retains exact goal and explicitly applied edit',snapshot.draft.binding.goal===aiSkillsGoalPrompt&&snapshot.draft.inputs.groups[0].count.value===12&&snapshot.draft.inputs.groups[0].count.kind==='user-entered'&&posts.length===2);
  await page.reload();await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' reload restores immutable attachment without generation',JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot)&&posts.length===2);
  await page.getByLabel('Selected goal',{exact:true}).selectOption('other');
  check(mode+' another goal keeps separate work',!await panel.getByRole('tab').count()&&(await state()).workspaces.other.fields.sentinel.keep==='unrelated work');
  await page.getByLabel('Selected goal',{exact:true}).selectOption(id);await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' goal return restores exact saved plan and no calls',JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot)&&posts.length===2);
  const baseline=await state(),changed=structuredClone(baseline);changed.goals.goals.find(goal=>goal.id===id).context.constraints='Explicit synthetic planning-only change';
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(changed)});await page.reload();await panel.getByText(/Previous Action Plan proposal/).waitFor();await panel.getByText('Why these plans',{exact:true}).click();
  check(mode+' planning-only staleness never claims changed evidence or hides known source scope',(await panel.getByLabel('Action Plan context check').innerText()).includes('Evidence: unchanged. Planning: changed.')&&(await panel.innerText()).includes('Evidence is unchanged; planning inputs changed.')&&!(await panel.innerText()).includes('Original evidence context changed')&&!(await panel.innerText()).includes('Original source scope unavailable'));
  const staleGoals=JSON.stringify((await state()).goals);await chat.fill('In Action Plan #1, set Unallocated learning pilot amount (USD) to $2600.');await button('Send overview question').click();await page.getByText('Select the intended Action Plan tab, then send this change again for review. Your request is kept; nothing has changed.',{exact:true}).waitFor();
  check(mode+' a truly stale named edit remains local and cannot append planning notes',posts.length===2&&JSON.stringify((await state()).goals)===staleGoals&&await button('Attach Action Plan').isDisabled());
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(baseline)});await page.reload();await page.locator('[data-plan-current="true"]').waitFor();await page.getByLabel('Selected goal',{exact:true}).selectOption('other');const otherGoals=JSON.stringify((await state()).goals);
  await chat.fill('In Action Plan #1, set Unallocated learning pilot amount (USD) to $2500.');await button('Send overview question').click();await page.getByText('Select the intended Action Plan tab, then send this change again for review. Your request is kept; nothing has changed.',{exact:true}).waitFor();
  check(mode+' a named edit with no selected plan asks locally without changing context',posts.length===2&&JSON.stringify((await state()).goals)===otherGoals);
  check(mode+' responsive runtime and network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);
  await context.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify({checks}));
