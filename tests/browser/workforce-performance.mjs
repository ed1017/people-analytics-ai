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
const compiler = webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/workforce-performance.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd(),react:path.resolve('node_modules/react')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const js = await fs.readFile(path.join(output,'fixture.js'),'utf8');
assert.doesNotMatch(js,/node:crypto|buildSyntheticDomainDemo|generateWorkforceCase|scores\.json\.gz/,'No verifier, generator or raw evidence in client bundle');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,condition)=>{assert(condition,name);checks++;console.log('PASS '+name);};
try{for(const [name,width,height] of [['desktop',1366,900],['mobile',390,844],['small-mobile',320,740],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let requests=0;page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(r.request().url()==='http://fixture.local/')return r.fulfill({contentType:'text/html',body:html});requests++;return r.abort()});await page.goto('http://fixture.local/');
 const field=page.getByLabel('Workforce performance ratings',{exact:true});await field.waitFor();
 check(name+' categories and coverage share workforce denominator',await field.locator('dd').count()===7&&(await field.innerText()).includes('70 employees'));
 check(name+' no independent controls or demo box',await field.locator('select,button,input').count()===0&&!(await field.innerText()).includes('demo'));
 check(name+' year-to-date is explicit',(await field.innerText()).includes('2026 year to date'));
 await field.screenshot({path:`/tmp/workforce-performance-${name}.png`});
 for(const mode of ['missing','suppressed','changed filter','loading','malformed']){await page.getByLabel('Test response').selectOption(mode);check(name+' '+mode+' clears rating values',await field.locator('dd').count()===0&&await field.getByRole('status').isVisible());if(mode==='changed filter')check(name+' changed filter label',(await field.innerText()).includes('United States'));}
 await page.getByLabel('Test response').selectOption('available');check(name+' valid matching scope restores',await field.locator('dd').count()===7);
 check(name+' no overflow, network or runtime errors',requests===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
