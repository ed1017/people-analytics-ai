// Actual conversation hooks, DecisionStore and review card; deterministic offline model transport.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {candidate,evaluate,final,fixtureRuntime} from '../fixtures/home-solution-conversation.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.HIRING_BUDGET_QA_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'hiring-budget-'));
await fs.mkdir(output,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/home-hiring-budget-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const base='http://127.0.0.1:3117',browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox',...(process.env.HIRING_BROWSER_SINGLE_PROCESS==='1'?['--single-process','--no-zygote','--disable-gpu']:[])]}),checks=[];
try{for(const [mode,width,height] of [['desktop',1440,1000],['phone',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let external=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const check=(name,ok)=>{assert.ok(ok,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.isNavigationRequest()&&url.href===base+'/')return route.fulfill({contentType:'text/html',body:html});if(url.origin!==base){external++;return route.abort();}
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();requests.push(body);const basis={kind:'user-supplied',turnId:body.message.id,quote:body.message.text,explanation:'Offline fixture interpretation of the user request.'};
   let steps=body.state.hiringBudget?[{name:'review_hiring_budget',args:{changes:[]}},final('The entered scenario is conditional; confirm the salary and hiring schedule.')]:[{name:'review_hiring_budget',args:{changes:[{field:'hires',value:10,basis},{field:'budget',value:1000000,basis},{field:'role',value:'Engineers',basis}]}},final('Confirm the cost basis and timing before committing. The estimate shows the allowance per hire.')];
   if(body.message.text==='Recommend a plan'){const c=candidate();c.goal.turnId=body.message.id;steps=[evaluate(c),final('Begin with a bounded trial.\n\n### Further reading / investigation\nReview the actual cost inputs before approval.',[c.id])];}
   const runtime=fixtureRuntime(steps);runtime.natural={datasetToken:'legacy-v1:0'};return route.fulfill({json:await converseSolutions(body,runtime,new AbortController().signal)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'},trend:[]}});external++;return route.abort();
 });
 await page.goto(base);await page.getByRole('button',{name:'Send overview question',exact:true}).waitFor();
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=async text=>{await input.fill(text).catch(async e=>{console.log('COMPOSER DIAGNOSTIC',await input.evaluate(node=>{const rows=[];for(let p=node;p;p=p.parentElement)rows.push({tag:p.tagName,hidden:p.hidden,display:getComputedStyle(p).display,visibility:getComputedStyle(p).visibility,height:p.getBoundingClientRect().height});return rows;}));throw e;});await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.getByRole('status').filter({hasText:'Thinking through the question'}).waitFor({state:'hidden'});};
 const card=page.getByRole('region',{name:'Hiring budget estimate',exact:true});
 const readState=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await send('We need 10 engineers, but Finance capped the budget at $1 million. What are our options?');await card.waitFor();
 check('question produces period allowance and unavailable salary without a workload fiction',(await card.innerText()).includes('100,000 currency unspecified')&&(await card.innerText()).includes('not an annual salary')&&(await card.innerText()).includes('salary data is unavailable for this estimate')&&await page.getByRole('region',{name:'Business planning assumptions',exact:true}).count()===0);
 await card.getByText('Edit inputs and salary override',{exact:true}).click();
 check('currency, horizon, costs and FTE start blank',await card.getByLabel('Currency',{exact:true}).inputValue()===''&&await card.getByLabel('Budget horizon (months)',{exact:true}).inputValue()===''&&await card.getByLabel('Annual base pay override',{exact:true}).inputValue()===''&&await card.getByLabel('FTE per hire',{exact:true}).inputValue()==='');
 await card.getByLabel('Currency',{exact:true}).selectOption('USD');
 for(const [label,value] of [['Budget start month','2027-01'],['Budget horizon (months)','12'],['Hire arrival date','2027-07-01'],['FTE per hire','1'],['Annual base pay override','120000'],['Annual non-base cost per hire','30000'],['One-time recruiting cost per hire','10000']])await card.getByLabel(label,{exact:true}).fill(value);
 await card.getByLabel('Base pay basis',{exact:true}).selectOption('per_hire');await card.getByLabel('All other costs included',{exact:true}).selectOption('true');await card.getByRole('button',{name:'Update estimate',exact:true}).click();
 await card.getByText('850,000 USD',{exact:true}).first().waitFor();
 check('editor calculates period cash and annual run rate without a model request',requests.length===1&&(await card.innerText()).includes('1,500,000 USD')&&(await card.innerText()).includes('unverified scenario input'));
 const state=await readState();check('edit retains scenario provenance without pinning a goal or plan',state.exploration.fields.homeSolutionConversationV1.hiringBudget.origins.annualBasePay.kind==='user-entry'&&!state.goals.activeId);
 await card.getByText('Edit inputs and salary override',{exact:true}).click();await card.getByLabel('One-time recruiting cost per hire',{exact:true}).fill('');await card.getByRole('button',{name:'Update estimate',exact:true}).click();
 check('blank fee restores unknown complete cost instead of zero',(await card.innerText()).includes('One-time recruiting cost per hire is unknown.')&&(await card.innerText()).includes('Budget check: Unknown'));
 await page.reload();await card.waitFor();check('reload preserves edited inputs and unknowns',(await card.innerText()).includes('One-time recruiting cost per hire is unknown.')&&(await card.innerText()).includes('1,500,000 USD'));
 await send('Explain this estimate.');check('next conversation receives local edits',requests.at(-1).state.hiringBudget.inputs.annualBasePay===120000&&requests.at(-1).state.hiringBudget.inputs.recruitingFeePerHire===null);
 await card.getByText('Edit inputs and salary override',{exact:true}).click();await card.getByLabel('Currency',{exact:true}).selectOption('EUR');
 check('changing currency clears previous amounts before recalculation',await card.getByLabel('Total budget for the period',{exact:true}).inputValue()===''&&await card.getByLabel('Annual base pay override',{exact:true}).inputValue()==='');
 await card.getByRole('button',{name:'Update estimate',exact:true}).click();check('new currency cannot silently reuse a USD rate',(await card.innerText()).includes('Budget allowance per hire: Unknown')&&(await card.innerText()).includes('Comparable annual base pay or an explicit override'));
 check('phone and desktop fit without runtime errors or external traffic',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0);
 await page.getByRole('button',{name:'Change workforce scope',exact:true}).click();
 await card.getByText('Edit inputs and salary override',{exact:true}).click();await card.getByRole('button',{name:'Update estimate',exact:true}).click();
 check('scope change blocks stale estimate edits',await card.getByRole('alert').innerText().then(text=>text.includes('another dataset or workforce scope')));
 await card.getByRole('button',{name:'Clear hiring estimate',exact:true}).click();check('clear removes only the estimate without a model call',await card.count()===0&&requests.length===2&&(await readState()).exploration.fields.homeSolutionConversationV1.turns.length===4);
 await send('Recommend a plan');const review=page.getByRole('region',{name:'Solution conversation review',exact:true});await review.getByRole('article').filter({hasText:'Recommended Action Plan'}).waitFor();
 check('existing checked-plan review remains available after clearing the estimate',await review.getByLabel('Recommendation summary',{exact:true}).count()===1);
 await context.close();
}}finally{await browser.close()}
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length,output}));
