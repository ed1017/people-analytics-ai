"use client";

import { useState } from "react";
import { benchmarkAreas, benchmarkOccupations, benchmarkProvenance, compensationBenchmark, formatOewsEstimate, wagePercentiles } from "@/lib/compensation-benchmarks";

export function CompensationBenchmarks() {
  const [occupationCode, setOccupationCode] = useState("");
  const [areaCode, setAreaCode] = useState("99");
  const selected = compensationBenchmark(occupationCode, areaCode);
  const national = compensationBenchmark(occupationCode, "99");
  const comparisons = selected ? areaCode === "99" || !national ? [selected] : [selected, national] : [];
  const { onet } = benchmarkProvenance;

  return <section aria-label="US occupation wage benchmarks" className="min-w-0 space-y-4 rounded-lg border p-4 sm:p-5">
    <div>
      <p className="text-xs font-medium text-primary">Public market reference · BLS OEWS</p>
      <h2 className="mt-1 text-lg font-semibold">US occupation wage benchmarks</h2>
      <p className="mt-2 text-sm text-muted-foreground">Published annual wages in USD · {benchmarkProvenance.period}. These occupation percentiles are not seniority levels, salary bands or total compensation.</p>
    </div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium">Reference occupation
        <select value={occupationCode} onChange={event => setOccupationCode(event.target.value)} className="mt-1 block min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm">
          <option value="">Choose an occupation</option>
          {benchmarkOccupations.map(row => <option key={row.onet_code} value={row.onet_code}>{row.onet_title}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-sm font-medium">Benchmark geography
        <select value={areaCode} onChange={event => setAreaCode(event.target.value)} className="mt-1 block min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm">
          {benchmarkAreas.map(area => <option key={area.code} value={area.code}>{area.label} ({area.kind})</option>)}
        </select>
      </label>
    </div>
    <p className="text-xs text-muted-foreground">Coverage: three occupations in three US geographies. No internal role has been matched. Workforce filters do not change this reference.</p>
    {!selected ? <p role="status" className="rounded-md bg-muted/20 p-4 text-sm">Choose a reference occupation to view published wages. A job title alone does not verify a match to your role.</p> : <div className="space-y-3" aria-live="polite">
      <div className="rounded-md bg-muted/20 p-3 text-sm">
        <h3 className="font-semibold">{selected.occupation.onet_title} · {selected.area.label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">O*NET® {selected.occupation.onet_code} → BLS SOC {selected.occupation.soc_code} · Published crosswalk</p>
        <p className="mt-2">{selected.occupation.scope_summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">{selected.occupation.scope_note}</p>
      </div>
      {areaCode === "35620" && <p className="text-sm text-muted-foreground">This metro includes parts of New York and New Jersey; it is broader than New York City.</p>}
      <div role="region" aria-label="Annual wage percentile comparison" tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[660px] text-left text-sm">
          <caption className="mb-2 text-left text-xs text-muted-foreground">Annual wage distribution · USD · {benchmarkProvenance.period} · All included industries and ownerships</caption>
          <thead><tr className="border-b"><th scope="col" className="py-3 pr-4">Geography</th>{wagePercentiles.map(item => <th scope="col" key={item.field} className="px-2 py-3 text-right text-xs">{item.label}</th>)}</tr></thead>
          <tbody>{comparisons.map(item => <tr key={item.area.code} className="border-b last:border-0"><th scope="row" className="py-3 pr-4 font-medium">{item.area.label}<span className="mt-1 block text-xs font-normal text-muted-foreground">{item.area.kind} · {item.area.code}</span></th>{item.percentiles.map(percentile => <td key={percentile.field} className="px-2 py-3 text-right tabular-nums">{formatOewsEstimate(percentile.estimate, true)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Percentiles describe the wage distribution across workers in the selected occupation and geography. They do not identify junior, mid-level or senior pay.</p>
      <p className="text-xs text-muted-foreground">Estimated employment: {formatOewsEstimate(selected.employment)}. Employment PRSE: {formatOewsEstimate(selected.employmentPrse)}{selected.employmentPrse.status === "published" ? "%" : ""}. Employment is not vacancies or available candidates; this PRSE is not uncertainty for the wage percentiles.</p>
      <a href={selected.source.url} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary underline">Official BLS source workbook</a>
    </div>}
    <details className="border-t pt-3 text-sm">
      <summary className="cursor-pointer font-medium">Benchmark sources and limits</summary>
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>BLS OEWS May 2025, released May 15, 2026. Versioned subset checked October 5, 2026; no automatic refresh or inflation adjustment. US nonfarm wage and salary employment, including full- and part-time workers; self-employed workers are excluded.</p>
        <p>OEWS wages include base rates and some incentive pay. Overtime premiums, nonproduction bonuses and employer benefit costs are excluded. These are published annual wage estimates, not take-home pay or total employer cost. The percentile range is not a confidence interval.</p>
        <p>Missing/suppressed estimates stay unavailable. A BLS “#” is shown as ≥ $239,200 annually, not an exact wage; “*” means wage unavailable and “**” means employment unavailable. The nine included records have published numeric estimates.</p>
        <p>The metro and state overlap with the national population. Do not sum their employment or treat their wage differences as caused by location. No internal pay gap, salary recommendation, job-level inference or forecast is calculated.</p>
        <p>Source: <a href="https://www.bls.gov/oes/tables.htm" target="_blank" rel="noreferrer" className="text-primary underline">U.S. Bureau of Labor Statistics</a> · <a href="https://www.bls.gov/oes/2025/may/oes_tec.htm" target="_blank" rel="noreferrer" className="text-primary underline">May 2025 technical notes</a> · <a href="https://www.bls.gov/bls/linksite.htm" target="_blank" rel="noreferrer" className="text-primary underline">Public-domain data</a>.</p>
        <p><a href="https://www.onetcenter.org/database.html" target="_blank" rel="noreferrer" className="text-primary underline">{onet.attribution}</a> Release: {onet.release_month}. Used under <a href={onet.license} target="_blank" rel="noreferrer" className="text-primary underline">CC BY 4.0</a>. {onet.modifications}</p>
        <p><a href={onet.crosswalk_source} target="_blank" rel="noreferrer" className="text-primary underline">O*NET-SOC 2019 → 2018 SOC crosswalk</a>. Source verification checks taxonomy pairs only. Duties, specialty, seniority and location still require review before using a reference for an internal role.</p>
      </div>
    </details>
  </section>;
}
