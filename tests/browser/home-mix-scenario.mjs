import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
// Built Home and its real worker. Only evidence/model transport is stubbed.
import assert from 'node:assert/strict';
import {bundleProposalFixture} from '../fixtures/home-bundles.mjs';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {readHomeMixHistory} from '../../lib/home-mix-history.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3366';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let unexpected=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){unexpected++;return route.abort()}
  if(url.pathname==='/api/chat'){const body=request.postDataJSON();posts.push(body);return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:bundleProposalFixture(body.goalContext.goal)}:decodeHomeModelReply(JSON.stringify({answer:'Review the stated staffing assumptions.',next_step:'none',problem:'Review additional capacity',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']}],question:null}),Boolean(body.hasFocusedIssue),body.overviewBriefingContext)})}
  if(url.pathname.startsWith('/api/')){if(request.method()!=='GET'){unexpected++;return route.abort()}return route.fulfill({json:{overview:{headcount:123,fte:123,open_positions:3,snapshot_date:'2026-09-30'}}})}return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true}),mix=page.getByRole('region',{name:'Automatic staffing search',exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await chat.fill(text);await button('Send overview question').click()},ready=async()=>{await mix.getByLabel('Staffing search coverage').waitFor()},change=async text=>{const old=await mix.getAttribute('data-mix-fingerprint');await send(text);await page.waitForFunction(old=>{const n=document.querySelector('[aria-label="Automatic staffing search"]');return n?.dataset.mixFingerprint&&n.dataset.mixFingerprint!==old},old);await ready()};
 await page.goto(base);await dismissHomeOnboarding(page);await button('Open goal: Add 5 roles over 12 months').click();await ready();
 const demo=(await state()).workspaces['demo-capacity-mix'].fields.homeSolutionBundlesV1.attachments[0];
 check(mode+' first-run capacity demo automatically evaluates 12 real combinations',await mix.getByLabel('Staffing search coverage').getByText(/12 combinations evaluated.*13 calculator calls/).isVisible()&&posts.length===0);
 check(mode+' fictional basis and useful mixed result are visible',await mix.getByText(/Explicit fictional staffing scenario\./).isVisible()&&await mix.getByText(/Build → Develop internal candidates; Fictional Build group: 3/).isVisible()&&await mix.getByText(/Complete cash \$26,800 USD/).isVisible()&&!/\b(?:illustrative|synthetic)\b/i.test(await mix.textContent()));
 check(mode+' staffing panel does not repeat full-horizon all-hire payroll as mixed-result cash',await panel.getByText(/Scenario cost basis:/).count()===0);
 await mix.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/home-mix-scenario-demo-'+mode+'.png',fullPage:true});await mix.screenshot({path:'/tmp/home-mix-scenario-panel-'+mode+'.png'});
 check(mode+' original demo attachment is still all-hire and unchanged',demo.draft.inputs.capacity.input.buy==='5'&&(await state()).workspaces['demo-capacity-mix'].fields.homeSolutionBundlesV1.attachments.length===1);
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'other',statement:'Improve support'}]},workspaces:{}})});await page.reload();
 await send('Add 5 engineering roles over 12 months');await button('Pin as goal').click();await page.locator('[data-plan-current="true"]').waitFor();await ready();const id=(await state()).goals.activeId;
 check(mode+' fresh real goal still starts with only its stated hire scenario',await mix.getByLabel('Staffing search coverage').getByText(/1 combinations evaluated/).isVisible()&&await mix.getByText(/say “Use demo staffing assumptions”/).isVisible());const originalPosts=posts.length;
 await change('Use demo staffing assumptions');
 check(mode+' chat opt-in calculates all explicit bounds without a model or new button',posts.length===originalPosts&&await mix.getByLabel('Staffing search coverage').getByText(/12 combinations evaluated/).isVisible()&&await page.getByRole('button',{name:/^(Search|Explore|Build Mix|Save Calculation)$/i}).count()===0);
 check(mode+' no budget is invented and release uncertainty remains visible',await mix.getByText(/Cash ceiling Unknown/).isVisible()&&await mix.getByLabel('Staffing search conclusion').getByText(/12 unresolved/).isVisible()&&await mix.getByText(/Zero backfills assumes no source-team replacement need/).isVisible());
 await change('set budget to 100000');check(mode+' explicit ceiling enables the conditional mixed candidate',await mix.getByLabel('Staffing search conclusion').getByText(/1 meet entered constraints/).isVisible()&&await mix.getByLabel('Build 3 · Move 2 · Buy 0 · best explored under the objective',{exact:true}).isChecked());
 await change('set Build search maximum to 2');check(mode+' changing a bound changes enumeration and does not quietly relax it',await mix.getByLabel('Staffing search coverage').getByText(/9 combinations evaluated.*Build 0–2/).isVisible()&&await mix.getByLabel('Staffing search conclusion').getByText(/No feasible candidate/).isVisible());
 await change('set Build search maximum to 3; set monthly cost per role to 7000');await mix.getByText('Search provenance and limits',{exact:true}).click();check(mode+' monthly rate edit reaches the annual staffing calculator',await mix.getByText(/annualHireCost: 84000 · user-entered/).isVisible());
 await button('Apply changes').click();await page.waitForFunction(({key,id})=>!!JSON.parse(localStorage.getItem(key)).payload.workspaces[id].fields.homeMixHistoryV1,{key:DECISIONS_STORAGE_KEY,id});await ready();
 const fields=(await state()).workspaces[id].fields,saved=JSON.stringify(fields.homeMixHistoryV1);
 check(mode+' Apply saves the exact candidate and preserves inactive future Hire mapping',fields.homePlanAlternativesV1.plans.at(-1).draft.inputs.capacity.input.buy==='0'&&fields.homePlanAlternativesV1.plans.at(-1).draft.inputs.mixScenario.flows.some(f=>f.path==='buy')&&!!await readHomeMixHistory(fields.homeMixHistoryV1,id));
 await page.reload();await page.getByText('Verified local staffing searches (1)',{exact:true}).waitFor();await ready();
 check(mode+' reload replays source history and keeps all 12 combinations available',JSON.stringify((await state()).workspaces[id].fields.homeMixHistoryV1)===saved&&await mix.getByLabel('Staffing search coverage').getByText(/12 combinations evaluated/).isVisible());
 check(mode+' 390px and zoom render without overflow or runtime errors',errors.length===0&&unexpected===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
