// @ts-expect-error Explicit extension supports the repository's Node native-TS tests.
import {aggregateJobCompa, type DemoRange} from './compensation-ranges.ts';
// @ts-expect-error Explicit extension supports the repository's Node native-TS tests.
import {compensationRelease, validateRelease, type ReleaseRow} from './compensation-release.ts';

/** Local/server adapter after DB membership resolution. No person records go to a browser. */
export type DemoSnapshot = {employee_id:string; snapshot_date:string; job_profile_code:string|null; level_code:string|null; country_code:string|null; currency_code:string|null; base_salary:number|null; fte:number|null};
export function buildDemoConventionRelease(records: DemoSnapshot[], ranges: DemoRange[], names: Record<string,string>): ReleaseRow[] {
  const selected = records.filter(row => row.snapshot_date === compensationRelease.snapshotDate);
  if (selected.some(row => !row.employee_id || !row.job_profile_code || !compensationRelease.jobCodes.includes(row.job_profile_code))) throw Error('Unmapped population');
  const stats = aggregateJobCompa(selected.map(row => ({id:row.employee_id, job:row.job_profile_code!, level:row.level_code ?? '',country:row.country_code ?? '',currency:row.currency_code ?? '',date:row.snapshot_date,basis:'annual_contracted_base',annualContractedBase:row.base_salary,fte:row.fte,active:true})),ranges.filter(range => range.currency === 'USD'));
  const primary = compensationRelease.jobCodes.filter(job => stats.find(row => row.job === job)?.status !== 'published');
  const companion = primary.length === 1 ? compensationRelease.jobCodes.find(job => !primary.includes(job)) : undefined;
  return validateRelease(compensationRelease.jobCodes.map(job => {
    const stat=stats.find(row => row.job === job);
    const withheld=primary.includes(job) || job === companion;
    return {release_id:compensationRelease.releaseId,snapshot_date:compensationRelease.snapshotDate,job_profile_code:job,job_profile_name:names[job],status:withheld?'withheld':'published',mean_compa_pct:withheld?null:stat!.meanPct,coverage:withheld?'withheld':stat!.missing===0?'complete':'partial',base_pay_provenance:compensationRelease.basePayProvenance,range_provenance:compensationRelease.rangeProvenance,range_policy_version:compensationRelease.rangePolicyVersion};
  }));
}
