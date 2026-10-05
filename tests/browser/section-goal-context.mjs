// Real production shell; synthetic aggregate responses and browser-owned goal fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3111',output=await fs.mkdtemp(path.join(os.tmpdir(),'section-goal-context-'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
const goalA='Review staffing capacity for the service team',goalB='Review learning options within the existing budget';
const attrition={as_of:'2026-09-30',summary:{total_exits:4,voluntary_exits:3,involuntary_exits:1,regrettable_exits:1,retirements:0,total_turnover_ytd_pct:4,voluntary_turnover_ytd_pct:3,annualized_voluntary_turnover_pct:4,regrettable_share_of_voluntary_pct:33.3},trend:[],business_units:[],levels:[],tenure:[],reasons:[]};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let unexpected=0,delay=false,fail=false,release=null;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const seed={version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'a',statement:goalA,context:{constraints:'Review existing capacity first.',decisions:'No approved spend.',notes:[]}},{id:'b',statement:goalB}]},workspaces:{a:{savedAt:'2026-10-05T00:00:00.000Z',fields:{chat:{messages:[],input:'Draft for A',problem:null,questionUnanswered:false},privateBrief:'PRIVATE_BRIEF_MUST_STAY_LOCAL'}},b:{savedAt:'2026-10-05T00:00:00.000Z',fields:{chat:{messages:[],input:'Draft for B',problem:null,questionUnanswered:false}}}}};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){unexpected++;return route.abort();}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);const number=posts.length,bad=fail;
   if(delay)await new Promise(resolve=>release=resolve);
   return route.fulfill({status:bad?500:200,json:bad?{error:'Synthetic request failed.'}:{answer:`Synthetic reply ${number} for ${body.goalContext?.goal??'General exploration'}`}}).catch(()=>{});
  }
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:url.searchParams.get('country')==='UK'?20:100,fte:90,open_positions:4,snapshot_date:'2026-09-30',voluntary_turnover_ytd_pct:3,labor_cost_usd:1000000},trend:[],filter_options:{countries:[{value:'UK',label:'United Kingdom'}],business_units:[],levels:[]}}});
  if(url.pathname==='/api/attrition')return route.fulfill({json:attrition});
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Synthetic source unavailable.'}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),home=page.getByLabel('Ask Workforce AI',{exact:true}),chat=page.getByLabel('Ask People Analytics AI',{exact:true}),goal=page.getByLabel('Selected goal',{exact:true}),panel=page.locator('.app-ai-panel');
 const navigate=async name=>{await button(name==='Home'?'Action Planning':'Workforce — '+name).click();await page.getByRole('heading',{name:name==='Home'?'Insight to Action':name,exact:true,level:1}).waitFor();};
 const send=async message=>{await chat.fill(message);await button('Send message').click();};
 const pending=async message=>{delay=true;release=null;await send(message);for(let i=0;!release&&i<100;i++)await page.waitForTimeout(10);assert.ok(release);};
 const finish=()=>{delay=false;release();};
 await page.goto(base);await goal.waitFor();await home.waitFor();
 const intro=button('Intro & instructions');await intro.waitFor();
 check(mode+' intro and steps are hidden behind one compact accessible toggle',await intro.getAttribute('aria-expanded')==='false'&&!await page.getByText(/^The purpose of this product/).isVisible()&&await intro.evaluate(n=>n.getBoundingClientRect().height>=44));
 check(mode+' intro strip follows goal toolbar and precedes questions',await intro.evaluate(n=>{const a=n.getBoundingClientRect(),b=document.querySelector('.goal-toolbar').getBoundingClientRect(),q=document.querySelector('[data-testid="overview-starting-guide"]').getBoundingClientRect();return a.top>=b.bottom&&a.bottom<=q.top}));
 await home.fill('Keep my draft');await intro.focus();await page.keyboard.press('Enter');
 check(mode+' expanded intro preserves separate approved paragraphs and multi-goal step',await page.getByText('The purpose of this product is to showcase the evolution of dashboards and strategic workforce planning from insight → action → outcomes.',{exact:true}).isVisible()&&await page.getByText(/^By incorporating AI into People Analytics/).isVisible()&&await page.getByText(/Save multiple goals and get proposed Action Plans for each/).isVisible());
 await intro.click();check(mode+' collapse preserves draft without requesting AI',await home.inputValue()==='Keep my draft'&&posts.length===0);
 check(mode+' stakeholder hint remains associated with Home input',(await page.locator('#overview-question-context-tip').innerText()).includes('budget, stakeholders and relevant sources')&&await home.getAttribute('aria-describedby')==='overview-question-context-tip');
 if(mode==='desktop')check('desktop feedback invitation sits right of LinkedIn',await page.getByText('Please reach out with any questions, feedback, or comments.',{exact:true}).evaluate(n=>{const a=n.getBoundingClientRect(),b=document.querySelector('header a[href*="linkedin"]').getBoundingClientRect();return a.left>b.right&&Math.abs(a.top+a.height/2-b.top-b.height/2)<3}));
 await page.screenshot({path:path.join(output,mode+'-home.png')});
 await goal.selectOption('a');await navigate('Attrition');await chat.waitFor();
 check(mode+' selected goal and topic helper appear below Ask AI',await panel.getByText('Ask a question about this topic. Responses will use your selected goal as context.',{exact:true}).isVisible()&&await panel.getByText('Goal: '+goalA,{exact:true}).isVisible()&&await chat.inputValue()==='Draft for A');
 check(mode+' navigation and goal selection do not send chat requests',posts.length===0);
 await send('Question for A');await panel.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply 1 for '+goalA,{exact:true}).waitFor();
 check(mode+' explicit send carries exact goal and existing bounded requirements',posts[0].goalId==='a'&&posts[0].goalContext.goal===goalA&&posts[0].goalContext.constraints==='Review existing capacity first.'&&posts[0].goalContext.decisions==='No approved spend.'&&posts[0].history.length===0);
 await chat.fill('Unfinished A');await goal.selectOption('b');
 check(mode+' switching to B restores its own draft and exact helper',await chat.inputValue()==='Draft for B'&&await panel.getByText('Goal: '+goalB,{exact:true}).isVisible());
 await send('Question for B');await panel.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply 2 for '+goalB,{exact:true}).waitFor();
 check(mode+' B request has no A conversation or goal context',posts[1].goalId==='b'&&posts[1].goalContext.goal===goalB&&posts[1].history.length===0&&!JSON.stringify(posts[1].goalContext).includes('Question for A'));
 await goal.selectOption('a');check(mode+' A draft survives A to B to A',await chat.inputValue()==='Unfinished A');
 // Hold a handler from a prior render to exercise the synchronous store guard.
 await chat.fill('Stale A handler');await button('Send message').evaluate(n=>{const key=Object.keys(n).find(k=>k.startsWith('__reactProps$'));window.oldSectionSend=n[key].onClick;});
 await goal.selectOption('b');const before=posts.length;await page.evaluate(()=>window.oldSectionSend());await page.waitForTimeout(50);
 check(mode+' stale A handler cannot dispatch against selected B',posts.length===before&&await panel.getByText('Goal: '+goalB,{exact:true}).isVisible());
 await goal.selectOption('a');await pending('Pending A question');await chat.fill('A draft typed while pending');await goal.selectOption('b');finish();await page.waitForTimeout(80);await goal.selectOption('a');
 check(mode+' switched-goal late reply is rejected and pending draft survives',await chat.inputValue()==='A draft typed while pending'&&await panel.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply 3 for '+goalA,{exact:true}).count()===0);
 await pending('Pending evidence question');await chat.fill('Draft after evidence change');await page.getByLabel('Country',{exact:true}).selectOption('UK');finish();await page.waitForTimeout(150);
 check(mode+' changed workforce scope rejects section reply and keeps draft',await chat.inputValue()==='Draft after evidence change'&&await panel.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply 4 for '+goalA,{exact:true}).count()===0&&await button('Send message').isEnabled());
 await button('Open conversation details').click();check(mode+' selected goal does not redefine enterprise evidence scope',await page.getByRole('dialog',{name:'Conversation details',exact:true}).getByText('This page uses company-wide evidence. The shared workforce filters do not narrow these measures.',{exact:true}).isVisible());await button('Close conversation details').click();
 await send('Review company evidence with UK context');await panel.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply 5 for '+goalA,{exact:true}).waitFor();
 check(mode+' selected country context preserves unfiltered enterprise aggregate values',posts[4].context.country==='United Kingdom'&&posts[4].attritionContext.summary.total_exits===4);
 fail=true;await pending('Failed question');await chat.fill('New draft typed during failure');finish();await panel.getByText('Synthetic request failed.',{exact:true}).waitFor();fail=false;
 check(mode+' request failure preserves newly typed draft',await chat.inputValue()==='New draft typed during failure');
 await page.reload();await goal.waitFor();await navigate('Attrition');await chat.waitFor();
 check(mode+' reload restores selected goal helper and its draft',await goal.inputValue()==='a'&&await panel.getByText('Goal: '+goalA,{exact:true}).isVisible()&&await chat.inputValue()==='New draft typed during failure');
 await send('Fresh request after reload');await panel.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply 7 for '+goalA,{exact:true}).waitFor();check(mode+' reload starts fresh transport history with exact selected goal',posts[6].history.length===0&&posts[6].goalContext.goal===goalA);
 await chat.fill('Draft across sidebar navigation');await navigate('Home');await navigate('Attrition');check(mode+' sidebar navigation preserves the selected goal draft',await chat.inputValue()==='Draft across sidebar navigation'&&await panel.getByText('Goal: '+goalA,{exact:true}).isVisible());
 await goal.selectOption('');check(mode+' no-goal helper honestly shows General exploration',await panel.getByText('Select a goal to give your questions context.',{exact:true}).isVisible()&&await panel.getByText('Goal: General exploration',{exact:true}).isVisible());
 await send('Explore without a pinned goal');await panel.getByLabel('AI conversation',{exact:true}).getByText('Synthetic reply 8 for General exploration',{exact:true}).waitFor();check(mode+' no-goal request carries no former selected-goal context',posts[7].goalContext===null&&posts[7].goalId===''&&posts[7].history.length===0&&!posts[7].message.includes(goalA)&&!posts[7].message.includes(goalB));
 check(mode+' no private brief fields enter requests',!JSON.stringify(posts).includes('PRIVATE_BRIEF_MUST_STAY_LOCAL')&&posts.every(body=>Object.keys(body.goalContext??{}).every(key=>['goal','constraints','decisions','notes','currentScope'].includes(key))));
 await page.screenshot({path:path.join(output,mode+'-section.png')});
 check(mode+' responsive layout and runtime/network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
