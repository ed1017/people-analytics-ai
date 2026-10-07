import assert from 'node:assert/strict';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3181';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin!==base){external++;return route.abort();}
  if(url.pathname==='/api/chat'){posts.push(request.postDataJSON());return route.fulfill({json:{answer:'FTE means full-time equivalent.',nextStep:'none'}});}
  if(url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:123,fte:120,open_positions:3,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[{value:'CA',label:'Canada'}],business_units:[],levels:[]}}});
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:123,fte:120,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true}),selector=page.getByLabel('Selected goal',{exact:true}),rail=page.getByRole('complementary',{name:'Pinned Goals'}),panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const select=goal=>rail.getByRole('button',{name:'Open goal: '+goal,exact:true}).click();
 await page.goto(base);await page.getByRole('dialog',{name:'Home instructions',exact:true}).waitFor();await button('Close instructions').click();await rail.getByText('Example plan attached',{exact:true}).first().waitFor();
 check(mode+' first run retains General exploration and starter prompts',await selector.inputValue()===''&&await page.getByRole('region',{name:'Starting guide'}).isVisible()&&await rail.getByText('Demo example',{exact:true}).count()===3&&posts.length===0);
 if(!await page.getByLabel('Country',{exact:true}).isVisible())await page.getByText('Filters',{exact:true}).click();await page.getByLabel('Country',{exact:true}).selectOption('CA');
 await chat.fill('Keep my general draft');
 for(let n=0;n<2;n++){await button('Show instructions').focus();await page.keyboard.press('Enter');check(mode+' keyboard opens instructions '+n,await page.getByRole('dialog',{name:'Home instructions',exact:true}).isVisible());await button('Close instructions').click();check(mode+' closing instructions returns focus '+n,await button('Show instructions').evaluate(node=>node===document.activeElement));}
 await select('Reduce turnover');await panel.getByRole('heading',{name:'Manager check-ins',exact:true}).waitFor();
 check(mode+' demo selection is local and preserves filters',posts.length===0&&await page.getByLabel('Country',{exact:true}).inputValue()==='CA'&&await panel.getByText('Demo example',{exact:true}).isVisible());
 const first=(await state()).workspaces['demo-reduce-turnover'].fields.homeSolutionBundlesV1.attachments[0];
 await panel.getByText('Attached Action Plans and version history (1)',{exact:true}).click();
 check(mode+' demo card and saved history agree on assumed cash',first.result.cashTotal===3000&&await panel.getByText(/Assumed cash \$3,000 USD/).count()>0&&await panel.getByText(/Snapshot cash: \$3,000 USD/).isVisible());
 await panel.getByText('Attached Action Plans and version history (1)',{exact:true}).click();
 await chat.fill('set participants to 14');await button('Send overview question').click();await button('Apply changes').waitFor();await button('Apply changes').click();if(await page.getByRole('checkbox').count())await page.getByRole('checkbox').check();await button('Attach Action Plan').click();await page.getByRole('status').filter({hasText:/Action Plan #2 attached/}).waitFor();
 let data=await state(),versions=data.workspaces['demo-reduce-turnover'].fields.homePlanAlternativesV1;
 check(mode+' chat edit and one-click attach keep history without requests',posts.length===0&&versions.attachments.length===1&&versions.plans[1].draft.inputs.groups[0].count.value===14&&JSON.stringify(data.workspaces['demo-reduce-turnover'].fields.homeSolutionBundlesV1.attachments[0])===JSON.stringify(first));
 await button('Collapse Action Plan').focus();await page.keyboard.press('Enter');check(mode+' keyboard collapses latest plan',await button('Show Action Plan').isVisible()&&await button('Attach Action Plan').count()===0);
 await select('Close AI skill gaps');await panel.getByRole('heading',{name:'Build AI skills',exact:true}).waitFor();
 check(mode+' switching shows only selected goal plan',await panel.getByRole('article').count()===1&&await panel.getByRole('heading',{name:'Manager check-ins',exact:true}).count()===0&&posts.length===0);
 await select('Reduce turnover');await button('Show Action Plan').waitFor();await button('Show Action Plan').click();await page.reload();await panel.getByRole('heading',{name:'Manager check-ins',exact:true}).waitFor();
 data=await state();check(mode+' reload preserves latest draft, attachments and exactly three goals',data.goals.goals.length===3&&data.workspaces['demo-reduce-turnover'].fields.homePlanAlternativesV1.attachments.length===1&&posts.length===0);
 await button('Reset conversation').click();check(mode+' reset returns to exploration without duplicating examples',await selector.inputValue()===''&&await page.getByRole('region',{name:'Starting guide'}).isVisible()&&(await state()).goals.goals.length===3);
 await button('Show instructions').click();await button('Close instructions').click();await page.getByRole('region',{name:'Starting guide'}).getByRole('button').first().click();await page.getByText('FTE means full-time equivalent.',{exact:true}).last().waitFor();
 check(mode+' starter submission keeps dismissed instructions closed without deleting goals',await button('Show instructions').isVisible()&&!await page.getByText('From question to action',{exact:true}).isVisible()&&(await state()).goals.goals.length===3);
 await button('Show instructions').click();await page.keyboard.press('Escape');await chat.fill('What does FTE mean?');await button('Send overview question').click();await button('Show instructions').waitFor();check(mode+' typed submission keeps instructions closed after Escape',!await page.getByText('From question to action',{exact:true}).isVisible());
 await button('Reset conversation').click();await button('Show instructions').click();await button('Try a guided example').focus();await page.keyboard.press('Enter');
 check(mode+' guided entry hides starter and competing intro',await page.getByRole('region',{name:'Optional guided demo'}).isVisible()&&await page.getByRole('region',{name:'Starting guide'}).count()===0&&!await page.getByText('From question to action',{exact:true}).isVisible());
 await button('Exit guide').click();await select('Close AI skill gaps');await button('Read or edit Focused issue: Close AI skill gaps').click();page.once('dialog',dialog=>dialog.accept());await button('Remove goal').click();await page.reload();await rail.waitFor();
 check(mode+' deliberate removal survives reload',await rail.getByRole('button',{name:'Open goal: Close AI skill gaps'}).count()===0&&(await state()).goals.goals.length===2);
 await select('Reduce turnover');await panel.getByRole('heading',{name:'Manager check-ins',exact:true}).waitFor();await page.screenshot({path:'/tmp/home-demo-goals-'+mode+'.png',fullPage:true});
 console.log(JSON.stringify({mode,errors,external,reflow:await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth])}));check(mode+' 390px and keyboard flows have no overflow or runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0&&external===0);
 await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({checks}));
