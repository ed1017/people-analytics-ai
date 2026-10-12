// Actual editor and both attachment renderers; immutable pre-change and current snapshots. Native lifecycle is tested separately.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import webpackPackage from 'next/dist/compiled/webpack/webpack.js';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const output=process.env.AUDIT_OUTPUT??await fs.mkdtemp(path.join(os.tmpdir(),'shared-metric-surfaces-'));
const build=process.env.AUDIT_BUILD??await fs.mkdtemp(path.join(os.tmpdir(),'turnover-context-client-'));
await fs.mkdir(output,{recursive:true});await fs.mkdir(build,{recursive:true});
const compiler=webpackPackage.webpack({mode:'development',devtool:false,plugins:[new webpackPackage.webpack.DefinePlugin({'process.env.NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION':JSON.stringify('false'),'process.env.NEXT_PUBLIC_GOAL_PROGRESS':JSON.stringify('true'),'process.env.NEXT_PUBLIC_HOME_STRUCTURED_PLANS':JSON.stringify('true')})],entry:path.resolve('tests/fixtures/shared-metric-surfaces.tsx'),output:{path:build,filename:'fixture.js',publicPath:'/assets/'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':process.cwd()}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/fixtures/typescript-browser-loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((error,stats)=>compiler.close(()=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve())));
const css=(await postcss([tailwind({base:process.cwd()})]).process(await fs.readFile('app/globals.css','utf8'),{from:path.resolve('app/globals.css')})).css;
const js=await fs.readFile(path.join(build,'fixture.js'),'utf8');
const html=`<!doctype html><html data-workspace-preference="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3142';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),checks=[];
try{for(const [mode,width,height] of [['desktop',1350,1000],['phone',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let external=0;page.on('pageerror',e=>errors.push(e.message));
 const check=(name,ok)=>{assert.ok(ok,mode+' '+name);checks.push(mode+' '+name);console.log('PASS '+mode+' '+name);};
 await context.route('**/*',route=>{if(route.request().isNavigationRequest()&&route.request().url()===base+'/')return route.fulfill({contentType:'text/html',body:html});external++;return route.abort();});
 await page.goto(base);const attached=page.getByRole('region',{name:'Attached Action Plans',exact:true});
 const original=await page.evaluate(()=>JSON.stringify(window.__surfaceFixtures));
 for(const [id,value,population] of [['A1','6.2%','Company-wide; unfiltered'],['R1','49 days','Company-wide recruiting; unfiltered'],['S1','26.5%','survey-specific respondents'],['T1','72.1%','recorded role requirements']]){
  await page.getByLabel('Domain',{exact:true}).selectOption({label:id});
  for(const format of ['attached','numbered']){
   await page.getByLabel('Snapshot format',{exact:true}).selectOption(format);
   check(id+' '+format+' shows historical source separately from unknown plan baseline',await attached.innerText().then(t=>t.includes(value)&&t.includes(population)&&t.includes('Baseline: Unknown')&&t.includes('Target: Unknown')));
   const details=attached.getByText('Metric definitions and limits',{exact:true});check(id+' '+format+' begins with collapsed definitions',await details.evaluate(n=>!n.parentElement.open));await details.click();
   check(id+' '+format+' preserves source field and period/denominator limits',await attached.innerText().then(t=>t.includes(id+'.')&&t.includes('2026-09-30')&&t.includes('denominator')&&t.includes('as-of date is not an observation window')));
   await details.click();await page.getByRole('button',{name:'Change current evidence',exact:true}).click();check(id+' '+format+' never refreshes from current evidence at render',await attached.innerText().then(t=>t.includes(value)&&!t.includes('99%')&&!t.includes('99 days')));
  }
  await page.getByLabel('Snapshot format',{exact:true}).selectOption('legacy');check(id+' pre-change adopted value is visibly unverified without data migration',await attached.innerText().then(t=>t.includes('Legacy source value: '+value)&&t.includes('plan baseline: Unverified')&&!t.includes('Recorded baseline:')));
  const editor=page.getByText('Review success measure and baseline',{exact:true});await editor.click();check(id+' has no aggregate adoption control',await page.getByLabel(/Use recorded baseline/).count()===0);
  await page.getByLabel('Success measure',{exact:true}).fill('Different user metric');check(id+' renaming does not relabel the source value',await page.getByRole('region',{name:'Historical metric context',exact:true}).first().innerText().then(t=>t.includes(value)&&!t.includes('Different user metric')));await editor.click();
  check(id+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 check('saved source fixtures unchanged and no external traffic/errors',original===await page.evaluate(()=>JSON.stringify(window.__surfaceFixtures))&&external===0&&errors.length===0);await page.screenshot({path:path.join(output,mode+'-legacy-skills.png')});await context.close();
}}finally{await browser.close();await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks},null,2)+'\n');}console.log(JSON.stringify({checks:checks.length,output}));
