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
import type { AttritionResponse } from "@/lib/types";

type Props = {
  data: AttritionResponse | null;
  loading: boolean;
  error: string | null;
};

function monthLabel(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}
export function AttritionPage({ data, loading, error }: Props) {
  const summary = data?.summary;
  const trend2026 = (data?.trend ?? []).filter((row) => row.month >= "2026-01-01");

  return (
    <section className="min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Attrition</h2>
          <p className="text-muted-foreground">
            Diagnose turnover patterns, regrettable losses, workforce segments, and reported separation reasons.
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading ? "Loading attrition…" : data ? "YTD through " + data.as_of : "Attrition"}
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Voluntary Turnover YTD", summary.voluntary_turnover_ytd_pct.toFixed(1) + "%", summary.voluntary_exits.toLocaleString() + " voluntary exits"],
              ["Annualized Voluntary", summary.annualized_voluntary_turnover_pct.toFixed(1) + "%", "Run-rate based on Jan-Sep"],
              ["Regrettable Exits", summary.regrettable_exits.toLocaleString(), summary.regrettable_share_of_voluntary_pct.toFixed(1) + "% of voluntary exits"],
              ["Total Exits YTD", summary.total_exits.toLocaleString(), summary.total_turnover_ytd_pct.toFixed(1) + "% total turnover"],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Monthly Voluntary Turnover</h3>
              <p className="mb-4 text-sm text-muted-foreground">2026 monthly voluntary turnover rate</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend2026}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => v + "%"} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => monthLabel(String(v))} formatter={(v) => [Number(v).toFixed(2) + "%", "Voluntary turnover"]} />
                    <Line type="monotone" dataKey="monthly_voluntary_turnover_pct" stroke="currentColor" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Voluntary Turnover by Business Unit</h3>
              <p className="mb-4 text-sm text-muted-foreground">YTD rate using average monthly headcount</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.business_units} layout="vertical" margin={{ left: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis type="number" tickFormatter={(v) => v + "%"} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="org_name" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [Number(v).toFixed(1) + "%", "Voluntary turnover YTD"]} />
                    <Bar dataKey="voluntary_turnover_ytd_pct" fill="currentColor" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Reported Separation Reasons</h3>
              <p className="mb-4 text-sm text-muted-foreground">All 2026 YTD separation records</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-3">Reason</th><th className="pb-3">Type</th>
                    <th className="pb-3 text-right">Exits</th><th className="pb-3 text-right">Share</th>
                  </tr></thead>
                  <tbody>{data.reasons.map((row) => (
                    <tr key={row.separation_reason} className="border-b last:border-0">
                      <td className="py-3 font-medium">{row.separation_reason}</td>
                      <td className="py-3 capitalize">{row.separation_type.replaceAll("_", " ")}</td>
                      <td className="py-3 text-right">{row.exits}</td>
                      <td className="py-3 text-right">{row.pct_of_exits.toFixed(1)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold">Attrition by Tenure</h3>
              <p className="mb-4 text-sm text-muted-foreground">Exit volume by tenure at separation</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tenure}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="tenure_band" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="voluntary_exits" fill="currentColor" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Counts describe where exits occurred; they are not turnover rates because historical tenure-band denominators are not modeled here.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <h3 className="font-semibold">Career Level Exit Profile</h3>
            <p className="mb-4 text-sm text-muted-foreground">YTD exits by career level</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3">Level</th><th className="pb-3 text-right">Total Exits</th>
                  <th className="pb-3 text-right">Voluntary</th><th className="pb-3 text-right">Regrettable</th>
                </tr></thead>
                <tbody>{data.levels.map((row) => (
                  <tr key={row.level_code} className="border-b last:border-0">
                    <td className="py-3">{row.level_name}</td>
                    <td className="py-3 text-right">{row.exits}</td>
                    <td className="py-3 text-right">{row.voluntary_exits}</td>
                    <td className="py-3 text-right">{row.regrettable_exits}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground">
            Separation reasons are reported administrative reasons in the synthetic dataset. They describe recorded exits and should not be treated as proven causal drivers of attrition without additional analysis.
          </div>
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {loading ? "Loading attrition analytics…" : "No attrition data returned."}
        </div>
      )}
    </section>
  );
}
