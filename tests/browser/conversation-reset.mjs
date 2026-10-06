// Real application shell; synthetic API fixtures only, with no live model/source access.
import assert from 'node:assert/strict';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {bundleProposalFixture} from '../fixtures/home-bundles.mjs';
import {attrition,workforce} from '../fixtures/theme-audit-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3243';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
const goal='Investigate skills and career pathways';
const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:goal,context:{constraints:'Preserve this saved requirement.',decisions:'No approved spend.',notes:[]}},{id:'b',statement:'An unrelated saved goal'}]},workspaces:{a:{savedAt:'2026-10-06T00:00:00Z',fields:{chat:{messages:[{role:'user',content:'Archived goal question'},{role:'assistant',content:'Archived goal answer'}],input:'Unsent goal draft',problem:null,questionUnanswered:false},sentinel:{keep:true}}},b:{savedAt:'2026-10-06T00:00:00Z',fields:{chat:{messages:[],input:'Unrelated draft',problem:null,questionUnanswered:false},sentinel:{keep:'other'}}}}};
const proposal=(statement=goal)=>{const p=bundleProposalFixture(statement);p.bundles=p.bundles.slice(0,1);for(const bundle of p.bundles){bundle.name='Skills and pathways review';bundle.components=bundle.components.slice(0,2).map((c,i)=>({...c,name:i?'Career pathways':'Skills assessment',domain:i?'mobility':'learning',firstStep:i?'Audit career pathways':'Assess skill gaps',dependsOn:[]}));}return p;};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];
 let hold=false,release=null,external=0;
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,value);localStorage.setItem('reset-unrelated-sentinel','keep');}},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort();}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);const number=posts.length;
   if(hold)await new Promise(resolve=>release=resolve);
   return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:proposal(body.goalContext.goal)}:{answer:'Synthetic reply '+number,nextStep:'none'}}).catch(()=>{});
  }
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:100,fte:90,open_positions:3,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[{value:'UK',label:'United Kingdom'},{value:'US',label:'United States'}],business_units:[],levels:[]}}});
  if(url.pathname==='/api/attrition')return route.fulfill({json:attrition});
  if(url.pathname==='/api/workforce')return route.fulfill({json:workforce});
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100},summary:{headcount:100,total_employees:100,open_requisitions:4},trend:[],business_units:[],levels:[],tenure:[],reasons:[]}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),home=page.getByLabel('Ask Workforce AI',{exact:true}),chat=page.getByLabel('Ask People Analytics AI',{exact:true}),selected=page.getByLabel('Selected goal',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const navigate=async name=>{if(width<768)await button('Open navigation').click();await button(name==='Home'?'Action Planning':'Workforce — '+name).click();await (name==='Home'?home:chat).waitFor();};
 const activeMessages=()=>page.locator('[aria-label="Overview conversation"] [data-chat-role], [aria-label="AI conversation"] [data-chat-role]');
 const reset=async()=>{await button('Reset conversation').click();await page.waitForTimeout(80);};
 const send=async(message,onHome=true)=>{await (onHome?home:chat).fill(message);await button(onHome?'Send overview question':'Send message').click();};
 const waitHeld=async()=>{for(let i=0;!release&&i<150;i++)await page.waitForTimeout(20);assert.ok(release,'request was held');};
 await page.goto(base);await home.waitFor();await button('Create Action Plan').click();await page.locator('[data-plan-current="true"]').waitFor();await button('Attach Action Plan').click();await page.getByText(/Action Plan attached/).first().waitFor();
 await home.fill('Draft to clear');
 const saved=await state(),savedFields=saved.workspaces.a.fields;
 await button('Reset conversation').focus();await page.keyboard.press('Enter');await page.waitForTimeout(80);
 check(mode+' Home reset clears the visible goal conversation and plan workspace',await selected.inputValue()===''&&await panel.count()===0&&await activeMessages().count()===0&&await home.inputValue()===''&&await home.evaluate(n=>n===document.activeElement));
 const after=await state();
 check(mode+' saved goal requirements, attached plan, transcript and unrelated work survive',JSON.stringify(after.goals.goals)===JSON.stringify(saved.goals.goals)&&JSON.stringify(after.workspaces.a.fields.homeBundlePreparationV1)===JSON.stringify(savedFields.homeBundlePreparationV1)&&JSON.stringify(after.workspaces.a.fields.homeSolutionBundlesV1)===JSON.stringify(savedFields.homeSolutionBundlesV1)&&JSON.stringify(after.workspaces.a.fields.chat.messages)===JSON.stringify(savedFields.chat.messages)&&JSON.stringify(after.workspaces.b)===JSON.stringify(saved.workspaces.b)&&await page.evaluate(()=>localStorage.getItem('reset-unrelated-sentinel'))==='keep');
 const count=posts.length;await reset();await page.reload();await home.waitFor();await page.waitForTimeout(400);
 check(mode+' repeated reset and refresh stay empty without automatic requests',await selected.inputValue()===''&&await panel.count()===0&&await activeMessages().count()===0&&posts.length===count);
 await send('A fresh question');await page.getByLabel('Overview conversation',{exact:true}).getByText('Synthetic reply '+posts.length,{exact:true}).waitFor();
 check(mode+' fresh request carries no previous goal or transport history',posts.at(-1).history.length===0&&posts.at(-1).goalContext===null&&!posts.at(-1).hasFocusedIssue);
 await reset();await button('Open goal: '+goal).click();await page.locator('[data-plan-current="true"]').waitFor();
 check(mode+' saved goal explicitly reopens its existing attached plan',await panel.isVisible()&&JSON.stringify((await state()).workspaces.a.fields.homeSolutionBundlesV1)===JSON.stringify(savedFields.homeSolutionBundlesV1));
 // Hosted regression: restore a saved goal after a scoped Home reset, then type each character.
 await page.getByLabel('Country',{exact:true}).evaluate(n=>n.closest('details')?.setAttribute('open',''));await page.getByLabel('Country',{exact:true}).selectOption('US');
 await reset();await button('Open goal: '+goal).click();await navigate('Attrition');await chat.fill('');await page.waitForTimeout(2000);
 await page.evaluate(()=>{window.chartMutations=0;window.chartObserver=new MutationObserver(records=>window.chartMutations+=records.length);for(const chart of document.querySelectorAll('.recharts-wrapper'))window.chartObserver.observe(chart,{subtree:true,attributes:true,childList:true,characterData:true});});
 const scopedDraft='Synthetic preview test draft to be cleared by Reset.';
 await chat.pressSequentially(scopedDraft,{delay:20});await page.waitForTimeout(1000);
 check(mode+' restored scoped goal accepts character-by-character draft without a subscriber loop',errors.length===0&&await chat.inputValue()===scopedDraft&&await page.getByLabel('Country',{exact:true}).inputValue()==='US');
 check(mode+' editing only the draft leaves settled Attrition charts unchanged',await page.evaluate(()=>{window.chartObserver.disconnect();return window.chartMutations===0;}));
 await reset();check(mode+' restored scoped goal draft Reset keeps saved work and selected country',await chat.inputValue()===''&&await selected.inputValue()===''&&await page.getByLabel('Country',{exact:true}).inputValue()==='US'&&(await state()).goals.goals.length===2);
 await navigate('Home');await button('Open goal: '+goal).click();
 // Both reset entry points must invalidate even a response whose transport ignores abort.
 await page.evaluate(()=>{
  const original=window.fetch;
  window.fetch=async(input,init)=>{
   if(String(input)!=='/api/chat')return original(input,init);
   const response=await original(input,{...init,signal:undefined});
   if(!window.splitNextChat)return response;
   window.splitNextChat=false;
   const body=await response.text(),middle=Math.floor(body.length/2),encoder=new TextEncoder();
   return new Response(new ReadableStream({start(controller){
    controller.enqueue(encoder.encode(body.slice(0,middle)));
    window.finishSplitChat=()=>{controller.enqueue(encoder.encode(body.slice(middle)));controller.close();};
   }}),{status:response.status,headers:response.headers});
  };
 });
 hold=true;release=null;await send('Late Home question');await waitHeld();await reset();hold=false;release();await page.waitForTimeout(200);
 check(mode+' late Home response cannot restore messages or selected goal',await selected.inputValue()===''&&await activeMessages().count()===0);
 await selected.selectOption('a');await navigate('Attrition');
 await page.getByLabel('Country',{exact:true}).evaluate(n=>n.closest('details')?.setAttribute('open',''));await page.getByLabel('Country',{exact:true}).selectOption('UK');
 await chat.fill('Stop automatic takeaway while checking context');await page.waitForTimeout(400);
 await page.evaluate(()=>{window.splitNextChat=true;});await send('Late topic question',false);await page.waitForFunction(()=>!!window.finishSplitChat);await reset();await page.evaluate(()=>window.finishSplitChat());await page.waitForTimeout(200);
 check(mode+' topic reset clears goal context, late reply and draft while keeping filters',await selected.inputValue()===''&&await activeMessages().count()===0&&await chat.inputValue()===''&&await page.getByLabel('Country',{exact:true}).inputValue()==='UK'&&await page.locator('.app-ai-panel').getByText('Goal: General exploration',{exact:true}).isVisible());
 await send('Fresh topic question',false);await page.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply '+posts.length,{exact:true}).waitFor();
 check(mode+' next topic request starts clean and the composer remains usable',posts.at(-1).goalContext===null&&posts.at(-1).goalId===''&&posts.at(-1).history.length===0&&!posts.at(-1).message.includes(goal));await reset();
 await navigate('Workforce');await navigate('Attrition');await navigate('Home');const afterNavigation=posts.length;await page.waitForTimeout(400);
 check(mode+' navigation cannot resurrect cleared conversation, goal or automatic takeaway',await selected.inputValue()===''&&await activeMessages().count()===0&&await panel.count()===0&&posts.length===afterNavigation);
 await send('Fresh exploration before goal switch');await page.getByLabel('Overview conversation',{exact:true}).getByText('Synthetic reply '+posts.length,{exact:true}).waitFor();await selected.selectOption('a');await reset();
 check(mode+' reset with a pinned goal also clears any earlier general-exploration draft and messages',await home.inputValue()===''&&await activeMessages().count()===0&&await selected.inputValue()==='');
 // A new goal's separate plan-preparation controller must be invalidated by Reset too.
 await selected.selectOption('b');hold=true;release=null;await button('Create Action Plan').click();await waitHeld();await reset();hold=false;release();await page.waitForTimeout(400);
 check(mode+' late Action Plan preparation cannot commit after reset',await panel.count()===0&&await selected.inputValue()===''&&(await state()).workspaces.b.fields.homeBundlePreparationV1===undefined);
 await reset();await page.reload();await home.waitFor();
 check(mode+' final refresh retains saved goals and no active conversation',await selected.inputValue()===''&&await activeMessages().count()===0&&(await state()).goals.goals.length===2);
 await home.fill('Send immediately followed by Reset');await page.waitForFunction(()=>!document.querySelector('[aria-label="Send overview question"]').disabled);
 await button('Send overview question').evaluate(node=>{node.click();[...document.querySelectorAll('button')].find(button=>button.textContent==='Reset conversation').click();});await page.waitForTimeout(200);
 check(mode+' same-turn send and reset use the latest transcript boundary',await home.inputValue()===''&&await activeMessages().count()===0);
 if(errors.length||external)console.log({mode,errors,external});
 check(mode+' responsive runtime and network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0);
 await page.screenshot({path:'/tmp/conversation-reset-'+mode+'.png',fullPage:true});await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks}));
