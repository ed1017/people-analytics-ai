// Three actual attachment render paths; frozen historical data, no server/provider calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {readBundleWorkspace} from '../../lib/home-bundle-records.ts';
import {proposePlanRevision} from '../../lib/home-plan-revisions.ts';
import {createPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.HISTORY_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'legacy-history-budget-'));
await fs.mkdir(output,{recursive:true});
const old=JSON.parse(await fs.readFile('tests/fixtures/home-plan-legacy-costs.json','utf8'));
const revised=proposePlanRevision(old.history,old.base,'use 20 participants',{option:1,count:3}).record;
const workspace={...old.workspace,drafts:[revised.draft],calculations:[{draft:revised.draft,result:revised.result}]};
assert.ok(readBundleWorkspace(workspace,workspace.goalId));
const binding=revised.draft.binding,context={goalId:binding.goalId,goal:binding.goal};
const catalog=createPlanAlternatives(context,[{id:'current',draft:revised.draft}]);
const fixture={workspace,props:{binding,proposal:{version:1,goal:binding.goal,bundles:[revised.draft.bundle],question:null,unavailableReason:null}}};
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('false'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('false')})],entry:path.resolve('tests/fixtures/legacy-plan-history-client.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>window.historyFixture=${JSON.stringify(fixture)};</script><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),checks=[];
const check=(name,value)=>{checks.push({name,pass:!!value});assert.ok(value,name);};
try{for(const width of [1366,390])for(const surface of ['legacy-home','alternatives-home','brief']){
 const name=`${width} ${surface}`,browserContext=await browser.newContext({viewport:{width,height:900},offline:true,serviceWorkers:'block'}),page=await browserContext.newPage(),errors=[],blocked=[];
 page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
 const fields={homeSolutionBundlesV1:workspace,...(surface==='alternatives-home'?{homePlanAlternativesV1:catalog}:{})};
 const seed={version:1,revision:1,goals:{version:1,activeId:binding.goalId,goals:[{id:binding.goalId,statement:binding.goal}]},workspaces:{[binding.goalId]:{savedAt:'2026-10-06T12:05:00Z',fields}}};
 await browserContext.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await browserContext.route('**/*',route=>{if(route.request().isNavigationRequest()&&new URL(route.request().url()).origin==='http://fixture.local')return route.fulfill({contentType:'text/html',body:html});blocked.push(route.request().url());return route.abort();});
 await page.goto('http://fixture.local/?surface='+surface);
 await page.getByRole('region',{name:'Plan overview',exact:true}).first().waitFor({timeout:5000}).catch(async error=>{console.error(await page.locator('body').innerText());throw error;});
 const stored=()=>page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY),before=await stored();
 let history=page.getByRole('region',{name:'Attached Action Plans',exact:true});
 if(surface!=='brief'){
  history=page.locator('summary').filter({hasText:/^Attached Action Plans and version history/}).locator('..');
  check(name+' outer history starts closed',!await history.evaluate(n=>n.open));
  await history.locator(':scope > summary').focus();await page.keyboard.press('Enter');
  check(name+' outer history opens by keyboard',await history.evaluate(n=>n.open));
 }
 const overview=history.getByRole('region',{name:'Plan overview',exact:true});
 const detail=overview.locator('details').filter({has:page.getByText('Plan details and assumptions',{exact:true})});
 const budgetText=/\$2,500 USD headroom under the listed assumptions/;
 check(name+' saved budget is visible with inner details closed',!await detail.evaluate(n=>n.open)&&await overview.getByText(budgetText).filter({visible:true}).isVisible());
 check(name+' saved uncertainty and hours remain visible',await overview.innerText().then(t=>t.includes('actual costs and funding remain unverified')&&t.includes('Delivery hours: 36')&&!t.includes('$2,700')&&!t.includes('$6,200')));
 await detail.locator(':scope > summary').focus();await page.keyboard.press('Enter');
 check(name+' open detail agrees with saved overview',await overview.getByLabel('Selected plan summary').getByText(budgetText).isVisible()&&await overview.getByText(/no available headroom is established/).count()===0);
 await detail.locator(':scope > summary').focus();await page.keyboard.press('Space');
 check(name+' reclosing detail retains saved budget',!await detail.evaluate(n=>n.open)&&await overview.getByText(budgetText).filter({visible:true}).isVisible());
 if(surface!=='brief'){
  const current=page.getByRole('region',{name:'Plan overview',exact:true}).first();
  check(name+' current revision still has unresolved feasibility',await current.getByText(/no available headroom is established/).filter({visible:true}).isVisible()&&await current.getByText(budgetText).count()===0);
 }
 check(name+' receipt and current workspace bytes unchanged',await stored()===before);
 check(name+' no clipping, errors or network escapes',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&blocked.length===0);
 await page.screenshot({path:path.join(output,`${width}-${surface}.png`),fullPage:true});await browserContext.close();
}}finally{await browser.close();await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify({checks:checks.length,failures:checks.filter(x=>!x.pass),output}));}
