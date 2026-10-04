import assert from 'node:assert/strict';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {selectionFixture} from '../fixtures/workforce-selection.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const problem='Investigate engineering capacity';
const raw={answer:'Review the supplied workforce context. [W1]',next_step:'none',problem,problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']}],question:null};
const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[]},workspaces:{}};
let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['200-percent',683,450]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:mode==='200-percent'?2:1}),page=await context.newPage();let gate=null,release,variant='same',posts=0,external=0;const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin!=='http://127.0.0.1:3100'){external++;return route.abort()}if(url.pathname==='/api/chat'){posts++;const body=req.postDataJSON();return route.fulfill({json:decodeHomeModelReply(JSON.stringify(raw),body.hasFocusedIssue,body.overviewBriefingContext)})}if(url.pathname.startsWith('/api/')){if(req.method()!=='GET'){posts++;return route.abort()}if(gate)await gate;if(variant==='failed')return route.fulfill({status:503,json:{error:'Synthetic unavailable evidence'}});return route.fulfill({json:{overview:{headcount:variant==='changed'?13:12,fte:10,open_positions:3,snapshot_date:'2026-09-30'},summary:{total_exits:0,current_workforce:12,total_employees:12},as_of:'2026-09-30'}})}return route.continue()});
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Investigation options for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await page.goto('http://127.0.0.1:3100/');await input.fill('Find a supported investigation');await button('Send overview question').click();await button('Pin as goal').click();await panel.getByRole('article').waitFor();await input.fill('Keep my reload draft');await page.waitForTimeout(100);
 const saved=await state(),id=saved.goals.activeId,original=saved.workspaces[id].fields.homeCandidateOptions;
 saved.goals.goals.push({id:'other',statement:'Investigate another goal'});
 saved.workspaces.other={savedAt:'2026-10-04T00:00:00Z',fields:{chat:{messages:[],input:'Other goal draft',problem:null,questionUnanswered:false}}};
 saved.goals.goals.push({id:'prior-plan',statement:'Prior saved planning work'});saved.workspaces['prior-plan']={savedAt:'2026-10-04T00:00:00Z',fields:{workforceSolution:selectionFixture().solution}};
 for(const scenario of ['same','changed','failed','goal-change']){
  variant=scenario;gate=new Promise(resolve=>release=resolve);
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(saved)});await page.reload();
  await panel.getByText('Checking evidence for your saved options…',{exact:true}).waitFor();
  check(mode+' '+scenario+' waits without false stale warning',await button('Generate options for this goal').isDisabled()&&await panel.getByRole('article').count()===0&&!(await panel.innerText()).includes('no longer match'));
  check(mode+' '+scenario+' retains record and draft while waiting',JSON.stringify((await state()).workspaces[id].fields.homeCandidateOptions)===JSON.stringify(original)&&await input.inputValue()==='Keep my reload draft');
  if(scenario==='goal-change')await page.getByLabel('Selected goal',{exact:true}).selectOption('other');
  gate=null;release();
  if(scenario==='same'){await panel.getByRole('article').waitFor();check(mode+' matching packet restores cards without regeneration',await panel.getByText('Evidence review · Not calculated',{exact:true}).isVisible()&&await button('Generate options for this goal').count()===0)}
  if(scenario==='changed'){await panel.getByText('These saved candidates no longer match the goal or evidence. Their original record is kept.',{exact:true}).waitFor();check(mode+' changed packet alone gets stale state',await button('Generate options for this goal').isEnabled()&&await panel.getByRole('article').count()===0)}
  if(scenario==='failed'){await panel.getByText('Saved options cannot be verified while evidence is unavailable. Their original record is kept.',{exact:true}).waitFor();check(mode+' failed packet stays unverified without generation',await button('Generate options for this goal').isDisabled()&&!(await panel.innerText()).includes('no longer match'))}
  if(scenario==='goal-change'){await page.waitForFunction(()=>!document.querySelector('[aria-label="Refresh overview evidence"]').disabled);check(mode+' completion cannot restore the prior goal cards',await panel.getByRole('article').count()===0&&await panel.getByText('Investigate another goal',{exact:true}).isVisible()&&await input.inputValue()==='Other goal draft')}
  const after=await state();check(mode+' '+scenario+' preserves saved candidates and prior calculation',JSON.stringify(after.workspaces[id].fields.homeCandidateOptions)===JSON.stringify(original)&&JSON.stringify(after.workspaces['prior-plan'].fields.workforceSolution)===JSON.stringify(saved.workspaces['prior-plan'].fields.workforceSolution)&&posts===1);
 }
 check(mode+' no unexpected traffic errors or horizontal overflow',external===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}console.log(checks+' saved-candidate reload browser assertions passed')}finally{await browser.close()}
