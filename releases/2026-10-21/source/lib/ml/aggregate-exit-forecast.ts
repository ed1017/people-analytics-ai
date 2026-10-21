/** Offline, Node-only retrospective synthetic count demonstration. No transport or product caller. */
import { createHash } from 'node:crypto';
import type { NumericErrorSummary, PredictiveEvaluationEvidence, PredictionUncertainty } from './predictive-evidence';

type Month = {
  month: string;
  voluntaryExits: number;
  totalExits: number;
  firstEvent: string | null;
  lastEvent: string | null;
  monthEndHeadcount: number;
  snapshotDate: string;
};
type Manifest = {
  source: 'public.attrition_monthly_trend';
  extractedOn: string;
  provenance: 'user-declared-synthetic';
  population: 'all-recorded-voluntary-separations';
  sourceDefinitionVersion: string;
  sourceInsertedAt: string;
  completionEvidence: 'calendar-boundaries-only';
  vintageHistory: false;
  denominatorBasis: 'month-end-stock-only';
  generatorVersion: null;
};
type Dataset = { schemaVersion: 1; manifest: Manifest; months: Month[] };
type Method = 'recent-mean-3' | 'seasonal-naive-12' | 'simple-exponential-smoothing';
type HistoryWindow = 'last-12-months' | 'last-24-months' | 'all-available';
type Point = { month: string; horizon: number; expectedExits: number };
type ErrorPoint = Point & { actualExits: number; error: number };
const methods: Method[] = ['recent-mean-3', 'seasonal-naive-12', 'simple-exponential-smoothing'];
const alphaGrid = [0.2, 0.5, 0.8] as const;
const minimumTrainingMonths = 12; // Exact calendar lag required by seasonal naive, not an adequacy claim.
const comparisonOriginMinimumMonths = 24; // Allows the requested 24-month comparator on identical origins.
const historyWindows: HistoryWindow[] = ['last-12-months', 'last-24-months', 'all-available'];
const horizonMonths = 3;
const methodVersion = 'aggregate-exit-demo-v1';
const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const mean = (values: readonly number[]) => sum(values) / values.length;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function exactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected an aggregate object.');
  requireValue(Object.getPrototypeOf(value) === Object.prototype, 'Only plain aggregate objects are accepted.');
  const entries = Object.getOwnPropertyDescriptors(value);
  requireValue(Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(entries, key)), 'Missing or unexpected aggregate fields.');
  requireValue(Object.values(entries).every(entry => 'value' in entry && entry.enumerable), 'Aggregate fields must be plain values.');
  return value as Record<string, unknown>;
}
function validDate(value: unknown): asserts value is string {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Invalid calendar date.');
  const time = Date.parse(value + 'T00:00:00.000Z');
  requireValue(Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value, 'Invalid calendar date.');
}
function monthIndex(value: unknown): number {
  requireValue(typeof value === 'string' && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value), 'Invalid calendar month.');
  const [year, month] = value.split('-').map(Number);
  return year * 12 + month - 1;
}
function shiftMonth(value: string, offset: number) {
  const index = monthIndex(value) + offset;
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
}
function endOfMonth(value: string) {
  return new Date(Date.parse(shiftMonth(value, 1) + '-01T00:00:00.000Z') - 86400000).toISOString().slice(0, 10);
}
function count(value: unknown, positive = false): asserts value is number {
  requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value >= (positive ? 1 : 0) && value <= 1000000, 'Invalid aggregate count.');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function validate(raw: unknown): Dataset {
  const root = exactObject(raw, ['schemaVersion', 'manifest', 'months']);
  requireValue(root.schemaVersion === 1, 'Unsupported dataset version.');
  const m = exactObject(root.manifest, ['source', 'extractedOn', 'provenance', 'population', 'sourceDefinitionVersion', 'sourceInsertedAt', 'completionEvidence', 'vintageHistory', 'denominatorBasis', 'generatorVersion']);
  requireValue(m.source === 'public.attrition_monthly_trend' && m.provenance === 'user-declared-synthetic' && m.population === 'all-recorded-voluntary-separations', 'Only the declared synthetic aggregate population is supported.');
  requireValue(m.completionEvidence === 'calendar-boundaries-only' && m.vintageHistory === false && m.denominatorBasis === 'month-end-stock-only' && m.generatorVersion === null, 'Unsupported qualification declaration.');
  validDate(m.extractedOn);
  requireValue(typeof m.sourceDefinitionVersion === 'string' && /^inspected-\d{4}-\d{2}-\d{2}$/.test(m.sourceDefinitionVersion), 'Missing inspected source definition.');
  const inspectedOn = m.sourceDefinitionVersion.slice(10);
  validDate(inspectedOn);
  requireValue(inspectedOn <= m.extractedOn, 'Source inspection is after extraction.');
  requireValue(typeof m.sourceInsertedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(m.sourceInsertedAt), 'Invalid source insertion timestamp.');
  requireValue(Number.isFinite(Date.parse(m.sourceInsertedAt)) && new Date(m.sourceInsertedAt).toISOString() === m.sourceInsertedAt && m.sourceInsertedAt.slice(0, 10) <= m.extractedOn, 'Source insertion is invalid or after extraction.');
  requireValue(Array.isArray(root.months) && root.months.length >= 32 && root.months.length <= 120, 'Expected 32–120 aggregate calendar months.');
  const monthDescriptors = Object.getOwnPropertyDescriptors(root.months);
  requireValue(Object.getPrototypeOf(root.months) === Array.prototype && Reflect.ownKeys(root.months).length === root.months.length + 1, 'Expected a dense plain month array without extra fields.');
  for (let i = 0; i < root.months.length; i++) {
    const descriptor = monthDescriptors[String(i)];
    requireValue(descriptor && 'value' in descriptor && descriptor.enumerable, 'Month array entries must be plain values.');
  }
  // Canonical copies prevent mutation, accessors and property ordering from changing identity.
  const months = root.months.map(value => {
    const row = exactObject(value, ['month', 'voluntaryExits', 'totalExits', 'firstEvent', 'lastEvent', 'monthEndHeadcount', 'snapshotDate']);
    monthIndex(row.month);
    const month = row.month as string;
    count(row.voluntaryExits); count(row.totalExits); count(row.monthEndHeadcount, true);
    requireValue(row.voluntaryExits <= row.totalExits, 'Voluntary exits exceed total exits.');
    validDate(row.snapshotDate);
    requireValue(row.snapshotDate === endOfMonth(month) && row.snapshotDate <= (m.extractedOn as string), 'Incomplete or future snapshot month.');
    if (row.totalExits === 0) {
      requireValue(row.firstEvent === null && row.lastEvent === null, 'Empty event month has contradictory date evidence.');
    } else {
      requireValue(row.totalExits >= 2, 'One event cannot establish two distinct calendar boundaries.');
      validDate(row.firstEvent); validDate(row.lastEvent);
      requireValue(row.firstEvent === month + '-01' && row.lastEvent === endOfMonth(month), 'Missing calendar-boundary event evidence; completeness cannot be assumed for this demo.');
    }
    return { month, voluntaryExits: row.voluntaryExits, totalExits: row.totalExits, firstEvent: row.firstEvent as string | null, lastEvent: row.lastEvent as string | null, monthEndHeadcount: row.monthEndHeadcount, snapshotDate: row.snapshotDate };
  }).sort((a, b) => a.month.localeCompare(b.month));
  for (let i = 1; i < months.length; i++) {
    requireValue(monthIndex(months[i].month) === monthIndex(months[i - 1].month) + 1, 'Duplicate or missing calendar months.');
  }
  return {
    schemaVersion: 1,
    manifest: { source: m.source, extractedOn: m.extractedOn, provenance: m.provenance, population: m.population, sourceDefinitionVersion: m.sourceDefinitionVersion, sourceInsertedAt: m.sourceInsertedAt, completionEvidence: m.completionEvidence, vintageHistory: m.vintageHistory, denominatorBasis: m.denominatorBasis, generatorVersion: m.generatorVersion } as Manifest,
    months,
  };
}

