// Production UI with synthetic evidence and responses only; live-model wording is checked on preview.
import assert from 'node:assert/strict';
import {homeStarterGroups} from '../../lib/contextual-prompts.ts';
import {homeForecastAnswer} from '../../lib/home-forecast.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3248';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
const concise='April 2026 turnover was lower than both earlier Aprils; the available evidence does not explain why.\n- **Monthly rate:** 0.93% in April 2026, 0.03 percentage points below April 2024 (0.96%) and 0.12 below April 2025 (1.05%). [a1] See [Attrition](app:attrition).\n- **Limits:** These rates are company-wide; monthly exit counts, denominators and causal evidence are unavailable. [A1][W1]\nWhich April and workforce scope did you mean?';
const headings=['Evidence and scope','Options and tradeoffs','Costs and unknown assumptions','Proposed next steps','Suggested success measures'];
const plan=headings.map((heading,index)=>'### '+heading+'\n'+(index+1)+'. Review the supplied evidence and confirm missing assumptions. [A1]').join('\n');
const fixture={overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'},summary:{current_workforce:120,total_exits:88,voluntary_exits:60,regrettable_exits:20},as_of:'2026-09-30',trend:[{month:'2024-04-01',monthly_turnover_pct:0.96},{month:'2025-04-01',monthly_turnover_pct:1.05},{month:'2026-04-01',monthly_turnover_pct:0.93}],business_units:[],levels:[],tenure:[],reasons:[]};
try{for(const [mode,width,height] of [['wide',1721,1000],['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:mode==='mobile'}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
 await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);const question=body.message.split('\n\n')[0];
   return route.fulfill({json:{answer:homeForecastAnswer(question)??(question.startsWith('Develop')?plan:concise),nextStep:'none',candidateProposal:null,findingFollowups:[]}});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:fixture});return route.continue();
 });
 await page.goto(base);const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=page.getByRole('button',{name:'Send overview question',exact:true}),starters=page.getByRole('region',{name:'Suggested questions',exact:true});
 await input.waitFor();await starters.getByRole('button').first().waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);
 check(mode+' Suggested prompts and category headings are larger',await starters.getByRole('heading',{name:'Suggested prompts',exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=20)&&await starters.locator('h4').evaluateAll(nodes=>nodes.every(el=>parseFloat(getComputedStyle(el).fontSize)>=18)));
 check(mode+' exactly two compact groups and five approved labels',await starters.getByRole('group').count()===2&&JSON.stringify(await starters.getByRole('button').allTextContents())===JSON.stringify(homeStarterGroups.flatMap(group=>group.prompts.map(item=>item.label))));
 const boxes=await starters.getByRole('group').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom,width:r.width,headingBottom:node.querySelector('h4').getBoundingClientRect().bottom,buttonTop:node.querySelector('button').getBoundingClientRect().top}}));
 check(mode+' categories always stack in order with headings above buttons and clear spacing',boxes.every((box,index)=>Math.abs(box.x-boxes[0].x)<2&&box.buttonTop-box.headingBottom>=7&&(index===0||box.y-boxes[index-1].bottom>=15)));
 check(mode+' starter touch targets stay at least 44px and inside container',await starters.getByRole('button').evaluateAll(nodes=>nodes.every(node=>{const r=node.getBoundingClientRect();return r.height>=44&&r.left>=0&&r.right<=innerWidth+1&&node.scrollWidth<=node.clientWidth})));
 await input.fill('Keep this draft');check(mode+' unfinished draft blocks all five starters',await starters.getByRole('button').evaluateAll(nodes=>nodes.length===5&&nodes.every(node=>node.disabled)));await input.fill('');
 await page.screenshot({path:'/tmp/concise-starters-'+mode+'.png',fullPage:true});await starters.screenshot({path:'/tmp/stacked-starters-'+mode+'.png'});
 const first=starters.getByRole('button',{name:'What skills are we missing?',exact:true});
 if(mode==='mobile')await first.tap();else{await first.focus();await page.keyboard.press('Enter')}
 await page.getByRole('region',{name:'Overview conversation'}).getByText(/April 2026 turnover was lower/).waitFor();
 check(mode+' starter answers before an optional goal offer',posts[0].message.startsWith(homeStarterGroups[0].prompts[0].prompt)&&await page.getByRole('region',{name:'Pin this problem'}).count()===1);
 await input.fill('why was turnover high in april');await send.click();await page.getByText('Thinking with the available evidence…',{exact:true}).waitFor({state:'hidden'});
 const answer=page.locator('[data-chat-role="assistant"]').last(),content=answer.locator('.home-answer');
 check(mode+' answer has one takeaway, two short bullets and compact caveat',await content.locator(':scope > p').count()===2&&await content.locator(':scope > ul > [data-chat-item]').count()===2&&await content.locator('[data-chat-heading]').count()===0);
 check(mode+' citations remain inline with bullets including adjacent sources',await content.locator('[data-chat-item] sup[data-chat-citation]').count()===3&&await content.locator('[data-chat-item]').last().locator('sup').count()===2);
 check(mode+' superscripts are small with normal readable answer text',await content.locator('[data-chat-item] sup').first().evaluate(node=>{const style=getComputedStyle(node),text=getComputedStyle(node.parentElement);return style.verticalAlign==='super'&&parseFloat(style.fontSize)===11&&parseFloat(text.fontSize)===14&&style.opacity==='1'}));
 const marker=content.getByRole('button',{name:'Source A1: Attrition',exact:true}).first();await marker.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 check(mode+' linked citation retains accessible name, focus and target',await marker.evaluate(node=>document.activeElement===node&&node.matches(':focus-visible')&&getComputedStyle(node).boxShadow!=='none'&&node.getBoundingClientRect().height>=24)&&await content.getByRole('complementary',{name:'Answer sources'}).getByRole('button',{name:'Attrition',exact:true}).count()===1);
 check(mode+' source markers wrap without clipping or horizontal overflow',await content.locator('[data-chat-item]').evaluateAll(nodes=>nodes.every(node=>{const r=node.getBoundingClientRect();return node.scrollWidth<=node.clientWidth&&r.right<=innerWidth+1&&[...node.querySelectorAll('sup')].every(marker=>marker.getBoundingClientRect().right<=r.right+1)}))&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await input.focus();await answer.screenshot({path:'/tmp/concise-answer-'+mode+'.png'});
 await input.fill('What about March?');await send.click();await page.getByText('Thinking with the available evidence…',{exact:true}).waitFor({state:'hidden'});check(mode+' follow-up keeps conversation context',posts.at(-1).history.some(turn=>turn.role==='user'&&turn.content==='why was turnover high in april'));
 await input.fill('Develop a full action plan');await send.click();await page.getByText('Thinking with the available evidence…',{exact:true}).waitFor({state:'hidden'});const planned=page.locator('[data-chat-role="assistant"]').last();
 check(mode+' Action Plan keeps five headings and numbered steps',JSON.stringify(await planned.locator('[data-chat-heading]').allTextContents())===JSON.stringify(headings)&&await planned.locator('[data-chat-item]').count()===5);
 check(mode+' no live sources, runtime errors or overflow',external===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}
// Click actual citation controls and verify the selected application destination.
for(const width of [1366,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();if(url.pathname==='/api/chat')return route.fulfill({json:{answer:'Facts [W1:summary] [a1.total_exits] [S1, S2] [T1:summary](app:skills) [R1] [T2:summary] [T4] [T3](app:skills). Dates [2026] and unknown [Q9] stay text.',nextStep:'none'}});if(url.pathname.startsWith('/api/'))return url.pathname==='/api/dashboard'?route.fulfill({json:fixture}):route.fulfill({status:503,json:{error:'Synthetic unavailable source'}});return route.continue()});
 await page.goto(base);const input=page.getByLabel('Ask Workforce AI',{exact:true});
 for(const [id,label,destination] of [['W1','Workforce','workforce'],['A1','Attrition','attrition'],['S1','Employee Listening','survey-sentiment'],['S2','Attrition','attrition'],['T1','Skills Intelligence','skills'],['R1','Talent Acquisition','talent-acquisition'],['T2','Learning & Development','learning-development'],['T4','Career Growth & Internal Mobility','career-growth-mobility']]){
  await input.fill('Explain the source references');await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.locator('[data-chat-role="assistant"]').last().getByText(/Facts/).waitFor();const answer=page.locator('[data-chat-role="assistant"]').last();check(width+' '+id+' ordinary brackets stay text',await answer.getByText(/Dates \[2026\] and unknown \[Q9\]/).count()===1);await answer.getByRole('button',{name:`Source ${id}: ${label}`,exact:true}).click();await page.locator(`[data-nav-destination="${destination}"][aria-current="page"]`).waitFor({state:'attached'});check(width+' inline '+id+' opens '+destination,true);
  const open=page.getByRole('button',{name:'Open navigation',exact:true});if(await open.isVisible())await open.click();await page.getByRole('button',{name:'Action Planning',exact:true}).click();await input.waitFor();
 }
 check(width+' retired T3 has readable attribution without a misleading target',await page.locator('[data-chat-role=assistant]').last().locator('sup[data-chat-citation=T3] span[title="Career interests: see Home Data details"]').count()===1&&await page.locator('button[aria-label^="Source T3"]').count()===0);check(width+' source navigation has no runtime errors',errors.length===0);await context.close();
}
// Every short starter label executes its unambiguous intent in the real Home UI.
for(const item of homeStarterGroups.flatMap(group=>group.prompts)){
 const context=await browser.newContext({viewport:{width:390,height:900},hasTouch:true}),page=await context.newPage(),posts=[];
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();if(url.pathname==='/api/chat'){const body=req.postDataJSON();posts.push(body);return route.fulfill({json:{answer:homeForecastAnswer(body.message)??'Synthetic grounded answer.',nextStep:'none',candidateProposal:null,findingFollowups:[]}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:fixture});return route.continue()});
 await page.goto(base);const starter=page.getByRole('region',{name:'Suggested questions',exact:true}).getByRole('button',{name:item.label,exact:true});await starter.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);const completed=page.waitForResponse(response=>response.url()===base+'/api/chat');await starter.tap();await completed;await page.locator('[data-chat-role="assistant"]').last().waitFor();
 check('mobile '+item.label+' sends explicit prompt exactly once',posts.length===1&&posts[0].message.split('\n\n')[0]===item.prompt);
 if(item.prompt==='Forecast turnover')check('forecast starter preserves verified chart grounding',await page.getByRole('region',{name:'Turnover projection for this answer',exact:true}).count()===1);
 await context.close();
}
}finally{await browser.close()}
console.log(JSON.stringify({checks}));
