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
  let unexpected=0,dataMode='base';
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
      bundle.components.c1.name=bundle.name;bundle.components.c1.domain='learning';
      bundle.components.c1.firstStep='Run reviewed AI practice sessions for the pilot group using existing capacity.';
     }
     const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(wire)}),body.goalContext.goal,body.overviewBriefingContext,homeBundleTask(body.goalContext));
     return route.fulfill({status:result.proposal?200:502,json:result});
    }
    return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Synthetic response: review the AI skills goal and supplied planning assumptions.',next_step:'none',problem:'Build AI skills within 90 days',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']},{operation:'review_capacity',evidence:['W1.headcount']}],question:null}),false,body.overviewBriefingContext)});
   }
   if(url.pathname==='/api/skills'){
    if(dataMode==='availability')return route.fulfill({status:503,json:{error:'Synthetic unavailable source'}});
    const rows=[{skill_name:'AI Zeta skills',skill_category:'Synthetic',employees_in_roles_requiring_skill:20,employees_below_or_missing_requirement:10,requirement_met_pct:50,profile_coverage_pct:50},{skill_name:'AI Alpha skills',skill_category:'Synthetic',employees_in_roles_requiring_skill:20,employees_below_or_missing_requirement:10,requirement_met_pct:50,profile_coverage_pct:50}];
    if(dataMode==='order')rows.reverse();if(dataMode==='content')rows[0].requirement_met_pct=51;
    return route.fulfill({json:{as_of:'2026-09-30',summary:{current_workforce:100,skills_with_demand:2},largest_gaps:rows}});
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
  check(mode+' three synthetic plans render without an automatic attachment',await panel.getByRole('tab').count()===3&&!initial.workspaces[id].fields.homeSolutionBundlesV1);
  await chat.fill('use twelve participants');await button('Send overview question').click();
  const review=page.getByRole('region',{name:'Review chat changes'});
  await button('Apply changes').waitFor();
  check(mode+' chat edit needs Apply and no further model request',await button('Apply changes').isEnabled()&&await review.getByRole('listitem').count()===1&&posts.length===2&&!(await state()).workspaces[id].fields.homeSolutionBundlesV1);
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
  const baseline=await page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY);
  const reload=async()=>{await page.reload();await page.getByRole('status',{name:'Home evidence coverage',includeHidden:true}).waitFor({state:'attached'});await panel.getByText('Why these plans',{exact:true}).click();await panel.getByLabel('Action Plan context check',{exact:true}).waitFor()};
  dataMode='order';await reload();await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' categorical row order alone survives attachment reload as current',await button('Attach Action Plan').isEnabled()&&(await panel.getByLabel('Action Plan context check').innerText()).includes('Evidence: unchanged. Planning: unchanged. Only unordered detail-row order changed.')&&posts.length===2&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot));
  for(const [change,copy] of [['content','Source content, scope, dates, selection or meaningful order changed.'],['availability','Source availability changed.']]){
    dataMode=change;await reload();await panel.getByText(/Previous Action Plan proposal/).waitFor();
    const diagnostic=await panel.getByLabel('Action Plan context check').innerText();
    check(mode+' '+change+' retains real staleness without regeneration',diagnostic.includes('Evidence: changed. Planning: unchanged.')&&diagnostic.includes(copy)&&await button('Attach Action Plan').isDisabled()&&posts.length===2&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot));
  }
  dataMode='base';const changed=JSON.parse(baseline).payload;changed.goals.goals.find(goal=>goal.id===id).context.constraints='Explicitly changed planning constraint';
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(changed)});await reload();await panel.getByText(/Previous Action Plan proposal/).waitFor();
  check(mode+' planning-only change is identified without dumping context', (await panel.getByLabel('Action Plan context check').innerText()).includes('Evidence: unchanged. Planning: changed. Source comparison unchanged.')&&await button('Attach Action Plan').isDisabled()&&posts.length===2);
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:baseline});await reload();await page.locator('[data-plan-current="true"]').waitFor();
  check(mode+' exact context restoration restores current attachment without mutation',await button('Attach Action Plan').isEnabled()&&posts.length===2&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(snapshot));
  check(mode+' responsive runtime and network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);
  await context.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify({checks}));
