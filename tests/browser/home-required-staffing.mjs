/** Actual hooks/store/review with offline deterministic service transport; no provider calls. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {fixtureRuntime,final} from '../fixtures/home-solution-conversation.mjs';
import {staffingDeliveryPrompt,syntheticDeliveryChanges} from '../fixtures/staffing-delivery-prompt.mjs';
import {fixedMessages,fixedSteps,liveStaffingMessage} from '../fixtures/required-staffing.mjs';
import {readStaffingScenario,staffingScenarioLabel} from '../../lib/home-staffing-scenario.ts';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
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
const base='http://127.0.0.1:3137',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),checks=[];
try{for(const [mode,width,height] of [['desktop',1440,1100],['phone',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let external=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const check=(name,ok)=>{assert.ok(ok,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.href===base+'/')return route.fulfill({contentType:'text/html',body:html});if(url.origin!==base){external++;return route.abort();}
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();requests.push(body);
   if(isolated){
    const scenario=body.message.text===liveStaffingMessage;
    if(scenario)assert.ok(readStaffingScenario(body,{natural:true,datasetToken:'legacy-v1:0'}),'actual fresh UI request must be eligible: '+JSON.stringify({scope:body.scope,filters:body.filters,goal:body.goal,goalContext:body.goalContext,selectedId:body.selectedId,catalog:body.catalog,goalProgress:body.goalProgress,progressEntry:body.progressEntry,message:body.message,planningCalculatorAvailable:body.planningCalculatorAvailable,state:body.state,evidenceDatasetContext:body.evidence.datasetContext}));
    const steps=body.message.text===staffingDeliveryPrompt?[{name:'compare_required_staffing',args:{changes:syntheticDeliveryChanges(body)}},final('The delivery target is three months; costs use the first year. Complete costs and readiness remain unknown.')]:fixedSteps(body),start=isolated.sandbox.__requests.length;
    isolated.sandbox.__forbidProvider=scenario;
    const reads=isolated.sandbox.__aggregateReads?.length??0;
    if(!scenario){isolated.sandbox.__replies.push(responseForStep(steps[0],0));if(body.catalog)isolated.sandbox.__replies.push(request=>responseForStep(typeof steps[1]==='function'?steps[1](request.input):steps[1],1));}
    const response=await isolated.post(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()})),reply=await response.json();
    assert.equal(response.status,200,JSON.stringify(reply));assert.equal(isolated.sandbox.__requests.length-start,scenario?0:body.catalog?2:1);
    if(scenario){assert.equal(isolated.sandbox.__aggregateReads?.length??0,reads);assert.ok(reply.answer.startsWith(staffingScenarioLabel));assert.deepEqual(reply.charts,[]);assert.deepEqual(reply.usage,{modelRounds:0,toolCalls:0});}
    else if(!body.catalog){assert.deepEqual(JSON.parse(JSON.stringify(isolated.sandbox.__requests[start].tool_choice)),{type:'function',name:'compare_required_staffing'});assert.deepEqual(JSON.parse(JSON.stringify(isolated.sandbox.__requests[start].tools.map(t=>t.name))),['compare_required_staffing']);assert.match(JSON.stringify(isolated.sandbox.__requests[start].input),/evidenceGrounding/);}
    if(reply.providerReceipt)assert.equal(reply.providerReceipt.modelAttempts,scenario?0:body.catalog?2:1);
    return route.fulfill({json:reply});
   }
   const runtime=fixtureRuntime(body.message.text===staffingDeliveryPrompt?[{name:'compare_required_staffing',args:{changes:syntheticDeliveryChanges(body)}},final('The delivery target is three months; costs use the first year. Complete costs and readiness remain unknown.')]:fixedSteps(body));runtime.natural={datasetToken:'legacy-v1:0'};
   return route.fulfill({json:await converseSolutions(body,runtime,new AbortController().signal)});
  }
  if(req.method()==='POST'){external++;return route.abort();}
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});external++;return route.abort();
 });
 await page.goto(base);if(fullUI)await dismissHomeOnboarding(page);const input=page.getByLabel('Ask Workforce AI',{exact:true});
 const send=async text=>{await input.fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.getByRole('status').filter({hasText:'Thinking through the question'}).waitFor({state:'hidden'});};
 const card=page.getByRole('region',{name:'Fixed-role staffing comparison',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await send(fullUI?liveStaffingMessage:fixedMessages.start);await card.waitFor();
 if(fullUI)check('actual Home UI selects the solution endpoint and renders checked cards',requests.length===1&&isolated.sandbox.__forbidProvider===true);
 if(fullUI)check('illustrative calculation keeps original source caveat visible before the cards',await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText(staffingScenarioLabel,{exact:true}).isVisible()&&await page.getByRole('figure').count()===0);
 check('three numeric options without a workload form',await card.getByRole('article').count()===3&&(await card.innerText()).includes('1,600,000 USD')&&(await card.innerText()).includes('30,000 USD')&&(await card.innerText()).includes('495,000 USD')&&await page.getByRole('region',{name:'Business planning assumptions',exact:true}).count()===0);
 check('training requirements and operational timing stay unknown',await card.getByRole('article',{name:'Train 0, redeploy 0, hire 10',exact:true}).innerText().then(t=>t.includes('Training: Not specified')&&t.includes('Timing: Unknown'))&&(await card.innerText()).includes('480 hours')&&(await card.innerText()).includes('240 hours'));
 check('each staffing option has six short bullets and one contextual refinement invitation',(await card.getByRole('article').all()).length===3&&await card.getByRole('article').first().getByRole('listitem').count()===6&&await card.getByText(/If you tell me whether internal staff can be released, readiness dates, backfill costs/).isVisible());
 check('one recommendation and optional details, no new input form',await card.getByText('Recommended',{exact:true}).count()===1&&await card.locator('details').count()===1&&await card.locator('form,input,select').count()===0&&await card.locator('details[open]').count()===0);
 await send(fixedMessages.followup);check('numeric follow-up retains the exact ten-role comparison',(await card.innerText()).includes('495,000 USD')&&requests.at(-1).state.requiredStaffing.inputs.requiredRoles===10);
 await send(fixedMessages.correction);check('per-trainee correction recalculates two internal options',(await card.innerText()).includes('42,000 USD')&&(await card.innerText()).includes('501,000 USD')&&(await card.innerText()).includes('240 hours'));
 await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();check('reload retains corrected values and unknown new-hire training',(await card.innerText()).includes('501,000 USD')&&(await card.innerText()).includes('Training: Not specified'));
 const stored=await state();check('comparison does not pin a goal or create a saved plan',!stored.goals.activeId&&stored.exploration.fields.homeSolutionConversationV1.working.length===0);
 await card.screenshot({path:path.join(output,mode+'.png')});
 check('responsive comparison has no overflow, runtime errors or external traffic',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0);
 if(!fullUI)await page.getByRole('button',{name:'Change workforce scope',exact:true}).click();await card.getByText('Assumptions & caveats',{exact:true}).click();await card.getByRole('button',{name:'Clear staffing comparison',exact:true}).click();
 check('clear removes only this comparison without a model request',await card.count()===0&&requests.length===3&&(await state()).exploration.fields.homeSolutionConversationV1.turns.length===6);
 if(fullUI){await page.evaluate(()=>localStorage.clear());await page.reload();await dismissHomeOnboarding(page);}
 await send(fullUI?liveStaffingMessage:fixedMessages.start);await card.waitFor();
 await card.getByRole('button',{name:'Pin Action Plan',exact:true}).click();await card.getByRole('button',{name:/Pinned Action Plan/}).waitFor();
 const pinnedState=await state(),goalId=pinnedState.goals.activeId,workspace=pinnedState.workspaces[goalId],catalog=workspace.fields.homePlanAlternativesV1;
 check('pin creates a real goal-linked plan without provider calls',!!goalId&&catalog.plans.length===1&&catalog.plans[0].draft.inputs.requiredStaffingPlan.review.inputs.months===12&&requests.length===4);
 await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();
 check('reload preserves pinned status and checked totals',await card.getByRole('button',{name:/Pinned Action Plan/}).isDisabled()&&(await card.innerText()).includes('30,000 USD'));
 await send(fixedMessages.followup);check('same checked option stays pinned after numerical follow-up',await card.getByRole('button',{name:/Pinned Action Plan/}).isDisabled()&&(await state()).workspaces[goalId].fields.homePlanAlternativesV1.plans.length===1);
 await card.screenshot({path:path.join(output,mode+'-pinned.png')});
 await page.evaluate(()=>localStorage.clear());await page.reload();if(fullUI)await dismissHomeOnboarding(page);await send(fullUI?liveStaffingMessage:fixedMessages.start);await card.waitFor();
 const targetState=await state(),targetConversation=targetState.exploration.fields.homeSolutionConversationV1,targetTurn={id:'delivery-target-fixture',role:'user',text:'Deliver within 3 months.'};
 targetConversation.turns.push(targetTurn);targetConversation.constraints=[{action:'set',field:'horizon_months',number:3,text:null,unit:'months',turnId:targetTurn.id}];targetConversation.requiredStaffing.basisTurns.push({id:targetTurn.id,text:targetTurn.text});
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DECISIONS_STORAGE_KEY,raw:encodeDecisions(targetState)});await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();
 check('three-month delivery target stays separate from twelve-month cost horizon',await card.innerText().then(t=>t.includes('Delivery target: 3 months')&&t.includes('Cost horizon: 12 months')));
 await card.getByRole('button',{name:'Pin Action Plan',exact:true}).click();await card.getByRole('button',{name:/Pinned Action Plan/}).waitFor();
 const aged=await state(),targetGoal=aged.goals.activeId,targetWorkspace=aged.workspaces[targetGoal],targetMemory=targetWorkspace.fields.homeSolutionConversationV1;
 targetMemory.turns=Array.from({length:32},(_,i)=>({id:'later-fixture-'+i,role:i%2?'assistant':'user',text:'Later discussion '+i}));
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DECISIONS_STORAGE_KEY,raw:encodeDecisions(aged)});await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();
 check('aging source chat out preserves display, pinned identity and exact saved delivery target',await card.getByRole('button',{name:/Pinned Action Plan/}).isDisabled()&&(await card.innerText()).includes('Delivery target: 3 months')&&targetWorkspace.fields.homePlanAlternativesV1.plans.length===1&&targetWorkspace.fields.homePlanAlternativesV1.plans[0].draft.inputs.requiredStaffingPlan.deliveryTarget.months===3);
 for(const field of ['hireReadyAfterMonths','trainingReadyAfterMonths','redeployReadyAfterMonths']){targetMemory.requiredStaffing.inputs[field]=6;targetMemory.requiredStaffing.origins[field]={kind:'model-proposed',turnId:null,quote:null,explanation:'Synthetic fixture assumes six-month readiness.'};}
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DECISIONS_STORAGE_KEY,raw:encodeDecisions(aged)});await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();
 check('known six-month readiness cannot be recommended or pinned for a three-month target',await card.getByText('Recommended',{exact:true}).count()===0&&await card.getByRole('button',{name:/Pin.*Action Plan/}).count()===0&&await card.getByText('Misses the 3-month delivery target.',{exact:true}).count()===3);
 await card.screenshot({path:path.join(output,mode+'-delivery-conflict.png')});
 // Keep the generic storage envelope valid while invalidating the saved plan result.
 const invalid=structuredClone(pinnedState);
 invalid.workspaces[goalId].fields.homePlanAlternativesV1.plans[0].result.issues=['Tampered saved result'];
 const invalidRaw=encodeDecisions(invalid),requestCount=requests.length;
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DECISIONS_STORAGE_KEY,raw:invalidRaw});await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();
 check('invalid saved catalog shows recovery feedback without crashing the valid staffing review',await card.getByRole('status').filter({hasText:'Saved plans could not be verified. They have been preserved.'}).isVisible()&&errors.length===0);
 check('invalid saved catalog blocks recommendation and pin without a request',await card.getByText('Recommended',{exact:true}).count()===0&&await card.getByRole('button',{name:/Pin.*Action Plan/}).count()===0&&requests.length===requestCount&&external===0);
 check('invalid saved catalog and valid staffing conversation remain unchanged in storage',await page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY)===invalidRaw);
 await card.screenshot({path:path.join(output,mode+'-invalid-catalog.png')});
 // Exact user prompt from UI evidence, with synthetic provider responses that omit constraints.
 await page.evaluate(()=>localStorage.clear());await page.reload();if(fullUI)await dismissHomeOnboarding(page);
 await send(staffingDeliveryPrompt);await card.waitFor();
 const delivered=await state(),memory=delivered.exploration.fields.homeSolutionConversationV1;
 check('explicit three-month deadline appears on all cards despite omitted provider constraints',await card.getByText('Delivery target: 3 months',{exact:true}).count()===3&&memory.constraints.length===0&&memory.staffingDeliveryTarget.quote===staffingDeliveryPrompt);
 check('first-year costs and partial labor remain separate from delivery target',await card.innerText().then(t=>t.includes('495,000 USD')&&t.includes('240 hours')&&t.includes('Cost horizon: 12 months'))&&memory.requiredStaffing.inputs.costsComplete===null&&memory.requiredStaffing.origins.redeploymentCostPerPerson.kind==='model-proposed');
 await card.getByRole('button',{name:'Pin Action Plan',exact:true}).click();await card.getByRole('button',{name:/Pinned Action Plan/}).waitFor();
 const savedDelivery=await state(),deliveryWorkspace=savedDelivery.workspaces[savedDelivery.goals.activeId],receipt=deliveryWorkspace.fields.homePlanAlternativesV1.plans[0].draft.inputs.requiredStaffingPlan;
 check('pin keeps exact delivery provenance and twelve-month cost basis',receipt.deliveryTarget.months===3&&receipt.deliveryTarget.quote===staffingDeliveryPrompt&&receipt.review.inputs.months===12);
 await page.reload();if(fullUI)await dismissHomeOnboarding(page);await card.waitFor();
 check('reload preserves deadline and pinned identity without another request',await card.getByRole('button',{name:/Pinned Action Plan/}).isDisabled()&&await card.getByText('Delivery target: 3 months',{exact:true}).count()===3&&errors.length===0&&external===0);
 await card.screenshot({path:path.join(output,mode+'-captured-deadline.png')});
 await context.close();
}}finally{await browser.close()}
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,output}));
