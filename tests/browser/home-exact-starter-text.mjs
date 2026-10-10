// Actual client app + deterministic solution service, synthetic model replies only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {homeStarterGroups} from '../../lib/contextual-prompts.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'exact-starter-text-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3117',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),checks=[];
try{for(const [mode,width,height] of [['desktop',1440,1000],['phone',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});if(url.origin!==base)return route.abort();if(url.pathname==='/api/home-solution-conversation'){const body=request.postDataJSON();posts.push(body);return route.fulfill({json:await converseSolutions(body,fixtureRuntime([final('Review the available evidence and clarify missing inputs before planning.')]),new AbortController().signal)});}return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});});
 for(const [index,item] of homeStarterGroups.flatMap(group=>group.prompts).entries()){
  await page.goto(base);await dismissHomeOnboarding(page);
  const suggestions=page.getByRole('region',{name:'Suggested questions',exact:true});await suggestions.waitFor();const group=homeStarterGroups.find(group=>group.prompts.some(prompt=>prompt.label===item.label));if(group.collapsed)await suggestions.getByRole('group',{name:group.label,exact:true}).getByText(group.label,{exact:true}).click();await suggestions.getByRole('button',{name:item.label,exact:true}).waitFor();
  if(index===0){assert.equal(await suggestions.getByRole('group').count(),3);assert.equal(await suggestions.locator('button').count(),12);await page.screenshot({path:path.join(output,mode+'-starters.png'),fullPage:true});}
  const button=suggestions.getByRole('button',{name:item.label,exact:true}),visible=await button.innerText();await button.click();await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('Review the available evidence and clarify missing inputs before planning.',{exact:true}).waitFor();
  assert.equal(posts.at(-1).message.text,visible);assert.equal(visible,item.label);assert.ok(await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText(visible,{exact:true}).isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push({mode,prompt:visible,submitted:posts.at(-1).message.text});
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
 }
 assert.equal(errors.length,0);assert.equal(posts.length,12);await context.close();
}}finally{await browser.close()}
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks,providerCalls:0},null,2));console.log(JSON.stringify({checks:checks.length,output}));
