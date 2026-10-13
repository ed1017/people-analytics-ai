// Isolated real-component fixture: goal context and actual dataset boundary remount behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp('/tmp/capacity-session-');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/capacity-session.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(path.join(output,'fixture.js'),'utf8');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>'}));
 await page.goto('http://capacity-fixture.test');
 const scope=()=>page.getByLabel('Workload scope',{exact:true});await scope().fill('Goal A workload');
 for(const [label,value] of Object.entries({'Opening date (month end)':'2026-09-30','Opening people':'10','Opening contracted FTE':'8','Work units each month':'800','Hours per work unit':'1','Productive hours per FTE each month':'160'}))await page.getByLabel(label,{exact:true}).fill(value);
 await page.locator('summary').click();
 for(const [label,value] of Object.entries({'Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('checkbox',{name:/Assume every hire/}).check();await page.getByRole('checkbox',{name:/I confirm/}).check();await page.getByRole('button',{name:'Calculate capacity',exact:true}).click();
 const comparison=()=>page.getByRole('region',{name:'Monthly capacity comparison'});await comparison().waitFor();
 await page.getByRole('button',{name:'Goal B',exact:true}).click();assert.equal(await scope().inputValue(),'');assert.equal(await comparison().count(),0);await scope().fill('Goal B workload');
 await page.getByRole('button',{name:'Goal A',exact:true}).click();assert.equal(await scope().inputValue(),'Goal A workload');await comparison().waitFor();
 await page.getByRole('button',{name:'Goal B',exact:true}).click();assert.equal(await scope().inputValue(),'Goal B workload');
 await page.getByRole('button',{name:'Change dataset',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Dataset changed.'}).waitFor();assert.equal(await scope().inputValue(),'','dataset boundary remount clears this session-only draft');
 await page.getByRole('button',{name:'Goal A',exact:true}).click();assert.equal(await scope().inputValue(),'','old dataset drafts do not reappear in another goal');assert.equal(await comparison().count(),0);
 assert.deepEqual(errors,[]);await fs.writeFile(output+'/evidence.json',JSON.stringify({goalIsolation:true,goalRoundTrip:true,datasetRemountClearsDrafts:true,errors},null,2));console.log(JSON.stringify({output,goalIsolation:true,datasetRemountClearsDrafts:true},null,2));
}finally{await browser.close();}
