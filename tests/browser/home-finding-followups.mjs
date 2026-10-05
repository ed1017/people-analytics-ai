// Built Home, production decoder, synthetic endpoints only. No live model or Attach actions.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspectHomeChatResponse} from '../../lib/home-chat-response.ts';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const baseUrl=process.env.HOME_BASE_URL??'http://127.0.0.1:3104',output=await fs.mkdtemp(path.join(os.tmpdir(),'home-finding-followups-'));
const findings=[
 {id:'f1',text:'Ten employees appear in the selected snapshot; FTE is a different measure. [W1]',evidence:['W1:summary'],prompt:'What can this snapshot show, and what cannot it tell us about capacity?'},
 {id:'f2',text:'Four voluntary exits are recorded company-wide; reported reasons are not causes. [A1]',evidence:['A1:summary'],prompt:'What do the supplied recorded exit summaries show, and which breakdowns are unavailable?'},
];
const answer='Review these recorded observations.\n\n'+findings.map(item=>'- '+item.text).join('\n')+'\n- Review the scope before deciding.\n\n[W1] See [Workforce](app:workforce).';
const raw={answer,finding_followups:findings,next_step:'none',problem:null,problem_evidence:[],options:[],question:null};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let unexpected=0,malformed=false,delay=false,release=null,failure=null;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const oldMessage={role:'assistant',content:answer,findingFollowups:findings};
 const seed={version:1,revision:1,goals:{version:1,activeId:'first',goals:[{id:'first',statement:'Review recorded workforce context'},{id:'second',statement:'A separate investigation'}]},workspaces:{first:{savedAt:'2026-10-05T00:00:00Z',fields:{chat:{messages:[oldMessage],input:'Saved unfinished draft',problem:null,questionUnanswered:false},sentinel:{preserve:true}}},second:{savedAt:'2026-10-05T00:00:00Z',fields:{chat:{messages:[oldMessage],input:'Second goal draft',problem:null,questionUnanswered:false}}}}};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==baseUrl){unexpected++;return route.abort();}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);
   if(failure){const inspected=inspectHomeChatResponse(failure,body.hasFocusedIssue,body.overviewBriefingContext,4000);return route.fulfill({status:502,json:inspected.body});}
   const isExplore=body.message.startsWith('Explore this finding:'),reply=isExplore?{...raw,answer:'Follow-up uses the supplied aggregate evidence. Unavailable breakdowns remain unknown.',finding_followups:[]}:structuredClone(raw);
   if(malformed)reply.finding_followups=[{...findings[0],text:'A different visible finding. [W1]'}];
   const decoded=decodeHomeModelReply(JSON.stringify(reply),body.hasFocusedIssue,body.overviewBriefingContext);
   if(delay){await new Promise(resolve=>{release=resolve});}
   return route.fulfill({json:decoded}).catch(()=>{});
  }
  if(url.pathname.startsWith('/api/')){if(request.method()!=='GET'){unexpected++;return route.abort();}return route.fulfill({json:{overview:{headcount:10,fte:8,open_positions:3,snapshot_date:'2026-09-30'},summary:{current_workforce:10,total_exits:4,voluntary_exits:4},as_of:'2026-09-30'}});}
  return route.continue();
 });
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=page.getByRole('button',{name:'Send overview question',exact:true}),actions=page.getByRole('button',{name:/^Explore this finding:/}),conversation=page.getByRole('region',{name:'Overview conversation',exact:true});
 const ask=async()=>{await input.fill('Identify the recorded findings');await send.click();await actions.first().waitFor();};
 await page.goto(baseUrl);await input.waitFor();check(mode+' restored answers are inert and drafts survive hydration',await actions.count()===0&&await input.inputValue()==='Saved unfinished draft'&&posts.length===0);
 await ask();check(mode+' one initial call produces only two explicitly designated controls',posts.length===1&&await actions.count()===2&&await conversation.getByText('Review the scope before deciding.',{exact:true}).isVisible());
 check(mode+' designated exact text, questions and existing source link stay visible',await conversation.getByText(findings[0].text,{exact:true}).isVisible()&&await conversation.getByText('Ask: '+findings[1].prompt,{exact:true}).isVisible()&&await conversation.getByRole('button',{name:'Workforce',exact:true}).count()===1);
 check(mode+' controls have keyboard-sized targets and response body remains 14px',await actions.first().evaluate(node=>node.getBoundingClientRect().height>=44)&&await conversation.locator('.home-answer').evaluate(node=>getComputedStyle(node).fontSize==='14px'));
 await input.fill('Keep my unfinished question');await actions.first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,mode+'.png')});await actions.first().evaluate(node=>{node.click();node.click();});
 await conversation.getByText('Follow-up uses the supplied aggregate evidence. Unavailable breakdowns remain unknown.',{exact:true}).waitFor();
 check(mode+' double click sends exactly once and preserves typed draft',posts.length===2&&await input.inputValue()==='Keep my unfinished question'&&await actions.count()===0);
 const followup=posts[1];check(mode+' exact selected finding and prompt use unchanged approved Home envelope',followup.message.includes(findings[0].text)&&followup.message.includes(findings[0].prompt)&&!followup.message.includes(findings[1].prompt)&&Object.keys(followup).sort().join('|')===['page','persona','message','history','goalContext','marketReference','hasFocusedIssue','overviewBriefingContext'].sort().join('|')&&!JSON.stringify(followup).includes('findingFollowups')&&followup.goalContext.goal===posts[0].goalContext.goal);
 check(mode+' saved conversation carries text only for new messages and leaves other fields intact',await page.evaluate(key=>{const fields=JSON.parse(localStorage.getItem(key)).payload.workspaces.first.fields;return fields.sentinel.preserve&&fields.chat.messages.slice(1).every(message=>Object.keys(message).sort().join('|')==='content|role')},DECISIONS_STORAGE_KEY));
 await ask();const stale=await actions.first().elementHandle();await page.getByText('More questions',{exact:true}).click();await page.getByRole('button',{name:'Refresh overview evidence',exact:true}).click();await stale.evaluate(node=>node.click());await page.waitForFunction(()=>!document.querySelector('[aria-label="Refresh overview evidence"]').disabled);check(mode+' evidence refresh invalidates old controls without an extra send',posts.length===3&&await actions.count()===0);
 await ask();const switched=await actions.first().elementHandle();await input.fill('Preserve first-goal draft');await page.getByLabel('Selected goal',{exact:true}).selectOption('second');await switched.evaluate(node=>node.click());check(mode+' goal switch invalidates old controls and keeps separate draft',posts.length===4&&await actions.count()===0&&await input.inputValue()==='Second goal draft');
 await page.getByLabel('Selected goal',{exact:true}).selectOption('first');check(mode+' returning to prior answer does not reactivate metadata',await actions.count()===0&&await input.inputValue()==='Preserve first-goal draft');
 await ask();await input.fill('Keyboard draft');await actions.nth(1).focus();await page.keyboard.press('Enter');await conversation.getByText('Follow-up uses the supplied aggregate evidence. Unavailable breakdowns remain unknown.',{exact:true}).waitFor();check(mode+' keyboard exploration targets its own finding and preserves draft',posts.length===6&&posts.at(-1).message.includes(findings[1].prompt)&&await input.inputValue()==='Keyboard draft');
 malformed=true;await input.fill('Return a malformed pair');await send.click();await conversation.getByText(findings[0].text,{exact:true}).waitFor();check(mode+' invalid metadata retains ordinary answer without controls',posts.length===7&&await actions.count()===0);malformed=false;
 await ask();await page.reload();await input.waitFor();check(mode+' reload keeps saved text but never revives live controls',posts.length===8&&await actions.count()===0);
 await ask();delay=true;await input.fill('Draft during request');await actions.first().click();await page.waitForFunction(()=>document.querySelector('[aria-label="Send overview question"]').disabled);await page.getByLabel('Selected goal',{exact:true}).selectOption('second');release?.();delay=false;await page.getByLabel('Selected goal',{exact:true}).selectOption('first');check(mode+' in-flight reply after goal change stays stale and preserves draft',posts.length===10&&await actions.count()===0&&await input.inputValue()==='Draft during request');
 await ask();const replaced=await actions.first().elementHandle();await ask();await replaced.evaluate(node=>node.click());check(mode+' a superseded response cannot activate an identical newer finding',posts.length===12&&await actions.count()===2);
 const personaStale=await actions.first().elementHandle();await input.fill('Perspective-change draft');await page.getByLabel('Select persona',{exact:true}).selectOption('Finance');await personaStale.evaluate(node=>node.click());check(mode+' perspective change invalidates the response while retaining typed text',posts.length===12&&await actions.count()===0&&await input.inputValue()==='Perspective-change draft');
 await ask();failure={status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[],output_text:'{\"answer\":\"DO_NOT_DISPLAY'};await input.fill('Draft before failed follow-up');await actions.first().click();await page.getByRole('alert').filter({hasText:'Preparation diagnostic: token_limit.'}).waitFor();check(mode+' failed follow-up preserves draft and surfaces safe token-limit reason without retry',posts.length===14&&await input.inputValue()==='Draft before failed follow-up'&&await actions.count()===0&&!await page.getByText('DO_NOT_DISPLAY',{exact:false}).count());
 failure=null;await ask();check(mode+' only an explicit new Send retries and restores finding controls',posts.length===15&&await actions.count()===2);
 failure={status:'completed',output:[],output_text:'MALFORMED_SECRET_OUTPUT'};await input.fill('Restore this initial question');await send.click();await page.getByRole('alert').filter({hasText:'Preparation diagnostic: invalid_json.'}).waitFor();check(mode+' malformed completed output remains distinct, safe and recoverable',posts.length===16&&await input.inputValue()==='Restore this initial question'&&await actions.count()===0&&!await page.getByText('MALFORMED_SECRET_OUTPUT',{exact:false}).count());failure=null;
 check(mode+' responsive runtime and network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks,output}));
