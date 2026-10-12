/** Real enabled app/composer/hook and service; aggregate and model I/O are offline fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
import {buildFinanceCurrent} from '../../lib/finance-current.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {fixedChanges} from '../fixtures/required-staffing.mjs';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {fixtureRuntime,final} from '../fixtures/home-solution-conversation.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'home-retry-relevance-'));
const fixtureRoot=process.cwd();
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.join(fixtureRoot,'tests/fixtures/swp-editor-full-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':fixtureRoot}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const common=scopedDashboardResponse({overview:{headcount:60,fte:48,open_positions:12,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:60,fte:48}],filter_options:{countries:[],business_units:[],levels:[]}},{country:'all',org:'all',level:'all'});
const finance={as_of:'2026-09-30',...buildFinanceCurrent(['Accounting','Consulting','Corporate','Data & AI','Engineering','Operations'].map((org_name,index)=>({org_code:'BU-'+index,org_name,org_type:'business_unit',headcount:10,fte:8,labor_cost_usd:800000,cost_per_fte_usd:100000,vacant_positions:2,estimated_vacancy_cost_exposure_usd:150000})))};


const base='http://127.0.0.1:3100',browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),checks=[],failures=[];
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,844]])for(const scenario of ['starter','starter-new-draft','starter-cancel','calculators','goal-switch']){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),requests=[],errors=[];let fail=scenario!=='calculators',hold=false,release,heldStarted,blocked=0;
 const check=(name,value)=>{assert.ok(value,mode+' '+name);checks.push(mode+' '+name);console.log('PASS',mode,name);};page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const chat=input=>({messages:[],input,problem:null,questionUnanswered:false,resetMarks:{}}),seed={version:1,revision:1,goals:{version:1,activeId:scenario==='goal-switch'?'goal-a':'',goals:[{id:'goal-a',statement:'Goal A hiring'},{id:'goal-b',statement:'Goal B finance'}]},workspaces:{'goal-a':{savedAt:'2026-10-12',fields:{chat:chat('')}},'goal-b':{savedAt:'2026-10-12',fields:{chat:chat('Goal B draft')}}}};
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base){blocked++;return route.abort();}if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
 if(url.pathname==='/api/home-solution-conversation'){
 const body=req.postDataJSON();requests.push(body);if(hold){hold=false;await new Promise(resolve=>{release=resolve;heldStarted();});}
 if(fail){try{return await route.fulfill({status:422,json:{error:'The conversation could not be verified.',code:'response_validation_failed'}});}catch{return;}}
 let steps=[final('Finance response: cost period remains unknown.')];
 if(body.message.text==='Review ten engineers with explicit fictional costs.'){
 const basis={kind:'user-supplied',turnId:body.message.id,quote:body.message.text,explanation:'Offline fixture inputs.'};
 steps=[{name:'review_hiring_budget',args:{changes:Object.entries({role:'engineers',hires:10,budget:1000000,currency:'USD',startMonth:'2027-01',months:12,arrivalDate:'2027-01-01',ftePerHire:1,annualBasePay:120000,payBasis:'per_hire',annualAdditionalCostPerHire:24000,recruitingFeePerHire:10000}).map(([field,value])=>({field,value,basis}))}},input=>({...final(),answer:{findings:'Ten external hires exceed the cap.',decisionRationale:'Review the inputs before commitment.',caveats:['Full costs remain unknown.'],recommendedPlan:{name:'Review hiring',steps:['Review costs with Finance.'],calculationRefs:[JSON.parse(input.findLast(x=>x.type==='function_call_output').output).planningGuidance.binding.reference]}}})];}
 if(body.message.text==='Compare staffing routes for the ten required engineering roles.')steps=[{name:'compare_required_staffing',args:{changes:fixedChanges(body)}},final('Review the staffing comparison.')];
 const runtime=fixtureRuntime(steps);runtime.natural={datasetToken:'legacy-v1:0'};try{return await route.fulfill({json:await converseSolutions(body,runtime,new AbortController().signal)});}catch(error){if(!req.failure())throw error;return;}
 }if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/finance'?finance:common});blocked++;return route.abort();});
 try{await page.goto(base);await dismissHomeOnboarding(page);const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=page.getByRole('button',{name:'Send overview question',exact:true}),cancel=page.getByRole('button',{name:'Cancel request',exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY),slot=data=>data.goals.activeId?data.workspaces[data.goals.activeId]:data.exploration;
 const submit=async text=>{await input.fill(text);const response=page.waitForResponse(r=>r.url().endsWith('/api/home-solution-conversation'),{timeout:15000});await send.click();await response;await cancel.waitFor({state:'hidden'});};
 const beginHeld=async action=>{hold=true;const held=new Promise(resolve=>{heldStarted=resolve;});await action();await Promise.race([held,new Promise((_,reject)=>setTimeout(()=>reject(Error('Held request did not start')),15000))]);await cancel.waitFor();};
 if(scenario==='starter'){
 const prompt='What workforce issues should we tackle first?';await page.getByText('Discovery',{exact:true}).click();const starter=page.getByRole('button',{name:prompt,exact:true});const response=page.waitForResponse(r=>r.url().endsWith('/api/home-solution-conversation'),{timeout:15000});await starter.click();await response;await cancel.waitFor({state:'hidden'});
 check('failed clicked starter restores exact editable question',await input.inputValue()===prompt);
 check('failed question is visible once in current thread',await page.getByRole('region',{name:'Overview conversation',exact:true}).locator('[data-chat-role="user"]').filter({hasText:prompt}).count()===1);
 check('failed starter never enters accepted server state',(slot(await state()).fields.homeSolutionConversationV1?.turns??[]).length===0);
 fail=false;await submit(prompt);check('retry sends only one further request',requests.length===2);let current=slot(await state());check('retry does not duplicate UI or accepted turns',current.fields.chat.messages.filter(m=>m.role==='user'&&m.content===prompt).length===1&&current.fields.homeSolutionConversationV1.turns.filter(t=>t.role==='user').length===1);check('successful retry clears only its own draft',await input.inputValue()==='');
 const acceptedAfterRetry=JSON.stringify(current.fields.homeSolutionConversationV1);fail=true;await submit('Typed question that fails.');check('typed failure preserves editable draft',await input.inputValue()==='Typed question that fails.');check('typed failure preserves accepted state',JSON.stringify(slot(await state()).fields.homeSolutionConversationV1)===acceptedAfterRetry);
 fail=false;await submit('Typed question that fails.');check('typed retry sends once without duplicate turns',requests.length===4&&slot(await state()).fields.chat.messages.filter(m=>m.role==='user'&&m.content==='Typed question that fails.').length===1&&slot(await state()).fields.homeSolutionConversationV1.turns.filter(t=>t.role==='user').length===2);
 }else if(scenario==='starter-new-draft'||scenario==='starter-cancel'){
 const prompt='What workforce issues should we tackle first?';await page.getByText('Discovery',{exact:true}).click();
 await beginHeld(()=>page.getByRole('button',{name:prompt,exact:true}).click());check('pending starter is already visible',await page.getByRole('region',{name:'Overview conversation',exact:true}).locator('[data-chat-role="user"]').filter({hasText:prompt}).isVisible());
 if(scenario==='starter-new-draft'){await input.fill('Newer user draft');release();await cancel.waitFor({state:'hidden'});check('failed starter never overwrites newer typing',await input.inputValue()==='Newer user draft');}
 else{await cancel.click();release();check('cancelled starter retains exact retry text',await input.inputValue()===prompt);check('cancellation does not mutate accepted state',(slot(await state()).fields.homeSolutionConversationV1?.turns??[]).length===0);fail=false;await submit(prompt);check('cancelled starter retries once without duplicate turns',requests.length===2&&slot(await state()).fields.chat.messages.filter(m=>m.role==='user'&&m.content===prompt).length===1&&slot(await state()).fields.homeSolutionConversationV1.turns.filter(t=>t.role==='user').length===1);}
 }else if(scenario==='goal-switch'){
 await input.fill('Pending question in goal A.');await beginHeld(()=>send.click());await page.getByText('Earlier saved goals and drafts',{exact:true}).click();await page.getByRole('button',{name:'Goal B finance',exact:true}).click();await input.fill('New typing in goal B');release();await cancel.waitFor({state:'hidden'});
 check('late failed goal A request cannot overwrite goal B draft',await input.inputValue()==='New typing in goal B');let data=await state();check('goal switch retains failed question only in originating UI history',data.goals.activeId==='goal-b'&&data.workspaces['goal-a'].fields.chat.messages.some(m=>m.content==='Pending question in goal A.')&&!data.workspaces['goal-b'].fields.chat.messages.some(m=>m.content==='Pending question in goal A.'));
 await page.getByRole('button',{name:'Goal A hiring',exact:true}).click();check('return to originating goal restores editable retry',await input.inputValue()==='Pending question in goal A.');fail=false;await submit('Pending question in goal A.');check('goal-switch retry creates one accepted user turn',slot(await state()).fields.homeSolutionConversationV1.turns.filter(t=>t.role==='user').length===1);
 }else{
 await submit('Review ten engineers with explicit fictional costs.');const card=page.getByRole('region',{name:'Hiring budget estimate',exact:true});await card.waitFor();await card.getByText('Edit inputs and salary override',{exact:true}).click();const rate=card.getByLabel('Annual base pay override',{exact:true});await rate.fill('130000');await rate.evaluate(node=>{window.__retainedHiringEditor=node;});
 await submit('Compare staffing routes for the ten required engineering roles.');const staffing=page.getByRole('region',{name:'Fixed-role staffing comparison',exact:true});await staffing.waitFor();
 await submit('What is the current Finance cost period?');check('unrelated Finance answer has no stale hiring or staffing cards',!await card.isVisible()&&!await staffing.isVisible());const native=slot(await state()).fields.homeSolutionConversationV1;check('both native calculations remain saved',native.hiringBudget.inputs.hires===10&&native.requiredStaffing.inputs.requiredRoles===10);
 await page.getByText('Earlier hiring calculation',{exact:true}).click();check('intentional earlier access preserves mounted dirty editor',await rate.inputValue()==='130000'&&await rate.evaluate(node=>node===window.__retainedHiringEditor));await card.getByRole('button',{name:'Update estimate',exact:true}).click();check('retained editor updates locally without another request',requests.length===3&&slot(await state()).fields.homeSolutionConversationV1.hiringBudget.inputs.annualBasePay===130000);
 await page.getByText('Earlier staffing calculation',{exact:true}).click();check('intentional earlier staffing access preserves ten required roles',(await staffing.innerText()).includes('10 required people'));
 await staffing.getByRole('button',{name:'Clear staffing comparison',exact:true}).click();await page.reload();await input.waitFor();await page.getByText('Earlier hiring calculation',{exact:true}).click();check('reload retains earlier edited hiring input',slot(await state()).fields.homeSolutionConversationV1.hiringBudget.inputs.annualBasePay===130000);check('clearing one retained calculation preserves the other',!slot(await state()).fields.homeSolutionConversationV1.requiredStaffing&&!!slot(await state()).fields.homeSolutionConversationV1.hiringBudget);
 }
 check(scenario+' has no external traffic or browser errors',blocked===0&&errors.length===0);check(scenario+' has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }catch(error){failures.push({mode,scenario,error:error.message});await fs.writeFile(path.join(output,mode+'-'+scenario+'-failure.txt'),await page.locator('body').innerText());}finally{release?.();await context.close();}
}}finally{await browser.close();}
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks,failures},null,2));console.log(JSON.stringify({checks,failures,output},null,2));assert.equal(failures.length,0);
