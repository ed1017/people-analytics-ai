// Offline only. Consumes the existing readiness contract; no service or feature inputs.
import { createHash } from 'node:crypto';
import { validatePredictiveReadiness } from './predictive-readiness.ts';

export const vintageProtocol = Object.freeze({
  version: 'constructed-turnover-vintages-v1',
  trainingStart: '2023-01',
  origins: Object.freeze(['2024-12', '2025-03', '2025-06', '2025-09']),
  cutoffs: Object.freeze(['2025-01-01T00:00:00.000Z', '2025-04-01T00:00:00.000Z', '2025-07-01T00:00:00.000Z', '2025-10-01T00:00:00.000Z']),
  assessmentCutoff: '2026-02-01T00:00:00.000Z',
  assessmentEnd: '2025-12', horizon: 3,
  methods: Object.freeze(['recent-mean-3', 'seasonal-naive-12']),
  selection: 'none; paired baseline comparison only',
  custody: 'fully visible constructed fixture; no untouched holdout claim',
});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export function nextMonth(month, offset) {
  const [year, part] = month.split('-').map(Number), index = year * 12 + part - 1 + offset;
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
}
const metrics = errors => ({ count: errors.length, mae: errors.reduce((a, x) => a + Math.abs(x), 0) / errors.length,
  rmse: Math.sqrt(errors.reduce((a, x) => a + x * x, 0) / errors.length), bias: errors.reduce((a, x) => a + x, 0) / errors.length });
const identity = input => hash({ manifest: { ...input.manifest, completion: undefined }, target: input.target });
function qualify(input, cutoff, end) {
  const readiness = validatePredictiveReadiness(input), reasons = [...readiness.forecastEligibility.reasons];
  if (readiness.inputStatus !== 'valid') return { readiness, reasons, rows: [] };
  if (input.cutoff !== cutoff) reasons.push('protocol-cutoff-mismatch');
  if (input.manifest.dataClass !== 'constructed-synthetic' || input.manifest.observationBasis !== 'simulated') reasons.push('constructed-fixture-required');
  if (input.target.domain !== 'turnover' || input.target.measure !== 'voluntary-count' || input.target.cadence !== 'monthly') reasons.push('count-target-required');
  const rows = readiness.history;
  const expected = [];
  for (let month = vintageProtocol.trainingStart; month <= end; month = nextMonth(month, 1)) expected.push(month);
  // Completeness declarations alone do not establish a dense series; require every protocol month.
  if (rows.length !== expected.length || rows.some((row, i) => row.details.period !== expected[i] || row.outcome === null)) reasons.push('protocol-history-incomplete');
  return { readiness, reasons: [...new Set(reasons)].sort(), rows };
}

/** Exactly four training snapshots and one later scoring snapshot, all existing readiness contracts. */
export function evaluateTurnoverReadinessSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length !== 5) throw Error('Expected four training contracts and one scoring contract.');
  const score = qualify(snapshots[4], vintageProtocol.assessmentCutoff, vintageProtocol.assessmentEnd);
  const folds = vintageProtocol.origins.map((origin, index) => {
    const train = qualify(snapshots[index], vintageProtocol.cutoffs[index], origin);
    const predictionReasons = [...train.reasons];
    const scoringReasons = [...score.reasons];
    if (train.readiness.inputStatus === 'valid' && score.readiness.inputStatus === 'valid' && identity(snapshots[index]) !== identity(snapshots[4])) scoringReasons.push('snapshot-scope-mismatch');
    // The same declared revision may not silently change across snapshots.
    if (!train.reasons.length && !score.reasons.length && train.rows.some(row => {
      const later = score.rows.find(item => item.details.period === row.details.period);
      return !later || later.recordKey !== row.recordKey || later.revision < row.revision ||
        (later.revision === row.revision && hash(later) !== hash(row));
    })) scoringReasons.push('snapshot-revision-conflict');
    const targetMonths = [1, 2, 3].map(h => nextMonth(origin, h));
    const methods = predictionReasons.length ? [] : vintageProtocol.methods.map(method => {
      const recent = train.rows.slice(-3).reduce((a, row) => a + row.outcome, 0) / 3;
      const points = targetMonths.map((month, i) => {
        const prediction = method === 'recent-mean-3' ? recent : train.rows.find(row => row.details.period === nextMonth(month, -12)).outcome;
        const actual = scoringReasons.length ? null : score.rows.find(row => row.details.period === month).outcome;
        return { month, horizon: i + 1, prediction, actual, error: actual === null ? null : prediction - actual };
      });
      return { method, effectiveLookbackMonths: method === 'recent-mean-3' ? 3 : 12, points, quarterError: scoringReasons.length ? null : points.reduce((a, p) => a + p.error, 0) };
    });
    return { origin, trainingCutoff: vintageProtocol.cutoffs[index], trainingStart: vintageProtocol.trainingStart,
      trainingEnd: origin, trainingMonths: train.rows.length, targets: targetMonths,
      trainingFingerprint: hash(train.rows), scoringCutoff: vintageProtocol.assessmentCutoff,
      status: predictionReasons.length || scoringReasons.length ? 'blocked' : 'evaluated-constructed-fixture',
      predictionReasons, scoringReasons, methods };
  });
  const ready = folds.every(fold => fold.status === 'evaluated-constructed-fixture');
  const comparisons = ready ? vintageProtocol.methods.map(method => {
    const outputs = folds.map(fold => fold.methods.find(row => row.method === method));
    const points = outputs.flatMap(output => output.points);
    return { method, monthly: metrics(points.map(point => point.error)),
      byHorizon: [1, 2, 3].map(horizon => ({ horizon, ...metrics(points.filter(p => p.horizon === horizon).map(p => p.error)) })),
      quarterly: metrics(outputs.map(output => output.quarterError)) };
  }) : null;
  return freeze({ status: ready ? 'evaluated-constructed-fixture' : 'blocked', protocol: vintageProtocol,
    protocolFingerprint: hash(vintageProtocol), folds, comparisons, distinctTargetMonths: ready ? 12 : null,
    evidenceKind: 'constructed-synthetic-vintage-mechanics', realWorldPerformanceValidated: false,
    sourceTruthVerified: false, causalEffect: null, predictionInterval: null, rate: null,
    limitations: ['Observation and completion times are simulated.', 'Four disjoint target quarters share overlapping training history; independence is not established.',
      'Fixed baselines only; no tuning, selection, causal estimation or calibrated intervals.', 'Passing synthetic checks does not validate an operational source adapter.'] });
}
