'use client';

import {useEffect, useState} from 'react';
import {defaultRangeScope, rangesForScope, type RangeCatalog, type RangeScope, type JobCompa} from '@/lib/compensation-ranges';
import {compensationRelease, validateRelease, type ReleaseRow} from '@/lib/compensation-release';

const usd = (value: number) => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(value);

export function JobCompaGraph({result}: {result?: JobCompa}) {
  const value = result?.status === 'published' && result.meanPct !== null && Number.isFinite(result.meanPct) && result.meanPct > 0 ? result.meanPct : null;
  const maximum = Math.max(150, value ?? 0);
  const position = (n: number) => 8 + n / maximum * 144;
  return <div className="min-w-24 max-w-40">
    <svg viewBox="0 0 160 32" className="h-8 w-full" role="img" aria-label={value === null ? 'Compa-ratio unavailable; reference at 100 percent' : `Mean compa-ratio ${value.toFixed(1)} percent; reference at 100 percent`}>
      <line x1="8" x2="152" y1="10" y2="10" stroke="currentColor" opacity=".2" />
      <line x1={position(100)} x2={position(100)} y1="3" y2="17" stroke="currentColor" strokeDasharray="2 2" />
      {value !== null && <circle cx={position(value)} cy="10" r="4" fill="currentColor" />}
      <text x={position(100)} y="29" textAnchor="middle" fill="currentColor" fontSize="9">100%</text>
    </svg>
    <p className="text-xs tabular-nums">{value === null ? result?.status === 'suppressed' ? 'Withheld' : 'Unavailable' : `${value.toFixed(1)}%`}</p>
  </div>;
}

export function CompensationJobRanges({scope = defaultRangeScope}: {scope?: RangeScope}) {
  const [catalog, setCatalog] = useState<RangeCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [release, setRelease] = useState<ReleaseRow[] | null>(null);
  const company = scope.country === 'all' && scope.org === 'all' && scope.level === 'all';
  useEffect(() => {
    if (!company) return;
    const controller = new AbortController();
    void fetch('/api/compensation-job-release', {signal:controller.signal, cache:'no-store'})
      .then(async response => {
        if (!response.ok) throw Error('Release unavailable');
        const data = await response.json();
        if (data.release_id !== compensationRelease.releaseId || data.snapshot_date !== compensationRelease.snapshotDate || !data.scope || data.scope.country !== null || data.scope.org !== null || data.scope.level !== null) throw Error('Wrong release scope');
        return validateRelease(data.rows);
      })
      .then(rows => {if (!controller.signal.aborted) setRelease(rows);})
      .catch(() => {if (!controller.signal.aborted) setRelease(null);});
    return () => controller.abort();
  }, [company, attempt]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/compensation-ranges', {signal: controller.signal, cache: 'no-store'})
      .then(async response => {if (!response.ok) throw Error('Catalog unavailable'); return await response.json() as RangeCatalog;})
      .then(result => {if (!controller.signal.aborted) setCatalog(result);})
      .catch(() => {if (!controller.signal.aborted) setFailed(true);});
    return () => controller.abort();
  }, [attempt]);
  return <section aria-label="Job salary ranges and compa-ratios" className="min-w-0 space-y-3">
    <div><h2 className="text-lg font-semibold">Salary ranges by job</h2>
      <p className="text-xs text-muted-foreground">Demo data · Assumed annual base ranges · USD · 1.0 FTE · Effective 30 Sep 2026–29 Sep 2027</p></div>
    <p className="text-xs text-muted-foreground">Top filters: {scope.org === 'all' ? 'All business units' : scope.org} · {scope.level === 'all' ? 'All levels' : scope.level} · {scope.country === 'all' ? 'Global range assumption' : `${scope.country} range assumption`}. Country selects a policy assumption; filtered pay analysis is not released.</p>
    <p role="status" className="text-xs text-muted-foreground">{!company ? 'Compa-ratios are not released for these filters. No company results are substituted.' : release ? 'USD-pay subset only · Partial job coverage · Exact counts are not published.' : 'Compa-ratio release unavailable. The demo pay convention is approved; aggregate publication is separately gated.'}</p>
    {failed ? <div role="alert" className="text-sm">Job range catalog unavailable. <button className="min-h-11 px-2 underline" onClick={() => {setFailed(false); setCatalog(null); setAttempt(value => value + 1);}}>Try again</button></div> : !catalog ? <p role="status" className="text-sm">Loading existing jobs…</p> : <JobRangeTable catalog={catalog} scope={scope} releaseRows={company ? release : null} />}
    <details className="text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3 font-medium">Range assumptions and calculation</summary>
      <div className="space-y-2">
        <p>All jobs come from the existing job catalog. At company scope, each job receives an assumed range at every level found in the existing position inventory; these are policy proposals, not observed employee combinations. Business-unit and level filters narrow catalog combinations, not employee pay records.</p>
        <p>Midpoint = $50,000 + an arbitrary stable job-code seed (0–10 × $2,500) + catalog level rank × $10,000. Minimum and maximum are 80% and 120% of midpoint. The same USD assumptions apply in every location; there is no FX conversion or market calibration. No BLS wage is used.</p>
        <p>Approved demo convention: treat existing base salary as annual contracted pay in its recorded currency at actual FTE, then divide by FTE. This is an agreed interpretation, not proven payroll semantics. No salary is generated or inferred from labor cost.</p>
        <p>Mean compa-ratio = mean of each matched person’s base salary ÷ FTE ÷ matching midpoint × 100. Include all snapshot rows in coverage; do not assume active/salaried eligibility. Match job, level, country, USD currency and effective date. Missing, invalid and ambiguous inputs are excluded, not zero-filled.</p>
        <p>The first-release proposal contains only company-wide job means. Fewer than five matches or 1–4 exclusions withhold the job; one additional job is withheld when needed for companion protection. Exact counts, salary sums, numerical coverage percentages, filter variants and time comparisons are not published. A withheld graph has no pay point.</p>
        <p>Range policy version: 1. Assumed demo ranges are not market benchmarks or pay recommendations. BLS references and company labor costs retain their separate scopes below.</p>
      </div>
    </details>
  </section>;
}

