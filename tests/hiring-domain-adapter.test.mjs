import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHiringDomain } from '../lib/ml/hiring-domain-adapter.mjs';
import { fixture, at } from './fixtures/predictive-readiness.mjs';

const setup = () => {
  const input = fixture('hiring');
  input.cutoff = at('2026-06-01');
  input.manifest.completion.through = at('2026-05-31');
  input.manifest.completion.observedAt = input.cutoff;
  const coverage = { cohortCoverage: 'all-openings', statusCoverageThrough: input.cutoff, observedAt: input.cutoff,
    populationVersion: input.manifest.populationVersion, sourceDefinitionVersion: input.manifest.sourceDefinitionVersion,
    evidenceRef: 'simulated-all-opening-coverage', observationBasis: 'simulated' };
  return { input, options: { horizonDays: 90, coverage } };
};
function add(input, key, values, openedAt = at('2026-01-31')) {
  const row = structuredClone(input.records[0]);
  Object.assign(row, { recordKey: key, effectiveAt: openedAt });
  Object.assign(row.value, { openedAt, features: [{ name: 'opening-month', availableAt: openedAt }] }, values);
  input.records.push(row);
  return row;
}
test('hiring: fixed horizon retains unresolved, cancelled and immature denominators without imputation', () => {
  const { input, options } = setup();
  add(input, 'open', { count: 3, status: 'open', actualStartAt: null, startObservedAt: null });
  add(input, 'cancelled', { count: 2, status: 'cancelled', actualStartAt: null, startObservedAt: null });
  const recent = add(input, 'recent', { count: 4, status: 'open', acceptedAt: null, acceptedObservedAt: null, actualStartAt: null, startObservedAt: null }, at('2026-05-31'));
  recent.observedAt = at('2026-06-01');
  const result = evaluateHiringDomain(input, options);
  assert.equal(result.status, 'descriptive-contract-pass');
  assert.deepEqual(result.audit, { selectedOpeningCount: 21, matureOpeningCount: 17, immatureOpeningCount: 4,
    matureStartedByHorizon: 12, matureStartedAfterHorizon: 0, matureCancelled: 2, matureUnresolved: 3,
    completedByHorizonMeanDays: 29, observedStartFraction: 12 / 17 });
  assert.equal(result.readiness.forecastEligibility.status, 'blocked');
  assert.equal(result.forecastMetrics, null);
});
test('hiring: same-day actual start remains zero, never acceptance or capacity', () => {
  const { input, options } = setup();
  const v = input.records[0].value;
  v.acceptedAt = v.actualStartAt = v.openedAt; v.startObservedAt = v.acceptedObservedAt = v.openedAt;
  assert.equal(evaluateHiringDomain(input, options).audit.completedByHorizonMeanDays, 0);
  input.target.measure = 'opening-to-accepted-offer';
  assert.equal(evaluateHiringDomain(input, options).status, 'blocked');
});
test('hiring: unknown actual-start availability is unresolved, not a zero duration', () => {
  const { input, options } = setup(); input.records[0].value.startObservedAt = null;
  const result = evaluateHiringDomain(input, options);
  assert.equal(result.audit.matureUnresolved, 12);
  assert.equal(result.audit.completedByHorizonMeanDays, null);
  assert.equal(result.audit.observedStartFraction, null);
  assert.ok(result.reasons.includes('actual-start-observation-time-required'));
  assert.equal(result.forecastingPerformanceValidated, false);
});
test('hiring: missing and contradictory coverage withhold descriptive statistics', () => {
  const { input, options } = setup();
  assert.equal(evaluateHiringDomain(input).status, 'blocked');
  for (const patch of [{cohortCoverage: 'completed-fills-only'}, {statusCoverageThrough: at('2026-05-01')},
    {populationVersion: 'other'}, {sourceDefinitionVersion: 'other'}, {evidenceRef: null}, {observationBasis: 'source-evidenced'},
    {observedAt: null}, {observedAt: at('2026-06-02')}]) {
    const result = evaluateHiringDomain(input, { ...options, coverage: {...options.coverage, ...patch} });
    assert.equal(result.status, 'blocked'); assert.equal(result.audit.completedByHorizonMeanDays, null);
    assert.equal(result.audit.observedStartFraction, null);
  }
});
test('hiring: completion and observation absence remain blocked despite coverage declarations', () => {
  for (const mutate of [x => { x.manifest.completion = null; }, x => { x.records[0].observedAt = null; }]) {
    const { input, options } = setup(); mutate(input);
    assert.equal(evaluateHiringDomain(input, options).status, 'blocked');
  }
});
test('hiring: late revision cannot rewrite as-of result; visible revision updates duration', () => {
  const { input, options } = setup(); const original = evaluateHiringDomain(input, options);
  const revised = structuredClone(input.records[0]);
  Object.assign(revised, { revision: 2, supersedes: 1, observedAt: at('2026-06-02') });
  revised.value.actualStartAt = at('2026-03-10'); input.records.push(revised);
  assert.deepEqual(evaluateHiringDomain(input, options).audit, original.audit);
  revised.observedAt = at('2026-05-01'); revised.value.startObservedAt = at('2026-03-11');
  assert.equal(evaluateHiringDomain(input, options).audit.completedByHorizonMeanDays, 38);
});
test('hiring: a stale status extract blocks when the as-of date advances', () => {
  const { input, options } = setup(); input.cutoff = at('2026-06-02');
  assert.ok(evaluateHiringDomain(input, options).reasons.includes('status-followup-incomplete'));
});
test('hiring: exact maturity boundary is included; starts after horizon remain a distinct count', () => {
  const { input, options } = setup(); options.horizonDays = 121;
  assert.equal(evaluateHiringDomain(input, options).audit.matureOpeningCount, 12);
  options.horizonDays = 122;
  assert.equal(evaluateHiringDomain(input, options).audit.immatureOpeningCount, 12);
  options.horizonDays = 28;
  const result = evaluateHiringDomain(input, options);
  assert.equal(result.audit.matureStartedAfterHorizon, 12);
  assert.equal(result.audit.completedByHorizonMeanDays, null);
});
test('hiring: malformed data and horizon fail closed and inputs stay untouched', () => {
  const { input, options } = setup(); const before = structuredClone(input);
  const result = evaluateHiringDomain(input, options);
  assert.deepEqual(input, before); assert.ok(Object.isFrozen(result.audit));
  assert.equal(evaluateHiringDomain(input, {...options, horizonDays: 0}).status, 'blocked');
  assert.equal(evaluateHiringDomain(null).status, 'blocked');
  input.records[0].value.employeeId = 'unsupported';
  assert.equal(evaluateHiringDomain(input, options).audit, null);
});
test('hiring: cancelled start contradictions and unknown status block', () => {
  for (const status of ['unknown', 'cancelled']) {
    const { input, options } = setup(); input.records[0].value.status = status;
    assert.equal(evaluateHiringDomain(input, options).status, 'blocked');
  }
});
test('hiring: all unresolved openings preserve a known zero observed-start fraction', () => {
  const { input, options } = setup();
  Object.assign(input.records[0].value, {status: 'open', actualStartAt: null, startObservedAt: null});
  const result = evaluateHiringDomain(input, options);
  assert.equal(result.audit.observedStartFraction, 0);
  assert.equal(result.audit.completedByHorizonMeanDays, null);
});
test('hiring: rejected input and coverage accessors are never invoked', () => {
  const { input, options } = setup();
  const hostile = {get target() {throw new Error('must not read');}};
  assert.equal(evaluateHiringDomain(hostile).status, 'blocked');
  Object.defineProperty(options.coverage, 'observedAt', {get() {throw new Error('must not read');}, enumerable: true});
  assert.equal(evaluateHiringDomain(input, options).status, 'blocked');
  const custom = setup(); Object.setPrototypeOf(custom.options.coverage, {trusted: true});
  assert.equal(evaluateHiringDomain(custom.input, custom.options).status, 'blocked');
  assert.equal(evaluateHiringDomain(input).operationallyQualified, false);
});
