// Read-only HTTP acceptance; all goal/scenario writes stay in isolated browser storage.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.SKILLS_BASE_URL||'http://127.0.0.1:4207',out=process.env.SKILLS_OUTPUT_DIR;
if(out)await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[],blocked=[];let skills;
 p.on('pageerror',e=>errors.push(e.message));p.on('response',async r=>{if(new URL(r.url()).pathname==='/api/skills'&&r.status()===200)try{skills=await r.json();}catch{/* context closed */}});
 await context.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(q.method()!=='GET'||u.origin!==origin){blocked.push(u.pathname);return r.abort();}if(process.env.SKILLS_FIXTURES&&u.pathname.startsWith('/api/')){try{return r.fulfill({contentType:'application/json',body:await fs.readFile(process.env.SKILLS_FIXTURES+'/history-'+u.pathname.slice(5)+'.json','utf8')});}catch{return r.fulfill({status:503,json:{error:'Unavailable fixture'}});}}return r.continue();});
 await p.goto(origin+'/?page=skills');const list=p.getByRole('list',{name:'Largest apparent proficiency gaps',exact:true});await list.waitFor();assert.ok(skills?.largest_gaps.length);
 const rows=list.locator(':scope > li');assert.equal(await rows.count(),skills.largest_gaps.length);
 for(let i=0;i<skills.largest_gaps.length;i++){
  const row=rows.nth(i),source=skills.largest_gaps[i],main=row.locator(':scope > dl');
  assert.equal(await row.getByRole('heading').innerText(),source.skill_name);assert.match(await main.innerText(),new RegExp(source.requirement_met_pct.toFixed(1)+'%'));assert.ok((await main.innerText()).includes(source.employees_in_roles_requiring_skill.toLocaleString()));assert.equal(await row.locator('details').getAttribute('open'),null);
  const box=await main.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width,JSON.stringify(box));assert.equal(await row.evaluate(e=>e.scrollWidth>e.clientWidth),false);
 }
 await rows.first().locator('summary').focus();await p.keyboard.press('Enter');assert.equal(await rows.first().locator('details').getAttribute('open'),'');await rows.first().locator('summary').click();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(out){await rows.first().scrollIntoViewIfNeeded();await rows.first().evaluate(e=>window.scrollBy(0,e.getBoundingClientRect().top-280));await p.screenshot({path:out+'/skills-'+width+'.png'});}
 const select=p.getByRole('combobox',{name:/^Observed skill gap/});const skill=skills.largest_gaps.find(s=>s.skill_name==='AI Product Management')||skills.largest_gaps[0];await select.selectOption(skill.skill_code);
 const statement='Improve AI product delivery';await p.getByLabel('Business goal',{exact:false}).fill(statement);await p.getByRole('button',{name:'Carry to Planning',exact:true}).click();
 const evidence=p.getByRole('region',{name:'Carried planning evidence',exact:true});await evidence.waitFor();const packet=await evidence.innerText();assert.ok(packet.includes(skill.skill_name));assert.ok(packet.includes(statement));
 const volume=p.getByRole('textbox',{name:'Work items each month',exact:true});assert.equal(await volume.inputValue(),'');assert.equal(await p.getByRole('textbox',{name:'People at the start',exact:true}).inputValue(),'');
 await p.getByRole('textbox',{name:'Work to plan',exact:true}).fill('Manual tickets');await volume.fill('321');
 const storage=()=>p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.includes('preference')))));
 const before=await storage();await p.getByRole('button',{name:'Create goal from carried context',exact:true}).click();assert.equal(await p.getByRole('textbox',{name:/^Goal statement/}).inputValue(),statement);await p.getByRole('button',{name:'Cancel goal choice',exact:true}).click();assert.equal(await storage(),before);assert.equal(await volume.inputValue(),'321');assert.equal(await evidence.innerText(),packet);
 await p.getByRole('button',{name:'Create goal from carried context',exact:true}).click();if(out)await p.getByLabel('Review planning goal choice',{exact:true}).screenshot({path:out+'/goal-review-'+width+'.png'});await p.getByRole('button',{name:'Create and use goal',exact:true}).click();
 await p.getByRole('button',{name:'Create goal from carried context',exact:true}).waitFor({state:'detached'});assert.equal(await volume.inputValue(),'321');assert.equal(await evidence.innerText(),packet);assert.match(p.url(),/page=planning-overview/);
 const goalSelect=p.getByRole('combobox',{name:/^Selected (Action Plan|goal)$/});assert.ok((await goalSelect.locator('option:checked').innerText()).includes(statement));
 for(const [name,value]of [['Hours per item','2'],['People at the start','10'],['Contracted time at start (FTE)','8']])await p.getByRole('textbox',{name,exact:true}).fill(value);
 await p.getByText('Timing & capacity assumptions (required)',{exact:true}).click();await p.getByLabel('Opening date (month end)',{exact:true}).fill('2026-09-30');
 for(const [name,value]of [['Planning months','3'],['Productive hours per FTE / month','160'],['Hires each month (people)','0'],['Departures each month (people)','0'],['Time assigned to this work (%)','100'],['Productivity improvement (%)','0']])await p.getByRole('textbox',{name,exact:true}).fill(value);
 await p.getByRole('checkbox',{name:/Assume each person joining or leaving/}).check();await p.getByRole('checkbox',{name:/I confirm these values repeat each month/}).check();await p.getByRole('button',{name:'Calculate capacity',exact:true}).click();
 await p.getByRole('textbox',{name:'Capacity scenario name',exact:true}).fill('Manual source scenario');await p.getByRole('button',{name:'Save scenario',exact:true}).click();const saved=p.getByRole('combobox',{name:'Saved capacity scenario',exact:true});await saved.locator('option').filter({hasText:'Manual source scenario'}).waitFor({state:'attached'});
 await goalSelect.selectOption('');await p.getByRole('button',{name:'Select existing goal here',exact:true}).waitFor();assert.equal(await volume.inputValue(),'321');await volume.fill('777');
 const beforeSelect=await storage();await p.getByRole('button',{name:'Select existing goal here',exact:true}).click();await p.getByRole('combobox',{name:/^Existing goal/}).selectOption({label:statement});await p.getByRole('button',{name:'Cancel goal choice',exact:true}).click();assert.equal(await storage(),beforeSelect);assert.equal(await volume.inputValue(),'777');
 await p.getByRole('button',{name:'Select existing goal here',exact:true}).click();await p.getByRole('combobox',{name:/^Existing goal/}).selectOption({label:statement});await p.getByRole('button',{name:'Use selected goal',exact:true}).click();await p.getByRole('button',{name:'Select existing goal here',exact:true}).waitFor({state:'detached'});
 assert.equal(await volume.inputValue(),'777');assert.equal(await evidence.innerText(),packet);assert.match(p.url(),/page=planning-overview/);assert.ok((await saved.locator('option').allTextContents()).some(t=>t.includes('Manual source scenario')));assert.equal(await p.getByRole('button',{name:'Save scenario',exact:true}).isDisabled(),true);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 console.log(JSON.stringify({origin,width,fixtures:!!process.env.SKILLS_FIXTURES,skill:skill.skill_name,rows:skills.largest_gaps.length,create:true,select:true,cancelNoWrites:true,draftRetained:777,savedScenarioRetained:true,manualInputsOnly:true,errors,blocked}));await context.close();
}}finally{await browser.close();}
