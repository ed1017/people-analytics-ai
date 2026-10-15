// Run against an accessible app or Preview. Isolated synthetic reads; no goal selection, Calculate, chat or save.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const oneLine=rects=>rects.length>0&&rects.every(rect=>Math.abs(rect.top-rects[0].top)<=1&&Math.abs(rect.bottom-rects[0].bottom)<=1);
// Separate React text nodes on one line are valid; a genuinely wrapped sign/value is not.
assert(oneLine([{top:10,bottom:30},{top:10,bottom:30}]));
assert(!oneLine([{top:10,bottom:30},{top:30,bottom:50}]));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://localhost:3539';
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
const evidence=[];
try { for(const width of [1173,1188,685,390]) {
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],unexpected=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin==='https://va.vercel-scripts.com')return route.abort();if(url.origin!==base||req.method()!=='GET'){unexpected.push(url.pathname);return route.abort();}if(!url.pathname.startsWith('/api/'))return route.continue();return route.fulfill({status:503,json:{error:'No live data needed for manual planner layout check'}});});
 await page.goto(base+'/?page=planning-overview');
 const area=page.getByRole('region',{name:'Workload capacity planning',exact:true});await area.waitFor();
 if(width>=768){const nav=page.getByRole('button',{name:'Expand navigation',exact:true});if(await nav.isVisible())await nav.click();await page.getByRole('button',{name:'Collapse navigation',exact:true}).waitFor();}
 const open=page.getByRole('button',{name:'Open AI panel',exact:true});if(await open.isVisible())await open.click();await page.getByRole('button',{name:'Collapse AI panel',exact:true}).waitFor();
 await area.getByText('Timing & capacity assumptions (required)',{exact:true}).click();
 const input=label=>area.getByLabel(label,{exact:true});
 for(const [label,value] of Object.entries({'Work to plan':'Synthetic service desk - tickets','People at the start':'10','Contracted time at start (FTE)':'8','Work items each month':'800','Hours per item':'1','Opening date (month end)':'2026-09-30','Planning months':'3','Productive hours per FTE / month':'160','Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await input(label).fill(value);
 await area.getByRole('checkbox',{name:/Assume each person joining/}).check();
 const cards=area.locator('dl').first();
 assert.deepEqual(await cards.locator('dd').allTextContents(),['4','5','+1']);
 // At this constrained desktop width the result must follow the form, not squeeze beside it.
 const form=await area.locator('form').boundingBox(),result=await area.getByRole('heading',{name:'3. Do you have enough?',exact:true}).boundingBox();
 assert(result.y>=form.y+form.height,'result stacks below inputs when the available pane is narrow');
 const inspect=async()=>cards.locator('dt,dd').evaluateAll(nodes=>nodes.map(node=>{const range=document.createRange();range.selectNodeContents(node);return {text:node.textContent,rects:Array.from(range.getClientRects(),rect=>({top:rect.top,bottom:rect.bottom})),scroll:node.scrollWidth,width:node.clientWidth,cardWidth:node.parentElement.clientWidth};}));
 let metrics=await inspect();assert(metrics.every(m=>m.scroll<=m.width+1),'labels and numbers fit their cards');assert(metrics.filter(m=>['4','5','+1'].includes(m.text)).every(m=>oneLine(m.rects)),'signed numeric values stay on one line');
 await input('Work items each month').fill('1000');assert.equal(await area.getByRole('slider',{name:'Work items each month slider',exact:true}).inputValue(),'1000');assert.deepEqual(await cards.locator('dd').allTextContents(),['4','6.25','+2.25']);
 await area.getByRole('slider',{name:'Work items each month slider',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await input('Work items each month').inputValue(),await area.getByRole('slider',{name:'Work items each month slider',exact:true}).inputValue());
 metrics=await inspect();assert(metrics.every(m=>m.scroll<=m.width+1));assert(metrics.filter(m=>/^[-+\d]/.test(m.text)).every(m=>oneLine(m.rects)));
 await input('Work items each month').fill('1000000');await input('Hours per item').fill('1000000');await input('Productive hours per FTE / month').fill('1');
 assert.deepEqual(await cards.locator('dd').allTextContents(),['4','1,000,000,000,000','+999,999,999,996']);
 metrics=await inspect();assert(metrics.every(m=>m.scroll<=m.width+1),'large valid values fit without truncation');assert(metrics.filter(m=>/^[-+\d]/.test(m.text)).every(m=>oneLine(m.rects)));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 evidence.push({width,stacked:true,valuesUnsplit:true,synchronized:true,errors,unexpected});
 // Opt in only for a genuine accessible Preview run, after all checks for this width pass.
 if(process.env.PANE_PREVIEW_SCREENSHOTS){await fs.mkdir(process.env.PANE_PREVIEW_SCREENSHOTS,{recursive:true});await area.screenshot({path:process.env.PANE_PREVIEW_SCREENSHOTS+'/'+width+'-planner.png'});}
 await context.close();
}} finally {await browser.close();}
console.log(JSON.stringify(evidence,null,2));
