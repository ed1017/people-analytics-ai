// Actual shared components + production CSS; no network, database or AI requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.COMPACT_OUTPUT??'/tmp/compact-output';
await fs.mkdir(output,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/compact-output.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const script=await fs.readFile(output+'/fixture.js','utf8');
const css=(await Promise.all((await fs.readdir('.next/static/chunks')).filter(n=>n.endsWith('.css')).map(n=>fs.readFile('.next/static/chunks/'+n,'utf8')))).join('\n');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const evidence=[];
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width] of [['wide',1920],['desktop',1366],['mobile',390],['narrow',320],['zoom',683]]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.addInitScript(()=>{window.process={env:{}}});
 page.on('pageerror',error=>{errors.push(error.message);console.error(error.message)});
 await page.route('**/*',route=>{const p=new URL(route.request().url()).pathname;if(p==='/')return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style><div id="root"></div><script src="/fixture.js"></script>'});if(p==='/fixture.js')return route.fulfill({contentType:'text/javascript',body:script});throw Error('Unexpected request: '+route.request().url())});
 await page.goto('http://fixture.local');
 const chart=page.getByRole('region',{name:'Headcount scenario',exact:true}),svg=chart.locator('svg');await svg.waitFor();
 await page.waitForFunction(()=>document.querySelector('svg[aria-label="Projected headcount from the active opening snapshot"]').getBoundingClientRect().width>=300);
 const table=page.locator('.home-answer table').first(),original=await table.innerText(),geometry=await table.evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,row:n.rows[1].getBoundingClientRect().height,font:getComputedStyle(n.rows[1].cells[0]).fontSize,padding:getComputedStyle(n.rows[1].cells[0]).paddingTop}));
 const dimensions=await svg.boundingBox();
 check(mode+' chart is 230px high with readable 14px labels',dimensions.height===230&&await svg.locator('text').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).fontSize==='14px')));
 check(mode+' table rows are compact and readable',geometry.row<=35&&geometry.font==='14px'&&geometry.padding==='6px');
 check(mode+' short table fits without forced horizontal scroll',await table.locator('..').evaluate(n=>n.scrollWidth<=n.clientWidth));
 check(mode+' six month values unchanged',/9,985/.test(original)&&/9,910/.test(original)&&await table.locator('tbody tr').count()===6);
 const disclosures=page.locator('[data-assumptions-disclosure]');check(mode+' details initially collapsed',await disclosures.count()===5&&await disclosures.evaluateAll(nodes=>nodes.every(n=>!n.open)));
 const narrative=page.locator('.home-answer').first();
 check(mode+' labelled caveat keeps its numeric qualifier visible at 14px',await narrative.getByText(/This simulated scenario assumes 100 hires/).first().isVisible()&&await narrative.locator('[data-chat-caveat-qualifier]').evaluate(n=>getComputedStyle(n).fontSize==='14px'));
 check(mode+' labelled explanation is collapsed but ordinary prose remains',await narrative.getByText(/The inputs are held steady for illustration/).isHidden()&&await narrative.getByText('This unlabelled caveat sentence stays visible.',{exact:true}).isVisible());
 const narrativeSummary=narrative.locator('details > summary');await narrativeSummary.focus();await page.keyboard.press('Enter');
 check(mode+' keyboard reveals the full model-authored caveat',await narrative.getByText(/Individual departures can vary/).isVisible());await page.keyboard.press('Space');
 const detail=chart.locator('details'),summary=detail.locator('summary'),full=await detail.textContent();
 check(mode+' accessible target and visible qualifiers',await summary.evaluate(n=>n.getBoundingClientRect().height>=44)&&await chart.getByText('Assumption-based scenario, not a trained forecast.',{exact:true}).isVisible());
 await summary.focus();await page.keyboard.press('Enter');check(mode+' Enter expands with focus retained',await detail.evaluate(n=>n.open)&&await summary.evaluate(n=>n===document.activeElement));
 check(mode+' expanded chart has no document overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(mode+' complete monthly detail is available',await detail.getByRole('table').isVisible()&&await detail.getByRole('row').count()===7);
 await chart.screenshot({path:output+'/'+mode+'-expanded.png'});
 await page.keyboard.press('Space');check(mode+' Space collapses',!await detail.evaluate(n=>n.open));
 for(let i=0;i<4;i++)await summary.click();
 check(mode+' repeated toggles preserve content and data',!await detail.evaluate(n=>n.open)&&full===await detail.textContent()&&original===await table.innerText());
 // Exercise every migrated explanation visible in this fixture and preserve it verbatim.
 for(const d of await disclosures.all()){const content=await d.textContent();await d.locator('summary').click();check(mode+' disclosure content retained',await d.evaluate(n=>n.open)&&content===await d.textContent());await d.locator('summary').click();}
 const swp=page.getByRole('region',{name:'Monthly conditional role coverage by plan and target',exact:true});
 check(mode+' planning chart is also bounded with exact point feedback',await swp.locator('svg').evaluate(n=>n.getBoundingClientRect().height===230)&&await swp.locator('circle[tabindex="0"]').count()===6);
 await swp.locator('circle[tabindex="0"]').last().focus();check(mode+' planning point retains accessible value',await swp.locator('circle[tabindex="0"]').last().getAttribute('aria-label')==='Illustrative plan, 2027-03: 12 roles');
 if(width<420){await swp.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);check(mode+' narrow chart scrolls by keyboard inside its region',await swp.evaluate(n=>n.scrollWidth>n.clientWidth&&n.scrollLeft>0));}
 check(mode+' errors and review remain visible' ,await page.getByRole('alert').isVisible()&&await page.getByRole('button',{name:'Review before saving'}).isVisible());
 check(mode+' no document overflow or runtime errors',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&errors.length===0);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:output+'/'+mode+'-collapsed.png'});
 evidence.push({mode,viewport:width,chart:dimensions,table:geometry});await context.close();
}}finally{await browser.close()}
await fs.writeFile(output+'/measurements.json',JSON.stringify({checks,evidence},null,2));console.log(JSON.stringify({checks,output,evidence}));
