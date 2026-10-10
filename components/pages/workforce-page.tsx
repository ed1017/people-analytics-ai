"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatWholeCount } from "@/lib/display-format";
import type { WorkforceResponse } from "@/lib/types";

type Props = {
  data: WorkforceResponse | null;
  loading: boolean;
  error: string | null;
};

function monthLabel(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}
export function WorkforcePage({ data, loading, error }: Props) {
  const summary = data?.summary;
  const movementTotals = (data?.movements ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.movement_type] = (acc[row.movement_type] ?? 0) + row.movements;
      return acc;
    },
    {}
  );
  const movementMonths = [...new Set((data?.movements ?? []).map(row => row.month))].sort();
  const movementPeriod = movementMonths.length
    ? `${monthLabel(movementMonths[0])} – ${monthLabel(movementMonths[movementMonths.length - 1])}`
    : "unavailable";

  return (
    <section className="evidence-workspace @container min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Company composition</h2>

        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading ? "Loading workforce…" : data ? "As of " + data.as_of : "Workforce"}
        </span>
      </div>
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {summary ? (
        <>
          <p aria-label="Company composition scope" className="mb-3 rounded-lg border bg-muted/30 px-3 py-2 text-base font-semibold">Company-wide · workforce filters not applied</p>
          <div className="grid grid-cols-1 gap-4 @min-[26rem]:grid-cols-2 @min-[56rem]:grid-cols-4">
            {[
              ["Headcount", summary.headcount.toLocaleString(), summary.fte.toLocaleString() + " FTE", "Number of active employees in the current workforce snapshot. Headcount counts people; FTE reflects capacity."],
              ["People Managers", summary.people_managers.toLocaleString(), summary.avg_span_of_control.toFixed(1) + " avg span", "Employees with at least one direct report in the current snapshot. Average span is direct reports per people manager."],
              ["Average Tenure", summary.avg_tenure_years.toFixed(1) + " yrs", summary.full_time_headcount.toLocaleString() + " full-time", "Average completed years of service among employees in the current workforce snapshot."],
              ["Hybrid Workforce", ((summary.hybrid_headcount / summary.headcount) * 100).toFixed(1) + "%", summary.remote_headcount.toLocaleString() + " remote", "Share of current employees classified as hybrid under the synthetic work-arrangement field."],
            ].map(([label, value, note, definition]) => (
              <div key={label} className="rounded-lg border p-4">
                <p
                  className="inline cursor-help border-b border-dotted text-sm text-muted-foreground"
                  title={definition}
                  tabIndex={0}
                >
                  {label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Headcount Trend</h3>
              <p className="mb-4 text-sm text-muted-foreground">Monthly workforce size since 2024</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="snapshot_date" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                    <YAxis width={58} tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(v) => monthLabel(String(v))}
                      formatter={(value) => formatWholeCount(Number(value))}
                    />
                    <Line type="monotone" dataKey="headcount" name="Headcount" stroke="currentColor" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Workforce by Business Unit</h3>
              <p className="mb-4 text-sm text-muted-foreground">Current headcount distribution</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.business_units} layout="vertical" margin={{ left: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="org_name" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => formatWholeCount(Number(value))} />
                    <Bar dataKey="headcount" name="Headcount" fill="currentColor" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Career Level Mix</h3>
              <p className="mb-4 text-sm text-muted-foreground">Headcount and manager concentration by level</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3">Level</th><th className="pb-3 text-right">HC</th>
                    <th className="pb-3 text-right">Managers</th><th className="pb-3 text-right">Tenure</th>
                  </tr></thead>
                  <tbody>{data.levels.map((row) => (
                    <tr key={row.level_code} className="border-b last:border-0">
                      <td className="py-3">{row.level_name}</td>
                      <td className="py-3 text-right">{row.headcount.toLocaleString()}</td>
                      <td className="py-3 text-right">{row.people_managers.toLocaleString()}</td>
                      <td className="py-3 text-right">{row.avg_tenure_years.toFixed(1)} yrs</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Tenure Distribution</h3>
              <p className="mb-4 text-sm text-muted-foreground">Current workforce by employee tenure</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tenure}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="tenure_band" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatWholeCount(Number(value))} />
                    <Bar dataKey="headcount" name="Headcount" fill="currentColor" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Recorded movement events · Returned months: {movementPeriod}. Counts are events, not distinct people; the workforce snapshot date does not define this period.</p>
              <div className="mt-2 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Promotion events</p><p className="text-xl font-semibold">{movementTotals.promotion ?? 0}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Transfer events</p><p className="text-xl font-semibold">{movementTotals.transfer ?? 0}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Lateral move events</p><p className="text-xl font-semibold">{movementTotals.lateral_move ?? 0}</p></div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border p-4">
            <h3 className="font-semibold">Geographic Footprint</h3>
            <p className="mb-4 text-sm text-muted-foreground">Current workforce by country</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {data.countries.map((row) => (
                <div key={row.country_code} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{row.country_name}</p>
                  <p className="mt-1 text-2xl font-semibold">{row.headcount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{row.avg_tenure_years.toFixed(1)} yrs avg tenure</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {loading ? "Loading workforce analytics…" : "No workforce data returned."}
        </div>
      )}
    </section>
  );
}
