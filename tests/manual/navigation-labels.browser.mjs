import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.LABEL_URL||'http://127.0.0.1:3417',out=process.env.LABEL_OUT||'.qa/navigation-label-local';
const destinations=[['workforce','Baseline'],['planning-overview','Scenarios'],['skills','Skills'],['compensation','Pay and cost'],['labor-market','Labor market']];
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
try{for(const width of [1440,393]){
 const ctx=await browser.newContext({viewport:{width,height:900}}),errors=[];
 await ctx.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(q.method()!=='GET'||u.origin!==new URL(base).origin||u.pathname.startsWith('/api/bls'))return r.abort();if(process.env.LABEL_PUBLIC_EVIDENCE==='true'&&u.pathname.startsWith('/api/'))return r.fulfill({response:await r.fetch({url:'https://www.ed-ai.app'+u.pathname+u.search})});return r.continue();});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base,{waitUntil:'domcontentloaded'});
 for(const [page,label] of destinations){
  if(width<600)await p.getByRole('button',{name:'Browse pages',exact:true}).click();
  const button=p.locator(`[data-nav-destination="${page}"]`);assert.equal(await button.getAttribute('aria-label'),label);assert.equal((await button.innerText()).trim(),label);await button.click();
  await p.waitForURL(u=>u.searchParams.get('page')===page);
  await p.getByRole('heading',{level:1,name:label,exact:true}).waitFor();
  await p.waitForFunction(()=>document.activeElement?.id==='app-page-title');
  assert.equal(await button.getAttribute('aria-current'),'page');
  await p.screenshot({path:`${out}/${page}-${width}.png`});
  const box=await p.locator('#app-page-title').boundingBox();assert.ok(box.y>=0&&box.y+box.height<900);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 // Section entry and existing URL reload keep the same destination wording.
 if(width<600)await p.getByRole('button',{name:'Workspace',exact:true}).click();
 await p.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('button',{name:'Plan',exact:true}).click();
 await p.getByRole('heading',{level:1,name:'Scenarios',exact:true}).waitFor();assert.equal(new URL(p.url()).searchParams.get('page'),'planning-overview');
 await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('heading',{level:1,name:'Scenarios',exact:true}).waitFor();
 if(width>=600){await p.getByRole('button',{name:'Collapse navigation',exact:true}).click();assert.equal(await p.locator('[data-nav-destination="workforce"]').getAttribute('aria-label'),'Baseline');await p.locator('[data-nav-destination="workforce"]').click();await p.getByRole('heading',{level:1,name:'Baseline',exact:true}).waitFor();}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({width,destinations:destinations.length,matchingVisibleAndAccessibleLabels:true,planEntry:true,urlReload:true,collapsedNavigation:width>=600,overflow:false,pageErrors:errors}));await ctx.unrouteAll({behavior:'ignoreErrors'});await ctx.close();
}}finally{await browser.close();}
