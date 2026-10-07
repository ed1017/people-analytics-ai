import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {previewWorkforceAlternatives} from '../../lib/workforce-planning-agent.ts';
import {workforceReviewFixture} from '../fixtures/workforce-review.mjs';
import {createWorkforceSolution,emptySolutionInputs,beginSolutionRun,completeSolutionRun,recordSolutionApproval,reviseWorkforceSolution} from '../../lib/workforce-solution.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'workforce-option-composer-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/workforce-option-composer.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd(),react:path.resolve('node_modules/react')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const css=(await Promise.all((await fs.readdir('.next/static/chunks')).filter(name=>name.endsWith('.css')).map(name=>fs.readFile(path.join('.next/static/chunks',name),'utf8')))).join('\n');
assert.ok(css.length);
const goalId='goal-readiness',goalStatement='Synthetic three-role workforce goal',at='2026-10-03T01:00:00.000Z',payload=workforceReviewFixture(),inputs=emptySolutionInputs();
const sections={scope:['businessUnit','jobProfile','intent','planningMonth','months'],demand:['roles'],response:['build','move','buy','backfills'],timing:['recruitingStart','arrivalMode','arrivalDate','buildMonth','moveMonth','backfillDate'],costs:['annualHireCost','hireFee','annualBackfillCost','backfillFee','internalAnnualCostChange'],training:['trainingCash','trainingHours','loadedHourlyCost'],constraints:['budget','maxAddedEmployees','deadlineMonth']};
for(const [section,fields] of Object.entries(sections))for(const field of fields)inputs[section][field]=payload.input[field];inputs.scope.goalStatement=goalStatement;
const empty=createWorkforceSolution('empty-solution',goalId,{...emptySolutionInputs(),scope:{goalStatement}},at);
let complete=createWorkforceSolution('complete-solution',goalId,inputs,at);const run=beginSolutionRun(complete,1,'ready-run',['brief'],at);complete=completeSolutionRun(run.state,run.ticket,[{id:'ready-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);complete=recordSolutionApproval(complete,1,'keep-approval',['ready-result'],'Synthetic approval retained',at);
const newer=reviseWorkforceSolution(complete,1,{constraints:{...inputs.constraints,budget:'26000'}},'sidebar','Synthetic new budget',at);
const data={version:1,revision:1,goals:{version:1,activeId:goalId,goals:[{id:goalId,statement:goalStatement},{id:'goal-other',statement:'Other synthetic goal'}]},workspaces:{[goalId]:{savedAt:at,fields:{workforceSolution:empty,owner:'Keep owner',workforceCatalog:{as_of:'2026-09-30',business_units:[{org_code:'TECH',org_name:'Technology'}],job_profiles:[{job_profile_code:'ENGINEER',job_profile_name:'Engineer'}]}}}}};
data.workspaces[goalId].fields.workforceSolution=complete;
const alternatives=previewWorkforceAlternatives(complete,'ready-result',[{...payload.input,build:'2',move:'0',buy:'1'},{...payload.input,build:'0',move:'2',buy:'1'}],'two-alternatives',at);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const width of [1366,390,683]){
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:width===683?450:900},...(width===683?{deviceScaleFactor:2}:{})}),page=await context.newPage(),errors=[];let posts=[],unexpected=0,missing=false;
 page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack)});
 const assets=new Map(await Promise.all((await fs.readdir(output)).filter(name=>name.endsWith('.js')).map(async name=>['http://127.0.0.1:3100/assets/'+name,await fs.readFile(path.join(output,name),'utf8')])));
 await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1:3100'){unexpected++;return route.abort()}
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div>'});
  if(assets.has(request.url()))return route.fulfill({contentType:'text/javascript',body:assets.get(request.url())});
  if(url.pathname==='/api/chat'){posts.push(request.postDataJSON());return route.fulfill({json:{answer:'Synthetic response'}})}
  if(url.pathname.startsWith('/api/')&&request.method()==='GET')return route.fulfill({json:missing?{summary:{total_exits:null,current_workforce:null}}:{summary:{total_exits:0,current_workforce:10},as_of:'2026-09-30'}});
  unexpected++;return route.abort();
 });
 const init=async({three=false,restored='',unavailable=false}={})=>{
  missing=unavailable;await page.goto('http://127.0.0.1:3100/');const seed=structuredClone(data);if(three)seed.workspaces[goalId].fields.workforceAlternativeReviews=[alternatives];
  if(restored)seed.workspaces[goalId].fields.chat={messages:[],input:restored,problem:null,questionUnanswered:false};
  await page.evaluate(({key,encoded,empty,complete,newer})=>{localStorage.setItem(key,encoded);window.readinessSeed={encoded,empty,complete,newer};window.workerActions=[];const Native=window.Worker;window.Worker=class extends Native{postMessage(value){window.workerActions.push(value.action);super.postMessage(value)}}},{key:DECISIONS_STORAGE_KEY,encoded:encodeDecisions(seed),empty,complete,newer});
  await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});await page.getByText('Option action suggestions',{exact:true}).click();await actions().getByRole('button',{name:three?'Compare all 3 options':'Compare all 2 options',exact:true}).waitFor();
  await page.getByLabel('Ask Workforce AI',{exact:true}).waitFor();
  // Home no longer makes an automatic post-pin model request.
  if(unavailable)await page.waitForTimeout(450);
 };
 const button=name=>page.getByRole('button',{name,exact:true}),actions=()=>page.getByRole('region',{name:'Workforce option actions',exact:true,includeHidden:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),send=()=>button('Send overview question').click(),state=()=>page.evaluate(()=>window.readinessSaved()),worker=()=>page.evaluate(()=>window.workerActions);
 const choose=async name=>{const summary=page.getByText('Option action suggestions',{exact:true});await summary.waitFor();if(!await summary.evaluate(el=>el.parentElement.open))await summary.click();await actions().getByRole('button',{name,exact:true}).click()};
 const solution=async()=>JSON.stringify((await state()).workspaces[goalId].fields.workforceSolution);
 await init();const saved=await solution(),baseline=posts.length,history=await page.evaluate(()=>JSON.stringify(window.optionQA())),workers=await worker();
 await page.getByText('Option action suggestions',{exact:true}).click();check(width+' duplicate suggestions are secondary and collapsed',!await actions().isVisible()&&await button('Compare options').isVisible());check(width+' existing options demote general planning action',await button('Generate Action Plan').isVisible()&&!await button('Generate Action Plan').evaluate(el=>el.classList.contains('bg-primary'))&&await button('Develop a full action plan').count()===0);await page.getByText('Option action suggestions',{exact:true}).click();
 await actions().getByRole('button',{name:'Compare all 2 options',exact:true}).focus();await page.keyboard.press('Enter');
 await page.getByRole('region',{name:'Compare calculated options',exact:true}).waitFor();await page.waitForTimeout(100);
 check(width+' keyboard suggestion compares immediately without chat or writes',await input.inputValue()===''&&await page.getByRole('region',{name:'Compare calculated options',exact:true}).evaluate(el=>el===document.activeElement)&&posts.length===baseline&&await solution()===saved&&await page.evaluate(()=>JSON.stringify(window.optionQA()))===history&&JSON.stringify(await worker())===JSON.stringify(workers));
 await input.fill('Keep unfinished question');check(width+' occupied draft disables every option suggestion',await actions().getByRole('button').evaluateAll(nodes=>nodes.every(node=>node.disabled))&&await input.inputValue()==='Keep unfinished question');await input.fill('');
 await page.getByRole('tab',{name:'Option 2',exact:true}).click();await choose('Adjust this option');await page.getByRole('region',{name:'Tailor selected option',exact:true}).waitFor();
 check(width+' Adjust targets current selection without saving',await page.getByRole('heading',{name:'Adjusting Option 2',exact:true}).isVisible()&&await page.getByLabel('Shared cash budget (USD)',{exact:true}).evaluate(el=>el===document.activeElement)&&await solution()===saved);
 await page.getByLabel('Shared cash budget (USD)',{exact:true}).fill('12345');await page.getByRole('tab',{name:'Option 1',exact:true}).click();check(width+' option draft survives browsing and actions disappear',await page.getByLabel('Shared cash budget (USD)',{exact:true}).inputValue()==='12345'&&await button('Save changes to this goal').isDisabled()&&await actions().count()===0);await button('Cancel what-if').click();
 const beforeSearch=await worker();await choose('Explore more options');const search=page.getByRole('region',{name:'Bounded local scenario search',exact:true});await search.waitFor();
 check(width+' Explore opens bounds without search or saving',await search.getByLabel('build min bound',{exact:true}).evaluate(el=>el===document.activeElement)&&await button('Run local mix search').isDisabled()&&JSON.stringify(await worker())===JSON.stringify(beforeSearch)&&await solution()===saved&&posts.length===baseline);
 await input.fill('Compare all 2 options');await send();check(width+' typed action cannot silently select or reach model',await input.inputValue()==='Compare all 2 options'&&await page.getByText('Choose the current option action button',{exact:false}).isVisible()&&posts.length===baseline);
 await input.fill('');await input.fill('What evidence is missing for this workforce goal?');await send();await page.waitForTimeout(400);check(width+' ordinary question retains existing envelope',posts.slice(baseline).some(post=>post.message.includes('What evidence is missing')&&!('optionActions' in post)&&!('workforceOptions' in post)));
 await init({three:true});check(width+' suggestion reflects actual three options',await actions().getByRole('button',{name:'Compare all 3 options',exact:true}).isVisible());
 await init({unavailable:true});const noEvidence=posts.length;await choose('Compare all 2 options');await page.getByRole('region',{name:'Compare calculated options',exact:true}).waitFor();check(width+' local click needs no overview evidence or AI',posts.length===noEvidence);
 await init({restored:'Adjust this option'});const restored=posts.length;await send();check(width+' restored label is retained and cannot dispatch',await input.inputValue()==='Adjust this option'&&await page.getByText('Choose the current option action button',{exact:false}).isVisible()&&posts.length===restored);
 for(const transition of ['Click then goal roundtrip','Click then change inputs','Click then change result']){
  await init();const before=posts.length;await button(transition).click();await page.waitForTimeout(100);check(width+' '+transition+' rejects queued stale suggestion',await page.getByRole('region',{name:'Compare calculated options',exact:true}).count()===0&&await input.inputValue()===''&&posts.length===before);
 }
 await init();await button('Queue draft then suggestion').click();await page.waitForTimeout(100);check(width+' queued ordinary draft cannot be overwritten or executed',await input.inputValue()==='Keep queued draft'&&await page.getByRole('region',{name:'Compare calculated options',exact:true}).count()===0);
 await init();const beforeDouble=posts.length,dispatches=await page.evaluate(()=>window.optionExecutions??0);await actions().getByRole('button',{name:'Compare all 2 options',exact:true}).evaluate(node=>{node.click();node.click()});await page.getByRole('region',{name:'Compare calculated options',exact:true}).waitFor();check(width+' repeated local click does not send chat or mutate plan',posts.length===beforeDouble&&await page.evaluate(()=>window.optionExecutions)===dispatches+1&&await input.inputValue()===''&&await solution()===saved);
 await input.fill('Keep goal A draft');await button('Goal B').click();await input.fill('Keep goal B draft');await button('Goal A').click();check(width+' goal switch preserves original typed draft',await input.inputValue()==='Keep goal A draft');await button('Goal B').click();check(width+' second draft also remains intact',await input.inputValue()==='Keep goal B draft');
 await init();await button('Change goal wording').click();check(width+' changed goal removes obsolete actions',await actions().count()===0);await button('Delete goal').click();check(width+' deleted goal removes actions',await actions().count()===0);
 await init();await choose('Compare all 2 options');await page.getByRole('region',{name:'Compare calculated options',exact:true}).waitFor();await page.screenshot({path:path.join(output,`composer-${width}.png`),fullPage:true});check(width+' mobile layout fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(width+' no unexpected service requests or runtime errors',unexpected===0&&errors.length===0);await context.close();
}}finally{await browser.close()}
console.log(`${checks} option-composer browser checks passed; screenshots: ${output}`);
