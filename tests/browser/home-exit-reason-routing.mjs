import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
// Local production shell; aggregate/model responses intercepted. This proves
// packet selection, refresh and presentation, not live-model wording or hosted QA.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {exitReasonSurvey,exitMissingFieldsBullet} from '../fixtures/exit-reason-packet.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3280',output='/tmp/next-integration-exit-reasons';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
await fs.mkdir(output,{recursive:true});
try{for(const width of [1366,390])for(const palette of ['light','slate-blue']){
 const name=width+'-'+palette,context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390}),page=await context.newPage(),posts=[],errors=[];
 let sourceMode='questions',gets=0,external=0;
 await context.addInitScript(value=>localStorage.setItem('people-analytics-workspace-palette-v1',value),palette);
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);const source=body.overviewBriefingContext.sources.find(row=>row.id==='S2'),reasons=source.facts?.rows.filter(row=>row.kind==='Reported primary reason')??[];
   const answer=reasons.length?`Work-Life Balance, Manager and New Opportunity lead the supplied reported reasons.\n- Primary reasons among ${source.facts.exit_respondents.toLocaleString('en-US')} exit-survey respondents: [S2]\n${reasons.map(row=>'  - '+row.primary_reason+': '+row.exits+' ('+row.pct_of_exit_responses+'%). [S2]').join('\n')}\n- Reported reasons are not proven causes. [S2]\n${exitMissingFieldsBullet}`:`Stated exit reasons are unavailable in this snapshot; these are experience ratings. [S2]\n- Favorable responses among 1,957 exit-survey respondents: [S2]\n  - Work-life balance: 87.5%. [S2]\n  - Recommending the organization: 68.5%. [S2]\n  - Manager relationship: 58.9%. [S2]\n${exitMissingFieldsBullet}`;
   return route.fulfill({json:{answer,nextStep:'none',findingFollowups:[]}});
  }
  if(url.pathname==='/api/survey-sentiment'){
   gets++;const data=structuredClone(exitReasonSurvey);
   if(sourceMode==='questions')data.exit_reasons=[];
   if(sourceMode==='changed'){data.exit_reasons[0].exits=240;data.exit_reasons[0].pct_of_exit_responses=12.3;}
   return route.fulfill({json:data});
  }
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});
  if(url.pathname==='/api/attrition')return route.fulfill({json:{as_of:'2026-09-30',summary:{total_exits:828},reasons:[{separation_reason:'New Opportunity',exits:107},{separation_reason:'Manager',exits:107},{separation_reason:'Compensation',exits:99}]}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Unused synthetic source.'}});
  return route.continue();
 });
 const button=text=>page.getByRole('button',{name:text,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),reply=()=>page.locator('[data-chat-role=assistant]').last();
 const send=async()=>{const done=page.waitForResponse(response=>response.url()===base+'/api/chat');await input.fill('exit survey reasons');await button('Send overview question').click();await done;await page.getByRole('status',{name:'AI answer status',exact:true}).waitFor({state:'hidden'});};
 const refresh=async mode=>{sourceMode=mode;const prior=gets;await button('Open data details').click();await button('Refresh overview evidence').click();await page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);assert.ok(gets>prior,'Refresh requests current survey evidence');};
 await page.goto(base);await dismissHomeOnboarding(page);await input.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);
 await send();
 check(name+' exact phrase is sent unchanged',posts.at(-1).message.split('\n\n')[0]==='exit survey reasons');
 check(name+' missing reason rows retain favorability without inventing a reasons chart',await reply().locator('[data-exit-reason-chart]').count()===0&&(await reply().innerText()).includes('87.5%')&&posts.at(-1).overviewBriefingContext.sources.find(s=>s.id==='S2').facts.rows.every(row=>row.exits===null));
 check(name+' requested missing evidence stays inline while generic inventory is collapsed',(await reply().innerText()).includes('Stated exit reasons are unavailable')&&!(await reply().innerText()).includes('respondent-level detail'));
 check(name+' favorable figures render as three nested bullets',await reply().locator('.home-answer > ul > li > ul > li').count()===3);
 await reply().screenshot({path:output+'/'+name+'-questions-only.png'});
 await refresh('reasons');await send();const current=reply(),packet=posts.at(-1).overviewBriefingContext.sources.find(s=>s.id==='S2');
 await current.locator('[data-exit-reason-chart]').waitFor();
 check(name+' exact phrase selects three primary reasons when mixed source has both measures',packet.facts.rows.every(row=>row.kind==='Reported primary reason')&&JSON.stringify(packet.facts.rows.map(row=>row.exits))==='[244,243,242]');
 check(name+' refresh removes stale assistant unavailability from model context',!posts.at(-1).history.some(turn=>turn.role==='assistant'&&turn.content.includes('Stated exit reasons are unavailable')));
 check(name+' prose and chart use the same current respondent count and categories',(await current.innerText()).includes('1,957 exit-survey respondents')&&JSON.stringify(await current.locator('[data-reason-bar]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.count))))==='[244,243,242]');
 check(name+' reasons do not reuse A1 or survey-item favorability',!/(?:87\.5|68\.5|58\.9|107|99)(?:%| \()/.test(await current.innerText()));
 check(name+' generic inventory is not a main-answer bullet',!(await current.innerText()).includes('stronger retention conclusions')&&await current.locator('.home-answer > ul > li').count()===2&&await current.locator('.home-answer > ul > li > ul > li').count()===3);
 const details=current.locator('[data-answer-evidence-details]');
 await details.locator('summary').focus();await page.keyboard.press('Enter');
 check(name+' evidence detail opens by keyboard and retains source marker',await details.getAttribute('open')!==null&&(await details.innerText()).includes('stronger retention conclusions')&&await details.locator('[data-chat-citation=S2]').count()===1);
 await details.locator('summary').focus();await page.keyboard.press('Space');
 check(name+' evidence detail closes by keyboard',await details.getAttribute('open')===null);
 check(name+' reason chart keeps concise qualification and secondary metadata accessible',(await current.locator('[data-exit-reason-chart]').innerText()).includes('Reported reasons, not proven causes.')&&!(await current.locator('[data-exit-reason-chart]').innerText()).includes('suppression metadata'));
 await current.screenshot({path:output+'/'+name+'-reasons.png'});
 await refresh('changed');await send();
 check(name+' changed source replaces chart values with current packet values',JSON.stringify(await reply().locator('[data-reason-bar]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.count))))==='[243,242,240]'&&!posts.at(-1).history.some(turn=>turn.role==='assistant'&&turn.content.includes('244')));
 check(name+' no external calls, runtime errors or mobile overflow',external===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
