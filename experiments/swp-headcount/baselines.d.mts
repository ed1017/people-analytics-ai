export function predict(model: 'last-value'|'drift'|'seasonal-naive'|'linear-trend', train: readonly number[], horizon?: number): number[];
