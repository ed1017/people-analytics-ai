// Local browser fixtures exercising real Home controls and the production response inspector.
// These are not hosted or live-model checks; actual RPC aggregate checks are recorded separately.
import assert from 'node:assert/strict';
import {inspectHomeChatResponse} from '../../lib/home-chat-response.ts';
import {scopedDashboardResponse,dashboardRequestedFilters} from '../../lib/dashboard-scope.ts';
import {workforce as workforceFixture} from '../fixtures/theme-audit-data.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3386';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;const check=(label,value)=>{assert.ok(value,label);checks++;console.log('PASS '+label)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),posts=[],errors=[];let responseMode='valid',answer='The selected workforce snapshot is available. [W1]',external=0;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=request.postDataJSON();posts.push(body);const result=inspectHomeChatResponse({status:'completed',output_text:JSON.stringify({answer,next_step:'none',problem:null,problem_evidence:[],options:[],question:null})},false,body.overviewBriefingContext,4000,false);
   return route.fulfill({status:result.ok?200:502,json:result.body});
  }
  if(url.pathname.startsWith('/api/')){
   const key=url.pathname.slice(5);let data=key==='dashboard'?scopeDashboard(url.search):key==='workforce'?workforceFixture:scopeEnterprise[key]??{};
   if(key==='dashboard'&&responseMode==='mismatch')data=scopedDashboardResponse({...data,applied_filters:{country:'CA',org:'all',level:'all'}},dashboardRequestedFilters(url.searchParams));
   if(key==='dashboard'&&responseMode==='missing'){data=structuredClone(data);delete data.workforce_filter_scope;}
   return route.fulfill({json:data});
  }
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true});
 await page.goto(base);const filters=page.locator('.workforce-filter-disclosure');if(width<768)await filters.locator('summary').click();await page.getByLabel('Country',{exact:true}).selectOption('US');
 await button('Open data details').click();const details=page.getByRole('dialog',{name:'Data details'}),scope=details.getByRole('region',{name:'How filters affect evidence'});await scope.getByText(/United States; All business units; All levels/).waitFor();
 check(mode+' effective catalogue scope appears in Data details',await scope.getByText(/effective scope cannot be verified/).isVisible());await button('Close data details').click();
 const bad=['The United States scenario has 15,000 employees. [P1, A1]','## United States\n- Recorded exits were 400. [A1]','The United States global scenario has 15,000 employees. [P1]','**United States turnover was 8%. [A1]**','Use the United States turnover rate of 8% [A1] to prioritize manager support.'];
 for(let i=0;i<bad.length;i++){
  answer=bad[i];const question='Explain the current workforce evidence '+i+'.';await chat.fill(question);await button('Send overview question').click();await page.getByRole('alert').filter({hasText:'The answer mixed selected filters with company-wide evidence.'}).waitFor();
  check(mode+' contradiction '+i+' stays out of the visible answer and keeps request',await chat.inputValue()===question&&await page.getByText(answer,{exact:true}).count()===0);
 }
 answer='United States headcount is 250 [W1]. Company-wide voluntary exits were 400 [A1].';await chat.fill('Explain the current workforce evidence clearly.');await button('Send overview question').click();await page.getByLabel('Overview conversation',{exact:true}).getByText(/United States headcount is 250/).waitFor();
 const pack=posts.at(-1).overviewBriefingContext,W1=pack.sources.find(source=>source.id==='W1'),A1=pack.sources.find(source=>source.id==='A1');check(mode+' factual sources retain different effective scopes',W1.facts.headcount===250&&W1.scope.includes('United States')&&A1.scope==='Company-wide; unfiltered'&&A1.facts.voluntary_exits===400);
 for(const invalid of ['mismatch','missing']){
  responseMode=invalid;await button('Open data details').click();await details.getByRole('button',{name:'Refresh overview evidence',exact:true}).click();await button('Open data details').click();await scope.getByText(/Scope unavailable/i).waitFor();await button('Close data details').click();
  answer='The filtered workforce evidence is unavailable after '+invalid+' scope; company-wide voluntary exits were 400 [A1].';await chat.fill('Explain available evidence after '+invalid+' scope.');await button('Send overview question').click();await page.getByLabel('Overview conversation',{exact:true}).getByText(new RegExp('The filtered workforce evidence is unavailable after '+invalid)).waitFor();
  const request=posts.at(-1),source=request.overviewBriefingContext.sources.find(item=>item.id==='W1');check(mode+' '+invalid+' scope receipt withholds W1 facts and retains user filter',source.facts===null&&source.status==='unavailable'&&request.overviewBriefingContext.workforceScope==='Scope unavailable'&&await page.getByLabel('Country',{exact:true}).inputValue()==='US');
 }
 await page.screenshot({path:'/tmp/post175-source-scope-'+mode+'.png',fullPage:true});
 if(width<768)await button('Open navigation').click();await page.locator('[data-nav-destination="workforce"]').click();
 const snapshot=page.locator('section.evidence-workspace').filter({has:page.getByRole('heading',{name:'Selected workforce snapshot',exact:true})});
 for(const invalid of ['missing','mismatch']){
  responseMode=invalid;await page.getByLabel('Country',{exact:true}).selectOption('all');await page.getByLabel('Country',{exact:true}).selectOption('US');
  await snapshot.getByText('Unavailable for these filters',{exact:true}).waitFor();
  await snapshot.getByText(invalid==='missing'?/The effective dashboard scope could not be verified/:/Returned applied filters do not match/).waitFor();
  const card=snapshot.getByText('Headcount',{exact:true}).locator('..');
  check(mode+' actual dashboard '+invalid+' receipt withholds the prior scope',await snapshot.getByText(/Workforce evidence is unavailable for these filters/).isVisible()&&(await card.innerText()).includes('—')&&!(await card.innerText()).includes('250')&&await page.getByLabel('Country',{exact:true}).inputValue()==='US');
 }
 await page.screenshot({path:'/tmp/post175-dashboard-scope-'+mode+'.png',fullPage:true});check(mode+' responsive scope flow has no runtime or external traffic errors',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks,verification:'local fixtures with production inspector; not hosted/live-model'}));