function fit(history: readonly Month[], method: Method, historyWindow: HistoryWindow = 'all-available') {
  const requestedMonths = historyWindow === 'last-12-months' ? 12 : historyWindow === 'last-24-months' ? 24 : history.length;
  requireValue(history.length >= requestedMonths, 'Requested history window is unavailable.');
  const train = history.slice(-requestedMonths);
  requireValue(train.length >= minimumTrainingMonths, 'Insufficient training history.');
  const values = train.map(row => row.voluntaryExits);
  let alpha: number | null = null;
  let level = mean(values.slice(-3));
  if (method === 'simple-exponential-smoothing') {
    // First count initializes the level; each alpha is fitted using training-only one-step SSE.
    let bestSse = Infinity;
    for (const candidate of alphaGrid) {
      let candidateLevel = values[0];
      let sse = 0;
      for (const value of values.slice(1)) {
        sse += (value - candidateLevel) ** 2;
        candidateLevel = candidate * value + (1 - candidate) * candidateLevel;
      }
      if (sse < bestSse) { bestSse = sse; alpha = candidate; level = candidateLevel; }
    }
  }
  const origin = train.at(-1)!.month;
  const points = Array.from({ length: horizonMonths }, (_, i): Point => {
    const month = shiftMonth(origin, i + 1);
    const expectedExits = method === 'seasonal-naive-12'
      ? train.find(row => row.month === shiftMonth(month, -12))!.voluntaryExits
      : level;
    return { month, horizon: i + 1, expectedExits };
  });
  return { method, historyWindow, origin, trainStart: train[0].month, trainMonths: train.length,
    effectiveLookbackMonths: method === 'recent-mean-3' ? 3 : method === 'seasonal-naive-12' ? 12 : train.length,
    alpha, points, expectedTotal: sum(points.map(point => point.expectedExits)) };
}
function metrics(errors: readonly number[]): NumericErrorSummary {
  return { count: errors.length, mae: mean(errors.map(Math.abs)), rmse: Math.sqrt(mean(errors.map(error => error ** 2))), bias: mean(errors) };
}
function fold(rows: readonly Month[], trainingCount: number, method: Method, historyWindow: HistoryWindow = 'all-available') {
  const prediction = fit(rows.slice(0, trainingCount), method, historyWindow);
  const points: ErrorPoint[] = prediction.points.map((point, i) => {
    const actual = rows[trainingCount + i];
    requireValue(actual?.month === point.month, 'Backtest target alignment failed.');
    return { ...point, actualExits: actual.voluntaryExits, error: point.expectedExits - actual.voluntaryExits };
  });
  const actualTotal = sum(points.map(point => point.actualExits));
  return { ...prediction, points, actualTotal, totalError: prediction.expectedTotal - actualTotal };
}
function summarize(folds: ReturnType<typeof fold>[]) {
  const points = folds.flatMap(item => item.points);
  return {
    origins: folds.length,
    distinctTargetMonths: new Set(points.map(point => point.month)).size,
    overall: metrics(points.map(point => point.error)),
    byHorizon: [1, 2, 3].map(horizon => ({ horizon, ...metrics(points.filter(point => point.horizon === horizon).map(point => point.error)) })),
    threeMonthTotal: metrics(folds.map(item => item.totalError)),
  };
}

