import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {workforceReviewFixture} from '../fixtures/workforce-review.mjs';
import {calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';
const built=process.env.HOME_BUILT==='1';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'home-capacity-flow-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/home-capacity-flow.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const assets=new Map(await Promise.all((await fs.readdir(output)).filter(name=>name.endsWith('.js')).map(async name=>['/assets/'+name,await fs.readFile(path.join(output,name),'utf8')])));
const css=(await Promise.all((await fs.readdir('.next/static/chunks')).filter(name=>name.endsWith('.css')).map(name=>fs.readFile(path.join('.next/static/chunks',name),'utf8')))).join('\n');
const response='A synthetic capacity question is ready for review.\n\nCosts and operational availability remain unknown. [W1] See [Workforce](app:workforce).';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const mode of [{name:'desktop',width:1366},{name:'mobile',width:390},{name:'200-percent-reflow',width:683,scale:2}]){
 const context=await browser.newContext({...mode.width===390?devices['Pixel 7']:{},viewport:{width:mode.width,height:900},deviceScaleFactor:mode.scale??1}),page=await context.newPage(),errors=[];let posts=[],unexpected=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1:3100'){unexpected.push(url.href);return route.abort()}
  if(built&&!url.pathname.startsWith('/api/'))return route.continue();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div>'});
  if(assets.has(url.pathname))return route.fulfill({contentType:'text/javascript',body:assets.get(url.pathname)});
  if(request.method()==='POST'){
   posts.push({path:url.pathname,body:request.postDataJSON()});
   if(url.pathname==='/api/chat')return route.fulfill({json:{answer:response,nextStep:'choose_goal'}});
   if(url.pathname==='/api/workforce-solution'){
    const fixture=workforceReviewFixture(),input=request.postDataJSON();
    return route.fulfill({json:{...fixture,input,proposed:calculateWorkforceIncrement(input,null),hireOnly:calculateWorkforceIncrement({...input,build:'0',move:'0',buy:input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},null)}});
   }
  }
  if(url.pathname==='/api/position-structure')return route.fulfill({json:{as_of:'2026-09-30',business_units:[{org_code:'TECH',org_name:'Technology'}],job_profiles:[{job_profile_code:'ENGINEER',job_profile_name:'Engineer'}]}});
  if(url.pathname.startsWith('/api/')&&request.method()==='GET')return route.fulfill({json:{summary:{total_exits:0,current_workforce:10},as_of:'2026-09-30'}});
  unexpected.push(url.href);return route.abort();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),scope=()=>page.getByRole('region',{name:'Review workforce planning scope',exact:true}),state=()=>page.evaluate(()=>window.capacityState?window.capacityState():{data:JSON.parse(localStorage.getItem('insights-to-action.decisions.v1')).payload}),solution=async()=>{const s=await state();return s.data.workspaces[s.data.goals.activeId]?.fields.workforceSolution};
 const init=async()=>{await page.goto('http://127.0.0.1:3100/');await page.evaluate(()=>localStorage.clear());if(built)await page.reload();else{await page.addStyleTag({content:css});await page.addScriptTag({content:assets.get('/assets/fixture.js')});}await input.fill('Investigate capacity for three additional engineer roles in Technology');await button('Send overview question').click();await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('A synthetic capacity question is ready for review.',{exact:true}).waitFor();};
 const open=()=>button('Compare workforce options').click(),confirm=()=>button('Confirm goal and review inputs'),close=()=>button('Return to conversation').click();
 const checkHere=(name,value)=>check(mode.name+' '+name,value);
 await init();const baseline=posts.length;
 const body=page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('A synthetic capacity question is ready for review.',{exact:true}).locator('../..');
 checkHere('Home body is 14px, readable and compact',await body.evaluate(el=>getComputedStyle(el).fontSize==='14px'&&getComputedStyle(el).lineHeight==='21px'&&getComputedStyle(el.children[1]).marginBlockStart==='6px'));
 checkHere('text uncertainty and source link retained',await page.getByRole('region',{name:'Overview conversation',exact:true}).getByText('Costs and operational availability remain unknown.',{exact:false}).count()===1&&await page.getByRole('region',{name:'Overview conversation',exact:true}).getByRole('complementary',{name:'Answer sources'}).getByRole('button',{name:'Workforce',exact:true}).count()===1);
 if(!built)checkHere('other page body remains 16px',await page.getByRole('region',{name:'Other page typography'}).getByText('Other page body.',{exact:true}).evaluate(el=>getComputedStyle(el).fontSize==='16px'));
 checkHere('goal prompt accepts a custom outcome without fixed pair',await page.getByRole('button',{name:'State my goal',exact:true}).isVisible()&&await page.getByRole('button',{name:'Retention',exact:true}).count()===0&&await page.getByRole('button',{name:'Capability building',exact:true}).count()===0);
 await input.fill('Keep this unfinished question');await open();
 checkHere('entry focuses explicit scope review and makes no request',await scope().evaluate(el=>el===document.activeElement)&&posts.length===baseline&&await confirm().isDisabled());
 await page.getByLabel('Goal to carry into the plan',{exact:true}).fill('Reduce avoidable departures');await page.getByRole('radio',{name:'No — retain current employees only',exact:true}).check();
 checkHere('retention-only scope cannot create a plan',(await confirm().count()===0||await confirm().isDisabled())&&(await state()).data.goals.goals.length===0&&posts.length===baseline);
 await page.getByRole('radio',{name:'No — replace departures only',exact:true}).check();checkHere('replacement-only scope cannot create a plan',await confirm().isDisabled()&&!(await solution()));
 await page.getByRole('radio',{name:'Not sure yet',exact:true}).check();checkHere('uncertain scope stays in conversation',await confirm().isDisabled());
 await close();await page.waitForFunction(()=>document.activeElement?.id==='overview-question');checkHere('return preserves and focuses the exact chat draft',await input.inputValue()==='Keep this unfinished question'&&await input.evaluate(el=>el===document.activeElement));
 await open();await page.getByLabel('Goal to carry into the plan',{exact:true}).fill('x'.repeat(241));await page.getByRole('radio',{name:/^Yes/}).check();checkHere('long goal is not silently truncated',await confirm().isDisabled()&&(await page.getByLabel('Goal to carry into the plan',{exact:true}).inputValue()).length===241);
 const goal='Add three engineer roles in Technology within three months';await page.getByLabel('Goal to carry into the plan',{exact:true}).fill(goal);checkHere('editing a goal clears prior capacity confirmation',await confirm().isDisabled());await page.getByRole('radio',{name:/^Yes/}).check();
 if(!built){await page.evaluate(()=>window.changeCapacityScope());await page.getByText('Your goal or context changed.',{exact:false}).waitFor();checkHere('scope change invalidates review without discarding its text',await confirm().isDisabled()&&await page.getByLabel('Goal to carry into the plan',{exact:true}).inputValue()===goal);}await close();await open();
 await page.getByLabel('Goal to carry into the plan',{exact:true}).fill(goal);await page.getByRole('radio',{name:/^Yes/}).check();await confirm().click();
 await page.locator('[data-home-planner-heading]').waitFor();await page.waitForTimeout(500);
 checkHere('confirmation saves exact goal and preserves draft without model/calculator calls',(await state()).data.goals.goals[0].statement===goal&&(await solution()).versions[0].inputs.scope.goalStatement===goal&&await input.inputValue()==='Keep this unfinished question'&&posts.length===baseline);
 checkHere('confirmation focuses planner',await page.locator('[data-home-planner-heading]').evaluate(el=>el===document.activeElement));
 checkHere('prose planning CTA is smaller and secondary',await button('Develop a full action plan').evaluate(el=>getComputedStyle(el).fontSize==='14px'&&!el.classList.contains('bg-primary')));
 await page.getByText(/Input status and unknowns/).click();await button('Calculate options').click();checkHere('missing required assumptions do not call calculator',posts.length===baseline&&await page.getByRole('region',{name:'Workforce input readiness',exact:true}).getByText('Missing input:',{exact:false}).count()>0);
 await button('Load governed role and BU choices').click();await page.getByText('Catalog snapshot 2026-09-30',{exact:false}).waitFor();
 await button('Review Business unit').click();checkHere('missing-input guidance opens and focuses exact field',await page.getByLabel('Business unit',{exact:true}).evaluate(el=>el===document.activeElement));
 await button('Show all input fields').click();
 const plan=workforceReviewFixture().input;
 for(const [key,value] of Object.entries(plan)){
  const control=page.locator(`[data-journey-field="${key}"]`);if(!await control.count())continue;
  if(await control.evaluate(el=>el.tagName==='SELECT'))await control.selectOption(value);else await control.fill(value);
 }
 checkHere('draft blocks calculation until explicit save',await button('Calculate options').isDisabled());
 await page.getByText('Quantify an option',{exact:true}).click();await button('Review numbers').click();checkHere('return to existing planner preserves edited assumptions',await page.locator('[data-journey-field="roles"]').inputValue()==='3');
 await button('Save reviewed inputs').click();checkHere('save makes a version without calculating',(await solution()).versions.length===2&&posts.length===baseline&&(await solution()).results.length===0);
 await button('Calculate options').click();await page.getByRole('region',{name:'Workforce solution calculation',exact:true}).waitFor();await page.waitForTimeout(500);
 checkHere('explicit Calculate uses unchanged payload and existing calculator',posts.length===baseline+1&&posts.at(-1).path==='/api/workforce-solution'&&JSON.stringify(posts.at(-1).body)===JSON.stringify(plan));
 checkHere('result cards receive focus',await page.getByRole('region',{name:'Workforce solution calculation',exact:true}).evaluate(el=>el===document.activeElement)&&await page.getByRole('tab',{name:'Option 1',exact:true}).isVisible()&&await page.getByRole('tab',{name:'Option 2',exact:true}).isVisible());
 await button('Compare options').click();checkHere('PR103 comparison remains usable',await page.getByRole('region',{name:'Compare calculated options',exact:true}).isVisible());
 await page.screenshot({path:path.join(output,(built?'built-':'')+mode.name+'-options.png'),fullPage:true});
 checkHere('viewport has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const beforeReload=posts.length;await page.reload();if(!built){await page.addStyleTag({content:css});await page.addScriptTag({content:assets.get('/assets/fixture.js')});}await page.getByRole('region',{name:'Workforce solution calculation',exact:true}).waitFor();await page.waitForTimeout(500);
 checkHere('reload retains chat draft, confirmed goal and calculated plan without requesting AI',await input.inputValue()==='Keep this unfinished question'&&(await state()).data.goals.goals[0].statement===goal&&(await solution()).results.length===1&&posts.length===beforeReload);
 if(!built){await page.evaluate(()=>window.capacityRename());await page.getByText('The goal wording changed. Review and save the inputs to bind them to the current goal before calculating or recording approval.',{exact:true}).waitFor();checkHere('changed goal blocks old calculation',await button('Calculate options').isDisabled());
 await init();await open();await page.getByLabel('Goal to carry into the plan',{exact:true}).fill(goal);await page.getByRole('radio',{name:/^Yes/}).check();await page.evaluate(()=>window.capacityRoundtrip());await page.getByText('Your goal or context changed.',{exact:false}).waitFor();checkHere('batched goal roundtrip invalidates confirmation',await confirm().isDisabled());}
 checkHere('no unexpected services or runtime errors',unexpected.length===0&&errors.length===0);
 await context.close();
}}finally{await browser.close()}
console.log(`${checks} ${built?'built-app':'fixture'} Home capacity-flow browser checks passed; screenshots: ${output}`);
