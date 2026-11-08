import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityPlanningRequest,offersCapacityExample,scenarioComparisonIntent,scenarioQuestionMismatch,compareScenarioForChat} from '../lib/scenario-planning-parity.ts';
import {createSwpDemo,compareSwpDemo} from '../lib/swp-demo.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
const draft=await createSwpDemo('guided-shared-planner','2026-11-08T12:00:00Z');
test('bounded natural paraphrases offer explicit example review, not a separate AI calculation',()=>{
 for(const text of ['How would you close a 5 FTE capacity gap with a $325,000 USD budget?','How can we fill our 5 FTE staffing gap on a $325k budget?','Help me address a 5 FTE gap within a budget of $325000.','Please close the 5 full-time equivalent capacity gap','How should I close my 5 FTE gap under $325000?']){
  assert.equal(offersCapacityExample(text),true,text);assert.equal(scenarioComparisonIntent(text),true,text);assert.equal(scenarioQuestionMismatch(text,draft),null,text);
 }
});
test('changed quantities never adopt the example and cannot reuse stale results',()=>{
 for(const text of ['Help us fill a 6 FTE staffing gap on a $325k budget','How can we address a 5 FTE gap with a $100k budget?','Close a 5.5 FTE gap with $325000']){
  assert.equal(offersCapacityExample(text),false,text);assert.equal(scenarioComparisonIntent(text),true,text);assert.match(scenarioQuestionMismatch(text,draft),/differ/,text);
 }
});
test('extra context, malformed values and compound questions remain with the assistant',()=>{
 for(const text of ['Close a 5 FTE gap for nurses by May','Close a 5 FTE gap with $325k and rank countries','What is a 5 FTE gap?','Do not close a 5 FTE gap','Close a 5 FTE gap with $32,5000','Close a 5 FTE gap with $325k EUR','Close a -5 FTE gap','Close a 5 FTE gap with $325000 or hire contractors']){
  assert.equal(capacityPlanningRequest(text),null,text);assert.equal(offersCapacityExample(text),false,text);assert.equal(scenarioComparisonIntent(text),false,text);
 }
});
test('guided and normal paths preserve exact engine outputs for example and edited scenarios',async()=>{
 for(const d of [draft,acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 100000')),acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 0'))]){
  const guided=await compareSwpDemo(d),normal=await compareScenarioForChat(d);assert.deepEqual(normal.options,guided.options);assert.equal(normal.inputKey,guided.inputKey);assert.match(normal.answer,/No live AI/);
 }
});


test('entry review does not promise stale calendar dates before the current-date draft exists',async()=>{
 const fs=await import('node:fs');const source=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('12-month example; exact dates shown before comparison'));assert.equal(source.includes('Nov 2026'),false);
});
