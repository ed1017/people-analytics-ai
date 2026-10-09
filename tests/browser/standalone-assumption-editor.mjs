/** Actual rendered route; never invokes a model or application API. */
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.EDITOR_BASE_URL??'http://127.0.0.1:3612';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
let assertions=0;
const check=(value,label)=>{assert.ok(value,label);assertions++;};
try{
 for(const [label,width,height] of [['desktop',1280,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:label==='mobile',hasTouch:label==='mobile'});
  const page=await context.newPage(),errors=[],api=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>localStorage.setItem('insights-to-action.decisions.v1','PRESERVED_BROWSER_HISTORY_SENTINEL'));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){api.push(url.pathname);return route.abort();}
   if(url.origin!==new URL(base).origin)return route.abort();
   await route.continue();
  });
  const response=await page.goto(base+'/planning/assumptions');
  check(response.status()===200,label+' route serves');
  await page.getByRole('heading',{name:'Planning assumption editor',exact:true}).waitFor();
  const summary=page.getByRole('region',{name:'Reviewed workload illustration'});
  check(await summary.getByText('8,000 hours',{exact:true}).count()===2,label+' original workload and gap');
  check(await page.getByRole('region',{name:'Edit business demand assumptions'}).count()===0,label+' editor is optional');
  await page.getByRole('button',{name:'Edit assumptions',exact:true}).click();
  check(await page.getByLabel('Planning months',{exact:true}).evaluate(el=>el===document.activeElement),label+' focus enters editor');
  await page.getByLabel('Planning months',{exact:true}).fill('9');
  await page.getByLabel('Existing roles',{exact:true}).fill('4');
  await page.getByLabel('Uncommitted availability (%)',{exact:true}).fill('25');
  await page.getByRole('button',{name:'Review edited assumptions',exact:true}).click();
  check(await summary.getByText('4,800 hours',{exact:true}).count()===1,label+' edited gap uses reviewed arithmetic');
  check(await summary.getByText('1,200 hours',{exact:true}).count()===1,label+' available capacity recalculated');
  await page.getByRole('button',{name:'Edit assumptions',exact:true}).click();
  await page.getByLabel('Contracts',{exact:true}).fill('4');
  await page.getByRole('button',{name:'Cancel assumption edits',exact:true}).click();
  check(await summary.getByRole('heading',{name:'2 proposed managed-services contracts'}).count()===1,label+' cancel preserves reviewed contract count');
  await page.getByRole('button',{name:'Edit assumptions',exact:true}).click();
  await page.getByLabel('Planning months',{exact:true}).fill('25');
  await page.getByRole('button',{name:'Review edited assumptions',exact:true}).click();
  const editor=page.getByRole('region',{name:'Edit business demand assumptions'});
  await editor.getByRole('alert').waitFor();
  check(await editor.getByRole('alert').count()===1,label+' invalid horizon rejected');
  check(await summary.getByText('4,800 hours',{exact:true}).count()===1,label+' invalid edit preserves result');
  await page.getByLabel('Planning months',{exact:true}).press('Escape');
  check(await page.getByRole('region',{name:'Edit business demand assumptions'}).count()===0,label+' Escape cancels');
  await page.getByRole('button',{name:'Reset illustration',exact:true}).click();
  await page.getByRole('button',{name:'Edit assumptions',exact:true}).click();
  await page.getByRole('combobox',{name:/^Role hours per contract period/}).selectOption('');
  await page.getByRole('button',{name:'Review edited assumptions',exact:true}).click();
  check(await summary.getByText('Some assumptions need clarification before calculating.',{exact:true}).count()===1,label+' missing unit stays unresolved');
  check(await summary.getByText('8,000 hours',{exact:true}).count()===0,label+' no obsolete calculation shown');
  await page.reload();
  check(await page.getByRole('region',{name:'Reviewed workload illustration'}).getByText('8,000 hours',{exact:true}).count()===2,label+' reload starts disclosed illustration');
  check(await page.evaluate(()=>localStorage.getItem('insights-to-action.decisions.v1'))==='PRESERVED_BROWSER_HISTORY_SENTINEL',label+' stored decision history untouched');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no horizontal overflow');
  check(api.length===0,label+' no application API calls');
  check(errors.length===0,label+' no browser runtime errors');
  console.log('PASS '+label+' rendered editor flow');
  await context.close();
 }
 console.log(JSON.stringify({status:'passed',assertions,base,modelCalls:0}));
}finally{await browser.close();}
