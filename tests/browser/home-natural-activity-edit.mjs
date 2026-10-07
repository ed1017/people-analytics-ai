// Local app with synthetic evidence/model transport; no hosted writes or calls.
import assert from 'node:assert/strict';
import {retentionProposal} from '../fixtures/home-retention-proposal.mjs';
import {activityGoal as goal,activityPrompts,activityContext} from '../fixtures/home-activity-revision.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {HOME_INSTRUCTIONS_DISMISSED_KEY} from '../../lib/home-onboarding.ts';
import {readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3475',id='qa-activity-goal';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(({key,dismiss,value})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,value);localStorage.setItem(dismiss,'1')}},{key:DECISIONS_STORAGE_KEY,dismiss:HOME_INSTRUCTIONS_DISMISSED_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:id,goals:[{id,statement:goal,context:{constraints:activityContext,decisions:'',notes:[]}}]},workspaces:{}})});
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.href==='https://va.vercel-scripts.com/v1/script.debug.js')return route.fulfill({contentType:'application/javascript',body:''});if(url.origin!==base){external++;return route.abort()}if(url.pathname==='/api/chat'){const body=req.postDataJSON();posts.push(body);const proposal=retentionProposal(body.goalContext.goal);proposal.bundles[0].name='Manager Practice Reset';return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal}:{answer:'Review the saved goal and its unapproved illustrative assumptions.',nextStep:'none'}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue()});
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const fields=()=>state().then(data=>data.workspaces[id].fields),catalog=async()=>readPlanAlternatives((await fields()).homePlanAlternativesV1,{goalId:id,goal});
 const send=async text=>{await input.fill(text);await button('Send overview question').click()};
 try{
  await page.goto(base);await input.waitFor();await page.waitForFunction(()=>document.querySelector('[aria-label=Country] option[value=US]'));const country=page.getByLabel('Country',{exact:true});if(!await country.isVisible())await page.getByText('Filters',{exact:true}).click();await country.selectOption('US');await button('Create Action Plan').click();await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).waitFor();await page.locator('[data-plan-current=true]').waitFor();
  await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();const before=(await fields()).homeSolutionBundlesV1,receipts=JSON.stringify(before.attachments),source=before.drafts[0],savedGoal=JSON.stringify((await state()).goals),postsBefore=posts.length;
  check(mode+' saved source retains exact target, horizon, cap and unapproved context',source.inputs.scope.months.value===12&&source.inputs.budget.amount.value===100000&&source.inputs.successMeasure.target.value==='2 percentage-point reduction'&&(await state()).goals.goals[0].context.constraints===activityContext);
  let originals;
  for(const [index,prompt] of activityPrompts.entries()){
   await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).click();await send(prompt);await panel.getByRole('tab',{name:`Action Plan #${index+4}`,exact:true}).waitFor();const plans=await catalog(),next=plans.plans.at(-1);originals??=JSON.stringify(plans.plans.slice(0,3));
   check(mode+' exact prompt '+(index+1)+' creates a separate numbered alternative',next.number===index+4&&next.sourceRefs[0].id===plans.plans[0].id&&posts.length===postsBefore&&await input.inputValue()==='');
   check(mode+' exact prompt '+(index+1)+' keeps source and saved constraints',JSON.stringify(plans.plans[0].draft)===JSON.stringify(source)&&JSON.stringify(plans.plans.slice(0,3))===originals&&JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===receipts&&JSON.stringify((await state()).goals)===savedGoal&&JSON.stringify(next.draft.inputs.budget)===JSON.stringify(source.inputs.budget)&&JSON.stringify(next.draft.inputs.successMeasure)===JSON.stringify(source.inputs.successMeasure)&&next.draft.inputs.scope.months.value===12&&await country.inputValue()==='US');
   check(mode+' added activity costs and effort stay unknown',next.result.cashEstimate.cash===null&&next.result.deliveryEstimate.hours===null&&next.result.budget.headroom===null&&JSON.stringify(next.draft.inputs.expenses.slice(0,source.inputs.expenses.length))===JSON.stringify(source.inputs.expenses));
   check(mode+' requested actions appear in the current approach',await panel.getByLabel('Selected plan summary').getByText(/Added activities: monthly manager check-ins and quarterly turnover-signal reviews/).isVisible());
  }
  await button('Compare Action Plans').click();const comparison=page.getByRole('region',{name:'Action Plan comparison'});check(mode+' comparison retains all five alternatives',await comparison.getByRole('article').count()===5);await button('Hide comparison').click();
  const snapshot=JSON.stringify(await catalog());await send('Explain Action Plan #5');check(mode+' explanation produces no revision or model call',JSON.stringify(await catalog())===snapshot&&posts.length===postsBefore);
  await panel.getByRole('checkbox').check();await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan #5 attached/}).waitFor();
  await page.reload();await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).waitFor();const reopened=await catalog();check(mode+' reload retains revised activities and both attachment records',reopened.attachments.length===1&&reopened.attachments[0].planId===reopened.plans[4].id&&JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===receipts&&reopened.plans[4].draft.bundle.coordination.includes('quarterly turnover-signal reviews'));
  check(mode+' browser and viewport boundaries remain clear',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }catch(error){console.log('ALERTS',await page.getByRole('alert').allTextContents());await page.screenshot({path:'/tmp/pr176-natural-activity-'+mode+'.png',fullPage:true});throw error}finally{await context.close()}
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
