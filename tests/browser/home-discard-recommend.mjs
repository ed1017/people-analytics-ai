/** Exact discard/recommend cycles, real client and POST, synthetic evidence/provider only. */
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
import {solutionConversationField,currentSolutionProposals,readSolutionRequest,evaluateSolutionCandidate} from '../../lib/home-solution-conversation.ts';
import {planAlternativesField} from '../../lib/home-plan-alternatives.ts';
import {offlineBusinessRoute} from '../helpers/offline-business-route.mjs';
import {responseForStep} from '../fixtures/natural-business-planning.mjs';
import {final,evaluate,candidate} from '../fixtures/home-solution-conversation.mjs';
import {homeDefinitions} from '../../lib/home-pack.mjs';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
const isolated=await offlineBusinessRoute();
const aggregateFixture=scopedDashboardResponse({overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:100,fte:100}]},{country:'all',org:'all',level:'all'});
aggregateFixture.summary={headcount:100,fte:100};aggregateFixture.as_of='2026-09-30';
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
const base='http://127.0.0.1:3100',assertions=[];
const check=(name,pass)=>{assert.ok(pass,name);assertions.push(name);console.log('PASS '+name);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});

const logs=[],requests=[],outcomes=[],errors=[],blocked=[];
isolated.sandbox.console={info:(...args)=>logs.push(args),error:(...args)=>logs.push(args)};
let fault=false,originalGoal,originalEvidence;
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();
page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
const chat=page.getByLabel('Ask Workforce AI',{exact:true}),button=name=>page.getByRole('button',{name,exact:true});
const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
const working=data=>data.exploration.fields[solutionConversationField];
try{
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.href===base+'/'&&req.method()==='GET'&&req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:artifact});
  if(url.origin!==base||!url.pathname.startsWith('/api/')){blocked.push(req.url());return route.abort();}
  if(url.pathname!=='/api/home-solution-conversation'){assert.equal(req.method(),'GET');return route.fulfill({json:aggregateFixture});}
  const body=req.postDataJSON(),n=requests.length+1;requests.push(body);logs.length=0;isolated.sandbox.__requests.length=0;
  const read=readSolutionRequest(body);originalGoal??={statement:'Reduce turnover',turnId:body.message.id};originalEvidence??=JSON.stringify(body.evidence);
  assert.equal(JSON.stringify(body.evidence),originalEvidence,'Discard must not rewrite the valid evidence packet');
  assert.equal(body.evidence.sources.find(source=>source.id==='W2').status,'loaded','The workforce reader must be exercised');
  assert.equal(body.catalog,null);assert.equal(body.goal.id,'');assert.equal(body.state.rejected.length,Math.min(n-1,2));
  if(n>1){assert.deepEqual(body.state.working[0].candidate.goal,originalGoal);assert.ok(body.state.turns.some(turn=>turn.id===originalGoal.turnId));}
  if(fault)isolated.sandbox.__aggregateFailure={reader:'workforce',status:500};
  else{
   delete isolated.sandbox.__aggregateFailure;
   if(body.state.rejected.length){
    const old=body.state.rejected[0],invalid=candidate('invalid-old-source');invalid.goal=originalGoal;invalid.base={kind:'working',id:old.candidateId,revision:old.revision};
    const rejected=await evaluateSolutionCandidate(read,invalid,read.state.constraints);assert.ok(rejected.blocking.some(line=>/stale or rejected/.test(line)),'Explicit reuse of a discarded revision must stay blocked');
   }
   const c=candidate('pilot-'+n);c.name='Fictional plan '+n;c.goal=originalGoal;
   isolated.sandbox.__replies.push(...[evaluate(c),final('Fictional recommendation '+n+' is ready for review; not saved.',[c.id])].map(responseForStep));
  }
  const response=await isolated.post(new Request(base+url.pathname,{method:'POST',headers:req.headers(),body:JSON.stringify(body)})),reply=await response.json();
  outcomes.push({status:response.status,code:reply.code??null,attempts:isolated.sandbox.__requests.length,diagnostic:logs.at(-1)?.[1]});
  if(fault){assert.equal(response.status,503);assert.equal(reply.code,'evidence_reader_failed');assert.equal(isolated.sandbox.__requests.length,0);assert.equal(logs.at(-1)[1].grounding.httpStatus,500);}
  else{assert.equal(response.status,200);const current=currentSolutionProposals(reply.state);assert.equal(current.length,1);assert.equal(current[0].id,'pilot-'+n);assert.deepEqual(current[0].sourceRefs,[]);assert.deepEqual(current[0].blocking,[]);}
  return route.fulfill({status:response.status,json:reply});
 });
 await page.goto(base+'/');await dismissHomeOnboarding(page);const goalsBefore=JSON.stringify((await state()).goals);
 const send=async(text,n)=>{await chat.fill(text);await button('Send overview question').click();await page.getByText('Fictional recommendation '+n+' is ready for review; not saved.',{exact:true}).filter({visible:true}).first().waitFor();};
 await send('I want to reduce turnover. Recommend me a plan.',1);
 for(let cycle=1;cycle<=2;cycle++){
  const card=page.getByRole('article',{name:'Working proposal: Fictional plan '+cycle,exact:true}),before=working(await state());
  await card.getByRole('button',{name:'Discard proposal',exact:true}).click();await card.waitFor({state:'detached'});
  const discarded=working(await state());
  check('cycle '+cycle+' removes current proposal while preserving history and goal',currentSolutionProposals(discarded).length===0&&discarded.working.length===before.working.length&&JSON.stringify(discarded.working)===JSON.stringify(before.working)&&discarded.rejected.length===cycle&&discarded.focusCandidateId===null&&discarded.turns.some(turn=>turn.id===originalGoal.turnId));
  await send('recommend me a plan',cycle+1);
  const renewed=working(await state()),current=currentSolutionProposals(renewed);
  check('cycle '+cycle+' fresh proposal remains reviewable without stale source references',current.length===1&&current[0].id==='pilot-'+(cycle+1)&&current[0].revision===1&&current[0].sourceRefs.length===0&&current[0].blocking.length===0&&renewed.rejected.length===cycle);
  check('cycle '+cycle+' retains goal context and avoids automatic save',JSON.stringify(current[0].candidate.goal)===JSON.stringify(originalGoal)&&JSON.stringify((await state()).goals)===goalsBefore&&!(await state()).exploration.fields[planAlternativesField]);
 }
 const beforeFailure=JSON.stringify(working(await state()));fault=true;
 await chat.fill('recommend me a plan');await button('Send overview question').click();
 await page.getByText('Current database evidence is unavailable or changed. Refresh Home before continuing.',{exact:true}).filter({visible:true}).first().waitFor();
 check('reader HTTP 500 reproduces the exact screenshot error before any model attempt',outcomes.at(-1).status===503&&outcomes.at(-1).code==='evidence_reader_failed'&&outcomes.at(-1).attempts===0);
 check('failed request preserves conversation, rejected revisions and the last valid card',JSON.stringify(working(await state()))===beforeFailure&&await page.getByRole('article',{name:'Working proposal: Fictional plan 3',exact:true}).isVisible());
 check('prior completed answer remains visible below which the new error is shown',await page.getByText('Fictional recommendation 3 is ready for review; not saved.',{exact:true}).filter({visible:true}).first().isVisible());
 check('failed question stays in the composer without an automatic retry',await chat.inputValue()==='recommend me a plan'&&requests.length===4);
 await page.reload();await dismissHomeOnboarding(page);
 check('reload preserves the original goal and rejected/current revision history',JSON.stringify(working(await state()))===beforeFailure&&JSON.stringify((await state()).goals)===goalsBefore);
 check('no unexpected network or browser errors',blocked.length===0&&errors.length===0);
 await page.screenshot({path:path.join(output,'discard-recommend-reloaded.png'),fullPage:true});
 await fs.writeFile(path.join(output,'discard-recommend-receipt.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:assertions.length,assertions,outcomes,providerCalls:0,databaseCalls:0,syntheticApplicationPosts:requests.length,artifactSha256:createHash('sha256').update(artifact).digest('hex'),scope:'Real browser client and POST; synthetic reader/provider seams. Not live model or authentication validation.'},null,2));
 console.log(JSON.stringify({checks:assertions.length,output}));
}catch(error){await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText()).catch(()=>{});console.error(JSON.stringify({output,outcomes}));throw error;}finally{await browser.close();}
