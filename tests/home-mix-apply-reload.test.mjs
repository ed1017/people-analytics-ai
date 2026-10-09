import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHomeDemoGoals} from '../lib/home-demo-goals.ts';
import {evaluateHomeMix} from '../lib/home-mix-runtime.ts';
import {prepareHomeMixCommit,readHomeMixHistory,verifyHomeMixCommit,homeMixHistoryField} from '../lib/home-mix-history.ts';
import {createHomeMixRecord,readHomeMixRecord} from '../lib/home-mix-records.ts';
import {reconcileBundle,bundleInputKey,unknownAssumption} from '../lib/home-bundle-reconciliation.ts';
import {saveBundleCalculationPatch,readBundleWorkspace,attachBundlePatch,bundleWorkspaceField} from '../lib/home-bundle-records.ts';
import {restoredBundleDraft} from '../lib/home-pinned-goals.ts';
import {actionBindingKey} from '../lib/home-action-drafts.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
const at='2026-10-09T00:00:00Z',id='demo-capacity-mix';
const seed=()=>createHomeDemoGoals(at);
const draft=()=>seed().workspaces[id].fields[bundleWorkspaceField].attachments[0].draft;
const entered=value=>({value,kind:'user-entered',basis:'Explicit synthetic cost review, not a scenario-wide premise.'});

