import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft,readBundleDraft,reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {assumptionsOnlyBundle} from '../lib/home-assumptions-fallback.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {homeMixFixture,entered} from './fixtures/home-mix.mjs';
import {withHomeMixScenario,homeMixScenarioCommand} from '../lib/home-mix-scenario.ts';
import {evaluateHomeMix} from '../lib/home-mix-runtime.ts';
import {proposePlanRevision,readPlanRevisions} from '../lib/home-plan-revisions.ts';
import {prepareHomeMixCommit,readHomeMixHistory} from '../lib/home-mix-history.ts';
import {createHomeDemoGoals} from '../lib/home-demo-goals.ts';
const at='2026-10-07T00:00:00Z',hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function fresh({goal='Add 5 engineering roles over 12 months',local=false}={}){
 const binding=await actionBinding('automatic-test',goal,{},{});
 return prepareIllustrativePilot(createBundleDraft(local?assumptionsOnlyBundle(goal):bundleProposalFixture(goal).bundles[0],binding),at,{includeDeliveryEstimate:true});
}
const edit=(draft,text)=>proposePlanRevision(undefined,draft,text,{option:1,count:3});
const scenario=async options=>edit(await fresh(options),homeMixScenarioCommand).record.draft;
test('explicit chat opt-in evaluates 12 bounded combinations with labeled groups and no invented evidence',async()=>{
 const before=await fresh(),bytes=JSON.stringify(before),proposal=edit(before,homeMixScenarioCommand),draft=proposal.record.draft,value=await evaluateHomeMix(draft);
 assert.equal(JSON.stringify(before),bytes);assert.ok(readPlanRevisions(proposal.history,before.binding.goalId));assert.deepEqual(draft.bundle,before.bundle);assert.deepEqual(draft.binding,before.binding);
 assert.equal(value.context.status,'ready');assert.equal(value.report.summary.enumerated,12);assert.equal(value.report.summary.calculatorInvocations,13);
 assert.equal(value.report.preferredOptionId,null);assert.equal(value.report.constraints.cashBudget,null);assert.equal(value.report.summary.counts.unknown,12);
 assert.equal(draft.inputs.capacity.input.backfills,'0');assert.equal(draft.inputs.capacity.origins.backfills.kind,'illustrative');assert.equal(draft.inputs.capacity.input.loadedHourlyCost,'');
 assert.deepEqual(draft.inputs.mixScenario.bounds.build.value,{min:0,max:3});assert.deepEqual(draft.inputs.mixScenario.bounds.move.value,{min:0,max:2});
 assert.match(value.notes.join(' '),/not observed eligibility/);assert.match(value.notes.join(' '),/unverified/);
 assert.equal(value.report.operationalFeasibilityVerified,false);
});
test('demo wording and the legacy typed alias create identical assumptions and replay both histories',async()=>{
 const original=await fresh(),demo=edit(original,'Use demo staffing assumptions'),legacy=edit(original,'Use illustrative staffing assumptions');
 assert.equal(homeMixScenarioCommand,'Use demo staffing assumptions');assert.deepEqual(demo.record.draft,legacy.record.draft);
 assert.ok(readPlanRevisions(demo.history,original.binding.goalId));assert.ok(readPlanRevisions(legacy.history,original.binding.goalId));
 assert.match(legacy.preview.changes[0].after.basis,/^Use illustrative staffing assumptions;/);
 assert.deepEqual(await evaluateHomeMix(demo.record.draft),await evaluateHomeMix(legacy.record.draft));
});
test('local capacity template supports shared explicit scenario ownership without new evidence IDs',async()=>{
 const draft=await scenario({local:true}),value=await evaluateHomeMix(draft);
 assert.equal(value.context.status,'ready');assert.equal(value.report.summary.enumerated,12);assert.deepEqual(draft.bundle.components[0].evidence,[]);
 assert.ok(draft.inputs.mixScenario.flows.every(flow=>flow.componentIds.join()==='c1'));
});
test('entered budgets select a conditional mixed result and an explicit narrower limit never increases a group',async()=>{
 let draft=await scenario();draft=edit(draft,'set budget to 100000').record.draft;let value=await evaluateHomeMix(draft);
 assert.equal(value.report.preferredOptionId,'build-3-move-2-buy-0');assert.equal(value.report.summary.counts.met,1);
 const narrowed=edit(draft,'set Build search maximum to 2').record.draft;value=await evaluateHomeMix(narrowed);
 assert.equal(value.report.summary.enumerated,9);assert.equal(value.report.preferredOptionId,null);assert.equal(narrowed.inputs.groups.find(g=>g.id==='scenario-build').count.value,3);
 const tooWide=edit(narrowed,'set Build search maximum to 4').record.draft;value=await evaluateHomeMix(tooWide);
 assert.equal(value.context.status,'needs-inputs');assert.equal(value.report,null);assert.ok(value.context.missing.some(m=>m.dimension==='bounds.build'));
});
test('monthly rates, fees and effective dates change calculator inputs; unknown costs remain unknown',async()=>{
 const draft=await scenario(),changed=edit(draft,'set monthly cost per role to 7000; set hire fee to 1000; set Build effective month to March 2027').record.draft,value=await evaluateHomeMix(changed);
 assert.equal(value.report.reference.input.annualHireCost,'84000');assert.equal(value.report.reference.input.hireFee,'1000');assert.equal(value.report.reference.input.buildMonth,'2027-03');
 const unknown=edit(changed,'set monthly cost per role to Unknown').record.draft,result=await evaluateHomeMix(unknown);assert.equal(result.report.reference.cash.complete,null);
 assert.throws(()=>edit(changed,'set external backfill count to 1'),/External backfills cannot exceed/);
});
test('existing reviewed mappings and groups remain untouched; unsupported and ambiguous scopes ask for input',async()=>{
 const mapped=(await homeMixFixture()).draft,bytes=JSON.stringify(mapped);assert.throws(()=>withHomeMixScenario(mapped),/already has staffing mappings/);assert.equal(JSON.stringify(mapped),bytes);
 const grouped=await fresh();grouped.inputs.groups[0].count=entered(10);assert.throws(()=>withHomeMixScenario(grouped),/reviewed participant groups/);
 const noMobility=await fresh();
 // A valid graph without a unique owner must not acquire a fabricated component.
 const binding=await actionBinding('ambiguous',noMobility.binding.goal,{},{}),bundle=bundleProposalFixture(noMobility.binding.goal).bundles[0];bundle.components[2].domain='execution';
 const ambiguous=prepareIllustrativePilot(createBundleDraft(bundle,binding),at,{includeDeliveryEstimate:true});assert.throws(()=>withHomeMixScenario(ambiguous),/Which existing components own/);
});
test('FTE, phased and retention goals cannot use the whole-position scenario preset',async()=>{
 for(const goal of ['Add 5 engineering FTE roles over 12 months','Add 5 engineering roles over 12 months with phased arrivals','Reduce turnover']){const draft=await fresh({goal});assert.throws(()=>withHomeMixScenario(draft),/whole additional roles/);}
});
test('candidate Apply keeps future mappings and immutable source history; subsequent bounds remain available',async()=>{
 const draft=edit(await scenario(),'set budget to 100000').record.draft,value=await evaluateHomeMix(draft),commit=await prepareHomeMixCommit(draft,value,value.report.preferredOptionId,at,null);
 assert.equal(commit.draft.inputs.capacity.flows.some(f=>f.path==='buy'),false);assert.equal(commit.draft.inputs.mixScenario.flows.some(f=>f.path==='buy'),true);
 assert.ok(await readHomeMixHistory(commit.history,draft.binding.goalId));const after=await evaluateHomeMix(commit.draft);assert.equal(after.report.summary.enumerated,12);assert.equal(after.report.spec.buy.max,5);
 assert.equal(commit.draft.inputs.costsDistinct.value,null);assert.equal(after.report.preferredOptionId,null); // Changed costs require review, not auto-reapproval.
 assert.doesNotThrow(()=>reconcileBundle(commit.draft));
});
test('new capacity demo gives a genuine bounded multi-path result while original demo bytes and published source replay stay unchanged',async()=>{
 const data=createHomeDemoGoals('2026-10-06T00:00:00.000Z'),capacity=data.workspaces['demo-capacity-mix'].fields.homeSolutionBundlesV1.attachments[0].draft,value=await evaluateHomeMix(capacity);
 assert.equal(value.report.summary.enumerated,12);assert.equal(value.report.preferredOptionId,'build-3-move-2-buy-0');assert.equal(value.report.results.find(r=>r.id===value.report.preferredOptionId).cash.complete,26800);
 data.goals.goals=data.goals.goals.filter(g=>g.id!=='demo-capacity-mix');delete data.workspaces['demo-capacity-mix'];
 assert.equal(hash(data),'ff142097dbd58c4647e72daf3f7472850a8720232b85bee491f875bfbfba9bb0');
 assert.equal(hash(await evaluateHomeMix(await fresh())),'d8f5b13a68678f333fd051ad4cece3ce19db1f40cda542414c08e4266949ec44');
});
test('malformed or unlabeled scenario input cannot bypass the existing draft contract',async()=>{
 const draft=await scenario();for(const mutate of [d=>d.inputs.mixScenario=null,d=>d.inputs.mixScenario.basis.kind='user-entered',d=>d.inputs.mixScenario.flows[0].componentIds=['made-up'],d=>d.inputs.mixScenario.bounds.build.value.max=-1,d=>d.inputs.mixScenario.extra=true]){const changed=structuredClone(draft);mutate(changed);assert.equal(readBundleDraft(changed),null);}
 const untagged=structuredClone(draft);delete untagged.inputs.mixScenario;untagged.inputs.capacity.flows=draft.inputs.mixScenario.flows;const value=await evaluateHomeMix(untagged);assert.equal(value.context.status,'needs-inputs');assert.ok(value.context.missing.some(m=>m.dimension==='group.build'));
});
