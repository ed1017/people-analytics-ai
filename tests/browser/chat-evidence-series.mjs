import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {fixtureRuntime,final} from '../fixtures/home-solution-conversation.mjs';
import {chatSeriesFixture,chartGrounding} from '../fixtures/chat-evidence-series.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'chat-evidence-series-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/swp-editor-full-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://localhost:3127',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),checks=[];
const fixtures=chatSeriesFixture().results;
try{for(const [mode,width,height] of [['desktop',1440,1000],['phone',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let external=0,posts=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 const check=(name,ok)=>{assert.ok(ok,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.href===base+'/')return route.fulfill({contentType:'text/html',body:html});if(url.origin!==base){external++;return route.abort();}
 if(url.pathname==='/api/home-solution-conversation'){
  posts++;const body=req.postDataJSON(),question=body.message.text;
  const answer=question.startsWith('Headcount')?'The recorded snapshots show 100, 103 and 105 people [W1].':question==='Hiring trend'?'The selected months record 2, 3 and 4 hires [R1].':question==='Voluntary turnover trend'?'The monthly voluntary rates were 0.8%, 1.4% and 1% [A1].':question==='Single YTD turnover'?'The snapshot reports 6.2% YTD voluntary turnover [W1].':'There is not enough cited evidence to attach a chart.';
  const runtime=fixtureRuntime([final(answer)]);runtime.grounding=chartGrounding(body.evidence);
  const reply=await converseSolutions(body,runtime,new AbortController().signal);if(question==='Headcount malformed supplement')reply.charts[0].points[0]=null;return route.fulfill({json:reply});
 }
 if(url.pathname.startsWith('/api/'))return route.fulfill({json:fixtures[url.pathname.slice(5)]?.data??{}});external++;return route.abort();});
 await page.goto(base);await dismissHomeOnboarding(page);
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=async text=>{await input.fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.getByRole('status').filter({hasText:'Thinking through the question'}).waitFor({state:'hidden'});};
 for(const [question,title,values] of [['Headcount trend','Headcount snapshots',['100','103','105']],['Hiring trend','Monthly hires',['2','3','4']],['Voluntary turnover trend','Monthly voluntary turnover',['0.8%','1.4%','1%']]]){
  await send(question);const chart=page.getByRole('figure',{name:title+' for this answer',exact:true});await chart.waitFor();
  check(title+' uses returned values and explicitly labels recorded data',await chart.innerText().then(text=>values.every(value=>text.includes(value))&&/recorded (?:synthetic )?aggregate, not a forecast/.test(text)&&text.includes('Selected periods only')));
  check(title+' shows a compact discrete chart, without a forecast line',await chart.locator('[aria-hidden=true]').count()===3&&await chart.locator('svg').count()===0);
  if(title==='Monthly voluntary turnover'){await chart.getByText('Source and limits',{exact:true}).click();check('monthly rate keeps the source denominator-unavailable caveat',await chart.getByText(/Monthly-rate denominator: Unavailable; snapshot headcount is not a monthly rate denominator/).isVisible());await chart.getByText('Source and limits',{exact:true}).click();}
  await chart.screenshot({path:path.join(output,mode+'-'+title.toLowerCase().replaceAll(' ','-')+'.png')});
 }
 await send('Single YTD turnover');check('6.2% YTD alone adds no trend or projection',await page.getByRole('figure').count()===3);
 await send('Explain without a cited source');check('uncited answer cannot borrow another answer chart',await page.getByRole('figure').count()===3);
 await send('Headcount malformed supplement');check('malformed chart is omitted while the valid answer and saved conversation survive',await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload.exploration.fields.homeSolutionConversationV1.turns.at(-1).text==='The recorded snapshots show 100, 103 and 105 people [W1].',DECISIONS_STORAGE_KEY)&&await page.getByRole('figure').count()===3&&await page.getByRole('region',{name:'Overview conversation',exact:true}).innerText().then(text=>text.includes('Headcount malformed supplement')&&text.split('The recorded snapshots show 100, 103 and 105 people').length===3));
 check('no overflow, runtime errors or external calls',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0&&posts===6);
 await page.getByRole('button',{name:'Reset conversation',exact:true}).click();check('reset removes old charts with their messages',await page.getByRole('figure').count()===0);
 await context.close();
}}finally{await browser.close()}
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,output}));
