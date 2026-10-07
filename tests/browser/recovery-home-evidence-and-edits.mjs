import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
// Local combined build only. All source/model endpoints are intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {homeDemoExamples} from '../../lib/home-demo-catalog.ts';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3270';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert(value,name);checks++;console.log('PASS '+name)};
await fs.mkdir('/tmp/recovery-home-captures',{recursive:true});
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];
 let stage='timeout',external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);const source=body.overviewBriefingContext.sources.find(s=>s.id==='S2');
   const answer=source?.status==='loaded'?`Reported reasons among ${source.facts.exit_respondents} exit-survey respondents, company-wide as of ${source.date}: [S2]\n${source.facts.rows.map(row=>'- '+row.primary_reason+': '+row.exits+' ('+row.pct_of_exit_responses+'%). [S2]').join('\n')}\nFieldwork dates and suppression metadata are unavailable. [S2]`:'Exit-survey feedback is unavailable in this current snapshot. [S2]';
   return route.fulfill({json:{answer,nextStep:'none'}});
  }
  if(url.pathname==='/api/survey-sentiment'){
   if(stage==='timeout')return;
   return route.fulfill({json:{as_of:'2026-09-30',summary:{exit_respondents:50},exit_reasons:[{primary_reason:'Work-Life Balance',exits:20,pct_of_exit_responses:40},{primary_reason:'Manager',exits:15,pct_of_exit_responses:30},{primary_reason:'New Opportunity',exits:10,pct_of_exit_responses:20},{primary_reason:'Other',exits:5,pct_of_exit_responses:10}]}});
  }
  if(url.pathname==='/api/dashboard')return route.fulfill({json:scopeDashboard(url.search)});
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await input.fill(text);await button('Send overview question').click()};
 await page.goto(base);await dismissHomeOnboarding(page);const status=page.getByRole('status',{name:'Home data status'});
 await input.waitFor();await status.waitFor({state:'hidden',timeout:18000});
 check(mode+' all current demo goals seeded',(await state()).goals.goals.length===homeDemoExamples.length);
 await send('What did exit-survey respondents report?');await page.locator('[data-chat-role=assistant]').last().getByText(/Exit-survey feedback is unavailable/).waitFor();
 check(mode+' timeout answer and chart share missing S2',posts.at(-1).overviewBriefingContext.sources.find(s=>s.id==='S2').status==='timeout'&&await page.locator('[data-exit-reason-chart]').count()===0);
 stage='loaded';await button('Open data details').click();await button('Refresh overview evidence').click();await status.getByText('Loading data…',{exact:true}).waitFor({state:'hidden'});
 await send('What did exit-survey respondents report?');const reply=page.locator('[data-chat-role=assistant]').last();await reply.locator('[data-exit-reason-chart]').waitFor();
 check(mode+' refreshed request has loaded S2 and no stale unavailable assistant history',posts.at(-1).overviewBriefingContext.sources.find(s=>s.id==='S2').status==='loaded'&&!posts.at(-1).history.some(turn=>/feedback is unavailable/.test(turn.content)));
 check(mode+' current prose and chart agree on exact respondent snapshot',/50 exit-survey respondents/.test(await reply.innerText())&&!/feedback is unavailable/.test(await reply.innerText())&&JSON.stringify(await reply.locator('[data-reason-bar]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.count))))==='[20,15,10]');
 check(mode+' unavailable fieldwork caveat does not hide available reasons',(await reply.innerText()).includes('Fieldwork dates and suppression metadata are unavailable'));
 await reply.screenshot({path:`/tmp/recovery-home-captures/${mode}-refreshed-s2.png`});
 await button('Reset conversation').click();await button('Open goal: Reduce turnover').click();const before=await state(),id=before.goals.activeId,attachments=JSON.stringify(before.workspaces[id].fields.homeSolutionBundlesV1.attachments),goalContext=JSON.stringify(before.goals.goals.find(g=>g.id===id).context);
 await send('have a budget of 6000');const conversation=page.getByRole('region',{name:'Overview conversation'});
 await conversation.getByText(/New Action Plan #2/).waitFor();
 check(mode+' first synchronous local edit displays both chat messages',await conversation.locator('[data-chat-role=user]').count()===1&&await conversation.locator('[data-chat-role=assistant]').count()===1&&(await conversation.innerText()).includes('have a budget of 6000'));
 check(mode+' demo propose flows through HomeDemoPlans without a model call or context erasure',posts.length===2&&JSON.stringify((await state()).goals.goals.find(g=>g.id===id).context)===goalContext&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments)===attachments);
 await send('use 20 participants');await page.getByRole('region',{name:'Action Plans for your goal',exact:true}).getByText(/20 assumed participants/).waitFor();
 await page.screenshot({path:`/tmp/recovery-home-captures/${mode}-first-local-edits.png`,fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Apply changes',exact:true}).waitFor();
 check(mode+' seeded goals and unapplied demo revision survive reload once',(await state()).goals.goals.length===homeDemoExamples.length&&await button('Apply changes').isEnabled()&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments)===attachments);
 check(mode+' restored history is retained in storage and stays hidden', (await state()).workspaces[id].fields.chat.messages.length===4&&await page.locator('[aria-label="Overview conversation"] [data-chat-role]').count()===0);
 await send('have a budget of 7000');await conversation.getByText(/\$7,000/).waitFor();check(mode+' new synchronous answer after reload is visible',await conversation.locator('[data-chat-role=assistant]').count()===1);
 const alternatives=JSON.stringify((await state()).workspaces[id].fields.homePlanAlternativesV1);await button('Reset conversation').click();await button('Open goal: Reduce turnover').click();check(mode+' reset preserves saved alternatives and attached history',JSON.stringify((await state()).workspaces[id].fields.homePlanAlternativesV1)===alternatives&&JSON.stringify((await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments)===attachments);
 check(mode+' no runtime errors, external requests or overflow',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
