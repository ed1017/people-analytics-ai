/** Delayed valid replies through actual hooks; all model responses are deterministic offline fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions,parseDecisions} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'multitab-delayed-')),build=output;
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/multitab-delayed-response.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;

const base='http://127.0.0.1:3193',checks=[],errors=[],blocked=[];
const check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const saved=p=>p.evaluate(k=>localStorage.getItem(k),DECISIONS_STORAGE_KEY);
const settle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try{
 for(const mode of ['control','recovery','newer-request']){
  const context=await browser.newContext({offline:true,serviceWorkers:'block'});
  await context.addInitScript(({key,value})=>{
   if(!localStorage.getItem(key))localStorage.setItem(key,value);
   window.held=[];window.done=[];
   // Deliberately ignore AbortSignal: late body delivery must still be rejected by the hook.
   window.fetch=(url,init)=>{if(url!=='/api/home-solution-conversation'||init?.method!=='POST')throw Error('Unexpected offline request');return new Promise(resolve=>window.held.push({body:JSON.parse(init.body),release:reply=>resolve(new Response(JSON.stringify(reply),{headers:{'content-type':'application/json','x-workforce-dataset':'legacy-v1:0'}}))}));};
  },{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Reduce turnover'}]},workspaces:{a:{savedAt:'2026-10-12T12:00:00Z',fields:{chat:{messages:[],input:'Original unsent request',problem:null,questionUnanswered:false,resetMarks:{}}}}}})});
  await context.route('**/*',route=>route.request().isNavigationRequest()&&route.request().url().startsWith(base)?route.fulfill({contentType:'text/html',body:html}):(blocked.push(route.request().url()),route.abort()));
  const a=await context.newPage(),b=await context.newPage();for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  await a.goto(base);await a.waitForFunction(()=>window.lateFixture?.controller.canSend);await b.goto(base);await b.waitForFunction(()=>window.lateFixture?.controller.canSend);
  const start=async text=>{await a.evaluate(text=>{window.lateFixture.controller.send(text).then(value=>window.done.push({value}),error=>window.done.push({error:error.message}));},text);};
  const reply=async(index,answer)=>converseSolutions(await a.evaluate(i=>window.held[i].body,index),fixtureRuntime([final(answer)]),new AbortController().signal);
  const release=async(index,value)=>{await a.evaluate(({index,value})=>window.held[index].release(value),{index,value});};
  await start('Original delayed question');await a.waitForFunction(()=>window.held.length===1);const old=await reply(0,'Old delayed answer');
  if(mode==='control'){
   await release(0,old);await a.waitForFunction(()=>window.done.length===1);check('unchanged request accepts valid mocked response',await a.evaluate(()=>window.done[0].value==='Old delayed answer'));
   check('control persists validated solution state',parseDecisions(await saved(a)).workspaces.a.fields.homeSolutionConversationV1.turns.at(-1).text==='Old delayed answer');
  }else{
   const request=await a.evaluate(()=>window.held[0].body),newer=await converseSolutions({...request,requestId:'newer-saved',message:{id:'newer-user',text:'Saved newer question'}},fixtureRuntime([final('Saved newer answer')]),new AbortController().signal);
   await b.evaluate(state=>window.lateFixture.field('a','homeSolutionConversationV1',state),newer.state);
   await a.waitForFunction(()=>!!window.lateFixture.snapshot().recovery);
   await a.getByRole('textbox',{name:'Draft request',exact:true}).fill('Recovered unsent request');
   await a.getByRole('button',{name:'Keep saved versions and my request',exact:true}).click();await a.waitForFunction(()=>window.lateFixture.snapshot().saved);await settle(a);
   const before=await saved(a);
   if(mode==='newer-request'){
    await start('New request after recovery');await a.waitForFunction(()=>window.held.length===2);const latest=await reply(1,'Newest accepted answer');
    await release(1,latest);await a.waitForFunction(()=>window.done.some(x=>x.value==='Newest accepted answer'));
   }
   const protectedBytes=mode==='recovery'?before:await saved(a);
   await release(0,old);await a.waitForFunction(n=>window.done.length===n,mode==='recovery'?1:2);await settle(a);
   check(mode+' late response cannot change saved bytes',await saved(a)===protectedBytes);
   check(mode+' late response returns null',await a.evaluate(()=>window.done.some(x=>x.value===null)));
   check(mode+' preserves recovered composer',await a.getByRole('textbox',{name:'Draft request',exact:true}).inputValue()==='Recovered unsent request');
   check(mode+' memory retains current solution',await a.evaluate(answer=>window.lateFixture.controller.state.turns.at(-1)?.text===answer,mode==='recovery'?'Saved newer answer':'Newest accepted answer'));
   await a.reload();await a.waitForFunction(()=>window.lateFixture?.controller.canSend);check(mode+' reload retains saved history',await saved(a)===protectedBytes);
  }
  await context.close();
 }
 check('no network escapes',blocked.length===0);check('no runtime errors',errors.length===0);
}finally{await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors,blocked,offline:true},null,2));console.log(JSON.stringify({output,checks:checks.length}));}
