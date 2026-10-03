import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionFixture,selectionSpec} from './fixtures/workforce-selection.mjs';
import {searchWorkforceMixes} from '../lib/workforce-mix-search.ts';
import {stageWorkforceMixSelection,previewSelectedWorkforceMixes} from '../lib/workforce-mix-selection.ts';
import {createWorkforceSelectionSession} from '../lib/workforce-selection-session.ts';
import {recordSolutionApproval} from '../lib/workforce-solution.ts';
import {retainWorkforceAlternativeReview} from '../lib/workforce-planning-agent.ts';
import {workforcePlanFields} from '../lib/workforce-increment.ts';
const at='2026-10-03T01:00:00.000Z',ids=['build-0-move-3-buy-0','build-1-move-2-buy-0'];
function setup(patch={},specPatch={},withEvidence=false) {
 const {solution,payload}=selectionFixture(patch,()=>{},withEvidence);
 const snapshot=searchWorkforceMixes(solution,'source-result',selectionSpec(specPatch));
 const context={solution,activeGoalId:solution.goalId,activeGoalStatement:'Synthetic bounded workforce comparison',evidenceResultId:'source-result',expectedSearchFingerprint:snapshot.searchFingerprint,hasUnsavedPlanEdits:false};
 return {context,snapshot,payload};
}
const stage=({context,snapshot},selected=ids)=>stageWorkforceMixSelection(context,snapshot,selected);
test('stages one or two independently recomputed inputs, retaining every non-mix assumption',()=>{
 const fixture=setup(),before=structuredClone(fixture);
 const proposal=stage(fixture);
 assert.equal(proposal.revisions.length,2);assert.equal(stage(fixture,[ids[0]]).revisions.length,1);
 for(const revision of proposal.revisions)for(const field of workforcePlanFields.filter(key=>!['build','move','buy'].includes(key)))assert.equal(revision[field],fixture.payload.input[field]);
 assert.equal(proposal.feasibility,'conditional-on-entered-assumptions');assert.equal(proposal.operationalFeasibilityVerified,false);assert.equal(proposal.requiresUserReview,true);assert.match(proposal.capacityNotice,/not assignable employees/);
 assert.equal('comparisons' in proposal,false);assert.deepEqual(fixture,before);
 proposal.revisions[0].budget='1';assert.deepEqual(fixture,before);
});
for(const [name,change] of Object.entries({
 cash:s=>{s.results[0].plan.totalCash=0},mix:s=>{s.results[0].mix.build=999},
 status:s=>{s.results[0].status='met'},input:s=>{s.results[0].plan.input.trainingCash='0'},
 binding:s=>{s.binding.version++},counts:s=>{s.summary.counts.met++},capacity:s=>{s.operationalFeasibilityVerified=true},
 extra:s=>{s.extra=true},bounds:s=>{s.spec.maxResults=1},
}))test('rejects tampered '+name,()=>{const f=setup();f.snapshot=structuredClone(f.snapshot);change(f.snapshot);assert.throws(()=>stage(f));});
for(const [name,change] of Object.entries({
 goal:c=>{c.activeGoalId='other'},statement:c=>{c.activeGoalStatement='changed'},dirty:c=>{c.hasUnsavedPlanEdits=true},
 evidence:c=>{c.evidenceResultId='other'},search:c=>{c.expectedSearchFingerprint='other'},
 source:c=>{c.solution.results[0].payload.source.businessUnit.org_name='Changed'},
 resultMetadata:c=>{c.solution.results[0].completedAt='2026-10-03T02:00:00.000Z'},
 timing:c=>{c.solution.results[0].payload.timing.opening_to_start.median_days++},
 input:c=>{c.solution.versions[0].inputs.scope.trainingCash='999'},
}))test('rejects stale '+name,()=>{const f=setup();change(f.context);assert.throws(()=>stage(f));});
test('rejects no selection, three options, duplicates, omitted results, core plans and impossible IDs',()=>{
 const f=setup();for(const selected of [[],[...ids,'build-2-move-1-buy-0'],[ids[0],ids[0]],['build-1-move-1-buy-1'],['build-0-move-0-buy-3'],['build-99-move-0-buy-0'],null])assert.throws(()=>stage(f,selected));
 assert.throws(()=>stage(setup({}, {maxResults:1}),[ids[0]]));
});
test('rejects unknown feasibility, failed constraints and invalid backfill mixes',()=>{
 for(const patch of [{budget:''},{trainingHours:''},{budget:'0'}])assert.throws(()=>stage(setup(patch),['build-2-move-1-buy-0']));
 assert.throws(()=>stage(setup({backfills:'2',backfillDate:'2026-11-01',annualBackfillCost:'100000',backfillFee:'1000'}),['build-1-move-0-buy-2']));
});
test('explicit review bridge revalidates proposal and preserves versioned approvals and existing reviews',()=>{
 const f=setup();
 f.context.solution=recordSolutionApproval(f.context.solution,1,'keep-approval',['source-result'],'Preserve approval',at);
 const before=structuredClone(f.context.solution),proposal=stage(f);
 const review=previewSelectedWorkforceMixes(f.context,f.snapshot,proposal,'review-first',at);
 const previous=[review],nextReview=previewSelectedWorkforceMixes(f.context,f.snapshot,proposal,'review-second',at);
 const retained=retainWorkforceAlternativeReview(previous,nextReview,f.context.solution);
 assert.equal(retained.length,2);assert.deepEqual(retained[0],review);assert.deepEqual(previous,[review]);assert.deepEqual(f.context.solution,before);
 assert.equal(review.binding.version,1);assert.equal(review.comparisons.length,4);
 for(const change of [p=>{p.revisions[0].budget='1'},p=>{p.operationalFeasibilityVerified=true},p=>{p.selectedIds.reverse()}]){const tampered=structuredClone(proposal);change(tampered);assert.throws(()=>previewSelectedWorkforceMixes(f.context,f.snapshot,tampered,'bad-review',at));}
 f.context.activeGoalStatement='changed';assert.throws(()=>previewSelectedWorkforceMixes(f.context,f.snapshot,proposal,'stale-review',at));
});
test('session discards cancelled, superseded and A-B-A late replies without persistence',async()=>{
 const f=setup(),pending=[];
 const session=createWorkforceSelectionSession((c,s,i)=>new Promise((resolve,reject)=>pending.push(()=>{try{resolve(stageWorkforceMixSelection(c,s,i))}catch(e){reject(e)}})));
 session.setContext(f.context);let request=session.select(f.snapshot,[ids[0]]);session.cancel();pending.shift()();await request;assert.equal(session.getState().status,'idle');
 request=session.select(f.snapshot,[ids[0]]);session.setContext({...f.context,activeGoalId:'B'});session.setContext(f.context);pending.shift()();await request;assert.equal(session.getState().status,'idle');
 const first=session.select(f.snapshot,[ids[0]]),second=session.select(f.snapshot,[ids[1]]);pending.pop()();await second;pending.pop()();await first;assert.deepEqual(session.getState().proposal.selectedIds,[ids[1]]);
 session.setContext({...f.context,evidenceResultId:'new'});assert.equal(session.getState().status,'idle');
 request=session.select(f.snapshot,[ids[0]]);pending.pop()();await request;assert.equal(session.getState().status,'rejected');
 assert.deepEqual(createWorkforceSelectionSession(async()=>null).getState(),{status:'idle',proposal:null});
});

test('rejects same-ID referenced evidence content changes, not just evidence IDs',()=>{
 const f=setup({}, {}, true);stage(f);f.context.solution.evidence[0].payload.candidatePool=999;assert.throws(()=>stage(f));
});
