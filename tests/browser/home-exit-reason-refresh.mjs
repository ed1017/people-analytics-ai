// Real source-loader timeout, synthetic aggregate/model fixtures, no external calls.
import assert from 'node:assert/strict';
import {homeExitReasonChartFromPacket} from '../../lib/home-exit-reason-chart.ts';
import {exitReasonSurvey,exitMissingFieldsBullet} from '../fixtures/exit-reason-packet.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3290';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
const reasonQuestion='What reasons do employees give for leaving in the exit survey?';
const survey=structuredClone(exitReasonSurvey);
survey.exit_dimensions=Array.from({length:12},(_,index)=>({...survey.exit_dimensions[0],question_code:'Q'+index,question_text:reasonQuestion}));
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];
 let surveyReads=0,external=0,stalledSurvey=null,replyMode='unavailable',suppressed=false;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);const packet=body.overviewBriefingContext,source=packet.sources.find(row=>row.id==='S2');
   const chart=homeExitReasonChartFromPacket(packet);
   const facts=chart?'Primary reasons among '+chart.respondents.toLocaleString('en-US')+' exit-survey respondents: [S2]\n'+chart.rows.map(row=>'  - '+row.reason+': '+row.count+' ('+row.percentage+'%). [S2]').join('\n'):'';
   const answer=replyMode==='unavailable'?'Exit-survey feedback is unavailable. I cannot establish the reported reasons or their counts from the supplied evidence. [S2]':replyMode==='wrong'?facts.replace('244 (12.5%)','245 (12.5%)'):replyMode==='denial'?"I don't have exit-survey counts. [S2]\n"+facts:replyMode==='ratings'?'These are exit experience ratings. [S2]\n- Favorable responses: '+source.facts.rows[0].favorable_pct+'%. [S2]':replyMode==='suppressed'?'The supplied exit-survey counts are suppressed, so reported-reason frequencies cannot be established. [S2]':'Exit-survey feedback was unavailable before refresh.\n- '+facts+'\n- Reported reasons are not proven causes. [S2]\n'+exitMissingFieldsBullet;
   return route.fulfill({json:{answer,nextStep:'none',findingFollowups:[]}});
  }
  if(url.pathname==='/api/survey-sentiment'){
   surveyReads++;if(surveyReads===1){stalledSurvey=route;return;}
   return route.fulfill({json:{...survey,...(suppressed?{suppressed:true}:{})}});
  }
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});
  if(url.pathname==='/api/attrition')return route.fulfill({json:{as_of:'2026-09-30',summary:{total_exits:999},reasons:[{separation_reason:'Manager',exits:107}]}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Unused synthetic source.'}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),answer=()=>page.locator('[data-chat-role="assistant"]').last();
 const settle=()=>page.getByLabel('Evidence refresh status',{exact:true}).waitFor({state:'hidden'});
 const send=async text=>{await input.fill(text);const done=page.waitForResponse(response=>response.url()===base+'/api/chat');await button('Send overview question').click();await done;await page.getByRole('status',{name:'AI answer status',exact:true}).waitFor({state:'hidden'});};
 const refresh=async()=>{await button('Open data details').click();await button('Refresh overview evidence').click();await settle();};
 const packet=()=>posts.at(-1).overviewBriefingContext.sources.find(source=>source.id==='S2');
 await page.goto(base);await input.waitFor();await settle();await stalledSurvey?.abort().catch(()=>{});await send(reasonQuestion);
 check(mode+' initial source timeout stays explicit with no chart',packet().status==='timeout'&&await answer().locator('[data-exit-reason-chart]').count()===0);
 await refresh();replyMode='wrong';await send('Show the chart now');
 check(mode+' short follow-up after refresh prioritizes reasons in mixed source',packet().status==='loaded'&&packet().coverage.rowsAvailable===16&&packet().facts.rows.every(row=>row.kind==='Reported primary reason'));
 check(mode+' refreshed request keeps prior question but removes stale assistant absence',posts.at(-1).history.some(turn=>turn.role==='user'&&turn.content===reasonQuestion)&&!posts.at(-1).history.some(turn=>turn.role==='assistant'&&turn.content.includes('unavailable')));
 check(mode+' wrong model count cannot produce a chart from correct packet',packet().facts.rows[0].exits===244&&await answer().locator('[data-exit-reason-chart]').count()===0);
 replyMode='denial';await send('Which reason was most common?');
 check(mode+' current missing-count denial blocks chart despite otherwise correct numbers',await answer().locator('[data-exit-reason-chart]').count()===0&&packet().facts.rows.every(row=>row.kind==='Reported primary reason'));
 replyMode='recovered';await send('Why?');const chart=answer().locator('[data-exit-reason-chart]');await chart.waitFor();
 check(mode+' historical absence permits current matching packet chart',JSON.stringify(await chart.locator('[data-reason-bar]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.count))))==='[244,243,242]'&&(await answer().innerText()).includes('unavailable before refresh'));
 check(mode+' canonical metadata disclosure and source boundaries remain intact',(await chart.innerText()).includes('1,957 exit-survey respondents')&&(await chart.innerText()).includes('Reported reasons, not proven causes.')&&await answer().locator('[data-answer-evidence-details]').getAttribute('open')===null&&!/999|107/.test(await chart.innerText()));
 await answer().screenshot({path:'/tmp/home-bounded-exit-refresh-'+mode+'.png'});
 replyMode='ratings';await send('Show exit-survey ratings instead of reasons');
 check(mode+' explicit measure switch selects experience rows without a reasons chart',packet().facts.rows.every(row=>row.kind==='Exit experience question')&&await answer().locator('[data-exit-reason-chart]').count()===0);
 await send('Show the chart now');
 check(mode+' later shorthand does not resurrect superseded reason intent',packet().facts.rows.every(row=>row.kind==='Exit experience question')&&await answer().locator('[data-exit-reason-chart]').count()===0);
 check(mode+' one model call per user turn and one fetch per refresh',posts.length===6&&surveyReads===2);
 suppressed=true;await refresh();replyMode='suppressed';await send('exit survey reasons');
 check(mode+' root suppression reaches model packet and invalidates prior charts',packet().facts.exit_respondents===null&&packet().facts.rows.every(row=>row.suppressed&&row.exits===null&&row.pct_of_exit_responses===null)&&await page.locator('[data-exit-reason-chart]').count()===0&&surveyReads===3&&posts.length===7);
 await button('Reset conversation').click();
 check(mode+' reset and narrow viewport retain boundaries',await page.locator('[data-exit-reason-chart]').count()===0&&errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
