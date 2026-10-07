// Production UI with synthetic replies and isolated browser storage; no live data/model calls.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3458';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',headless:true});
const goal='Reduce voluntary turnover by 20% within 12 months';
const answer='Synthetic navigation response: review the supplied evidence before choosing an intervention. No measured effect is claimed.';
const savedQuestion='Previously saved question for a different goal';
const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'other',statement:'Review a separate saved goal'}]},workspaces:{other:{savedAt:'2026-10-07T00:00:00Z',fields:{chat:{messages:[{role:'user',content:savedQuestion},{role:'assistant',content:'Previously saved answer'}],input:'Separate saved draft',problem:null,questionUnanswered:false},sentinel:{keep:'Unrelated saved work'}}}}};
let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{
 for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[],external=[];
  page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==base){external.push(url.origin);return route.abort()}
   if(url.pathname==='/api/chat'){posts.push(request.postDataJSON());return route.fulfill({json:{answer,nextStep:'none'}})}
   if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:120,fte:118,open_positions:3,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}});
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Synthetic source unavailable.'}});
   return route.continue();
  });
  const button=name=>page.getByRole('button',{name,exact:true});
  const chat=page.getByLabel('Ask Workforce AI',{exact:true});
  const transcript=page.getByRole('region',{name:'Overview conversation',exact:true});
  const pin=button('Pin voluntary turnover goal');
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
  async function openNavigation(){if(width<768)await button('Open navigation').click()}
  async function navigate(destination){
   await openNavigation();
   const item=page.locator(`[data-nav-destination="${destination}"]`);
   const group=await item.evaluate(node=>node.parentElement.id);
   const toggle=page.locator(`button[aria-controls="${group}"]`);
   if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
   await item.click();
   await page.waitForFunction(destination=>document.querySelector(`[data-nav-destination="${destination}"]`)?.getAttribute('aria-current')==='page',destination);
  }
  async function returnHome(){await openNavigation();await button('Action Planning').click();await chat.waitFor();}
  async function historyContains(text){
   await button('Open data details').click();
   const found=(await page.getByRole('dialog',{name:'Data details',exact:true}).getByRole('region',{name:'Conversation history',exact:true}).innerText()).includes(text);
   await button('Close data details').click();return found;
  }
  await page.goto(base);await chat.waitFor();await chat.fill(goal);
  await button('Send overview question').click();
  await pin.waitFor();
  check(mode+' completed answer and its Pin candidate are visible',await transcript.getByText(answer,{exact:true}).isVisible()&&await pin.isVisible());
  await chat.fill('Keep this unfinished follow-up');
  const transcriptBefore=await transcript.locator('[data-chat-role]').allTextContents();
  for(const destination of ['decision-brief','assess-evaluate','occupational-references','decision-brief']){
   await navigate(destination);await returnHome();
   const visible=await transcript.locator('[data-chat-role]').allTextContents();
   console.log(JSON.stringify({mode,destination,visibleMessages:visible.length,pinVisible:await pin.isVisible(),historyContainsAnswer:await historyContains(answer),url:page.url()}));
   check(mode+' returning from '+destination+' preserves the visible transcript',JSON.stringify(visible)===JSON.stringify(transcriptBefore));
   check(mode+' returning from '+destination+' keeps Pin with its visible answer',await pin.isVisible()&&await transcript.getByText(answer,{exact:true}).isVisible());
   check(mode+' returning from '+destination+' preserves the draft without another model call',await chat.inputValue()==='Keep this unfinished follow-up'&&posts.length===1);
  }
  // Changing the goal must retain the intentional history boundary and the separate draft.
  await page.getByLabel('Selected goal',{exact:true}).selectOption('other');
  check(mode+' selecting another goal does not expose the previous goal answer or Pin',await transcript.locator('[data-chat-role]').count()===0&&await pin.count()===0);
  check(mode+' goal selection restores its own draft and history',await chat.inputValue()==='Separate saved draft'&&await historyContains(savedQuestion));
  await chat.fill('What does this saved goal need?');await button('Send overview question').click();
  await transcript.getByText(answer,{exact:true}).waitFor();
  check(mode+' new answer for a selected goal appears beyond its history boundary',await transcript.locator('[data-chat-role]').count()===2&&posts.length===2);
  await chat.fill('Keep the selected goal draft');await navigate('decision-brief');await returnHome();
  check(mode+' selected-goal round trip retains its new answer and draft',await transcript.getByText(answer,{exact:true}).isVisible()&&await chat.inputValue()==='Keep the selected goal draft');
  // Explicit Reset still archives messages, clears the draft and invalidates stale Pin candidates.
  await button('Reset conversation').click();
  check(mode+' Reset hides current messages and clears draft and Pin',await transcript.locator('[data-chat-role]').count()===0&&await chat.inputValue()===''&&await pin.count()===0);
  await navigate('assess-evaluate');await returnHome();
  check(mode+' navigation does not resurrect reset messages or Pin',await transcript.locator('[data-chat-role]').count()===0&&await pin.count()===0);
  await page.getByLabel('Selected goal',{exact:true}).selectOption('other');
  check(mode+' reset goal history remains available for reference',await historyContains(answer)&&await historyContains(savedQuestion));
  const final=await state();
  check(mode+' unrelated saved sentinel remains unchanged',final.workspaces.other.fields.sentinel.keep==='Unrelated saved work');
  check(mode+' original saved history was not deleted',final.workspaces.other.fields.chat.messages.some(message=>message.content===savedQuestion));
  check(mode+' synthetic network and runtime boundaries',external.length===0&&errors.length===0&&posts.length===2);
  console.log(JSON.stringify({mode,checks}));
  await context.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify({checks,transport:'synthetic local only'}));
