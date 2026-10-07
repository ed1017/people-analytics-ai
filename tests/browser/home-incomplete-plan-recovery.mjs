// Exact reported prompt; synthetic malformed discovery and plan fixtures, never live generation.
import assert from 'node:assert/strict';
import {completeComponentLimitation} from '../fixtures/home-complete-limitation.mjs';
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
  let unexpected=0,headcount=100,failureKind='token';
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==base){unexpected++;return route.abort()}
   if(url.pathname==='/api/chat'){
    const body=request.postDataJSON();posts.push(body);
    if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.'){
     const wire=deliveryAcceptanceWire(body.goalContext.goal);
     for(const [index,bundle] of wire.bundles.entries()){
      bundle.name=['AI practice sessions','AI peer learning','AI workflow pilot'][index];
      bundle.objective='Propose an internal AI skills pilot using reviewed existing capacity.';
      bundle.limitation='Review cost against the USD 20,000 planning budget; feasibility is not established. Delivery within 90 days and existing capacity remains unverified.';
      bundle.components.c1.limitation=completeComponentLimitation;
      bundle.components.c1.name=bundle.name;bundle.components.c1.domain='learning';
      bundle.components.c1.firstStep='Run reviewed AI practice sessions for the pilot group using existing capacity.';
     }
     if(failureKind==='token'){const result=await inspectBundleResponse(async()=>({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output_text:'PRIVATE partial JSON',usage:{output_tokens:5000,output_tokens_details:{reasoning_tokens:4000}}}),body.goalContext.goal,body.overviewBriefingContext,homeBundleTask(body.goalContext));return route.fulfill({status:502,json:result});}
     if(failureKind==='clipped')wire.bundles[1].limitation='Review cost against the USD 20,000 planning budget; feasibility is not';
     const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(wire)}),body.goalContext.goal,body.overviewBriefingContext,homeBundleTask(body.goalContext));
     return route.fulfill({status:result.proposal?200:502,json:result});
    }
    return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Synthetic response: review the AI skills goal and supplied planning assumptions.',next_step:'none',problem:'Build AI skills within 90 days',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']},{operation:'review_capacity',evidence:['W1.headcount']}],question:null}),false,body.overviewBriefingContext)});
   }
   if(url.pathname.startsWith('/api/')){
    if(request.method()!=='GET'){unexpected++;return route.abort()}
    return route.fulfill({json:{overview:{headcount,fte:headcount,open_positions:3,snapshot_date:'2026-09-30'}}});
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
  await button('Pin as goal').focus();await page.keyboard.press('Enter');await button('Retry Action Plans').waitFor();
  const failed=await state(),failedId=failed.goals.activeId;
  check(mode+' incomplete response keeps exact goal and creates no partial plans',posts.length===2&&failed.goals.goals.find(goal=>goal.id===failedId).statement===aiSkillsGoalPrompt&&!failed.workspaces[failedId].fields.homeBundlePreparationV1&&await panel.getByRole('tab').count()===0);
  await panel.getByText('Preparation details',{exact:true}).click();
  check(mode+' bounded details distinguish token cap without exposing response text',(await panel.innerText()).includes('Reason: output_token_limit. Response status: incomplete. Incomplete reason: max_output_tokens. Output limit: 10000 tokens.')&&!(await page.locator('body').innerText()).includes('PRIVATE')&&posts.length===2);
  failureKind=null;await button('Retry Action Plans').evaluate(node=>{node.click();node.click();});await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' one explicit retry recovers and clears stale failure details',posts.length===3&&await panel.getByText('Preparation details',{exact:true}).count()===0&&await button('Retry Action Plans').count()===0);
  const initial=await state(),id=initial.goals.activeId;
  check(mode+' complete maximum-bound limitation is preserved in the saved proposal',JSON.stringify(initial.workspaces[id].fields.homeBundlePreparationV1).includes(completeComponentLimitation));
  await panel.getByText('Why these plans',{exact:true}).click();
  check(mode+' complete limitation is readable without clipping',await panel.getByText(completeComponentLimitation,{exact:true}).isVisible()&&(await panel.innerText()).includes('Review cost against the USD 20,000 planning budget; feasibility is not established. Delivery within 90 days and existing capacity remains unverified.'));
  await panel.getByText('Why these plans',{exact:true}).click();
  check(mode+' explicit Pin prepares once with unchanged complete user context',posts.length===3&&posts[2].goalContext.goal===aiSkillsGoalPrompt&&posts[2].goalContext.notes.map(note=>note.text).join(' ')===aiSkillsGoalPrompt&&initial.goals.goals.find(goal=>goal.id===id).statement===aiSkillsGoalPrompt);
  check(mode+' rejected investigation is never stored and warning clears',!initial.workspaces[id].fields.homeCandidateOptions&&await status.count()===0);
  check(mode+' three synthetic plans render without an automatic attachment',await panel.getByRole('tab').count()===3&&!initial.workspaces[id].fields.homeSolutionBundlesV1);
  await chat.fill('use twelve participants');await button('Send overview question').click();
  await button('Apply changes').waitFor();
  check(mode+' chat edit needs Apply and no further model request',await button('Apply changes').isEnabled()&&await panel.getByText(/Proposed revision \d+ · not yet applied/).isVisible()&&posts.length===3&&!(await state()).workspaces[id].fields.homeSolutionBundlesV1);
  await button('Apply changes').click();await button('Attach Action Plan').click();
  await page.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();
  check(mode+' one-click attachment retains unresolved assumptions without a manual editor',await button('Continue to attachment').count()===0&&await button('Review calculation').count()===0&&await page.getByRole('region',{name:'Action Plan editor'}).count()===0);
  const snapshot=(await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0];
  check(mode+' reviewed attachment retains exact goal and explicitly applied edit',snapshot.draft.binding.goal===aiSkillsGoalPrompt&&snapshot.draft.inputs.groups[0].count.value===12&&snapshot.draft.inputs.groups[0].count.kind==='user-entered'&&posts.length===3);
  await page.reload();await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' reload restores immutable attachment without generation',JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot)&&posts.length===3);
  await page.getByLabel('Selected goal',{exact:true}).selectOption('other');
  check(mode+' another goal keeps separate work',!await panel.getByRole('tab').count()&&(await state()).workspaces.other.fields.sentinel.keep==='unrelated work');
  await page.getByLabel('Selected goal',{exact:true}).selectOption(id);await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' goal return restores exact saved plan and no calls',JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot)&&posts.length===3);
  headcount=101;failureKind='clipped';await page.reload();await panel.getByText(/Previous Action Plan proposal/).waitFor();
  const beforeRetry=(await state()).workspaces[id].fields;
  await button('Prepare Action Plans').click();await button('Retry Action Plans').waitFor();await panel.getByText('Preparation details',{exact:true}).click();
  const afterRetry=(await state()).workspaces[id].fields;
  check(mode+' completed but clipped output is a distinct local rejection',(await panel.innerText()).includes('Reason: incomplete_text. Response status: completed.')&&(await panel.innerText()).includes('Incomplete field: limitation.')&&posts.length===4);
  check(mode+' failed re-preparation preserves prior proposal drafts calculations and immutable attachment',JSON.stringify(beforeRetry.homeBundlePreparationV1)===JSON.stringify(afterRetry.homeBundlePreparationV1)&&JSON.stringify(beforeRetry.homeSolutionBundlesV1)===JSON.stringify(afterRetry.homeSolutionBundlesV1)&&await panel.getByRole('tab').count()===3&&await button('Attach Action Plan').isDisabled());
  await page.reload();await panel.getByText(/Previous Action Plan proposal/).waitFor();check(mode+' reload does not retry the failed preparation',posts.length===4&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot));
  failureKind=null;await button('Prepare Action Plans').click();await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' explicit later recovery keeps existing immutable attachment',posts.length===5&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot));
  check(mode+' responsive runtime and network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);
  await context.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify({checks}));
