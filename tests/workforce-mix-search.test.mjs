import test from 'node:test';
import assert from 'node:assert/strict';
import {searchWorkforceMixes, workforceMixSearchIsCurrent, workforceMixSearchLimits} from '../lib/workforce-mix-search.ts';
import {calculateWorkforceIncrement, workforcePlanFields} from '../lib/workforce-increment.ts';
import {createWorkforceSolution, emptySolutionInputs, beginSolutionRun, completeSolutionRun, reviseWorkforceSolution, recordSolutionApproval} from '../lib/workforce-solution.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';
const at = '2026-10-03T01:00:00.000Z';
function fixture(patch = {}, changePayload = () => {}) {
  const payload = workforceReviewFixture(); Object.assign(payload.input, patch); changePayload(payload);
  payload.proposed = calculateWorkforceIncrement(payload.input, payload.timing);
  payload.hireOnly = calculateWorkforceIncrement({...payload.input, build:'0', move:'0', buy:payload.input.roles, backfills:'0', internalAnnualCostChange:'0', trainingCash:'0', trainingHours:'0'}, payload.timing);
  let solution = createWorkforceSolution('solution-search', 'goal-search', {...emptySolutionInputs(), scope:{...payload.input, goalStatement:'Synthetic bounded workforce comparison', ownerNotes:'KEEP PRIVATE NOTES'}}, at);
  const started = beginSolutionRun(solution, 1, 'source-run', ['brief'], at);
  solution = completeSolutionRun(started.state, started.ticket, [{id:'source-result', kind:'brief', calculator:{name:'single-role-workforce-review', version:'1'}, payload}], at);
  return {solution, payload};
}
function spec(patch = {}) {return {build:{min:0,max:3}, move:{min:0,max:3}, buy:{min:0,max:3}, maxEvaluations:100, maxResults:64, resultFilter:'all', assumptionPolicy:'preserve-reviewed-path-totals-and-timing', ...patch}}
const search = (solution, options = spec()) => searchWorkforceMixes(solution, 'source-result', options);

