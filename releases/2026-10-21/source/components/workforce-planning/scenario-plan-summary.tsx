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
  formatCurrencyCompact,
  formatSignedWholeDelta,
  formatWholeCount,
} from "@/lib/display-format";
import type {
  PlanningPoint,
  PlanningScenario,
} from "@/lib/types";

type ScenarioPlanSummaryProps = {
  visible: boolean;
  planningLoading: boolean;
  planningScenarios: PlanningScenario[];
  activePlanningScenario: PlanningScenario | undefined;
  activePlanningStart: PlanningPoint | null;
  activePlanningEnd: PlanningPoint | null;
  planningNetChange: number | null;
  planningHeadcountDeltaVsBaseline: number | null;
  planningTotalHires: number | null;
  planningTotalExits: number | null;
};

function formatMonth(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatLongDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAssumptionName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ScenarioPlanSummary({
  visible,
  planningLoading,
  planningScenarios,
  activePlanningScenario,
  activePlanningStart,
  activePlanningEnd,
  planningNetChange,
  planningHeadcountDeltaVsBaseline,
  planningTotalHires,
  planningTotalExits,
}: ScenarioPlanSummaryProps) {
  const draftProvenance=activePlanningScenario?.provenance?.status==='constructed_draft_assumption'?activePlanningScenario.provenance:null;
  const carriedSeptemberOpening=Boolean(draftProvenance &&
    draftProvenance.history_cutoff==='2026-09-30' &&
    draftProvenance.planning_start==='2027-01-01' &&
    draftProvenance.planning_end==='2027-12-01');
  return (
    <>
          {planningLoading &&
          planningScenarios.length === 0 ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Loading workforce planning scenarios…
            </div>
          ) : activePlanningScenario &&
            activePlanningEnd ? (
            <>
              <div
                className={
                  visible
                    ? "evidence-metric-grid grid gap-4"
                    : "hidden"
                }
              >
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    {carriedSeptemberOpening ? "January plan opening" : "Starting Headcount"}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {activePlanningStart
                      ? formatWholeCount(activePlanningStart.planned_headcount)
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {carriedSeptemberOpening ? "Based on September 2026 headcount; January actuals are not supplied." : "Beginning of planning horizon"}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Dec 2027 Headcount
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatWholeCount(activePlanningEnd.planned_headcount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {planningNetChange === null
                      ? "—"
                      : `${formatSignedWholeDelta(planningNetChange)} across horizon`}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    End-plan source cost
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatCurrencyCompact(
                      activePlanningEnd.planned_labor_cost_usd
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source cost period unverified
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Net vs Baseline
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {planningHeadcountDeltaVsBaseline ===
                    null
                      ? "—"
                      : formatSignedWholeDelta(planningHeadcountDeltaVsBaseline)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dec 2027 headcount difference
                  </p>
                </div>
              </div>

              <div
                className={
                  visible
                    ? "mt-6 evidence-panel-grid grid gap-6"
                    : "hidden"
                }
              >
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {activePlanningScenario.scenario_name} Headcount Plan
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Stored company-wide plan for the returned months
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Stored hires / exits · returned month window
                      </p>
                      <p className="font-semibold">
                        {formatWholeCount(planningTotalHires)} /{" "}
                        {formatWholeCount(planningTotalExits)}
                      </p>
                    </div>
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">
                    {carriedSeptemberOpening ? <>October–December 2026 is unmodeled. January–December 2027 values are conditional planning assumptions. Source refresh time is unavailable.</> : draftProvenance ? <>{draftProvenance.reconciliation} History ends {draftProvenance.history_cutoff}. Source refresh time is unavailable.</> : <>Source-reported monthly flows across the returned month window. Missing, duplicate or invalid months and unknown flow values leave totals unavailable. Full horizon boundaries and source refresh date are not supplied. These flows are not observed actuals. Their completeness and reconciliation with the aligned Baseline headcount curve remain unverified; what-if engine flows are separate.</>}
                  </p>
                  <div className="evidence-chart">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart
                        data={
                          activePlanningScenario.points
                        }
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
                          dataKey="planning_month"
                          tickFormatter={
                            formatMonth
                          }
                          minTickGap={24}
                          tick={{
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          domain={[
                            (
                              dataMin: number
                            ) =>
                              Math.max(
                                0,
                                Math.floor(
                                  dataMin *
                                    0.97
                                )
                              ),
                            (
                              dataMax: number
                            ) =>
                              Math.ceil(
                                dataMax *
                                  1.03
                              ),
                          ]}
                          tickFormatter={(
                            value: number
                          ) =>
                            formatWholeCount(value)
                          }
                          width={64}
                          tick={{
                            fontSize: 12,
                          }}
                        />
                        <Tooltip
                          labelFormatter={(
                            value
                          ) =>
                            formatLongDate(
                              String(value)
                            )
                          }
                          formatter={(
                            value
                          ) => [
                            typeof value === "number" ? formatWholeCount(value) : "Unavailable",
                            "Planned headcount",
                          ]}
                          contentStyle={{
                            backgroundColor:
                              "var(--background)",
                            border:
                              "1px solid var(--border)",
                            borderRadius:
                              "0.5rem",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="planned_headcount"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{
                            r: 5,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">
                    Scenario Assumptions
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Inputs stored with the{" "}
                    {activePlanningScenario.scenario_name} scenario
                  </p>

                  <div className="space-y-3">
                    {activePlanningScenario
                      .assumptions.length >
                    0 ? (
                      activePlanningScenario.assumptions.map(
                        (assumption) => (
                          <div
                            key={
                              assumption.assumption_name
                            }
                            className="rounded-md border p-3"
                          >
                            <p className="text-xs font-medium text-muted-foreground">
                              {formatAssumptionName(
                                assumption.assumption_name
                              )}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {assumption.assumption_text ??
                                (assumption.assumption_value !==
                                null
                                  ? assumption.assumption_value.toLocaleString()
                                  : "—")}
                            </p>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No stored assumptions were returned for this scenario.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            !planningLoading && (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                No workforce planning scenarios were returned.
              </div>
            )
          )}
    </>
  );
}
