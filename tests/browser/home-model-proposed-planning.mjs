// Actual client app + deterministic solution service, synthetic model replies only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {proposedPilot} from '../fixtures/model-proposed-pilot.mjs';
import {vacancyQuestion,vacancyAnswer,vacancyTitles,vacancyActions,vacancyUiCandidate} from '../fixtures/vacancy-ui-replay.mjs';
import {planningPrompts} from '../fixtures/underspecified-planning.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const layoutOnly=process.env.PLAN_LAYOUT_ONLY==='true',vacancyReplay=process.env.VACANCY_UI_REPLAY==='true',measurements=[];
const output=await fs.mkdtemp(path.join(os.tmpdir(),'model-proposed-pilot-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3117',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),checks=[];
try{for(const [mode,width,height] of (layoutOnly?[['desktop',1440,900],['short-desktop',1280,720],['phone',390,844],['narrow-viewport',720,450]]:[['desktop',1440,1000],['phone',390,844]])){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 const check=(name,ok)=>{assert.ok(ok,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.href===base+'/')return route.fulfill({contentType:'text/html',body:html});if(url.origin!==base){external++;return route.abort();}if(url.pathname==='/api/home-solution-conversation'){
  const body=req.postDataJSON();requests.push(body);if(vacancyReplay){const a=vacancyUiCandidate(0,body.message.id),b=vacancyUiCandidate(1,body.message.id),answer=final(vacancyAnswer,[a.id,b.id]);answer.questions=['Which business unit or role group should we prioritize first?'];return route.fulfill({json:await converseSolutions(body,fixtureRuntime([evaluate(a),evaluate(b),answer]),new AbortController().signal)});}if(body.message.text.startsWith('Offline failure:'))return route.fulfill({status:body.message.text.includes('deadline')?503:422,json:{error:'Synthetic request failure; previous work is retained.',diagnostic:body.message.text.includes('deadline')?'conversation_deadline':'response_validation'}});const c=proposedPilot(body.message.text==='Recommend again'?'renewed-pilot':'manager-pilot',body.message.id);
  if(body.message.text===planningPrompts.turnover){c.id='turnover-pilot';c.goal.statement='Reduce turnover';c.successMeasure='Review participation and feedback, then agree a turnover baseline and target before judging impact.';}
  if(body.message.text==='Blocked proposal'){c.quantities.find(q=>q.field==='horizon_months').target='c1';c.nextStep=c.activities[0].step;}
  const changed=final('Use the updated cash ceiling.',[]);changed.constraintUpdates=[{action:'set',field:'budget_usd',number:1000,text:null,unit:'USD',turnId:body.message.id}];
  const response=final('The evidence cannot identify the weakest teams.',[c.id]);response.answer={findings:'The evidence cannot identify the weakest teams.',decisionRationale:'A limited trial tests the workload hypothesis before expansion.',caveats:['Availability remains unverified; no improvement is guaranteed.','No causal effect has been established.']};
  response.questions=['Review comparable survey coverage before ranking groups.'];
  const alternative=proposedPilot('alternative',body.message.id);alternative.name='Alternative pilot';alternative.objective='Test removing low-value coordination work';alternative.activities[0].step='Remove one low-value recurring meeting and protect a shared focus block.';alternative.activities[0].ownerRole='Operations lead';
  const runtime=fixtureRuntime(body.message.text==='Compare alternatives'?[evaluate(c),evaluate(alternative),final('Compare the two unconfirmed pilots.',[c.id,alternative.id])]:body.message.text==='Change constraint'?[changed]:body.message.text==='Explain evidence only'?[final('No team ranking can be established from this evidence. No new plan is proposed.')]:[evaluate(c),response]);
  const reply=await converseSolutions(body,runtime,new AbortController().signal);assert.equal(runtime.reads,0);return route.fulfill({json:reply});
 }if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});external++;return route.abort();});
 await page.goto(base);await dismissHomeOnboarding(page);
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=async text=>{await input.fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.getByRole('status').filter({hasText:'Thinking through the question'}).waitFor({state:'hidden'});};
 const review=page.getByRole('region',{name:'Solution conversation review',exact:true}),card=()=>review.getByRole('region',{name:'Current Action Plan options',exact:true}),readState=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 if(layoutOnly){
  await send(vacancyReplay?vacancyQuestion:'Compare alternatives');await card().waitFor();
  const naturalPosition=await page.evaluate(()=>({scrollY,activeElement:document.activeElement?.getAttribute('aria-label'),firstCardTop:document.querySelector('[aria-label="Current Action Plan options"] article').getBoundingClientRect().top}));
  const first=card().getByRole('article').first();await first.scrollIntoViewIfNeeded();
  const measured=await page.evaluate(()=>{const read=document.querySelector('[aria-label="Home chat workspace"]'),dock=document.querySelector('.home-composer-dock'),cards=[...document.querySelectorAll('[aria-label="Current Action Plan options"] article')];const size=node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom};};return {viewport:{width:innerWidth,height:innerHeight},reading:size(read),readingScrollHeight:read.scrollHeight,readingOverflow:getComputedStyle(read).overflowY,composerPosition:getComputedStyle(dock).position,cards:cards.map(size),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};});
  if(vacancyReplay){check('UI-derived replay preserves both complete captured actions and titles',await card().getByText(vacancyActions[0],{exact:true}).isVisible()&&await card().getByText(vacancyActions[1],{exact:true}).isVisible()&&await card().getByRole('article',{name:'Working proposal: '+vacancyTitles[0],exact:true}).count()===1&&await card().getByRole('article',{name:'Working proposal: '+vacancyTitles[1],exact:true}).count()===1);check('UI-derived replay preserves checked labor arithmetic and unconfirmed cash',await card().getByText('44 hours',{exact:true}).count()===1&&await card().getByText('60 hours',{exact:true}).count()===1&&await card().getByText('$0',{exact:true}).count()===2);}
  measurements.push({mode,fixture:vacancyReplay?'UI-derived captured text reconstruction, not raw provider state':'synthetic pilot',naturalPosition,...measured});await page.screenshot({path:path.join(output,mode+'-layout.png'),fullPage:true});
  check('layout retains complete visible actions and one collapsed caveat',await first.getByText(vacancyReplay?vacancyActions[0]:'Invite volunteers for manager check-ins, review workload friction and document follow-up actions.',{exact:true}).isVisible()&&await card().locator('details').count()===1&&!await card().locator('details').evaluate(node=>node.open));
  if(process.env.EXPECT_PLAN_DOCUMENT_FLOW==='true'){check('plan reading has no trapped inner pane or composer overlay',measured.readingOverflow==='visible'&&measured.composerPosition==='static'&&measured.reading.height>=Math.max(...measured.cards.map(c=>c.height))&&!measured.horizontalOverflow);check('complete first option fits after scrolling into view',measured.cards[0].top>=0&&measured.cards[0].bottom<=measured.viewport.height);}
  const controls=card().locator('[tabindex="0"],button:not([disabled]),summary,input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
  const traversal=await controls.evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>({tag:n.tagName,label:n.getAttribute('aria-label')||n.textContent})));
  await first.focus();for(let i=0;i<traversal.length;i++){await page.keyboard.press('Tab');const reached=await controls.evaluateAll((nodes,index)=>nodes.filter(n=>n.checkVisibility())[index]===document.activeElement,i);check('keyboard traversal control '+(i+1),reached);}
  await first.focus();await page.keyboard.press('Tab');check('keyboard reaches a plan control',await first.getByRole('button',{name:'Save plan',exact:true}).evaluate(node=>node===document.activeElement));
  await page.keyboard.press('Enter');await first.getByRole('button',{name:/Pinned Action Plan/}).waitFor();await page.reload();await card().waitFor();check('layout preserves pin and reload',await card().getByRole('button',{name:/Pinned Action Plan/}).count()===1&&requests.length===1);
  while(await card().getByRole('button',{name:'Discard proposal',exact:true}).count())await card().getByRole('button',{name:'Discard proposal',exact:true}).first().click();
  check('discarding all options restores the ordinary responsive composer',await page.locator('.home-composer-dock').evaluate((node,desktop)=>getComputedStyle(node).position===(desktop?'fixed':'static'),width>=768)&&requests.length===1);
  await context.close();continue;
 }
 await send('Explain evidence only');check('ordinary no-plan reply stays visible without creating a card',await card().count()===0&&await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('No team ranking can be established from this evidence. No new plan is proposed.',{exact:true}).isVisible());
 await send('Blocked proposal');await card().waitFor();
 check('blocked no-draft proposal preserves its candidate action with pin disabled',await card().getByText('Invite volunteers for manager check-ins, review workload friction and document follow-up actions.',{exact:true}).isVisible()&&await card().getByRole('button',{name:'Save plan',exact:true}).isDisabled()&&(await readState()).exploration.fields.homeSolutionConversationV1.working.at(-1).draft===null);
 await page.reload();await card().waitFor();
 check('blocked candidate action survives reload without enabling pin or duplicating its matching next step',await card().getByText('Invite volunteers for manager check-ins, review workload friction and document follow-up actions.',{exact:true}).count()===1&&await card().getByRole('button',{name:'Save plan',exact:true}).isDisabled());
 await page.evaluate(()=>localStorage.clear());await page.reload();await dismissHomeOnboarding(page);
 await send(planningPrompts.turnover);await card().waitFor();
 check('ordinary turnover prompt keeps the broad goal with editable proposed duration and no invented target',await card().getByText('Goal: Reduce turnover.',{exact:true}).count()===1&&await card().getByText('2 months',{exact:true}).isVisible()&&await card().getByText(/Baseline: Unknown; Target: Unknown/).count()===1&&await card().getByText('Assumptions & caveats',{exact:true}).isVisible());
 await card().getByRole('button',{name:'Discard proposal',exact:true}).click();
 await page.evaluate(()=>localStorage.clear());await page.reload();await dismissHomeOnboarding(page);
 await send('Recommend a manager/workload pilot. I have no time or budget assumptions.');await card().waitFor();
 check('new answer contains findings and caveats with one full set of actions',await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('The evidence cannot identify the weakest teams.',{exact:true}).isVisible()&&await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('Recommendation: Targeted manager/workload pilot.',{exact:true}).isVisible()&&await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('Availability remains unverified; no improvement is guaranteed.',{exact:true}).isVisible()&&await page.getByText('Invite volunteers for manager check-ins, review workload friction and document follow-up actions.',{exact:true}).count()===1);
 check('refinement invitation names missing inputs without generating alternatives',await card().getByText(/If you tell me the start date, confirmed participants, I can update the plans and recommendation/).isVisible());
 check('one supporting disclosure with no nested caveat accordions',await card().locator('details').count()===1&&await card().getByText('Assumptions & caveats',{exact:true}).evaluate(node=>!node.parentElement.open));
 check('one authoritative plan and visible unconfirmed label',await card().count()===1&&await card().getByText('Model-proposed · unconfirmed; existing payroll excluded',{exact:true}).isVisible());
 const captureCard=async filename=>{const viewport=page.getByRole('region',{name:'Home chat workspace',exact:true});const old=await viewport.getAttribute('style');await viewport.evaluate(node=>{node.style.maxHeight='none';node.style.overflow='visible';});await page.locator('.home-composer-dock').evaluate(node=>node.style.visibility='hidden');await card().screenshot({path:path.join(output,filename)});await page.locator('.home-composer-dock').evaluate(node=>node.style.removeProperty('visibility'));await viewport.evaluate((node,style)=>{if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);},old);};
 const summary=()=>card().getByRole('region',{name:'Action Plan quick summary',exact:true});
 check('conditional cash, duration, people and labor time are readable',await summary().getByText('$500',{exact:true}).isVisible()&&await summary().getByText('2 months',{exact:true}).isVisible()&&await summary().getByText('10 people',{exact:true}).isVisible()&&await summary().getByText('28 hours',{exact:true}).isVisible());
 check('further investigation stays visible after the plan',await page.getByRole('region',{name:'Further reading and investigation'}).getByText('Review comparable survey coverage before ranking groups.',{exact:true}).isVisible());
 check('goal and optional plan details start collapsed',await card().getByText('Goal:',{exact:false}).count()>0&&!await card().getByText('Goal:',{exact:false}).first().isVisible());
 check('accountability remains available in supporting details',!await card().getByText(/Suggested owners · unconfirmed:/).isVisible()&&await card().getByText(/Baseline: Unknown; Target: Unknown/).count()===1&&await card().getByText(/Confirm owner, baseline, target and review date/).count()===1);
 check('practical actions are visible with assumptions closed',await card().getByText('Invite volunteers for manager check-ins, review workload friction and document follow-up actions.',{exact:true}).isVisible());
 check('labor price and actual availability remain unknown',await summary().getByText(/labor cost unknown/).isVisible()&&await summary().getByText(/availability unconfirmed/).isVisible());
 await captureCard(mode+'-proposal.png');
 await card().getByText('Assumptions & caveats',{exact:true}).click();const calls=requests.length;
 await card().getByLabel('Participants · Manager check-ins and workload review (people)',{exact:true}).fill('12');
 const pin=()=>card().getByRole('button',{name:'Save plan',exact:true});
 const beforeDirty=JSON.stringify(await readState());await pin().evaluate(button=>button.click());
 check('dirty inputs block pinning without changing storage',await pin().isDisabled()&&JSON.stringify(await readState())===beforeDirty&&await card().getByText('Recalculate or discard input changes before pinning.',{exact:true}).isVisible());
 await card().getByRole('button',{name:'Discard input changes',exact:true}).click();
 check('discard input changes restores the reviewed value and enables pin',await card().getByLabel('Participants · Manager check-ins and workload review (people)',{exact:true}).inputValue()==='10'&&await pin().isEnabled());
 await card().getByLabel('Participants · Manager check-ins and workload review (people)',{exact:true}).fill('12');
 await card().getByRole('button',{name:'Recalculate proposal',exact:true}).click();await card().getByText(/revision 2/).waitFor();
 check('local edit updates one card without a model request',requests.length===calls&&await card().count()===1&&await summary().getByText('12 people',{exact:true}).isVisible()&&await summary().getByText('32 hours',{exact:true}).isVisible());
 check('duration and cash preserved after edit',await summary().getByText('2 months',{exact:true}).isVisible()&&await summary().getByText('$500',{exact:true}).isVisible());
 await card().locator('details').evaluate(node=>node.open=true);await card().getByLabel('Hours per participant (hours/person/total)',{exact:true}).fill('');await card().getByRole('button',{name:'Recalculate proposal',exact:true}).click();await card().getByText(/revision 3/).waitFor();
 check('blank edit stays unknown without zero or rate fallback',await summary().getByText('Unknown hours',{exact:true}).isVisible());
 await card().locator('details').evaluate(node=>node.open=true);await card().getByLabel('Participants · Manager check-ins and workload review (people)',{exact:true}).fill('14');
 await send('Change constraint');
 check('changed constraints disable recalculation and pinning of dirty stale proposal',await pin().isDisabled()&&await card().getByRole('button',{name:'Recalculate proposal',exact:true}).isDisabled());
 await card().getByRole('button',{name:'Discard input changes',exact:true}).click();
 check('discarding dirty inputs cannot make a stale proposal savable',await pin().isDisabled()&&await card().getByLabel('Participants · Manager check-ins and workload review (people)',{exact:true}).inputValue()==='12');
 await card().getByRole('button',{name:'Discard proposal',exact:true}).click();check('discard removes the current card',await card().count()===0);
 await send('Recommend again');await card().waitFor();check('recommend again retains rejection and has one fresh plan',await card().count()===1&&requests.at(-1).state.rejected.some(row=>row.candidateId==='manager-pilot'&&row.revision===3));
 await card().locator('details').evaluate(node=>node.open=true);await card().getByLabel('Participants · Manager check-ins and workload review (people)',{exact:true}).fill('12');await card().getByRole('button',{name:'Recalculate proposal',exact:true}).click();await card().getByText(/revision 2/).waitFor();
 await card().getByRole('button',{name:'Save plan',exact:true}).click();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).payload.goals.activeId,DECISIONS_STORAGE_KEY);const saved=await readState(),id=saved.goals.activeId,plans=saved.workspaces[id].fields.homePlanAlternativesV1.plans;
 check('save links exact proposal to goal and keeps provenance',plans.length===1&&plans[0].draft.binding.goal==='Improve employee experience'&&plans[0].draft.inputs.scope.months.kind==='model-proposed'&&plans[0].draft.inputs.scope.population.value===null&&plans[0].draft.inputs.groups[0].count.value===12);
 await page.reload();await card().waitFor();check('reload preserves one saved card and unconfirmed assumptions',await card().count()===1&&await card().getByRole('button',{name:/Pinned Action Plan/}).isDisabled()&&await summary().getByText('Model-proposed · unconfirmed; existing payroll excluded',{exact:true}).isVisible());
 await captureCard(mode+'-saved.png');
 for(const kind of ['validation','deadline']){
  const before=await readState(),beforeFields=JSON.stringify([before.workspaces[before.goals.activeId].fields.homeSolutionConversationV1,before.workspaces[before.goals.activeId].fields.homePlanAlternativesV1]),question='Offline failure: '+kind+' — show turnover and engagement by business unit.';
  await send(question);const after=await readState();
  check(kind+' failure clears loading and enables the composer',await page.getByRole('button',{name:'Send overview question',exact:true}).isEnabled()&&await page.getByRole('status').filter({hasText:'Thinking through the question'}).count()===0);
  check(kind+' failure retains the complete question in the composer',await input.inputValue()===question);
  check(kind+' failure preserves saved plan and conversation fields',JSON.stringify([after.workspaces[after.goals.activeId].fields.homeSolutionConversationV1,after.workspaces[after.goals.activeId].fields.homePlanAlternativesV1])===beforeFields);
 }
 await page.evaluate(()=>localStorage.clear());await page.reload();await dismissHomeOnboarding(page);await send('Recommend a fresh pilot.');await card().waitFor();
 for(let i=1;i<=14;i++){
  if(i<=12)await card().locator('details').evaluate(node=>node.open=true);
  await card().getByLabel('Participants · Manager check-ins and workload review (people)',{exact:true}).fill(String(10+i));await card().getByRole('button',{name:'Recalculate proposal',exact:true}).click();
  if(i<=11)await card().getByText(new RegExp('revision '+(i+1)+'$')).waitFor();
  else await page.getByText(/The working history limit would remove source provenance/).waitFor();
 }
 check('history limit preserves latest reviewed revision and blocks dirty pin',await summary().getByText('21 people',{exact:true}).isVisible()&&await pin().isDisabled());
 await card().getByRole('button',{name:'Discard input changes',exact:true}).click();await pin().click();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).payload.goals.activeId,DECISIONS_STORAGE_KEY);
 const bounded=await readState(),boundedPlan=bounded.workspaces[bounded.goals.activeId].fields.homePlanAlternativesV1.plans[0];check('history-limit rejection leaves prior proposal savable',boundedPlan.draft.inputs.groups[0].count.value===21);
 await page.reload();await card().waitFor();check('history-limited saved proposal reloads',await card().getByRole('button',{name:/Pinned Action Plan/}).isDisabled()&&await summary().getByText('21 people',{exact:true}).isVisible());
 await page.evaluate(()=>localStorage.clear());await page.reload();await dismissHomeOnboarding(page);await send('Compare alternatives');await card().waitFor();
 const alternatives=review.getByRole('article',{name:'Working proposal: Alternative pilot',exact:true});
 check('actual alternatives use compact option cards with seven bullets and one shared disclosure',await card().getByRole('article').count()===2&&await alternatives.isVisible()&&await alternatives.getByRole('listitem').count()===7&&await card().locator('details').count()===1);
 check('distinct actions and one recommendation are visible before opening details',await alternatives.getByText('Remove one low-value recurring meeting and protect a shared focus block.',{exact:true}).isVisible()&&await card().getByText('Invite volunteers for manager check-ins, review workload friction and document follow-up actions.',{exact:true}).isVisible()&&await card().getByText('Recommended',{exact:true}).count()===1);
 check('no redundant plan navigation surrounds the compact choices',await page.getByRole('navigation',{name:'Review proposed Action Plans'}).count()===0);
 await card().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,mode+'-compact-review.png')});
 const callsBeforeDiscard=requests.length;
 await card().getByRole('article',{name:'Working proposal: Targeted manager/workload pilot',exact:true}).getByRole('button',{name:'Discard proposal',exact:true}).click();
 const noRecommendation=async()=>await card().getByText('Recommended',{exact:true}).count()===0&&await card().getByRole('heading',{name:'Recommendation summary',exact:true}).count()===0&&await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('Plan options below · no current recommendation.',{exact:true}).isVisible();
 check('discarding the recommendation leaves the remaining option unendorsed',await card().getByRole('article').count()===1&&await alternatives.isVisible()&&await noRecommendation()&&(await readState()).exploration.fields.homeSolutionConversationV1.focusCandidateId===null);
 await page.reload();await card().waitFor();check('reload does not promote the remaining alternative',await noRecommendation()&&await alternatives.isVisible());
 await alternatives.getByRole('button',{name:'Save plan',exact:true}).click();await alternatives.getByRole('button',{name:/Pinned Action Plan/}).waitFor();
 const alternativeSaved=await readState(),alternativeWorkspace=alternativeSaved.workspaces[alternativeSaved.goals.activeId];
 check('pinning the alternative preserves null recommendation and the discarded option',alternativeWorkspace.fields.homeSolutionConversationV1.focusCandidateId===null&&alternativeWorkspace.fields.homeSolutionConversationV1.rejected.some(row=>row.candidateId==='manager-pilot')&&alternativeWorkspace.fields.homePlanAlternativesV1.plans.length===1&&alternativeWorkspace.fields.homePlanAlternativesV1.plans[0].draft.bundle.name==='Alternative pilot'&&await noRecommendation());
 await page.reload();await card().waitFor();check('saved alternative reloads without a new recommendation or model request',await noRecommendation()&&await alternatives.getByRole('button',{name:/Pinned Action Plan/}).isDisabled()&&requests.length===callsBeforeDiscard);
 await captureCard(mode+'-discarded-recommendation.png');
 for(const action of ['discard','revise']){
  await page.evaluate(()=>localStorage.clear());await page.reload();await dismissHomeOnboarding(page);await send('Compare alternatives');await card().waitFor();
  await card().getByText('Assumptions & caveats',{exact:true}).click();
  const aDetails=review.getByRole('region',{name:'Supporting details: Targeted manager/workload pilot',exact:true}),aCard=review.getByRole('article',{name:'Working proposal: Targeted manager/workload pilot',exact:true}),participant='Participants · Manager check-ins and workload review (people)';
  await aDetails.getByLabel(participant,{exact:true}).fill('17');
  if(action==='discard')await alternatives.getByRole('button',{name:'Discard proposal',exact:true}).click();
  else {const bDetails=review.getByRole('region',{name:'Supporting details: Alternative pilot',exact:true});await bDetails.getByLabel(participant,{exact:true}).fill('12');await bDetails.getByRole('button',{name:'Recalculate proposal',exact:true}).click();await alternatives.getByText(/revision 2/).waitFor();await review.getByText('Earlier proposals (1)',{exact:true}).click();await review.getByRole('region',{name:'Earlier Action Plan options',exact:true}).getByText('Assumptions & caveats',{exact:true}).click();}
  check(action+' of option B preserves option A unsaved values and dirty pin guard',await aDetails.getByLabel(participant,{exact:true}).inputValue()==='17'&&await aCard.getByRole('button',{name:'Save plan',exact:true}).isDisabled());
  const beforeBlockedPin=JSON.stringify(await readState());await aCard.getByRole('button',{name:'Save plan',exact:true}).evaluate(button=>button.click());check(action+' of option B cannot save stale reviewed option A while edits remain',JSON.stringify(await readState())===beforeBlockedPin);
  await aDetails.getByRole('button',{name:'Discard input changes',exact:true}).click();check(action+' of option B leaves option A reviewed inputs recoverable',await aDetails.getByLabel(participant,{exact:true}).inputValue()==='10'&&await aCard.getByRole('button',{name:'Save plan',exact:true}).isEnabled());
 }
 check('no overflow, runtime errors or external traffic',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0);await context.close();
}}finally{await browser.close()}
await fs.writeFile(path.join(output,'measurements.json'),JSON.stringify(measurements,null,2));
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,output}));
