import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
// Actual UI and local calculators, with synthetic evidence/model transport only.
import assert from 'node:assert/strict';
import {retentionProposal} from '../fixtures/home-retention-proposal.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3397',goal='Reduce turnover by 2 percentage points over the next 12 months with a $100,000 illustrative budget';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],posts=[];let external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort()}if(url.pathname==='/api/chat'){const body=req.postDataJSON();posts.push(body);return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:retentionProposal(body.goalContext.goal)}:{answer:'Your target is a 2-percentage-point reduction over 12 months within a $100,000 illustrative cash budget. A matching baseline and population are unknown.',nextStep:'none'}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue()});
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await input.fill(text);await button('Send overview question').click()};
 try{
  await page.goto(base);await dismissHomeOnboarding(page);await input.waitFor();await send(goal);await page.locator('[data-guide-target="pin"]').click();await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).waitFor();await page.locator('[data-plan-current="true"]').waitFor();
  const initial=await state(),id=initial.goals.activeId,fields=()=>state().then(data=>data.workspaces[id].fields),catalog=async()=>readPlanAlternatives((await fields()).homePlanAlternativesV1,{goalId:id,goal});
  await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();const originalAttachment=JSON.stringify((await fields()).homeSolutionBundlesV1.attachments);
  check(mode+' first saved attachment retains the requested 12-month horizon',(await fields()).homeSolutionBundlesV1.attachments.at(-1).draft.inputs.scope.months.value===12);
  await send('Change the timeline to 6 months');await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();
  let plans=await catalog(),revised=plans.plans[3];const originals=JSON.stringify(plans.plans.slice(0,3));
  check(mode+' everyday goal phrase creates all three original 12-month alternatives',plans.plans.slice(0,3).every(p=>p.draft.inputs.scope.months.value===12));
  check(mode+' ordinary timeline edit creates selected #4 with matching generated measure',revised.number===4&&revised.draft.inputs.scope.months.value===6&&revised.draft.inputs.successMeasure.name.includes('over 6 months')&&await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).getAttribute('aria-selected')==='true');
  check(mode+' edit retains target, unknown baseline/population, cash ceiling and source activities',plans.plans.every(p=>p.draft.inputs.successMeasure.target.value==='2 percentage-point reduction'&&p.draft.inputs.successMeasure.baseline.value===null&&p.draft.inputs.budget.amount.value===100000&&p.draft.inputs.groups[0].count.value===null)&&JSON.stringify(revised.draft.inputs.expenses)===JSON.stringify(plans.plans[0].draft.inputs.expenses)&&JSON.stringify(revised.draft.inputs.timing)===JSON.stringify(plans.plans[0].draft.inputs.timing));
  await send('Correct the timeline to match my 12-month goal');await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).waitFor();plans=await catalog();revised=plans.plans[4];
  check(mode+' follow-up uses selected #4 and creates #5 at the exact requested horizon',revised.number===5&&revised.operation.sourceIds[0]===plans.plans[3].id&&revised.draft.inputs.scope.months.value===12&&revised.draft.inputs.successMeasure.name.includes('over 12 months'));
  check(mode+' earlier plans and attachments stay unchanged',JSON.stringify(plans.plans.slice(0,3))===originals&&JSON.stringify((await fields()).homeSolutionBundlesV1.attachments)===originalAttachment);
  await button('Compare Action Plans').click();const comparison=page.getByRole('region',{name:'Action Plan comparison'});check(mode+' comparison includes both revised periods and unchanged target',await comparison.getByRole('article').count()===5&&(await comparison.innerText()).includes('6 months')&&(await comparison.innerText()).includes('12 months')&&(await comparison.innerText()).includes('2 percentage-point reduction'));await button('Hide comparison').click();
  await panel.getByRole('checkbox').check();await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan #5 attached/}).waitFor();const attached=JSON.stringify((await catalog()).attachments);
  await page.reload();await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).waitFor();plans=await catalog();check(mode+' saved #5 reopens selected with exact numbers and attachment history',plans.nextNumber===6&&JSON.stringify(plans.attachments)===attached&&plans.attachments.at(-1).planId===revised.id&&await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).getAttribute('aria-selected')==='true');
  const beforeExplanation=(await fields()).chat.messages.length;await send('Why does this plan last 12 months?');await page.waitForFunction(({key,count})=>{const data=JSON.parse(localStorage.getItem(key)).payload,chat=data.workspaces[data.goals.activeId].fields.chat;return chat.messages.length===count+2&&chat.messages.at(-1)?.role==='assistant';},{key:DECISIONS_STORAGE_KEY,count:beforeExplanation});
  check(mode+' local explanation creates no extra alternative or model request',posts.length===2&&(await catalog()).nextNumber===6);
  check(mode+' runtime and viewport boundaries hold',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await context.close()}
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
