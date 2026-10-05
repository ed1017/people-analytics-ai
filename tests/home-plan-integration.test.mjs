import {capacityFixture} from './fixtures/home-plan-integration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {previewDeliveryMix,acceptDeliveryMix,matchedBundleSearch} from '../lib/home-plan-integration.ts';
import {reviseBundleDraft,reconcileBundle,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {searchWorkforceMixes} from '../lib/workforce-mix-search.ts';
import {applicationFixture} from './fixtures/action-plan-application.mjs';
import {selectionSpec} from './fixtures/workforce-selection.mjs';
const entered=value=>({value,kind:'user-entered',basis:'Reviewed fixture assumption.'});
test('explicit delivery mix replaces diagnostic activities across existing methods and preserves exact goal, references and shared inputs',()=>{
 const draft=applicationFixture().currentDraft,before=structuredClone(draft),preview=previewDeliveryMix(draft),next=acceptDeliveryMix(draft,preview);
 assert.deepEqual(draft,before);assert.equal(next.binding.goal,draft.binding.goal);assert.equal(next.revision,draft.revision+1);assert.notEqual(next.signature,draft.signature);assert.equal(next.bundle.components.length,draft.bundle.components.length);
 for(let i=0;i<draft.bundle.components.length;i++){const component=next.bundle.components[i],old=draft.bundle.components[i];assert.deepEqual(component.evidence,old.evidence);assert.deepEqual(component.dependsOn,old.dependsOn);assert.equal(component.ownerRole,old.ownerRole);assert.notEqual(component.firstStep,old.firstStep);assert.match(component.limitation,/Local proposed activity/);}
 for(const field of ['groups','memberships','expenses','expenseLinks','capacity','timing'])assert.deepEqual(next.inputs[field],draft.inputs[field]);
 assert.equal(next.inputs.costsDistinct.value,null);assert.equal(next.inputs.dependenciesConfirmed.value,null);assert.equal(next.inputs.scope.comparisonConfirmed.value,null);assert.ok(next.inputs.costReviews.every(item=>item.complete.value===null));assert.notEqual(bundleInputKey(next),bundleInputKey(draft));
 assert.equal(reconcileBundle(next).cashTotal,null);assert.equal(reconcileBundle(next).uniqueParticipants,reconcileBundle(draft).uniqueParticipants);assert.deepEqual(reconcileBundle(next).ledger,reconcileBundle(draft).ledger);
});
test('delivery review rejects stale or altered proposals and does not invent missing methods or merge duplicate methods',()=>{
 const draft=applicationFixture().currentDraft,preview=previewDeliveryMix(draft);assert.throws(()=>acceptDeliveryMix(reviseBundleDraft(draft,draft.inputs),preview),/changed/);const altered=structuredClone(preview);altered.bundle.components[0].evidence=['Made up'];assert.throws(()=>acceptDeliveryMix(draft,altered),/changed/);
 const repeated=structuredClone(draft);repeated.bundle.components[1].domain=repeated.bundle.components[0].domain;repeated.signature=JSON.stringify(repeated.bundle);assert.throws(()=>previewDeliveryMix(repeated),/repeated methods/);
 const single=structuredClone(draft);single.bundle.components.forEach(item=>item.domain='execution');single.signature=JSON.stringify(single.bundle);assert.throws(()=>previewDeliveryMix(single),/at least two/);
});
test('only a matching current reviewed capacity calculation enables existing deterministic search',async()=>{
 const {draft,solution}=await capacityFixture(),matched=matchedBundleSearch(draft,solution),before=JSON.stringify({draft,solution});assert.equal(matched.evidenceResultId,'source-result');
 const report=searchWorkforceMixes(matched.solution,matched.evidenceResultId,selectionSpec());assert.equal(report.summary.enumerated,10);assert.equal(report.summary.calculatorInvocations,11);assert.equal(report.summary.counts.met+report.summary.counts['not-met']+report.summary.counts.unknown+report.summary.counts.invalid,10);assert.match(report.ordering,/not a quality ranking/);assert.equal(JSON.stringify({draft,solution}),before);
});
test('retention, missing review, illustrative or stale capacity inputs expose no fabricated search report',async()=>{
 const {draft,solution}=await capacityFixture();
 const retention=structuredClone(draft);retention.inputs.capacity=null;retention.inputs.scope.capacityRequired=entered(false);assert.throws(()=>matchedBundleSearch(retention,solution),/no predicted optimum/);
 const unreviewed=structuredClone(draft);unreviewed.inputs.scope.comparisonConfirmed=entered(false);assert.throws(()=>matchedBundleSearch(unreviewed,solution),/Confirm the shared scope/);
 const illustrative=structuredClone(draft);illustrative.inputs.capacity.origins.build.kind='illustrative';assert.throws(()=>matchedBundleSearch(illustrative,solution),/illustrative/);
 const changed=structuredClone(draft);changed.inputs.capacity.input.trainingCash='4000';assert.throws(()=>matchedBundleSearch(changed,solution),/different assumptions/);
 const other=structuredClone(draft);other.binding.goal='Different exact goal';assert.throws(()=>matchedBundleSearch(other,solution),/exact goal/);
 assert.throws(()=>matchedBundleSearch(draft,null),/Save and calculate/);const missing=structuredClone(solution);missing.results=[];assert.throws(()=>matchedBundleSearch(draft,missing),/Calculate the saved/);
});
