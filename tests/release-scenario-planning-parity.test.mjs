import test from 'node:test';import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo,swpTradeoffOptions} from '../releases/2026-10-21/source/lib/swp-demo.ts';
import {compareScenarioForChat,readScenarioChatDraft,scenarioComparisonIntent,scenarioQuestionMismatch} from '../releases/2026-10-21/source/lib/scenario-planning-parity.ts';
import {bundleInputKey} from '../releases/2026-10-21/source/lib/home-bundle-reconciliation.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../releases/2026-10-21/source/lib/home-bundle-chat-edit.ts';
const draft=await createSwpDemo('guided-swp-parity','2026-10-21T12:00:00Z');
test('guided and conversational comparisons use identical complete inputs, options and timing',async()=>{
 for(const d of [draft,acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 100000; Set Service units per month to 1120')),acceptBundleChatEdit(draft,previewBundleChatEdit(draft,'Set budget to 0'))]){
  const before=JSON.stringify(d),guided=await compareSwpDemo(d),chat=await compareScenarioForChat(d);
  assert.equal(chat.inputKey,guided.inputKey);assert.deepEqual(chat.options,guided.options);assert.deepEqual(swpTradeoffOptions(chat.evaluation),swpTradeoffOptions(guided.evaluation));assert.equal(JSON.stringify(d),before);assert.match(chat.answer,/same staffing-option engine/);assert.match(chat.answer,/No live AI/);
 }
});
test('explicit full draft context rejects changed identity, inputs and pending edits',()=>{
 const r={conversationMode:'fictional-swp-demo-v1',classification:'fictional-scenario',datasetToken:'token',goalId:draft.binding.goalId,goal:draft.binding.goal,revision:draft.revision,draft,inputKey:bundleInputKey(draft),reviewState:'not-calculated'};
 assert.deepEqual(readScenarioChatDraft({scenarioReview:r},'token'),draft);
 for(const patch of [{datasetToken:'other'},{inputKey:'other'},{revision:999},{goalId:'other'},{reviewState:'pending-edits'},{draft:null}])assert.equal(readScenarioChatDraft({scenarioReview:{...r,...patch}},'token'),null);
 assert.equal(readScenarioChatDraft(null,'token'),null);
});
test('scenario comparison commands do not capture unrelated analytics or compound requests',()=>{
 for(const q of ['Compare staffing options','How would you close a 5 FTE capacity gap with a $325,000 USD budget?'])assert.equal(scenarioComparisonIntent(q),true);
 for(const q of ['What was turnover last year?','Compare staffing options and rank countries','Why is engagement low?'])assert.equal(scenarioComparisonIntent(q),false);
});

test('explicit quantities must match reviewed inputs',()=>{
 assert.equal(scenarioQuestionMismatch('Close the 5 FTE capacity gap with a $325,000 USD budget',draft),null);
 for(const q of ['Close a 99 FTE capacity gap with a $1 USD budget','Close a 5 FTE capacity gap with a $1 budget'])assert.match(scenarioQuestionMismatch(q,draft),/differ/);
});
