// Real controls from populated and fresh workspaces; transport is local synthetic only.
import assert from 'node:assert/strict';
import {retentionProposal} from '../fixtures/home-retention-proposal.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {HOME_INSTRUCTIONS_DISMISSED_KEY} from '../../lib/home-onboarding.ts';
import {GUIDED_EXAMPLE_PROMPT} from '../../lib/home-decision-journey.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3477',originalId='qa-existing',originalGoal='QA existing — reduce employee turnover by exactly 2 percentage points over 12 months';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [viewport,width] of [['desktop',1366],['mobile',390]])for(const [scenario,selectedCountry,populated] of [['existing-US','US',true],['existing-all','all',true],['fresh-all','all',false]]){
 const mode=viewport+' '+scenario,scopeName=selectedCountry==='US'?'United States':'All countries',priorDraft='Keep my '+scopeName+' draft',originId=populated?originalId:'';
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(({key,dismiss,value})=>{if(!localStorage.getItem(key)){if(value)localStorage.setItem(key,value);localStorage.setItem(dismiss,'1')}},{key:DECISIONS_STORAGE_KEY,dismiss:HOME_INSTRUCTIONS_DISMISSED_KEY,value:populated?encodeDecisions({version:1,revision:1,goals:{version:1,activeId:originalId,goals:[{id:originalId,statement:originalGoal,context:{constraints:`Country: ${scopeName}. Illustrative budget: $100000. The target is exactly a 2-percentage-point turnover reduction over 12 months. Budget is not approved; all results are assumptions.`,decisions:'',notes:[]}}]},workspaces:{}}):null});
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.href==='https://va.vercel-scripts.com/v1/script.debug.js')return route.fulfill({contentType:'application/javascript',body:''});if(url.origin!==base){external++;return route.abort()}if(url.pathname==='/api/chat'){const body=req.postDataJSON();posts.push(body);return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:retentionProposal(body.goalContext.goal)}:{answer:'Review the requested turnover target with the saved assumptions. No retention effect is predicted.',nextStep:'none'}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue()});
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),guide=page.getByRole('dialog',{name:'Optional guided demo'}),country=page.getByLabel('Country',{exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const chooseCountry=async value=>{await page.waitForFunction(()=>document.querySelector('[aria-label=Country] option[value=US]'));if(!await country.isVisible())await page.getByText('Filters',{exact:true}).click();await country.selectOption(value)};
 const open=async()=>{await button('Show instructions').click();await button('Try a guided example').click();await guide.getByRole('button',{name:'Next → Start example',exact:true}).click();await guide.getByRole('heading',{name:/^Step 2/}).waitFor();await button('Send overview question').click();await guide.getByRole('heading',{name:/^Step 3/}).waitFor();};
 try{
  await page.goto(base);await input.waitFor();await chooseCountry(selectedCountry);
  if(populated){await button('Generate Action Plan').click();await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).waitFor();await page.locator('[data-plan-current=true]').waitFor();await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan attached\./}).waitFor();}
  await input.fill(priorDraft);const initial=await state(),goalsBefore=initial.goals.goals.length,originalIds=initial.goals.goals.map(goal=>goal.id);
  const originalPlans=value=>JSON.stringify(originalIds.map(id=>[id,value.workspaces[id]?.fields.homeSolutionBundlesV1??null]));
  const originalRecords=originalPlans(initial);
  check(mode+' begins in the intended source scope and workspace',await country.inputValue()===selectedCountry&&initial.goals.activeId===originId&&(populated?await panel.getByRole('tab').count()===3&&initial.workspaces[originalId].fields.homeSolutionBundlesV1.attachments.length===1:posts.length===0));
  for(const keepMarker of [true,false]){
   const label=mode+(keepMarker?' retained marker':' edited marker');
   await open();check(label+' submission keeps source scope in a separate exploration',await country.inputValue()===selectedCountry&&(await state()).goals.activeId===''&&posts.at(-1).message===GUIDED_EXAMPLE_PROMPT);
   await button('Edit').click();const editor=page.getByLabel('Problem to pin',{exact:true}),candidate=await editor.inputValue();await editor.fill('QA ea584af guide: '+(keepMarker?candidate:candidate.replace(' (demo example)','')));const edited=await editor.inputValue();
   const calls=posts.length;await button('Cancel edit').click();check(label+' cancelling edit neither saves nor advances',await guide.getByRole('heading',{name:/^Step 3/}).isVisible()&&(await state()).goals.goals.length===goalsBefore+(keepMarker?0:1)&&posts.length===calls);
   await button('Edit').click();await editor.fill(edited);await button('Pin edited goal').click();await guide.getByRole('heading',{name:/^Step 4/}).waitFor();await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).waitFor();
   const saved=await state(),id=saved.goals.activeId;check(label+' pin saves once and advances after the real receipt',id.startsWith('guided-')&&saved.goals.goals.length===goalsBefore+(keepMarker?1:2)&&saved.goals.goals.find(goal=>goal.id===id).statement===edited&&await country.inputValue()===selectedCountry&&posts.length===calls+1);
   check(label+' original saved plans and attachment remain exact',originalPlans(saved)===originalRecords);
   await panel.getByRole('tab',{name:'Action Plan #2',exact:true}).click();await guide.getByRole('heading',{name:/^Step 5/}).waitFor();await button('Attach Action Plan').click();await guide.getByRole('heading',{name:/^Step 6/}).waitFor();
   const snapshot=(await state()).workspaces[id].fields.homeSolutionBundlesV1.attachments[0];check(label+' attached plan keeps edited goal and exact target constraints',snapshot.draft.binding.goal===edited&&snapshot.draft.inputs.scope.months.value===12&&snapshot.draft.inputs.budget.amount.value===100000&&snapshot.draft.inputs.successMeasure.target.value==='2 percentage-point reduction');
   await button('Exit guide').click();await guide.waitFor({state:'hidden'});check(label+' exit returns to the original workspace and unfinished draft',(await state()).goals.activeId===originId&&await input.inputValue()===priorDraft&&await country.inputValue()===selectedCountry);
  }
  await open();await button('Edit').click();await page.getByLabel('Problem to pin',{exact:true}).fill('Scope change: '+GUIDED_EXAMPLE_PROMPT.replace(' (demo example)',''));
  const beforeScope=JSON.stringify((await state()).goals.goals),scopeCalls=posts.length;await chooseCountry('CA');await page.getByRole('region',{name:'Pin this problem',exact:true}).waitFor({state:'hidden'});
  check(mode+' country change invalidates the offered edited pin',JSON.stringify((await state()).goals.goals)===beforeScope&&posts.length===scopeCalls&&await guide.getByRole('heading',{name:/^Step 3/}).isVisible()&&await button('Pin edited goal').count()===0);
  await button('Exit guide').click();await guide.waitFor({state:'hidden'});await chooseCountry(selectedCountry);await button('Show instructions').waitFor();
  await open();await button('Edit').click();await page.getByLabel('Problem to pin',{exact:true}).fill('Failed QA: '+GUIDED_EXAMPLE_PROMPT.replace(' (demo example)',''));
  const beforeFailure=JSON.stringify(await state()),failureCalls=posts.length;
  await page.evaluate(()=>{const original=Storage.prototype.setItem;window.restoreGuideStorage=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=function(key,value){if(key==='insights-to-action.decisions.v1')throw new DOMException('Synthetic save failure','QuotaExceededError');return original.call(this,key,value)};});
  await button('Pin edited goal').click();await page.getByRole('status').filter({hasText:/could not be saved/}).first().waitFor();
  check(mode+' storage failure saves nothing and does not advance or prepare',await guide.getByRole('heading',{name:/^Step 3/}).isVisible()&&JSON.stringify(await state())===beforeFailure&&posts.length===failureCalls);
  await page.evaluate(()=>window.restoreGuideStorage());await button('Exit guide').click();await guide.waitFor({state:'hidden'});
  check(mode+' browser stays local without runtime errors',errors.length===0&&external===0);
 }catch(error){console.log('GUIDE',await guide.allTextContents());console.log('STATUS',await page.getByRole('status').allTextContents());console.log('SELECTION',await page.getByLabel('Selected goal',{exact:true}).inputValue());console.log('EDITOR',await page.getByLabel('Problem to pin',{exact:true}).allTextContents());await page.screenshot({path:'/tmp/pr176-guide-existing-us-'+mode+'.png',fullPage:true});throw error}finally{await context.close()}
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
