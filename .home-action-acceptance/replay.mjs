/** Offline Review/Choose/reload replay of exact validated route receipts; never calls a provider. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {compileClient,aggregateFixture} from './browser-client.mjs';
import {readReplayPayload} from './fixture.mjs';
import {dismissHomeOnboarding} from '../tests/browser/dismiss-home-onboarding.mjs';
import {DecisionStore,DECISIONS_STORAGE_KEY,parseDecisions} from '../lib/local-decisions.ts';
import {solutionConversationField,currentSolutionProposals} from '../lib/home-solution-conversation.ts';
import {planAlternativesField} from '../lib/home-plan-alternatives.ts';
export async function replayReceipts(paths){
 if(!paths.length||paths.length>2)throw Error('one_or_two_explicit_receipts_required');
 const receipts=await Promise.all(paths.map(async file=>readReplayPayload(JSON.parse(await fs.readFile(file,'utf8')))));
 const root=fileURLToPath(new URL('../',import.meta.url)),output=await fs.mkdtemp(path.join(os.tmpdir(),'home-action-replay-')),html=await compileClient(root,output);
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const checks=[];
 try{for(const receipt of receipts){for(const [mode,width,height] of [['desktop',1366,900],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mode==='mobile',hasTouch:mode==='mobile'}),page=await context.newPage(),base='http://127.0.0.1:3100',errors=[],blocked=[];let posts=0;
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());
   if(url.origin!==base){blocked.push(request.url());return route.abort();}
   if(request.method()==='GET'&&request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});
   if(request.method()!=='GET'){posts++;return route.abort();}
   if(!url.pathname.startsWith('/api/')){blocked.push(request.url());return route.abort();}
   return route.fulfill({json:aggregateFixture});
  });
  await page.goto(base+'/');await dismissHomeOnboarding(page);
  const originalRaw=await page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY),original=parseDecisions(originalRaw);
  assert.equal(original.goals.activeId,'');
  // Seed only the retained checked state, through the existing local-store commit.
  // This is offline UI replay, not a claim that a new model response was produced.
  const data=new Map([[DECISIONS_STORAGE_KEY,originalRaw]]),store=new DecisionStore();
  store.initialize({getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)});
  store.commitExplorationFields(store.getSnapshot().data.revision,new Date().toISOString(),()=>({[solutionConversationField]:receipt.reply.state}));
  await page.evaluate(([key,value])=>localStorage.setItem(key,value),[DECISIONS_STORAGE_KEY,data.get(DECISIONS_STORAGE_KEY)]);
  await page.reload();await dismissHomeOnboarding(page);
  const proposals=currentSolutionProposals(receipt.reply.state),cards=page.getByRole('article',{name:/^Working proposal:/});
  await cards.first().waitFor();assert.equal(await cards.count(),3);
  const stored=async()=>parseDecisions(await page.evaluate(key=>localStorage.getItem(key),DECISIONS_STORAGE_KEY));
  assert.deepEqual((await stored()).exploration.fields[solutionConversationField],receipt.reply.state);
  const beforeReview=await stored(),navigation=page.getByRole('navigation',{name:'Review proposed Action Plans'});
  await navigation.getByRole('button',{name:'Review 1: '+proposals[0].candidate.name,exact:true}).click();
  assert.equal(await cards.first().evaluate(node=>document.activeElement===node),true);assert.deepEqual(await stored(),beforeReview);
  await cards.first().getByRole('button',{name:/^Choose this plan/}).click();
  await cards.first().getByRole('button',{name:'Selected as Action Plan #1',exact:true}).waitFor();
  const selected=await stored(),goalId=selected.goals.activeId,catalog=selected.workspaces[goalId].fields[planAlternativesField];
  assert.ok(goalId);assert.equal(catalog.plans.length,1);assert.equal(catalog.attachments.length,1);assert.equal(catalog.plans[0].applied,false);
  assert.equal(catalog.plans[0].operation.proposalKey,JSON.stringify(proposals[0].candidate));
  assert.deepEqual(catalog.plans[0].draft.bundle,proposals[0].draft.bundle);assert.deepEqual(catalog.plans[0].draft.inputs,proposals[0].draft.inputs);
  for(const goal of original.goals.goals){assert.deepEqual(selected.goals.goals.find(row=>row.id===goal.id),goal);assert.deepEqual(selected.workspaces[goal.id],original.workspaces[goal.id]);}
  await page.reload();await dismissHomeOnboarding(page);
  assert.deepEqual((await stored()).workspaces[goalId].fields[planAlternativesField],catalog);
  assert.equal(posts,0);assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
  checks.push({scenarioIndex:receipt.scenarioIndex,mode,exactStateRestored:true,threeCards:true,reviewFocusedWithoutMutation:true,explicitChooseLinked:true,sourceCandidateRetained:true,oldGoalsPreserved:true,reloadPreserved:true,modelPosts:posts,errors,blocked});
  await context.close();
 }}}finally{await browser.close();}
 const result={providerCalls:0,databaseCalls:0,actualHomePage:true,exactReceiptReplay:true,hostedBrowser:false,checks};
 await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});return {...result,output};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(await replayReceipts(process.argv.slice(2))));