/**
 * This intentionally cannot certify source completeness, vintage availability or model efficacy.
 * The only input is a bounded, reviewed aggregate extract. No employee features or LLM inputs.
 */
export function evaluateAggregateExitDemo(raw: unknown) {
  const dataset = validate(raw);
  const firstEventIndex = dataset.months.findIndex(row => row.totalExits > 0);
  requireValue(firstEventIndex >= 0, 'No event-bearing calendar history.');
  const excluded = dataset.months.slice(0, firstEventIndex).map(row => ({ month: row.month, reason: 'unverified-join-zero' }));
  const rows = dataset.months.slice(firstEventIndex);
  requireValue(rows.every(row => row.totalExits > 0), 'Interior or trailing empty event month is unknown, not a verified zero.');
  requireValue(rows.length >= 32, 'This paired 12/24/all-window protocol needs 32 event-bearing months for three common development origins and final assessment; this is not a statistical adequacy gate.');
  const origin = rows.at(-1)!.month;
  requireValue(origin.endsWith('-09'), 'This bounded demonstration forecasts October–December from a September origin.');
  const holdoutTrainingCount = rows.length - horizonMonths;
  const developmentTrainingCounts = Array.from({ length: rows.length - 2 * horizonMonths - comparisonOriginMinimumMonths + 1 }, (_, i) => comparisonOriginMinimumMonths + i);
  const protocol = {
    methodVersion, minimumTrainingMonths, comparisonOriginMinimumMonths, horizonMonths, methods: [...methods], alphaGrid: [...alphaGrid],
    historyWindows: [...historyWindows],
    historyComparison: 'Paired retrospective 12/24/all sensitivity; no window selection using the already-visible assessment. Main selection retains all-available candidate fit and fixed-lookback baselines.',
    candidateFit: 'Training-only one-step SSE; lowest alpha wins exact ties; first training count initializes level.',
    selection: 'Development-only monthly MAE; candidate requires at least 10% improvement against each baseline; baseline ties favor recent mean.',
    assessment: 'Final chronological three-month block is excluded from fitting and selection at its origin; visible during source qualification, not an untouched confirmatory holdout.',
    developmentOrigins: developmentTrainingCounts.map(n => rows[n - 1].month),
    holdoutOrigin: rows[holdoutTrainingCount - 1].month,
    forecastOrigin: origin,
  };
  const development = methods.map(method => {
    const folds = developmentTrainingCounts.map(n => fold(rows, n, method));
    return { method, folds, metrics: summarize(folds) };
  });
  const [recent, seasonal, candidate] = development;
  const candidateSelected = [recent, seasonal].every(baseline => candidate.metrics.overall.mae < baseline.metrics.overall.mae && candidate.metrics.overall.mae <= baseline.metrics.overall.mae * 0.9);
  const selectedMethod = candidateSelected ? candidate.method : seasonal.metrics.overall.mae < recent.metrics.overall.mae ? seasonal.method : recent.method;
  // Selection above cannot read final-block errors; changing that block cannot change selection.
  const holdout = methods.map(method => {
    const result = fold(rows, holdoutTrainingCount, method);
    return { method, fold: result, metrics: summarize([result]) };
  });
  const forecastComparisons = methods.map(method => fit(rows, method));
  const historyWindowComparisons = historyWindows.map(historyWindow => ({
    historyWindow,
    development: historyWindow === 'all-available' ? development : methods.map(method => {
      const folds = developmentTrainingCounts.map(n => fold(rows, n, method, historyWindow));
      return { method, folds, metrics: summarize(folds) };
    }),
    assessment: historyWindow === 'all-available' ? holdout : methods.map(method => {
      const result = fold(rows, holdoutTrainingCount, method, historyWindow);
      return { method, fold: result, metrics: summarize([result]) };
    }),
    forecasts: historyWindow === 'all-available' ? forecastComparisons : methods.map(method => fit(rows, method, historyWindow)),
  }));
  const forecast = forecastComparisons.find(item => item.method === selectedMethod)!;
  const year = origin.slice(0, 4);
  const ytd = rows.filter(row => row.month.startsWith(year + '-'));
  requireValue(ytd.length === 9 && ytd[0].month === year + '-01', 'Year-to-date count history is incomplete.');
  const observedYtdExits = sum(ytd.map(row => row.voluntaryExits));
  const uncertainty = {
    status: 'unavailable',
    interval: null,
    reason: 'Insufficient independent calibration and no verified stochastic generator or historical vintages. Overlapping backtest errors do not establish coverage.',
  } satisfies PredictionUncertainty;
  const datasetFingerprint = digest(dataset), protocolFingerprint = digest(protocol);
  const evidence = {
    domain: 'voluntary-exits', target: 'Monthly company-wide recorded voluntary separation events', unit: 'events',
    provenance: {
      sources: [dataset.manifest.source], sourceDefinitionVersion: dataset.manifest.sourceDefinitionVersion,
      extractedOn: dataset.manifest.extractedOn, population: dataset.manifest.population,
      dataClass: dataset.manifest.provenance, completeness: 'unverified', temporalAvailability: 'retrospective-final-data',
      generatorVersion: null, datasetFingerprint, exposureDefinition: null,
    },
    methods: methods.map(id => ({ id, kind: id === 'simple-exponential-smoothing' ? 'fitted-statistical-model' as const : 'baseline' as const,
      fitting: id === 'simple-exponential-smoothing' ? 'Training-only SSE chooses smoothing parameter and fits level.' : 'Fixed recent-mean or same-month-prior-year rule; no fitted candidate parameters.' })),
    evaluation: {
      basis: 'retrospective-final-data', protocolVersion: methodVersion, protocolFingerprint,
      selectionUsesAssessmentOutcomes: false, assessmentCustody: 'not-untouched',
      realWorldPerformanceValidated: false, deploymentValidated: false,
    },
    uncertainty,
  } satisfies PredictiveEvaluationEvidence;
  return freeze({
    schemaVersion: 1,
    reportType: 'aggregate-voluntary-exit-synthetic-demo',
    status: 'conditional-retrospective-synthetic-demo',
    datasetFingerprint, protocolFingerprint, evidence,
    qualification: {
      manifest: dataset.manifest,
      extractedMonths: dataset.months.length, usableMonths: rows.length,
      historyStart: rows[0].month, historyEnd: origin, excluded,
      countForecastQualified: false, rateForecastQualified: false, pointInTimeValidated: false,
      completenessVerified: false, generatorProvenanceVerified: false,
      assumptions: ['Included recorded counts are treated as complete solely for this retrospective synthetic demonstration.', 'Future counts follow a similar process to these synthetic monthly aggregates.'],
      blockers: ['No source completion watermark or versioned generator.', 'History loaded retrospectively; no as-known-at-origin vintages.', 'Month-end headcount is a stock, not average at-risk exposure; future exposure is unknown.'],
    },
    protocol, development,
    selection: { method: selectedMethod, candidateSelected, basis: 'development-only-monthly-mae' },
    holdout, forecastComparisons, historyWindowComparisons,
    forecast: { ...forecast, observedYtdExits, expectedYearEndExits: observedYtdExits + forecast.expectedTotal, uncertainty, rate: null },
    limitations: [
      'Synthetic retrospective demonstration only; no real-world predictive accuracy, causal retention effect or personnel scoring.',
      'Calendar-boundary events and month-end snapshots do not prove source completeness.',
      'All methods use the same monthly labels and horizons. Overlapping origins are dependent; metrics are descriptive.',
      'The assessment block was visible during qualification. It is temporally excluded by code, not a preregistered untouched holdout.',
      'Model disagreement is not a confidence interval. No probability or calibrated uncertainty is claimed.',
      'Counts use the changing company-wide recorded population; no individual risk or turnover-rate interpretation.',
    ],
    productIntegrationEnabled: false,
  });
}
