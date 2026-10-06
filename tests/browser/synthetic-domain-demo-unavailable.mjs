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
try{for(const [name,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let requests=0;page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(r.request().url()==='http://fixture.local/')return r.fulfill({contentType:'text/html',body:html});requests++;return r.abort()});await page.goto('http://fixture.local/');
 const panel=page.getByRole('region',{name:'Simulated hiring projections',exact:true});await panel.waitFor();check(name+' verified data displays all methods',await panel.getByRole('table').getByRole('row').count()===4);
 for(const mode of ['missing','altered']){await page.getByLabel('Fixture evidence').selectOption(mode);check(name+mode+' no stale or missing values',await panel.getByRole('table').count()===0&&await panel.getByRole('status').isVisible()&&!(await panel.innerText()).includes('80.5%')&&!(await panel.innerText()).includes('999'));}
 check(name+' runtime network and responsive boundaries',requests===0&&errors.length===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
