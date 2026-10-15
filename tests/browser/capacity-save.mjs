import {revealMonthlyCapacityDetail} from './capacity-disclosure.mjs';
// Mocked local storage/failure fixture; real adapter, DecisionStore, provider and form. No APIs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp('/tmp/capacity-save-');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/capacity-save.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(output+'/fixture.js','utf8'),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const evidence=[];
try{for(const width of [1366,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>'}));await page.goto('https://capacity-save.test');
 const input=label=>page.getByLabel(label,{exact:true}),saved=()=>page.getByRole('region',{name:'Saved capacity scenarios',exact:true});
 const calculate=async()=>{await page.getByRole('checkbox',{name:/I confirm/}).check();await page.getByRole('button',{name:'Calculate capacity',exact:true}).click();await revealMonthlyCapacityDetail(page);};
 const entries=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('insights-to-action.decisions.v1')).payload.workspaces.a.fields['planning.monthlyWorkloadScenarios']?.entries??[]);
 for(const [label,value] of Object.entries({'Work to plan':'Service desk — tickets','Opening date (month end)':'2026-09-30','People at the start':'10','Working time at the start (FTE)':'8','Work items each month':'800','Hours per item':'1','Work hours per FTE each month':'160'}))await input(label).fill(value);
 await page.locator('form summary').focus();await page.keyboard.press('Enter');
 for(const [label,value] of Object.entries({'Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await input(label).fill(value);
 await page.getByRole('checkbox',{name:/Assume every hire/}).check();await calculate();assert.equal((await entries()).length,0,'no automatic save');
 await input('Capacity scenario name').fill('Base');await saved().getByRole('button',{name:'Save scenario',exact:true}).focus();await page.keyboard.press('Enter');if((await entries()).length===0)console.log(await saved().innerText());assert.equal((await entries()).length,1);
 const id=(await entries())[0].record.id;await input('Capacity scenario name').fill('Duplicate');await saved().getByRole('button',{name:'Save scenario',exact:true}).click();assert.match(await saved().getByRole('alert').innerText(),/already saved/);assert.equal((await entries()).length,1);
 await input('Productivity improvement (%)').fill('25');assert.ok(await saved().getByRole('button',{name:'Save scenario',exact:true}).isDisabled());assert.match(await saved().innerText(),/saved snapshot, not the current draft/);
 await calculate();await input('Capacity scenario name').fill('Improved');await saved().getByRole('button',{name:'Save scenario',exact:true}).click();assert.equal((await entries()).length,2);
 await input('Saved capacity scenario').selectOption(id);const improved=(await entries())[1].record.id;await input('Compare capacity scenario').selectOption(improved);
 const comparison=page.getByRole('region',{name:'Saved capacity comparison',exact:true});await comparison.waitFor();assert.deepEqual(await comparison.locator('tbody tr').first().locator('td').allTextContents(),['+1','0']);
 await saved().getByRole('button',{name:'Open saved scenario',exact:true}).click();assert.equal(await input('Productivity improvement (%)').inputValue(),'0');assert.match(await saved().innerText(),/matches current inputs/);
 await page.getByRole('button',{name:'Goal B',exact:true}).click();assert.equal(await input('Work to plan').inputValue(),'');assert.equal(await input('Saved capacity scenario').count(),0);
 await page.getByRole('button',{name:'Goal A',exact:true}).click();assert.equal(await input('Work to plan').inputValue(),'Service desk — tickets');await revealMonthlyCapacityDetail(page);assert.ok(await page.getByRole('region',{name:'Monthly capacity comparison',exact:true}).isVisible());
 await page.reload();await input('Saved capacity scenario').selectOption(improved);assert.equal(await input('Work to plan').inputValue(),'');await saved().getByRole('button',{name:'Open saved scenario',exact:true}).click();assert.equal(await input('Productivity improvement (%)').inputValue(),'25');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('insights-to-action.decisions.v1')).payload.workspaces.a.fields['planning.savedScenarios']),[{id:'legacy',name:'Keep me'}]);
 await page.getByRole('button',{name:'No goal',exact:true}).click();assert.match(await saved().innerText(),/Session only/);assert.equal(await saved().getByRole('button',{name:'Save scenario',exact:true}).count(),0);
 await page.getByRole('button',{name:'Goal A',exact:true}).click();await page.getByRole('button',{name:'Change dataset',exact:true}).click();await input('Work to plan').waitFor();assert.equal(await input('Saved capacity scenario').count(),0);
 assert.deepEqual(errors,[]);evidence.push({width,saveReopen:true,edits:true,duplicates:true,comparison:true,goalSwitch:true,datasetSwitch:true,reload:true,keyboard:true,errors});await context.close();
}
for(const mode of ['quota','conflict']){
 const context=await browser.newContext(),page=await context.newPage();
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>'}));await page.goto('https://capacity-save.test');
 for(const [label,value] of Object.entries({'Work to plan':'Service desk — tickets','Opening date (month end)':'2026-09-30','People at the start':'10','Working time at the start (FTE)':'8','Work items each month':'800','Hours per item':'1','Work hours per FTE each month':'160'}))await page.getByLabel(label,{exact:true}).fill(value);
 await page.locator('form summary').click();for(const [label,value] of Object.entries({'Hires each month (people)':'0','Departures each month (people)':'0','Time assigned to this work (%)':'50','Productivity improvement (%)':'0'}))await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByRole('checkbox',{name:/Assume every hire/}).check();await page.getByRole('checkbox',{name:/I confirm/}).check();await page.getByRole('button',{name:'Calculate capacity',exact:true}).click();await revealMonthlyCapacityDetail(page);await page.getByLabel('Capacity scenario name',{exact:true}).fill('Retained draft');
 await page.getByRole('button',{name:mode==='quota'?'Fail next save':'Simulate other tab',exact:true}).click();const before=await page.evaluate(()=>localStorage.getItem('insights-to-action.decisions.v1'));await page.getByRole('button',{name:'Save scenario',exact:true}).click();
 assert.match(await page.getByRole('alert').innerText(),mode==='quota'?/Quota/:/Another tab/);assert.equal(await page.getByLabel('Work to plan',{exact:true}).inputValue(),'Service desk — tickets');assert.equal(await page.getByLabel('Capacity scenario name',{exact:true}).inputValue(),'Retained draft');await revealMonthlyCapacityDetail(page);assert.ok(await page.getByRole('region',{name:'Monthly capacity comparison',exact:true}).isVisible());assert.equal(await page.evaluate(()=>localStorage.getItem('insights-to-action.decisions.v1')),before);evidence.push({mode,visibleError:true,draftAndStoragePreserved:true});await context.close();
}
}finally{await browser.close();}
await fs.writeFile(output+'/evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,evidence},null,2));
