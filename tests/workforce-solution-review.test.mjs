import test from 'node:test';
import assert from 'node:assert/strict';
import {workforceReviewEvidence, workforceLimitSummary} from '../lib/workforce-solution-review.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';

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
