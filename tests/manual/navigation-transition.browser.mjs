import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NAVIGATION_URL||'http://127.0.0.1:3417',out=process.env.NAVIGATION_OUT||'.qa/navigation-local';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
try {for(const width of [1440,393]){
 const ctx=await browser.newContext({viewport:{width,height:900}}),errors=[];
 await ctx.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());
  if(q.method()!=='GET'||u.origin!==new URL(base).origin||u.pathname.startsWith('/api/bls'))return r.abort();
  // Optional public read-only evidence for a credentials-free local UI. Never proxy mutations.
  if(process.env.NAVIGATION_USE_PUBLIC_EVIDENCE==='true'&&u.pathname.startsWith('/api/'))return r.fulfill({response:await r.fetch({url:'https://www.ed-ai.app'+u.pathname+u.search})});
  return r.continue();});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 async function focusedVisible(target){await target.waitFor();await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.waitForFunction(()=>document.activeElement?.matches('[data-journey-heading],#app-page-title'));assert.equal(await target.evaluate(el=>el===document.activeElement),true);const box=await target.boundingBox(),header=await p.locator('.app-top-header').boundingBox();assert.ok(box.y>=Math.max(0,header.y+header.height)-1||await target.getAttribute('id')==='app-page-title');assert.ok(box.y+box.height<900);}
 await p.goto(base,{waitUntil:'domcontentloaded'});
 await p.getByRole('button',{name:'Start the 3-minute demo',exact:true}).click();
 const intro=p.getByRole('heading',{name:'How can we cover the capacity gap?',exact:true});await focusedVisible(intro);
 await p.getByRole('button',{name:'Compare staffing options',exact:true}).click();
 await p.getByRole('radio').first().waitFor();await focusedVisible(intro);
 await p.getByText('Adjust assumptions',{exact:true}).click();
 const volume=p.getByRole('textbox',{name:'Monthly service requests',exact:true});
 await volume.fill('1200');await p.waitForTimeout(200);
 assert.equal(await volume.evaluate(el=>el===document.activeElement),true);
 await p.getByText('Adjust assumptions',{exact:true}).click();
 await p.getByRole('radio').first().check();assert.equal(await p.getByRole('radio').first().evaluate(el=>el===document.activeElement),true);
 await p.getByRole('button',{name:'Review selected Action Plan',exact:true}).click();
 const review=p.getByRole('heading',{name:'3. Save and review',exact:true});await focusedVisible(review);
 await p.screenshot({path:`${out}/review-${width}.png`});await focusedVisible(review);console.log(JSON.stringify({width,reviewPosition:await review.boundingBox(),scrollY:await p.evaluate(()=>scrollY)}));
 await p.getByRole('button',{name:'Cancel review',exact:true}).click();await focusedVisible(intro);
 await p.getByRole('button',{name:'Review selected Action Plan',exact:true}).click();await focusedVisible(review);
 await p.getByText('Measurement details and assumptions',{exact:true}).click();
 await p.getByText('All proposed checkpoints and owners',{exact:true}).click();
 await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 assert.ok(await p.evaluate(()=>scrollY)>100);
 if(width<768)await p.getByRole('button',{name:'Browse pages',exact:true}).click();
 await p.getByRole('button',{name:'Baseline',exact:true}).first().click();
 const title=p.locator('#app-page-title');await p.waitForFunction(()=>new URL(location.href).searchParams.get('page')==='workforce');
 await focusedVisible(title);assert.ok(await p.evaluate(()=>scrollY)<2);
 await p.screenshot({path:`${out}/baseline-${width}.png`});
 // A filter update on the same page must leave keyboard focus on that filter.
 if(width<768)await p.getByRole('button',{name:'Workspace',exact:true}).click();
 const context=p.locator('#guided-header-context');if(await context.getAttribute('open')===null)await context.locator(':scope > summary').click();
 const filters=p.getByRole('region',{name:'Shared workforce filters',exact:true});
 const disclosure=filters.locator('summary').filter({hasText:/^Filters/});if(await disclosure.count()&&await disclosure.locator('..').getAttribute('open')===null)await disclosure.click();
 const country=filters.getByRole('combobox',{name:'Country',exact:true});await country.focus();
 const filterValues=await country.locator('option').evaluateAll(items=>items.map(item=>item.value));
 const filterValue=filterValues.find(value=>value!=='all')??'all';await country.selectOption(filterValue);const after=await p.evaluate(()=>scrollY);await p.waitForTimeout(200);
 assert.equal(await country.evaluate(el=>el===document.activeElement),true);assert.ok(Math.abs(await p.evaluate(()=>scrollY)-after)<2);
 await p.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Overview',exact:true}).click();
 await p.waitForFunction(()=>!new URL(location.href).searchParams.has('page'));await focusedVisible(title);assert.ok(await p.evaluate(()=>scrollY)<2);
 await p.goBack();await p.waitForFunction(()=>new URL(location.href).searchParams.get('page')==='workforce');await focusedVisible(title);assert.ok(await p.evaluate(()=>scrollY)<2);
 await p.goForward();await p.waitForFunction(()=>!new URL(location.href).searchParams.has('page'));await focusedVisible(title);assert.ok(await p.evaluate(()=>scrollY)<2);
 if(process.env.NAVIGATION_HANDOFF==='true'){
  if(width<768)await p.getByRole('button',{name:'Browse pages',exact:true}).click();
  await p.getByRole('button',{name:'Skills',exact:true}).first().click();
  const skill=p.getByRole('combobox',{name:'Observed skill gap',exact:true});await skill.waitFor();await skill.selectOption({index:1});
  await p.getByRole('textbox',{name:'Business goal',exact:true}).fill('Review fictional service capacity');
  await p.getByRole('button',{name:'Carry to Planning',exact:true}).click();
  await p.waitForFunction(()=>document.activeElement?.id==='carried-planning-evidence');
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await p.locator('#carried-planning-evidence').evaluate(el=>el===document.activeElement),true);
  const planningBox=await p.locator('#carried-planning-evidence').boundingBox(),planningHeader=await p.locator('.app-top-header').boundingBox();
  assert.ok(planningBox.y>=Math.max(0,planningHeader.y+planningHeader.height)-1);assert.ok(planningBox.y<900);
  await p.getByRole('button',{name:'Back to Skills',exact:true}).click();
  await p.waitForFunction(()=>document.activeElement?.id==='skills-evidence-handoff');
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await p.locator('#skills-evidence-handoff').evaluate(el=>el===document.activeElement),true);
  await p.screenshot({path:`${out}/handoff-${width}.png`});
  const handoffBox=await p.locator('#skills-evidence-handoff').boundingBox(),handoffHeader=await p.locator('.app-top-header').boundingBox();
  assert.ok(handoffBox.y>=Math.max(0,handoffHeader.y+handoffHeader.height)-1);
  assert.ok(handoffBox.y<900);
 }
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({width,reviewHeadingVisible:true,pageStartsAtTop:true,inputAndFilterFocusPreserved:true,cancelReview:true,returnHome:true,history:true,handoffs:process.env.NAVIGATION_HANDOFF==='true',filterChanged:filterValue!=='all',overflow:false,pageErrors:errors}));await ctx.unrouteAll({behavior:'ignoreErrors'});await ctx.close();
}}finally{await browser.close();}

