import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.CONTEXT_URL||'http://127.0.0.1:3417';
const out=process.env.CONTEXT_OUT||'.qa/context-local';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
try {
 const ctx=await browser.newContext({viewport:{width:1440,height:900}}),errors=[];
 await ctx.route('**/*',r=>{const q=r.request(),u=new URL(q.url());return q.method()!=='GET'||u.origin!==new URL(base).origin||u.pathname.startsWith('/api/bls')?r.abort():r.continue();});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base,{waitUntil:'domcontentloaded'});
 await p.getByRole('button',{name:'Start the 3-minute demo',exact:true}).click();
 await p.getByRole('button',{name:'Compare staffing options',exact:true}).click();
 await p.getByRole('radio').first().check();
 await p.getByRole('button',{name:'Review selected Action Plan',exact:true}).click();
 await p.getByRole('button',{name:'Save reviewed plan and goal',exact:true}).click();
 for(const name of ['Skills','Baseline','Attrition','Pay and cost']){
  await p.setViewportSize({width:1440,height:900});
  await p.getByRole('button',{name,exact:true}).first().click();
  const full=p.getByRole('region',{name:'Goal progress',exact:true});
  await full.waitFor();assert.equal(await full.isVisible(),true);
  const toggle=p.getByRole('button',{name:/Saved goal:.*Show details/});
  assert.equal(await toggle.isVisible(),false);
  await p.screenshot({path:`${out}/${name.replaceAll(' ','-')}-desktop.png`,fullPage:true});
  await p.setViewportSize({width:390,height:900});
  if(process.env.CONTEXT_BASELINE==='true'){
   console.log(JSON.stringify({page:name,width:390,expandedHeight:(await full.boundingBox()).height}));continue;
  }
  await toggle.waitFor();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await full.isVisible(),false);
  const compact=p.locator('[aria-label="Saved goal context"]');
  assert.match(await compact.innerText(),/Fictional demo goal/);
  assert.match(await compact.innerText(),/Page filters do not change this scope/);
  assert.match(await compact.innerText(),/Plan assumptions are not measured results/);
  assert.match(await compact.innerText(),/Fictional Service Operations.*Service Analyst/s);
  const height=(await compact.boundingBox()).height;
  await p.screenshot({path:`${out}/${name.replaceAll(' ','-')}-phone.png`,fullPage:true});
  await toggle.focus();await p.keyboard.press('Enter');
  assert.equal(await full.isVisible(),true);
  const hide=p.getByRole('button',{name:/Saved goal:.*Hide details/});
  assert.equal(await hide.getAttribute('aria-expanded'),'true');
  const measurement=full.getByText('Measurement details and plan link',{exact:true});
  if(await measurement.locator('..').getAttribute('open')===null)await measurement.click();
  await full.getByText('Measurement scope and evidence',{exact:true}).waitFor();
  await hide.focus();await p.keyboard.press('Space');
  assert.equal(await full.isVisible(),false);
  assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.setViewportSize({width:1440,height:900});assert.equal(await full.isVisible(),true);
  await p.setViewportSize({width:390,height:900});assert.equal(await full.isVisible(),false);
  await p.getByRole('button',{name:'Workspace',exact:true}).click();
  if(await p.locator('#guided-header-context').getAttribute('open')===null)await p.locator('#guided-header-context > summary').click();
  const filters=p.getByRole('region',{name:'Shared workforce filters',exact:true});
  await filters.waitFor();
  const secondary=filters.locator('summary').filter({hasText:/^(Workforce filters|Filters)/});if(await secondary.count()&&await secondary.locator('..').getAttribute('open')===null)await secondary.click();
  await filters.getByRole('combobox',{name:'Country',exact:true}).waitFor();
  assert.equal(await filters.getByRole('combobox',{name:'Country',exact:true}).isDisabled(),!['Baseline','Pay and cost'].includes(name));
  await p.getByRole('button',{name:'Close workspace',exact:true}).click();
  console.log(JSON.stringify({page:name,width:390,compactHeight:height,keyboardToggle:true,resize:true,workspaceAvailable:true,overflow:false}));
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pageErrors:errors}));
} finally {await browser.close();}
