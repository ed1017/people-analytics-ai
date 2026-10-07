// Controlled timeout and synthetic aggregates; no live evidence or model calls.
import assert from 'node:assert/strict';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {homeExitReasonChartFromPack} from '../../lib/home-exit-reason-chart.ts';
import {exitReasonFixture,exitReasonQuestion,refreshedExitReasonQuestion,exitReasonAnswer,unavailableExitReasonAnswer} from '../fixtures/home-exit-reasons.mjs';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3251';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];let surveyReads=0,external=0,stalledSurvey=null;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);const answer=posts.length<3?unavailableExitReasonAnswer:exitReasonAnswer;
   return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer,next_step:'none',problem:null,problem_evidence:[],options:[],question:null,finding_followups:[]}),Boolean(body.hasFocusedIssue),body.overviewBriefingContext)});
  }
  if(url.pathname==='/api/survey-sentiment'){
   surveyReads++;if(surveyReads===1){stalledSurvey=route;return;} // Browser source loader must settle via its real 12-second timeout.
   return route.fulfill({json:exitReasonFixture()});
  }
  if(url.pathname==='/api/dashboard')return route.fulfill({json:scopeDashboard(url.search)});
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{as_of:'2026-09-30',summary:{total_exits:999,manager_favorable_pct:19.9},trend:[],reasons:[]}});
  return route.continue();
 });
 await page.goto(base);const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),answer=()=>page.locator('[data-chat-role="assistant"]').last();
 const settle=async()=>{await page.getByLabel('Evidence refresh status',{exact:true}).waitFor({state:'hidden'});};
 const send=async text=>{await input.fill(text);const done=page.waitForResponse(r=>r.url()===base+'/api/chat');await button('Send overview question').click();await done;await page.getByRole('status',{name:'AI answer status',exact:true}).waitFor({state:'hidden'});};
 const refresh=async()=>{await button('Open data details').click();await button('Refresh overview evidence').click();await settle();};
 await input.waitFor();await settle();await stalledSurvey?.abort().catch(()=>{});await send(exitReasonQuestion);
 check(mode+' initial S2 timeout is explicit and unavailable prose has no chart',posts[0].overviewBriefingContext.sources.find(s=>s.id==='S2').status==='timeout'&&await answer().locator('[data-exit-reason-chart]').count()===0);
 await refresh();await send(refreshedExitReasonQuestion);
 const recovered=posts[1].overviewBriefingContext.sources.find(s=>s.id==='S2');
 check(mode+' refresh recovers the full source but selects three reason rows for the actual request',recovered.status==='loaded'&&recovered.coverage.rowsAvailable===15&&JSON.stringify(recovered.facts.rows.map(row=>row.exits))==='[20,15,10]');
 check(mode+' stale unavailable history stays conversational context and cannot trigger contradictory chart',posts[1].history.some(turn=>turn.role==='assistant'&&turn.content.includes('unavailable'))&&await answer().locator('[data-exit-reason-chart]').count()===0);
 await send('Show the chart now using the refreshed exit-survey reasons.');const chart=answer().locator('[data-exit-reason-chart]');await chart.waitFor();
 const snapshot=homeExitReasonChartFromPack(posts[2].overviewBriefingContext),counts=await chart.locator('[data-reason-bar]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.count)));
 check(mode+' recovered numeric prose and chart use exactly the packet sent on that turn',JSON.stringify(counts)===JSON.stringify(snapshot.rows.map(row=>row.count))&&counts.join(',')==='20,15,10'&&(await answer().innerText()).includes('Work-Life Balance: 20 (40%)'));
 check(mode+' denominator/date/scope and missing metadata remain distinct from A1 and S1',/50 exit-survey respondents.*Company-wide.*2026/s.test(await chart.innerText())&&!/999|19.9/.test(await chart.innerText())&&(await answer().innerText()).includes('Fieldwork dates'));
 await chart.screenshot({path:'/tmp/home-exit-refresh-'+mode+'.png'});
 check(mode+' each user turn has one chat call and refresh has one additional shared survey fetch',posts.length===3&&surveyReads===2);
 await refresh();check(mode+' refresh invalidates old chart snapshots',await page.locator('[data-exit-reason-chart]').count()===0&&surveyReads===3);
 await button('Reset conversation').click();check(mode+' reset and narrow viewport preserve UI boundaries',await page.locator('[data-exit-reason-chart]').count()===0&&errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
