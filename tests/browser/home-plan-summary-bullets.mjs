import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
// Local production app, intercepted synthetic evidence/model responses only.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {retentionProposal} from '../fixtures/home-retention-proposal.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3396',output=process.env.PLAN_SUMMARY_OUTPUT??'/tmp/post175-plan-summary';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});await mkdir(output,{recursive:true});
const goal='Reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget for 10 participants.';
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let posts=0,external=0;page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}if(url.pathname==='/api/chat'){posts++;const body=request.postDataJSON();return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:retentionProposal(body.goalContext.goal)}:{answer:'Your target is a 2-percentage-point reduction over 12 months. Baseline turnover is unknown.',nextStep:'none'}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue()});
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),article=()=>panel.getByRole('tabpanel').getByRole('article'),summary=()=>article().getByLabel('Selected plan summary'),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await input.fill(text);await button('Send overview question').click()};
 const structure=async name=>{
  const s=summary();check(mode+' '+name+' uses seven headings and one level of sub-bullets',JSON.stringify(await s.locator(':scope > li > strong').allTextContents())===JSON.stringify(['Approach:','Stakeholders:','People needed:','Cost:','Timeline:','Expected outcome:','How success is measured:'])&&await s.locator(':scope > li > ul').count()===7&&await s.locator('ul ul').count()===0&&await s.locator(':scope > li > ul').evaluateAll(lists=>lists.every(list=>list.children.length>0&&getComputedStyle(list).listStyleType==='disc')));
  check(mode+' '+name+' separates cash subtotal, unknown complete budget, cap and staff time',await s.getByText('Assumed cash $3,500 USD — listed subtotal.',{exact:true}).isVisible()&&await s.getByText('Reviewed full budget: Unknown.',{exact:true}).isVisible()&&await s.getByText('Budget limit $100,000 USD (cash cap, not an expense).',{exact:true}).isVisible()&&await s.getByText(/no available headroom is established/).isVisible()&&!/\$96,500|employee time \$/.test(await s.innerText()));
  check(mode+' '+name+' separates the exact goal, metric, unknown baseline and user target',await s.getByText('Goal: '+goal,{exact:true}).isVisible()&&await s.getByText(/^Metric:/).isVisible()&&await s.getByText('Baseline: Unknown.',{exact:true}).isVisible()&&await s.getByText('User target: 2 percentage-point reduction.',{exact:true}).isVisible()&&await s.getByText(/Planning horizon: User assumption: 12 months/).isVisible());
  check(mode+' '+name+' shows each proposed role and deliverable once',await s.getByText(/^Proposed role:/).count()===2&&await s.getByText(/^Deliverable target:/).count()===2&&await s.getByText(/not completed delivery or a predicted effect/).isVisible());
  check(mode+' '+name+' keeps detailed assumptions collapsed',await article().getByRole('button',{name:'Show assumptions',exact:true}).getAttribute('aria-expanded')==='false'&&await article().getByText(/Staffing assumptions:/).isHidden());
 };
 try{
  await page.goto(base);await dismissHomeOnboarding(page);await input.waitFor();await send(goal);await page.locator('[data-guide-target="pin"]').click();await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).waitFor();await page.locator('[data-plan-current="true"]').waitFor();await structure('original');
  await button('Attach Action Plan').click();await panel.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();const id=(await state()).goals.activeId,fields=async()=>(await state()).workspaces[id].fields,original=JSON.stringify((await fields()).homeSolutionBundlesV1.attachments);
  await send('In Action Plan #1 set coordination hours to 24');await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();await structure('revision');
  check(mode+' revision keeps 10 participants and recalculates 44 hours',await summary().getByText('10 assumed participants.',{exact:true}).isVisible()&&await summary().getByText('44 total staff hours.',{exact:true}).isVisible());
  const checkbox=panel.getByRole('checkbox',{name:'Confirm unresolved-assumption review',exact:true});
  check(mode+' removed standalone sentence keeps explicit attachment safeguard',await page.getByText(/I have reviewed the unresolved assumptions for Action Plan/).count()===0&&await checkbox.isVisible()&&!await checkbox.isChecked()&&await button('Attach Action Plan').isDisabled());
  check(mode+' review control sits in the Attach action row',await checkbox.evaluate(node=>node.closest('label').parentElement===document.querySelector('[data-guide-target="attach"]').parentElement));
  await article().getByRole('button',{name:'Show assumptions',exact:true}).click();check(mode+' calculation method and acceptance criteria remain available',await article().getByText(/Staffing assumptions:.*24/).isVisible()&&await article().getByText(/Acceptance criteria:/).isVisible()&&await article().getByText(/Assumption-based subtotal.*does not establish available headroom/).isVisible());await article().getByRole('button',{name:'Hide assumptions',exact:true}).click();
  if(mode==='desktop'){
   // A tall element screenshot cannot reveal text clipped by the desktop reading
   // pane. Capture real viewport slices after deliberately scrolling that pane.
   for(const [name,index] of [['approach',0],['cost',3],['measurement',6]]){
    await summary().locator(':scope > li').nth(index).evaluate(node=>{const port=node.closest('[aria-label="Home chat workspace"]'),header=document.querySelector('main > header');window.scrollBy({top:port.getBoundingClientRect().top-header.getBoundingClientRect().bottom-12,behavior:'instant'});port.scrollTop+=node.getBoundingClientRect().top-port.getBoundingClientRect().top;});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    check(mode+' '+name+' heading is painted above the composer',await summary().locator(':scope > li').nth(index).locator('strong').evaluate(node=>{const rect=node.getBoundingClientRect();return node.contains(document.elementFromPoint(rect.left+4,rect.top+rect.height/2));}));
    await page.screenshot({path:output+'/'+mode+'-plan-4-'+name+'.png'});
   }
  }else await article().screenshot({path:output+'/'+mode+'-plan-4.png'});
  await checkbox.check();await button('Attach Action Plan').click();await panel.getByRole('status').filter({hasText:/Action Plan #4 attached/}).waitFor();
  const catalog=()=>fields().then(f=>readPlanAlternatives(f.homePlanAlternativesV1,{goalId:id,goal})),attachment=JSON.stringify((await catalog()).attachments);
  check(mode+' attachment preserves original saved work and new plan identity',JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===original&&(await catalog()).attachments.length===1&&(await catalog()).plans.find(plan=>plan.number===4).draft.inputs.deliveryEstimate.coordinationHours.value===24);
  await page.reload();await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();await structure('reopened');check(mode+' reopening retains both attachment histories',JSON.stringify((await catalog()).attachments)===attachment&&JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===original);
  await button('Compare Action Plans').click();const comparison=page.getByRole('region',{name:'Action Plan comparison'});check(mode+' comparison reuses the summary for every numbered alternative',await comparison.getByLabel('Selected plan summary').count()===4&&await comparison.getByRole('article',{name:'Comparison Action Plan 4'}).getByText('44 total staff hours.',{exact:true}).isVisible());
  await button('Hide comparison').click();await button('Send overview question').scrollIntoViewIfNeeded();check(mode+' Send remains right-aligned without horizontal overflow or errors',await button('Send overview question').evaluate(node=>Math.abs(node.getBoundingClientRect().right-node.parentElement.getBoundingClientRect().right)<1)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0&&posts===2);
 }finally{await context.close()}
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
