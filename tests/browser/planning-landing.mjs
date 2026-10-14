import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
import fs from 'node:fs/promises';
const base=process.env.HOME_BASE_URL||'http://localhost:3510';
const output=process.env.SWP_SCREENSHOT_DIR??'tests/artifacts/planning-landing';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try {for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const errors=[],mutations=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==base)return route.abort();if(!u.pathname.startsWith('/api/'))return route.continue();if(r.method()!=='GET'){mutations.push(u.pathname);return route.abort();}const defaults={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:0,fill_rate_pct:100,productivity_hiring_reduction_pct:0};const data=u.pathname==='/api/workforce-planning'?{scenarios:[]}:u.pathname==='/api/scenario-modeler'?{defaults}:u.pathname==='/api/business-unit-scenario'?{defaults,business_units:[]}:u.pathname==='/api/dashboard'?{overview:{headcount:0,fte:0,snapshot_date:'2026-09-30'},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}:null;return route.fulfill(data?{json:data}:{status:503,json:{error:'Source unavailable in isolated visual check'}});});
 await page.goto(base+'/?page=planning-overview');
 await page.getByText('Try an illustrative demo',{exact:true}).click();
 const area=page.getByRole('region',{name:'Illustrative workforce planning',exact:true});await area.waitFor({timeout:90000});
 await page.evaluate(()=>scrollTo(0,0));
 
 assert.match(await area.innerText(),/4 FTE shortfall/);
 const chart=area.getByRole('img',{name:'Monthly available and required capacity in FTE'});
 const before=await chart.innerHTML();await area.getByLabel('Productivity improvement',{exact:true}).fill('25');
 assert.match(await area.innerText(),/6 FTE surplus/);assert.notEqual(await chart.innerHTML(),before);
 await area.getByRole('slider',{name:'Productivity improvement slider'}).focus();await page.keyboard.press('ArrowRight');assert.equal(await area.getByLabel('Productivity improvement',{exact:true}).inputValue(),'26');
 await area.getByLabel('Monthly hires',{exact:true}).fill('-1');await area.getByRole('alert').waitFor();assert.match(await area.innerText(),/Check your inputs/);
 await area.getByRole('button',{name:'Reset demo'}).click();assert.match(await area.innerText(),/4 FTE shortfall/);
 await page.getByRole('region',{name:'Workload capacity planning',exact:true}).waitFor();await page.getByRole('region',{name:'Workload capacity planning',exact:true}).waitFor();
 assert.equal(await page.getByLabel('Work to plan',{exact:true}).last().inputValue(),'');
 await page.getByRole('region',{name:'Workload capacity planning',exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/${width}-final.png`,fullPage:true});await page.screenshot({path:`${output}/${width}-viewport.png`});assert.ok((await chart.boundingBox()).height>100,'chart remains readable');
 evidence.push({width,errors,mutations,chart:await chart.boundingBox(),guidance:await area.getByRole('complementary').boundingBox()});await context.close();
}}finally{await browser.close();}
await fs.writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
