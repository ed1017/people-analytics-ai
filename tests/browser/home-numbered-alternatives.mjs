import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
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
  bundle.objective='Run a ten-person pilot with ten participants.';
  bundle.name=['Manager support pilot','Workload practice pilot','Staged feedback pilot'][index];
  bundle.components=[{...bundle.components[0],name:['Manager toolkit','Workload practice','Feedback sessions'][index],firstStep:['Pilot manager stay conversations using a shared toolkit.','Pilot team workload reviews and reprioritization.','Pilot regular team feedback sessions.'][index]}, {...bundle.components[5],id:'c2',dependsOn:['c1'],firstStep:'Review pilot delivery and record follow-up actions.'}];
 }
 return result;
}
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let unexpected=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:new Date('2026-10-06T12:00:00Z')});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);
   if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.')return route.fulfill({json:{proposal:proposal(body.goalContext.goal)}});
   return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Review the proposed activities; their turnover effect is unknown.',next_step:'none',problem:'Review manager support',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']}],question:null}),Boolean(body.hasFocusedIssue),body.overviewBriefingContext)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await input.fill(text);await button('Send overview question').click();};
 await page.goto(base);await dismissHomeOnboarding(page);await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'other',statement:'Improve support'}]},workspaces:{}})});await page.reload();
 await send('Reduce turnover');await page.getByRole('button',{name:/^Pin (as goal|overall turnover goal)$/}).click();await page.locator('[data-plan-current="true"]').waitFor();
 const id=(await state()).goals.activeId,fields=async()=>{const data=await state(),f=data.workspaces[id].fields;return {...f,...(f.homePlanAlternativesV1?{homePlanAlternativesV1:readPlanAlternatives(f.homePlanAlternativesV1,{goalId:id,goal:data.goals.goals.find(goal=>goal.id===id).statement})}:{})}};

 const savedOriginals=async()=>(await fields()).homePlanAlternativesV1.plans.slice(0,3);
 const catalog=async()=>(await fields()).homePlanAlternativesV1;
 const compareAll=async stage=>{
  const before=await catalog(),serialized=JSON.stringify(before),expected=before.order.map(id=>before.plans.find(plan=>plan.id===id));
  await button('Compare Action Plans').click();
  const comparison=page.getByRole('region',{name:'Action Plan comparison',exact:true});
  check(mode+' '+stage+' comparison contains every active number in display order',JSON.stringify(await comparison.getByRole('article').evaluateAll(items=>items.map(item=>item.getAttribute('aria-label'))))===JSON.stringify(expected.map(plan=>'Comparison Action Plan '+plan.number)));
  for(const plan of expected){
   const card=comparison.getByRole('article',{name:'Comparison Action Plan '+plan.number,exact:true});
   const label=plan.operation?(plan.applied?'Applied alternative':'Proposed alternative · not yet applied'):'Original plan snapshot';
   check(mode+' '+stage+' #'+plan.number+' preserves snapshot type and revision',await card.getByText(new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' · revision '+plan.draft.revision)).count()===1);
   if(plan.sourceRefs.length)check(mode+' '+stage+' #'+plan.number+' preserves source lineage',(await card.innerText()).includes('based on '+plan.sourceRefs.map(ref=>'Action Plan #'+before.plans.find(source=>source.id===ref.id).number).join(' and ')));
  }
  check(mode+' '+stage+' comparison is read-only for originals, alternatives and attachments',JSON.stringify(await catalog())===serialized);
  await button('Hide comparison').click();
 };
 await send('Can I combine action plans?');check(mode+' combination question reads actual available plans without model or mutation',posts.length===2&&!(await fields()).homePlanAlternativesV1&&await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText(/Available in this goal: Action Plan #1/).isVisible());
 await send('have a budget of 6000');await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();const originals=JSON.stringify(await savedOriginals());
 check(mode+' first edit creates selected #4 without applying or attaching',(await catalog()).plans.length===4&&!(await catalog()).plans[3].applied&&(await catalog()).attachments.length===0&&await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).getAttribute('aria-selected')==='true');
 await compareAll('after first edit');
 await send('in Action Plan #4 use 25 participants');check(mode+' second edit creates #5 with source #4 and recalculated effort',(await catalog()).plans[4].sourceRefs[0].id==='alternative-4'&&(await catalog()).plans[4].result.deliveryEstimate.hours===66&&JSON.stringify(await savedOriginals())===originals);
 await compareAll('after editing the alternative');
 const beforeQuestion=JSON.stringify(await catalog());await send('What is the budget for Action Plan #4?');check(mode+' numbered question reads #4 rather than selected #5',posts.length===2&&JSON.stringify(await catalog())===beforeQuestion&&await page.getByText(/Action Plan #4: Manager support pilot.*Budget limit/).last().isVisible());
 await button('Apply changes').click();await panel.getByRole('checkbox').check();await button('Attach Action Plan').click();check(mode+' Apply and Attach affect only explicit #5',(await catalog()).plans[4].applied&&(await catalog()).attachments[0].planId==='alternative-5'&&JSON.stringify(await savedOriginals())===originals);
 const attachment=JSON.stringify((await catalog()).attachments),snapshot=JSON.stringify((await catalog()).plans[4].draft);
 await page.reload();await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).waitFor();check(mode+' reload restores #5 selection and immutable attachment',await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).getAttribute('aria-selected')==='true'&&JSON.stringify((await catalog()).attachments)===attachment&&JSON.stringify((await catalog()).plans[4].draft)===snapshot);
 await compareAll('after reload with attached #5');
 await send('I want a combination of action plan one and two');const review=page.getByRole('region',{name:'Review plan combination'});await review.waitFor();check(mode+' combine waits for explicit overlap review',(await catalog()).plans.length===5);await button('Cancel combination').click();check(mode+' cancellation creates nothing',await review.count()===0&&(await catalog()).plans.length===5);
 await send('I want a combination of action plan 1 and 2');await review.waitFor();await review.getByRole('button',{name:'Create combined alternative'}).click();await panel.getByRole('tab',{name:'Action Plan #6',exact:true}).waitFor();check(mode+' unknown overlap remains unknown in #6',(await catalog()).plans[5].result.cashEstimate.cash===null&&(await catalog()).plans[5].result.uniqueParticipants===null&&(await catalog()).plans[5].sourceRefs.length===2&&JSON.stringify((await catalog()).attachments)===attachment);
 await send('Please combine action plan one with plan two');check(mode+' overlap fields stay hidden until explicitly requested',await review.locator('select,input').count()===0);await review.getByRole('button',{name:'Open overlap form',exact:true}).click();await review.getByLabel('Combination participant overlap').selectOption('disjoint');await review.getByLabel('Combination cash overlap').selectOption('distinct');await review.getByRole('button',{name:'Create combined alternative'}).click();await panel.getByRole('tab',{name:'Action Plan #7',exact:true}).waitFor();check(mode+' reviewed disjoint overlap recalculates rather than adding targets',(await catalog()).plans[6].result.deliveryEstimate.hours===72&&(await catalog()).plans[6].result.cashEstimate.cash===7000&&(await catalog()).plans[6].result.cashTotal===null&&(await catalog()).plans[6].result.deliveryEstimate.participants===20&&(await catalog()).plans[6].result.uniqueParticipants===null&&JSON.stringify(await savedOriginals())===originals);
 const beforeRead=JSON.stringify(await catalog());await send('Explain the combination of action plan one and two');check(mode+' explanation reads actual named plans without creating a combination',JSON.stringify(await catalog())===beforeRead&&await review.count()===0&&posts.length===2&&await input.inputValue()==='');
 await send('I want a combination of action plan one and nine');check(mode+' unavailable word ID stays local without allocating or requesting plan contents',await input.inputValue()==='I want a combination of action plan one and nine'&&JSON.stringify(await catalog())===beforeRead&&posts.length===2&&await page.getByText('Action Plan #9 is not available in this goal.',{exact:true}).first().isVisible());await input.fill('');
 await send('I want a combination of action plan one and two');await review.waitFor();await page.getByLabel('Selected goal',{exact:true}).selectOption('other');await button('Generate Action Plan').waitFor();check(mode+' active goal switch cancels pending combination without rewriting either goal',await review.count()===0&&JSON.stringify(await catalog())===beforeRead&&!(await state()).workspaces.other?.fields.homePlanAlternativesV1&&posts.length===2);await page.getByLabel('Selected goal',{exact:true}).selectOption(id);await panel.getByRole('tab',{name:'Action Plan #7',exact:true}).waitFor();
 await send('Combine Action Plan #1 and #2');await review.waitFor();await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).click();await review.getByRole('button',{name:'Create combined alternative'}).click();check(mode+' changing selection invalidates pending combination',(await catalog()).plans.length===7&&await page.getByText('The combination is no longer current. Send it again from the current plans.',{exact:true}).isVisible());await button('Cancel combination').click();
 await send('Combine Action Plan #1 and #2 and remove check-ins');await review.getByRole('button',{name:'Create combined alternative'}).click();check(mode+' compound combination instructions are visible and do not silently drop work',(await catalog()).plans.length===7&&await page.getByText(/No alternative created. The combination includes additional instructions/).isVisible());await button('Cancel combination').click();
 await panel.getByText('Manage alternative list',{exact:true}).click();await button('Move selected plan first').click();check(mode+' reorder preserves display numbers',await panel.getByRole('tab').first().innerText()==='Action Plan #4');await send('in Action Plan #1 have a budget of 8000');check(mode+' explicit #1 still resolves original after reordering',(await catalog()).plans[7].sourceRefs[0].id==='A');
 await panel.getByRole('tab',{name:'Action Plan #5',exact:true}).click();await button('Remove Action Plan #5 from list').click();check(mode+' removed plan retains lineage and attachment',(await catalog()).plans[4].deleted&&JSON.stringify((await catalog()).attachments)===attachment&&JSON.stringify((await catalog()).plans[4].draft)===snapshot);
 await send('Explain Action Plan #5');check(mode+' removed reference fails without a model call or number reuse',await input.inputValue()==='Explain Action Plan #5'&&(await catalog()).nextNumber===9&&posts.length===2);await input.fill('');
 await panel.getByText('Attached Action Plans and version history (1)',{exact:true}).click();check(mode+' removed attachment remains readable',await panel.getByRole('region',{name:'Attached Action Plan 5'}).getByText(/removed from active list/).isVisible());
 await compareAll('after combination, reorder and removal');
 await page.screenshot({path:'/tmp/pr175-numbered-alternatives-'+mode+'.png',fullPage:true});
 const nav=page.getByRole('navigation',{name:'Workforce navigation'});if(await button('Open navigation').isVisible())await button('Open navigation').click();await nav.getByRole('button',{name:'Planning — Plan Our Future',exact:true}).click();await page.locator('[data-nav-destination="decision-brief"]').click();const brief=page.getByRole('region',{name:'Attached Action Plans',exact:true});check(mode+' decision brief uses attached #5 snapshot after removal',await brief.getByRole('article',{name:'Action Plan option 5'}).isVisible()&&await brief.getByText(/66 total staff hours/).isVisible());
 check(mode+' responsive runtime and network boundaries hold',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0&&posts.length===2);
 await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks}));
