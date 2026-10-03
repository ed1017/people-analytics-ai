import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {selectionFixture,selectionSpec} from '../fixtures/workforce-selection.mjs';
import {searchWorkforceMixes} from '../../lib/workforce-mix-search.ts';
import {stageWorkforceMixSelection} from '../../lib/workforce-mix-selection.ts';
import {recordSolutionApproval} from '../../lib/workforce-solution.ts';
import {previewWorkforceAlternatives} from '../../lib/workforce-planning-agent.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
let {solution}=selectionFixture();
solution=recordSolutionApproval(solution,1,'approval-keep',['source-result'],'Preserve approval','2026-10-03T01:00:00.000Z');
const snapshot=searchWorkforceMixes(solution,'source-result',selectionSpec());
const context={solution,activeGoalId:solution.goalId,activeGoalStatement:'Synthetic bounded workforce comparison',evidenceResultId:'source-result',expectedSearchFingerprint:snapshot.searchFingerprint,hasUnsavedPlanEdits:false};
const revisions=[stageWorkforceMixSelection(context,snapshot,['build-0-move-3-buy-0']).revisions[0]];
const reviews=[previewWorkforceAlternatives(solution,'source-result',revisions,'keep-review','2026-10-03T01:00:00.000Z')];
const saved=JSON.stringify({solution,reviews});
const source=await fs.readFile('lib/workforce-selection-session.ts','utf8');
const script=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export function','function');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let checks=0;
const check=(name,value)=>{assert.ok(value,name);checks++;console.log('PASS '+name)};
try {
 const page=await browser.newPage(),pending=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<button id="select">Select</button><button id="cancel">Cancel</button><button id="goal">Switch goal</button><button id="evidence">Change evidence</button><pre id="state"></pre>'}));
 await page.exposeFunction('verifySelection',(c,s,ids)=>new Promise(resolve=>pending.push(()=>{
  try {resolve({ok:true,proposal:stageWorkforceMixSelection(c,s,ids)})}catch {resolve({ok:false})}
 })));
 const initialize=async()=>{
  await page.addScriptTag({content:script});
  await page.evaluate(({context,snapshot,saved})=>{
   window.fixtureContext=context;window.fixtureSnapshot=snapshot;
   if(!localStorage.getItem('saved'))localStorage.setItem('saved',saved);
   window.session=createWorkforceSelectionSession(async(c,s,ids)=>{const result=await window.verifySelection(c,s,ids);if(!result.ok)throw Error('Rejected');return result.proposal});
   window.session.setContext(context);
   const render=()=>{document.querySelector('#state').textContent=JSON.stringify(window.session.getState())};
   document.querySelector('#select').onclick=()=>{const request=window.session.select(window.fixtureSnapshot,['build-0-move-3-buy-0']);render();request.then(render)};
   document.querySelector('#cancel').onclick=()=>{window.session.cancel();render()};
   document.querySelector('#goal').onclick=()=>{context.activeGoalId=context.activeGoalId==='other'?'goal-search':'other';window.session.setContext(context);render()};
   document.querySelector('#evidence').onclick=()=>{context.evidenceResultId='new-evidence';window.session.setContext(context);render()};
   render();
  },{context,snapshot,saved});
 };
 const status=()=>page.evaluate(()=>window.session.getState().status);
 const select=async()=>{await page.click('#select');await page.waitForFunction(()=>window.session.getState().status==='checking');assert.equal(pending.length,1)};
 const release=async(expected)=>{pending.shift()();await page.waitForFunction(expected=>window.session.getState().status===expected,expected)};
 await page.goto('http://127.0.0.1:3100');await initialize();
 await select();await release('staged');check('select stages conditional proposal',await page.evaluate(()=>window.session.getState().proposal.operationalFeasibilityVerified===false));
 await page.click('#cancel');check('cancel clears staged proposal',await status()==='idle');
 await select();await page.click('#cancel');await release('idle');check('cancel discards late selection reply',await status()==='idle');
 await select();await page.click('#goal');await page.click('#goal');await release('idle');check('A-B-A discards late original reply',await status()==='idle');
 await select();await release('staged');await page.click('#goal');check('goal change clears staged proposal',await status()==='idle');await page.click('#goal');
 await select();await page.click('#evidence');await release('idle');check('evidence change discards in-flight reply',await status()==='idle');
 await select();await release('rejected');check('stale evidence cannot stage',await status()==='rejected');
 await page.reload();await initialize();check('reload restores no pending selection',await status()==='idle');
 await select();await release('staged');await page.reload();await initialize();check('reload does not restore staged proposal',await status()==='idle');
 check('original plan, versioned approval and existing review unchanged',await page.evaluate(()=>localStorage.getItem('saved'))===saved);
 check('no browser errors',errors.length===0);
 console.log(`${checks} selection browser checks passed`);
}finally {await browser.close()}
