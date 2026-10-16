import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo,guidedOptionEffort} from '../lib/swp-demo.ts';
import {guidedWorkloadResult} from '../lib/guided-workload.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {readBundleDraft,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
const at='2026-10-16T12:00:00Z';
const change=(d,text)=>acceptBundleChatEdit(d,previewBundleChatEdit(d,text));
test('workload, contracted FTE, allocation and qualification apply exactly once',async()=>{
 const d=await createSwpDemo('guided-workload',at),r=guidedWorkloadResult(d.inputs);
 assert.equal(r.workloadHours,15360);assert.equal(r.contractedFte,10);assert.equal(r.allocatedFte,5);assert.equal(r.qualifiedAllocatedFte,3);assert.equal(r.capacityHours,5760);assert.equal(r.additionalRoles,5);
 const revised=change(d,'Set Contracted FTE per existing person to 0.5; Set Available allocation percent to 50; Set Allocated FTE meeting required proficiency percent to 80');
 const next=guidedWorkloadResult(revised.inputs);assert.equal(next.contractedFte,5);assert.equal(next.qualifiedAllocatedFte,2);assert.equal(next.additionalRoles,6);assert.equal(revised.inputs.scope.demand.value,6);assert.equal(revised.inputs.capacity.input.roles,'6');assert.equal(d.inputs.scope.demand.value,5);
});
test('blank, zero coverage and no-gap inputs are distinguished; corrupt/stale demand cannot reopen',async()=>{
 const d=await createSwpDemo('guided-missing',at);
 const missing=change(d,'Set Hours per service unit to Unknown');assert.equal(guidedWorkloadResult(missing.inputs).status,'needs-inputs');assert.equal(missing.inputs.scope.demand.value,null);
 const zero=change(d,'Set Allocated FTE meeting required proficiency percent to 0');assert.equal(guidedWorkloadResult(zero.inputs).capacityHours,0);assert.equal(zero.inputs.scope.demand.value,8);
 const none=change(d,'Set Service units per month to 100');assert.equal(guidedWorkloadResult(none.inputs).additionalRoles,0);assert.equal(none.inputs.scope.demand.value,null);
 for(const value of [-1,101,NaN]){const bad=structuredClone(d);bad.inputs.guidedWorkload.skillCoveragePct.value=value;assert.equal(readBundleDraft(bad),null);}
 const stale=structuredClone(d);stale.inputs.guidedWorkload.volume.value=2000;assert.equal(readBundleDraft(stale),null);
 const old=structuredClone(d);delete old.inputs.guidedWorkload;assert.ok(readBundleDraft(old));assert.equal(guidedWorkloadResult(old.inputs),null);
});
test('higher workload changes the shared comparison and later readiness leaves more uncovered hours',async()=>{
 const d=await createSwpDemo('guided-options',at),before=bundleInputKey(d),higher=change(d,'Set Service units per month to 1440');assert.equal(higher.inputs.scope.demand.value,6);assert.notEqual(bundleInputKey(higher),before);
 const initial=await compareSwpDemo(d);assert.ok(initial.options.length>=2);
 for(const option of initial.options){const effort=guidedOptionEffort(option);assert.ok(effort);assert.equal(effort.totalHours,5760+effort.additionalHours);assert.ok(effort.shortfallHours>=0);assert.equal(option.draft.inputs.guidedWorkload.existingPeople.value,10);}
 const late=change(d,'Set Hire arrival date to 2027-07-15; Set Build effective month to 2027-07');const later=await compareSwpDemo(late);
 const original=initial.options.find(o=>o.candidate.isReferenceMix),delayed=later.options.find(o=>o.candidate.isReferenceMix);assert.ok(guidedOptionEffort(delayed).shortfallHours>guidedOptionEffort(original).shortfallHours);
 assert.equal(d.inputs.capacity.input.build,late.inputs.capacity.input.build,'reskilling does not add employees');
});

test('gap edits rebase a visible reference without expanding pools or relaxing minimums',async()=>{
 const d=await createSwpDemo('guided-coupled',at);
 for(const [units,roles] of [[1120,4],[1440,6]]){
  const preview=previewBundleChatEdit(d,`Set Service units per month to ${units}`),next=acceptBundleChatEdit(d,preview);
  assert.equal(next.inputs.capacity.input.buy,String(roles));assert.ok(preview.changes.some(c=>c.field==='Reference buy roles'));
  assert.deepEqual(next.inputs.groups,d.inputs.groups);
  assert.ok(next.inputs.mixScenario.bounds.buy.value.max<=d.inputs.mixScenario.bounds.buy.value.max);
  const compared=await compareSwpDemo(next);assert.equal(compared.evaluation.context.status,'ready');
  for(const c of preview.changes)assert.notEqual(typeof c.after.value,'object');
 }
 const constrained=structuredClone(d);constrained.inputs.mixScenario.bounds.buy.value.min=5;
 assert.throws(()=>change(constrained,'Set Service units per month to 1120'),/below a reviewed staffing minimum/);
});
