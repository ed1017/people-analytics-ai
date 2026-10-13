// Offline aggregate experiment only. Predictions remain unrounded expected stocks.
export const protocol = Object.freeze({
  version: 1, classification: 'conditional retrospective',
  trainingMonths: 12, horizonMonths: 6, holdoutMonths: 6,
  models: ['last-value', 'drift', 'seasonal-naive', 'linear-trend'],
  primaryMetric: 'MAE across 10 origins × 6 horizons, equally weighted',
  selection: 'Choose simplest model in listed order within 1% of minimum development MAE.',
  simplicityTolerance: 0.01,
  furtherWork: 'Exploratory only: selected development MAE at least 10% below last-value, strictly better at >=6/10 origins, and holdout MAE no worse than last-value. These are prespecified heuristics, not business acceptance or significance tests.',
  intervals: false, operationalForecast: false,
});

export function predict(model, train, horizon = 6) {
  if (!protocol.models.includes(model) || train.length < 12 || !Number.isSafeInteger(horizon) || horizon < 1 || horizon > 12 || train.some(v => !Number.isFinite(v) || v < 0)) throw Error('Invalid model, training values or horizon.');
  const n = train.length, last = train[n - 1];
  let slope = 0, intercept = last;
  if (model === 'drift') slope = (last - train[0]) / (n - 1);
  if (model === 'linear-trend') {
    const meanX = (n - 1) / 2, meanY = train.reduce((a, b) => a + b, 0) / n;
    const denominator = train.reduce((a, _, i) => a + (i - meanX) ** 2, 0);
    slope = train.reduce((a, y, i) => a + (i - meanX) * (y - meanY), 0) / denominator;
    intercept = meanY - slope * meanX;
  }
  return Array.from({length: horizon}, (_, i) => Math.max(0,
    model === 'seasonal-naive' ? train[n - 12 + i] :
    model === 'linear-trend' ? intercept + slope * (n + i) : last + slope * (i + 1)));
}

export function errors(rows) {
  if (!rows.length) throw Error('Empty evaluation.');
  const residuals = rows.map(r => r.prediction - r.actual);
  return {n: rows.length, mae: residuals.reduce((s, e) => s + Math.abs(e), 0) / rows.length,
    rmse: Math.sqrt(residuals.reduce((s, e) => s + e * e, 0) / rows.length),
    bias: residuals.reduce((s, e) => s + e, 0) / rows.length};
}

export function evaluate(points, windows) {
  const byModel = {};
  for (const model of protocol.models) {
    const rows = windows.flatMap(w => {
      const end = points.findIndex(p => p.month === w.origin);
      if (end < 11) throw Error('Invalid origin.');
      const train = points.slice(0, end + 1).map(p => p.value);
      const predicted = predict(model, train, w.targets.length);
      return w.targets.map((month, h) => {
        const target = points[end + 1 + h];
        if (!target || target.month !== month) throw Error('Nonconsecutive target.');
        return {origin: w.origin, month, horizon: h + 1, actual: target.value, prediction: predicted[h]};
      });
    });
    byModel[model] = {overall: errors(rows),
      byHorizon: Array.from({length: 6}, (_, i) => ({horizon: i + 1, ...errors(rows.filter(r => r.horizon === i + 1))})),
      byOrigin: windows.map(w => ({origin: w.origin, ...errors(rows.filter(r => r.origin === w.origin))})), rows};
  }
  return byModel;
}

export function select(results) {
  const minimum = Math.min(...protocol.models.map(m => results[m].overall.mae));
  return protocol.models.find(m => results[m].overall.mae <= minimum * (1 + protocol.simplicityTolerance));
}
