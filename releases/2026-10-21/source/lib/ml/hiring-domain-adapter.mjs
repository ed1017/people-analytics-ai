import { validatePredictiveReadiness } from './predictive-readiness.ts';

const DAY = 86400000;
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

/**
 * As-of descriptive audit of aggregate opening buckets, not survival estimation.
 * horizonDays is chosen before examining labels; maturity means elapsed follow-up,
 * not proof an unresolved opening will never start. Historical labels are only
 * selected by the existing validator. No IDs, rows, or invented dates are returned.
 * coverage is an upstream declaration, never an authenticated source attestation.
 */
export function evaluateHiringDomain(input, { horizonDays = 90, coverage = null } = {}) {
  const readiness = validatePredictiveReadiness(input);
  if (readiness.inputStatus !== 'valid') input = null;
  const reasons = new Set(readiness.forecastEligibility.reasons.filter(reason => reason !== 'unresolved-hiring-cohort'));
  if (input?.target?.domain !== 'hiring' || input?.target?.measure !== 'opening-to-actual-start') reasons.add('actual-start-target-required');
  if (!Number.isSafeInteger(horizonDays) || horizonDays < 1 || horizonDays > 3650) reasons.add('invalid-fixed-horizon');
  const keys = ['cohortCoverage', 'statusCoverageThrough', 'observedAt', 'populationVersion', 'sourceDefinitionVersion', 'evidenceRef', 'observationBasis'];
  const validCoverage = coverage && typeof coverage === 'object' && !Array.isArray(coverage)
    && Object.getPrototypeOf(coverage) === Object.prototype && Reflect.ownKeys(coverage).length === keys.length
    && keys.every(key => Object.hasOwn(coverage, key) && Object.hasOwn(Object.getOwnPropertyDescriptor(coverage, key), 'value')
      && Object.getOwnPropertyDescriptor(coverage, key).enumerable);
  if (!validCoverage) reasons.add('opening-and-followup-coverage-required');
  else {
    if (coverage.cohortCoverage !== 'all-openings') reasons.add('all-opening-denominator-required');
    if (!instant(coverage.statusCoverageThrough) || !instant(input?.cutoff) || coverage.statusCoverageThrough < input.cutoff) reasons.add('status-followup-incomplete');
    if (!instant(coverage.observedAt) || coverage.observedAt > input?.cutoff || coverage.observedAt < coverage.statusCoverageThrough) reasons.add('coverage-availability-unverified');
    if (coverage.populationVersion !== input?.manifest?.populationVersion || coverage.sourceDefinitionVersion !== input?.manifest?.sourceDefinitionVersion) reasons.add('coverage-scope-mismatch');
    if (typeof coverage.evidenceRef !== 'string' || !coverage.evidenceRef.trim()) reasons.add('coverage-evidence-required');
    if (coverage.observationBasis !== input?.manifest?.observationBasis || !['simulated', 'source-evidenced'].includes(coverage.observationBasis)) reasons.add('coverage-observation-basis-mismatch');
  }
  const canAudit = readiness.inputStatus === 'valid' && input?.target?.domain === 'hiring'
    && input.target.measure === 'opening-to-actual-start' && !reasons.has('invalid-fixed-horizon');
  const audit = canAudit ? { selectedOpeningCount: 0, matureOpeningCount: 0, immatureOpeningCount: 0,
    matureStartedByHorizon: 0, matureStartedAfterHorizon: 0, matureCancelled: 0, matureUnresolved: 0,
    completedByHorizonMeanDays: null, observedStartFraction: null } : null;
  let sumDays = 0;
  if (audit) for (const row of readiness.history) {
    // Inspect only the revision selected by the shared as-of validator.
    const selected = input.records.find(record => record.recordKey === row.recordKey && record.revision === row.revision).value;
    if (selected.actualStartAt !== null && selected.startObservedAt === null) reasons.add('actual-start-observation-time-required');
    if (selected.status === 'unknown') reasons.add('opening-status-unavailable');
    if (selected.status === 'cancelled' && selected.actualStartAt !== null) reasons.add('cancelled-start-contradiction');
    const n = row.details.count;
    audit.selectedOpeningCount += n;
    if (Date.parse(input.cutoff) - Date.parse(row.effectiveAt) < horizonDays * DAY) {
      audit.immatureOpeningCount += n;
      continue;
    }
    audit.matureOpeningCount += n;
    if (row.details.disposition === 'cancelled') audit.matureCancelled += n;
    else if (row.outcome === null) audit.matureUnresolved += n;
    else if (row.outcome > horizonDays) audit.matureStartedAfterHorizon += n;
    else { audit.matureStartedByHorizon += n; sumDays += row.outcome * n; }
  }
  if (audit && !audit.matureOpeningCount) reasons.add('no-mature-openings');
  const qualified = reasons.size === 0;
  // Even conditional summary statistics are withheld when scope/availability is unknown.
  if (audit && qualified) {
    audit.observedStartFraction = audit.matureStartedByHorizon / audit.matureOpeningCount;
    audit.completedByHorizonMeanDays = audit.matureStartedByHorizon ? sumDays / audit.matureStartedByHorizon : null;
  }
  return freeze({ methodVersion: 'hiring-domain-audit-v1', status: qualified ? 'descriptive-contract-pass' : 'blocked',
    reasons: [...reasons].sort(), dataClass: readiness.dataClass, horizonDays, asOf: instant(input?.cutoff) ? input.cutoff : null,
    operationallyQualified: false, sourceTruthVerified: false, forecastingPerformanceValidated: false, causalEffectValidated: false,
    evaluationKind: 'as-of-conditional-completed-case-description',
    qualificationBasis: 'declared-all-opening-and-status-coverage',
    limitation: 'Observed at the supplied cutoff, not necessarily known at each opening horizon. Cancelled and unresolved openings stay in the denominator. No independent-censoring assumption, survival estimate, forecast error, capacity estimate, or causal effect.',
    audit, forecastMetrics: null, readiness });
}
