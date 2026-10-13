// Real components/store with isolated local data; no API or paid model requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import {encodeDecisions} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=await fs.mkdtemp('/tmp/capacity-cost-');
const compiler=webpackPackage.webpack({mode:'development',devtool:false,entry:path.resolve('tests/fixtures/capacity-save.tsx'),output:{path:output,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const bundle=await fs.readFile(output+'/fixture.js','utf8');
const old=JSON.parse(await fs.readFile('tests/fixtures/swp-capacity-v1.json','utf8'));
const seed=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:'Review capacity'}]},workspaces:{a:{savedAt:'2026-10-13T20:00:00.000Z',fields:{'planning.monthlyWorkloadScenarios':old}}}});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const evidence=[];
try{for(const width of [1366,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(value=>{if(!localStorage.getItem('insights-to-action.decisions.v1'))localStorage.setItem('insights-to-action.decisions.v1',value);},seed);
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div><script>'+bundle.replaceAll('</script','<\\/script')+'</script>'}));await page.goto('https://capacity-cost.test');
 const input=label=>page.getByLabel(label,{exact:true}),button=name=>page.getByRole('button',{name,exact:true}),rate=input('Cost per contracted FTE per month (USD, optional)'),summary=page.getByLabel('Contracted supply cost estimate',{exact:true});
 const entries=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('insights-to-action.decisions.v1')).payload.workspaces.a.fields['planning.monthlyWorkloadScenarios'].entries);
 const calculate=async()=>{await page.getByRole('checkbox',{name:/I confirm/}).check();await button('Calculate capacity').click();};
 const save=async name=>{await input('Capacity scenario name').fill(name);await button('Save scenario').click();assert.ok((await entries()).some(e=>e.record.name===name));};
 await input('Saved capacity scenario').selectOption('legacy-a');await button('Open saved scenario').click();assert.equal(await rate.inputValue(),'');assert.match(await summary.innerText(),/Unknown/);assert.deepEqual((await entries())[0],old.entries[0]);
 await rate.fill('12.34');assert.ok(await button('Save scenario').isDisabled());assert.equal(await summary.count(),0);await calculate();assert.match(await summary.innerText(),/\$98.72/);await save('Manual rate');const rated=(await entries()).find(e=>e.record.name==='Manual rate');assert.equal(rated.record.schemaVersion,2);assert.equal(rated.record.cost.points[0].runRateCents,9872);
 await input('Saved capacity scenario').selectOption('legacy-a');await input('Compare capacity scenario').selectOption(rated.record.id);await page.getByText('Contracted supply cost comparison',{exact:true}).click();assert.match(await page.getByRole('region',{name:'Saved capacity comparison',exact:true}).innerText(),/Unknown/);
 await rate.fill('0');assert.equal(await summary.count(),0);await calculate();assert.match(await summary.innerText(),/\$0.00/);await save('Zero');
 await rate.fill('');assert.ok(await button('Save scenario').isDisabled());assert.equal(await summary.count(),0);await calculate();assert.match(await summary.innerText(),/Unknown/);await save('Unknown');
 await page.reload();await input('Saved capacity scenario').selectOption(rated.record.id);await button('Open saved scenario').click();assert.equal(await rate.inputValue(),'12.34');assert.match(await summary.innerText(),/\$98.72/);assert.deepEqual((await entries())[0],old.entries[0]);assert.deepEqual(errors,[]);
 evidence.push({width,legacyReopen:true,legacyBytesPreserved:true,mixedComparison:true,manual9872Cents:true,unknownAndZeroSaved:true,editAndClearInvalidated:true,reload:true});
 await page.screenshot({path:output+`/cost-${width}.png`,fullPage:true});await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({output,evidence},null,2));
