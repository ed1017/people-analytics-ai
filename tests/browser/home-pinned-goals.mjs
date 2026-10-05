// Production Home shell; synthetic endpoints and browser-owned records only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {bundleProposalFixture} from '../fixtures/home-bundles.mjs';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {actionBinding,actionBindingKey} from '../../lib/home-action-drafts.ts';
import {createBundleDraft,reconcileBundle,reviseBundleDraft,bundleInputKey} from '../../lib/home-bundle-reconciliation.ts';
import {saveBundleCalculationPatch,attachBundlePatch} from '../../lib/home-bundle-records.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const baseUrl=process.env.HOME_BASE_URL??'http://127.0.0.1:3108',output=await fs.mkdtemp(path.join(os.tmpdir(),'home-pinned-goals-'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
const goals=[{id:'saved',statement:'Review a saved workforce plan'},{id:'empty',statement:'Explore a separate staffing question'},{id:'retained',statement:'Review retained plan records'}];
const entered=value=>({value,kind:'user-entered',basis:'Explicit synthetic fixture.'});
function savedWorkspace(binding){
 const draft=createBundleDraft(bundleProposalFixture(binding.goal).bundles[1],binding);
 Object.assign(draft.inputs.scope,{population:entered('Original cohort'),startMonth:entered('2027-01'),months:entered(6),capacityRequired:entered(false)});
 const confirm=value=>({confirmed:true,bindingKey:actionBindingKey(value.binding),inputKey:bundleInputKey(value),acknowledgeUnknowns:true});
 const first=attachBundlePatch(saveBundleCalculationPatch(undefined,draft,reconcileBundle(draft)).value,draft,confirm(draft),'first','2026-10-05T00:00:00.000Z').value;
 const inputs=structuredClone(draft.inputs);inputs.scope.population=entered('Saved reviewed cohort');
 const revised=reviseBundleDraft(draft,inputs);
 return attachBundlePatch(saveBundleCalculationPatch(first,revised,reconcileBundle(revised)).value,revised,confirm(revised),'second','2026-10-05T01:00:00.000Z','first').value;
}
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let count=20,unexpected=0,delayed=false,release=null,emptyReply=false;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==baseUrl){unexpected++;return route.abort();}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);assert.equal(body.message,'Prepare coordinated solution bundles for my exact pinned goal.');
   const proposal=emptyReply?{version:1,goal:body.goalContext.goal,bundles:[],question:null,unavailableReason:'No supported combination is available in this synthetic fixture.'}:bundleProposalFixture(body.goalContext.goal);
   if(delayed)await new Promise(resolve=>release=resolve);
   return route.fulfill({json:{proposal}}).catch(()=>{});
  }
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:count,fte:18,open_positions:3,snapshot_date:'2026-09-30',voluntary_turnover_ytd_pct:4,labor_cost_usd:1000000},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}});
  if(url.pathname.startsWith('/api/')){if(request.method()!=='GET')unexpected++;return route.fulfill({status:503,json:{error:'Synthetic source unavailable.'}});}
  return route.continue();
 });
 const chatState=input=>({messages:[],input,problem:null,questionUnanswered:false});
 const retainedBinding=await actionBinding('retained',goals[2].statement,{sources:[]},{});
 const seed={version:1,revision:1,goals:{version:1,activeId:'',goals},workspaces:{saved:{savedAt:'2026-10-05T00:00:00.000Z',fields:{chat:chatState('Saved goal draft'),sentinel:{keep:true}}},empty:{savedAt:'2026-10-05T00:00:00.000Z',fields:{chat:chatState('Separate goal draft')}},retained:{savedAt:'2026-10-05T00:00:00.000Z',fields:{homeSolutionBundlesV1:savedWorkspace(retainedBinding)}}}};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true}),rail=page.getByRole('complementary',{name:'Pinned Goals',exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const select=index=>rail.getByRole('button',{name:'Open goal: '+goals[index].statement,exact:true}).click();
 await page.goto(baseUrl);await chat.waitFor();await button('Intro & instructions').waitFor();
 check(mode+' obsolete Guide & Data navigation removed',await page.getByRole('button',{name:/Guide & Data/}).count()===0&&await page.getByRole('heading',{name:'Guide & Data',exact:true}).count()===0);
 check(mode+' collapsed intro precedes Questions to explore',await button('Intro & instructions').getAttribute('aria-expanded')==='false'&&!await page.getByText('From question to action',{exact:true}).isVisible()&&await button('Intro & instructions').evaluate(node=>Boolean(node.compareDocumentPosition([...document.querySelectorAll('h3')].find(item=>item.textContent==='Questions to explore'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 await chat.fill('Keep my general draft');await button('Intro & instructions').focus();await page.keyboard.press('Enter');
 check(mode+' keyboard toggle exposes tailoring and explicit-action distinctions',await button('Intro & instructions').getAttribute('aria-expanded')==='true'&&await page.getByText('Tailor it to your needs, adjust assumptions, calculate and attach it to your goal.',{exact:false}).isVisible()&&await page.getByText(/Applying values to planning tools requires a separate review/).isVisible()&&await button('Try a guided example').isVisible());
 await button('Intro & instructions').click();check(mode+' instructions toggling preserves draft and makes no model request',await chat.inputValue()==='Keep my general draft'&&posts.length===0);
 check(mode+' context hint is compact and associated with the input',await chat.getAttribute('aria-describedby')==='overview-question-context-tip'&&await page.locator('#overview-question-context-tip').innerText()==='Best practice: Add context like your timeline, budget, stakeholders and relevant sources to help shape a more precise goal.'&&await page.locator('#overview-question-context-tip').evaluate(node=>getComputedStyle(node).fontSize==='12px'));
 await button('Open data details').click();check(mode+' Data details retains essential demo and source disclosures',await page.getByRole('dialog',{name:'Data details',exact:true}).getByText(/company records are synthetic, not real employee data/).isVisible()&&await page.getByRole('dialog',{name:'Data details',exact:true}).getByText(/survey provenance and scoring thresholds are not fully verified/).isVisible());await button('Close data details').click();
 if(mode==='desktop')check('desktop rail occupies the former right column and stays top-aligned',await rail.evaluate(node=>{const r=node.getBoundingClientRect(),main=document.querySelector('.home-workspace > section').getBoundingClientRect();return r.left>=main.right&&Math.abs(r.top-main.top)<2}));
 await page.screenshot({path:path.join(output,mode+'-getting-started.png')});
 await select(0);await button('Create Action Plan').waitFor();
 check(mode+' selecting an empty goal restores its draft and focuses the plan without a request',posts.length===0&&await chat.inputValue()==='Saved goal draft'&&await panel.getByRole('heading',{name:'Action Plans for your goal',exact:true}).evaluate(node=>node===document.activeElement)&&await rail.getByText('No plan yet',{exact:true}).count()===2);
 await button('Create Action Plan').click();await panel.getByRole('article').waitFor();check(mode+' only explicit Create Action Plan prepares once and preserves draft',posts.length===1&&await chat.inputValue()==='Saved goal draft'&&await rail.getByText('Plan saved',{exact:true}).count()===1);
 const data=await state(),binding=data.workspaces.saved.fields.homeBundlePreparationV1.binding,workspace=savedWorkspace(binding);data.workspaces.saved.fields.homeSolutionBundlesV1=workspace;data.revision++;
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(data)});await page.reload();await panel.getByRole('article',{name:'Action Plan option 2',exact:true}).waitFor();
 const savedBytes=JSON.stringify(workspace);
 check(mode+' reload opens attached option B without another request or version write',posts.length===1&&JSON.stringify((await state()).workspaces.saved.fields.homeSolutionBundlesV1)===savedBytes);
 check(mode+' restoring a saved plan does not inject fresh pilot assumptions or stale its calculation',await panel.getByRole('region',{name:'Editable illustrative starting assumptions'}).count()===0&&await panel.getByText(/The previous calculation is retained as stale/).count()===0);
 await button('Edit assumptions and plan').click();await page.getByRole('region',{name:'Action Plan editor'}).getByLabel('Aggregate population',{exact:true}).fill('Unsaved working cohort');await chat.fill('Unfinished saved-goal question');
 await select(1);check(mode+' goal switch keeps the separate chat draft and does not prepare',await chat.inputValue()==='Separate goal draft'&&posts.length===1);await select(0);await button('Edit assumptions and plan').click();
 check(mode+' returning restores unsaved option edits and exact chat draft',await page.getByRole('region',{name:'Action Plan editor'}).getByLabel('Aggregate population',{exact:true}).inputValue()==='Unsaved working cohort'&&await chat.inputValue()==='Unfinished saved-goal question'&&posts.length===1);
 check(mode+' saved versions and unrelated fields remain unchanged',JSON.stringify((await state()).workspaces.saved.fields.homeSolutionBundlesV1)===savedBytes&&(await state()).workspaces.saved.fields.sentinel.keep);
 await select(2);check(mode+' orphaned saved plans remain visible for reference with review status',await panel.getByRole('region',{name:'Saved Action Plan records',exact:true}).isVisible()&&await rail.getByText('Saved plan needs review',{exact:true}).count()===1&&posts.length===1);
 await select(1);delayed=true;release=null;await button('Create Action Plan').click();for(let i=0;!release&&i<100;i++)await page.waitForTimeout(10);assert.ok(release);await select(0);delayed=false;release();await page.waitForTimeout(100);await select(1);
 check(mode+' switching goals invalidates a late preparation without saving it',posts.length===2&&(await state()).workspaces.empty.fields.homeBundlePreparationV1===undefined&&await button('Create Action Plan').isVisible());
 emptyReply=true;await button('Create Action Plan').click();await panel.getByText(/No supported combination is available/).first().waitFor();
 check(mode+' a valid empty preparation still exposes explicit Create Action Plan',posts.length===3&&await button('Create Action Plan').isEnabled());
 emptyReply=false;await button('Create Action Plan').evaluate(node=>{node.click();node.click();});await panel.getByRole('article').waitFor();check(mode+' duplicate explicit creation starts one request',posts.length===4);
 await select(0);count=21;await page.getByText('More questions',{exact:true}).click();await button('Refresh overview evidence').click();await panel.getByText(/Previous Action Plan proposal/).waitFor();
 check(mode+' evidence change keeps stale guards and all saved versions',await button('Edit assumptions and plan').isDisabled()&&JSON.stringify((await state()).workspaces.saved.fields.homeSolutionBundlesV1)===savedBytes&&posts.length===4);
 await page.screenshot({path:path.join(output,mode+'-saved-plan.png')});
 check(mode+' responsive layout and runtime/network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
