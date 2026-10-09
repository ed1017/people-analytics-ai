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
import {SWP_DEMAND_MODE,illustrativeServiceReview} from '../../lib/swp-demand.ts';
import {swpDemandBridgeField} from '../../lib/swp-demo.ts';
import {demandReferenceId} from '../../lib/swp-demand-reference.ts';
import {solutionPlanningInstructions} from '../../lib/home-solution-planning.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {fixtureRuntime,final} from '../fixtures/home-solution-conversation.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'swp-editor-full-client-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,
 plugins:[new webpackPackage.webpack.DefinePlugin({
  'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),
  'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),
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
try{for(const [mode,width,height] of [['desktop',1280,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:mode==='mobile',hasTouch:mode==='mobile'}),page=await context.newPage(),errors=[],blocked=[],requests=[],api=[];
 page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));
 transport.push({mode,errors,blocked,interceptedApi:api});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.href===base+'/'&&req.method()==='GET'&&req.resourceType()==='document'&&req.isNavigationRequest()&&req.frame()===page.mainFrame())return route.fulfill({contentType:'text/html',body:artifact});
  if(url.origin!==base||!url.pathname.startsWith('/api/')){blocked.push(req.url());return route.abort();}
  api.push(url.pathname);
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON(),c=body.goalContext?.scenarioReview;requests.push(body);let steps;const guidance=solutionPlanningInstructions(body,c?.conversationMode===SWP_DEMAND_MODE?c:null);if(c?.conversationMode===SWP_DEMAND_MODE)assert.match(guidance,/Lead with a useful grounded or clearly conditional recommendation/);
   if(c?.conversationMode===SWP_DEMAND_MODE&&!c.demandProposal){
    assert.equal(req.headers()['x-workforce-conversation'],SWP_DEMAND_MODE);
    const spec=illustrativeServiceReview(c,'2026-10-08T12:00:00Z').spec;
    spec.objective=body.message.text;spec.objectiveTurnId=body.message.id;
    for(const value of Object.values(spec)){if(value?.kind==='illustrative')value.kind='model-proposed';if(value?.basis?.kind==='illustrative')value.basis.kind='model-proposed';}
    steps=[{name:'review_scoped_service_demand',args:{spec}},final('Proposed assumptions for a client-operations slice. Edit or correct these unverified inputs.')];
   }else if(c?.conversationMode===SWP_DEMAND_MODE){
    assert.equal(body.planningCalculatorAvailable,true);assert.match(guidance,/UI supplies the optional popup control/);
    assert.equal(body.message.text,'Make that ten months');
    const basis={kind:'user-supplied',turnId:body.message.id,quote:body.message.text,explanation:'Synthetic current-turn correction, not observed model behavior.'};
    steps=[{name:'revise_scoped_service_demand',args:{edit:{reviewRef:demandReferenceId(body.requestId,0),changes:[{field:'months',quantity:null,number:10,text:null,basis}]}}},final('Revised to ten months; other inputs retain their exact provenance.')];
   }else{
    assert(c?.acceptedOperationalReview);
    steps=[final('The saved operating inputs are scenario assumptions, not verified availability.')];
   }
   const runtime=fixtureRuntime(steps);if(c.conversationMode===SWP_DEMAND_MODE)runtime.demand={datasetToken:'legacy-v1:0',referenceContract:true};
   return route.fulfill({json:await converseSolutions(body,runtime,new AbortController().signal)});
  }
  return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}]}});
 });
 const button=n=>page.getByRole('button',{name:n,exact:true}),journey=page.getByRole('region',{name:'Strategic workforce planning journey'}),editor=()=>page.getByRole('region',{name:'Planning Calculator inputs'});
 const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{await page.getByLabel('Ask Workforce AI',{exact:true}).fill(text);await button('Send overview question').click();};
 await page.goto(base+'/');await dismissHomeOnboarding(page);
 await button('Start with my business objective').click();
 await send('Could our teams cover two new managed-services contracts?');
 await journey.getByRole('heading',{name:'Using proposed assumptions'}).waitFor();
 check(mode+' natural proposal has no automatic editor or saved goal',await editor().count()===0&&!(await state()).goals.activeId);
 check(mode+' initial review request cannot advertise a calculator before an owner review exists',requests.at(-1).planningCalculatorAvailable!==true);
 const currentReviewText=await journey.getByRole('region',{name:'Review business demand assumptions'}).innerText();
 await button('Open Planning Calculator').click();await editor().getByLabel('Planning months',{exact:true}).fill('7');
 await button('Open Planning Calculator').evaluate(el=>el.click());
 check(mode+' repeated popup click preserves one draft',await page.locator('dialog[open]').count()===1&&await editor().getByLabel('Planning months',{exact:true}).inputValue()==='7');
 await button('Cancel input edits').click();
 check(mode+' cancel returns focus to its caller',await button('Open Planning Calculator').evaluate(el=>el===document.activeElement));
 check(mode+' popup cancel returns to unchanged current review',await journey.getByRole('region',{name:'Review business demand assumptions'}).innerText()===currentReviewText);
 await send('Make that ten months');await page.getByText('Revised to ten months; other inputs retain their exact provenance.',{exact:true}).filter({visible:true}).first().waitFor();
 await button('Open Planning Calculator').click();
 check(mode+' chat edit feeds the same popup review owner',await editor().getByLabel('Planning months',{exact:true}).inputValue()==='10');
 await page.keyboard.press('Escape');
 const calls=requests.length;
 await send('Open the assumption editor');await editor().waitFor();
 await editor().getByLabel('Planning months',{exact:true}).fill('9');
 await editor().getByLabel('Existing roles',{exact:true}).fill('4');
 await editor().getByLabel('Uncommitted availability (%)',{exact:true}).fill('25');
 await button('Review planning inputs').click();await editor().waitFor({state:'detached'});
 check(mode+' editing uses local calculator and requires acceptance',requests.length===calls&&await button('Use your assumptions for now').isEnabled()&&await journey.getByText(/Gap: 4,800 hours/).count()===1);
 await button('Use your assumptions for now').click();await journey.getByRole('figure').waitFor();
 check(mode+' reviewed reference is the one feasible choice',await journey.getByRole('radio').count()===1&&await journey.getByRole('radio').first().isEnabled());
 check(mode+' review and acceptance do not save a goal',!(await state()).goals.activeId);
 await journey.getByRole('radio').first().check();await button('Review selected Action Plan').click();
 await button('Save reviewed plan and goal').waitFor();
 await button('Save reviewed plan and goal').click();await button('Continue reviewed business assumptions').waitFor();
 const saved=await state(),id=saved.goals.activeId,bridge=saved.workspaces[id].fields[swpDemandBridgeField];
 check(mode+' explicit reference save commits plan and goal',!!id&&saved.goals.goals.some(g=>g.id===id)&&!!bridge);
 check(mode+' edited inputs and unchanged provenance persist',bridge.review.spec.months===9&&bridge.review.spec.existingRoles.value===4&&bridge.review.spec.availabilityPct.value===25&&bridge.review.spec.monthsBasis.kind==='user-supplied'&&bridge.review.spec.existingRoles.basis.kind==='user-supplied'&&bridge.review.spec.availabilityPct.basis.kind==='user-supplied'&&bridge.review.spec.contracts.basis.kind==='model-proposed'&&bridge.review.spec.startBasis.kind==='model-proposed');
 await journey.getByText('Saved goal progress and plan link',{exact:true}).click();
 const progress=journey.getByRole('region',{name:'Goal progress',exact:true});
 check(mode+' saved summary links the plan without inventing measurements',await progress.innerText().then(text=>text.includes('Not yet measured')&&text.includes('Action Plan #1')&&text.includes('Execution status')&&text.includes('Not recorded')));
 await journey.getByText('Saved goal progress and plan link',{exact:true}).click();
 const savedFields=JSON.stringify(saved.workspaces[id].fields),savedGoals=JSON.stringify(saved.goals);
 await page.reload();await dismissHomeOnboarding(page);await button('Continue reviewed business assumptions').waitFor();
 check(mode+' full client reload restores exact goal and workspace fields',JSON.stringify((await state()).goals)===savedGoals&&JSON.stringify((await state()).workspaces[id].fields)===savedFields);
 await button('Compare these demo assumptions').click();await journey.getByRole('figure').waitFor();
 await send('What is still unproven?');
 await page.getByText('The saved operating inputs are scenario assumptions, not verified availability.',{exact:true}).filter({visible:true}).first().waitFor();
 const accepted=requests.at(-1).goalContext.scenarioReview;
 check(mode+' restored conversation context carries accepted edited inputs',accepted.acceptedOperationalReview.spec.months===9&&accepted.acceptedOperationalReview.spec.existingRoles.value===4&&accepted.acceptedOperationalReview.spec.availabilityPct.value===25&&accepted.options.every(o=>o.wholePeriodEffort));
 const savedArtifacts=fields=>JSON.stringify(Object.fromEntries(['swpDemandBridgeV1','swpDemoReviewV1','homePlanAlternativesV1','goalProgressV1'].map(key=>[key,fields[key]])));
 check(mode+' continued discussion preserves saved plan and measured-progress records',savedArtifacts((await state()).workspaces[id].fields)===savedArtifacts(saved.workspaces[id].fields));
 await button('Continue reviewed business assumptions').click();await send('Open the editor');await editor().waitFor();
 check(mode+' reopened editor uses saved edited values',await editor().getByLabel('Planning months',{exact:true}).inputValue()==='9'&&await editor().getByLabel('Existing roles',{exact:true}).inputValue()==='4');
 await editor().getByLabel('Planning months',{exact:true}).fill('8');await button('Cancel input edits').click();
 check(mode+' cancelling a reopened draft preserves saved plan and review',savedArtifacts((await state()).workspaces[id].fields)===savedArtifacts(saved.workspaces[id].fields));
 await send('Open the editor');await editor().getByLabel('Planning months',{exact:true}).fill('8');
 await button('Reset conversation').evaluate(el=>el.click());await editor().waitFor({state:'detached'});
 check(mode+' actual Home reset invalidates editor and preserves saved plan',savedArtifacts((await state()).workspaces[id].fields)===savedArtifacts(saved.workspaces[id].fields));
 await page.screenshot({path:path.join(output,mode+'-after-reset.png'),fullPage:true});
 check(mode+' full client layout stays within viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(mode+' no browser exception or unexpected external request',errors.length===0&&blocked.length===0);
 transport.at(-1).conversationFixtureCalls=requests.length;
 await context.close();
}}catch(error){for(const context of browser.contexts())for(const page of context.pages()){
 await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});
 await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
}console.error(JSON.stringify({output,transport}));throw error;}finally{await browser.close();}
await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({
 sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),
 artifactSha256:createHash('sha256').update(artifact).digest('hex'),
 checks:assertions.length,assertions,transport,mode:'full-client-app-intercepted-http',
 actualRootPage:true,actualDatasetBoundary:true,actualDecisionStore:true,
 serverRenderingTest:false,deploymentTest:false,httpServerStarted:false,modelCalls:0,databaseCalls:0,
},null,2));
console.log(JSON.stringify({checks:assertions.length,output}));
