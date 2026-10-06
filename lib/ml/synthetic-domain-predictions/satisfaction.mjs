import { assertSnapshot } from './boundary.mjs';

const METHODS = ['last-wave', 'recent-mean-3', 'linear-trend-8'];
const IDENTITY = ['instrumentVersion', 'itemSetVersion', 'scoringVersion', 'eligibilityVersion', 'populationVersion', 'sourceKind', 'responseUnit'];
const monthIndex = month => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
const quarterMonth = month => typeof month === 'string' && /^\d{4}-(03|06|09|12)$/.test(month);
const score = value => Number.isFinite(value) && value >= 0 && value <= 100;
const identityOf = value => Object.fromEntries(IDENTITY.map(key => [key, value[key]]));
const sameIdentity = (a, b) => IDENTITY.every(key => a[key] === b[key]);
const validIdentity = value => IDENTITY.every(key => typeof value[key] === 'string' && value[key].length > 0)
  && value.sourceKind === 'employee-wave' && value.responseUnit === 'mean-respondent-favorable-answer-share';
const clamp = value => Math.max(0, Math.min(100, value));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const monthOf = row => row.effectiveAt.slice(0, 7);
const validWave = row => quarterMonth(monthOf(row)) && row.value.closeAt === row.effectiveAt
  && validIdentity(row.value) && row.status === 'complete' && score(row.value.scorePct)
  && Number.isSafeInteger(row.value.respondents) && row.value.respondents > 0
  && Number.isSafeInteger(row.value.eligible) && row.value.eligible >= row.value.respondents;

/** Fixed quarterly forecasts use only simulated releases selected by replaySynthetic. */
export function forecastSatisfaction(snapshot, months) {
  assertSnapshot(snapshot, 'satisfaction');
  const rows = [...snapshot.records].sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt));
  const support = rows.slice(-8);
  const audit = {
    cutoff: snapshot.cutoff, availableWaves: rows.length, requiredConsecutiveWaves: 8,
    completeWaves: rows.filter(row => row.status === 'complete').length,
    withheldWaves: rows.filter(row => row.status !== 'complete').length,
    support: support.map(row => ({month: monthOf(row), revision: row.revision, status: row.status,
      simulatedAvailableAt: row.simulatedAvailableAt, eligible: row.value.eligible, respondents: row.value.respondents})),
    responseUnit: 'mean-respondent-favorable-answer-share',
    targetAssumption: 'Continuation of latest observed instrument, item set, scoring, eligibility and population.',
    pooling: 'Each complete quarterly wave has equal weight; respondents are not pooled across waves.',
  };
  const blocked = reason => ({status: 'blocked', reasons: [reason], predictions: [], audit, interval: null, operationallyQualified: false});
  if (!Array.isArray(months) || months.length === 0 || new Set(months).size !== months.length
    || months.some(month => !quarterMonth(month) || monthIndex(month) <= monthIndex(snapshot.cutoff.slice(0, 7)))) return blocked('invalid-future-quarter-targets');
  if (support.length < 8) return blocked('insufficient-quarterly-history');
  if (new Set(rows.map(monthOf)).size !== rows.length) return blocked('duplicate-wave-month');
  if (!support.every(validWave)) return blocked('incomplete-or-invalid-quarterly-wave');
  if (support.some((row, index) => index > 0 && monthIndex(monthOf(row)) - monthIndex(monthOf(support[index - 1])) !== 3)) return blocked('nonconsecutive-quarterly-history');
  const identity = identityOf(support.at(-1).value);
  if (!support.every(row => sameIdentity(row.value, identity))) return blocked('incomparable-wave-history');
  const latestIndex = monthIndex(monthOf(support.at(-1)));
  const xs = support.map(row => (monthIndex(monthOf(row)) - latestIndex) / 3);
  const ys = support.map(row => row.value.scorePct);
  const xMean = mean(xs), yMean = mean(ys);
  const slope = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0)
    / xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  return {status: 'predicted', reasons: [], predictions: months.map(month => ({month,
    'last-wave': ys.at(-1), 'recent-mean-3': mean(ys.slice(-3)),
    'linear-trend-8': clamp(yMean + slope * ((monthIndex(month) - latestIndex) / 3 - xMean)), identity: {...identity}})),
  audit, interval: null, operationallyQualified: false};
}

/** Labels are scored only if their published wave still matches the forecast's identity. */
export function scoreSatisfaction(finalReplay, predictions) {
  assertSnapshot(finalReplay, 'satisfaction');
  const blocked = reason => ({status: 'blocked', reasons: [reason], methods: {}, interval: null, operationallyQualified: false});
  if (!Array.isArray(predictions) || predictions.length === 0 || new Set(predictions.map(row => row.month)).size !== predictions.length
    || predictions.some(row => !quarterMonth(row.month) || !row.identity || !validIdentity(row.identity) || METHODS.some(method => !score(row[method])))) return blocked('invalid-predictions');
  const labels = [];
  for (const prediction of predictions) {
    const matches = finalReplay.records.filter(row => monthOf(row) === prediction.month);
    if (matches.length !== 1 || !validWave(matches[0])) return blocked('missing-or-incomplete-score-label');
    if (!sameIdentity(prediction.identity, matches[0].value)) return blocked('future-wave-identity-mismatch');
    labels.push(matches[0].value.scorePct);
  }
  return {status: 'scored', reasons: [], methods: Object.fromEntries(METHODS.map(method => {
    const errors = predictions.map((row, index) => row[method] - labels[index]);
    return [method, {n: errors.length, mae: mean(errors.map(Math.abs)), rmse: Math.sqrt(mean(errors.map(error => error ** 2)))}];
  })), interval: null, operationallyQualified: false};
}
