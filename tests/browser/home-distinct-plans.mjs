// Production shell, intercepted synthetic APIs only; no live model-quality claim.
import assert from 'node:assert/strict';
import {bundleProposalFixture,bundleWireFixture} from '../fixtures/home-bundles.mjs';
import {inspectBundleResponse} from '../../lib/home-bundle-response.ts';
import {DECISIONS_STORAGE_KEY,encodeDecisions} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3219';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];
 let kind='client-duplicate',headcount=100,unexpected=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){unexpected++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);assert.equal(body.message,'Prepare coordinated solution bundles for my exact pinned goal.');
   const p=bundleProposalFixture(body.goalContext.goal);
   if(kind.includes('duplicate'))p.bundles[1]={...structuredClone(p.bundles[0]),id:'B',name:'Renamed identical plan'};
   if(kind==='one')p.bundles=p.bundles.slice(0,1);
   if(kind==='server-duplicate'){const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(bundleWireFixture(p))}),body.goalContext.goal,body.overviewBriefingContext);return route.fulfill({status:502,json:result});}
   return route.fulfill({json:{proposal:p}});
  }
  if(url.pathname.startsWith('/api/')){if(req.method()!=='GET'){unexpected++;return route.abort()}return route.fulfill({json:{overview:{headcount,fte:headcount,open_positions:3,snapshot_date:'2026-09-30'}}});}
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await page.goto(base);await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'g',goals:[{id:'g',statement:'Review workforce alternatives'},{id:'other',statement:'Review onboarding'}]},workspaces:{other:{savedAt:'2026-10-06T00:00:00Z',fields:{sentinel:'Keep other work'}}}})});await page.reload();
 await button('Create Action Plan').click();await button('Retry Action Plans').waitFor();
 check(mode+' client rejects renamed activities without partial tabs or saving',await panel.getByRole('tab').count()===0&&!(await state()).workspaces.g?.fields.homeBundlePreparationV1&&posts.length===1);
 check(mode+' existing alert explains the problem and explicit retry',await panel.getByRole('alert').innerText().then(text=>text.includes('Different titles alone are not distinct plans')&&text.includes('No retry runs automatically')));
 await page.reload();await button('Create Action Plan').waitFor();check(mode+' reload never retries rejected preparation',posts.length===1);
 kind='one';await button('Create Action Plan').focus();await page.keyboard.press('Enter');await page.locator('[data-plan-current="true"]').waitFor();
 check(mode+' one supported option is accepted without invented alternatives',await panel.getByRole('tab').count()===1&&posts.length===2);
 await button('Attach Action Plan').click();await panel.getByRole('status').filter({hasText:/Action Plan attached/}).waitFor();
 const original=(await state()).workspaces.g.fields;
 check(mode+' one click attaches only the actual returned option',original.homeSolutionBundlesV1.attachments.length===1&&posts.length===2);
 headcount=101;kind='server-duplicate';await page.reload();await panel.getByText(/Previous Action Plan proposal/).waitFor();await button('Prepare Action Plans').click();await button('Retry Action Plans').waitFor();
 const failed=(await state()).workspaces.g.fields;
 check(mode+' server duplicate diagnostic is explained without another request',await panel.getByRole('alert').innerText().then(text=>text.includes('duplicate_plans')&&text.includes('Different titles alone'))&&posts.length===3);
 check(mode+' failed fresh alternatives preserve previous preparation and attachment',JSON.stringify(failed.homeBundlePreparationV1)===JSON.stringify(original.homeBundlePreparationV1)&&JSON.stringify(failed.homeSolutionBundlesV1)===JSON.stringify(original.homeSolutionBundlesV1)&&await button('Attach Action Plan').isDisabled());
 await page.reload();await panel.getByText(/Previous Action Plan proposal/).waitFor();check(mode+' stale reload preserves saved work without retry',posts.length===3);
 kind='distinct';await button('Prepare Action Plans').click();await page.locator('[data-plan-current="true"]').waitFor();
 check(mode+' explicit recovery shows three actual distinct activity graphs',await panel.getByRole('tab').count()===3&&posts.length===4);
 await button('Compare Action Plans').click();check(mode+' comparison includes the three returned approaches',await page.getByRole('region',{name:'Action Plan comparison'}).getByRole('article').count()===3);await button('Hide comparison').click();
 check(mode+' recovery leaves old attachment and other goal untouched',JSON.stringify((await state()).workspaces.g.fields.homeSolutionBundlesV1.attachments)===JSON.stringify(original.homeSolutionBundlesV1.attachments)&&(await state()).workspaces.other.fields.sentinel==='Keep other work');
 const legacy=await state(),p=legacy.workspaces.g.fields.homeBundlePreparationV1.proposal;p.bundles[1]={...structuredClone(p.bundles[0]),id:'B',name:'Legacy renamed plan'};legacy.revision++;
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(legacy)});await page.reload();await page.locator('[data-plan-current="true"]').waitFor();
 check(mode+' saved legacy copies remain readable without rewrite or request',await panel.getByRole('tab').count()===3&&(await state()).workspaces.g.fields.homeBundlePreparationV1.proposal.bundles[1].name==='Legacy renamed plan'&&posts.length===4);
 check(mode+' responsive runtime and network boundaries',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&unexpected===0);
 await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
