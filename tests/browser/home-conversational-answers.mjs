// Production UI; synthetic responses only. No live sources or model calls.
import assert from 'node:assert/strict';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {bundleProposalFixture} from '../fixtures/home-bundles.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3242';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort();}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);
   if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.')return route.fulfill({json:{proposal:bundleProposalFixture(body.goalContext.goal)}});
   const text=body.message.split('\n\n')[0];
   const answer=text==='why was turnover high in april'?'Which April do you mean: 2024, 2025 or 2026? The supplied monthly company observations do not establish a cause. [A1]':text.startsWith('I mean April 2025')?'April 2025 company turnover was 2.4% with 12 exits, compared with 1.6% and 8 exits in March 2025. The monthly denominator and causal evidence are unavailable. [A1]':text.startsWith('why')?'April 2026 company turnover was 2.4%, compared with 1.6% in March: an increase of 0.8 percentage points. [A1] The company recorded 12 exits versus 8. The monthly denominator and evidence explaining the cause are unavailable. [A1]':text.startsWith('What about')?'March 2026 company turnover was 1.6%, with 8 exits. This comparison does not establish a cause. [A1]':text.startsWith('How many')?'The selected workforce contains 120 people. [W1]':text.startsWith('Develop')?'Evidence and scope: review monthly company exits. Proposed next steps: validate the denominator and reported reasons. Costs remain unknown.':'Your goal is to reduce turnover. Review period and scope before choosing actions.';
   // Deliberately return an unsolicited candidate even for questions: UI must preserve the answer.
   return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer,next_step:'none',problem:'Investigate recorded turnover',problem_evidence:['A1.voluntary_exits'],options:[{operation:'review_recorded_exits',evidence:['A1.voluntary_exits']}],question:null,finding_followups:[]}),Boolean(body.hasFocusedIssue),body.overviewBriefingContext)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'},summary:{total_exits:88,voluntary_exits:60,regrettable_exits:20,current_workforce:120},as_of:'2026-09-30',trend:[{month:'2024-04-01',total_exits:4,voluntary_exits:3,monthly_turnover_pct:0.8,monthly_voluntary_turnover_pct:0.6},{month:'2025-03-01',total_exits:8,voluntary_exits:6,monthly_turnover_pct:1.6,monthly_voluntary_turnover_pct:1.2},{month:'2025-04-01',total_exits:12,voluntary_exits:9,monthly_turnover_pct:2.4,monthly_voluntary_turnover_pct:1.8},{month:'2026-03-01',total_exits:8,voluntary_exits:6,monthly_turnover_pct:1.6,monthly_voluntary_turnover_pct:1.2},{month:'2026-04-01',total_exits:12,voluntary_exits:9,monthly_turnover_pct:2.4,monthly_voluntary_turnover_pct:1.8}],business_units:[],levels:[],tenure:[],reasons:[]}});
  return route.continue();
 });
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByRole('region',{name:'Overview conversation'});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await input.fill(text);await button('Send overview question').click();await page.getByRole('status',{name:'AI answer status',exact:true}).waitFor({state:'hidden'});};
 await page.goto(base);await input.waitFor();await button('Send overview question').waitFor();
 await send('why was turnover high in april 2026');await chat.getByText(/April 2026 company turnover/).waitFor();
 check(mode+' direct answer is visible outside any card/details',await chat.locator('[data-chat-role="assistant"]').isVisible()&&await chat.locator('details [data-chat-role="assistant"]').count()===0);
 check(mode+' no forced goal, preparation error, or saved goal',await page.getByRole('region',{name:'Pin this problem'}).count()===0&&await page.getByRole('status',{name:'Problem and options not prepared'}).count()===0&&!(await state()).goals.activeId);
 const monthly=posts[0].overviewBriefingContext.sources.find(s=>s.id==='A1');check(mode+' requested monthly evidence reaches request with company scope',monthly.facts.monthly.some(r=>r.month==='2026-04-01')&&monthly.scope==='Company-wide; unfiltered');
 await send('What about March?');await chat.getByText(/March 2026 company turnover was/).waitFor();
 check(mode+' follow-up retains question and assistant answer',posts[1].history.length===2&&posts[1].history[0].content==='why was turnover high in april 2026'&&posts[1].history[1].content.includes('0.8 percentage points'));
 check(mode+' transcript retains both conversational answers',await chat.locator('[data-chat-role="assistant"]').count()===2);
 await send('How many people are in the workforce?');await chat.getByText(/selected workforce contains 120/).waitFor();check(mode+' general question remains conversational',await page.getByRole('region',{name:'Pin this problem'}).count()===0);
 await send('why was turnover high in april');await chat.getByText(/Which April do you mean/).waitFor();
 await send('I mean April 2025. How did it compare with March 2025, and can the available evidence explain the difference?');await chat.getByText(/April 2025 company turnover was/).waitFor();
 const compared=posts.at(-1).overviewBriefingContext.sources.find(s=>s.id==='A1').facts.monthly;
 check(mode+' exact two-turn clarification supplies both comparison months from source',compared[0].month==='2025-04-01'&&compared[0].total_exits===12&&compared[0].monthly_turnover_pct===2.4&&compared[1].month==='2025-03-01'&&compared[1].total_exits===8&&compared[1].monthly_turnover_pct===1.6);
 check(mode+' comparison retains bounded conversation without a forced goal',posts.at(-1).history.some(turn=>turn.role==='user'&&turn.content==='why was turnover high in april')&&await page.getByRole('region',{name:'Pin this problem'}).count()===0);
 await send('I want to reduce turnover');await button('Pin overall turnover goal').waitFor();check(mode+' explicit goal still offers Pin with answer visible',await chat.getByText(/Your goal is to reduce turnover/).isVisible()&&!(await state()).goals.activeId);
 await button('Pin overall turnover goal').click();await page.getByRole('region',{name:'Action Plans for your goal',exact:true}).waitFor();
 check(mode+' Pin preserves explicit goal and requests plans once',posts.filter(p=>p.message==='Prepare coordinated solution bundles for my exact pinned goal.').length===1&&(await state()).goals.goals.some(g=>g.statement==='I want to reduce turnover'));
 await send('Develop a full action plan');await chat.getByText(/Evidence and scope: review monthly company exits/).waitFor({state:'attached'});await chat.getByText('Why these plans',{exact:true}).last().click();await chat.getByText(/Evidence and scope: review monthly company exits/).waitFor();check(mode+' explicit plan request remains supported',posts.at(-1).message.startsWith('Develop a full action plan')&&posts.at(-1).hasFocusedIssue===true);
 await send('why was turnover high in april 2026');await chat.getByText(/April 2026 company turnover/).last().waitFor();check(mode+' pinned goal does not block a direct question',await chat.getByText(/April 2026 company turnover/).last().isVisible());
 check(mode+' no runtime errors, live sources, or horizontal overflow',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/home-ai-conversation-'+mode+'.png',fullPage:true});await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
