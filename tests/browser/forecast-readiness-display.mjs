import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const output = await fs.mkdtemp(path.join(os.tmpdir(),'forecast-readiness-display-'));
const cssFiles = (await Promise.all(['.next/static/chunks', '.next/static/css'].map(async directory =>
  (await fs.readdir(directory).catch(error => { if (error.code === 'ENOENT') return []; throw error; }))
    .filter(name => name.endsWith('.css')).map(name => path.join(directory, name))
))).flat();
assert(cssFiles.length,'Build current app CSS first');
const css = (await Promise.all(cssFiles.map(file=>fs.readFile(file,'utf8')))).join('\n');
const compiler = webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/forecast-readiness-display.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd(),react:path.resolve('node_modules/react')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const js = await fs.readFile(path.join(output,'fixture.js'),'utf8');
assert(!js.includes('aggregate-exit-history.json')&&!js.includes('evaluateAggregateExitDemo'),'No evaluator or raw fixture in browser bundle');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,condition)=>{assert(condition,name);checks++;console.log('PASS '+name);};
try{for(const [name,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom-equivalent',683,450]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let requests=0;
 page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>{if(route.request().url()==='http://fixture.local/')return route.fulfill({contentType:'text/html',body:html});requests++;return route.abort();});
 await page.goto('http://fixture.local/');const example=page.locator('details[aria-label="Synthetic count example"]'),summary=example.locator('summary').first(),content=page.getByRole('region',{name:'Conditional synthetic exit counts'});
 await summary.waitFor();check(name+' default collapsed, operational unavailability visible',await example.evaluate(n=>!n.open)&&await summary.getByText(/Operational forecast unavailable/).isVisible());
 await summary.focus();await page.keyboard.press('Enter');check(name+' keyboard opens original distinct totals',await content.getByText('605',{exact:true}).isVisible()&&await content.getByRole('heading',{name:'Conditional remaining-year estimate',exact:true}).locator('..').getByText('201',{exact:true}).isVisible()&&await content.getByText('806',{exact:true}).isVisible());
 const source=content.locator('details').filter({has:page.locator('summary',{hasText:'Source, version and reproduction'})}).first();
 check(name+' missing details hidden by existing disclosure',!await source.getByRole('heading',{name:'Missing inputs for operational forecasts'}).isVisible());await source.locator('summary').click();
 check(name+' three source domains and exact gaps visible',await source.getByText('Turnover · unavailable',{exact:true}).isVisible()&&await source.getByText('Satisfaction · unavailable',{exact:true}).isVisible()&&await source.getByText('Hiring · unavailable',{exact:true}).isVisible()&&await source.getByText(/Actual first-observed timestamps, revision predecessors/).isVisible());
 check(name+' no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await example.screenshot({path:path.join(output,name+'-current.png')});
 for(const mode of ['altered','missing']){await page.getByLabel('Fixture evidence').selectOption(mode);await summary.click();check(name+' '+mode+' withholds all conditional totals',await content.getByRole('status').isVisible()&&await content.getByRole('heading',{name:'Conditional remaining-year estimate'}).count()===0&&await content.getByText('999',{exact:true}).count()===0);await source.locator('summary').click();check(name+' '+mode+' failure has recovery detail',await source.getByText(/must be regenerated and checked/).isVisible());}
 check(name+' no API/model requests or runtime errors',requests===0&&errors.length===0);await context.close();
}}finally{await browser.close();}console.log(JSON.stringify({checks,output}));
