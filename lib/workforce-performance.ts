/** Display contract for the frozen aggregate release; never individual snapshot ratings. */
export type PerformanceFilters = { country: string; org: string; level: string };
export const PERFORMANCE_VERSION = 'workforce-performance-2026-ytd-bu-v1';
export const PERFORMANCE_DIGEST = '191ff33a4dd66c0e6484627441928a77fbb3ef883b428261964d768a65e9535c';
export const PERFORMANCE_BUS = ['BU-CLIENTOPS', 'BU-CONS', 'BU-CORP', 'BU-DATAAI', 'BU-DIGITAL', 'BU-MGSVC', 'BU-SALES', 'BU-TECH'] as const;
export type WorkforcePerformance = {
  version: typeof PERFORMANCE_VERSION;
  source: 'employee_snapshots JOIN performance_reviews';
  snapshotDate: '2026-09-30';
  reviewPeriod: '2026 YTD';
  filters: PerformanceFilters;
  status: 'available';
  availabilityKind: 'simulated_convention';
  simulatedAvailableAt: '2026-09-30T23:59:59.999Z';
  originalAvailableAt: null;
  contentDigest: typeof PERFORMANCE_DIGEST;
  counts: { population: number; rated: number; ratings: number[]; notRated: null; notRatedStatus: 'not_collected'; unavailable: 0 };
};
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export function supportsPerformanceFilters(filters: PerformanceFilters) {
  return filters.country === 'all' && filters.level === 'all' && (filters.org === 'all' || PERFORMANCE_BUS.some(bu => bu === filters.org));
}
/** Reject duplicate/unknown parameters before any aggregate release lookup. */
export function parsePerformanceFilters(params: URLSearchParams): PerformanceFilters | null {
  if ([...params.keys()].some(key => !['country', 'org', 'level'].includes(key) || params.getAll(key).length !== 1)) return null;
  const filters = { country: params.get('country') ?? 'all', org: params.get('org') ?? 'all', level: params.get('level') ?? 'all' };
  return Object.values(filters).every(value => value.length > 0 && value.length <= 80 && /^[\w-]+$/.test(value)) ? filters : null;
}
/** Local normalized display shape. A staged-RPC wire adapter still needs its exact payload definition.
 * Projection prevents additional response fields reaching the browser. A row validator cannot prove
 * the global nine-row gate: that remains the frozen database release's responsibility.
 */
export function resolveWorkforcePerformance(value: unknown, filters: PerformanceFilters, population?: number | null): WorkforcePerformance | null {
  if (!supportsPerformanceFilters(filters) || !record(value) || value.status !== 'available' || value.active === false || value.version !== PERFORMANCE_VERSION || value.contentDigest !== PERFORMANCE_DIGEST || value.source !== 'employee_snapshots JOIN performance_reviews' || value.snapshotDate !== '2026-09-30' || value.reviewPeriod !== '2026 YTD' || value.availabilityKind !== 'simulated_convention' || value.simulatedAvailableAt !== '2026-09-30T23:59:59.999Z' || value.originalAvailableAt !== null || !record(value.filters) || !keys(value.filters, ['country', 'org', 'level']) || Object.entries(filters).some(([key, item]) => (value.filters as Record<string, unknown>)[key] !== item)) return null;
  const c = value.counts;
  if (!record(c) || !keys(c, ['population', 'rated', 'ratings', 'notRated', 'notRatedStatus', 'unavailable']) || !count(c.population) || !count(c.rated) || c.rated !== c.population || c.notRated !== null || c.notRatedStatus !== 'not_collected' || c.unavailable !== 0 || population !== undefined && c.population !== population || !Array.isArray(c.ratings) || c.ratings.length !== 5 || !c.ratings.every(count)) return null;
  const ratings: number[] = c.ratings;
  if (ratings.some(n => n < 10 || (c.population as number) - n < 10) || ratings.reduce((a,b) => a+b,0) !== c.population) return null;
  if (filters.org === 'all' && (c.population !== 10000 || ratings.some((n,i) => n !== [400,1200,5200,2600,600][i]))) return null;
  return { version: PERFORMANCE_VERSION, source: 'employee_snapshots JOIN performance_reviews', snapshotDate: '2026-09-30', reviewPeriod: '2026 YTD', filters: { ...filters }, status: 'available', availabilityKind: 'simulated_convention', simulatedAvailableAt: '2026-09-30T23:59:59.999Z', originalAvailableAt: null, contentDigest: PERFORMANCE_DIGEST, counts: { population: c.population, rated: c.rated, ratings: [...ratings], notRated: null, notRatedStatus: 'not_collected', unavailable: 0 } };
}
