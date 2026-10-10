/** Full client app, intercepted HTTP fixture only; no server, model or database. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {solutionConversationField} from '../../lib/home-solution-conversation.ts';
import {planAlternativesField} from '../../lib/home-plan-alternatives.ts';
import {offlineBusinessRoute} from '../helpers/offline-business-route.mjs';
import {responseForStep} from '../fixtures/natural-business-planning.mjs';
import {productQuestion,turnoverQuestion,recommendationSteps,actionPlans,combinedPlan,fourthPlan,answeredOwnerPlan,refinementQuestions} from '../fixtures/action-plan-recommendations.mjs';
import {final,evaluate} from '../fixtures/home-solution-conversation.mjs';
import {homeStarterGroups} from '../../lib/contextual-prompts.ts';
import {homeDefinitions} from '../../lib/home-pack.mjs';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
const isolated=await offlineBusinessRoute();
const aggregateFixture=scopedDashboardResponse({overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}]},{country:'all',org:'all',level:'all'});
isolated.sandbox.__aggregateSources=Object.fromEntries(homeDefinitions.map(def=>[def[1],{status:'loaded',data:aggregateFixture}]));
isolated.sandbox.__aggregateReads=[];

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'home-action-plans-browser-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,
 plugins:[new webpackPackage.webpack.DefinePlugin({
  'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),
  'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('false'),
  'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false'),
 })],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),
 output:{path:output,filename:'fixture.js',publicPath:'/assets/'},
 resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},
 module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]},
});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const artifact=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; font-src data:"><style>${css.replaceAll('</style','<\\/style')}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
await fs.writeFile(path.join(output,'fixture.html'),artifact);
const base='http://127.0.0.1:3100',assertions=[],transport=[];
const check=(name,pass)=>{assert.ok(pass,name);assertions.push(name);console.log('PASS '+name);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:mode==='mobile',hasTouch:mode==='mobile'}),page=await context.newPage(),errors=[],blocked=[],requests=[];
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 const click=mode==='mobile'?'tap':'click';
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const working=data=>(data.goals.activeId?data.workspaces[data.goals.activeId]:data.exploration).fields[solutionConversationField];
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.href===base+'/'&&req.method()==='GET'&&req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:artifact});
  if(url.origin!==base||!url.pathname.startsWith('/api/')){blocked.push(req.url());return route.abort();}
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();requests.push(body);let steps;
   assert.equal(req.headers()['x-workforce-conversation'],undefined);
   if(body.message.text===productQuestion)steps=recommendationSteps('product',body);
   else if(body.message.text===turnoverQuestion)steps=recommendationSteps('turnover',body);
   else if(body.message.text==='Combine the pilot activities as a fourth proposal.'){const hybrid=fourthPlan('product',body);steps=[evaluate(hybrid),final('The additional pilot combination is ready for review.',[hybrid.id])];}
   else if(body.message.text==='The product owner can own the pilot review for the first plan. Keep its other activities.'){
    const edited=answeredOwnerPlan(body);steps=[evaluate(edited),{...final('The first plan now has a product owner for pilot review; scope is still unknown.',[edited.id]),questions:refinementQuestions('product').slice(0,1)}];
   }else if(body.message.text==='Develop an action plan'){
    const original=body.state.turns.find(turn=>turn.role==='user'&&turn.text===productQuestion),plans=actionPlans('product',{message:original});
    steps=[...plans.map(plan=>evaluate(plan)),final('The detailed product plans are ready to review.',plans.map(plan=>plan.id))];
   }else if(body.message.text==='Let us discuss the second proposed plan.')steps=[{...final('The second proposal is our discussion focus; nothing has been saved.'),focusCandidateId:body.state.working[1].id}];
   else if(body.message.text==='Combine the delivery activities from the first two proposed plans.'){
    const combined=combinedPlan(body);steps=[evaluate(combined),final('The combined delivery proposal is ready to review; overlap and costs remain unknown.',[combined.id])];
   }else if(body.message.text==='Keep the combined approach but use a product owner for the first activity.'){
    const source=body.state.working.at(-1),candidate=structuredClone(source.candidate);
    candidate.base={kind:'working',id:source.id,revision:source.revision};candidate.activities=candidate.activities.map((activity,index)=>({...activity,mode:index?'retain':'adapt',source:{kind:'working',id:source.id,revision:source.revision,activityId:activity.id},...(index?{}:{ownerRole:'Product owner'})}));
    steps=[evaluate(candidate),{...final('The revised combined proposal is ready to review.',[candidate.id]),questions:['Who can review resource overlap before implementation?']}];
   }else steps=[final('This ordinary question is answered directly without new proposals.')];
   isolated.sandbox.__replies.push(...steps.map(responseForStep));
   const response=await isolated.post(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()})),bytes=await response.text();
   assert.equal(response.status,200,bytes);assert.equal(isolated.sandbox.__replies.length,0);
   for(const sent of isolated.sandbox.__requests){assert.equal(JSON.parse(sent.input[0].content.split('\n').slice(1).join('\n')).evidenceGrounding.databaseIntegrityCertified,false);assert.equal(sent.model,'gpt-6.1-sol');assert.equal(sent.max_output_tokens,5000);assert.ok(sent.tools.some(tool=>tool.name==='evaluate_candidate'));assert.ok(!sent.tools.some(tool=>['evaluate_action_plans','read_workforce_planning_playbook'].includes(tool.name)));assert.match(sent.instructions,/lead with an actionable proposed Action Plan/);assert.match(sent.instructions,/Focus is optional/);assert.match(sent.instructions,/Missing population, dates, costs or capacity must remain unknown/);assert.match(sent.instructions,/Empty evidenceIds is correct when no supplied item supports an activity/);assert.match(sent.instructions,/invent no effect sizes, savings, available resources or approvals/);}
   return route.fulfill({status:200,contentType:'application/json',body:bytes});
  }
  assert.equal(req.method(),'GET');
  return route.fulfill({json:aggregateFixture});
 });
 const send=async(text,answer)=>{await chat.fill(text);await button('Send overview question')[click]();await page.getByText(answer,{exact:true}).filter({visible:true}).first().waitFor();};
 await page.goto(base+'/');await dismissHomeOnboarding(page);const original=await state(),demoGoals=JSON.stringify(original.goals);
 check(mode+' one starting point without the redundant business/example buttons',await page.getByRole('region',{name:'Strategic workforce planning journey'}).count()===0&&await button('Start with my business objective').count()===0&&await button('Explore the five-role example').count()===0&&await page.getByTestId('overview-starting-guide').isVisible());
 // Existing guide remains the entry, preserves the draft and does not auto-send.
 await chat.fill('Keep my unfinished question');await button('Show instructions')[click]();await button('Try a guided example')[click]();
 const guide=page.getByRole('dialog',{name:'Optional guided demo'});await guide.waitFor();await guide.getByRole('button',{name:'Next → Start example',exact:true})[click]();
 await page.waitForFunction(()=>document.querySelector('[aria-label="Ask Workforce AI"]')?.value.includes('an actionable proposed plan'));
 check(mode+' existing guide starts with real chat and no request',requests.length===0&&await guide.count()===1);
 await guide.getByRole('button',{name:'Exit guide',exact:true})[click]();await guide.waitFor({state:'detached'});
 check(mode+' exiting guide restores the draft and original saved demo goals',await chat.inputValue()==='Keep my unfinished question'&&JSON.stringify((await state()).goals)===demoGoals);
 await chat.fill('');await button('Show instructions')[click]();await button('Explore your data')[click]();
 await page.waitForFunction(()=>document.querySelector('[aria-label="Action Planning"]')?.getAttribute('aria-current')!=='page');
 if(mode==='mobile')await button('Open navigation')[click]();
 await button('Action Planning')[click]();await chat.waitFor();
 check(mode+' existing instructions data link and Home return preserve saved goals',JSON.stringify((await state()).goals)===demoGoals&&requests.length===0);
 const starter=homeStarterGroups.flatMap(group=>group.prompts)[0];await page.getByRole('group',{name:homeStarterGroups[0].label,exact:true}).locator('summary')[click]();await button(starter.label)[click]();await page.getByText('This ordinary question is answered directly without new proposals.',{exact:true}).filter({visible:true}).first().waitFor();
 check(mode+' prompt click sends once without mode or pin',requests.length===1&&requests[0].message.text===starter.prompt&&!requests[0].goal.id);
 await button('Reset conversation')[click]();
 for(const [kind,question] of [['turnover',turnoverQuestion],['product',productQuestion]]){
  if(kind==='product')await button('Reset conversation')[click]();
  await chat.fill(question);await button('Send overview question')[click]();await page.getByRole('article',{name:'Working proposal: '+(kind==='product'?'Hire after capacity review':'Improve manager check-ins'),exact:true}).waitFor();
  const expectedCount=3; // Scripted storage/interaction coverage, not a live-model guarantee.
  const s=await state(),plans=working(s).working,articles=page.getByRole('article',{name:/^Working proposal:/});
  check(mode+' '+kind+' renders summary and information then several plans, optional questions and investigations with no goal save',await articles.count()===expectedCount&&plans.length===expectedCount&&JSON.stringify(s.goals)===demoGoals&&!s.exploration.fields[planAlternativesField]&&working(s).turns.at(-1).text.startsWith('Summary: I recommend ')&&working(s).turns.at(-1).text.indexOf('Proposed Action Plan 3')<working(s).turns.at(-1).text.indexOf('Further reading and investigations:')&&working(s).turns.at(-1).text.indexOf('Further reading and investigations:')<working(s).turns.at(-1).text.indexOf('optionally focus'));
  check(mode+' '+kind+' cards retain steps owners timing intended outcomes and success measures',await articles.first().getByText('Suggested owner:',{exact:true}).count()===2&&await articles.first().getByText('Timing:',{exact:true}).count()===2&&await articles.first().getByText('Success measure:',{exact:true}).count()===1&&await articles.first().getByText('Intended outcome:',{exact:true}).count()===1);
  check(mode+' '+kind+' no assumed cash staffing or accepted operational outcome',plans.every(plan=>plan.result.cashEstimate.cash===null&&plan.result.uniqueParticipants===null&&plan.blocking.length===0)&&working(s).verifiedMetrics.length===0);
  const navigation=page.getByRole('navigation',{name:'Review proposed Action Plans'});const beforeReview=JSON.stringify(await state());
  await navigation.getByRole('button',{name:'Review 1: '+plans[0].candidate.name,exact:true})[click]();
  check(mode+' '+kind+' direct review links focus the actual card without saving',await navigation.getByRole('button').count()===expectedCount&&await articles.first().evaluate(node=>document.activeElement===node)&&JSON.stringify(await state())===beforeReview);
  const questions=page.getByRole('region',{name:'Further reading and investigation'});
  check(mode+' '+kind+' follow-up reading follows review cards without a duplicate optional-question box',working(s).turns.at(-1).text.indexOf('Proposed Action Plan '+expectedCount)<working(s).turns.at(-1).text.indexOf('Optional questions before choosing:')&&await page.getByRole('region',{name:'Optional questions before choosing a plan'}).count()===0&&await questions.evaluate(node=>Boolean(document.querySelector('[aria-label^="Working proposal:"]').compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING)));
  check(mode+' '+kind+' questions impose no form or selection lock',await questions.getByRole('textbox').count()===0&&await articles.first().getByRole('button',{name:'Pin Action Plan with unknowns',exact:true}).isEnabled());
  await page.screenshot({path:path.join(output,mode+'-'+kind+'-plans.png'),fullPage:true});
 }
 await send('Combine the pilot activities as a fourth proposal.','The additional pilot combination is ready for review.');
 check(mode+' a later individually checked hybrid preserves four current proposals',await page.locator('article[aria-label^="Working proposal:"]').count()===4);
 const beforeAnswer=working(await state());
 await send('The product owner can own the pilot review for the first plan. Keep its other activities.','The first plan now has a product owner for pilot review; scope is still unknown.');
 const afterAnswer=working(await state()),revised=afterAnswer.working.at(-1);
 check(mode+' partial answer revises its named plan without restating the objective or saving',revised.id===beforeAnswer.working[0].id&&revised.revision===2&&revised.candidate.goal.turnId===beforeAnswer.working[0].candidate.goal.turnId&&revised.draft.bundle.components[1].ownerRole==='Product owner'&&JSON.stringify(afterAnswer.working.slice(0,4))===JSON.stringify(beforeAnswer.working)&&JSON.stringify((await state()).goals)===demoGoals&&afterAnswer.questions.length===1);
 await send('Develop an action plan','The detailed product plans are ready to review.');
 check(mode+' explicit develop followup retains objective and creates new reviewable revisions',working(await state()).working.filter(item=>item.revision===2).length===3&&working(await state()).working.at(-1).candidate.goal.turnId===requests.find(body=>body.message.text===productQuestion).message.id);
 await send('Let us discuss the second proposed plan.','The second proposal is our discussion focus; nothing has been saved.');
 check(mode+' selecting a conversational focus does not save or attach',JSON.stringify((await state()).goals)===demoGoals&&!((await state()).exploration.fields[planAlternativesField]));
 await send('Combine the delivery activities from the first two proposed plans.','The combined delivery proposal is ready to review; overlap and costs remain unknown.');
 await send('Keep the combined approach but use a product owner for the first activity.','The revised combined proposal is ready to review.');
 let current=await state(),combined=working(current).working.at(-1);
 check(mode+' more than four current plans remain reviewable',await page.locator('article[aria-label^="Working proposal:"]').count()===5);
 check(mode+' combination and refinement preserve provenance and unknown overlap',combined.revision===2&&combined.draft.bundle.components[0].ownerRole==='Product owner'&&combined.draft.inputs.groupsDisjoint.value===null&&combined.result.cashEstimate.cash===null);
 const card=page.getByRole('article',{name:'Working proposal: Combined delivery pilot',exact:true});
 check(mode+' unanswered question still allows explicit choice',await card.getByRole('button',{name:'Pin Action Plan with unknowns',exact:true}).isEnabled()&&working(current).questions.length===1);
 await card.getByRole('button',{name:'Pin Action Plan with unknowns',exact:true})[click]();await card.getByRole('button',{name:'Pinned Action Plan #1',exact:true}).waitFor();
 current=await state();const fields=current.workspaces[current.goals.activeId].fields,catalog=fields[planAlternativesField];
 check(mode+' explicit reviewed choice links goal and proposal without applying operations',!!current.goals.activeId&&catalog.plans.length===1&&catalog.attachments.length===1&&!catalog.plans[0].applied&&catalog.plans[0].draft.binding.goal===current.goals.goals.find(goal=>goal.id===current.goals.activeId).statement);
 const savedBytes=JSON.stringify(catalog);await page.reload();await dismissHomeOnboarding(page);
 check(mode+' reload preserves selected proposal and demo goals',JSON.stringify((await state()).workspaces[current.goals.activeId].fields[planAlternativesField])===savedBytes&&original.goals.goals.every(goal=>(current.goals.goals.some(item=>item.id===goal.id&&item.statement===goal.statement))));
 await send('What does FTE mean?','This ordinary question is answered directly without new proposals.');
 check(mode+' unrelated question preserves exact saved plan',JSON.stringify((await state()).workspaces[current.goals.activeId].fields[planAlternativesField])===savedBytes);
 const oldExamples=original.goals.goals.map(goal=>[goal.id,original.workspaces[goal.id].fields]);
 check(mode+' existing demo plan data remains byte-identical',oldExamples.every(([id,fields])=>JSON.stringify(current.workspaces[id].fields)===JSON.stringify(fields)));
 const capacityGoal=original.goals.goals.find(goal=>goal.statement==='Add 5 roles over 12 months');
 await page.getByRole('complementary',{name:'Pinned Action Plans'}).getByRole('button').filter({hasText:'Goal: '+capacityGoal.statement})[click]();await page.getByRole('region',{name:'Action Plans for your goal',exact:true}).waitFor();
 check(mode+' existing five-role demo still opens through Pinned Action Plans without a model request',(await state()).goals.activeId===capacityGoal.id&&requests.length===10&&await page.getByRole('region',{name:'Action Plans for your goal',exact:true}).getByText('Demo example',{exact:true}).isVisible());
 check(mode+' no overflow or browser errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&blocked.length===0);
 transport.push({mode,requests:requests.length,errors,blocked});await context.close();
}}catch(error){for(const context of browser.contexts())for(const page of context.pages()){await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});}console.error(JSON.stringify({output,transport}));throw error;}finally{await browser.close();}
await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),artifactSha256:createHash('sha256').update(artifact).digest('hex'),checks:assertions.length,assertions,transport,actualRootPage:true,actualPOST:true,clientRequestsUnmodified:true,modelResponses:'synthetic fixtures; not independent semantic acceptance',providerCalls:0,databaseCalls:0,realAggregateVerifier:true,aggregateFixtureReads:isolated.sandbox.__aggregateReads.length},null,2));
console.log(JSON.stringify({checks:assertions.length,output}));
