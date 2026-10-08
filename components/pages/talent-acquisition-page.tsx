"use client";

import {CalibratedTaPanels} from "@/components/calibrated-ta-panels";
import {resolveTaExtension} from "@/lib/synthetic-ta/extension";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatWholeCount, formatMetric } from "@/lib/display-format";
import type { TalentAcquisitionResponse } from "@/lib/types";

type TalentAcquisitionPageProps = {
  data: TalentAcquisitionResponse | null;
  loading: boolean;
  error: string | null;
};

function formatMonth(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatLongDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function TalentAcquisitionPage({ data, loading, error }: TalentAcquisitionPageProps) {
  const summary = data?.summary;
  const extension = resolveTaExtension(data?.modeled_extension);

  return (
    <section className="evidence-workspace min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Monitor recruiting demand, funnel conversion, hiring velocity, and source effectiveness.</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading ? "Loading recruiting data…" : data ? "As of " + formatLongDate(data.as_of) : "Talent Acquisition"}
        </span>
      </div>

      {error && <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="mb-4">{extension ? <CalibratedTaPanels data={extension} /> : <p className="rounded-lg border p-3 text-sm">Calibrated projections and expanded funnel unavailable: source data is loading or differs from the calibration snapshot.</p>}</div>

      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current-status Open Requisitions</p>
              <p className="mt-2 text-3xl font-semibold">{formatWholeCount(summary.open_requisitions)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatWholeCount(summary.open_positions)} open positions</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="mt-2 text-3xl font-semibold">{formatWholeCount(summary.applications)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatMetric(summary.application_to_hire_pct, 1, "%")} application → hire</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Median Time to Fill</p>
              <p className="mt-2 text-3xl font-semibold">{formatMetric(summary.median_time_to_fill_days, 0, " days")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatMetric(summary.avg_time_to_fill_days, 1, " day average")}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Aging Open Reqs</p>
              <p className="mt-2 text-3xl font-semibold">{formatWholeCount(summary.open_reqs_over_60_days)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Older than 60 days · median age {formatMetric(summary.median_open_req_age_days, 0, " days")}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">Monthly Recruiting Activity</h3>
                <p className="text-sm text-muted-foreground">Applications and hires from January 2024 through September 2026</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthly} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={28} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => formatWholeCount(value)} width={64} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(value) => formatMonth(String(value))} formatter={(value) => typeof value === "number" ? formatWholeCount(value) : "Unavailable"} contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "0.5rem" }} />
                    <Line type="monotone" dataKey="applications" name="Applications" stroke="currentColor" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="hires" name="Hires" stroke="currentColor" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Hiring Mix</h3>
              <p className="mb-4 text-sm text-muted-foreground">Internal versus external hiring and offer acceptance</p>
              <div className="space-y-3">
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">External hires</p><p className="mt-2 text-2xl font-semibold">{formatWholeCount(summary.external_hires)}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Internal hires</p><p className="mt-2 text-2xl font-semibold">{formatWholeCount(summary.internal_hires)}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Offer acceptance</p><p className="mt-2 text-2xl font-semibold">{formatMetric(summary.offer_acceptance_pct, 1, "%")}</p></div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6">
            <div className="min-w-0 rounded-lg border p-4">
              <div className="mb-4"><h3 className="font-semibold">Hiring Demand by Business Unit</h3><p className="text-sm text-muted-foreground">Current open positions and historical hiring velocity</p></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3 pr-4">Business Unit</th><th className="pb-3 pr-4 text-right">Open</th><th className="pb-3 pr-4 text-right">Hires</th><th className="pb-3 text-right">Avg TTF</th></tr></thead>
                  <tbody>
                    {data.business_units.map((row) => (
                      <tr key={row.org_code} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{row.org_name}</td>
                        <td className="py-3 pr-4 text-right">{formatWholeCount(row.open_positions)}</td>
                        <td className="py-3 pr-4 text-right">{formatWholeCount(row.hires)}</td>
                        <td className="py-3 text-right">{formatMetric(row.avg_time_to_fill_days, 1, " days")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0 rounded-lg border p-4">
              <div className="mb-4"><h3 className="font-semibold">Source Effectiveness</h3><p className="text-sm text-muted-foreground">Applications, hires, and application-to-hire conversion</p></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3 pr-4">Source</th><th className="pb-3 pr-4 text-right">Apps</th><th className="pb-3 pr-4 text-right">Hires</th><th className="pb-3 text-right">Conv.</th></tr></thead>
                  <tbody>
                    {data.sources.map((row) => (
                      <tr key={row.source_code} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{row.source_name}</td>
                        <td className="py-3 pr-4 text-right">{formatWholeCount(row.applications)}</td>
                        <td className="py-3 pr-4 text-right">{formatWholeCount(row.hires)}</td>
                        <td className="py-3 text-right font-semibold">{formatMetric(row.application_to_hire_pct, 1, "%")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div><h3 className="font-semibold">Recruiter Workload</h3><p className="text-sm text-muted-foreground">Recruiters with the largest active requisition loads</p></div>
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">Top 10 by open reqs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3 pr-4">Recruiter</th><th className="pb-3 pr-4">Region</th><th className="pb-3 pr-4">Specialty</th><th className="pb-3 pr-4 text-right">Open Reqs</th><th className="pb-3 text-right">Avg TTF</th></tr></thead>
                <tbody>
                  {data.recruiters.slice(0, 10).map((row) => (
                    <tr key={row.recruiter_name} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{row.recruiter_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.region ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.specialty ?? "—"}</td>
                      <td className="py-3 pr-4 text-right">{formatWholeCount(row.open_requisitions)}</td>
                      <td className="py-3 text-right">{formatMetric(row.avg_time_to_fill_days, 1, " days")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">{loading ? "Loading Talent Acquisition analytics…" : "No Talent Acquisition data returned."}</div>
      )}
    </section>
  );
}