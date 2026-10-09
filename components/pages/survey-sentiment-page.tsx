"use client";

import { knownDifference } from "@/lib/numeric-contract";

import {SyntheticDomainDemo} from "@/components/synthetic-domain-demo";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPercent, formatWholeCount, formatMetric } from "@/lib/display-format";
import type {
  SurveyListeningDimension,
  SurveySentimentResponse,
} from "@/lib/types";

type SurveySentimentPageProps = {
  data: SurveySentimentResponse | null;
  loading: boolean;
  error: string | null;
};

function formatYear(value: string) {
  return new Date(value + "T00:00:00").getFullYear().toString();
}

function formatLongDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function stageLabel(code: string) {
  if (code === "ONB-30") return "30 Day";
  if (code === "ONB-60") return "60 Day";
  if (code === "ONB-90") return "90 Day";
  return code;
}

function DimensionList({
  rows,
  showExitDetails = false,
}: {
  rows: SurveyListeningDimension[];
  showExitDetails?: boolean;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.survey_code + row.question_code}
          className="rounded-lg border p-3"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {row.dimension}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatMetric(row.avg_score, 2, " / 5 average")}
              </p>
            </div>
            <p className="text-sm font-semibold">
              {formatMetric(row.favorable_pct, 1, "%")}
              {showExitDetails && <span className="block text-xs font-normal text-muted-foreground">favorable</span>}
            </p>
          </div>
          {showExitDetails && (
            <div className="mt-2 text-xs text-muted-foreground">
              <p>{row.question_text}</p>
              <p className="mt-1">{formatWholeCount(row.separation_respondents)} exit-survey respondents · 1–5 scale</p>
            </div>
          )}
          {typeof row.favorable_pct === "number" && Number.isFinite(row.favorable_pct) && <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{
                width: Math.max(0, Math.min(100, row.favorable_pct)) + "%",
              }}
            />
          </div>}
        </div>
      ))}
    </div>
  );
}

export function SurveySentimentPage({
  data,
  loading,
  error,
}: SurveySentimentPageProps) {
  const summary = data?.summary;
  const priorEngagement =
    data?.engagement_trend.length && data.engagement_trend.length >= 2
      ? data.engagement_trend[data.engagement_trend.length - 2]
      : null;
  const engagementDelta =
    summary && priorEngagement
      ? knownDifference(summary.engagement_favorable_pct, priorEngagement.favorable_pct)
      : null;

  const onboarding30 =
    data?.onboarding_dimensions.filter((row) => row.survey_code === "ONB-30") ?? [];
  const onboarding60 =
    data?.onboarding_dimensions.filter((row) => row.survey_code === "ONB-60") ?? [];
  const onboarding90 =
    data?.onboarding_dimensions.filter((row) => row.survey_code === "ONB-90") ?? [];

  return (
    <section className="evidence-workspace min-w-0 p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Track engagement, pulse, manager feedback and onboarding experience. Each survey has its own respondents and period. Exit-survey feedback is in Attrition.
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {loading
            ? "Loading listening data…"
            : data
              ? "As of " + formatLongDate(data.as_of)
              : "Employee Listening"}
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <SyntheticDomainDemo domain="satisfaction" />

      {summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Engagement Favorable
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatMetric(summary.engagement_favorable_pct, 1, "%")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {engagementDelta === null
                  ? data?.data_meta?.listeningWave ?? "2026 Global Engagement"
                  : (engagementDelta >= 0 ? "+" : "") +
                    engagementDelta.toFixed(1) +
                    (data?.data_meta?.listeningPeriod === "quarterly" ? " pts vs prior quarterly wave" : " pts vs prior annual survey")}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Participation
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatMetric(summary.engagement_participation_pct, 1, "%")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWholeCount(summary.engagement_respondents)} of{" "}
                {formatWholeCount(summary.engagement_eligible_population)}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Manager Favorable
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatMetric(summary.manager_favorable_pct, 1, "%")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                2026 Manager Effectiveness Survey
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                90-Day Onboarding
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatMetric(summary.onboarding_90_favorable_pct, 1, "%")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Favorable across 90-day onboarding items
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Engagement Trend
                </h3>
                <p className="text-sm text-muted-foreground">
                  {data.data_meta?.listeningPeriod === "quarterly" ? "Quarterly valid-respondent favorability and participation" : "Annual favorable sentiment and survey participation"}
                </p>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.engagement_trend}
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
                      dataKey="launch_date"
                      tickFormatter={formatYear}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => value + "%"}
                      width={52}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        formatYear(String(value))
                      }
                      formatter={(value) =>
                        typeof value === "number" ? formatPercent(value) : "Unavailable"
                      }
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="favorable_pct"
                      name="Favorable"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="participation_pct"
                      name="Participation"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Solid line = favorable %. Dashed line = participation %.
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  2026 Engagement Dimensions
                </h3>
                <p className="text-sm text-muted-foreground">
                  Favorability by core listening dimension
                </p>
              </div>
              <DimensionList
                rows={data.engagement_dimensions}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6">
            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Engagement by Business Unit
                </h3>
                <p className="text-sm text-muted-foreground">
                  2026 engagement favorability across business units
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4">Business Unit</th>
                      <th className="pb-3 pr-4 text-right">Respondents</th>
                      <th className="pb-3 pr-4 text-right">Avg</th>
                      <th className="pb-3 text-right">Favorable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.business_units.map((row) => (
                      <tr
                        key={row.org_code}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {row.org_name}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {formatWholeCount(row.respondents)}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {formatMetric(row.avg_score, 2)}
                        </td>
                        <td className="py-3 text-right font-semibold">
                          {formatMetric(row.favorable_pct, 1, "%")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Current Listening Signals
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pulse and manager-effectiveness dimensions
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-semibold">
                    Q2 Pulse
                  </p>
                  <DimensionList
                    rows={data.pulse_dimensions}
                  />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold">
                    Manager Effectiveness
                  </p>
                  <DimensionList
                    rows={data.manager_dimensions}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border p-4">
            <div className="mb-4">
              <h3 className="font-semibold">
                Onboarding Experience
              </h3>
              <p className="text-sm text-muted-foreground">
                Favorability progression across 30-, 60-, and 90-day surveys
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              {[
                ["ONB-30", onboarding30],
                ["ONB-60", onboarding60],
                ["ONB-90", onboarding90],
              ].map(([code, rows]) => (
                <div
                  key={String(code)}
                  className="rounded-lg border p-4"
                >
                  <p className="mb-3 font-semibold">
                    {stageLabel(String(code))}
                  </p>
                  <DimensionList
                    rows={rows as SurveyListeningDimension[]}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground">
            {summary.open_text_comments === null
              ? "Open-text survey comment count is unavailable."
              : `${formatWholeCount(summary.open_text_comments)} open-text survey comments across all surveys are available in the synthetic listening dataset; this is not an exit-only count.`} This version does not yet run qualitative theme or sentiment analysis on those comments, so no themes are inferred here.
          </div>
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {loading
            ? "Loading Employee Listening analytics…"
            : "No Employee Listening data returned."}
        </div>
      )}
    </section>
  );
}
