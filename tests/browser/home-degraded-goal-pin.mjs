// Degraded-source and optional-clarification reproduction; every API is synthetic/intercepted.
import assert from 'node:assert/strict';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {aiSkillsGoalPrompt} from '../fixtures/home-ai-skills-goal.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.HOME_BASE_URL??'http://127.0.0.1:3220',reproduce=process.env.EXPECT_PIN_BLOCKED==='1';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of (reproduce?[['desktop',1366,900]]:[['desktop',1366,900],['mobile',390,900],['zoom',683,450]])){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let recovered=false,external=0;
 page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);
   if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.')return route.fulfill({json:{proposal:{version:1,goal:body.goalContext.goal,bundles:[],question:null,unavailableReason:'Skills and learning sources remain unavailable; review the population and skill assumptions.'}}});
   return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Skills and learning sources are unavailable. ಸ',next_step:'choose_goal',problem:null,problem_evidence:[],options:[],question:'Which employee population and AI skill should the pilot cover?'}),false,body.overviewBriefingContext)});
  }
  if(url.pathname==='/api/position-modeling')return route.fulfill({json:{current:{current_positions:100}}});
  if(url.pathname==='/api/bls')return route.fulfill({json:{metrics:[{series_id:'CES0000000001',raw_value:150000,observation_date:'2026-08-01'}]}});
  if(url.pathname.startsWith('/api/')){
   if(req.method()!=='GET'){external++;return route.abort()}
   if(recovered&&url.pathname==='/api/dashboard')return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'}}});
   if(!recovered)await new Promise(resolve=>setTimeout(resolve,12500));
   return route.fulfill({status:503,json:{error:'Synthetic source unavailable'}}).catch(()=>{});
  }
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true}),state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 await page.goto(base);await chat.fill(aiSkillsGoalPrompt);await button('Send overview question').click();await page.getByRole('region',{name:'Clarify your goal'}).waitFor();
 check(mode+' only the three surviving source summaries are supplied',posts[0].overviewBriefingContext.coverage.available===3&&posts[0].overviewBriefingContext.sources.filter(s=>s.facts).map(s=>s.id).join(',')==='P2,I2,I3');
 check(mode+' missing skill evidence remains unavailable with original response text',posts[0].overviewBriefingContext.sources.find(s=>s.id==='T1').status==='timeout'&&posts[0].overviewBriefingContext.sources.find(s=>s.id==='T2').status==='timeout'&&await page.getByRole('region',{name:'Overview conversation'}).getByText('Skills and learning sources are unavailable. ಸ',{exact:true}).last().isVisible());
 if(reproduce){check('accepted PR151 reproduces blocked explicit goal on model clarification',await button('Pin as goal').count()===0&&posts.length===1);await context.close();continue;}
 await button('Pin as goal').waitFor();
 check(mode+' explicit goal remains pinnable without answering model scope question',await button('Pin as goal').isEnabled()&&await page.getByRole('region',{name:'Pin this problem'}).getByText(aiSkillsGoalPrompt,{exact:true}).isVisible()&&posts.length===1&&!(await state()).goals.activeId);
 check(mode+' missing context and optional refinement stay explicit without competing goal chooser',await page.getByText('Recorded context is unavailable. You can still pin your goal.',{exact:true}).isVisible()&&await page.getByText(/This question can refine the plan; unresolved details still need review/).isVisible()&&await button('State my goal').count()===0);
 await button('Pin as goal').evaluate(node=>{window.stalePin=node[Object.keys(node).find(k=>k.startsWith('__reactProps$'))].onClick});await chat.fill('Keep my unsent detail');
 recovered=true;await button('Open data details').click();await button('Refresh overview evidence').click();await page.waitForFunction(()=>!document.querySelector('[aria-label="Refresh overview evidence"]').disabled);await page.evaluate(()=>window.stalePin());
 check(mode+' refresh keeps authored goal available but rejects stale handler without prompt resubmit',await button('Pin as goal').isEnabled()&&!(await state()).goals.activeId&&posts.length===1&&await chat.inputValue()==='Keep my unsent detail');
 await button('Pin as goal').focus();await page.keyboard.press('Enter');const panel=page.getByRole('region',{name:'Action Plans for your goal',exact:true});await panel.getByText(/Skills and learning sources remain unavailable/).waitFor();
 const data=await state(),id=data.goals.activeId,saved=data.goals.goals.find(g=>g.id===id);
 check(mode+' explicit Pin preserves exact user goal and budget context in one preparation request',posts.length===2&&saved.statement===aiSkillsGoalPrompt&&posts[1].goalContext.goal===aiSkillsGoalPrompt&&posts[1].goalContext.notes.map(n=>n.text).join(' ')===aiSkillsGoalPrompt&&saved.context.decisions==='');
 check(mode+' Pin uses refreshed evidence without claiming skills data or inventing plans',posts[1].overviewBriefingContext.coverage.available===4&&posts[1].overviewBriefingContext.sources.find(s=>s.id==='T1').facts===null&&await panel.getByRole('tab').count()===0&&!data.workspaces[id].fields.homeCandidateOptions&&!data.workspaces[id].fields.homeSolutionBundlesV1);
 check(mode+' optional model question is not promoted into user decisions',!posts[1].goalContext.notes.some(n=>n.text.includes('Which employee population'))&&await page.getByRole('region',{name:'Clarify your goal'}).count()===0);
 await page.reload();await panel.getByText(/Skills and learning sources remain unavailable/).waitFor();check(mode+' reload keeps goal and empty proposal without another model request',posts.length===2&&(await state()).goals.activeId===id);
 check(mode+' responsive runtime and network boundaries',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
}}finally{await browser.close()}console.log(JSON.stringify({checks}));
