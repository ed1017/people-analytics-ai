"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

  return (
    <section className="min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Talent Acquisition</h2>
          <p className="text-muted-foreground">Monitor recruiting demand, funnel conversion, hiring velocity, and source effectiveness.</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading ? "Loading recruiting data…" : data ? "As of " + formatLongDate(data.as_of) : "Talent Acquisition"}
        </span>
      </div>

      {error && <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Open Requisitions</p>
              <p className="mt-2 text-3xl font-semibold">{summary.open_requisitions.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary.open_positions.toLocaleString()} open positions</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="mt-2 text-3xl font-semibold">{summary.applications.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary.application_to_hire_pct.toFixed(1)}% application → hire</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Median Time to Fill</p>
              <p className="mt-2 text-3xl font-semibold">{Math.round(summary.median_time_to_fill_days)} days</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary.avg_time_to_fill_days.toFixed(1)} day average</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Aging Open Reqs</p>
              <p className="mt-2 text-3xl font-semibold">{summary.open_reqs_over_60_days.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Older than 60 days · median age {Math.round(summary.median_open_req_age_days)} days</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4">
              <h3 className="font-semibold">Recruiting Funnel</h3>
              <p className="text-sm text-muted-foreground">Candidate progression through the recruiting process</p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["Applications", summary.applications, null],
                ["Interviewed", summary.interviewed_applications, summary.application_to_interview_pct],
                ["Offers", summary.offered_applications, summary.interview_to_offer_pct],
                ["Hires", summary.hires, summary.offer_to_hire_pct],
              ].map(([label, value, conversion]) => (
                <div key={String(label)} className="rounded-lg border bg-muted/10 p-4">
                  <p className="text-xs font-medium text-muted-foreground">{String(label)}</p>
                  <p className="mt-2 text-2xl font-semibold">{Number(value).toLocaleString()}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{conversion === null ? "Top of funnel" : Number(conversion).toFixed(1) + "% from prior stage"}</p>
                </div>
              ))}
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
                    <YAxis tickFormatter={(value) => Number(value).toLocaleString()} width={64} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(value) => formatMonth(String(value))} contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "0.5rem" }} />
                    <Line type="monotone" dataKey="applications" stroke="currentColor" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="hires" stroke="currentColor" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Hiring Mix</h3>
              <p className="mb-4 text-sm text-muted-foreground">Internal versus external hiring and offer acceptance</p>
              <div className="space-y-3">
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">External hires</p><p className="mt-2 text-2xl font-semibold">{summary.external_hires.toLocaleString()}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Internal hires</p><p className="mt-2 text-2xl font-semibold">{summary.internal_hires.toLocaleString()}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Offer acceptance</p><p className="mt-2 text-2xl font-semibold">{summary.offer_acceptance_pct.toFixed(1)}%</p></div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-4"><h3 className="font-semibold">Hiring Demand by Business Unit</h3><p className="text-sm text-muted-foreground">Current open positions and historical hiring velocity</p></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3 pr-4">Business Unit</th><th className="pb-3 pr-4 text-right">Open</th><th className="pb-3 pr-4 text-right">Hires</th><th className="pb-3 text-right">Avg TTF</th></tr></thead>
                  <tbody>
                    {data.business_units.map((row) => (
                      <tr key={row.org_code} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{row.org_name}</td>
                        <td className="py-3 pr-4 text-right">{row.open_positions.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right">{row.hires.toLocaleString()}</td>
                        <td className="py-3 text-right">{row.avg_time_to_fill_days.toFixed(1)} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-4"><h3 className="font-semibold">Source Effectiveness</h3><p className="text-sm text-muted-foreground">Applications, hires, and application-to-hire conversion</p></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3 pr-4">Source</th><th className="pb-3 pr-4 text-right">Apps</th><th className="pb-3 pr-4 text-right">Hires</th><th className="pb-3 text-right">Conv.</th></tr></thead>
                  <tbody>
                    {data.sources.map((row) => (
                      <tr key={row.source_code} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{row.source_name}</td>
                        <td className="py-3 pr-4 text-right">{row.applications.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right">{row.hires.toLocaleString()}</td>
                        <td className="py-3 text-right font-semibold">{row.application_to_hire_pct.toFixed(1)}%</td>
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
                      <td className="py-3 pr-4 text-right">{row.open_requisitions.toLocaleString()}</td>
                      <td className="py-3 text-right">{row.avg_time_to_fill_days.toFixed(1)} days</td>
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