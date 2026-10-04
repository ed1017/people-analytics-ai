// Built app, synthetic response fixtures only. Run Next locally on :3100.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {emptyWorkforcePlanInput} from '../../lib/workforce-increment.ts';
import {validateClarificationResult} from '../../lib/workforce-clarification.ts';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const at='2026-10-03T01:00:00.000Z',goal='Synthetic sparse workforce intake review';
const statement='SYNTHETIC DISPOSABLE TEST, review only. Plan 2 additional AI Engineer positions in Data & AI, starting January 2027 over 12 months, with coverage required by December 2027. Compare 0 Build, 0 Move and 2 external hires; assume 0 backfills. Hiring arrival dates, costs and budget are unknown. Propose inputs and ask about missing assumptions. Do not save inputs, run calculations or approve actions.';
const catalog={business_units:[{org_code:'DATA_AI',org_name:'Data & AI'}],job_profiles:[{job_profile_code:'AI_ENGINEER',job_profile_name:'AI Engineer'}],combinations:[{org_code:'DATA_AI',job_profile_code:'AI_ENGINEER'}]};
const changes=[['businessUnit','DATA_AI','Data & AI'],['jobProfile','AI_ENGINEER','AI Engineer'],['intent','additional','additional'],['roles','2','2 additional'],['planningMonth','2027-01','January 2027'],['months','12','12 months'],['deadlineMonth','2027-12','December 2027'],['build','0','0 Build'],['move','0','0 Move'],['buy','2','2 external hires'],['backfills','0','0 backfills']].map(([field,value,evidence])=>({field,value,evidence}));
const proposal=validateClarificationResult({summary:'Review the sparse synthetic planning inputs.',questions:['Which hiring arrival assumption should be used?'],changes},{goal,statement,inputs:emptyWorkforcePlanInput()},catalog);
const seed={version:1,revision:1,goals:{version:1,activeId:'goal-intake',goals:[{id:'goal-intake',statement:goal},{id:'goal-other',statement:'Other synthetic goal'}]},workspaces:{'goal-intake':{savedAt:at,fields:{owner:'Retain synthetic owner',workforceCatalog:{as_of:'2026-09-30',...catalog}}},'goal-other':{savedAt:at,fields:{owner:'Other owner'}}}};
const output=await fs.mkdtemp('/tmp/workforce-intake-isolated-'),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const width of [1366,390]){
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:900}}),page=await context.newPage(),errors=[];let mode='success',calls=0,nonlocal=0,calculations=0;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'){nonlocal++;return route.abort()}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(url.pathname==='/api/workforce-solution/intake'){
   calls++;const request=route.request().postDataJSON();check(width+' exact planning-only request envelope',JSON.stringify(Object.keys(request).sort())===JSON.stringify(['goal','inputs','statement'])&&request.statement===statement&&!JSON.stringify(request).includes('owner'));
   if(mode==='success')return route.fulfill({json:proposal});
   if(mode==='known')return route.fulfill({status:502,json:{error:'PRIVATE_PROVIDER_PAYLOAD',diagnostic:'invalid-model-proposal-5-planningMonth-value-not-supported'}});
   if(mode==='unknown')return route.fulfill({status:502,json:{error:'PRIVATE_PROVIDER_PAYLOAD',diagnostic:'PRIVATE_DIAGNOSTIC'}});
   if(mode==='malformed')return route.fulfill({status:502,contentType:'text/plain',body:'PRIVATE_PROVIDER_NON_JSON'});
   return route.abort('failed');
  }
  if(url.pathname==='/api/workforce-solution')calculations++;
  return route.fulfill({status:503,json:{error:'Fixture unavailable'}});
 });
 await page.addInitScript(({key,encoded})=>{if(!localStorage.getItem(key))localStorage.setItem(key,encoded)},{key:DECISIONS_STORAGE_KEY,encoded:encodeDecisions(seed)});
 await page.goto('http://127.0.0.1:3100/',{waitUntil:'domcontentloaded'});await page.getByText('Quantify an option',{exact:true}).click();await page.getByRole('button',{name:'Review numbers',exact:true}).click();await page.getByRole('radio',{name:/^Yes — additional roles/}).check();await page.getByRole('button',{name:'Confirm goal and review inputs',exact:true}).click();
 const workspace=page.getByRole('region',{name:'Workforce solution workspace',exact:true}),button=name=>workspace.getByRole('button',{name,exact:true}),state=()=>page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key)).payload;return {goals:data.goals,solution:data.workspaces['goal-intake'].fields.workforceSolution,owner:data.workspaces['goal-intake'].fields.owner,other:data.workspaces['goal-other']}},DECISIONS_STORAGE_KEY);
 const before=JSON.stringify(await state());await workspace.getByLabel('Planning statement',{exact:true}).fill(statement);await button(/^(Clarify statement with AI|Use details from my statement)$/).click();await button('Review proposed changes').waitFor();
 check(width+' successful sparse proposal neither saves nor calculates',JSON.stringify(await state())===before&&calculations===0);
 await button('Review proposed changes').click();await button('Show all input fields').click();
 for(const [label,value] of [['Planning start month (YYYY-MM)','2027-01'],['Required coverage month (YYYY-MM)','2027-12'],['Planning horizon (months)','12'],['Build: existing employees after development','0'],['Move: existing employees already ready','0'],['Buy: external hires','2'],['Additional external backfills for internal moves (explicit 0 if none)','0'],['Explicit hire arrival (YYYY-MM-DD)',''],['Incremental cash budget over this horizon (USD)',''],['Annual loaded cost per external hire (USD)','']])check(width+' exact reviewed draft '+label,await workspace.getByLabel(label,{exact:true}).inputValue()===value);
 check(width+' review remains temporary, other goal preserved',JSON.stringify(await state())===before);
 await page.screenshot({path:output+`/intake-${width}.png`,fullPage:true});
 for(const failure of ['known','unknown','malformed','network']){
  await page.reload({waitUntil:'domcontentloaded'});mode=failure;await workspace.getByLabel('Planning statement',{exact:true}).fill(statement);await button(/^(Clarify statement with AI|Use details from my statement)$/).click();await workspace.getByRole('status').filter({hasText:'Clarification could not be validated'}).waitFor();
  const text=await workspace.innerText();check(width+' '+failure+' failure is safe and leaves prior records',!text.includes('PRIVATE_')&&JSON.stringify(await state())===before&&await button('Review proposed changes').count()===0);
  check(width+' '+failure+' only allowlisted diagnostics displayed',failure==='known'?text.includes('Diagnostic: invalid-model-proposal-5-planningMonth-value-not-supported.'):!text.includes('Diagnostic:'));
 }
 check(width+' exact five mocked submissions and zero calculations/live traffic',calls===5&&calculations===0&&nonlocal===0&&errors.length===0);
 check(width+' viewport fits',await page.evaluate(w=>innerWidth===w&&document.documentElement.scrollWidth<=w,width));await context.close();
}console.log(`${checks} isolated intake browser checks passed; screenshots: ${output}`)}finally{await browser.close()}
