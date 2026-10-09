"use client";
import { datasetFetch } from "@/lib/dataset-client.mjs";


import { useEffect, useState } from "react";
import type { CompensationResponse } from "@/lib/compensation";
import {CompensationJobRanges} from "@/components/compensation-job-ranges";
import type {RangeScope} from "@/lib/compensation-ranges";
import { CompensationBenchmarks } from "@/components/compensation-benchmarks";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const display = (value: number | null, currency = false) => value === null ? "Unavailable" : (currency ? money : number).format(value);

export function CompensationPage({scope}: {scope?: RangeScope}) {
  const [data, setData] = useState<CompensationResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await datasetFetch("/api/compensation", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Unavailable");
        const result: CompensationResponse = await response.json();
        if (!controller.signal.aborted) setData(result);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setData(null);
    setError(false);
    setLoading(true);
    setAttempt(value => value + 1);
  };

  return (<>
    <div className="min-w-0 space-y-4 px-4 pt-4 sm:px-6 sm:pt-6"><CompensationJobRanges scope={scope}/><CompensationBenchmarks /></div>
    <section className="evidence-workspace min-w-0 space-y-5 p-4 sm:p-6" aria-label="Compensation cost context" aria-busy={loading}>
      <div className="space-y-2">
        <p className="text-xs font-medium text-primary">Demo data · Aggregate evidence · USD</p>
        <h2 className="text-lg font-semibold">Workforce cost context</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">Compare reported demo labor cost across business units. This internal source has no salary ranges or pay-equity measures.</p>
      </div>

      {loading ? <p role="status" className="rounded-lg border p-6 text-sm text-muted-foreground">Loading compensation cost context…</p>
        : error ? <div role="alert" className="rounded-lg border p-5"><p className="text-sm">Compensation cost context is unavailable. Try again.</p><button type="button" onClick={retry} className="mt-3 rounded-md border px-3 py-2 text-sm font-medium">Try again</button></div>
        : data && data.by_business_unit.length === 0 ? <div className="rounded-lg border p-5"><p role="status" className="text-sm">No business-unit cost aggregates were returned. Company totals are unavailable.</p><button type="button" onClick={retry} className="mt-3 rounded-md border px-3 py-2 text-sm font-medium">Try again</button></div>
        : data ? <CompensationEvidence data={data} /> : null}
    </section></>
  );
}

export function CompensationEvidence({ data }: { data: CompensationResponse }) {
  const incomplete = data.by_business_unit.some(row => row.headcount === null || row.fte === null || row.labor_cost_usd === null);
  const snapshot = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${data.snapshot_date}T00:00:00Z`));
  return <>
    <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
      <p>Company scope · {data.by_business_unit.length} business units · Snapshot: {snapshot}. Workforce filters do not apply here.</p>
      <p>Cost period and source refresh date are not supplied. Employee-level cost coverage is unknown.</p>
    </div>
    {incomplete && <p role="status" className="text-sm text-muted-foreground">Some source values are missing or invalid. Affected totals and comparisons are unavailable.</p>}
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Reported labor cost · USD</dt><dd className="mt-2 break-words text-2xl font-semibold tabular-nums">{display(data.current.labor_cost_usd, true)}</dd><dd className="mt-1 text-xs text-muted-foreground">Sum of supplied business-unit costs</dd></div>
      <div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Labor cost per FTE · USD</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{display(data.current.cost_per_fte_usd, true)}</dd><dd className="mt-1 text-xs text-muted-foreground">Reported cost ÷ reported FTE</dd></div>
      <div className="rounded-lg border p-4"><dt className="text-sm text-muted-foreground">Snapshot headcount</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{display(data.current.headcount)}</dd><dd className="mt-1 text-xs text-muted-foreground">{display(data.current.fte)} FTE · full-time equivalent</dd></div>
    </dl>
    <div className="min-w-0 rounded-lg border p-4">
      <h3 className="font-semibold">Business-unit comparison</h3>
      <p id="compensation-table-note" className="mt-1 text-xs text-muted-foreground">Highest reported cost first. Cost per FTE reflects workforce mix; it is not average salary.</p>
      <div className="mt-3 overflow-x-auto" role="region" aria-label="Business-unit cost comparison" tabIndex={0}>
        <table className="w-full min-w-[650px] text-sm" aria-describedby="compensation-table-note">
          <caption className="sr-only">Demo business-unit labor costs in USD for the {snapshot} snapshot. Cost period is unknown.</caption>
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="py-3 pr-4">Business unit</th><th scope="col" className="px-2 py-3 text-right">Headcount</th><th scope="col" className="px-2 py-3 text-right">FTE</th><th scope="col" className="px-2 py-3 text-right">Labor cost · USD</th><th scope="col" className="px-2 py-3 text-right">Share</th><th scope="col" className="py-3 pl-2 text-right">Cost / FTE · USD</th></tr></thead>
          <tbody>{data.by_business_unit.map(row => <tr key={row.org_code} className="border-b last:border-0"><th scope="row" className="py-3 pr-4 text-left font-medium">{row.org_name}</th><td className="px-2 py-3 text-right tabular-nums">{display(row.headcount)}</td><td className="px-2 py-3 text-right tabular-nums">{display(row.fte)}</td><td className="px-2 py-3 text-right tabular-nums">{display(row.labor_cost_usd, true)}</td><td className="px-2 py-3 text-right tabular-nums">{row.share_of_reported_cost_pct === null ? "Unavailable" : `${number.format(row.share_of_reported_cost_pct)}%`}</td><td className="py-3 pl-2 text-right tabular-nums">{display(row.cost_per_fte_usd, true)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
    <details className="rounded-lg border p-4 text-sm">
      <summary className="cursor-pointer font-medium">Source and limits</summary>
      <div className="mt-3 space-y-2 text-muted-foreground">
        <p>Source: <code>finance_current_summary</code>, the same demo aggregate view used by Workforce Cost. Its snapshot predicate is fixed to September 30, 2026; the view does not report when its data was refreshed.</p>
        <p>Cohort: snapshot rows grouped by business unit. Active-employment eligibility and employee-level known/missing cost counts are not supplied. Source sums can omit missing employee costs, so these are reported aggregates, not verified complete payroll totals.</p>
        <p>Values are already denominated in USD by the source. Original currencies, exchange-rate dates and cost-period definitions are unavailable; no conversion or annualization is performed here.</p>
        <p>Missing aggregate values remain unavailable. Cost per FTE is total reported cost divided by total reported FTE, not an average of business-unit ratios. Share uses the sum of all supplied business-unit costs and is unavailable if that total is missing or zero.</p>
        <p>Base pay, bonus, equity, salary bands, pay percentiles and market-pay evidence are not in this source. These aggregates do not support individual pay decisions or forecasts.</p>
      </div>
    </details>
  </>;
}
