/** Aggregate-only display contract. No model context, source reads or release authority. */
export type PerformanceFilters = { country: string; org: string; level: string };
export type WorkforcePerformance = {
  source: 'employee_snapshots.performance_rating';
  snapshotDate: '2026-09-30';
  reviewPeriod: '2026 YTD';
  periodKind: 'ytd';
  filters: PerformanceFilters;
  status: 'available' | 'suppressed' | 'unavailable';
  counts: { population: number; ratings: number[]; notRated: number; unavailable: number } | null;
};
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
/** Reject stale scopes and malformed/small-cell aggregates. Server release review remains mandatory. */
export function resolveWorkforcePerformance(value: unknown, filters: PerformanceFilters, population?: number | null): WorkforcePerformance | null {
  if (!record(value) || !keys(value, ['source', 'snapshotDate', 'reviewPeriod', 'periodKind', 'filters', 'status', 'counts']) || value.source !== 'employee_snapshots.performance_rating' || value.snapshotDate !== '2026-09-30' || value.reviewPeriod !== '2026 YTD' || value.periodKind !== 'ytd' || !record(value.filters) || !keys(value.filters, ['country','org','level']) || Object.entries(filters).some(([key,item]) => value.filters && (value.filters as Record<string,unknown>)[key] !== item)) return null;
  if (value.status === 'unavailable' || value.status === 'suppressed') return value.counts === null ? value as WorkforcePerformance : null;
  const c = value.counts;
  if (value.status !== 'available' || !record(c) || !keys(c, ['population','ratings','notRated','unavailable']) || !count(c.population) || c.population < 10 || population !== undefined && c.population !== population || !count(c.notRated) || !count(c.unavailable) || !Array.isArray(c.ratings) || c.ratings.length !== 5 || !c.ratings.every(count)) return null;
  if ([...c.ratings, c.notRated, c.unavailable].some(n => n > 0 && n < 10) || c.ratings.reduce((a,b)=>a+b,0) + c.notRated + c.unavailable !== c.population) return null;
  return value as WorkforcePerformance;
}
