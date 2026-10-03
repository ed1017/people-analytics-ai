import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';
import {pinSavedSolution} from '../../lib/workforce-solution-cards.ts';
import {workforceReviewFixture} from '../fixtures/workforce-review.mjs';
import {createWorkforceSolution,emptySolutionInputs,beginSolutionRun,completeSolutionRun,recordSolutionApproval,reviseWorkforceSolution} from '../../lib/workforce-solution.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'workforce-pending-cleanup-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/workforce-input-readiness.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
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
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:844}}),page=await context.newPage(),errors=[];let unexpected=0,releaseNative;
 page.on('pageerror',error=>errors.push(error.message));
 const assets=new Map(await Promise.all((await fs.readdir(output)).filter(name=>name.endsWith('.js')).map(async name=>['http://127.0.0.1:3100/assets/'+name,await fs.readFile(path.join(output,name),'utf8')])));
 await page.route('**/*',async route=>{
  const url=route.request().url();if(url==='http://127.0.0.1:3100/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div>'});
  if(assets.has(url))return route.fulfill({contentType:'text/javascript',body:assets.get(url)});
  if(url==='http://127.0.0.1:3100/api/workforce-solution'){await new Promise(resolve=>releaseNative=resolve);return route.fulfill({json:history.results.at(-1).payload}).catch(()=>{})}
  unexpected++;return route.abort();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),calculate=()=>button('Calculate saved assumptions and compare hiring-only'),state=()=>page.evaluate(()=>window.readinessSaved()),solution=async()=>(await state()).workspaces[goalId]?.fields.workforceSolution;
 const init=async(held=false,fastTimeout=false)=>{
  await page.goto('http://127.0.0.1:3100/');await page.evaluate(key=>localStorage.removeItem(key),DECISIONS_STORAGE_KEY);
  await page.evaluate(({seed,held,response,fastTimeout})=>{if(fastTimeout){const nativeTimer=window.setTimeout;window.setTimeout=(fn,delay,...args)=>nativeTimer(fn,delay===65000?30:delay,...args)}window.readinessSeed=seed;window.requests=[];if(held){const native=window.fetch;window.fetch=(url,options)=>String(url)==='/api/workforce-solution'?new Promise(resolve=>window.requests.push({signal:options.signal,release:()=>resolve(new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/json'}}))})):native(url,options)}},{seed:{encoded:encodeDecisions(data),empty,complete:history,newer},held,fastTimeout,response:history.results.at(-1).payload});
  await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});await button('Open pinned version 2').click();await page.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('select[aria-label="Your comparison priority"]')?.disabled);
 };
 await init();const before=await solution(),pins=(await state()).workspaces[goalId].fields.workforceSolutionPins;
 check(width+' exact historical pin with current v3',(await solution()).versions.at(-1).version===3&&(await state()).workspaces[goalId].fields.workforceInspection==='result-v2');
 await calculate().click();await button('Cancel pending request').waitFor();await button('Goal B').click();await page.waitForTimeout(150);await button('Goal A').click();await page.waitForTimeout(150);
 check(width+' historical A-B-A clears interrupted pending without explicit Cancel',(await solution()).pending===null);
 if(releaseNative)releaseNative();await page.waitForTimeout(100);
 check(width+' interrupted response preserves prior versions/results/approvals',JSON.stringify((await solution()).versions)===JSON.stringify(before.versions)&&JSON.stringify((await solution()).results)===JSON.stringify(before.results)&&JSON.stringify((await solution()).approvals)===JSON.stringify(before.approvals));
 check(width+' selection and exact pins preserved',(await state()).workspaces[goalId].fields.workforceInspection==='result-v2'&&JSON.stringify((await state()).workspaces[goalId].fields.workforceSolutionPins)===JSON.stringify(pins));
 check(width+' Continue and controls recover',await button('Cancel pending request').count()===0&&await calculate().isEnabled()&&await page.getByLabel('Your comparison priority',{exact:true}).isEnabled()&&await button('Open pinned version 2').isEnabled()&&!(await page.getByRole('region',{name:'Continue this workforce decision',exact:true}).innerText()).includes('request is in progress'));
 await init(true);await calculate().click();await page.waitForFunction(()=>window.requests.length===1);const old=(await solution()).pending.id;
 await button('Batched goal roundtrip').click();check(width+' batched transition clears ticket before old fetch settles',(await solution()).pending===null&&await page.evaluate(()=>window.requests[0].signal.aborted));
 await calculate().click();await page.waitForFunction(()=>window.requests.length===2);const next=(await solution()).pending.id;check(width+' newer request has distinct ownership and disables Calculate',next!==old&&await calculate().isDisabled());
 await page.evaluate(()=>window.requests[0].release());await page.waitForTimeout(150);check(width+' old finally cannot clear newer ticket or busy state',(await solution()).pending.id===next&&await calculate().isDisabled()&&(await solution()).results.length===3);
 await page.evaluate(()=>window.requests[1].release());await page.waitForFunction(()=>window.readinessSaved().workspaces['goal-readiness'].fields.workforceSolution.results.length===4);
 check(width+' only newer response completes and pending clears',(await solution()).pending===null&&(await solution()).results.at(-1).runId===next&&JSON.stringify((await solution()).results.slice(0,3))===JSON.stringify(history.results));
 await init(true);await calculate().click();await page.waitForFunction(()=>window.requests.length===1);await page.evaluate(()=>window.deleteFixtureGoal());await page.evaluate(()=>window.requests[0].release());await page.waitForTimeout(150);
 check(width+' deletion plus late cleanup never resurrects goal or workspace',!(await state()).goals.goals.some(g=>g.id===goalId)&&!(await state()).workspaces[goalId]);
 await init(true,true);await calculate().click();await page.waitForFunction(()=>window.requests[0]?.signal.aborted);check(width+' calculation timeout releases owned ticket and controls',(await solution()).pending===null&&await calculate().isEnabled());await page.evaluate(()=>window.requests[0].release());await page.waitForTimeout(100);check(width+' response after timeout cannot add result',(await solution()).results.length===3);
 await init();const orphan=beginSolutionRun(history,3,'orphan-request',['brief'],at).state;await page.evaluate(value=>window.fixtureSetField('workforceSolution',value),orphan);check(width+' retained pending ticket disables Calculate without a local controller',await calculate().isDisabled());await button('Cancel pending request').click();check(width+' explicit Cancel safely recovers a retained pending ticket',(await solution()).pending===null&&(await solution()).results.length===3);
 check(width+' no live APIs or runtime errors',unexpected===0&&errors.length===0);await context.close();
}console.log(`${checks} pending-cleanup browser checks passed; Chromium desktop + Pixel emulation; ${output}`)}finally{await browser.close()}
