/** Offline regression for the feasible current mix exposed by editor acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DecisionStore} from '../lib/local-decisions.ts';
import {SWP_DEMAND_MODE,illustrativeServiceReview} from '../lib/swp-demand.ts';
import {createDemandEditorDraft,reviewDemandEditor} from '../lib/swp-demand-editor.ts';
import {createServiceStaffingDemo,compareSwpDemo,prepareSwpSelection,swpDemandBridgeField} from '../lib/swp-demo.ts';
import {homeMixHistoryField,readHomeMixHistory} from '../lib/home-mix-history.ts';

test('verified feasible current mix prepares a separate save review without an alternative proposal or premature writes',async()=>{
 const at='2026-10-08T12:00:00Z',values=new Map(),store=new DecisionStore();
 store.initialize({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
 const context={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-reference-fixture',datasetToken:store.getDatasetToken(),boundGoal:{id:'',statement:''},revision:1};
 const original=illustrativeServiceReview(context,at),edit=createDemandEditorDraft(original);edit.months='9';edit.values.existingRoles='4';edit.values.availabilityPct='25';
 const review=reviewDemandEditor(original,edit,context,'editor-reference'),bridge={review,reviewedAt:at,staffingReviewedAt:at,priorAccepted:[]};
 const draft=await createServiceStaffingDemo('guided-swp-reference',bridge,at),before=structuredClone(draft),comparison=await compareSwpDemo(draft),persisted=[...values];
 assert.equal(comparison.options.length,1);assert.equal(comparison.options[0].id,'reference');assert.equal(comparison.options[0].candidate.status,'met');
 const prepared=await prepareSwpSelection(store,draft,comparison.evaluation,'reference',at,()=>true,undefined,bridge);
 assert.equal(prepared.alreadySaved,false);assert.ok(prepared.fields);assert.deepEqual(draft,before);assert.deepEqual([...values],persisted);assert.equal(store.getSnapshot().data.goals.activeId,'');
 assert.deepEqual(prepared.fields[swpDemandBridgeField].review,review);
 const history=await readHomeMixHistory(prepared.fields[homeMixHistoryField],draft.binding.goalId);
 assert.equal(history.entries.length,1);assert.equal(history.entries[0].proposal,null);assert.deepEqual(history.entries[0].before,draft);
 await assert.rejects(prepareSwpSelection(store,draft,comparison.evaluation,'forged',at,()=>true,undefined,bridge),/Choose an available option/);
 const forged=structuredClone(comparison.evaluation);forged.report.reference.cash.complete=0;
 await assert.rejects(prepareSwpSelection(store,draft,forged,'reference',at,()=>true,undefined,bridge),/Choose an available option/);
 assert.deepEqual([...values],persisted);
});

test('infeasible reference stays blocked and emitted alternatives keep their verified proposal path',async()=>{
 const at='2026-10-08T12:00:00Z',values=new Map(),store=new DecisionStore();
 store.initialize({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
 const context={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-alternative-fixture',datasetToken:store.getDatasetToken(),boundGoal:{id:'',statement:''},revision:1};
 const review=illustrativeServiceReview(context,at),bridge={review,reviewedAt:at,staffingReviewedAt:at,priorAccepted:[]};
 const draft=await createServiceStaffingDemo('guided-swp-alternative',bridge,at),comparison=await compareSwpDemo(draft),persisted=[...values];
 assert.equal(comparison.options[0].candidate.status,'not-met');
 await assert.rejects(prepareSwpSelection(store,draft,comparison.evaluation,'reference',at,()=>true,undefined,bridge),/Choose an available option/);
 const alternative=comparison.options.find(option=>!option.candidate.isReferenceMix&&option.candidate.status==='met');assert.ok(alternative);
 const prepared=await prepareSwpSelection(store,draft,comparison.evaluation,alternative.id,at,()=>true,undefined,bridge);
 const history=await readHomeMixHistory(prepared.fields[homeMixHistoryField],draft.binding.goalId);
 assert.equal(history.entries[0].proposal.candidateId,alternative.id);assert.deepEqual([...values],persisted);
});
