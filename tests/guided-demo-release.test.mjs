import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo,prepareSwpSelection,readSwpSaveReview,swpDemoField} from '../lib/swp-demo.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
import {goalProgressField,readGoalProgressLedger} from '../lib/goal-progress.ts';
const at='2026-10-16T12:00:00Z';
test('guided scenario compares quantified options, reviews coupled edits, saves and reopens with a target but no invented outcome',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('No network permitted in deterministic demo')};
 try {
 const values=new Map(),port={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},store=new DecisionStore();store.initialize(port);
 const draft=await createSwpDemo('guided-release',at),key=bundleInputKey(draft),initial=await compareSwpDemo(draft);
 assert.ok(initial.options.length>=2);assert.ok(initial.options.every(o=>Number.isFinite(o.candidate.cash.complete)));
 const preview=previewBundleChatEdit(draft,'Set Service units per month to 1120; Set budget to 500000; Set annual hire cost to 65000; Set training cash to 12000; Set training hours to 120');
 assert.equal(bundleInputKey(draft),key,'review must not mutate original');
 const revised=acceptBundleChatEdit(draft,preview);assert.notEqual(bundleInputKey(revised),initial.inputKey);
 assert.equal(revised.inputs.budget.amount.value,500000);assert.equal(revised.inputs.capacity.input.budget,'500000');
 const comparison=await compareSwpDemo(revised),selected=comparison.options.find(o=>o.candidate.status==='met');assert.ok(selected);
 const prepared=await prepareSwpSelection(store,revised,comparison.evaluation,selected.id,at,()=>true);
 assert.equal(store.getSnapshot().data.goals.goals.length,0,'review does not save');
 store.commitGoalSelection(prepared.goal.id,prepared.goal.statement,prepared.revision,at,()=>prepared.fields,true);
 const reopened=new DecisionStore();reopened.initialize(port);const fields=reopened.getSnapshot().data.workspaces[prepared.goal.id].fields;
 assert.equal(bundleInputKey(readSwpSaveReview(fields[swpDemoField]).draft),bundleInputKey(revised));
 const ledger=readGoalProgressLedger(fields[goalProgressField],prepared.goal.id);
 assert.ok(ledger.events.some(e=>e.kind==='measurement'&&e.data.target.value===4));
 assert.ok(!ledger.events.some(e=>e.kind==='observed'),'saved target is not a measured outcome');
 } finally {globalThis.fetch=originalFetch;}
});
