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
data.workspaces[goalId].fields.workforceInspection='result-v3';
data.workspaces[goalId].fields.workforceSolutionPins=await pinSavedSolution([],history,'result-v2','pin-v2',at);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const width of [1366,390]){
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:900}}),page=await context.newPage(),errors=[];let release,calculations=0,modelCalls=0,nonlocal=0;const modelPaths=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'){nonlocal++;return route.abort()}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(url.pathname==='/api/workforce-solution'){calculations++;await new Promise(resolve=>release=resolve);return route.fulfill({json:history.results.at(-1).payload}).catch(()=>{})}
  if(url.pathname.includes('chat')||url.pathname.includes('intake')){modelCalls++;modelPaths.push(url.pathname)}
  return route.fulfill({status:503,json:{error:'Synthetic offline regression; source request deliberately unavailable.'}});
 });
 await page.addInitScript(({key,seed})=>localStorage.setItem(key,seed),{key:DECISIONS_STORAGE_KEY,seed:encodeDecisions(data)});
 await page.goto('http://127.0.0.1:3100/',{waitUntil:'domcontentloaded'});
 const workspace=page.getByRole('region',{name:'Workforce solution workspace',exact:true}),button=name=>workspace.getByRole('button',{name,exact:true,includeHidden:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await workspace.getByText('Saved pins',{exact:true}).click();await button('Open pinned version 2').click();await workspace.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).waitFor();const before=(await state()).workspaces[goalId].fields;
 check(width+' built app opens exact historical pin with current v3',before.workforceInspection==='result-v2'&&before.workforceSolution.versions.at(-1).version===3);
 await button(/^Calculate (options|saved assumptions and compare hiring-only)$/).click();await button('Cancel pending request').waitFor();check(width+' Calculate disabled while request is pending',await button(/^Calculate (options|saved assumptions and compare hiring-only)$/).isDisabled());
 await page.getByLabel('Selected goal',{exact:true}).selectOption('goal-other');await page.waitForTimeout(150);if(release)release();await page.waitForTimeout(100);
 await page.getByLabel('Selected goal',{exact:true}).selectOption(goalId);await workspace.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).waitFor();
 const after=(await state()).workspaces[goalId].fields;
 check(width+' native UI A-B-A leaves no orphan pending',after.workforceSolution.pending===null&&await button('Cancel pending request').count()===0);
 check(width+' versions, results, approval and pin records survive',JSON.stringify(after.workforceSolution.versions)===JSON.stringify(before.workforceSolution.versions)&&JSON.stringify(after.workforceSolution.results)===JSON.stringify(before.workforceSolution.results)&&JSON.stringify(after.workforceSolution.approvals)===JSON.stringify(before.workforceSolution.approvals)&&JSON.stringify(after.workforceSolutionPins)===JSON.stringify(before.workforceSolutionPins)&&after.workforceInspection==='result-v2');
 // Pin controls recover only after the restored source finishes local verification.
 await page.waitForFunction(()=>{const pin=[...document.querySelectorAll('button')].find(button=>button.textContent==='Open pinned version 2');return pin&&!pin.disabled});
 check(width+' controls recover without Cancel and historical approval stays gated',await button(/^Calculate (options|saved assumptions and compare hiring-only)$/).isEnabled()&&await button('Open pinned version 2').isEnabled()&&await button('Record version-specific approval note').isDisabled()&&!(await workspace.getByRole('region',{name:'Continue this workforce decision',exact:true}).innerText()).includes('request is in progress'));
 check(width+' only synthetic intercepted APIs and no live traffic '+JSON.stringify({calculations,blockedModelRequests:modelCalls,blockedModelPaths:modelPaths,nonlocal,errors}),calculations===1&&nonlocal===0&&errors.length===0);
 await context.close();
}console.log(`${checks} built pending-cleanup browser checks passed; real goal selector, Chromium desktop + Pixel emulation`)}finally{await browser.close()}
