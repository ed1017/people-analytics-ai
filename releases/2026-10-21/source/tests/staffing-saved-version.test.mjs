import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createSwpDemo} from '../lib/swp-demo.ts';
import {bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
const source=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8');
const exports={};const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInNewContext(code,{exports,require:name=>name==='@/lib/home-bundle-reconciliation'?{bundleInputKey}:new Proxy({},{get:(_,key)=>key})});
const draft=await createSwpDemo('guided-saved-version','2026-11-08T12:00:00Z'),saved={draft,candidateId:'selected-a'};
test('saved-version notice distinguishes later edits, choices and pending reviews from its exact receipt',()=>{
 const changed=exports.savedStaffingDraftChanged;
 assert.equal(changed(draft,saved,'selected-a',false),false);
 assert.equal(changed(draft,saved,null,false),false,'restoration without a fresh selection does not imply edits');
 assert.equal(changed(draft,saved,'selected-b',false),true);
 assert.equal(changed(draft,saved,'selected-a',true),true);
 const revised=acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 100000'));
 assert.equal(changed(revised,saved,'selected-a',false),true);
 assert.equal(changed(null,saved,null,false),false);
 const unrelated=structuredClone(revised);unrelated.binding.goalId='guided-other';assert.equal(changed(unrelated,saved,'selected-b',true),false);
});
test('continuing a scenario never denies prior saves or promises results before a comparison',()=>{
 assert.doesNotMatch(source,/Nothing has been saved\./);
 assert.match(source,/Continuing does not save new changes\. Any earlier saved plans are kept\./);
 assert.match(source,/Continue with these inputs; compare them in chat when ready\./);
 assert.match(source,/currentComparison\?\.evaluation\.context\.status==='ready'\?'Continue with these inputs and calculated options\.'/);
 assert.match(source,/Your current draft has unsaved changes\. They are not included in this saved version\./);
});
test('dialog choose-step requires a ready comparison rather than a needs-inputs result',()=>{
 assert.equal((source.match(/currentComparison\?\.evaluation\.context\.status==='ready'\?'3 of 4/g)||[]).length,2);
});

test('normal Scenarios host keeps last-saved-version notice visible while its working draft is open',()=>{
 assert.match(source,/const savedContinuation=!wholeAppDemo&&\(normalHosted\|\|!demoOpen\)&&/);
});