test('native demo Apply, browser save, reload and explicit attachment retain conditional cash and the original attachment',async()=>{
 const data=seed(),before=data.workspaces[id].fields[bundleWorkspaceField].attachments[0].draft;
 const original=JSON.stringify(data.workspaces[id].fields[bundleWorkspaceField].attachments[0]);
 const values=new Map(),port={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 data.goals.activeId=id;const store=new DecisionStore();store.initialize(port,()=>data);
 const evaluation=await evaluateHomeMix(before),choice=evaluation.report.preferredOptionId;
 assert.equal(choice,'build-3-move-2-buy-0');assert.equal(evaluation.report.results.find(row=>row.id===choice).cash.complete,26800);
 const commit=await prepareHomeMixCommit(before,evaluation,choice,at,null);
 assert.equal(commit.history.entries[0].proposal.schemaVersion,2);
 assert.deepEqual(commit.draft.inputs.costsDistinct,before.inputs.costsDistinct);
 assert.deepEqual(commit.draft.inputs.costReviews,before.inputs.costReviews);
 assert.deepEqual(commit.draft.inputs.expenses,before.inputs.expenses);
 assert.equal(commit.draft.inputs.scope.comparisonConfirmed.value,null);
 const result=reconcileBundle(commit.draft);assert.equal(result.cashEstimate.cash,26800);assert.equal(result.plannedAddedEmployees,0);
 store.commitGoalFields(id,before.binding.goal,store.getSnapshot().data.revision,at,fields=>{
  const patch=saveBundleCalculationPatch(fields[bundleWorkspaceField],commit.draft,result);
  return {[patch.field]:patch.value,[homeMixHistoryField]:commit.history};
 });
 const reloaded=new DecisionStore();reloaded.initialize(port);
 const fields=reloaded.getSnapshot().data.workspaces[id].fields,workspace=readBundleWorkspace(fields[bundleWorkspaceField],id);
 const restored=restoredBundleDraft(workspace,before.binding,before.bundle.id),after=await evaluateHomeMix(restored);
 assert.equal(bundleInputKey(restored),bundleInputKey(commit.draft));assert.equal(workspace.attachments.length,1);
 assert.equal(JSON.stringify(workspace.attachments[0]),original);
 assert.equal(after.report.reference.cash.complete,26800);assert.equal(after.report.reference.effort.totalHours,80);
 assert.equal(after.report.summary.enumerated,12);assert.equal(after.report.summary.counts.met,1);
 assert.equal(after.report.preferredOptionId,choice);assert.equal(after.report.operationalFeasibilityVerified,false);
 assert.ok(await verifyHomeMixCommit(commit,null,restored));
 assert.ok(await readHomeMixHistory(fields[homeMixHistoryField],id));
 assert.throws(()=>attachBundlePatch(workspace,restored,{confirmed:false},'reviewed-mix',at),/Review this exact/);
 const confirmation={confirmed:true,bindingKey:actionBindingKey(restored.binding),inputKey:bundleInputKey(restored),acknowledgeUnknowns:true};
 assert.throws(()=>attachBundlePatch(workspace,restored,confirmation,'reviewed-mix',at),/Explicitly replace/);
 const attached=attachBundlePatch(workspace,restored,confirmation,'reviewed-mix',at,workspace.attachments[0].id);
 reloaded.commitGoalFields(id,before.binding.goal,reloaded.getSnapshot().data.revision,at,()=>({[attached.field]:attached.value}));
 const again=new DecisionStore();again.initialize(port);const saved=readBundleWorkspace(again.getSnapshot().data.workspaces[id].fields[bundleWorkspaceField],id);
 assert.equal(saved.attachments.length,2);assert.equal(JSON.stringify(saved.attachments[0]),original);
 assert.equal(saved.attachments[1].result.cashEstimate.cash,26800);assert.equal(saved.attachments[1].supersedes,saved.attachments[0].id);
});

test('unknown component costs, overlap and vendor cash never become complete on selection',async()=>{
 for(const mutate of [
  value=>{value.inputs.costReviews[0].complete=unknownAssumption();},
  value=>{value.inputs.costsDistinct=unknownAssumption();},
  value=>{value.inputs.costsDistinct={value:false,kind:'illustrative',basis:'Explicit unresolved overlap.'};},
  value=>{value.inputs.expenses.push({id:'missing-vendor',label:'Unquoted vendor',kind:'cash',amount:unknownAssumption(),startMonth:entered(value.inputs.scope.startMonth.value),months:entered(1)});value.inputs.expenseLinks.push({expenseId:'missing-vendor',componentIds:['c1'],allocations:null});},
 ]){
  const before=draft();mutate(before);const bytes=JSON.stringify(before),value=await evaluateHomeMix(before);
  assert.equal(value.report.preferredOptionId,null);
  assert.equal(value.report.results.find(row=>row.id==='build-3-move-2-buy-0').cash.complete,null);
  await assert.rejects(prepareHomeMixCommit(before,value,'build-3-move-2-buy-0',at,null),/feasible/);
  assert.equal(JSON.stringify(before),bytes);
 }
});

test('entered component reviews or distinctness still reopen when the mix changes',async()=>{
 for(const mutate of [value=>{value.inputs.costReviews[0].complete=entered(true);},value=>{value.inputs.costsDistinct=entered(true);}]){
  const before=draft();mutate(before);const value=await evaluateHomeMix(before);
  const commit=await prepareHomeMixCommit(before,value,value.report.preferredOptionId,at,null);
  assert.equal(commit.draft.inputs.costsDistinct.value,null);
  assert.equal(reconcileBundle(commit.draft).cashEstimate.cash,null);
  assert.ok(commit.history.entries[0].proposal.costReviewComponents.length);
 }
});

test('original v1 history replays unchanged; a v2 selection appends without replacing it',async()=>{
 const legacy=JSON.parse(readFileSync(new URL('./fixtures/home-mix-cost-review-v1.json',import.meta.url))),bytes=JSON.stringify(legacy);
 const historical=await readHomeMixHistory(legacy,id);assert.ok(historical);
 assert.equal(historical.entries[0].proposal.schemaVersion,1);
 assert.equal(historical.entries[0].proposal.draft.inputs.costsDistinct.value,null);
 const before=legacy.entries[0].before,value=await evaluateHomeMix(before);
 const priorRecord=await createHomeMixRecord(value.context,value.report,value.report.preferredOptionId,at,undefined,1);
 assert.deepEqual(await readHomeMixRecord(priorRecord),priorRecord);
 const commit=await prepareHomeMixCommit(before,value,value.report.preferredOptionId,at,legacy);
 assert.equal(commit.history.entries.length,2);assert.deepEqual(commit.history.entries[0],legacy.entries[0]);
 assert.equal(commit.history.entries[1].proposal.schemaVersion,2);assert.ok(await verifyHomeMixCommit(commit,legacy,commit.draft));
 assert.equal(JSON.stringify(legacy),bytes);
 const damaged=structuredClone(commit.history);damaged.entries[1].proposal.schemaVersion=1;assert.equal(await readHomeMixHistory(damaged,id),null);
 const altered=structuredClone(commit.history);altered.entries[1].proposal.draft.inputs.costsDistinct=entered(true);assert.equal(await readHomeMixHistory(altered,id),null);
});
