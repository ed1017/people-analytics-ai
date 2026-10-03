import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkforceReview, workforceReviewEvidence, workforceLimitSummary, selectedWorkforceBrief} from '../lib/workforce-solution-review.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';
import {createWorkforceSolution, emptySolutionInputs, beginSolutionRun, completeSolutionRun, reviseWorkforceSolution, recordSolutionApproval} from '../lib/workforce-solution.ts';

test('review preserves selected snapshot scope, readiness, pathway gaps and paired start history', () => {
  const review=workforceReviewFixture(), before=JSON.stringify(review), evidence=workforceReviewEvidence(review);
  assert.equal(evidence.role,'Engineer');assert.equal(evidence.businessUnit,'Technology');
  assert.equal(evidence.ready,2);assert.equal(evidence.nearReady,4);assert.equal(evidence.fullyCovered,2);
  assert.equal(evidence.gaps[0].shortestHours,12);assert.equal(evidence.recruiting.medianDays,45);
  assert.equal(evidence.recruiting.periodStart,'2025-10-01');
  assert.equal(JSON.stringify(review),before);
  // View mutations cannot rewrite the evidence kept with the calculation.
  evidence.skills[0].name='Changed display';assert.equal(review.response.skill_bundle[0].skill_name,'Synthetic analysis');
});

test('missing, invalid and zero evidence are distinct; missing numbers never become zero', () => {
  const review=workforceReviewFixture();review.response.internal_talent_readiness.candidate_pool={role_ready:0,near_ready:null,eligible_internal_candidates:'9'};
  review.response.internal_talent_readiness.development_pathway_coverage={fully_pathway_covered_candidates:-1};
  review.timing=null;
  const evidence=workforceReviewEvidence(review);
  assert.equal(evidence.ready,0);assert.equal(evidence.nearReady,null);assert.equal(evidence.eligible,null);
  assert.equal(evidence.fullyCovered,null);assert.equal(evidence.recruiting.sample,null);assert.equal(evidence.recruiting.medianDays,null);
});

test('different destination or role cannot supply evidence to this solution', () => {
  for(const mismatch of ['destination','response','readiness','timing']) {
    const review=workforceReviewFixture();
    if(mismatch==='destination') review.source.businessUnit.org_code='OTHER';
    if(mismatch==='response') review.response.job_profile_code='OTHER';
    if(mismatch==='readiness') review.response.internal_talent_readiness.job_profile_code='OTHER';
    if(mismatch==='timing') review.timing.scope.job_profile_code='OTHER';
    const evidence=workforceReviewEvidence(review);
    if(mismatch!=='timing') assert.equal(evidence.ready,null);
    if(['destination','timing'].includes(mismatch)) assert.equal(evidence.recruiting.medianDays,null);
    if(['destination','response'].includes(mismatch)) assert.deepEqual(evidence.skills,[]);
  }
});

test('BU or country-specific timing cannot be labeled company-wide; small cohorts remain unknown', () => {
  for(const scope of [{business_unit:'TECH'},{country:'US'}]) {
    const review=workforceReviewFixture();Object.assign(review.timing.scope,scope);
    assert.equal(workforceReviewEvidence(review).recruiting.sample,null);
  }
  const review=workforceReviewFixture();review.timing.opening_to_start.valid_sample_count=4;
  assert.equal(workforceReviewEvidence(review).recruiting.sample,4);
  assert.equal(workforceReviewEvidence(review).recruiting.medianDays,null);
});

test('historic inspection does not borrow data from a newer calculation', () => {
  const old=workforceReviewFixture(), recent=workforceReviewFixture();
  recent.response.internal_talent_readiness.candidate_pool.role_ready=50;
  recent.timing.opening_to_start.median_days=70;
  assert.equal(workforceReviewEvidence(recent).ready,50);
  assert.equal(workforceReviewEvidence(old).ready,2);assert.equal(workforceReviewEvidence(old).recruiting.medianDays,45);
});

test('brief distinguishes unmet and unknown constraints from conditional passing checks', () => {
  const review=workforceReviewFixture();
  assert.match(workforceLimitSummary(review.proposed),/operational feasibility remains unverified/);
  assert.match(workforceLimitSummary(review.hireOnly),/not met/);
  review.proposed.checks[0].status='unknown';assert.match(workforceLimitSummary(review.proposed),/cannot be checked/);
  review.proposed.checks=[];assert.match(workforceLimitSummary(review.proposed),/cannot be checked/);
});

