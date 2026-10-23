"use client";
import {KeyFindings} from "@/components/key-findings";
import {snapshotFindings} from "@/lib/key-findings";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatFte,
  formatPercent,
  formatSignedPercent,
  formatWholeCount,
} from "@/lib/display-format";
import type {
  DashboardFilterOptions,
  HeadcountTrendPoint,
  OverviewData,
} from "@/lib/types";

type OverviewPageProps = {
  overviewData: OverviewData | null;
  headcountTrend: HeadcountTrendPoint[];
  filterOptions: DashboardFilterOptions;
  selectedCountry: string;
  selectedOrg: string;
  selectedLevel: string;
  selectedCountryLabel: string;
  selectedOrgLabel: string;
  selectedLevelLabel: string;
  dashboardLoading: boolean;
  dashboardError: string | null;
  filtersActive: boolean;
  headcountGrowthPct: number | null;
  onCountryChange: (value: string) => void;
  onOrgChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onResetFilters: () => void;
};

function formatMonth(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function OverviewPage({
  overviewData,
  headcountTrend,
  selectedCountryLabel,
  selectedOrgLabel,
  selectedLevelLabel,
  dashboardLoading,
  dashboardError,
  headcountGrowthPct,
}: OverviewPageProps) {
  const reportedCost = !dashboardLoading && !dashboardError && typeof overviewData?.labor_cost_usd === 'number' && Number.isFinite(overviewData.labor_cost_usd)
    ? overviewData.labor_cost_usd : null;
  return (
    <section className="evidence-workspace @container min-w-0 p-6">
      <KeyFindings findings={!dashboardLoading && !dashboardError && overviewData ? snapshotFindings(overviewData, [selectedCountryLabel, selectedOrgLabel, selectedLevelLabel].join(" / ")) : null} />
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            Selected workforce snapshot
          </h2>
        </div>

        {overviewData && (
          <p className="text-xs text-muted-foreground">
            As of{" "}
            {formatLongDate(
              overviewData.snapshot_date
            )}
          </p>
        )}
      </div>


      {dashboardError && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {dashboardError}
        </div>
      )}

      <p aria-label="Workforce snapshot scope" className="mb-3 rounded-lg border bg-muted/30 px-3 py-2 text-base font-semibold">{dashboardLoading?'Updating requested scope:':overviewData?'Filters applied:':'Requested scope:'} {selectedCountryLabel} · {selectedOrgLabel} · {selectedLevelLabel}</p>
      <div
        aria-label="Baseline headline metrics"
        className={`grid grid-cols-1 gap-4 transition-opacity @min-[26rem]:grid-cols-2 @min-[56rem]:grid-cols-3 ${
          dashboardLoading
            ? "opacity-60"
            : "opacity-100"
        }`}
      >
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Headcount
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {overviewData
              ? formatWholeCount(overviewData.headcount)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overviewData
              ? `${formatFte(Number(overviewData.fte))} FTE`
              : dashboardLoading ? "Loading" : "Unavailable for these filters"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Attrition
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {overviewData
              ? formatPercent(overviewData.voluntary_turnover_ytd_pct)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Voluntary turnover YTD
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Open Positions
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {overviewData
              ? formatWholeCount(overviewData.open_positions)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current vacant positions
          </p>
        </div>
      </div>

      <details className="mt-3 rounded-lg border px-4 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Labor cost: period unspecified</summary>
        <div className="space-y-2 pb-4">
          <p>{reportedCost === null ? 'Verified scoped cost unavailable.' : `Reported amount: USD ${reportedCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}.`}</p>
          <p>Cost period unspecified; no monthly or annual basis is inferred.</p>
          {reportedCost !== null && overviewData && <p>Snapshot as of {formatLongDate(overviewData.snapshot_date)}; {selectedCountryLabel} / {selectedOrgLabel} / {selectedLevelLabel}. The snapshot date does not establish the cost period.</p>}
        </div>
      </details>

      <div
        className={`mt-6 rounded-lg border p-4 transition-opacity ${
          dashboardLoading
            ? "opacity-60"
            : "opacity-100"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">
              Selected-scope Headcount Trend
            </h3>
            <p className="text-sm text-muted-foreground">
              Monthly active workforce from January 2024 through September 2026
            </p>
          </div>

          {headcountTrend.length > 0 && (
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-muted-foreground">
                  Growth since Jan 2024
                </p>
                <p className="font-semibold">
                  {headcountGrowthPct !== null
                    ? formatSignedPercent(headcountGrowthPct)
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Current
                </p>
                <p className="font-semibold">
                  {formatWholeCount(
                    headcountTrend[
                      headcountTrend.length - 1
                    ].headcount
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="h-80 w-full">
          {headcountTrend.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={headcountTrend}
                margin={{
                  top: 8,
                  right: 16,
                  left: 8,
                  bottom: 8,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.25}
                />
                <XAxis
                  dataKey="snapshot_date"
                  tickFormatter={formatMonth}
                  minTickGap={28}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  allowDecimals={false}
                  tickFormatter={(
                    value: number
                  ) => formatWholeCount(value)}
                  width={64}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    formatLongDate(
                      String(value)
                    )
                  }
                  formatter={(value) => [
                    formatWholeCount(
                      Number(value)
                    ),
                    "Headcount",
                  ]}
                  contentStyle={{
                    backgroundColor:
                      "var(--background)",
                    border:
                      "1px solid var(--border)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="headcount"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {dashboardLoading
                ? "Refreshing filtered trend…"
                : "No workforce history for this filter combination."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
