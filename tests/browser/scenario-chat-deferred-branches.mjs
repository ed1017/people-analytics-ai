// Bounded diagnostic pass: real local application, synthetic API/state only.
// No application behavior is patched. Deferred replies exercise overlap, not a live model.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {encodeDecisions,DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
import {createSkillsEvidenceHandoff,assessSkillsEvidenceFreshness} from '../../lib/evidence-handoff.ts';
import {enterpriseTalentEvidenceScope} from '../../lib/talent-evidence-scope.ts';
import {talentResponseChatSnapshot,selectTalentResponseEvidence} from '../../lib/talent-response-evidence.ts';
import {skill,skillsData} from '../fixtures/skills-evidence.mjs';
import {structural,rolePlan} from '../fixtures/scenario-typing-branches.ts';
import {scopeDashboard,scopeEnterprise} from '../fixtures/home-scope-evidence.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3399';
const goal='Reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget.';
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:12,fill_rate_pct:90,productivity_hiring_reduction_pct:5};
const points=Array.from({length:12},(_,i)=>({planning_month:'2027-'+String(i+1).padStart(2,'0')+'-01',planned_headcount:1000+i*10,planned_fte:980+i*10,planned_hires:15,planned_exits:5,planned_labor_cost_usd:10000000+i*100000}));
const custom=runScenarioModel({asOf:'2026-09-30',startingHeadcount:1000,baselinePoints:points,defaults,assumptions:defaults});
const planning={scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',description:'Synthetic company-wide scenario',assumptions:[],points}]};
const positions={as_of:'2026-09-30',planning_month:'2027-12-01',current:{current_positions:1100,filled_positions:1000,vacant_positions:100,planned_positions:1100,frozen_positions:0,closed_positions:0,vacancy_rate_pct:9.09},scenarios:[]};
const handoff=createSkillsEvidenceHandoff({skillsData,skill,evidenceScope:enterpriseTalentEvidenceScope({label:'Company',asOf:skillsData.as_of,populationLabel:'employees',populationCount:10000,supportedBreakdowns:['skill']}),selectedBusinessContext:{country:'United States',businessUnit:'All business units',level:'All levels'},businessGoal:goal,id:'synthetic-handoff',createdAt:'2026-10-07T00:00:00.000Z'});
assert.equal(handoff.ok,true);assert.equal(assessSkillsEvidenceFreshness(handoff.value,skillsData).status,'current');
const talent=talentResponseChatSnapshot('SYN-ROLE','Synthetic role',goal,goal,false,selectTalentResponseEvidence('SYN-ROLE',null,null,rolePlan));
const variants=[['delays',[]],['skills',['skills']],['talent',['talent']],['structural',['structural']],['role-dormant',['role']],['structural-role',['structural','role']],['all',['skills','talent','structural','role']]];
const report={fixtureOnly:true,base,cases:[],checks:0};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const check=(name,ok)=>{assert.ok(ok,name);report.checks++;console.log('PASS '+name)};
const until=async(fn,label)=>{const deadline=Date.now()+12000;while(!await fn()){if(Date.now()>deadline)throw Error('Timed out: '+label);await new Promise(resolve=>setTimeout(resolve,25));}};
try{for(const [name,flags,width] of [...variants.map(([name,flags])=>[name,flags,1366]),['all-mobile',['skills','talent','structural','role'],390]]){
 const result={name,width,flags,errors:[],consoleErrors:[],requests:[],phases:[]};report.cases.push(result);
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(12000);
 const fields={'planning.customScenario':custom,'planning.customAssumptions':defaults};
 if(flags.includes('skills'))fields.skillsHandoff=handoff.value;
 if(flags.includes('talent'))fields.talentContext=talent;
 if(flags.includes('structural'))fields['planning.structuralPositionResult']=structural;
 if(flags.includes('role')){fields['planning.roleResponsePlanProfile']='SYN-ROLE';fields['planning.roleResponsePlanResult']=rolePlan;fields['planning.roleResponsePlanAllocation']=rolePlan.allocation;}
 const seed={version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:goal}]},workspaces:{a:{savedAt:'2026-10-07T00:00:00.000Z',fields}}};
 await context.addInitScript(({key,value})=>{
  localStorage.setItem(key,value);
  window.__typingProbe={commits:0,writes:0,mutations:0,fetches:[]};
  const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)window.__typingProbe.writes++;return original.call(this,k,v)};
  // Count React root commits without altering render, effects, subscriptions or state.
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,renderers:new Map(),inject(renderer){this.renderers.set(1,renderer);return 1},onCommitFiberRoot(){window.__typingProbe.commits++},onCommitFiberUnmount(){},onPostCommitFiberRoot(){},checkDCE(){}};
  new MutationObserver(rows=>{window.__typingProbe.mutations+=rows.length}).observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
  const fetchOriginal=window.fetch;window.fetch=async(...args)=>{const row={url:String(args[0]),started:performance.now()};window.__typingProbe.fetches.push(row);try{const response=await fetchOriginal(...args);row.delivered=performance.now();return response}catch(error){row.failed=String(error);throw error}};
 },{key:DECISIONS_STORAGE_KEY,value:encodeDecisions(seed)});
 page.on('pageerror',error=>{if(result.errors.length<3)result.errors.push({message:error.message,stack:error.stack})});
 page.on('console',message=>{if(message.type()==='error'&&/react|update depth|too many re-renders|uncaught/i.test(message.text())&&result.consoleErrors.length<3)result.consoleErrors.push({text:message.text(),location:message.location()})});
 const holds=new Set(['/api/skills','/api/workforce-planning','/api/position-modeling','/api/scenario-modeler','/api/chat']),pending=[];
 let chatSequence=0;
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==base){result.requests.push({external:url.origin});return route.abort()}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  const record={path:url.pathname,query:url.search,held:holds.has(url.pathname),at:Date.now()};result.requests.push(record);
  const data=url.pathname==='/api/chat'?{answer:`Synthetic delayed company-wide takeaway ${++chatSequence}.`,nextStep:'none'}:url.pathname==='/api/dashboard'?scopeDashboard(url.search):url.pathname==='/api/skills'?skillsData:url.pathname==='/api/scenario-modeler'?custom:url.pathname==='/api/workforce-planning'?planning:url.pathname==='/api/position-modeling'?positions:url.pathname==='/api/business-unit-scenario'?{defaults,business_units:[]}:scopeEnterprise[url.pathname.slice(5)];
  const reply=async()=>{record.released=Date.now();try{await route.fulfill(data?{json:data}:{status:503,json:{error:'Synthetic source unavailable'}})}catch(error){record.releaseError=String(error)}};
  if(record.held){pending.push({path:url.pathname,reply,record});return}await reply();
 });
 const input=()=>page.getByLabel('Ask People Analytics AI',{exact:true});
 const nav=async destination=>{
  const item=destination==='home'?page.getByRole('button',{name:'Action Planning',exact:true}):page.locator(`[data-nav-destination="${destination}"]`);
  if(!await item.isVisible()){
   const open=page.getByRole('button',{name:'Open navigation',exact:true});if(await open.isVisible())await open.click();
   if(destination!=='home'){const group=page.locator('[aria-controls="navigation-strategy"]');if(await group.getAttribute('aria-expanded')!=='true')await group.click()}
  }await item.click();
 };
 const release=async paths=>{const rows=pending.filter(row=>paths.includes(row.path));for(const row of rows)pending.splice(pending.indexOf(row),1);await Promise.all(rows.map(row=>row.reply()));return rows.length};
 const stats=()=>page.evaluate(key=>({commits:window.__typingProbe.commits,writes:window.__typingProbe.writes,mutations:window.__typingProbe.mutations,revision:JSON.parse(localStorage.getItem(key)).payload.revision}),DECISIONS_STORAGE_KEY);
 const phase=async(label,action,chars=100)=>{const before=await stats();await action();await page.waitForTimeout(180);const after=await stats();const delta=Object.fromEntries(Object.keys(before).map(key=>[key,after[key]-before[key]]));result.phases.push({label,delta});check(name+' '+label+' bounded commits/writes',delta.commits<chars*12+250&&delta.writes<chars*2+35);check(name+' '+label+' no React error',result.errors.length===0&&result.consoleErrors.length===0)};
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload.workspaces.a.fields,DECISIONS_STORAGE_KEY);
 try{
  await page.goto(base);await page.getByLabel('Selected goal',{exact:true}).waitFor();await nav('scenario-modeling');await input().waitFor();
  await until(()=>pending.some(row=>row.path==='/api/workforce-planning'),'deferred planning request');
  await phase('initial evidence completes mid-keystroke',async()=>{
   const text='Keep the exact goal while delayed scenario and skills sources arrive.';
   const typing=input().pressSequentially(text,{delay:18});await page.waitForTimeout(90);
   check(name+' initial reply overlaps typing',(await input().inputValue()).length>0&&(await input().inputValue()).length<text.length);
   await release(['/api/workforce-planning','/api/position-modeling','/api/scenario-modeler','/api/skills']);await typing;
   check(name+' exact initial draft retained',await input().inputValue()===text);
  });
  if(flags.includes('skills'))check(name+' Skills validation branch mounted',await page.getByLabel('Carried planning evidence').count()===1);
  check(name+' actual role evidence mount matches structural prerequisite',await page.getByLabel('Talent evidence for response options').count()===(flags.includes('structural')?1:0));
  if(flags.includes('structural'))check(name+' mounted talent effect publishes snapshot',JSON.parse((await saved()).talentContext).status==='not-compared');
  holds.add('/api/dashboard');const country=page.getByLabel('Country',{exact:true});
  await country.evaluate(node=>node.closest('details')?.setAttribute('open',''));await country.selectOption('US');await until(()=>pending.some(row=>row.path==='/api/dashboard'),'US dashboard held');
  await phase('US dashboard completes mid-keystroke',async()=>{const typing=input().pressSequentially(' Preserve company source scope.',{delay:18});await page.waitForTimeout(80);check(name+' delayed dashboard requests released',await release(['/api/dashboard'])>0);await typing});
  // Clearing the draft enables a real GoalTakeaway effect. Hold its transport,
  // then type before delivering: the application must cancel/ignore the late reply.
  await input().fill('');await until(()=>pending.some(row=>row.path==='/api/chat'),'takeaway before typing');
  await phase('takeaway delivery after typing starts',async()=>{const typing=input().pressSequentially('A late takeaway must not replace this unfinished request.',{delay:18});await page.waitForTimeout(100);check(name+' held takeaway released',await release(['/api/chat'])>0);await typing});
  check(name+' no late takeaway appended as user answer',!(await saved()).chat.messages.some(row=>row.content?.includes('Synthetic delayed')));
  // Keep new dashboard/Skills replies pending while the owning page is left.
  await country.selectOption('all');await until(()=>pending.some(row=>row.path==='/api/dashboard'),'dashboard before page exit');
  await phase('page exit and stale reply delivery',async()=>{await nav('home');check(name+' delayed exit dashboard released',await release(['/api/dashboard','/api/skills','/api/chat'])>0);await nav('scenario-modeling');await input().waitFor();if(flags.includes('skills'))await until(()=>pending.some(row=>row.path==='/api/skills'),'new validation on reentry');const typing=input().pressSequentially(' Still here after returning.',{delay:18});await page.waitForTimeout(80);await release(['/api/skills','/api/workforce-planning','/api/position-modeling','/api/scenario-modeler']);await typing});
  const final=await saved();
  for(const key of Object.keys(fields).filter(key=>key!=='talentContext'))check(name+' preserves '+key,JSON.stringify(final[key])===JSON.stringify(fields[key]));
  check(name+' React commit observer active',(await stats()).commits>0);
  // Recharts animates a newly mounted chart for 1500ms. Measure quiescence
  // after that animation, while retaining phase commit bounds above.
  await page.waitForTimeout(1600);const beforeIdle=await stats();await page.waitForTimeout(600);const idle=await stats();result.idle={commits:idle.commits-beforeIdle.commits,writes:idle.writes-beforeIdle.writes};check(name+' post-animation idle settles',result.idle.commits<=4&&result.idle.writes<=2);
  result.fetches=await page.evaluate(()=>window.__typingProbe.fetches);check(name+' local synthetic transport only',!result.requests.some(row=>row.external));
  result.passed=true;
 }catch(error){result.failure={message:error.message,stack:error.stack};result.fetches=await page.evaluate(()=>window.__typingProbe?.fetches).catch(()=>[]);throw error}
 finally{holds.clear();await release([...new Set(pending.map(row=>row.path))]);await context.close();await writeFile(process.env.SCENARIO_DEFERRED_OUTPUT??'/tmp/scenario-chat-deferred-branches.json',JSON.stringify(report,null,2)+'\n')}
}}finally{await browser.close()}
console.log(JSON.stringify({checks:report.checks,cases:report.cases.length,fixtureOnly:true}));