const goal='Compare additional Engineer positions';
const at='2026-10-03T01:00:00.000Z';
function completedBrief() {
  const solution=createWorkforceSolution('s','g',{...emptySolutionInputs(),scope:{...workforceReviewFixture().input,goalStatement:goal}},at);
  const started=beginSolutionRun(solution,1,'run-a',['brief'],at);
  return completeSolutionRun(started.state,started.ticket,[{id:'result-a',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload:workforceReviewFixture()}],at);
}
test('decision brief recognizes the saved workforce calculation without copying it into notes',()=>{
  const solution=recordSolutionApproval(completedBrief(),1,'approval-a',['result-a'],'Reviewed locally',at);
  const before=JSON.stringify(solution),brief=selectedWorkforceBrief(solution,'result-a',goal);
  assert.equal(brief.count,1);assert.equal(brief.current,true);assert.equal(brief.review.proposed.totalCash,22500);
  assert.equal(brief.reviewNotes.length,1);assert.equal(brief.result.id,'result-a');
  assert.equal(JSON.stringify(solution),before);
});
test('changed goal or inputs mark the notes-page comparison historical and preserve the selected result',()=>{
  const old=completedBrief();
  assert.equal(selectedWorkforceBrief(old,'result-a','Different goal').current,false);
  const changed=reviseWorkforceSolution(old,1,{scope:{...workforceReviewFixture().input,goalStatement:goal,trainingCash:'4000'}},'sidebar','Changed training cash',at);
  const started=beginSolutionRun(changed,2,'run-b',['brief'],at);
  const payload=workforceReviewFixture();payload.proposed.totalCash=23500;payload.input.trainingCash='4000';payload.proposed.input.trainingCash='4000';
  const next=completeSolutionRun(started.state,started.ticket,[{id:'result-b',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);
  const historical=selectedWorkforceBrief(next,'result-a',goal),current=selectedWorkforceBrief(next,'result-b',goal);
  assert.equal(historical.current,false);assert.equal(historical.review.proposed.totalCash,22500);
  assert.equal(current.current,true);assert.equal(current.review.proposed.totalCash,23500);
  assert.equal(selectedWorkforceBrief(next,'missing-result',goal).result.id,'result-b');
});
test('no completed workforce brief stays empty; unrelated calculator outputs are not workforce comparisons',()=>{
  assert.equal(selectedWorkforceBrief(undefined,null,goal),null);
  const solution=completedBrief();solution.results[0].calculator.name='different-calculator';
  assert.equal(selectedWorkforceBrief(solution,'result-a',goal),null);
  solution.results=[];assert.equal(selectedWorkforceBrief(solution,null,goal),null);
});
test('malformed nested workforce result shapes fail closed without crashing or changing saved bytes',()=>{
 for(const mutate of [r=>r.input=null,r=>r.proposed=null,r=>r.proposed.rows=null,r=>r.proposed.rows[0].incrementalCash={},r=>r.proposed.checks=[null],r=>r.proposed.input.buy='99',r=>r.hireOnly.input.buy='1',r=>r.limitations={},r=>r.response.warnings=[{}],r=>r.structural.authorizedAnnualBudgetDelta={},r=>r.proposed.totalCash='0']){
  const solution=completedBrief();mutate(solution.results[0].payload);const before=JSON.stringify(solution);
  assert.equal(readWorkforceReview(solution.results[0].payload),null);assert.equal(selectedWorkforceBrief(solution,'result-a',goal),null);assert.equal(JSON.stringify(solution),before);
 }
});
test('valid historical rounding snapshots stay verbatim; another goal cannot borrow their brief',()=>{
 const solution=completedBrief();solution.results[0].payload.proposed.totalCash=22500.01;
 assert.equal(readWorkforceReview(solution.results[0].payload).proposed.totalCash,22500.01);
 assert.equal(selectedWorkforceBrief(solution,'result-a',goal,'other-goal'),null);
 assert.equal(selectedWorkforceBrief(solution,'result-a',goal,'g').review.proposed.totalCash,22500.01);
});
test('internally consistent forged payload inputs cannot borrow another saved version or approval',()=>{
 const solution=completedBrief(),payload=solution.results[0].payload;
 for(const input of [payload.input,payload.proposed.input,payload.hireOnly.input])input.jobProfile='OTHER';
 assert.ok(readWorkforceReview(payload));assert.equal(selectedWorkforceBrief(solution,'result-a',goal),null);
 const ambiguous=completedBrief();ambiguous.versions[0].inputs.costs.trainingCash='3000';assert.equal(selectedWorkforceBrief(ambiguous,'result-a',goal),null);
});
