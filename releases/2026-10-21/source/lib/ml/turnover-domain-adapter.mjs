// Local aggregate checks only; this adapter neither creates provenance nor fits a new model.
import { validatePredictiveReadiness } from './predictive-readiness.ts';
import { evaluateTurnoverReadinessSnapshots, nextMonth } from './turnover-vintage-evaluation.mjs';

const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const monthEnd = period => {
  const date = new Date(`${period}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return new Date(date.getTime() - 1).toISOString();
};
const requirements = {
  'availability-unverified': 'Provide evidenced first-observed history; current extraction or bulk insertion time is not historical availability.',
  'availability-unknown': 'Provide an actual first-observed timestamp for every label and correction, retaining revision predecessors.',
  'completeness-unknown': 'Provide scoped completion status, covered-through time, observation time and evidence reference.',
  'monthly-history-gap': 'Reconcile every intervening month, including explicitly confirmed zero-event months.',
  'duplicate-calendar-month': 'Provide one aggregate per month for the declared population, using revisions rather than duplicate month keys.',
  'month-not-complete': 'Provide a monthly aggregate effective on the last calendar day and completion evidence covering the entire month.',
  'count-target-required': 'Use monthly voluntary-exit counts. Rates require separate population-aligned person-time exposure evidence.',
  'no-history': 'Provide revisioned monthly counts with source-observed availability and scoped completeness.',
  'count-unavailable': 'Provide recorded voluntary counts; unknown or suppressed values cannot become zero.',
};

/** Source qualification and constructed mechanics are intentionally separate evidence channels. */
export function assessTurnoverDomain({ sourceContract, constructedSnapshots = null } = {}) {
  const readiness = validatePredictiveReadiness(sourceContract);
  const reasons = [...readiness.forecastEligibility.reasons];
  let rows = [];
  if (readiness.inputStatus === 'valid') {
    if (sourceContract.target.domain !== 'turnover' || sourceContract.target.measure !== 'voluntary-count' || sourceContract.target.cadence !== 'monthly') {
      reasons.push('count-target-required');
    } else {
      rows = readiness.history.map(row => ({ period: row.details.period, count: row.outcome, recordKey: row.recordKey, revision: row.revision }));
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i], end = monthEnd(row.period);
        if (readiness.history[i].effectiveAt.slice(0, 10) !== end.slice(0, 10) || !sourceContract.manifest.completion?.through || sourceContract.manifest.completion.through < end) reasons.push('month-not-complete');
        if (i && row.period === rows[i - 1].period) reasons.push('duplicate-calendar-month');
        else if (i && row.period !== nextMonth(rows[i - 1].period, 1)) reasons.push('monthly-history-gap');
      }
    }
  }
  if (!rows.length) reasons.push('no-history');
  const reasonCodes = [...new Set(reasons)].sort();
  let mechanicsBenchmark = null;
  if (constructedSnapshots !== null) {
    try { mechanicsBenchmark = evaluateTurnoverReadinessSnapshots(constructedSnapshots); }
    catch { mechanicsBenchmark = { status: 'blocked', reasonCodes: ['invalid-constructed-vintage-input'], comparisons: null }; }
  }
  return freeze({
    domain: 'turnover', status: 'unqualified', contractStatus: reasonCodes.length ? 'blocked' : 'passed',
    reasonCodes, missingInputs: reasonCodes.map(code => ({ code, requirement: requirements[code] ?? `Resolve readiness contract condition: ${code}.` })),
    selectedHistory: rows, excludedLateRecords: readiness.excludedLateRecords,
    coverage: { firstMonth: rows[0]?.period ?? null, lastMonth: rows.at(-1)?.period ?? null, selectedMonths: rows.length,
      // Coverage describes selected input only; it does not assert that months outside this range exist or are complete.
      recordedZeroMonths: rows.filter(row => row.count === 0).map(row => row.period) },
    mechanicsBenchmark, operationalForecast: null, rate: null, predictionInterval: null, causalEffect: null,
    sourceTruthVerified: false, realWorldPerformanceValidated: false,
    nextStep: reasonCodes.length ? 'Resolve the listed source contract gaps before a source-based temporal evaluation.' : 'Verify source evidence and predeclare source-based training/scoring windows; contract checks alone are not predictive validation.',
    limitations: ['Selected history is an audit view, not a qualified forecast.', 'The optional benchmark evaluates constructed snapshots only and cannot qualify the supplied source.', 'Completion and observation declarations are checked for consistency, not independently authenticated.', 'No model selection, causal effect, rate or calibrated uncertainty is produced.'],
  });
}
