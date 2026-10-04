// Fixture-only local UI regression; start Next on 127.0.0.1:3100 first.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import {workforceReviewFixture} from '../fixtures/workforce-review.mjs';
import {calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';
import fs from 'node:fs/promises';
import {encodeDecisions} from '../../lib/local-decisions.ts';
import {emptyDecisionBrief} from '../../lib/decision-brief.ts';
const baseURL=process.env.WORKFORCE_QA_BASE_URL ?? 'http://127.0.0.1:3100';
const output=process.env.WORKFORCE_QA_OUTPUT ?? '/tmp/workforce-evidence-qa';
await fs.mkdir(output,{recursive:true});
const results=[];
const check=(name,ok)=>{console.log(name+': '+Boolean(ok));results.push({name,pass:Boolean(ok)});if(!ok)throw Error(name)};
const fixture=workforceReviewFixture(),key='insights-to-action.decisions.v1',goal='Compare three additional Engineer positions in Technology';
const seed={version:1,revision:1,goals:{version:1,activeId:'goal-a',goals:[{id:'goal-a',statement:goal},{id:'goal-b',statement:'Unrelated goal'}]},workspaces:{'goal-a':{savedAt:fixture.calculatedAt,fields:{brief:{...emptyDecisionBrief(),owner:'Keep local owner',observed:'Keep local notes'},chat:{messages:[],input:'',problem:null,questionUnanswered:false}}}}};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
 for(const width of [1366,390]) {
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];let modelCalls=0,calculationCalls=0,unmocked=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname!=='127.0.0.1'){unmocked++;return route.abort();}
   if(!url.pathname.startsWith('/api/'))return route.continue();
   if(url.pathname==='/api/workforce-solution/intake'){
    modelCalls++;const body=req.postDataJSON();check(width+' model envelope excludes local owner',!JSON.stringify(body).includes('Keep local'));
    return route.fulfill({json:{summary:'Review three additional roles.',questions:[],changes:[{field:'roles',value:'3',evidence:'three'}],draft:fixture.input}});
   }
   if(url.pathname==='/api/workforce-solution'){
    calculationCalls++;const input=req.postDataJSON(),response=structuredClone(fixture);response.input=input;
    response.proposed=calculateWorkforceIncrement(input,null);response.hireOnly=calculateWorkforceIncrement({...input,build:'0',move:'0',buy:input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},null);
    if(calculationCalls>1){response.response.internal_talent_readiness.candidate_pool.role_ready=5;response.timing.opening_to_start.median_days=60;}
    return route.fulfill({json:response});
   }
   return route.fulfill({status:503,json:{error:'Deliberately unavailable in fixture-only QA.'}});
  });
  await page.addInitScript(({key,seed})=>{if(!localStorage.getItem(key))localStorage.setItem(key,seed);},{key,seed:encodeDecisions(seed)});
  await page.goto(baseURL,{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByText('Quantify an option',{exact:true}).click();await page.getByRole('button',{name:'Review numbers',exact:true}).click();
  await page.getByRole('radio',{name:/^Yes/}).check();
  await page.getByRole('button',{name:'Confirm goal and review inputs',exact:true}).click();
  const workspace=page.getByRole('region',{name:'Workforce solution workspace',exact:true});
  const expandSupporting=async()=>{for(const label of ['Explore more options','Saved alternative reviews','Source evidence and supporting pages','Calculation evidence and methodology','Approval records','Saved calculations']){const summary=workspace.locator('summary').filter({hasText:new RegExp('^'+label+'$')});if(await summary.count()&&!await summary.evaluate(el=>el.parentElement.open))await summary.click()}};
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,key);
  await workspace.getByLabel('Planning statement',{exact:true}).fill('Plan three additional Engineer positions in Technology.');
  await workspace.getByRole('button',{name:/^(Clarify statement with AI|Use details from my statement)$/,exact:true}).click();
  await workspace.getByRole('button',{name:'Review proposed changes',exact:true}).click();
  check(width+' proposal does not save or calculate',(await state()).workspaces['goal-a'].fields.workforceSolution.versions.length===1&&calculationCalls===0);
  check(width+' draft blocks calculate',await workspace.getByRole('button',{name:/^Calculate (options|saved assumptions and compare hiring-only)$/,exact:true}).isDisabled());
  await workspace.getByRole('button',{name:'Save reviewed inputs',exact:true}).click();
  await workspace.getByRole('button',{name:/^Calculate (options|saved assumptions and compare hiring-only)$/,exact:true}).click();
  await workspace.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).waitFor();await expandSupporting();
  check(width+' Home scope and limits',(await workspace.innerText()).includes('3 additional Engineer positions in Technology')&&(await workspace.innerText()).includes('feasibility unverified'));
  await workspace.locator('summary').filter({hasText:'Review local alternatives'}).click();
  const localSearch=workspace.getByRole('region',{name:'Bounded local scenario search',exact:true});
  check(width+' production bounds are blank before explicit search',await localSearch.getByLabel('build min bound',{exact:true}).inputValue()==='');
  for(const path of ['build','move','buy']){await localSearch.getByLabel(path+' min bound',{exact:true}).fill('0');await localSearch.getByLabel(path+' max bound',{exact:true}).fill('3');}
  await localSearch.getByRole('checkbox',{name:'I confirm these bounds and the unchanged cost/timing assumptions for this comparison.',exact:true}).check();
  await localSearch.getByRole('button',{name:'Run local mix search',exact:true}).click();
  await localSearch.getByLabel('Select build-0-move-3-buy-0',{exact:true}).waitFor();
  check(width+' built Next worker completes without API requests',modelCalls===1&&calculationCalls===1&&(await localSearch.innerText()).includes('10 mixes evaluated'));
  await localSearch.getByLabel('Select build-0-move-3-buy-0',{exact:true}).check();
  await workspace.getByRole('button',{name:'Review selected mixes',exact:true}).click();await workspace.getByRole('button',{name:'Replace alternative drafts',exact:true}).waitFor();
  await workspace.getByRole('button',{name:'Cancel selected mixes',exact:true}).click();
  check(width+' built worker selection cancel leaves original draft',await workspace.getByLabel('Alternative 1: Build count',{exact:true}).inputValue()==='1');
  await workspace.locator('summary').filter({hasText:'Review local alternatives'}).click();
  await workspace.getByRole('button',{name:'Inspect Skills evidence',exact:true}).click();await expandSupporting();
  await workspace.getByRole('button',{name:'Review response assumptions',exact:true}).waitFor();
  check(width+' saved skills visible',(await workspace.innerText()).includes('Whole-role ready: 2. Near ready: 4.')&&(await workspace.innerText()).includes('Synthetic analysis'));
  await workspace.getByRole('button',{name:'Review response assumptions',exact:true}).click();
  check(width+' response editor focus',await page.evaluate(()=>document.activeElement?.tagName==='FIELDSET'&&document.activeElement.textContent.includes('Which response mix')));
  await workspace.getByLabel('Approval note for this solution version (local record only)',{exact:true}).fill('Review fixture only');
  await workspace.getByLabel('Total training cash (USD)',{exact:true}).fill('4000');
  check(width+' dirty draft blocks approval',await workspace.getByRole('button',{name:'Record version-specific approval note',exact:true}).isDisabled());
  check(width+' dirty draft blocks inspection',await workspace.getByRole('button',{name:'Inspect hiring timing evidence',exact:true}).isDisabled());
  await workspace.getByRole('button',{name:'Save reviewed inputs',exact:true}).click();
  check(width+' saved edit stales previous result',(await workspace.innerText()).includes('Historical result: assumptions changed; recalculate before approval.'));
  check(width+' edit preserves result evidence',(await state()).workspaces['goal-a'].fields.workforceSolution.results[0].payload.input.trainingCash==='3000');
  check(width+' stale result blocks approval',await workspace.getByRole('button',{name:'Record version-specific approval note',exact:true}).isDisabled());
  await workspace.getByRole('button',{name:/^Calculate (options|saved assumptions and compare hiring-only)$/,exact:true}).click();
  await workspace.getByRole('heading',{name:'Calculated decision brief — version 3',exact:true}).waitFor();await expandSupporting();
  check(width+' explicit recalculation updates snapshot',(await workspace.innerText()).includes('Whole-role ready: 5.'));
  await workspace.locator('summary').filter({hasText:'Review local alternatives'}).click();
  const alternatives=workspace.getByRole('region',{name:'Local workforce alternatives',exact:true});
  const baseBeforeAlternatives=JSON.stringify((await state()).workspaces['goal-a'].fields.workforceSolution);
  await alternatives.getByLabel('Alternative 1: Training cash (USD)',{exact:true}).fill('0');
  await alternatives.getByRole('button',{name:'Calculate alternatives locally',exact:true}).click();
  await alternatives.getByRole('button',{name:'Save reviewed alternatives',exact:true}).waitFor();
  check(width+' alternative preview is local and unsaved',modelCalls===1&&calculationCalls===2&&!(await state()).workspaces['goal-a'].fields.workforceAlternativeReviews&&(await alternatives.innerText()).includes('$19,500'));
  await alternatives.getByLabel('Alternative 1: Training cash (USD)',{exact:true}).fill('100');
  check(width+' changed alternative requires fresh preview',await alternatives.getByRole('button',{name:'Save reviewed alternatives',exact:true}).count()===0);
  await alternatives.getByLabel('Alternative 1: Training cash (USD)',{exact:true}).fill('0');
  await alternatives.getByRole('button',{name:'Add second alternative',exact:true}).click();
  await alternatives.getByLabel('Alternative 2: Training cash (USD)',{exact:true}).fill('1000');
  await alternatives.getByRole('button',{name:'Calculate alternatives locally',exact:true}).click();
  await alternatives.getByRole('button',{name:'Save reviewed alternatives',exact:true}).waitFor();
  await alternatives.getByRole('button',{name:'Save reviewed alternatives',exact:true}).click();await expandSupporting();
  await workspace.getByRole('heading',{name:'Saved local alternative reviews (1)',exact:true,includeHidden:true}).waitFor({state:'attached'});
  const localHistory=(await state()).workspaces['goal-a'].fields.workforceAlternativeReviews;
  check(width+' two alternatives retained with four deterministic comparisons',localHistory.length===1&&localHistory[0].reviewedRevisions.length===2&&localHistory[0].comparisons.length===4);
  check(width+' alternatives preserve base evidence and approvals',JSON.stringify((await state()).workspaces['goal-a'].fields.workforceSolution)===baseBeforeAlternatives);
  await workspace.getByRole('button',{name:'Record version-specific approval note',exact:true}).click();
  let saved=(await state()).workspaces['goal-a'].fields;
  check(width+' local notes preserved',saved.brief.owner==='Keep local owner'&&saved.brief.observed==='Keep local notes');
  check(width+' approval version-specific',saved.workforceSolution.approvals[0].version===3);
  await workspace.getByRole('combobox',{name:/^Inspect a saved calculation/}).selectOption(saved.workforceSolution.results[0].id);await expandSupporting();
  await workspace.locator('summary').filter({hasText:'Review local alternatives'}).click();
  check(width+' historical base blocks alternative preview',await alternatives.getByRole('button',{name:'Calculate alternatives locally',exact:true}).isDisabled());
  check(width+' historic Skills snapshot restored',(await workspace.innerText()).includes('Whole-role ready: 2.'));
  await workspace.getByRole('button',{name:'Inspect L&D pathways',exact:true}).click();await expandSupporting();
  check(width+' L&D snapshot gaps',(await workspace.innerText()).includes('shortest course 12 hours')&&(await workspace.innerText()).includes('Training cash: USD 3000'));
  await workspace.getByRole('button',{name:'Review training assumptions',exact:true}).click();
  check(width+' training editor uses current inputs',await workspace.getByLabel('Total training cash (USD)',{exact:true}).inputValue()==='4000');
  check(width+' training editor focus',await page.evaluate(()=>document.activeElement?.tagName==='FIELDSET'&&document.activeElement.textContent.includes('Training assumptions')));
  await workspace.getByRole('button',{name:'Inspect hiring timing evidence',exact:true}).click();await expandSupporting();
  check(width+' TA shows historical paired timing',(await workspace.innerText()).includes('Historical median: 45 days')&&(await workspace.innerText()).includes('2025-10-01 to 2026-09-30'));
  await workspace.getByRole('button',{name:'Review timing assumptions',exact:true}).click();
  check(width+' timing editor focus',await page.evaluate(()=>document.activeElement?.tagName==='FIELDSET'&&document.activeElement.textContent.includes('When would each path')));
  await workspace.getByRole('button',{name:'Return to this goal on Home',exact:true}).click();await expandSupporting();
  await workspace.locator('summary').filter({hasText:'Hiring · historical timing and arrival assumption'}).click();
  await workspace.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/review-${width}.png`});
  await workspace.getByRole('region',{name:'Evidence used for this workforce solution',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/evidence-${width}.png`});
  check(width+' no workspace horizontal overflow',await workspace.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.reload({waitUntil:'domcontentloaded'});
  await workspace.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).waitFor();await expandSupporting();
  saved=(await state()).workspaces['goal-a'].fields;
  check(width+' reload preserves selected historic result',saved.workforceInspection===saved.workforceSolution.results[0].id&&saved.workforceSolution.approvals.length===1);
  check(width+' reload preserves separate alternative history',saved.workforceAlternativeReviews.length===1&&saved.workforceAlternativeReviews[0].reviewedRevisions[0].trainingCash==='0');
  check(width+' no writes to unrelated goal',!(await state()).workspaces['goal-b']);
  await page.getByLabel('Selected goal',{exact:true}).selectOption('goal-b');
  await page.getByRole('button',{name:'Generate options for this goal',exact:true}).waitFor();
  check(width+' other goal has no selected solution',await workspace.count()===0);
  await page.getByLabel('Selected goal',{exact:true}).selectOption('goal-a');
  await workspace.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).waitFor();await expandSupporting();
  check(width+' switching back restores historical inspection',(await state()).workspaces['goal-a'].fields.workforceInspection===saved.workforceInspection);
  await workspace.getByRole('button',{name:'Open decision notes for this calculation',exact:true}).click();
  const notes=page.getByRole('region',{name:'Decision brief',exact:true}),savedComparison=notes.getByRole('region',{name:'Saved workforce comparison',exact:true});
  await savedComparison.waitFor();
  check(width+' notes page recognizes workforce result',!(await notes.innerText()).includes('No completed calculations saved for this goal.')&&(await savedComparison.innerText()).includes('Workforce comparison · version 2'));
  check(width+' notes page marks historical snapshot',(await savedComparison.innerText()).includes('Historical workforce comparison')&&(await savedComparison.innerText()).includes('$22,500'));
  await notes.getByRole('textbox',{name:/^Calculation notes/}).fill('Keep this user-authored interpretation.');
  check(width+' notes cannot rewrite calculations',(await state()).workspaces['goal-a'].fields.workforceSolution.results.length===2);
  await savedComparison.getByRole('button',{name:'Review this workforce calculation on Home',exact:true}).click();
  await workspace.getByRole('heading',{name:'Calculated decision brief — version 2',exact:true}).waitFor();await expandSupporting();
  check(width+' notes navigation retains selection',(await state()).workspaces['goal-a'].fields.workforceInspection===saved.workforceInspection);
  check(width+' decision writing preserved',(await state()).workspaces['goal-a'].fields.brief.calculations==='Keep this user-authored interpretation.');
  const intact=await state();
  for(const [name,mutate,message] of [
   ['broken lifecycle',solution=>{solution.versions=[]},'This saved workforce solution cannot be read safely.'],
   ['malformed result',solution=>{solution.results[0].payload.input=null},'This saved workforce calculation cannot be read safely.'],
   ['forged role',solution=>{const payload=solution.results[0].payload;for(const input of [payload.input,payload.proposed.input,payload.hireOnly.input])input.jobProfile='OTHER'},'This saved workforce calculation cannot be read safely.'],
   ['wrong goal',solution=>{solution.goalId='goal-b'},'This saved workforce solution cannot be read safely.'],
  ]){
   const damaged=structuredClone(intact);mutate(damaged.workspaces['goal-a'].fields.workforceSolution);
   const before=JSON.stringify(damaged.workspaces['goal-a'].fields.workforceSolution);
   await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key,value:encodeDecisions(damaged)});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.getByRole('status').filter({hasText:message}).waitFor();
   check(width+' '+name+' guarded after checksum-valid reload',await page.getByRole('button',{name:'Record version-specific approval note',exact:true}).count()===0&&await page.getByRole('button',{name:'Start guided workforce plan',exact:true}).count()===0);
   check(width+' '+name+' retained original record',JSON.stringify((await state()).workspaces['goal-a'].fields.workforceSolution)===before);
  }
  check(width+' only explicit fixture calls',modelCalls===1&&calculationCalls===2);
  check(width+' no browser runtime errors',errors.length===0);
  results.push({name:width+' blocked nonlocal browser requests',count:unmocked});
  await context.close();
 }
} catch(e) {results.push({error:e.message});process.exitCode=1;} finally {await browser.close();await fs.writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
