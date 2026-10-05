// Offline consumer contract. Callers must obtain fresh evidence from the local runner.
import { createHash } from 'node:crypto';
import { validatePredictiveReadiness } from './predictive-readiness.ts';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
function status(checks, missingInputs) {
  const pass = checks.inputStatus === 'valid' && checks.forecast.status === 'contract-pass' && checks.forecast.reasons.length === 0;
  return { status: 'unqualified', contractStatus: pass ? 'passed' : 'blocked',
    label: pass ? 'Contract checks passed; forecast validation unavailable' : 'Forecast unavailable: source evidence incomplete or invalid',
    reasonCodes: [...checks.forecast.reasons], missingInputs: [...missingInputs],
    causalEffectStatus: 'unavailable', operationalForecast: null, interval: null, sourceTruthVerified: false };
}
/** Re-evaluate raw metadata; never accept a caller's claimed qualification flag. */
export function forecastReadiness(contract) {
  const r = validatePredictiveReadiness(contract);
  const result = status({ inputStatus: r.inputStatus, forecast: r.forecastEligibility }, r.forecastEligibility.reasons);
  return freeze({ ...result, selectedHistory: r.history, causalReasonCodes: r.causalEffectEligibility.reasons });
}
// Project only unavailable qualification results; selected-row counters are not outcome zeros.
function domainEvaluation(domain, result) {
  const reasonCodes = domain === 'hiring' ? result?.reasons : domain === 'satisfaction' ? result?.missingInputs : result?.reasonCodes;
  const blocked = domain === 'hiring'
    ? result?.status === 'blocked' && result.horizonDays === 90 && result.operationallyQualified === false && result.forecastMetrics === null
    : result?.status === 'unqualified' && result.contractStatus === 'blocked'
      && (domain === 'turnover' ? result.operationalForecast === null && result.mechanicsBenchmark === null : result.forecast === null);
  if (!blocked || result.sourceTruthVerified !== false || !Array.isArray(reasonCodes) || !reasonCodes.length
    || reasonCodes.some(code => typeof code !== 'string' || !code.trim())) throw Error('Missing or contradictory domain evaluation.');
  const notes = {
    turnover: 'Monthly source evaluation unavailable: verified observation history and complete monthly coverage are missing. The retrospective synthetic benchmark does not qualify this source.',
    hiring: 'Opening-cohort evaluation unavailable: no qualified opening history or follow-up coverage. The configured 90-day audit horizon is not validated on company outcomes; completed-start durations remain unknown.',
    satisfaction: 'Wave evaluation unavailable: no qualified comparable waves or supported scoring definition. Satisfaction scores and response coverage remain unknown.',
  };
  return { status: 'unavailable', contractStatus: 'blocked', reasonCodes: [...reasonCodes],
    history: null, metrics: null, note: notes[domain] };
}
/** Internal composition of freshly executed checkpoint and preview; no source mutation. */
export function composeForecastConsumer(checkpoint, preview, implementationIdentity) {
  if (checkpoint?.status !== 'offline-evidence-checkpoint' || checkpoint.operationallyValidated !== false ||
      preview?.status !== 'conditional-retrospective-synthetic-demo' || preview.operationallyQualified !== false ||
      preview.qualification?.countForecastQualified !== false || preview.qualification?.pointInTimeValidated !== false ||
      preview.qualification?.completenessVerified !== false || preview.qualification?.generatorProvenanceVerified !== false ||
      preview.qualification?.rateForecastQualified !== false || preview.rate !== null || preview.uncertainty?.interval !== null ||
      typeof implementationIdentity !== 'string' || !/^[a-f0-9]{64}$/.test(implementationIdentity)) throw Error('Contradictory or missing forecast qualification metadata.');
  const benchmark = checkpoint.existingPreviewBenchmark;
  if (preview.identities.datasetFingerprint !== benchmark.datasetFingerprint || preview.identities.protocolFingerprint !== benchmark.protocolFingerprint ||
      preview.identities.fixtureSha256 !== checkpoint.files['tests/fixtures/aggregate-exit-history.json'] ||
      preview.identities.evaluatorSha256 !== checkpoint.files['lib/ml/aggregate-exit-forecast.ts'] ||
      preview.selectedMethod !== benchmark.selection.method) throw Error('Forecast preview does not match evaluated evidence.');
  const domains = Object.fromEntries(['turnover', 'satisfaction', 'hiring'].map(domain => {
    const source = checkpoint.sourceEvidence[domain], checks = source?.checks;
    // Current source adapter has no proven availability/completion. A future qualified adapter needs explicit review.
    if (checks?.inputStatus !== 'valid' || checks.sourceTruthVerified !== false || checks.forecast?.status !== 'blocked' ||
        !checks.forecast.reasons.includes('completeness-unknown') || !checks.forecast.reasons.includes('availability-unverified') ||
        !Array.isArray(source.minimumMissingInputs) || !source.minimumMissingInputs.length) throw Error('Source evidence contradicts the current unavailable-source adapter.');
    return [domain, { ...status(checks, source.minimumMissingInputs), causalReasonCodes: checks.causalEffect.reasons, evaluation: domainEvaluation(domain, source.domainEvaluation) }];
  }));
  const body = { schemaVersion: 1, status: 'unqualified', operationalForecast: null, domains,
    conditionalDemo: { status: 'conditional-retrospective-synthetic-demo', assumptions: preview.assumptions, preview },
    evaluation: { existingBenchmark: 'Retrospective final-data synthetic benchmark; assessment already inspected, not untouched.',
      constructedFixture: checkpoint.constructedVintageEvaluation.status, operationallyValidated: false },
    evidenceIdentity: digest(checkpoint), implementationIdentity };
  return freeze({ ...body, identity: digest(body) });
}
/** Compare with freshly evaluated local evidence, not a clock or a caller-supplied hash. */
export function resolveForecastConsumerCache(cached, fresh) {
  let matches = false;
  try { matches = JSON.stringify(cached) === JSON.stringify(fresh); } catch { /* malformed cache is stale */ }
  if (matches) return fresh;
  return freeze({ schemaVersion: 1, status: 'stale', operationalForecast: null, conditionalDemo: null,
    reasonCodes: ['cached-result-does-not-match-current-evidence'], currentIdentity: fresh.identity,
    nextStep: 'Regenerate and review the current local forecast consumer result.' });
}
