import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
// Actual composer states in a local production build; all evidence/model transport
// is intercepted. Observation mode records the same flow on pre-fix commits.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {retentionProposal} from '../fixtures/home-retention-proposal.mjs';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {DECISIONS_STORAGE_KEY,DECISION_RECOVERY_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3393',observe=process.env.SEND_POSITION_OBSERVE==='1',output=process.env.SEND_POSITION_OUTPUT;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const goal='Reduce turnover by 2 percentage points over 12 months with a $100,000 demo budget.';
let checks=0;const report={},check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
if(output)await mkdir(output,{recursive:true});
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['reflow',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let release,hold=false,posts=0,external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort()}if(url.pathname==='/api/chat'){posts++;if(hold)await new Promise(resolve=>release=resolve);const body=request.postDataJSON();return route.fulfill({json:body.message==='Prepare coordinated solution bundles for my exact pinned goal.'?{proposal:retentionProposal(body.goalContext.goal)}:{answer:'The requested target is a 2-percentage-point reduction over 12 months with a $100,000 demo budget. A matching baseline and population are unknown.',nextStep:'none'}})}if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue()});
 const input=page.getByLabel('Ask Workforce AI',{exact:true}),send=page.getByRole('button',{name:'Send overview question',exact:true}),pin=page.locator('[data-guide-target="pin"]');
 const states=report[mode]={};
 const capture=async name=>{
  await send.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const geometry=await send.evaluate(button=>{const row=button.parentElement.getBoundingClientRect(),rect=button.getBoundingClientRect(),hint=document.getElementById('overview-question-context-tip');return {left:rect.left,right:rect.right,width:rect.width,rowLeft:row.left,rowRight:row.right,rightGap:row.right-rect.right,hintHidden:hint.hidden,disabled:button.disabled,painted:button.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2))}});
  states[name]=geometry;
  check(mode+' '+name+' has one reachable Send without overflow',await send.count()===1&&geometry.painted&&geometry.left>=0&&geometry.right<=width&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(!observe)check(mode+' '+name+' keeps Send at the action row right edge',Math.abs(geometry.rightGap)<=1&&Math.abs(geometry.width-states.empty.width)<=1);
  if(output&&['empty','submitted','resubmitting','recovered'].includes(name))await page.screenshot({path:output+'/'+mode+'-'+name+'.png'});
 };
 try{
  await page.goto(base);await dismissHomeOnboarding(page);await input.waitFor();await capture('empty');check(mode+' empty Send is disabled',await send.isDisabled());
  await input.fill('A short draft');await capture('text');check(mode+' populated Send is enabled',await send.isEnabled());
  const long=Array.from({length:20},(_,i)=>'Line '+i+': keep the complete request.').join('\n');await input.fill(long);await capture('long-text');check(mode+' long draft is retained',await input.inputValue()===long);
  await input.fill(goal);hold=true;await send.click();await page.getByLabel('AI answer status',{exact:true}).waitFor();await capture('loading');check(mode+' loading Send is disabled',await send.isDisabled());hold=false;release();await pin.waitFor();await capture('submitted');
  await input.fill(goal);await capture('followup-text');hold=true;await send.click();await page.getByLabel('AI answer status',{exact:true}).waitFor();await capture('resubmitting');hold=false;release();await pin.waitFor();
  await pin.click();await page.getByRole('tab',{name:'Action Plan #1',exact:true}).waitFor();await page.locator('[data-plan-current="true"]').waitFor();await capture('pinned');
  await input.fill('In Action Plan #1 set coordination hours to 24');await capture('plan-edit');await send.click();await page.getByRole('tab',{name:'Action Plan #4',exact:true}).waitFor();await capture('edit-submitted');
  // A real failed browser-storage write creates a recovery journal; reloading and
  // using Retry saving exercises the actual recovered composer, not a styled mock.
  await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===key)throw new DOMException('Synthetic quota failure','QuotaExceededError');return original.call(this,k,v)}},DECISIONS_STORAGE_KEY);
  const recovered='In Action Plan #1 set coordination hours to 26';await input.fill(recovered);await page.getByRole('button',{name:'Retry saving',exact:true}).waitFor();await capture('save-failed');
  check(mode+' failed draft has a recovery journal',await page.evaluate(key=>!!sessionStorage.getItem(key),DECISION_RECOVERY_KEY));await page.reload();await page.getByRole('button',{name:'Retry saving',exact:true}).waitFor();await capture('recovered');check(mode+' recovery keeps exact draft',await input.inputValue()===recovered);
  await page.getByRole('button',{name:'Retry saving',exact:true}).click();await page.locator('[data-plan-current="true"]').waitFor();await capture('recovery-saved');await send.click();await page.getByRole('tab',{name:'Action Plan #5',exact:true}).waitFor();await capture('recovery-submitted');
  check(mode+' local edits and recovery do not replay model calls',posts===3&&external===0&&errors.length===0);
  console.log(JSON.stringify({mode,states}));
 }finally{release?.();await context.close()}
}}finally{await browser.close();if(output)await writeFile(output+'/geometry.json',JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify({checks,observe}));
