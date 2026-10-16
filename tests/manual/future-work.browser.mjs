// Isolated goal fixture; block paid AI and all network writes. No production state is altered.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.FUTURE_BASE_URL||'http://127.0.0.1:4199';
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox']});
const seed=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'future-qa',goals:[{id:'future-qa',statement:'Review fictional task workload'}]},workspaces:{}});
try {for(const width of [1440,390]){
 const c=await b.newContext({viewport:{width,height:900}});await c.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,seed);},{key:DECISIONS_STORAGE_KEY,seed});const p=await c.newPage(),errors=[],blocked=[];p.on('pageerror',e=>errors.push(e.message));
 await c.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==origin||r.method()!=='GET'){blocked.push(u.pathname);return route.abort();}if(!process.env.FUTURE_FIXTURES||!u.pathname.startsWith('/api/'))return route.continue();try{return route.fulfill({contentType:'application/json',body:await fs.readFile(process.env.FUTURE_FIXTURES+'/history-'+u.pathname.slice(5)+'.json','utf8')});}catch{return route.fulfill({status:503,json:{error:'Unavailable fixture'}});}});
 const future=async()=>{const nav=p.locator('.app-sidebar');if(!await nav.isVisible())await p.getByRole('button',{name:'Open navigation',exact:true}).click();await nav.getByRole('button',{name:'Future of Work',exact:true}).click();await p.getByRole('heading',{name:'How could the work change?',exact:true}).waitFor();};
 const begin=async()=>{await p.getByRole('button',{name:'Try fictional task example',exact:true}).click();};
 const review=async()=>p.getByRole('button',{name:'Review handoff to Scenarios',exact:true}).click();
 const use=()=>p.getByRole('button',{name:'Use reviewed example in Scenarios',exact:true});
 await p.goto(origin+'/?page=future-of-work',{timeout:90000});await begin();
 if(process.env.FUTURE_OUTPUT_DIR)await p.screenshot({path:process.env.FUTURE_OUTPUT_DIR+'/future-summary-'+width+'.png',fullPage:true});
 await p.getByText('Adjust assumptions',{exact:true}).click();
 await p.getByRole('slider',{name:'Adoption slider',exact:true}).focus();await p.keyboard.press('ArrowRight');assert.equal(await p.getByRole('textbox',{name:'Adoption',exact:true}).inputValue(),'51');
 await p.getByRole('textbox',{name:'Adoption',exact:true}).fill('');assert.equal(await p.getByRole('button',{name:'Review handoff to Scenarios',exact:true}).isDisabled(),true);await p.getByRole('textbox',{name:'Adoption',exact:true}).fill('50');
 assert.match(await p.getByLabel('Task time results',{exact:true}).innerText(),/64 hours/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(process.env.FUTURE_OUTPUT_DIR)await p.screenshot({path:process.env.FUTURE_OUTPUT_DIR+'/future-example-'+width+'.png',fullPage:true});
 await review();await use().click();const scope=p.getByRole('region',{name:'Workload capacity planning',exact:true});await scope.waitFor();assert.equal(await scope.getByRole('textbox',{name:'Hours per item',exact:true}).inputValue(),'0.92');
 await scope.getByRole('textbox',{name:'Hours per item',exact:true}).fill('0.95');await future();await begin();await review();assert.equal(await use().isDisabled(),true);await p.getByRole('button',{name:'Cancel handoff',exact:true}).click();await p.getByRole('button',{name:'Enter manual scenario assumptions',exact:true}).click();assert.equal(await scope.getByRole('textbox',{name:'Hours per item',exact:true}).inputValue(),'0.95');
 await future();await begin();await review();await p.getByRole('checkbox',{name:/Replace my current unsaved Scenarios draft/}).check();await use().click();
 await scope.getByRole('checkbox',{name:/I confirm these values repeat/}).check();await scope.getByRole('button',{name:'Calculate capacity',exact:true}).click();await scope.getByRole('textbox',{name:'Capacity scenario name',exact:true}).fill('Fictional task review');await scope.getByRole('button',{name:'Save scenario',exact:true}).click();await scope.getByRole('combobox',{name:'Saved capacity scenario',exact:true}).selectOption({label:'Fictional task review'});
 await p.reload();await p.getByRole('region',{name:'Workload capacity planning',exact:true}).waitFor();await p.getByRole('combobox',{name:'Saved capacity scenario',exact:true}).selectOption({label:'Fictional task review'});await p.getByRole('button',{name:'Open saved scenario',exact:true}).click();assert.equal(await scope.getByRole('textbox',{name:'Hours per item',exact:true}).inputValue(),'0.92');assert.match(await scope.getByLabel('Scenario origin',{exact:true}).innerText(),/adoption 50%/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(process.env.FUTURE_OUTPUT_DIR)await p.screenshot({path:process.env.FUTURE_OUTPUT_DIR+'/future-reopened-'+width+'.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);console.log(JSON.stringify({width,linkedControls:true,blankBlocked:true,cancelPreservedDraft:true,reopenedEffort:0.92,originRetained:true,errors,blocked}));await c.close();
}}finally{await b.close();}
