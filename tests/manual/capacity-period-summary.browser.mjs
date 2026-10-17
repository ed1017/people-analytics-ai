import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CAPACITY_BASE_URL||'http://127.0.0.1:3417',out=process.env.CAPACITY_OUTPUT_DIR;
if(out)await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());return q.method()!=='GET'||u.origin!==new URL(base).origin||u.pathname.startsWith('/api/bls')?r.abort():r.continue();});
 await page.goto(base);await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Plan',exact:true}).click();
 await page.getByText('Try an illustrative demo',{exact:true}).click();
 const demo=page.getByRole('region',{name:'Illustrative workforce planning',exact:true});
 const summary=demo.getByRole('region',{name:'Capacity across the planning period',exact:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await demo.getByRole('textbox',{name:'Monthly hires',exact:true}).fill('4');
  await summary.getByText('Shortfall in 3 of 6 months.',{exact:true}).waitFor();
  assert.ok((await summary.innerText()).includes('First shortfall: 2026-10. Largest known monthly shortfall: 7 FTE in 2026-10.'));
  assert.ok((await demo.getByRole('complementary',{name:'Planning guidance'}).innerText()).includes('8 FTE surplus'));
  await demo.getByText('Monthly detail',{exact:true}).click();
  const rows=await demo.locator('tbody tr').allTextContents();for(const [i,gap]of [7,4,1,-2,-5,-8].entries())assert.ok(rows[i].endsWith(String(gap)),rows[i]);
  await demo.getByText('Monthly detail',{exact:true}).click();
  await summary.scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
  if(out)await page.screenshot({path:`${out}/period-${width}.png`});
  await demo.getByRole('textbox',{name:'Monthly workload',exact:true}).fill('');
  await summary.getByText('Full-period coverage is unknown.',{exact:true}).waitFor();
  assert.ok((await summary.innerText()).includes('6 months have an unknown gap'));
  await demo.getByRole('textbox',{name:'Monthly workload',exact:true}).fill('6000');
  await summary.getByText('No shortfall in any of the 6 months.',{exact:true}).waitFor();
  await demo.getByRole('button',{name:'Reset demo',exact:true}).click();
  await summary.getByText('Shortfall in 6 of 6 months.',{exact:true}).waitFor();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({base,widths:[1440,390],earlyShortfalls:true,finalSurplus:true,monthlyTable:true,unknowns:true,noShortfall:true,reset:true,pageErrors:errors}));
}finally{await browser.close();}
