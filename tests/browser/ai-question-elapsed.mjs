// Real application, held synthetic requests and a deterministic browser clock.
// No source/model requests leave the browser. Run with PLAYWRIGHT_MODULE if needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'ai-question-elapsed-'));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label);};
try{for(const solution of [true,false]){
 const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify(String(solution)),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/elapsed-waiting-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
 await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
 const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
 for(const width of [1366,390]){
  const label=`${solution?'solution':'legacy'} ${width}`,base='http://127.0.0.1:3117';
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),requests=[],errors=[];let external=0;
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});
  await page.addInitScript(()=>{
   const active=new Set(),start=window.setInterval.bind(window),stop=window.clearInterval.bind(window);
   window.setInterval=(callback,delay,...args)=>{const id=start(callback,delay,...args);active.add(id);return id;};
   window.clearInterval=id=>{active.delete(id);stop(id);};
   window.waitingIntervals=active;
  });
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'',goals:[{id:'elapsed-context',statement:'Elapsed timer context goal'}]},workspaces:{}})});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==base){external++;return route.abort();}
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
   if(url.pathname==='/api/home-solution-conversation'||url.pathname==='/api/chat'){
    requests.push({route,body:route.request().postDataJSON()});return;
   }
   if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});
   return route.abort();
  });
  const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),timer=page.getByRole('timer');
  const intervalCount=()=>page.evaluate(()=>window.waitingIntervals.size);
  await page.goto(base);await dismissHomeOnboarding(page).catch(async error=>{console.log({errors,body:await page.locator('body').innerText()});throw error;});
  await page.getByRole('status',{name:'Home data status',exact:true}).waitFor({state:'hidden'});
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  const baseline=await intervalCount();
  const expectTime=async text=>{await page.waitForFunction(text=>document.querySelector('[role="timer"]')?.textContent===text,text,{polling:10});};
  const send=async text=>{
   const count=requests.length;await input.fill(text);await button('Send overview question').click();await expectTime('Elapsed 0s');
   assert.equal(requests.length,count+1);check(label+' new request starts at zero',await timer.textContent()==='Elapsed 0s');
  };
  const finish=async(status=200,index=requests.length-1)=>{
   const {route,body}=requests[index];
   const json=status!==200?{error:'Synthetic failure'}:solution?await converseSolutions(body,fixtureRuntime([final('Synthetic completed answer.')]),new AbortController().signal):{answer:'Synthetic completed answer.',nextStep:'none'};
   await route.fulfill({status,json}).catch(()=>{});
  };
  const stopped=async reason=>{
   await timer.waitFor({state:'hidden'});await page.waitForFunction(n=>window.waitingIntervals.size===n,baseline,{polling:10});
   await page.clock.runFor(3000);check(label+' '+reason+' removes timer and interval',await timer.count()===0&&await intervalCount()===baseline);
  };
  await send('Explain the workforce evidence');await page.clock.runFor(5000);await expectTime('Elapsed 5s');
  check(label+' question retained and timer does not announce every second',await page.getByText('Explain the workforce evidence',{exact:true}).filter({visible:true}).count()>0&&await timer.getAttribute('aria-live')==='off');
  await page.clock.fastForward(61000);await expectTime('Elapsed 1m 6s');
  check(label+' throttled tick uses elapsed clock, without estimates or percentages',!/\d+%|remaining|estimated/i.test(await timer.textContent()));
  check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(output,`${solution?'solution':'legacy'}-${width}.png`)});
  await finish();await stopped('success');await page.getByText('Synthetic completed answer.',{exact:true}).last().waitFor();
  await send('Explain another workforce question');await page.clock.runFor(2000);await expectTime('Elapsed 2s');await finish(503);await stopped('failure');
  check(label+' failure retains submitted question',await page.getByText('Explain another workforce question',{exact:true}).filter({visible:true}).count()>0);
  await send('Question to cancel');await page.clock.runFor(4000);
  await button(solution?'Cancel request':'Reset conversation').click();await stopped('cancel');
  if(solution)check(label+' Cancel preserves draft and submitted question',await input.inputValue()==='Question to cancel'&&await page.getByText('Question to cancel',{exact:true}).filter({visible:true}).count()>0);
  const cancelled=requests.length-1;
  await send('Replacement question');await page.clock.runFor(2000);await finish(200,cancelled);await expectTime('Elapsed 2s');
  check(label+' late cancelled completion cannot stop replacement',await intervalCount()===baseline+1);
  await button('Reset conversation').click();await stopped('context reset');await finish();
  await send('Question before goal change');await page.clock.runFor(2000);if(solution){await page.getByText('Earlier saved goals and drafts',{exact:true}).click();await button('Elapsed timer context goal').click();}else await button('Open goal: Elapsed timer context goal').click();await stopped('goal change');await finish();
  await button('Reset conversation').click();await send('Question before unmount');await page.clock.runFor(2000);
  await page.evaluate(()=>window.unmountWaitingFixture());await page.waitForFunction(()=>window.waitingIntervals.size===0,undefined,{polling:10});await page.clock.runFor(60000);await finish();
  check(label+' unmount cleans intervals and ignores late response',await intervalCount()===0&&await timer.count()===0&&errors.length===0);
  check(label+' no external calls or retries',external===0&&requests.length===6);
  if(solution&&width===1366){
   await page.evaluate(()=>window.mountPendingProbe());await button('Start probe').click();await expectTime('Elapsed 0s');await page.clock.runFor(5000);await expectTime('Elapsed 5s');
   await button('Start probe').click();await expectTime('Elapsed 5s');check('Strict Mode repeated pending keeps one timer',await intervalCount()===1);
   await button('Restart probe').click();await expectTime('Elapsed 0s');check('batched stop/start resets time and cleans previous interval',await intervalCount()===1);
   await page.clock.runFor(2000);await expectTime('Elapsed 2s');await button('Toggle probe').click();await timer.waitFor({state:'hidden'});check('functional pending setter stops timer',await intervalCount()===0);
   await button('Toggle probe').click();await expectTime('Elapsed 0s');await page.evaluate(()=>window.unmountWaitingFixture());check('Strict Mode unmount cleans final interval',await intervalCount()===0);
  }
  await context.close();
 }
}}finally{await browser.close();}
console.log(JSON.stringify({checks,artifacts:output}));
