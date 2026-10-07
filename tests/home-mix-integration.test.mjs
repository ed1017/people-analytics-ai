import test from 'node:test';
import assert from 'node:assert/strict';
import {homeMixFixture} from './fixtures/home-mix.mjs';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft,readBundleDraft,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {proposePlanRevision,readPlanRevisions} from '../lib/home-plan-revisions.ts';
import {homeMixPlanningRequest} from '../lib/home-mix-planning.ts';
import {evaluateHomeMix,verifyHomeMix} from '../lib/home-mix-runtime.ts';
import {prepareHomeMixCommit,verifyHomeMixCommit,readHomeMixHistory} from '../lib/home-mix-history.ts';
const at='2026-10-07T00:00:00Z';
async function fresh(goal='Add 5 engineering roles over 12 months'){
 const binding=await actionBinding('automatic-test',goal,{},{});
 return prepareIllustrativePilot(createBundleDraft(bundleProposalFixture(goal).bundles[0],binding),at,{includeDeliveryEstimate:true});
}
const edit=(draft,text)=>proposePlanRevision(undefined,draft,text,{option:1,count:3});
test('fresh Home preparation actually invokes the calculator without inventing internal availability or zero costs',async()=>{
 const draft=await fresh(),before=JSON.stringify(draft),value=await evaluateHomeMix(draft);
 assert.equal(value.context.status,'ready');assert.equal(value.report.summary.enumerated,1);assert.equal(value.report.summary.calculatorInvocations,2);
 assert.equal(value.report.reference.cash.knownSubtotal,487500);assert.equal(value.report.reference.cash.complete,null);assert.equal(value.report.preferredOptionId,null);
 assert.equal(value.report.assumptionOrigins.annualHireCost.kind,'illustrative');assert.equal(value.report.reference.input.annualHireCost,'96000');assert.equal(value.report.reference.input.hireFee,'');assert.equal(value.report.reference.input.loadedHourlyCost,'');
 assert.deepEqual(value.report.spec.build,{min:0,max:0});assert.match(value.notes.join(' '),/Build and Move remain outside/);assert.equal(JSON.stringify(draft),before);assert.deepEqual(await verifyHomeMix(value,draft),value);
});
test('cost, budget, horizon, headcount and hours edits drive current numerical inputs and replay',async()=>{
 const initial=await fresh();let proposed=edit(initial,'set budget to 10000; set monthly cost per role to 7000; set maximum added employees to 4; set maximum staff hours to 60; set coverage deadline to October 2027');
 assert.ok(readPlanRevisions(proposed.history,initial.binding.goalId));
 let value=await evaluateHomeMix(proposed.record.draft);
 assert.equal(value.context.status,'ready');assert.equal(value.report.constraints.cashBudget,10000);assert.equal(value.report.constraints.maxAddedEmployees,4);assert.equal(value.report.constraints.maxStaffHours,60);assert.equal(value.report.reference.cash.knownSubtotal,427500);assert.equal(value.report.reference.status,'not-met');
 proposed=edit(proposed.record.draft,'set shared horizon to 6; set coverage deadline to April 2027; use this period for the what-if');value=await evaluateHomeMix(proposed.record.draft);
 assert.equal(value.context.status,'ready');assert.equal(value.report.reference.input.months,'6');assert.equal(value.report.reference.cash.knownSubtotal,217500);
 assert.equal(await verifyHomeMix(value,initial),null);
});
test('unsupported schedules and missing mappings stay unresolved; non-capacity work does not run staffing',async()=>{
 for(const goal of ['Add 5 engineering FTE roles over 12 months','Add 5 engineering roles over 12 months with phased arrivals']){
  const value=await evaluateHomeMix(await fresh(goal));assert.equal(value.context.status,'needs-inputs');assert.equal(value.report,null);
 }
 const value=await evaluateHomeMix(await fresh('Reduce turnover'));assert.equal(value.context.status,'not-applicable');assert.equal(value.report,null);
 const draft=await fresh();draft.bundle.components.find(item=>item.domain==='hiring').domain='execution';assert.throws(()=>homeMixPlanningRequest(draft));
});
test('explicit mapped source evaluates all 21 combinations and selects/stages without mutating the source',async()=>{
 const {draft}=await homeMixFixture(),before=JSON.stringify(draft),value=await evaluateHomeMix(draft);
 assert.equal(value.report.summary.enumerated,21);assert.equal(value.report.summary.counts.met,21);
 const commit=await prepareHomeMixCommit(draft,value,value.report.preferredOptionId,at,null);
 assert.notEqual(bundleInputKey(commit.draft),bundleInputKey(draft));assert.equal(commit.draft.revision,draft.revision+1);assert.equal(commit.history.entries[0].selection.proposal.status,'proposed');assert.equal(JSON.stringify(draft),before);
 assert.deepEqual(await verifyHomeMixCommit(commit,undefined,commit.draft),commit.history);assert.ok(await readHomeMixHistory(commit.history,draft.binding.goalId));
 const changed=structuredClone(commit);changed.history.entries[0].selection.proposal.draft.inputs.capacity.input.buy='99';await assert.rejects(verifyHomeMixCommit(changed,null,commit.draft));
 await assert.rejects(verifyHomeMixCommit(commit,{version:1,goalId:draft.binding.goalId,entries:[]},commit.draft));
});
test('unknown results can be retained without a staffing adoption and previous searches remain byte-identical',async()=>{
 const draft=await fresh(),value=await evaluateHomeMix(draft),first=await prepareHomeMixCommit(draft,value,null,at,null),bytes=JSON.stringify(first.history.entries[0]);
 assert.equal(bundleInputKey(first.draft),bundleInputKey(draft));assert.equal(first.history.entries[0].selection,null);
 const next=edit(draft,'set budget to 10000').record.draft,second=await prepareHomeMixCommit(next,await evaluateHomeMix(next),null,at,first.history);
 assert.equal(second.history.entries.length,2);assert.equal(JSON.stringify(second.history.entries[0]),bytes);assert.ok(await readHomeMixHistory(second.history,draft.binding.goalId));
 const duplicate=await prepareHomeMixCommit(next,await evaluateHomeMix(next),null,at,second.history);assert.equal(duplicate.history.entries.length,2);
 const altered=structuredClone(second.history);altered.entries[0].evaluation.report.reference.cash.knownSubtotal=1;assert.equal(await readHomeMixHistory(altered,draft.binding.goalId),null);
});
test('new constraints are bounded and unknown constraints never become permissive defaults',async()=>{
 const initial=await fresh(),unknown=edit(initial,'set maximum added employees to Unknown').record.draft,value=await evaluateHomeMix(unknown);
 assert.equal(value.report.constraints.maxAddedEmployees,null);assert.equal(value.report.reference.status,'unknown');
 for(const invalid of [null,{maxAddedEmployees:null},{maxAddedEmployees:{value:-1,kind:'user-entered',basis:'test'}},{objective:{value:'global optimum',kind:'user-entered',basis:'test'}}]){const draft=structuredClone(initial);draft.inputs.mixConstraints=invalid;assert.equal(readBundleDraft(draft),null);}
 assert.throws(()=>edit(initial,'set search objective to global optimum'));
});
