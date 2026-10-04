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
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/workforce-option-composer.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
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
try{for(const width of [1366,390]){
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:900}}),page=await context.newPage(),errors=[];let posts=[],unexpected=0,missing=false;
 page.on('pageerror',error=>errors.push(error.message));
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
  await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});await actions().getByRole('button',{name:three?'Compare all 3 options':'Compare all 2 options',exact:true}).waitFor();
  if(!restored&&!unavailable)await page.getByText('Synthetic response',{exact:true}).first().waitFor();
 };
 const button=name=>page.getByRole('button',{name,exact:true}),actions=()=>page.getByRole('region',{name:'Workforce option actions',exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),send=()=>button('Send overview question').click(),state=()=>page.evaluate(()=>window.readinessSaved()),worker=()=>page.evaluate(()=>window.workerActions);
 const solution=async()=>JSON.stringify((await state()).workspaces[goalId].fields.workforceSolution);
 await init();const saved=await solution(),baseline=posts.length,history=await page.evaluate(()=>JSON.stringify(window.optionQA())),workers=await worker();
 await actions().getByRole('button',{name:'Compare all 2 options',exact:true}).focus();await page.keyboard.press('Enter');
 check(width+' suggestion drafts and focuses without executing',await input.inputValue()==='Compare all 2 options'&&await input.evaluate(el=>el===document.activeElement)&&await page.getByRole('region',{name:'Compare calculated options',exact:true}).count()===0&&posts.length===baseline&&JSON.stringify(await worker())===JSON.stringify(workers));
 await button('Send overview question').focus();await page.keyboard.press('Enter');await page.getByRole('region',{name:'Compare calculated options',exact:true}).waitFor();await page.waitForTimeout(400);
 check(width+' Send compares locally and does not trigger takeaway/history writes',await input.inputValue()===''&&await page.getByRole('region',{name:'Compare calculated options',exact:true}).evaluate(el=>el===document.activeElement)&&posts.length===baseline&&await solution()===saved&&await page.evaluate(()=>JSON.stringify(window.optionQA()))===history);
 await input.fill('Keep unfinished question');check(width+' occupied draft disables every option suggestion',await actions().getByRole('button').evaluateAll(nodes=>nodes.every(node=>node.disabled)));await input.fill('');
 await actions().getByRole('button',{name:'Adjust this option',exact:true}).click();await page.getByRole('tab',{name:'Option 2',exact:true}).click();await send();
 check(width+' changed selection rejects captured Adjust and retains text',await input.inputValue()==='Adjust this option'&&await page.getByText('The selected goal, calculation or option changed.',{exact:false}).isVisible()&&await page.getByRole('region',{name:'Tailor selected option',exact:true}).count()===0);
 await input.fill('');await actions().getByRole('button',{name:'Adjust this option',exact:true}).click();await send();await page.getByRole('region',{name:'Tailor selected option',exact:true}).waitFor();
 check(width+' newly staged Adjust targets selected option without saving',await page.getByRole('heading',{name:'Adjusting Option 2',exact:true}).isVisible()&&await page.getByLabel('Shared cash budget (USD)',{exact:true}).evaluate(el=>el===document.activeElement)&&await solution()===saved);
 await page.getByLabel('Shared cash budget (USD)',{exact:true}).fill('12345');await page.getByRole('tab',{name:'Option 1',exact:true}).click();check(width+' option draft survives browsing and unavailable actions are omitted',await page.getByLabel('Shared cash budget (USD)',{exact:true}).inputValue()==='12345'&&await button('Save revised solution to this goal').isDisabled()&&await actions().count()===0);await button('Cancel what-if').click();
 await actions().getByRole('button',{name:'Explore more options',exact:true}).click();const beforeSearch=await worker();await send();const search=page.getByRole('region',{name:'Bounded local scenario search',exact:true});await search.waitFor();
 check(width+' Explore opens existing bounds with no search or save',await search.getByLabel('build min bound',{exact:true}).evaluate(el=>el===document.activeElement)&&await button('Run local mix search').isDisabled()&&JSON.stringify(await worker())===JSON.stringify(beforeSearch)&&await solution()===saved&&posts.length===baseline);
 await input.fill('');await actions().getByRole('button',{name:'Compare all 2 options',exact:true}).click();await input.fill('Compare all 2 options please');await send();check(width+' edited staged suggestion is retained and never sent to model',await input.inputValue()==='Compare all 2 options please'&&await page.getByText('This option suggestion was edited.',{exact:false}).isVisible()&&posts.length===baseline);
 await input.fill('Compare all 2 options');await send();check(width+' restoring edited text does not revive old action',await input.inputValue()==='Compare all 2 options'&&posts.length===baseline);
 await input.fill('');await input.fill('What evidence is missing for this workforce goal?');await send();await page.waitForFunction(()=>document.querySelector('#overview-question')?.value==='');await page.waitForTimeout(400);
 check(width+' ordinary question retains existing chat request shape',posts.slice(baseline).some(post=>post.message.includes('What evidence is missing')&&!('optionActions' in post)&&!('workforceOptions' in post)));
 await init({three:true});check(width+' suggestion reflects actual three options',await actions().getByRole('button',{name:'Compare all 3 options',exact:true}).isVisible());
 await init({unavailable:true});const unavailableBaseline=posts.length;await actions().getByRole('button',{name:'Compare all 2 options',exact:true}).click();check(width+' local Send works without overview evidence',await button('Send overview question').isEnabled());await send();check(width+' missing overview does not force model fallback',await page.getByRole('region',{name:'Compare calculated options',exact:true}).isVisible()&&posts.length===unavailableBaseline);
 await init({restored:'Adjust this option'});const restoredBaseline=posts.length;await send();check(width+' restored command requires restaging without request',await input.inputValue()==='Adjust this option'&&await page.getByText('Choose an option suggestion again before sending.',{exact:false}).isVisible()&&posts.length===restoredBaseline);
 for(const transition of ['Batched goal roundtrip','Advance current inputs']){
  await init();const baseline=posts.length;await actions().getByRole('button',{name:'Adjust this option',exact:true}).click();await button(transition).click();await send();check(width+' '+transition+' invalidates staged action',await input.inputValue()==='Adjust this option'&&await page.getByRole('region',{name:'Tailor selected option',exact:true}).count()===0&&posts.length===baseline);
 }
 await init();await actions().getByRole('button',{name:'Adjust this option',exact:true}).click();await button('Goal B').click();await input.fill('Keep other goal draft');await button('Goal A').click();await send();check(width+' goal switch restores draft but rejects stale action',await input.inputValue()==='Adjust this option'&&await page.getByRole('region',{name:'Tailor selected option',exact:true}).count()===0);await button('Goal B').click();check(width+' other goal draft remains intact',await input.inputValue()==='Keep other goal draft');
 await init();await button('Queue draft then suggestion').click();check(width+' queued ordinary draft cannot be overwritten',await input.inputValue()==='Keep queued draft');const queuedBaseline=posts.length;await send();await page.waitForTimeout(400);check(width+' queued ordinary draft still uses normal chat',posts.slice(queuedBaseline).some(post=>post.message.includes('Keep queued draft')));
 await init();await actions().getByRole('button',{name:'Adjust this option',exact:true}).click();await page.evaluate(value=>window.fixtureSetField('workforceAlternativeReviews',value),[alternatives]);await actions().getByRole('button',{name:'Compare all 3 options',exact:true}).waitFor();await send();check(width+' changed alternative history rejects captured command',await input.inputValue()==='Adjust this option'&&await page.getByRole('region',{name:'Tailor selected option',exact:true}).count()===0);
 await init();await actions().getByRole('button',{name:'Adjust this option',exact:true}).click();await page.evaluate(()=>window.fixtureSetField('workforceInspection','unavailable-result'));await send();check(width+' result selection invalidation preserves draft',await input.inputValue()==='Adjust this option'&&await page.getByRole('region',{name:'Tailor selected option',exact:true}).count()===0);
 await init();await actions().getByRole('button',{name:'Adjust this option',exact:true}).click();await button('Change goal wording').click();check(width+' renamed goal clears old command through existing goal flow',await input.inputValue()===''&&await actions().count()===0);await button('Delete goal').click();check(width+' deleted goal removes actions',await actions().count()===0);
 await init();await actions().getByRole('button',{name:'Compare all 2 options',exact:true}).click();await send();await page.screenshot({path:path.join(output,`composer-${width}.png`),fullPage:true});check(width+' mobile layout fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(width+' no unexpected service requests or runtime errors',unexpected===0&&errors.length===0);await context.close();
}}finally{await browser.close()}
console.log(`${checks} option-composer browser checks passed; screenshots: ${output}`);
