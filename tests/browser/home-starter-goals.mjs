// Production UI; synthetic source and chat fixtures, no live model/data requests.
import assert from 'node:assert/strict';
import {homeStarterGroups} from '../../lib/contextual-prompts.ts';
import {homeStarterGoal} from '../../lib/home-starter-goals.ts';
import {homeForecastAnswer} from '../../lib/home-forecast.ts';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {scopeDashboard} from '../fixtures/home-scope-evidence.mjs';
import {workforce,attrition,survey,talent,career} from '../fixtures/theme-audit-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3369';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
const items=homeStarterGroups.flatMap(group=>group.prompts);
async function open(width=390,missing=false){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
 await page.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
 if(url.pathname==='/api/chat'){const body=request.postDataJSON();posts.push(body);if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.')return route.fulfill({status:502,json:{error:'Synthetic preparation unavailable; pinned goal remains saved.'}});
 return route.fulfill({json:{answer:homeForecastAnswer(body.message)??'Review current recorded evidence for this question. [W1] Causes and intervention effects remain unknown.',nextStep:'none',candidateProposal:null,findingFollowups:[]}})}
 if(url.pathname.startsWith('/api/')){if(missing&&['/api/attrition','/api/survey-sentiment','/api/talent-acquisition'].includes(url.pathname))return route.fulfill({status:503,json:{error:'Synthetic unavailable'}});return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):({'/api/workforce':workforce,'/api/attrition':attrition,'/api/survey-sentiment':survey,'/api/talent-acquisition':talent,'/api/career-growth-mobility':career}[url.pathname]??{})})}return route.continue()});
 await page.goto(base);const input=page.getByLabel('Ask Workforce AI',{exact:true});await input.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);
 return {context,page,posts,errors,input,external:()=>external,state:()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY)};
}
try{
 for(const width of [1366,390])for(const item of items){
  const {context,page,posts,errors,state,external}=await open(width),starter=homeStarterGoal(item.prompt),before=await state();
  const button=page.getByRole('region',{name:'Suggested questions',exact:true}).getByRole('button',{name:item.label,exact:true});await button.focus();if(width===390)await button.tap();else await page.keyboard.press('Enter');
  const pin=page.getByRole('button',{name:starter.pinLabel,exact:true}),offer=page.getByRole('region',{name:'Pin this problem',exact:true});await pin.waitFor();
  check(width+' '+item.label+' answers once before explicit optional goal',posts.length===1&&posts[0].message===item.prompt&&!(await state()).goals.activeId&&JSON.stringify((await state()).goals.goals)===JSON.stringify(before.goals.goals));
  check(width+' answer and chart precede Pin with a brief reason',await offer.getByText(starter.reason,{exact:true}).isVisible()&&await offer.evaluate(node=>{const answer=document.querySelector('[data-chat-role="assistant"]');return Boolean(answer.compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING)}));
  const forecast=page.getByRole('region',{name:new RegExp('projection for this starter$')}),answer=page.locator('[data-chat-role="assistant"]').last();
  check(width+' domain forecast availability and separation',await forecast.count()===(starter.domain?1:0)&&(starter.domain?(await answer.locator('.home-answer').innerText()).startsWith('In the separate simulated company-wide demo')&&await forecast.locator('[data-point="forecast"]').count()>0:!(await answer.innerText()).includes('projections')));
  if(starter.domain){check(width+' grounded historical/projected points and explicit uncertainty',await forecast.locator('[data-point="history"]').count()>0&&await forecast.getByText(/spread is not an uncertainty interval/).isVisible());await forecast.screenshot({path:`/tmp/five-starters-${starter.domain}-${width}.png`});}
  check(width+' mobile bounds, touch targets and clean runtime',await pin.evaluate(node=>node.getBoundingClientRect().height>=44)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&!errors.length&&external()===0);
  await pin.click();await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).payload.goals.activeId,DECISIONS_STORAGE_KEY);await page.getByText(/Action Plan preparation failed.*Your goal, previous draft and results are kept/).waitFor();
  const saved=await state(),id=saved.goals.activeId,goal=saved.goals.goals.find(goal=>goal.id===id),preparation=posts.at(-1);
  check(width+' Pin saves exact goal and context, one preparation only',posts.length===2&&goal.statement===starter.goal&&preparation.goalContext.goal===starter.goal&&preparation.goalContext.notes.some(note=>note.text===item.prompt)&&preparation.goalContext.notes.every(note=>!note.text.includes('Dec 2026 projections')));
  check(width+' pinned discussion follows its Action Plans panel',await page.getByRole('region',{name:'Overview conversation',exact:true}).evaluate(node=>Boolean(document.querySelector('[aria-label="Action Plans for your goal"]').compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING)));
  check(width+' existing demo snapshots remain untouched',Object.keys(before.workspaces).every(key=>JSON.stringify(saved.workspaces[key])===JSON.stringify(before.workspaces[key])));
  await page.getByLabel('Selected goal',{exact:true}).selectOption('');await page.getByRole('button',{name:'Reset conversation',exact:true}).click();await page.getByRole('region',{name:'Suggested questions',exact:true}).getByRole('button',{name:item.label,exact:true}).click();await pin.waitFor();await pin.click();await page.getByText('This goal is already saved. Select it from your goals to continue; your draft is retained.',{exact:true}).waitFor();
  check(width+' repeat starter prevents duplicate goal or preparation',posts.length===3&&(await state()).goals.goals.length===before.goals.goals.length+1&&!(await state()).goals.activeId);
  await context.close();
 }
 for(const item of items.slice(2)){
  const {context,page,posts}=await open(390,true),starter=homeStarterGoal(item.prompt);await page.getByRole('button',{name:item.label,exact:true}).click();await page.getByRole('button',{name:starter.pinLabel,exact:true}).waitFor();check('missing '+starter.domain+' keeps answer and goal with no projection',posts.length===1&&await page.getByRole('region',{name:/projection for this starter$/}).count()===0);await context.close();
 }
 {
  const {context,page,input,posts}=await open();await input.fill(items[0].prompt);await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.locator('[data-chat-role="assistant"]').last().waitFor();check('typed factual question remains ordinary chat with no forced goal',await page.getByRole('region',{name:'Pin this problem',exact:true}).count()===0);
  await input.fill('Forecast turnover');await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.getByRole('region',{name:'Turnover projection for this answer',exact:true}).waitFor();check('direct forecast capability remains available without a starter category',posts.length===2&&await page.getByRole('group',{name:'Forecasts',exact:true}).count()===0);await context.close();
 }
 {
  const {context,page,posts,state}=await open(1366);const item=items[2],starter=homeStarterGoal(item.prompt);await page.getByLabel('Country',{exact:true}).selectOption('US');await page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);await page.getByRole('button',{name:item.label,exact:true}).click();await page.getByRole('button',{name:starter.pinLabel,exact:true}).waitFor();check('filtered scope falls back to current evidence without company demo forecast',await page.getByRole('region',{name:/projection for this starter$/}).count()===0&&posts[0].overviewBriefingContext.workforceScope.includes('United States'));
  await page.getByRole('button',{name:starter.pinLabel,exact:true}).click();await page.getByText(/Action Plan preparation failed.*Your goal, previous draft and results are kept/).waitFor();const data=await state();check('filtered Pin preserves selected scope and goal context',await page.getByLabel('Country',{exact:true}).inputValue()==='US'&&data.goals.goals.find(goal=>goal.id===data.goals.activeId).statement===starter.goal&&posts.at(-1).goalContext.notes.some(note=>note.scope.includes('United States')));await context.close();
 }
 {
  const {context,page,posts}=await open(1366);const item=items[2],starter=homeStarterGoal(item.prompt);await page.getByRole('button',{name:item.label,exact:true}).click();await page.getByRole('button',{name:starter.pinLabel,exact:true}).waitFor();await page.getByRole('button',{name:'Open data details',exact:true}).click();await page.getByRole('button',{name:'Refresh overview evidence',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[aria-label="Suggested questions"] button')?.disabled);check('evidence refresh invalidates the old starter offer and chart',await page.getByRole('button',{name:starter.pinLabel,exact:true}).count()===0&&await page.getByRole('region',{name:/projection for this starter$/}).count()===0&&posts.length===1);await context.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify({checks}));
