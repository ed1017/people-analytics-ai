/** Actual hooks/store/review with offline deterministic service transport; no provider calls. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedSteps,fixedChanges,liveStaffingMessage} from '../fixtures/required-staffing.mjs';
import {readStaffingScenario,staffingScenarioLabel} from '../../lib/home-staffing-scenario.ts';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {offlineBusinessRoute} from '../helpers/offline-business-route.mjs';
import {responseForStep} from '../fixtures/natural-business-planning.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const fullUI=process.env.REQUIRED_STAFFING_FULL_UI==='true',isolated=fullUI?await offlineBusinessRoute():null;
if(isolated){isolated.sandbox.console={info(){},error(){}};Object.assign(isolated.sandbox.process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/pr204-bounded-preview-20261010'});}
const output=process.env.REQUIRED_STAFFING_QA_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'required-staffing-'));await fs.mkdir(output,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve(fullUI?'tests/fixtures/swp-editor-full-client.tsx':'tests/fixtures/home-hiring-budget-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3137',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),checks=[],routeReceipts=[];
try{for(const [mode,width,height] of [['desktop',1440,1100],['phone',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let external=0,failNext=false;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const check=(name,ok)=>{assert.ok(ok,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.href===base+'/')return route.fulfill({contentType:'text/html',body:html});if(url.origin!==base){external++;return route.abort();}
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();requests.push(body);
   if(isolated){
    const scenario=body.message.text===liveStaffingMessage;
    if(scenario)assert.ok(readStaffingScenario(body,{natural:true,datasetToken:'legacy-v1:0'}),'actual fresh UI request must be eligible: '+JSON.stringify({scope:body.scope,filters:body.filters,goal:body.goal,goalContext:body.goalContext,selectedId:body.selectedId,catalog:body.catalog,goalProgress:body.goalProgress,progressEntry:body.progressEntry,message:body.message,planningCalculatorAvailable:body.planningCalculatorAvailable,state:body.state,evidenceDatasetContext:body.evidence.datasetContext}));
    const steps=scenario?[{name:'compare_required_staffing',args:{changes:fixedChanges(body)}}]:fixedSteps(body),start=isolated.sandbox.__requests.length;
    const reads=isolated.sandbox.__aggregateReads?.length??0;
    const provider=(step,index)=>({...responseForStep(step,index),model:'gpt-6.1-sol',service_tier:'default',usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:5}}});
    isolated.sandbox.__replies.push({...provider(steps[0],0),...(failNext?{status:'incomplete'}:{})});
    const response=await isolated.post(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()})),reply=await response.json();
    assert.equal(response.status,failNext?422:200,JSON.stringify(reply));assert.equal(isolated.sandbox.__requests.length-start,1);
    assert.deepEqual(JSON.parse(JSON.stringify(isolated.sandbox.__requests[start].tool_choice)),{type:'function',name:'compare_required_staffing'});
    assert.deepEqual(JSON.parse(JSON.stringify(isolated.sandbox.__requests[start].tools.map(t=>t.name))),['compare_required_staffing']);
    if(scenario){assert.equal(isolated.sandbox.__aggregateReads?.length??0,reads);assert.deepEqual(Object.keys(JSON.parse(isolated.sandbox.__requests[start].input[0].content)).sort(),['contract','currentMessage']);assert.ok(reply.answer.startsWith(staffingScenarioLabel));assert.deepEqual(reply.charts,[]);}else assert.match(JSON.stringify(isolated.sandbox.__requests[start].input),/evidenceGrounding/);
    assert.equal(reply.providerReceipt.modelAttempts,1);
    for(const sent of isolated.sandbox.__requests.slice(start))assert.equal(sent.truncation,'disabled');
    routeReceipts.push({mode,path:url.pathname,status:response.status,synthetic:true,modelAttempts:reply.providerReceipt.modelAttempts,firstToolChoice:isolated.sandbox.__requests[start].tool_choice,model:isolated.sandbox.__requests[start].model,reasoning:isolated.sandbox.__requests[start].reasoning,service_tier:isolated.sandbox.__requests[start].service_tier,truncation:isolated.sandbox.__requests[start].truncation});
    return route.fulfill({status:response.status,json:reply});
   }
   const runtime=fixtureRuntime(fixedSteps(body));runtime.natural={datasetToken:'legacy-v1:0'};
   return route.fulfill({json:await converseSolutions(body,runtime,new AbortController().signal)});
  }
  if(req.method()==='POST'){external++;return route.abort();}
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});external++;return route.abort();
 });
 await page.goto(base);if(fullUI)await dismissHomeOnboarding(page);const input=page.getByLabel('Ask Workforce AI',{exact:true});
 const send=async text=>{await input.fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.getByRole('status').filter({hasText:'Thinking through the question'}).waitFor({state:'hidden'});};
 const card=page.getByRole('region',{name:'Fixed-role staffing comparison',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await send(fullUI?liveStaffingMessage:fixedMessages.start);await card.waitFor();
 const receipt=page.getByRole('region',{name:'Preview test receipt',exact:true});
 if(fullUI){const visible=JSON.parse(await receipt.locator('pre').innerText());check('visible receipt exposes exact path, complete per-round usage and validated calculator state',visible.endpoint==='/api/home-solution-conversation'&&visible.httpStatus===200&&visible.applicationOutcome==='validated'&&visible.providerUsageComplete&&visible.rounds.length===1&&visible.rounds.every(r=>r.inputTokens===100&&r.cachedInputTokens===0&&r.outputTokens===20&&r.reasoningTokens===5&&r.totalTokens===120)&&visible.calculator.inputs.hireTrainingHoursPerPerson===null&&visible.calculator.options[2].listedCash===495000);check('receipt is absent from persisted conversation storage',!JSON.stringify(await state()).includes('providerUsageComplete'));await receipt.screenshot({path:path.join(output,mode+'-receipt.png')});}
 if(fullUI)check('actual Home UI selects the solution endpoint and renders checked cards',requests.length===1&&isolated.sandbox.__requests.at(-1).service_tier==='default'&&isolated.sandbox.__requests.at(-1).reasoning.effort==='medium');
 if(fullUI)check('illustrative calculation visibly states company data was not consulted',await page.getByRole('region',{name:'Overview conversation',exact:true}).innerText().then(text=>text.includes(staffingScenarioLabel))&&await page.getByRole('figure').count()===0);
 check('three numeric options without a workload form',await card.getByRole('article').count()===3&&(await card.innerText()).includes('1,600,000 USD')&&(await card.innerText()).includes('30,000 USD')&&(await card.innerText()).includes('495,000 USD')&&await page.getByRole('region',{name:'Business planning assumptions',exact:true}).count()===0);
 check('training requirements and operational timing stay unknown',await card.getByRole('article',{name:'Train 0, redeploy 0, hire 10',exact:true}).innerText().then(t=>t.includes('Training: Not specified')&&t.includes('Readiness: Unknown'))&&(await card.innerText()).includes('480 hours')&&(await card.innerText()).includes('240 hours'));
 check('one recommendation and optional details, no new input form',(await card.innerText()).split('Recommendation:').length===2&&await card.locator('form,input,select').count()===0&&await card.locator('details[open]').count()===0);
 await send(fixedMessages.followup);check('numeric follow-up retains the exact ten-role comparison',(await card.innerText()).includes('495,000 USD')&&requests.at(-1).state.requiredStaffing.inputs.requiredRoles===10);
 await send(fixedMessages.correction);check('per-trainee correction recalculates two internal options',(await card.innerText()).includes('42,000 USD')&&(await card.innerText()).includes('501,000 USD')&&(await card.innerText()).includes('240 hours'));
 await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();check('reload retains corrected values and unknown new-hire training',(await card.innerText()).includes('501,000 USD')&&(await card.innerText()).includes('Training: Not specified'));
 if(fullUI)check('reload clears the temporary receipt without another request',await receipt.count()===0&&requests.length===3);
 const stored=await state();check('comparison does not pin a goal or create a saved plan',!stored.goals.activeId&&stored.exploration.fields.homeSolutionConversationV1.working.length===0);
 await card.screenshot({path:path.join(output,mode+'.png')});
 check('responsive comparison has no overflow, runtime errors or external traffic',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0);
 if(!fullUI)await page.getByRole('button',{name:'Change workforce scope',exact:true}).click();await card.getByRole('button',{name:'Clear staffing comparison',exact:true}).click();
 check('clear removes only this comparison without a model request',await card.count()===0&&requests.length===3&&(await state()).exploration.fields.homeSolutionConversationV1.turns.length===6);
 if(fullUI){failNext=true;await send(fixedMessages.start);await receipt.waitFor();const visible=JSON.parse(await receipt.locator('pre').innerText());assert.deepEqual({outcome:visible.applicationOutcome,status:visible.httpStatus,attempts:visible.modelAttempts,rounds:visible.rounds.length,calculator:visible.calculator,requests:requests.length,cards:await card.count()},{outcome:'failed',status:422,attempts:1,rounds:1,calculator:null,requests:4,cards:0});check('failed response retains visible usage and stops without a retry or updated calculator state',(await receipt.innerText()).includes('do not retry'));}
 await context.close();
}}finally{await browser.close()}
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks,routeReceipts},null,2));console.log(JSON.stringify({checks:checks.length,output}));
