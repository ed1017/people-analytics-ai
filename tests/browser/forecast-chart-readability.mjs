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
const compiler = webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/forecast-chart.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd(),react:path.resolve('node_modules/react')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const js = await fs.readFile(path.join(output,'fixture.js'),'utf8');
assert.doesNotMatch(js,/node:crypto|buildSyntheticDomainDemo|generateWorkforceCase|scores\.json\.gz/,'No verifier, generator or raw evidence in client bundle');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const artifact=JSON.parse(await fs.readFile('lib/data/synthetic-domain-demo-v1.json','utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let checks=0;
const check=(name,yes)=>{assert(yes,name);checks++;console.log('PASS '+name)};
const screenshotDirectory='/tmp/forecast-chart-readability';await fs.mkdir(screenshotDirectory,{recursive:true});
try {
 for(const [name,width,height] of [['desktop',1366,900],['mobile',390,844],['small-mobile',320,740],['zoom',683,450]]) for(const palette of ['light','slate-blue']) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];let requests=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{if(route.request().url()==='http://fixture.local/')return route.fulfill({contentType:'text/html',body:html});requests++;return route.abort()});
  await page.goto('http://fixture.local/');
  await page.evaluate(palette=>{document.documentElement.dataset.workspacePreference=palette;document.documentElement.classList.add('dark')},palette);
  for(const [domain,title,expectedPoints,expectedSegments] of [['turnover','Turnover projections',8,1],['hiring','Hiring projections',11,2],['satisfaction','Satisfaction projection',8,1]]) {
   const figure=page.getByRole('figure',{name:title+': simulated history and projections'});await figure.waitFor();
   await page.waitForFunction(title=>{const node=document.querySelector(`figure[aria-label^="${title}"]`);return Math.abs(node.querySelector('svg').viewBox.baseVal.width-node.getBoundingClientRect().width)<2},title);
   const geometry=await figure.evaluate(node=>{
    const svg=node.querySelector('svg[role=img]');
    return {min:Number(svg.dataset.yMin),max:Number(svg.dataset.yMax),width:svg.viewBox.baseVal.width,ticks:[...node.querySelectorAll('[data-axis=x]')].map(t=>({month:t.dataset.month,text:t.textContent,rect:t.getBoundingClientRect().toJSON()})),history:[...node.querySelectorAll('[data-series=history]')].map(p=>p.getAttribute('d')),points:[...node.querySelectorAll('[data-point=history]')].map(p=>({month:p.dataset.month,x:Number(p.getAttribute('cx')),y:Number(p.getAttribute('cy'))})),forecast:[...node.querySelectorAll('[data-point=forecast]')].map(p=>{const shape=p.children[0],box=shape.getBBox();return {value:Number(p.dataset.value),month:p.dataset.month,method:p.dataset.method,label:p.getAttribute('aria-label'),shape:shape.tagName,x:box.x+box.width/2,y:box.y+box.height/2}}),missing:[...node.querySelectorAll('[data-missing]')].map(p=>p.dataset.missing),textSize:parseFloat(getComputedStyle(node.querySelector('[data-axis=y]')).fontSize)*svg.getBoundingClientRect().width/svg.viewBox.baseVal.width};
   });
   const prefix=`${name} ${palette} ${domain}`;
   check(prefix+' denser ticks with endpoint and boundary years',geometry.ticks.length>=6&&geometry.ticks[0].text.includes(geometry.ticks[0].month.slice(0,4))&&geometry.ticks.at(-1).text.includes('2026')&&(domain!=='satisfaction'||geometry.ticks.some(t=>t.text.includes('2025'))));
   check(prefix+' non-overlapping readable dates',geometry.textSize>=11.9&&geometry.ticks.every((t,i)=>!i||t.rect.left>=geometry.ticks[i-1].rect.right+2));
   check(prefix+' cropped scale explicitly disclosed',(await figure.locator('[data-axis-note]').innerText()).includes('does not start at zero')&&geometry.min>0&&(domain==='turnover'||geometry.max<=(domain==='hiring'?1:100)));
   const data=artifact.domains[domain],history=domain==='turnover'?data.history.filter(r=>r.month>='2026-01'):domain==='hiring'?data.history.slice(-12):data.history;
   const start=domain==='turnover'?'2026-01':history[0].month,index=month=>Number(month.slice(0,4))*12+Number(month.slice(5,7)),span=index(data.rows.at(-1).month)-index(start);
   check(prefix+' original historical values and dates preserved',geometry.points.length===expectedPoints&&geometry.points.every(p=>{const row=history.find(r=>r.month===p.month);return row&&Math.abs(p.x-(58+(index(p.month)-index(start))/span*(geometry.width-78)))<1e-8&&Math.abs(p.y-(186-(row.value-geometry.min)/(geometry.max-geometry.min)*156))<1e-8}));
   check(prefix+' only consecutive native cadence joined',geometry.history.length===expectedSegments&&geometry.history.reduce((n,d)=>n+(d.match(/L/g)||[]).length,0)===expectedPoints-expectedSegments);
   check(prefix+' all methods and values keep their dates',geometry.forecast.length===data.rows.length*data.methods.length&&geometry.forecast.every(p=>{const row=data.rows.find(r=>r.month===p.month),method=data.methods.indexOf(p.method),value=row?.values[method];return value!==undefined&&Math.abs(p.x-(58+(index(p.month)-index(start))/span*(geometry.width-78)))<.001&&Math.abs(p.y-(186-(value-geometry.min)/(geometry.max-geometry.min)*156))<.001&&p.value===value&&p.label.includes('Projection')})&&new Set(geometry.forecast.map(p=>p.shape)).size===3);
   check(prefix+' projection boundary in all charts',await figure.locator('[data-region=projection]').count()===1&&await figure.getByLabel('Chart legend').count()===1);
   check(prefix+' missing periods remain missing',data.gaps.every(month=>geometry.missing.includes(month)&&!geometry.points.some(p=>p.month===month))&&(domain!=='hiring'||geometry.missing.includes('2025-11'))&&await figure.locator('[data-series=forecast-bridge]').count()===(domain==='turnover'?3:0));
   const historyPoint=figure.locator(domain==='turnover'?'[data-point=history][data-month="2026-02"]':'[data-point=history]').first();
   await historyPoint.hover();const tooltip=page.getByRole('tooltip');await tooltip.waitFor();
   check(prefix+' compact hover reads the exact historical point',(await tooltip.innerText()).includes('Demo history')&&(domain!=='turnover'||(await tooltip.innerText()).replace(/\n+/g,'\n')==='Feb 2026\n80 voluntary exits\nDemo history')&&await tooltip.locator('p').count()===3&&await figure.locator('title').count()===0&&await figure.locator('desc').count()===1);
   const bounded=()=>tooltip.evaluate(node=>{const b=node.getBoundingClientRect();return b.left>=7&&b.top>=7&&b.right<=innerWidth-7&&b.bottom<=innerHeight-7&&b.width<=231&&b.height<130});
   check(prefix+' hover tooltip fits viewport',await bounded());
   if(domain==='turnover')await page.screenshot({path:`${screenshotDirectory}/${name}-${palette}-february-tooltip.png`});
   await page.keyboard.press('Escape');await tooltip.waitFor({state:'hidden'});await historyPoint.tap();await tooltip.waitFor();
   check(prefix+' tap opens the same bounded history feedback',(await tooltip.innerText()).includes('Demo history')&&await bounded());
   const methodPoint=figure.locator(domain==='hiring'?'[data-point=forecast][data-method=logistic-trend]':'[data-point=forecast][data-method^=linear-trend]').last();
   await methodPoint.focus();await tooltip.waitFor();
   const method=domain==='hiring'?'Logistic trend':'Linear Regression';
   check(prefix+' keyboard projection has date value unit and exact method',(await tooltip.innerText()).includes('Dec 2026')&&(await tooltip.innerText()).includes('Projection · '+method)&&await methodPoint.getAttribute('aria-describedby')===await tooltip.getAttribute('id')&&await bounded());
   check(prefix+' method names agree across table and legend',await figure.getByLabel('Chart legend').getByText(method,{exact:true}).count()===1&&await figure.locator('..').getByRole('rowheader',{name:method,exact:true}).count()===1&&!(await figure.innerText()).includes('Linear trend'));
   await page.screenshot({path:`${screenshotDirectory}/${name}-${palette}-${domain}-tooltip.png`});
   await page.keyboard.press('Escape');await tooltip.waitFor({state:'hidden'});
   await figure.locator('[data-point=forecast]').first().focus();check(prefix+' keyboard forecast tooltip',(await figure.getByRole('status').innerText()).includes(data.rows[0].month.endsWith('12')?'Dec 2026':'Oct 2026'));
   await figure.locator('[data-missing]').first().focus();check(prefix+' keyboard missing-value explanation',/unreleased|rate unavailable/.test(await figure.getByRole('status').innerText()));
   if(domain==='hiring') {
    await figure.locator('[data-missing="2025-11"]').focus();
    check(prefix+' zero-opening month remains a missing rate',/Nov 2025.*zero openings; rate unavailable/s.test(await tooltip.innerText())&&!((await tooltip.innerText()).includes('90-day outcome')));
    await figure.locator('[data-missing="2026-07"]').focus();
    check(prefix+' July gap explains the frozen outcome reporting cutoff',/Jul 2026.*90-day outcome not fully reported at the Sep 30, 2026 cutoff; no observed value/s.test(await tooltip.innerText())&&await bounded()&&await figure.locator('[data-point="history"][data-month="2026-07"]').count()===0);
   }
   await figure.screenshot({path:`${screenshotDirectory}/${name}-${palette}-${domain}.png`});
  }
  for(const mode of ['flat','singleton','unavailable','verified']) {
   await page.getByLabel('Chart fixture').selectOption(mode);
   if(mode==='unavailable')check(name+palette+' null series unavailable',await page.getByText('Simulated history chart unavailable.',{exact:true}).count()===3);
   else {
    await page.waitForFunction(()=>[...document.querySelectorAll('figure')].every(node=>Math.abs(node.querySelector('svg').viewBox.baseVal.width-node.getBoundingClientRect().width)<2));
    check(name+palette+mode+' finite geometry',await page.locator('svg[role=img]').evaluateAll(nodes=>nodes.length===3&&nodes.every(node=>Number(node.dataset.yMax)>Number(node.dataset.yMin)&&![...node.querySelectorAll('path,circle,rect,text')].some(n=>[...n.attributes].some(a=>/NaN|Infinity/.test(a.value))))));
    if(mode==='singleton')check(name+palette+' singleton dates and no invented history',await page.locator('[data-point=history]').count()===0&&await page.locator('[data-point=forecast]').count()===9);
   }
  }
  check(name+palette+' no runtime errors, requests or overflow',errors.length===0&&requests===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await context.close();
 }
} finally {await browser.close()}
console.log(JSON.stringify({checks,screenshotDirectory}));