export function JobRangeTable({catalog, scope, releaseRows}: {catalog: RangeCatalog; scope: RangeScope; releaseRows?: ReleaseRow[] | null}) {
  const ranges = rangesForScope(catalog, scope);
  const jobs = catalog.jobs.filter(job => ranges.some(range => range.job === job.job_profile_code));
  if (!jobs.length) return <p role="status" className="text-sm">No catalog job/level combinations match these filters. No pay coverage is implied.</p>;
  return <div className="overflow-x-auto" role="region" aria-label="Job range comparison" tabIndex={0}>
    <table className="w-full min-w-[340px] text-left text-sm">
      <caption className="pb-2 text-left text-xs text-muted-foreground">{jobs.length} catalog jobs · Ranges are assumptions · Exact pay counts are not published</caption>
      <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="py-2 pr-3">Job</th><th scope="col" className="py-2 pr-3">Min / midpoint / max · USD</th><th scope="col" className="py-2">Mean compa-ratio</th></tr></thead>
      <tbody>{jobs.map(job => <tr key={job.job_profile_code} className="border-b last:border-0">
        <th scope="row" className="py-3 pr-3 font-medium">{job.job_profile_name}</th>
        <td className="py-3 pr-3"><RangeValues ranges={ranges.filter(range => range.job === job.job_profile_code)}/></td>
        <td className="py-3"><ReleasedJobGraph job={job.job_profile_code} rows={scope.country === 'all' && scope.org === 'all' && scope.level === 'all' ? releaseRows : null}/></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function ReleasedJobGraph({job, rows}: {job:string; rows?:ReleaseRow[]|null}) {
  const row=rows?.find(item=>item.job_profile_code===job);
  const result:JobCompa|undefined=row ? {job,status:row.status==='published'?'published':'suppressed',meanPct:row.mean_compa_pct,eligible:null,missing:null,coveragePct:null} : undefined;
  return <><JobCompaGraph result={result}/>{row?.status==='published'&&<p className="mt-1 text-xs text-muted-foreground">{row.coverage==='complete'?'Complete USD inputs':'Partial USD inputs'}</p>}</>;
}

function RangeValues({ranges}: {ranges: ReturnType<typeof rangesForScope>}) {
  const line = (range: typeof ranges[number]) => <span>{range.level} · {usd(range.minimum)} / {usd(range.midpoint)} / {usd(range.maximum)}</span>;
  return <div className="text-xs"><p>{line(ranges[0])}</p>{ranges.length > 1 && <details><summary className="min-h-11 cursor-pointer py-3">{ranges.length - 1} more level ranges</summary><ul className="space-y-2">{ranges.slice(1).map(range => <li key={range.level}>{line(range)}</li>)}</ul></details>}</div>;
}
