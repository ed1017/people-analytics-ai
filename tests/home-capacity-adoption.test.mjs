import test from 'node:test';
import assert from 'node:assert/strict';
import {adoptionFixture} from './fixtures/home-capacity-adoption.mjs';
import {selectionSpec} from './fixtures/workforce-selection.mjs';
import {searchWorkforceMixes} from '../lib/workforce-mix-search.ts';
import {previewBundleCapacityAdoption} from '../lib/home-capacity-adoption.ts';
import {bundleInputKey,reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
import {reviseWorkforceSolution,currentSolutionVersion} from '../lib/workforce-solution.ts';
import {saveBundleCalculationPatch,attachBundlePatch} from '../lib/home-bundle-records.ts';
import {actionBindingKey} from '../lib/home-action-drafts.ts';
import {DecisionStore,encodeDecisions} from '../lib/local-decisions.ts';
async function setup(){const f=await adoptionFixture(),snapshot=searchWorkforceMixes(f.solution,'source-result',selectionSpec());return {...f,snapshot,context:{solution:f.solution,activeGoalId:f.solution.goalId,activeGoalStatement:f.draft.binding.goal,evidenceResultId:'source-result',expectedSearchFingerprint:snapshot.searchFingerprint,hasUnsavedPlanEdits:false}};}
test('alternatives A and B reconcile full bundle costs dates participants and non-staffing components without mutation',async()=>{
 const f=await setup(),before=structuredClone(f.draft),result=reconcileBundle(f.draft);
 for(const id of ['build-0-move-3-buy-0','build-1-move-2-buy-0']){
  const p=await previewBundleCapacityAdoption(f.draft,f.context,f.snapshot,id);assert.equal(p.next.revision,f.draft.revision+1);assert.notEqual(p.after.inputKey,result.inputKey);assert.equal(p.after.uniqueParticipants,15);assert.equal(p.after.plannedAddedEmployees,0);assert.equal(p.after.planFinish,result.planFinish);assert.equal(p.after.cashTotal,null);assert.ok(p.costReviewComponents.length>0);assert.equal(p.next.inputs.costsDistinct.value,null);assert.equal(p.after.ledger.filter(line=>line.id==='manager-cost').length,1);assert.equal(p.after.ledger.find(line=>line.id==='manager-cost').total,500);
  assert.deepEqual(p.next.bundle,f.draft.bundle);for(const key of ['timing','groups','memberships','expenses','expenseLinks'])assert.deepEqual(p.next.inputs[key],f.draft.inputs[key]);assert.equal(p.next.inputs.scope.comparisonConfirmed.value,null);
  for(const change of p.changes)assert.match(p.next.inputs.capacity.origins[change.field].basis,new RegExp(f.snapshot.searchFingerprint));
  assert.equal(p.next.inputs.capacity.flows.some(flow=>flow.path==='buy'),false);assert.equal(p.after.capacityReadyMonth,id.includes('build-0')?'2026-10':'2026-11');
 }
 assert.deepEqual(f.draft,before);
});
test('missing flow, participant coverage, insufficient groups and unresolved overlap reject adoption',async()=>{
 for(const mutate of [d=>{d.inputs.groups.find(group=>group.id==='other').count.kind='illustrative'},d=>{d.inputs.capacity.flows=d.inputs.capacity.flows.filter(flow=>flow.path!=='move')},d=>{d.inputs.groups.find(group=>group.id==='other').count.value=1},d=>{d.inputs.memberships.find(item=>item.componentId==='c3').groupIds=['cohort']},d=>{d.inputs.groupsDisjoint.value=null;d.inputs.groupsDisjoint.kind='unknown';d.inputs.groupsDisjoint.basis=null}]){
  const f=await setup();mutate(f.draft);const before=structuredClone(f.draft);await assert.rejects(previewBundleCapacityAdoption(f.draft,f.context,f.snapshot,'build-1-move-2-buy-0'),/mapping|group|overlap/);assert.deepEqual(f.draft,before);
 }
});
test('goal switch stale calculation altered reports and incompatible dependency dates reject without a partial revision',async()=>{
 const f=await setup();await assert.rejects(previewBundleCapacityAdoption(f.draft,{...f.context,activeGoalId:'other'},f.snapshot,'build-0-move-3-buy-0'),/goal|source/);
 const inputs=structuredClone(currentSolutionVersion(f.solution).inputs);inputs.scope.budget='1';const stale=reviseWorkforceSolution(f.solution,1,inputs,'sidebar','Manual change','2026-10-05T00:00:00Z');await assert.rejects(previewBundleCapacityAdoption(f.draft,{...f.context,solution:stale},f.snapshot,'build-0-move-3-buy-0'),/Calculate|match/);
 const tampered=structuredClone(f.snapshot);tampered.summary.enumerated=999;await assert.rejects(previewBundleCapacityAdoption(f.draft,f.context,tampered,'build-0-move-3-buy-0'),/modified|stale/);
 const dates=structuredClone(f.draft);dates.inputs.timing[1].start.value='2026-09-01';await assert.rejects(previewBundleCapacityAdoption(dates,f.context,f.snapshot,'build-0-move-3-buy-0'),/horizon|prerequisite/);
});
test('saved attachment stays intact until explicit versioned replacement; failed save rolls back and reload retains adoption provenance',async()=>{
 const f=await setup(),result=reconcileBundle(f.draft),stamp='2026-10-05T00:00:00Z',id=f.draft.binding.goalId;
 let workspace=saveBundleCalculationPatch(undefined,f.draft,result).value;workspace=attachBundlePatch(workspace,f.draft,{confirmed:true,bindingKey:actionBindingKey(f.draft.binding),inputKey:bundleInputKey(f.draft),acknowledgeUnknowns:true},'first',stamp).value;
 const original=structuredClone(workspace.attachments[0]),data={version:1,revision:1,goals:{version:1,activeId:id,goals:[{id,statement:f.draft.binding.goal}]},workspaces:{[id]:{savedAt:stamp,fields:{homeSolutionBundlesV1:workspace,workforceSolution:f.solution}}}};
 let memory=encodeDecisions(data),fail=true;const port={getItem:()=>memory,setItem:(_key,value)=>{if(fail)throw Error('quota');memory=value},removeItem:()=>{}};const store=new DecisionStore();store.initialize(port);
 const p=await previewBundleCapacityAdoption(f.draft,f.context,f.snapshot,'build-0-move-3-buy-0'),patch=saveBundleCalculationPatch(workspace,p.next,reconcileBundle(p.next));store.setField(id,patch.field,patch.value);assert.equal(memory,encodeDecisions(data));
 fail=false;const fresh=new DecisionStore();fresh.initialize(port);fresh.setField(id,patch.field,patch.value);const reopened=new DecisionStore();reopened.initialize(port);const saved=reopened.getSnapshot().data.workspaces[id].fields.homeSolutionBundlesV1;assert.deepEqual(saved.attachments[0],original);assert.equal(saved.attachments.length,1);assert.equal(saved.drafts.at(-1).inputs.capacity.input.move,'3');assert.match(saved.drafts.at(-1).inputs.capacity.origins.move.basis,/Reviewed candidate/);assert.deepEqual(reopened.getSnapshot().data.workspaces[id].fields.workforceSolution,f.solution);
 const replaced=attachBundlePatch(saved,p.next,{confirmed:true,bindingKey:actionBindingKey(p.next.binding),inputKey:bundleInputKey(p.next),acknowledgeUnknowns:true},'second',stamp,'first').value;assert.deepEqual(replaced.attachments[0],original);assert.equal(replaced.attachments[1].supersedes,'first');
});
