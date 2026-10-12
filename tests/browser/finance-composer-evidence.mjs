/** Real enabled app/composer/hook and service; aggregate and model I/O are offline fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
import {scopedDashboardResponse} from '../../lib/dashboard-scope.ts';
import {buildFinanceCurrent} from '../../lib/finance-current.ts';
import {readSolutionRequest} from '../../lib/home-solution-conversation.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {verifySolutionEvidence} from '../../lib/home-solution-grounding.mjs';
import {fixtureRuntime,final} from '../fixtures/home-solution-conversation.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'finance-composer-evidence-'));
const fixtureRoot=process.env.FINANCE_FIXTURE_ROOT??process.cwd();
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('true'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.join(fixtureRoot,'tests/fixtures/swp-editor-full-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':fixtureRoot}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const cssFiles=(await fs.readdir('.next/static/chunks')).filter(name=>name.endsWith('.css'));
const css=(await Promise.all(cssFiles.map(name=>fs.readFile(path.join('.next/static/chunks',name),'utf8')))).join('\n');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const common=scopedDashboardResponse({overview:{headcount:60,fte:48,open_positions:12,snapshot_date:'2026-09-30'},trend:[{snapshot_date:'2026-09-30',headcount:60,fte:48}],filter_options:{countries:[],business_units:[],levels:[]}},{country:'all',org:'all',level:'all'});
const finance={as_of:'2026-09-30',...buildFinanceCurrent(['Accounting','Consulting','Corporate','Data & AI','Engineering','Operations'].map((org_name,index)=>({org_code:'BU-'+index,org_name,org_type:'business_unit',headcount:10,fte:8,labor_cost_usd:800000,cost_per_fte_usd:100000,vacant_positions:2,estimated_vacancy_cost_exposure_usd:150000})))};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),checks=[];
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),requests=[],errors=[],blocked=[];
 page.setDefaultTimeout(20000);page.on('pageerror',error=>{errors.push(error.message);console.error('BROWSER '+error.message);});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!=='http://127.0.0.1:3100'){blocked.push(req.url());return route.abort();}
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
  if(url.pathname==='/api/home-solution-conversation'){
   const body=req.postDataJSON();requests.push(body);await fs.writeFile(path.join(output,mode+'-requests.json'),JSON.stringify(requests,null,2));
   const request=readSolutionRequest(body),signal=new AbortController().signal;
   const grounding=await verifySolutionEvidence(request,{datasetToken:'legacy-v1:0',read:async key=>({status:'loaded',data:key==='finance'?finance:common})},signal);
   const runtime=fixtureRuntime([final('Offline Finance response '+requests.length+'.')]);runtime.grounding=grounding;
   return route.fulfill({json:await converseSolutions(request,runtime,signal)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/finance'?finance:common});
  blocked.push(req.url());return route.abort();
 });
 const send=async text=>{const next=requests.length+1;await page.getByLabel('Ask Workforce AI',{exact:true}).fill(text);await page.getByRole('button',{name:'Send overview question',exact:true}).click();await page.getByText('Offline Finance response '+next+'.',{exact:true}).filter({visible:true}).first().waitFor();};
 const check=(name,ok)=>{assert.ok(ok,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await page.goto('http://127.0.0.1:3100/');await dismissHomeOnboarding(page);
 await send('Show company-wide reported labor cost');
 check('initial sample excludes Engineering',!requests[0].evidence.sources.find(s=>s.id==='F1').facts.rows.some(r=>r.org_name==='Engineering'));
 await send('Review C: What is Engineering labor cost and cost per FTE?');
 const f=requests[1].evidence.sources.find(s=>s.id==='F1');
 check('newly typed Engineering reaches enabled composer request before truncation',f.facts.rows[0].org_name==='Engineering'&&f.facts.rows[0].org_code==='BU-4'&&f.coverage.rowsAvailable===6&&f.coverage.rowsIncluded===3);
 await send('What about its cost per FTE?');check('short follow-up retains the previously requested BU',requests[2].evidence.sources.find(s=>s.id==='F1').facts.rows[0].org_name==='Engineering');
 await send('Now show Operations labor cost');check('newest typed BU supersedes prior Engineering sample',requests[3].evidence.sources.find(s=>s.id==='F1').facts.rows[0].org_name==='Operations');
 check('one request per send and no browser or external traffic errors',requests.length===4&&errors.length===0&&blocked.length===0);
 await page.screenshot({path:path.join(output,mode+'.png'),fullPage:true});await context.close();
}}catch(error){for(const context of browser.contexts())for(const page of context.pages()){await fs.writeFile(path.join(output,'failure.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});}throw error;}finally{await browser.close();await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify({checks,providerCalls:0,databaseCalls:0,actualApp:true,actualComposer:true,actualHook:true,actualService:true,actualFreshVerifier:true,output},null,2));console.log(JSON.stringify({output,checks:checks.length}));}
