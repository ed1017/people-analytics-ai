import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
import {homeForecastAnswer} from '../../lib/home-forecast.ts';
import {dismissHomeOnboarding} from './dismiss-home-onboarding.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3492',output=process.env.CAVEAT_OUTPUT??'/tmp/home-caveats',before=process.env.CAVEAT_BEFORE==='1';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});await mkdir(output,{recursive:true});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width] of [['desktop',1366],['mobile',390]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const answer=homeForecastAnswer('Forecast hiring');
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base)return route.abort();if(url.pathname==='/api/chat')return route.fulfill({json:{answer,nextStep:'none'}});if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname==='/api/dashboard'?scopeDashboard(url.search):scopeEnterprise[url.pathname.slice(5)]??{}});return route.continue()});
 try{
  await page.goto(base);await dismissHomeOnboarding(page);await page.getByLabel('Ask Workforce AI',{exact:true}).fill('Explain the available hiring forecast');await page.getByRole('button',{name:'Send overview question',exact:true}).click();
  const content=page.locator('.home-answer').filter({hasText:'opening-cohort start percentage within 90 days'}).last();await content.waitFor();
  await content.locator('table').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/'+mode+'-answer.png'});
  check(mode+' preserves every forecast table value and scope',await content.locator('table').count()===1&&/SIMULATED DEMO.*fixed simulated company-wide population/s.test(await content.innerText())&&/30 Sep 2026/.test(await content.innerText()));
  if(!before){const details=content.locator('[data-answer-evidence-details]');check(mode+' has one collapsed evidence disclosure',await details.count()===1&&!await details.evaluate(node=>node.open)&&await details.getByText(/capacity, savings, ROI/).isHidden());await details.locator('summary').click();check(mode+' repeated explanation can be opened and closed',await details.getByText(/capacity, savings, ROI/).isVisible()&&await details.getByText(/miss unannounced reversals/).isVisible());await details.locator('summary').click();check(mode+' critical uncertainty stays visible with disclosure closed',await content.getByText('Methods unranked; confidence intervals and operational forecasts unavailable.',{exact:true}).isVisible());}
  check(mode+' no overflow or runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0);
 }finally{await context.close()}
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output,before}));
