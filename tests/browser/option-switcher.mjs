import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'option-switcher-'));
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/option-switcher.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(path.join(output,'fixture.js'),'utf8'),css=(await Promise.all((await fs.readdir('.next/static/chunks')).filter(name=>name.endsWith('.css')).map(name=>fs.readFile(path.join('.next/static/chunks',name),'utf8')))).join('\n');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;
const check=(name,ok)=>{assert.ok(ok,name);checks++;console.log('PASS '+name)};
try{for(const width of [1366,390]){
 const context=await browser.newContext({...width===390?devices['Pixel 7']:{},viewport:{width,height:900}}),page=await context.newPage();let unexpected=0;
 await page.route('**/*',route=>route.request().url()==='http://127.0.0.1:3100/'?route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div>'}):(unexpected++,route.abort()));
 await page.goto('http://127.0.0.1:3100/');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});
 const button=name=>page.getByRole('button',{name,exact:true}),tab=n=>page.getByRole('tab',{name:`Option ${n}`,exact:true});
 await tab(1).waitFor();check(width+' one option disables arrows without inventing others',await page.getByRole('tab').count()===1&&await button('Previous option').isDisabled()&&await button('Next option').isDisabled());
 await button('Show 2').click();await tab(1).focus();await page.keyboard.press('ArrowRight');check(width+' keyboard selects second option and manages tab stop',await tab(2).getAttribute('aria-selected')==='true'&&await tab(2).evaluate(el=>el===document.activeElement)&&await tab(1).getAttribute('tabindex')==='-1'&&await page.getByRole('tabpanel').count()===1);
 await page.getByText('Details',{exact:true}).filter({visible:true}).click();await page.getByLabel('Draft b').fill('Keep this draft');await button('Next option').click();await button('Previous option').click();check(width+' wraparound preserves mounted option state',await page.getByLabel('Draft b').inputValue()==='Keep this draft'&&await page.getByLabel('Draft b').isVisible());
 await button('Show 3').click();await tab(2).focus();await page.keyboard.press('End');check(width+' End selects actual third option',await tab(3).getAttribute('aria-selected')==='true'&&await page.getByRole('article',{name:'c',exact:true}).isVisible());await page.keyboard.press('Home');check(width+' Home returns to first option',await tab(1).getAttribute('aria-selected')==='true');
 await page.evaluate(()=>scrollTo(0,400));const scroll=await page.evaluate(()=>scrollY);await button('Next option').click();check(width+' arrows preserve scroll when controls are in view',Math.abs(await page.evaluate(()=>scrollY)-scroll)<2);
 await tab(3).click();await button('Show 1').click();check(width+' removing selected option falls back safely',await tab(1).getAttribute('aria-selected')==='true'&&await page.getByRole('tabpanel').count()===1);
 await button('Show 3').click();check(width+' mobile navigation fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&unexpected===0);await page.screenshot({path:path.join(output,`navigation-${width}.png`),fullPage:true});await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks,output}));
