// Built-app regression; every API response is intercepted synthetic data.
import assert from 'node:assert/strict';
import {workforceReviewFixture} from '../fixtures/workforce-review.mjs';
import {calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';
import {pinSavedSolution} from '../../lib/workforce-solution-cards.ts';
import {createWorkforceSolution,emptySolutionInputs,beginSolutionRun,completeSolutionRun,recordSolutionApproval,reviseWorkforceSolution} from '../../lib/workforce-solution.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const goalId='goal-readiness',goalStatement='Synthetic three-role workforce goal',at='2026-10-03T01:00:00.000Z',payload=workforceReviewFixture(),inputs=emptySolutionInputs();
const sections={scope:['businessUnit','jobProfile','intent','planningMonth','months'],demand:['roles'],response:['build','move','buy','backfills'],timing:['recruitingStart','arrivalMode','arrivalDate','buildMonth','moveMonth','backfillDate'],costs:['annualHireCost','hireFee','annualBackfillCost','backfillFee','internalAnnualCostChange'],training:['trainingCash','trainingHours','loadedHourlyCost'],constraints:['budget','maxAddedEmployees','deadlineMonth']};
for(const [section,fields] of Object.entries(sections))for(const field of fields)inputs[section][field]=payload.input[field];inputs.scope.goalStatement=goalStatement;
let complete=createWorkforceSolution('complete-solution',goalId,inputs,at);const run=beginSolutionRun(complete,1,'ready-run',['brief'],at);complete=completeSolutionRun(run.state,run.ticket,[{id:'ready-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);complete=recordSolutionApproval(complete,1,'keep-approval',['ready-result'],'Synthetic approval retained',at);
const data={version:1,revision:1,goals:{version:1,activeId:goalId,goals:[{id:goalId,statement:goalStatement},{id:'goal-other',statement:'Other synthetic goal'}]},workspaces:{[goalId]:{savedAt:at,fields:{workforceSolution:complete,owner:'Keep owner',workforceCatalog:{as_of:'2026-09-30',business_units:[{org_code:'TECH',org_name:'Technology'}],job_profiles:[{job_profile_code:'ENGINEER',job_profile_name:'Engineer'}]}}}}};
data.workspaces[goalId].fields.workforceSolution=complete;
function addCalculation(state,version,budget){
 const edited=reviseWorkforceSolution(state,version-1,{constraints:{...inputs.constraints,budget}},'sidebar','Synthetic revision',at),response=workforceReviewFixture();
 response.input.budget=budget;response.proposed=calculateWorkforceIncrement(response.input,response.timing);response.hireOnly=calculateWorkforceIncrement({...response.input,build:'0',move:'0',buy:response.input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},response.timing);
 const run=beginSolutionRun(edited,version,'run-v'+version,['brief'],at);
 return completeSolutionRun(run.state,run.ticket,[{id:'result-v'+version,kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload:response}],at);
}
const history=addCalculation(addCalculation(complete,2,'26000'),3,'27000');
data.workspaces[goalId].fields.workforceSolution=history;
data.workspaces[goalId].fields.workforceSolutionPins=await pinSavedSolution(await pinSavedSolution([],history,'result-v2','pin-v2',at),history,'result-v3','pin-v3',at);
data.workspaces[goalId].fields.workforceInspection='result-v2';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
try{for(const width of [1366,390]){
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:900}}),page=await context.newPage();
 let nonlocal=0,calculations=0;const releases=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'){nonlocal++;return route.abort()}
  if(url.pathname==='/api/workforce-solution'){calculations++;await new Promise(resolve=>releases.push(resolve));return route.fulfill({json:history.results.at(-1).payload}).catch(()=>{})}
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{error:'Synthetic offline fixture; no live API request'}});
  return route.continue();
 });
 await page.addInitScript(({key,seed})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,seed);
  window.holdPinVerification=true;window.holdPinResolve=false;window.pinReplies=[];
  const NativeWorker=window.Worker;
  window.Worker=class extends NativeWorker{
   postMessage(message){this.action=message.action;super.postMessage(message)}
   set onmessage(handler){super.onmessage=e=>{
    if(this.action==='cards'&&window.holdPinVerification||this.action==='resolve-pin'&&window.holdPinResolve)window.pinReplies.push({action:this.action,release:override=>handler(override??e)});
    else handler(e);
   }}
  };
 },{key:DECISIONS_STORAGE_KEY,seed:encodeDecisions(data)});
 const workspace=page.getByRole('region',{name:'Workforce solution workspace',exact:true}),goal=page.getByLabel('Selected goal',{exact:true});
 const button=name=>workspace.getByRole('button',{name,exact:true}),heading=v=>workspace.getByRole('heading',{name:'Calculated decision brief — version '+v,exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const releaseCards=async()=>{await page.waitForFunction(()=>window.pinReplies.some(item=>item.action==='cards'));await page.evaluate(()=>{window.holdPinVerification=false;const saved=window.pinReplies;window.pinReplies=[];saved.forEach(item=>item.release())})};
 const preserved=async()=>{const fields=(await state()).workspaces[goalId].fields;return ['versions','results','evidence','approvals'].every(key=>JSON.stringify(fields.workforceSolution[key])===JSON.stringify(history[key]))&&JSON.stringify(fields.workforceSolution.runs.slice(0,history.runs.length))===JSON.stringify(history.runs)&&fields.workforceSolution.pending===null&&JSON.stringify(fields.workforceSolutionPins)===JSON.stringify(data.workspaces[goalId].fields.workforceSolutionPins)&&fields.owner==='Keep owner'};
 await page.goto('http://127.0.0.1:3100/',{waitUntil:'domcontentloaded'});await heading(2).waitFor();
 check(width+' reload restoration visibly blocks pin clicks',await button('Open pinned version 3').isDisabled()&&await workspace.getByRole('status').filter({hasText:'before opening pinned versions'}).isVisible());
 await releaseCards();await button('Open pinned version 3').click();await heading(3).waitFor();
 check(width+' normal pin opens exact v3', (await state()).workspaces[goalId].fields.workforceInspection==='result-v3');
 await button('Open pinned version 2').click();await heading(2).waitFor();
 // Real goal selector with no settling delay between B and A.
 await page.evaluate(()=>{window.holdPinVerification=true});await goal.selectOption('goal-other');await goal.selectOption(goalId);await heading(2).waitFor();
 check(width+' rapid A-B-A blocks enabled-click restoration window',await button('Open pinned version 3').isDisabled());
 await releaseCards();await button('Open pinned version 3').click();await heading(3).waitFor();
 check(width+' first accepted pin click after restoration wins',(await state()).workspaces[goalId].fields.workforceInspection==='result-v3'&&await preserved());
 await page.reload({waitUntil:'domcontentloaded'});await heading(3).waitFor();check(width+' reload retains selected v3 and every saved record',await preserved());await releaseCards();
 await button('Open pinned version 2').click();await heading(2).waitFor();
 // Hold an old pin resolution, leave its owner, then start a new pin request.
 await page.evaluate(()=>{window.holdPinResolve=true});await button('Open pinned version 3').click();await page.waitForFunction(()=>window.pinReplies.some(item=>item.action==='resolve-pin'));
 await goal.selectOption('goal-other');await goal.selectOption(goalId);await heading(2).waitFor();await button('Open pinned version 3').click();
 await page.waitForFunction(()=>window.pinReplies.filter(item=>item.action==='resolve-pin').length===2);
 await page.evaluate(()=>{window.pinReplies.pop().release()});await heading(3).waitFor();
 await page.evaluate(()=>{window.pinReplies.shift().release();window.holdPinResolve=false});
 check(width+' older cancelled resolution cannot replace newer pin choice',(await state()).workspaces[goalId].fields.workforceInspection==='result-v3'&&await preserved());
 // A direct newer saved-result selection also cancels the older asynchronous pin.
 await button('Open pinned version 2').click();await heading(2).waitFor();await page.evaluate(()=>{window.holdPinResolve=true});await button('Open pinned version 3').click();await page.waitForFunction(()=>window.pinReplies.some(item=>item.action==='resolve-pin'));
 await workspace.getByLabel('Inspect a saved calculation',{exact:true}).selectOption('ready-result');await heading(1).waitFor();
 await page.evaluate(()=>{window.pinReplies.shift().release();window.holdPinResolve=false});
 check(width+' newer explicit inspection wins over pending pin',(await state()).workspaces[goalId].fields.workforceInspection==='ready-result'&&await preserved());
 // Priority remains editable while a pin resolves. Cancelling that work must
 // release its busy state even when no what-if draft needs recalculation.
 await page.evaluate(()=>{window.holdPinResolve=true});await button('Open pinned version 3').click();await page.waitForFunction(()=>window.pinReplies.some(item=>item.action==='resolve-pin'));
 await workspace.getByLabel('Your comparison priority',{exact:true}).selectOption('cash');
 await page.evaluate(()=>{window.pinReplies.shift().release();window.holdPinResolve=false});
 check(width+' priority change cancels pending pin without leaving controls disabled',await button('Open pinned version 3').isEnabled()&&(await state()).workspaces[goalId].fields.workforceInspection==='ready-result');
 await button('Open pinned version 3').click();await heading(3).waitFor();
 const calculate=button('Calculate saved assumptions and compare hiring-only'),cancel=()=>button('Cancel pending request');
 await calculate.click();await cancel().waitFor();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('insights-to-action.decisions.v1')).payload.workspaces['goal-readiness'].fields.workforceSolution.pending!==null);
 await cancel().click();await calculate.click();await cancel().waitFor();
 const pending=(await state()).workspaces[goalId].fields.workforceSolution.pending;
 for(let attempt=0;releases.length<2&&attempt<200;attempt++)await page.waitForTimeout(10);assert.equal(releases.length,2,'Both synthetic calculations reached the mocked route');releases[0]();await page.waitForTimeout(100);
 check(width+' late cancelled calculation cannot clear the newer pending request',JSON.stringify((await state()).workspaces[goalId].fields.workforceSolution.pending)===JSON.stringify(pending)&&await calculate.isDisabled());
 await cancel().click();releases[1]();await page.waitForTimeout(100);
 check(width+' cancellations retain pins, versions, approvals and newest selection',await preserved()&&(await state()).workspaces[goalId].fields.workforceInspection==='result-v3');
 // A failed verification must settle readiness, retain records and permit a
 // later explicit pin resolution to verify a different saved source normally.
 await page.reload({waitUntil:'domcontentloaded'});await heading(3).waitFor();
 await page.waitForFunction(()=>window.pinReplies.some(item=>item.action==='cards'));
 await page.evaluate(()=>{window.holdPinVerification=false;const replies=window.pinReplies;window.pinReplies=[];replies.forEach(item=>item.release({data:{ok:false,error:'Synthetic verification failure'}}))});
 await workspace.getByRole('status').filter({hasText:'Synthetic verification failure'}).waitFor();
 check(width+' failed verification settles pin readiness without erasing records',await button('Open pinned version 2').isEnabled()&&await preserved());
 await button('Open pinned version 2').click();await heading(2).waitFor();
 await button('Open pinned version 3').click();await heading(3).waitFor();
 check(width+' explicit pin navigation recovers after verification failure',(await state()).workspaces[goalId].fields.workforceInspection==='result-v3'&&await preserved());
 check(width+' only local mocked APIs and no browser errors',nonlocal===0&&calculations===2&&errors.length===0);
 check(width+' mobile and desktop content fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>{window.holdPinResolve=true});await button('Open pinned version 2').click();await page.waitForFunction(()=>window.pinReplies.some(item=>item.action==='resolve-pin'));
 await page.getByRole('button',{name:'Read or edit Focused issue: '+goalStatement,exact:true}).click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Remove goal',exact:true}).click();
 await page.evaluate(()=>{window.pinReplies.shift().release();window.holdPinResolve=false});
 check(width+' deleting goal during pin resolution cannot resurrect its workspace',!(await state()).workspaces[goalId]&&!(await state()).goals.goals.some(goal=>goal.id===goalId));
 await page.reload({waitUntil:'domcontentloaded'});await goal.waitFor();
 check(width+' deletion stays durable after reload and preserves the other goal',!(await state()).workspaces[goalId]&&(await state()).goals.goals.some(goal=>goal.id==='goal-other'));
 await context.close();
}console.log(`${checks} pin-selection browser checks passed; built UI, Linux Chromium desktop and Pixel emulation`)}finally{await browser.close()}