test('enumerates each integer mix exactly once with calculator-identical comparisons', () => {
  const {solution, payload} = fixture(), result = search(solution);
  assert.equal(result.summary.enumerated, 10); assert.equal(result.summary.calculatorInvocations, 11);
  assert.equal(new Set(result.results.map(item => item.id)).size, 10);
  for (const item of result.results) {
    assert.equal(item.mix.build + item.mix.move + item.mix.buy, 3);
    for (const count of Object.values(item.mix)) assert.ok(Number.isInteger(count) && count >= 0);
    const input = {...payload.input, build:String(item.mix.build), move:String(item.mix.move), buy:String(item.mix.buy)};
    assert.deepEqual(item.plan, calculateWorkforceIncrement(input, payload.timing));
    for (const key of workforcePlanFields.filter(key => !['build','move','buy'].includes(key))) assert.equal(item.plan.input[key], payload.input[key]);
  }
  assert.deepEqual(result.reference.plan, calculateWorkforceIncrement(payload.input, payload.timing));
  assert.equal(result.results.filter(item => item.isSavedMix).length, 1);
});
test('respects lower and upper bounds without relaxing saved demand', () => {
  const {solution} = fixture();
  const result = search(solution, spec({build:{min:1,max:2},move:{min:0,max:1},buy:{min:1,max:2}}));
  assert.deepEqual(result.results.map(item => item.mix), [{build:1,move:0,buy:2},{build:1,move:1,buy:1},{build:2,move:0,buy:1}]);
  assert.equal(result.reference.plan.input.roles, '3');
});
test('empty domains are reported honestly without adding a mix or relaxing a bound', () => {
  const result = search(fixture().solution, spec({build:{min:0,max:0},move:{min:0,max:0},buy:{min:0,max:0}}));
  assert.equal(result.summary.enumerated, 0); assert.equal(result.results.length, 0);
  assert.equal(result.summary.conclusion, 'no-mix-within-bounds');
});
test('rejects fractional, negative, reversed, oversized and nonfinite bounds', () => {
  const {solution} = fixture();
  for (const range of [{min:0.5,max:2},{min:-1,max:2},{min:2,max:1},{min:0,max:4},{min:0,max:Infinity},{min:NaN,max:2}]) assert.throws(() => search(solution, spec({build:range})));
  for (const maxResults of [0,65,1.5,Infinity]) assert.throws(() => search(solution,spec({maxResults})));
  for (const maxEvaluations of [0,1001,1.5,NaN]) assert.throws(() => search(solution,spec({maxEvaluations})));
});
test('full enumeration is preflighted including the reference evaluation', () => {
  const {solution} = fixture();
  assert.throws(() => search(solution,spec({maxEvaluations:10})), /No partial search/);
  assert.equal(search(solution,spec({maxEvaluations:11})).summary.calculatorInvocations, 11);
  const large = fixture({roles:'1000',build:'0',move:'0',buy:'1000'}).solution;
  assert.throws(() => search(large,spec({build:{min:0,max:1000},move:{min:0,max:1000},buy:{min:0,max:1000},maxEvaluations:1000})), /evaluation budget/);
  assert.equal(workforceMixSearchLimits.maxEvaluations,1000);
});
test('output caps are explicit and do not shrink the domain used for trade-offs', () => {
  const {solution} = fixture(), full = search(solution), limited = search(solution,spec({maxResults:2}));
  assert.equal(limited.results.length,2); assert.equal(limited.summary.omittedByCap,8); assert.equal(limited.summary.truncated,true);
  assert.equal(limited.summary.enumerated,10); assert.deepEqual(limited.summary.counts,full.summary.counts);
  assert.deepEqual(limited.results,full.results.slice(0,2));
  assert.match(limited.ordering,/not a quality ranking/);
});
test('constraint-match filter reports excluded and capped counts without claiming operational feasibility', () => {
  const {solution} = fixture(), all = search(solution), filtered = search(solution,spec({resultFilter:'entered-constraints-met',maxResults:1}));
  assert.ok(filtered.results.every(item=>item.status==='met'));
  assert.equal(filtered.summary.matchingFilter,all.summary.counts.met);
  assert.equal(filtered.summary.excludedByFilter,10-all.summary.counts.met);
  assert.equal(filtered.operationalFeasibilityVerified,false); assert.equal(filtered.preferredOptionId,null);
});
test('preserves missing cash and missing constraints instead of treating them as zero', () => {
  const result = search(fixture({annualHireCost:'',budget:'',maxAddedEmployees:'',deadlineMonth:''}).solution);
  assert.equal(result.summary.counts.met,0); assert.equal(result.summary.counts.unknown,10);
  assert.equal(result.summary.conclusion,'entered-constraints-incomplete');
  assert.equal(result.results.find(item=>item.mix.buy===3).tradeOffs.incrementalCash,null);
  assert.ok(result.results.every(item=>item.tradeOffStatus==='not-compared-constraints'));
});
test('unknown employee time prevents dominance even when entered cash/headcount/deadline limits pass', () => {
  const result = search(fixture({trainingHours:''}).solution);
  const item=result.results.find(item=>item.isSavedMix);
  assert.equal(item.status,'met');assert.equal(item.tradeOffs.employeeTimeValue,null);assert.equal(item.tradeOffStatus,'incomparable-missing-metrics');
});
test('missing path timing stays unknown when search activates that path', () => {
  const result=search(fixture({build:'0',move:'0',buy:'3',buildMonth:'',moveMonth:''}).solution);
  const internal=result.results.find(item=>item.mix.build===3);
  assert.equal(internal.tradeOffs.fullCoverageMonth,null);assert.equal(internal.status,'unknown');
  assert.ok(internal.plan.checks.some(check=>check.status==='unknown'));
});
test('saved external backfills are neither scaled nor repaired for incompatible mixes', () => {
  const {solution}=fixture({backfills:'2',backfillDate:'2026-11-01',annualBackfillCost:'100000',backfillFee:'1000'}),before=JSON.stringify(solution);
  const result=search(solution);
  const hireOnly=result.results.find(item=>item.mix.buy===3);
  assert.equal(hireOnly.status,'invalid');assert.equal(hireOnly.plan,null);assert.match(hireOnly.reason,/backfills cannot exceed/);
  for(const item of result.results.filter(item=>item.plan))assert.equal(item.plan.input.backfills,'2');
  assert.equal(JSON.stringify(solution),before);assert.ok(result.summary.counts.invalid>0);
});
test('missing backfill assumption is not silently invented for newly active internal paths', () => {
  const result=search(fixture({build:'0',move:'0',buy:'3',backfills:''}).solution);
  assert.equal(result.results.find(item=>item.mix.buy===3).status,'not-met');
  assert.equal(result.results.find(item=>item.mix.build===3).status,'invalid');
  assert.match(result.results.find(item=>item.mix.build===3).reason,/Enter external backfills/);
});
test('fixed path totals and dates remain explicit while inactive costs follow existing calculator rules', () => {
  const {solution,payload}=fixture(),result=search(solution);
  const buildAll=result.results.find(item=>item.mix.build===3),hireAll=result.results.find(item=>item.mix.buy===3);
  assert.equal(buildAll.plan.input.trainingCash,payload.input.trainingCash);assert.equal(buildAll.plan.totalTime,1000);
  assert.equal(buildAll.plan.rows[0].trainingCash,3000);assert.equal(hireAll.plan.rows[0].trainingCash,0);
  assert.equal(buildAll.plan.input.internalAnnualCostChange,'12000');
  assert.throws(()=>search(solution,spec({assumptionPolicy:'scale-costs-per-person'})));
  assert.throws(()=>search(solution,{...spec(),capacityFromCandidatePool:true}));
});
test('aggregate candidate pool counts do not become available Build/Move capacity', () => {
  const {solution}=fixture({},payload=>{payload.response.internal_talent_readiness.candidate_pool={role_ready:0,near_ready:0,eligible_internal_candidates:0}});
  const result=search(solution);assert.ok(result.results.some(item=>item.mix.build===3));
  assert.match(result.limitations.join(' '),/not evidence of internal availability/);
  assert.equal(result.operationalFeasibilityVerified,false);
});
test('historical timing uses the selected saved evidence exactly, including insufficient history', () => {
  const {solution,payload}=fixture({arrivalMode:'historical-median',arrivalDate:''});const result=search(solution);
  const hired=result.results.find(item=>item.mix.buy===3);assert.equal(hired.plan.arrivalDate,'2026-11-15');assert.deepEqual(hired.plan,calculateWorkforceIncrement(hired.plan.input,payload.timing));
  const insufficient=fixture({arrivalMode:'historical-median',arrivalDate:''},p=>{p.timing.opening_to_start.valid_sample_count=4}).solution;
  const uncertain=search(insufficient).results.find(item=>item.mix.buy===3);
  assert.equal(uncertain.plan.arrivalDate,null);assert.equal(uncertain.tradeOffs.fullCoverageMonth,null);
});
test('Pareto comparisons require all dimensions and preserve equal alternatives without selecting a winner', () => {
  const {solution}=fixture({budget:'1000000',maxAddedEmployees:'10',buildMonth:'2026-10',moveMonth:'2026-10',arrivalDate:'2026-10-01',trainingCash:'0',trainingHours:'0',internalAnnualCostChange:'0'});
  const result=search(solution),internal=result.results.filter(item=>item.mix.buy===0);
  assert.ok(internal.every(item=>item.tradeOffStatus==='nondominated-in-bounds'));
  assert.ok(result.results.filter(item=>item.mix.buy>0).every(item=>item.tradeOffStatus==='dominated-in-bounds'));
  assert.equal(result.preferredOptionId,null);
});
test('faster but more costly mixes remain transparent trade-offs', () => {
  const {solution}=fixture({budget:'1000000',maxAddedEmployees:'10',buildMonth:'2026-12',moveMonth:'2026-12',arrivalDate:'2026-10-01',trainingCash:'0',trainingHours:'0',internalAnnualCostChange:'0'});
  const result=search(solution),hireAll=result.results.find(item=>item.mix.buy===3),internal=result.results.find(item=>item.mix.build===3);
  assert.equal(hireAll.tradeOffStatus,'nondominated-in-bounds');assert.equal(internal.tradeOffStatus,'nondominated-in-bounds');
  assert.ok(hireAll.tradeOffs.incrementalCash>internal.tradeOffs.incrementalCash);assert.ok(hireAll.tradeOffs.fullCoverageMonth<internal.tradeOffs.fullCoverageMonth);
});
test('invalid saved source, stale results, wrong scope and pending calculations stop the search', () => {
  const {solution}=fixture();
  const revised=reviseWorkforceSolution(solution,1,{scope:{...solution.versions[0].inputs.scope,budget:'1000'}},'sidebar','Change limit',at);
  assert.throws(()=>search(revised),/current saved/);
  assert.throws(()=>searchWorkforceMixes(solution,'missing',spec()));
  const wrong=structuredClone(solution);wrong.results[0].payload.source.jobProfile.job_profile_code='OTHER';assert.throws(()=>search(wrong),/scope differs/);
  const timing=structuredClone(solution);timing.results[0].payload.timing.scope.country='US';assert.throws(()=>search(timing),/different scope/);
  const pending=beginSolutionRun(solution,1,'pending',['brief'],at).state;assert.throws(()=>search(pending),/pending calculation/);
});
test('source currency binds exact saved inputs and timing while preserving owner notes and approvals', () => {
  const {solution}=fixture();const approved=recordSolutionApproval(solution,1,'approval',['source-result'],'Keep reviewed approval',at);
  const before=JSON.stringify(approved),result=search(approved);
  assert.equal(JSON.stringify(approved),before);assert.ok(!JSON.stringify(result).includes('KEEP PRIVATE NOTES'));assert.ok(!JSON.stringify(result).includes('Keep reviewed approval'));
  assert.equal(workforceMixSearchIsCurrent(approved,result),true);
  const changed=structuredClone(approved);changed.results[0].payload.timing.opening_to_start.median_days=46;
  assert.equal(workforceMixSearchIsCurrent(changed,result),false);
  assert.equal(result.binding.goalId,'goal-search');assert.match(result.searchFingerprint,/^[a-f0-9]{64}$/);
});
test('deterministic results and fingerprints do not depend on caller property order or mutate inputs', () => {
  const {solution}=fixture(),options=spec(),copy=structuredClone(options),first=search(solution,options);
  const reordered=Object.fromEntries(Object.entries(options).reverse());
  assert.deepEqual(search(solution,reordered),first);assert.deepEqual(options,copy);
  assert.ok(Object.isFrozen(first.results[0].plan.input));assert.ok(Object.isFrozen(first.spec.build));
});
test('all failed limits remain failures, including when some other limits are unknown', () => {
  const result=search(fixture({budget:'0',maxAddedEmployees:'',deadlineMonth:''}).solution);
  assert.equal(result.summary.counts.met,0);assert.equal(result.summary.counts.unknown,0);assert.equal(result.summary.counts['not-met'],10);
  assert.equal(result.summary.conclusion,'no-entered-constraint-match');
});
test('saved timing that cannot calculate the reference stops instead of returning a partial search', () => {
  const {solution}=fixture({arrivalMode:'historical-median',arrivalDate:''});
  solution.results[0].payload.timing.opening_to_start.median_days=1000;
  assert.throws(()=>search(solution),/planning horizon/);
});
test('numerically identical saved mix is identified even with accepted numeric formatting', () => {
  const result=search(fixture({build:'1.00',move:'01',buy:'1'}).solution);
  assert.equal(result.results.filter(item=>item.isSavedMix).length,1);
});
test('largest near-cap triangular domain completes while emitting only the hard result limit', () => {
  const {solution}=fixture({roles:'43',build:'0',move:'0',buy:'43'});
  const result=search(solution,spec({build:{min:0,max:43},move:{min:0,max:43},buy:{min:0,max:43},maxEvaluations:1000,maxResults:64}));
  assert.equal(result.summary.enumerated,990);assert.equal(result.summary.calculatorInvocations,991);
  assert.equal(result.results.length,64);assert.equal(result.summary.omittedByCap,926);
  assert.equal(result.summary.enumerationComplete,true);
});
test('a retained source binding notices changed result payload even when timing and inputs are identical', () => {
  const {solution}=fixture(),result=search(solution),changed=structuredClone(solution);
  changed.results[0].payload.response.warnings.push('Changed saved evidence');
  assert.equal(workforceMixSearchIsCurrent(changed,result),false);
  const newlyApproved=recordSolutionApproval(solution,1,'approval-later',['source-result'],'Explicit local review',at);
  assert.equal(workforceMixSearchIsCurrent(newlyApproved,result),true);
});
