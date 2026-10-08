// Entirely intercepted local fixture, using real Home/composer and AI-panel components.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'contextual-prompts-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/contextual-prompts.tsx'),output:{path:output,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const css=(await Promise.all((await fs.readdir('.next/static/chunks')).filter(name=>name.endsWith('.css')).map(name=>fs.readFile(path.join('.next/static/chunks',name),'utf8')))).join('\n');
const seed={version:1,revision:1,goals:{version:1,activeId:'retention',goals:[{id:'retention',statement:'Improve retention'},{id:'skills',statement:'Improve AI skills'}]},workspaces:{retention:{savedAt:'2026-10-03T00:00:00.000Z',fields:{owner:'Keep owner',workforceSolutionPins:[]}}}};
let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const width of [1366,390]){
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:900}}),page=await context.newPage();let posts=0,unexpected=0,missing=false;const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1:3100'){unexpected++;return route.abort()}
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div>'});
  if(url.pathname==='/api/chat'){posts++;return route.fulfill({json:{answer:'Synthetic response'}})}
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:missing?{summary:{total_exits:null,current_workforce:null}}:{summary:{total_exits:0,current_workforce:10},as_of:'2026-09-30'}});
  unexpected++;return route.abort();
 });
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 await page.goto('http://127.0.0.1:3100/');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});
 const suggestions=()=>page.getByRole('region',{name:'Suggested questions',exact:true});
 const home=page.getByLabel('Ask Workforce AI',{exact:true});await home.waitFor();
 check(width+' no automatic takeaway request',posts===0);
 const placeholder='Describe a goal, compare options, build or adjust a plan, or ask a general workforce question.';
 check(width+' Home guidance is an empty accessible placeholder',await home.getAttribute('placeholder')===placeholder&&await home.inputValue()===''&&await page.getByRole('textbox',{name:'Ask Workforce AI',exact:true}).count()===1);
 check(width+' placeholder fits the composer',await home.evaluate(el=>el.scrollHeight<=el.clientHeight));
 const sizing=await home.evaluate(el=>{const height=el.getBoundingClientRect().height,minHeight=getComputedStyle(el).minHeight;el.style.minHeight='80px';const baselineHeight=el.getBoundingClientRect().height;el.style.removeProperty('min-height');return {viewport:innerWidth,rows:el.rows,height,baselineHeight,change:height-baselineHeight,lineHeight:getComputedStyle(el).lineHeight,minHeight}});
 check(width+' composer grows to fit its placeholder with a three-row floor',sizing.rows===3&&sizing.height>=80&&sizing.height<=320&&await home.evaluate(el=>el.scrollHeight<=el.clientHeight));
 console.log('COMPOSER '+JSON.stringify(sizing));
 check(width+' redundant helper copy removed',await page.getByText('Keep this focus across pages.',{exact:true}).count()===0&&await page.getByText('Choose an example to edit, then send when ready.',{exact:true}).count()===0);
 const development=page.getByText('In development',{exact:true}),details=page.getByRole('button',{name:'Open data details',exact:true});
 const developmentBox=await development.boundingBox(),detailsBox=await details.boundingBox();
 check(width+' development label shares Data details row',developmentBox&&detailsBox&&Math.abs(developmentBox.y+developmentBox.height/2-detailsBox.y-detailsBox.height/2)<2);
 check(width+' Home has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await details.click();check(width+' source disclosure remains accessible',await page.getByText('Demo only: company records are synthetic, not real employee data.',{exact:false}).isVisible());await page.getByRole('button',{name:'Close data details',exact:true}).click();
 await page.screenshot({path:path.join(output,`home-copy-${width}.png`),fullPage:true});
 // Pinned Home no longer shows starter suggestions; their submission lifecycle is covered by home-prompt-auto-send.
 await page.getByRole('button',{name:'Toggle panel',exact:true}).click();
 const panel=page.getByLabel('Ask People Analytics AI',{exact:true});
 await suggestions().getByRole('button').first().waitFor();
 const baseline=posts;await suggestions().getByRole('button').first().focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);
 check(width+' panel example sends without replacing composer',await panel.inputValue()===''&&posts===baseline+1);
 await panel.fill('Keep my unfinished question');await suggestions().getByRole('button').nth(1).click();await page.waitForTimeout(100);
 check(width+' existing draft remains while another question sends',await panel.inputValue()==='Keep my unfinished question'&&posts===baseline+2);
 await page.getByRole('button',{name:'skills goal',exact:true}).click();check(width+' goal changes retain separate drafts',await panel.inputValue()==='');await panel.fill('Keep skills draft');
 await page.getByRole('button',{name:'retention goal',exact:true}).click();check(width+' return restores goal draft',await panel.inputValue()==='Keep my unfinished question');
 await panel.fill('');const switched=posts;await page.getByRole('button',{name:'Switch goal with queued example',exact:true}).click();await page.waitForTimeout(100);
 check(width+' stale goal callback cannot send or overwrite restored draft',posts===switched&&await panel.inputValue()==='Keep skills draft');
 await page.getByRole('button',{name:'retention goal',exact:true}).click();
 await panel.fill('');const queued=posts;await page.getByRole('button',{name:'Queue draft with example',exact:true}).click();await page.waitForTimeout(100);
 check(width+' synchronous draft survives question submission',await panel.inputValue()==='Queued unfinished question'&&posts===queued+1);
 await page.getByRole('button',{name:'Toggle panel evidence',exact:true}).click();const unavailable=posts;
 check(width+' missing page evidence keeps draft and disables suggestions',await panel.inputValue()==='Queued unfinished question'&&await suggestions().getByRole('button').first().isDisabled());
 await suggestions().getByRole('button').first().evaluate(node=>node.click());check(width+' disabled suggestion cannot invoke callback',posts===unavailable);
 const data=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 check(width+' no solution, approval or pins created',data.workspaces.retention.fields.owner==='Keep owner'&&data.workspaces.retention.fields.workforceSolutionPins.length===0&&!data.workspaces.retention.fields.workforceSolution);
 check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(width+' no external requests or runtime errors',unexpected===0&&errors.length===0);
 await page.screenshot({path:path.join(output,`prompts-${width}.png`),fullPage:true});await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output,engine:'Linux Chromium; Pixel 7 emulation, not Android Chrome hardware'}));
