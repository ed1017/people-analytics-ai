import manifest from './data/compensation-release-v1.json' with {type: 'json'};
export const compensationRelease = manifest;
export const RELEASE_COLUMNS = 'release_id,snapshot_date,job_profile_code,job_profile_name,status,mean_compa_pct,coverage,base_pay_provenance,range_provenance,range_policy_version';
export type ReleaseRow = {release_id:string; snapshot_date:string; job_profile_code:string; job_profile_name:string; status:'published'|'withheld'; mean_compa_pct:number|null; coverage:'complete'|'partial'|'withheld'; base_pay_provenance:string; range_provenance:string; range_policy_version:string};

/** One immutable company signature. No hidden fallback or caller-defined date. */
export function companyReleaseQuery(params: URLSearchParams) {
  const allowed = new Set(['release','country','org','level']);
  for (const key of params.keys()) if (!allowed.has(key) || params.getAll(key).length !== 1) return false;
  return (!params.has('release') || params.get('release') === manifest.releaseId) &&
    ['country','org','level'].every(key => !params.has(key) || params.get(key) === 'all');
}

/** Exact response allowlist; never forward incidental source columns. */
export function validateRelease(rows: unknown): ReleaseRow[] {
  if (!Array.isArray(rows) || rows.length !== manifest.jobCodes.length) throw Error('Incomplete release');
  const seen = new Set<string>();
  const result = rows.map((candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw Error('Invalid row');
    const row = candidate as Record<string, unknown>;
    if (row.release_id !== manifest.releaseId || row.snapshot_date !== manifest.snapshotDate || row.base_pay_provenance !== manifest.basePayProvenance || row.range_provenance !== manifest.rangeProvenance || row.range_policy_version !== manifest.rangePolicyVersion || typeof row.job_profile_code !== 'string' || !manifest.jobCodes.includes(row.job_profile_code) || seen.has(row.job_profile_code) || typeof row.job_profile_name !== 'string' || !row.job_profile_name.trim() || row.job_profile_name.length > 200) throw Error('Wrong release identity');
    seen.add(row.job_profile_code);
    if (row.status === 'withheld') {
      if (row.mean_compa_pct !== null || row.coverage !== 'withheld') throw Error('Leaking withheld row');
    } else if (row.status !== 'published' || typeof row.mean_compa_pct !== 'number' || !Number.isFinite(row.mean_compa_pct) || row.mean_compa_pct <= 0 || !['complete','partial'].includes(String(row.coverage))) throw Error('Invalid metric');
    return {release_id:row.release_id, snapshot_date:row.snapshot_date, job_profile_code:row.job_profile_code, job_profile_name:row.job_profile_name, status:row.status, mean_compa_pct:row.mean_compa_pct, coverage:row.coverage, base_pay_provenance:row.base_pay_provenance, range_provenance:row.range_provenance, range_policy_version:row.range_policy_version} as ReleaseRow;
  }).sort((a,b) => a.job_profile_code.localeCompare(b.job_profile_code));
  if (result.filter(row=>row.status==='withheld').length === 1) throw Error('Missing companion protection');
  return result;
}
