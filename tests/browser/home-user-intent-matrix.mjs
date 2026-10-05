// Local user intent across valid/invalid/empty synthetic AI responses. No live requests.
import assert from 'node:assert/strict';
import {decodeHomeModelReply} from '../../lib/home-chat-reply.ts';
import {homeBundleTask} from '../../lib/home-bundle-task.ts';
import {deliveryAcceptanceWire} from '../fixtures/home-exact-acceptance.mjs';
import {inspectBundleResponse} from '../../lib/home-bundle-response.ts';
import {aiSkillsGoalPrompt} from '../fixtures/home-ai-skills-goal.mjs';
import {DECISIONS_STORAGE_KEY} from '../../lib/local-decisions.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),base=process.env.HOME_BASE_URL??'http://127.0.0.1:3204';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const shapes={valid:{problem:'Review workforce support',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']}]},invalid:{problem:'Build AI skills in 90 days',problem_evidence:['W1.headcount'],options:[{},{}]},empty:{problem:null,problem_evidence:[],options:[]}};
let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try{for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,900],['zoom',683,450]])for(const [shape,fields] of Object.entries(shapes)){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),posts=[],errors=[];let external=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin!==base){external++;return route.abort()}
  if(url.pathname==='/api/chat'){
   const body=req.postDataJSON();posts.push(body);
   if(body.message==='Prepare coordinated solution bundles for my exact pinned goal.'){
    check(mode+' '+shape+' explicit skills goal uses delivery contract',homeBundleTask(body.goalContext)==='delivery');
    const wire=deliveryAcceptanceWire(body.goalContext.goal),result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(wire)}),body.goalContext.goal,body.overviewBriefingContext,homeBundleTask(body.goalContext));
    return route.fulfill({json:result});
   }
   return route.fulfill({json:decodeHomeModelReply(JSON.stringify({answer:'Synthetic answer '+posts.length,next_step:'none',question:null,...fields}),false,body.overviewBriefingContext)});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{overview:{headcount:100,fte:100,open_positions:3,snapshot_date:'2026-09-30'}}});
  return route.continue();
 });
 const button=name=>page.getByRole('button',{name,exact:true}),chat=page.getByLabel('Ask Workforce AI',{exact:true});
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).payload,DECISIONS_STORAGE_KEY);
 const send=async text=>{const count=posts.length;await chat.fill(text);await button('Send overview question').click();await page.getByText('Synthetic answer '+(count+1),{exact:true}).first().waitFor({state:'attached'})};
 const userGoal=async text=>{await button('Pin as goal').waitFor();return await page.getByRole('region',{name:'Pin this problem'}).getByText(text,{exact:true}).isVisible()};
 await page.goto(base);await send('What does the evidence show?');
 check(mode+' '+shape+' general question never becomes a user-authored goal',shape==='valid'?await page.getByRole('heading',{name:'Suggested goal',exact:true}).isVisible():await button('Pin as goal').count()===0);
 for(const text of ['Help me build AI skills',"I'd like to build AI skills",'We need stronger AI skills']){await send(text);check(mode+' '+shape+' explicit request '+text,await userGoal(text)&&!(await state()).goals.activeId)}
 await send('Use USD20,000 as a cap.');check(mode+' '+shape+' mid-conversation outcome survives later context',await userGoal('We need stronger AI skills'));
 await send('Build AI skills within 90 days. What evidence is available?');check(mode+' '+shape+' separate question does not erase explicit outcome',await userGoal('Build AI skills within 90 days.'));
 await send('Build AI skills within 90 days\nUse USD20,000 as a cap.');check(mode+' '+shape+' newline preserves exact outcome without unit inference',await userGoal('Build AI skills within 90 days'));
 await send('Cancel that goal');check(mode+' '+shape+' withdrawal offers neither user nor model Pin',await button('Pin as goal').count()===0&&await button('Review goal').count()===0);
 await send('What evidence is available?');check(mode+' '+shape+' later question cannot revive withdrawn goal',await button('Pin as goal').count()===0);
 await send('Build AI skills');check(mode+' '+shape+' repeated explicit goal after withdrawal is recognized',await userGoal('Build AI skills'));
 for(const text of ['Can we build AI skills?',"I'd like to discuss AI skills",'Build '+ 'specific AI skills '.repeat(20)]){
  await send(text);await button('Review goal').waitFor();check(mode+' '+shape+' uncertain/oversized request requires editor',await button('Pin as goal').count()===0&&!(await state()).goals.activeId);
  const before=posts.length;await button('Review goal').focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await dialog.waitFor();
  check(mode+' '+shape+' existing editor keeps authored context and does not infer shortened goal',await dialog.getByLabel('Problem statement',{exact:true}).inputValue()===(text.length<=240?text:'')&&(await dialog.getByLabel('Constraints, assumptions and context').inputValue()).includes(text.trim())&&posts.length===before);
  await dialog.getByLabel('Problem statement',{exact:true}).fill('Build AI skills');
  check(mode+' '+shape+' review edit retains original provenance/context',await dialog.getByText(text,{exact:true}).count()>0||await dialog.getByText(text,{exact:false}).count()>0);
  await button('Close Focused issue').click();check(mode+' '+shape+' closing review creates no goal or request',!(await state()).goals.activeId&&posts.length===before);
 }
 await send(aiSkillsGoalPrompt);check(mode+' '+shape+' exact approved rehearsal prompt remains unchanged',await userGoal(aiSkillsGoalPrompt));
 const beforePin=posts.length;await button('Pin as goal').click();await page.locator('[data-plan-current="true"]').waitFor();
 const saved=await state();check(mode+' '+shape+' explicit Pin retains only current authored goal context',posts.length===beforePin+1&&posts.at(-1).goalContext.goal===aiSkillsGoalPrompt&&posts.at(-1).goalContext.notes.map(note=>note.text).join(' ')===aiSkillsGoalPrompt&&saved.goals.goals.find(goal=>goal.id===saved.goals.activeId).statement===aiSkillsGoalPrompt&&!saved.workspaces[saved.goals.activeId].fields.homeCandidateOptions);
 check(mode+' '+shape+' responsive runtime/network boundaries',errors.length===0&&external===0&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close()}
console.log(JSON.stringify({checks}));
