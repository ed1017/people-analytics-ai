// Real production UI with intercepted evidence/model transport and archived saved-plan fixtures.
// This verifies recovery of pre-fix local data, not hosted/live-model behavior.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {retentionProposal} from '../fixtures/home-retention-proposal.mjs';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
import {bundleInputKey} from '../../lib/home-bundle-reconciliation.ts';
import {actionBindingKey} from '../../lib/home-action-drafts.ts';
import {saveBundleCalculationPatch,attachBundlePatch} from '../../lib/home-bundle-records.ts';
import {reconcileBundle} from '../../lib/home-bundle-reconciliation.ts';
import {createPlanAlternatives,attachPlanAlternative,packPlanAlternatives,readPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/home-saved-pilot-before-pr175.json',import.meta.url),'utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3385';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]])for(const layout of ['legacy','catalog']){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}if(url.pathname==='/api/chat'){const body=request.postDataJSON();posts.push(body);return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:retentionProposal(body.goalContext.goal)}:{answer:'Your desired reduction is 2 percentage points over 12 months. Baseline and workforce population remain unknown.',nextStep:'none'}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:120,fte:110,open_positions:3,snapshot_date:'2026-09-30'}}});return route.continue()});
 const button=name=>page.getByRole('button',{name,exact:true}),input=page.getByLabel('Ask Workforce AI',{exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY),tag=mode+' '+layout;
 try{
 await page.goto(base);await input.waitFor();await input.fill(fixture.request);await button('Send overview question').click();await page.locator('[data-guide-target="pin"]').click();await page.locator('[data-plan-current="true"]').waitFor();
 const data=await state(),id=data.goals.activeId,fields=data.workspaces[id].fields,binding=fields.homeBundlePreparationV1.binding,scope={goalId:id,goal:fixture.request};
 const oldDrafts=fixture.fullDrafts.map(old=>({...structuredClone(old),binding:structuredClone(binding)}));
 let legacy;for(const draft of oldDrafts)legacy=saveBundleCalculationPatch(legacy,draft,reconcileBundle(draft)).value;
 if(layout==='legacy')legacy=attachBundlePatch(legacy,oldDrafts[0],{confirmed:true,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(oldDrafts[0]),acknowledgeUnknowns:true},'old-attachment','2026-10-01T12:00:00Z').value;
 fields.homeSolutionBundlesV1=legacy;
 if(layout==='catalog'){let catalog=createPlanAlternatives(scope,oldDrafts.map(draft=>({id:draft.bundle.id,draft})));catalog=attachPlanAlternative(catalog,scope,'A',{inputKey:bundleInputKey(oldDrafts[0]),attachmentId:'old-numbered-attachment',at:'2026-10-01T12:00:00Z',acknowledgeUnknowns:true});fields.homePlanAlternativesV1=packPlanAlternatives(catalog);fields.homePlanAlternativeViewV1={version:1,selectedId:'A',collapsed:false};}
 // The only fixture seeding step supplies a genuine old initializer output; all correction,
 // selection, comparison, retry and attachment behavior below uses actual app controls.
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DECISIONS_STORAGE_KEY,raw:encodeDecisions(data)});await page.reload();await page.getByRole('region',{name:'Review saved plan defaults'}).waitFor();
 const savedFields=async()=>(await state()).workspaces[id].fields,catalog=async()=>readPlanAlternatives((await savedFields()).homePlanAlternativesV1,scope),oldLegacy=JSON.stringify((await savedFields()).homeSolutionBundlesV1),oldCatalog=layout==='catalog'?await catalog():null;
 check(tag+' real archived defaults are detected without a write',posts.length===2&&JSON.stringify((await savedFields()).homeSolutionBundlesV1)===oldLegacy&&await panel.getByRole('tab').count()===3);
 await page.getByRole('region',{name:'Review saved plan defaults'}).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/pr176-saved-pilot-offer-'+mode+'-'+layout+'.png'});
 await button('Create corrected alternative').click();await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();let next=await catalog(),corrected=next.plans[3];
 check(tag+' explicit correction creates selected #4 without attaching',next.nextNumber===5&&corrected.operation.kind==='goal-correction'&&!corrected.applied&&next.attachments.length===(oldCatalog?.attachments.length??0)&&await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).getAttribute('aria-selected')==='true');
 check(tag+' exact goal units horizon cash ceiling and unknown baseline/population survive',corrected.draft.inputs.successMeasure.target.value==='2 percentage-point reduction'&&corrected.draft.inputs.successMeasure.baseline.value===null&&corrected.draft.inputs.scope.months.value===12&&corrected.draft.inputs.budget.amount.value===100000&&corrected.result.budget.limit===100000&&corrected.result.budget.headroom===null&&!corrected.draft.inputs.whatIf&&corrected.draft.inputs.groups[0].count.value===null);
 check(tag+' source plans costs dates and history remain byte-preserved',JSON.stringify(next.plans.slice(0,3).map(plan=>plan.draft))===JSON.stringify(oldDrafts)&&JSON.stringify(corrected.draft.inputs.expenses)===JSON.stringify(oldDrafts[0].inputs.expenses)&&JSON.stringify(corrected.draft.inputs.timing)===JSON.stringify(oldDrafts[0].inputs.timing)&&JSON.stringify((await savedFields()).homeSolutionBundlesV1)===oldLegacy&&JSON.stringify(next.attachments)===JSON.stringify(oldCatalog?.attachments??[]));
 await button('Compare Action Plans').click();check(tag+' comparison keeps original and corrected alternatives visible',await page.getByRole('region',{name:'Action Plan comparison'}).getByRole('article').count()===4);await button('Hide comparison').click();
 await panel.getByRole('checkbox').check();await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan #4 attached/}).waitFor();const attached=JSON.stringify((await catalog()).attachments);
 check(tag+' successful explicit attachment preserves prior history',(await catalog()).attachments.at(-1).planId===corrected.id&&JSON.stringify((await savedFields()).homeSolutionBundlesV1)===oldLegacy);
 await page.reload();await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();check(tag+' reopen retains selected #4 and attachments without an AI call',await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).getAttribute('aria-selected')==='true'&&JSON.stringify((await catalog()).attachments)===attached&&posts.length===2);
 await panel.getByRole('tab',{name:'Action Plan #1',exact:true}).click();await button('Create corrected alternative').click();await page.waitForFunction(()=>document.querySelector('[role=tab][data-guide-plan="4"]')?.getAttribute('aria-selected')==='true');
 next=await catalog();check(tag+' repeated correction reuses #4 instead of duplicating saved work',next.nextNumber===5&&next.plans.length===4&&JSON.stringify(next.attachments)===attached&&await panel.getByRole('tab',{name:'Action Plan #4',exact:true}).getAttribute('aria-selected')==='true');
 check(tag+' mobile layout runtime and transport boundaries hold',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0&&posts.length===2);
 }catch(error){console.log(await page.getByRole('alert').allTextContents());await page.screenshot({path:'/tmp/pr176-saved-pilot-failure-'+mode+'-'+layout+'.png',fullPage:true});throw error}finally{await context.close()}
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
