/** Invented policy assumptions, independent of labor cost and public wage data. */
export const RANGE_POLICY = {
  version: 'synthetic-existing-jobs-v1',
  provenance: 'synthetic_assumed_range',
  currency: 'USD', basis: 'annual_base_1_fte',
  effectiveFrom: '2026-09-30', effectiveTo: '2027-09-30',
} as const;

export type RangeCatalog = {
  jobs: {job_profile_code: string; job_profile_name: string}[];
  levels: {level_code: string; level_rank: number}[];
  combinations: {org_code: string; job_profile_code: string; level_code: string}[];
};
export type RangeScope = {country: string; org: string; level: string};
export const defaultRangeScope: RangeScope = {country: 'all', org: 'all', level: 'all'};
export type DemoRange = ReturnType<typeof makeDemoRange>;

export function makeDemoRange(job: string, level: string, rank: number, country: string) {
  if (!job || !level || !country || !Number.isFinite(rank) || rank < 0) throw Error('Invalid range dimensions');
  // A stable, arbitrary job seed; rank is the existing catalog rank, not a market mapping.
  const seed = Array.from(job).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 11;
  const midpoint = 50000 + seed * 2500 + rank * 10000;
  return {...RANGE_POLICY, job, level, country, minimum: midpoint * .8, midpoint, maximum: midpoint * 1.2};
}

export function rangesForScope(catalog: RangeCatalog, scope: RangeScope) {
  return catalog.jobs.flatMap(job => {
    const levels = catalog.levels.filter(level =>
      (scope.level === 'all' || scope.level === level.level_code) &&
      (scope.org === 'all' || catalog.combinations.some(row => row.org_code === scope.org && row.job_profile_code === job.job_profile_code && row.level_code === level.level_code)));
    return levels.map(level => ({...makeDemoRange(job.job_profile_code, level.level_code, level.level_rank, scope.country === 'all' ? 'GLOBAL' : scope.country), name: job.job_profile_name}));
  });
}

/** Server/offline inputs only. Never add employee records to a browser response. */
export type QualifiedBasePay = {
  id: string; job: string; level: string; country: string; currency: string;
  date: string; basis: string; annualContractedBase: number | null; fte: number | null; active: boolean;
};
export type JobCompa = {job: string; status: 'published' | 'suppressed' | 'unavailable'; meanPct: number | null; eligible: number | null; missing: number | null; coveragePct: number | null};

/** Arithmetic mean of individually matched ratios. Publication still requires a reviewed disclosure policy. */
export function aggregateJobCompa(records: QualifiedBasePay[], ranges: DemoRange[], snapshotDate = '2026-09-30'): JobCompa[] {
  if (new Set(records.map(row => row.id)).size !== records.length) throw Error('Duplicate person in snapshot');
  return [...new Set(records.map(row => row.job))].sort().map(job => {
    const population = records.filter(row => row.job === job && row.active);
    const ratios = population.flatMap(row => {
      const matches = ranges.filter(range => range.job === row.job && range.level === row.level && range.country === row.country && range.currency === row.currency && range.basis === 'annual_base_1_fte' && range.effectiveFrom <= row.date && row.date < range.effectiveTo);
      const band = matches[0];
      if (matches.length !== 1 || row.date !== snapshotDate || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date || row.basis !== 'annual_contracted_base' || typeof row.annualContractedBase !== 'number' || !Number.isFinite(row.annualContractedBase) || row.annualContractedBase <= 0 || typeof row.fte !== 'number' || !Number.isFinite(row.fte) || row.fte <= 0 || row.fte > 1 || ![band.minimum, band.midpoint, band.maximum].every(Number.isFinite) || band.minimum <= 0 || band.minimum > band.midpoint || band.midpoint > band.maximum) return [];
      const ratio = row.annualContractedBase / row.fte / band.midpoint * 100;
      return Number.isFinite(ratio) ? [ratio] : [];
    });
    const missing = population.length - ratios.length;
    // Conservative suppression also withholds small excluded cells and their reconstructing metrics.
    if (ratios.length < 5 || (missing > 0 && missing < 5)) return {job, status: ratios.length === 0 ? 'unavailable' : 'suppressed', meanPct: null, eligible: null, missing: null, coveragePct: null};
    return {job, status: 'published', meanPct: ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length, eligible: ratios.length, missing, coveragePct: ratios.length / population.length * 100};
  });
}
