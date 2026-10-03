// Entirely intercepted local fixture, using real Home/composer and AI-panel components.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'contextual-prompts-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/contextual-prompts.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
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
 const home=page.getByLabel('Ask Workforce AI',{exact:true});
 await suggestions().getByRole('button',{name:/recorded separation/}).waitFor();
 // Let the pre-existing automatic goal takeaway settle, then measure suggestion effects separately.
 await page.getByText('Synthetic response',{exact:true}).waitFor();
 const baseline=posts;const first=suggestions().getByRole('button').first(),text=await first.innerText();await first.focus();await page.keyboard.press('Enter');
 check(width+' keyboard example drafts and focuses without model',await home.inputValue()===text&&await home.evaluate(el=>el===document.activeElement)&&posts===baseline);
 await home.fill('Keep my unfinished question');check(width+' draft prevents replacement',await suggestions().getByRole('button').first().isDisabled());
 await page.getByRole('button',{name:'Previous discussion',exact:true}).click();check(width+' stage changes examples while retaining draft',await home.inputValue()==='Keep my unfinished question'&&await suggestions().getByRole('button',{name:/revise/}).count()===1);
 await page.getByRole('button',{name:'skills goal',exact:true}).click();await suggestions().getByRole('button',{name:/skill requirements/}).waitFor();
 check(width+' goal changes evidence topic',await home.inputValue()==='');await home.fill('Keep skills draft');
 await page.getByRole('button',{name:'retention goal',exact:true}).click();check(width+' return restores goal draft',await home.inputValue()==='Keep my unfinished question');
 await home.fill('');await page.getByRole('button',{name:'Switch goal with queued example',exact:true}).click();
 check(width+' queued prior-goal example cannot overwrite restored goal draft',await home.inputValue()==='Keep skills draft');
 await page.getByRole('button',{name:'retention goal',exact:true}).click();
 await home.fill('');await page.getByRole('button',{name:'Queue draft with example',exact:true}).click();
 check(width+' queued current-goal draft wins over stale empty-draft render',await home.inputValue()==='Queued unfinished question');
 await home.fill('');missing=true;await page.getByRole('button',{name:'Refresh overview evidence',exact:true}).click();await suggestions().getByRole('button',{name:/missing for my goal/}).waitFor();
 check(width+' unknown evidence removes confident topic',await suggestions().getByRole('button').count()===1);
 await page.getByRole('button',{name:'Toggle panel',exact:true}).click();const panel=page.getByLabel('Ask People Analytics AI',{exact:true});const panelBaseline=posts;
 await suggestions().getByRole('button').first().click();check(width+' panel example drafts without sending',Boolean(await panel.inputValue())&&posts===panelBaseline&&await panel.evaluate(el=>el===document.activeElement));
 await panel.fill('');await page.getByRole('button',{name:'Switch goal with queued example',exact:true}).click();
 check(width+' panel queued example cannot overwrite another goal draft',await panel.inputValue()==='Keep skills draft');
 await page.getByRole('button',{name:'retention goal',exact:true}).click();
 await panel.fill('Keep panel draft');await page.getByRole('button',{name:'Toggle panel evidence',exact:true}).click();check(width+' missing page evidence preserves draft',await panel.inputValue()==='Keep panel draft'&&await suggestions().getByRole('button').first().isDisabled());
 await panel.fill('');await suggestions().getByRole('button').first().click();check(width+' missing evidence example remains editable but send unavailable',Boolean(await panel.inputValue())&&await page.getByRole('button',{name:'Send message',exact:true}).isDisabled()&&posts===panelBaseline);
 const data=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 check(width+' no solution, approval or pins created',data.workspaces.retention.fields.owner==='Keep owner'&&data.workspaces.retention.fields.workforceSolutionPins.length===0&&!data.workspaces.retention.fields.workforceSolution);
 check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(width+' no external requests or runtime errors',unexpected===0&&errors.length===0);
 await page.screenshot({path:path.join(output,`prompts-${width}.png`),fullPage:true});await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output,engine:'Linux Chromium; Pixel 7 emulation, not Android Chrome hardware'}));
