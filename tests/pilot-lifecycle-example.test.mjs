import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeDemoGoals} from '../lib/home-demo-goals.ts';
import {bundleWorkspaceField,attachBundlePatch} from '../lib/home-bundle-records.ts';
import {reviseBundleDraft,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {actionBindingKey} from '../lib/home-action-drafts.ts';
import {readPilotLifecycleExample,fictionalPilotLifecycle,compareFictionalPilot} from '../lib/pilot-lifecycle-example.ts';
const id='demo-reduce-turnover',token='legacy-v1:0',seed=()=>createHomeDemoGoals('2026-10-12T12:00:00Z').workspaces[id].fields[bundleWorkspaceField];
for(const [domain,change] of [['workload',-.5],['skills',1.5]])test(domain+' separates fictional activity from comparable scenario arithmetic',()=>{
 const w=seed(),before=structuredClone(w),record=fictionalPilotLifecycle(w.attachments[0],domain);
 assert.deepEqual(compareFictionalPilot(record),{change,gap:.5});assert.equal(record.origin,'fictional-walkthrough-v1');
 assert.equal(record.plan.inputKey,bundleInputKey(w.attachments[0].draft));assert.equal(record.plan.revision,w.attachments[0].draft.revision);
 assert.equal(record.delivery.at(-1).status,'completed');assert.equal(record.participation.at(-1).participantHours+record.participation.at(-1).coordinationHours,38);
 assert.ok(record.owner.label.includes('fictional assigned owner'));assert.equal(record.reviewDate,'2026-12-13');
 assert.ok(record.observations.every(o=>o.source.classification==='scenario'));assert.deepEqual(w,before);
 record.delivery=[];record.participation=[];assert.deepEqual(compareFictionalPilot(record),{change,gap:.5},'outcome arithmetic never depends on delivery');
});
for(const [label,change] of [
 ['missing',r=>r.observations[1].value=null],['missing baseline',r=>r.observations.shift()],
 ['scope',r=>r.observations[1].scope={...r.observations[1].scope,org:'Other cohort'}],
 ['definition',r=>r.observations[1].definition='another-rubric'],['unit',r=>r.observations[1].unit='percent'],
 ['window',r=>r.observations[1].period.start='2026-12-01'],['overlap',r=>r.observations[1].period={...r.observations[0].period}],
 ['suppressed',r=>r.observations[1].quality.suppressed=true],['incomplete',r=>r.observations[1].quality.complete=false],
 ['denominator',r=>r.observations[1].quality.denominator=null],['different respondents',r=>r.observations[1].quality.denominator=9],
 ['real evidence',r=>r.observations[1].source.classification='recorded-workforce'],['dataset',r=>r.plan.datasetToken='other:1'],
 ['lineage',r=>r.observations[1].source.lineageId='different'],['invalid score',r=>r.observations[1].value=11],
 ['unsupported metric',r=>r.measurement.metric='turnover'],['capture before window',r=>r.observations[1].capturedAt='2026-11-01T12:00:00Z'],
 ['future review',r=>r.reviewDate='2026-11-02'],['target outside rubric',r=>r.measurement.target.value=11],
])test(label+' cannot yield a fictional comparison',()=>{const r=fictionalPilotLifecycle(seed().attachments[0]);change(r);assert.deepEqual(compareFictionalPilot(r),{change:null,gap:null});});
test('zero remains a value, not missing',()=>{const r=fictionalPilotLifecycle(seed().attachments[0]);r.observations[1].value=0;assert.deepEqual(compareFictionalPilot(r),{change:-7,gap:-6});});
test('original receipt survives a revised plan and reload; no reassignment to current revision',()=>{
 const w=seed(),original=structuredClone(w),a=w.attachments[0],inputs=structuredClone(a.draft.inputs);inputs.scope.population.value='Changed population';
 const draft=reviseBundleDraft(a.draft,inputs),revised=attachBundlePatch(w,draft,{confirmed:true,bindingKey:actionBindingKey(draft.binding),inputKey:bundleInputKey(draft),acknowledgeUnknowns:true},'revision2','2026-10-13T12:00:00Z',a.id).value;
 const read=readPilotLifecycleExample(JSON.parse(JSON.stringify(revised)),id,token);
 assert.equal(read.historical,true);assert.equal(read.record.plan.revision,a.draft.revision);assert.equal(read.record.plan.inputKey,bundleInputKey(a.draft));assert.deepEqual(w,original);
 const fresh=readPilotLifecycleExample(w,id,token);fresh.record.owner.label='mutated copy';assert.notEqual(readPilotLifecycleExample(w,id,token).record.owner.label,'mutated copy');
});
test('different goal, dataset, absent or altered original cannot inherit fictional results',()=>{
 const w=seed();assert.equal(readPilotLifecycleExample(w,'another-goal',token),null);assert.equal(readPilotLifecycleExample(w,id,'other:1'),null);assert.equal(readPilotLifecycleExample(undefined,id,token),null);
 const altered=structuredClone(w);altered.attachments[0].draft.binding.evidenceDigest='f'.repeat(64);assert.equal(readPilotLifecycleExample(altered,id,token),null);
});
test('skills uses its saved twelve-person population with the same reusable model',()=>{
 const a=createHomeDemoGoals('2026-10-12T12:00:00Z').workspaces['demo-close-skill-gaps'].fields[bundleWorkspaceField].attachments[0],r=fictionalPilotLifecycle(a,'skills');
 assert.equal(r.populationSize,12);assert.equal(r.observations[0].quality.denominator,12);assert.equal(r.participation.at(-1).participants,12);assert.equal(r.delivery.at(-1).planned,36);assert.equal(r.owner.label,'Demo Learning Lead (fictional assigned owner)');assert.deepEqual(compareFictionalPilot(r),{change:1.5,gap:.5});
});
