// Offline arithmetic bridge, not a replacement for the native release adapters.
// The caller must enforce as-of availability, complete labels, hiring maturity,
// and survey instrument comparability before supplying normalized history.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {linearPrediction, monthIndex} from '../../lib/ml/synthetic-domain-predictions/boundary.mjs';
import {fitHiringCohorts, predictHiringCohorts} from '../../lib/ml/hiring-cohort-model.mjs';
import {monthAdd} from '../../lib/ml/synthetic-workforce/common.mjs';

const domains = ['turnover', 'hiring', 'satisfaction'];
const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const envelope = {interval: null, operationallyQualified: false};
const blocked = (reason, audit) => ({...envelope, status: 'blocked', reasons: [reason], predictions: [], audit});
const consecutive = (rows, count, step) => rows.length === count
  && rows.every((row, index) => row.month === monthAdd(rows[0].month, index * step));

/** Inputs are qualified aggregate histories, never person-level records or raw releases. */
export function forecastBaseline({domain, months, history}) {
  assert(domains.includes(domain), 'Unknown aggregate domain');
  assert(Array.isArray(months) && months.length > 0 && months.length <= 12);
  assert(months.every((month, index) => validMonth(month) && (!index || month > months[index - 1])), 'Unique chronological targets required');
  assert(Array.isArray(history) && history.length <= 120);
  assert(history.every((row, index) => row && validMonth(row.month)
    && (!index || row.month > history[index - 1].month)), 'Unique chronological history required');
  assert(!history.length || months[0] > history.at(-1).month, 'Targets must follow available history');
  const count = domain === 'turnover' ? 24 : domain === 'hiring' ? 36 : 8;
  const support = history.slice(-count);
  const audit = {boundary: 'caller-qualified-normalized-history', requiredPeriods: count,
    selectedPeriods: support.length, trainingStart: support[0]?.month ?? null,
    trainingEnd: support.at(-1)?.month ?? null};
  if (!consecutive(support, count, domain === 'satisfaction' ? 3 : 1)) return blocked('incomplete-calendar-window', audit);
  if (domain === 'hiring') {
    assert(support.every(row => Number.isSafeInteger(row.openings) && row.openings >= 0 && row.openings <= 10000000
      && Number.isSafeInteger(row.started) && row.started >= 0 && row.started <= row.openings), 'Invalid complete aggregate cohort');
    const positive = support.filter(row => row.openings > 0).map(({month, openings, started}) => ({month, openings, started}));
    audit.positiveCohorts = positive.length;
    audit.zeroOpeningMonths = support.filter(row => row.openings === 0).map(row => row.month);
    if (positive.length < 24) return blocked('insufficient-positive-cohorts', audit);
    try {
      return {...envelope, status: 'predicted', reasons: [], audit,
        predictions: predictHiringCohorts(fitHiringCohorts(positive), months)};
    } catch (error) {
      if (['Model optimization did not converge.', 'Model optimization did not descend.'].includes(error.message)) return blocked('fixed-optimizer-failed', audit);
      throw error;
    }
  }
  assert(support.every(row => Number.isFinite(row.value) && row.value >= 0
    && (domain === 'turnover' ? Number.isSafeInteger(row.value) : row.value <= 100)), 'Complete finite history required');
  const recent = mean(support.slice(-3).map(row => row.value));
  if (domain === 'turnover') {
    const counts = new Map(support.map(row => [row.month, row.value]));
    if (months.some(month => !counts.has(monthAdd(month, -12)))) return blocked('seasonal-comparator-unavailable', audit);
    const points = support.slice(-12).map(row => ({x: monthIndex(row.month), y: row.value}));
    return {...envelope, status: 'predicted', reasons: [], audit, predictions: months.map(month => ({month,
      'recent-mean-3': recent, 'seasonal-naive-12': counts.get(monthAdd(month, -12)),
      'linear-trend': Math.max(0, linearPrediction(points, monthIndex(month)))}))};
  }
  assert([...support.map(row => row.month), ...months].every(month => /-(03|06|09|12)$/.test(month)), 'Quarterly survey months required');
  // Native survey OLS uses quarters centered at the latest released wave.
  const latest = monthIndex(support.at(-1).month);
  const points = support.map(row => ({x: (monthIndex(row.month) - latest) / 3, y: row.value}));
  return {...envelope, status: 'predicted', reasons: [], audit, predictions: months.map(month => ({month,
    'last-wave': support.at(-1).value, 'recent-mean-3': recent,
    'linear-trend': Math.max(0, Math.min(100, linearPrediction(points, (monthIndex(month) - latest) / 3)))}))};
}

export function baselineBatch(input) {
  assert(input && Array.isArray(input.cases), 'Expected cases array');
  const ids = new Set();
  return {rows: input.cases.map(row => {
    assert(typeof row.id === 'string' && row.id.length > 0 && !ids.has(row.id), 'Unique nonempty case IDs required');
    ids.add(row.id);
    return {id: row.id, forecast: forecastBaseline(row)};
  })};
}

// Importing is inert; the executable reads one JSON batch and writes one JSON result.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(baselineBatch(JSON.parse(readFileSync(0, 'utf8')))) + '\n');
}
