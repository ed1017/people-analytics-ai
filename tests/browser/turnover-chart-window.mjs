import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const output = await fs.mkdtemp(path.join(os.tmpdir(),'synthetic-domain-demo-'));
const cssFiles = (await Promise.all(['.next/static/chunks', '.next/static/css'].map(async directory =>
  (await fs.readdir(directory).catch(error => { if (error.code === 'ENOENT') return []; throw error; }))
    .filter(name => name.endsWith('.css')).map(name => path.join(directory, name))
))).flat();
assert(cssFiles.length,'Build current app CSS first');
const css = (await Promise.all(cssFiles.map(file=>fs.readFile(file,'utf8')))).join('\n');
const compiler = webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/synthetic-domain-demo.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd(),react:path.resolve('node_modules/react')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const js = await fs.readFile(path.join(output,'fixture.js'),'utf8');
assert.doesNotMatch(js,/node:crypto|buildSyntheticDomainDemo|generateWorkforceCase|scores\.json\.gz/,'No verifier, generator or raw evidence in client bundle');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,condition)=>{assert(condition,name);checks++;console.log('PASS '+name);};
try{for(const [name,width,height] of [['desktop',1366,900],['mobile',390,844],['small-mobile',320,740],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let requests=0;page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(r.request().url()==='http://fixture.local/')return r.fulfill({contentType:'text/html',body:html});requests++;return r.abort()});await page.goto('http://fixture.local/');
 const figure=page.getByRole('figure',{name:'Turnover projections: simulated history and projections'});await figure.waitFor();
 await page.waitForFunction(()=>{const n=document.querySelector('figure[aria-label^="Turnover"]');return Math.abs(n.querySelector('svg').viewBox.baseVal.width-n.getBoundingClientRect().width)<2});
 const geometry=await figure.evaluate(n=>{const svg=n.querySelector('svg');return {width:svg.viewBox.baseVal.width, ticks:[...n.querySelectorAll('[data-axis="x"]')].map(t=>({text:t.textContent,month:t.dataset.month,x:Number(t.getAttribute('x')),rect:t.getBoundingClientRect().toJSON()})),history:[...n.querySelectorAll('[data-series="history"]')].map(p=>p.getAttribute('d')),bridges:[...n.querySelectorAll('[data-series="forecast-bridge"]')].map(p=>({d:p.getAttribute('d'),dash:p.getAttribute('stroke-dasharray'),opacity:p.getAttribute('opacity')})),methods:[...n.querySelectorAll('path[data-series]:not([data-series="history"]):not([data-series="forecast-bridge"])')].map(p=>({d:p.getAttribute('d'),dash:p.getAttribute('stroke-dasharray')}))}});
 check(name+' all twelve 2026 months',geometry.ticks.length===12&&geometry.ticks.every((t,i)=>t.month===`2026-${String(i+1).padStart(2,'0')}`)&&geometry.ticks[0].text.includes('2026')&&geometry.ticks.at(-1).text.includes('2026'));
 check(name+' exact monthly spacing',geometry.ticks.every((t,i)=>Math.abs(t.x-(58+i*(geometry.width-78)/11))<.001));
 check(name+' readable non-overlapping month labels',geometry.ticks.every((t,i)=>!i||t.rect.left>=geometry.ticks[i-1].rect.right));
 check(name+' released Jan–Aug points only',await figure.locator('circle[aria-label*="Released history"]').count()===8&&await figure.locator('circle[aria-label*="Sep"]').count()===0);
 const artifact=JSON.parse(await fs.readFile('lib/data/synthetic-domain-demo-v1.json','utf8')),d=artifact.domains.turnover,x=i=>58+i/11*(geometry.width-78),y=v=>186-(v-40)/80*156;
 check(name+' exact unchanged history geometry',geometry.history.length===1&&geometry.history[0]===d.history.filter(r=>r.month>='2026-01').map((r,i)=>(i?' L':'M')+x(i)+','+y(r.value)).join(''));
 check(name+' bridges join Aug to Oct without September point',geometry.bridges.length===3&&geometry.bridges.every((p,i)=>p.d===`M${x(7)},${y(66)} L${x(9)},${y(d.rows[0].values[i])}`&&p.dash==='7 6'&&p.opacity==='.5'));
 check(name+' unchanged dotted projections',geometry.methods.every((p,i)=>p.d===d.rows.map((r,j)=>(j?'L':'M')+x(9+j)+','+y(r.values[i])).join(' ')&&p.dash));
 check(name+' visible projection boundary and missing period',await figure.locator('[data-region="projection"]').count()===1&&await figure.getByText('Sep unavailable',{exact:true}).isVisible());
 await figure.getByLabel('Sep 2026: unreleased, no observed value',{exact:true}).focus();check(name+' keyboard missing-value tooltip',await figure.getByRole('status').innerText()==='Sep 2026: unreleased, no observed value');
 await figure.locator('[data-point="forecast"][aria-label*="Oct 2026"]').first().focus();check(name+' projection tooltip retained',(await figure.getByRole('status').innerText()).includes('Oct 2026'));
 check(name+' no runtime errors, network or overflow',requests===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await figure.screenshot({path:`/tmp/turnover-chart-${name}.png`});await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
