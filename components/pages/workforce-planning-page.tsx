"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  PlanningPoint,
  PlanningScenario,
  PositionBusinessUnit,
  PositionLevel,
  PositionModelingResponse,
  PositionScenario,
  ScenarioModelAssumptions,
  ScenarioModelResponse,
} from "@/lib/types";

type WorkforcePlanningPageProps = {
  planningScenarios: PlanningScenario[];
  planningLoading: boolean;
  planningError: string | null;
  activePlanningScenario: PlanningScenario | undefined;
  activePlanningStart: PlanningPoint | null;
  activePlanningEnd: PlanningPoint | null;
  baselinePlanningEnd: PlanningPoint | null;
  planningNetChange: number | null;
  planningHeadcountDeltaVsBaseline: number | null;
  planningTotalHires: number;
  planningTotalExits: number;
  selectedPlanningScenario: string;
  positionModelingData: PositionModelingResponse | null;
  positionModelingLoading: boolean;
  positionModelingError: string | null;
  activePositionScenario: PositionScenario | null;
  topPositionBusinessUnits: PositionBusinessUnit[];
  positionLevels: PositionLevel[];
  onScenarioChange: (scenario: string) => void;
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

function formatCurrencyCompact(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return "$" + (value / 1_000_000_000).toFixed(2) + "B";
  }

  if (Math.abs(value) >= 1_000_000) {
    return "$" + (value / 1_000_000).toFixed(1) + "M";
  }

  return "$" + Math.round(value).toLocaleString();
}

function formatAssumptionName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const scenarioFields: Array<{
  key: keyof ScenarioModelAssumptions;
  label: string;
  suffix: string;
  step: number;
  help: string;
}> = [
  {
    key: "annual_growth_pct",
    label: "Enterprise Growth",
    suffix: "%",
    step: 0.5,
    help: "Annual enterprise headcount growth assumption.",
  },
  {
    key: "salary_inflation_pct",
    label: "Salary Inflation",
    suffix: "%",
    step: 0.5,
    help: "Annual labor-cost inflation applied to modeled cost per FTE.",
  },
  {
    key: "annual_attrition_pct",
    label: "Annual Attrition",
    suffix: "%",
    step: 0.5,
    help: "Annualized attrition assumption used for modeled exits.",
  },
  {
    key: "fill_rate_pct",
    label: "Opening Fill Rate",
    suffix: "%",
    step: 5,
    help: "Share of modeled hiring demand that is successfully filled.",
  },
  {
    key: "productivity_hiring_reduction_pct",
    label: "AI / Productivity Hiring Reduction",
    suffix: "%",
    step: 5,
    help: "Reduction in gross hiring demand attributed to productivity.",
  },
];

export function WorkforcePlanningPage({
  planningScenarios,
  planningLoading,
  planningError,
  activePlanningScenario,
  activePlanningStart,
  activePlanningEnd,
  baselinePlanningEnd,
  planningNetChange,
  planningHeadcountDeltaVsBaseline,
  planningTotalHires,
  planningTotalExits,
  selectedPlanningScenario,
  positionModelingData,
  positionModelingLoading,
  positionModelingError,
  activePositionScenario,
  topPositionBusinessUnits,
  positionLevels,
  onScenarioChange,
}: WorkforcePlanningPageProps) {
  const [scenarioDefaults, setScenarioDefaults] =
    useState<ScenarioModelAssumptions | null>(null);
  const [customAssumptions, setCustomAssumptions] =
    useState<ScenarioModelAssumptions | null>(null);
  const [customScenario, setCustomScenario] =
    useState<ScenarioModelResponse | null>(null);
  const [customScenarioLoading, setCustomScenarioLoading] =
    useState(false);
  const [customScenarioError, setCustomScenarioError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadScenarioDefaults() {
      try {
        const response = await fetch("/api/scenario-modeler", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load scenario defaults."
          );
        }

        if (!cancelled) {
          setScenarioDefaults(payload.defaults);
          setCustomAssumptions(payload.defaults);
        }
      } catch (error) {
        if (!cancelled) {
          setCustomScenarioError(
            error instanceof Error
              ? error.message
              : "Failed to load scenario defaults."
          );
        }
      }
    }

    loadScenarioDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runCustomScenario() {
    if (!customAssumptions) return;

    try {
      setCustomScenarioLoading(true);
      setCustomScenarioError(null);

      const response = await fetch("/api/scenario-modeler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assumptions: customAssumptions,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run custom scenario."
        );
      }

      setCustomScenario(payload as ScenarioModelResponse);
    } catch (error) {
      setCustomScenarioError(
        error instanceof Error
          ? error.message
          : "Failed to run custom scenario."
      );
    } finally {
      setCustomScenarioLoading(false);
    }
  }

  function resetCustomScenario() {
    if (!scenarioDefaults) return;
    setCustomAssumptions(scenarioDefaults);
    setCustomScenario(null);
    setCustomScenarioError(null);
  }

  return (
<section className="min-w-0 p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Workforce Planning
              </h2>
              <p className="text-muted-foreground">
                Compare 2027 workforce scenarios, headcount trajectories, and labor cost implications.
              </p>
            </div>

            <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {planningLoading
                ? "Loading plan…"
                : "2027 Enterprise Workforce Plan"}
            </span>
          </div>

          {planningError && (
            <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {planningError}
            </div>
          )}

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {planningScenarios.map(
              (scenario) => {
                const end =
                  scenario.points[
                    scenario.points.length -
                      1
                  ];

                const baselineEnd =
                  baselinePlanningEnd
                    ?.planned_headcount ??
                  null;

                const delta =
                  end && baselineEnd !== null
                    ? end.planned_headcount -
                      baselineEnd
                    : null;

                const selected =
                  activePlanningScenario
                    ?.scenario_name ===
                  scenario.scenario_name;

                return (
                  <button
                    key={
                      scenario.scenario_name
                    }
                    type="button"
                    onClick={() =>
                      onScenarioChange(
                        scenario.scenario_name
                      )
                    }
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      selected
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {scenario.scenario_name}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {end
                        ? end.planned_headcount.toLocaleString()
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dec 2027 headcount
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {delta === null
                        ? "—"
                        : delta === 0
                          ? "Baseline"
                          : `${
                              delta > 0
                                ? "+"
                                : ""
                            }${delta.toLocaleString()} vs Baseline`}
                    </p>
                  </button>
                );
              }
            )}
          </div>

          <div className="mb-6 rounded-lg border p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  Custom Scenario
                </h3>
                <p className="text-sm text-muted-foreground">
                  Change explicit planning assumptions and run the deterministic model.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetCustomScenario}
                  disabled={!scenarioDefaults || customScenarioLoading}
                  className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={runCustomScenario}
                  disabled={!customAssumptions || customScenarioLoading}
                  className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {customScenarioLoading
                    ? "Running…"
                    : "Run Scenario"}
                </button>
              </div>
            </div>

            {customAssumptions ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {scenarioFields.map((field) => (
                  <label
                    key={field.key}
                    className="rounded-md border p-3"
                  >
                    <span
                      className="cursor-help border-b border-dotted text-xs font-medium text-muted-foreground"
                      title={field.help}
                    >
                      {field.label}
                    </span>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        step={field.step}
                        value={customAssumptions[field.key]}
                        onChange={(event) =>
                          setCustomAssumptions((current) =>
                            current
                              ? {
                                  ...current,
                                  [field.key]: Number(
                                    event.target.value
                                  ),
                                }
                              : current
                          )
                        }
                        className="min-w-0 flex-1 rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                      />
                      <span className="text-sm text-muted-foreground">
                        {field.suffix}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Loading Baseline assumptions…
              </p>
            )}

            {customScenarioError && (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {customScenarioError}
              </div>
            )}

            {customScenario && (
              <div className="mt-5 border-t pt-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      Modeled Outcome
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deterministic result anchored to the stored Baseline curve
                    </p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    Dec 2027
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      Ending Headcount
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {customScenario.summary.modeled_end_headcount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customScenario.summary.headcount_delta_vs_baseline >= 0
                        ? "+"
                        : ""}
                      {customScenario.summary.headcount_delta_vs_baseline.toLocaleString()} vs Baseline
                    </p>
                  </div>

                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      Ending FTE
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {customScenario.summary.modeled_end_fte.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Modeled capacity
                    </p>
                  </div>

                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      Ending Labor Cost
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {formatCurrencyCompact(
                        customScenario.summary.modeled_end_labor_cost_usd
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customScenario.summary.labor_cost_delta_vs_baseline_usd >= 0
                        ? "+"
                        : ""}
                      {formatCurrencyCompact(
                        customScenario.summary.labor_cost_delta_vs_baseline_usd
                      )} vs Baseline
                    </p>
                  </div>

                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      Target Gap
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {customScenario.summary.headcount_gap_vs_target >= 0
                        ? "+"
                        : ""}
                      {customScenario.summary.headcount_gap_vs_target.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Modeled HC minus target HC
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {planningLoading &&
          planningScenarios.length === 0 ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Loading workforce planning scenarios…
            </div>
          ) : activePlanningScenario &&
            activePlanningEnd ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Starting Headcount
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {activePlanningStart
                      ? activePlanningStart.planned_headcount.toLocaleString()
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Beginning of planning horizon
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Dec 2027 Headcount
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {activePlanningEnd.planned_headcount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {planningNetChange === null
                      ? "—"
                      : `${
                          planningNetChange >= 0
                            ? "+"
                            : ""
                        }${planningNetChange.toLocaleString()} across horizon`}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Year-End Labor Cost
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {formatCurrencyCompact(
                      activePlanningEnd.planned_labor_cost_usd
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Planned annualized labor cost
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
                      : `${
                          planningHeadcountDeltaVsBaseline >=
                          0
                            ? "+"
                            : ""
                        }${planningHeadcountDeltaVsBaseline.toLocaleString()}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dec 2027 headcount difference
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <div className="rounded-lg border p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {activePlanningScenario.scenario_name} Headcount Plan
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Monthly planned headcount through December 2027
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Planned hires / exits
                      </p>
                      <p className="font-semibold">
                        {planningTotalHires.toLocaleString()} /{" "}
                        {planningTotalExits.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="h-80 w-full">
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
                            value.toLocaleString()
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
                            Number(
                              value
                            ).toLocaleString(),
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

              <div className="mt-6 rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-semibold">
                    Scenario Comparison
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    December 2027 outcomes across the enterprise plan
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4">
                          Scenario
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          Headcount
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          FTE
                        </th>
                        <th className="pb-3 pr-4 text-right">
                          vs Baseline
                        </th>
                        <th className="pb-3 text-right">
                          Labor Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {planningScenarios.map(
                        (scenario) => {
                          const end =
                            scenario.points[
                              scenario.points
                                .length - 1
                            ];
                          const baselineHC =
                            baselinePlanningEnd
                              ?.planned_headcount ??
                            null;
                          const delta =
                            end &&
                            baselineHC !== null
                              ? end.planned_headcount -
                                baselineHC
                              : null;

                          return (
                            <tr
                              key={
                                scenario.scenario_name
                              }
                              className="border-b last:border-0"
                            >
                              <td className="py-3 pr-4 font-medium">
                                {scenario.scenario_name}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {end
                                  ? end.planned_headcount.toLocaleString()
                                  : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {end
                                  ? end.planned_fte.toLocaleString()
                                  : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {delta === null
                                  ? "—"
                                  : `${
                                      delta > 0
                                        ? "+"
                                        : ""
                                    }${delta.toLocaleString()}`}
                              </td>
                              <td className="py-3 text-right">
                                {end
                                  ? formatCurrencyCompact(
                                      end.planned_labor_cost_usd
                                    )
                                  : "—"}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>


              <div className="mt-6 rounded-lg border p-4">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      Position Modeling
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Authorized positions today versus December 2027 under the selected scenario
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {positionModelingLoading
                      ? "Loading positions…"
                      : selectedPlanningScenario}
                  </span>
                </div>

                {positionModelingError && (
                  <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {positionModelingError}
                  </div>
                )}

                {positionModelingData &&
                activePositionScenario ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Current Positions
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {positionModelingData.current.current_positions.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {positionModelingData.current.filled_positions.toLocaleString()} filled ·{" "}
                          {positionModelingData.current.vacant_positions.toLocaleString()} vacant
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Vacancy Rate
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {positionModelingData.current.vacancy_rate_pct.toFixed(
                            1
                          )}
                          %
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Current authorized positions
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Dec 2027 Planned Positions
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {activePositionScenario.totals.planned_positions.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activePositionScenario.scenario_name} scenario
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                          Net Position Change
                        </p>
                        <p className="mt-2 text-3xl font-semibold">
                          {activePositionScenario.totals.net_position_change >=
                          0
                            ? "+"
                            : ""}
                          {activePositionScenario.totals.net_position_change.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Planned positions vs current
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                      Positions represent authorized roles, while headcount represents people.
                      Planned position totals can therefore differ slightly from planned headcount.
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                      <div className="rounded-lg border p-4">
                        <div className="mb-4">
                          <h4 className="font-semibold">
                            Position Change by Business Unit
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Largest absolute changes under{" "}
                            {activePositionScenario.scenario_name}
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] text-sm">
                            <thead>
                              <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="pb-3 pr-4">
                                  Business Unit
                                </th>
                                <th className="pb-3 pr-4 text-right">
                                  Current
                                </th>
                                <th className="pb-3 pr-4 text-right">
                                  Planned
                                </th>
                                <th className="pb-3 text-right">
                                  Change
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {topPositionBusinessUnits.map(
                                (row) => (
                                  <tr
                                    key={row.org_code}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-3 pr-4 font-medium">
                                      {row.org_name}
                                    </td>
                                    <td className="py-3 pr-4 text-right">
                                      {row.current_positions.toLocaleString()}
                                    </td>
                                    <td className="py-3 pr-4 text-right">
                                      {row.planned_positions.toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right font-semibold">
                                      {row.net_position_change >
                                      0
                                        ? "+"
                                        : ""}
                                      {row.net_position_change.toLocaleString()}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="mb-4">
                          <h4 className="font-semibold">
                            Position Change by Level
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Current versus Dec 2027 planned structure
                          </p>
                        </div>

                        <div className="max-h-[360px] overflow-y-auto overflow-x-hidden pr-1">
                          <table className="w-full table-fixed text-sm">
                            <colgroup>
                              <col className="w-[42%]" />
                              <col className="w-[18%]" />
                              <col className="w-[18%]" />
                              <col className="w-[22%]" />
                            </colgroup>

                            <thead className="sticky top-0 z-10 bg-background">
                              <tr className="border-b text-left text-[11px] text-muted-foreground">
                                <th className="pb-3 pr-2">
                                  Level
                                </th>
                                <th className="pb-3 px-1 text-right">
                                  Current
                                </th>
                                <th className="pb-3 px-1 text-right">
                                  Planned
                                </th>
                                <th className="pb-3 pl-1 text-right">
                                  Change
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {positionLevels.map(
                                (row) => (
                                  <tr
                                    key={row.level_code}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-3 pr-2 font-medium leading-tight">
                                      {row.level_name}
                                    </td>
                                    <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                                      {row.current_positions.toLocaleString()}
                                    </td>
                                    <td className="px-1 py-3 text-right tabular-nums whitespace-nowrap">
                                      {row.planned_positions.toLocaleString()}
                                    </td>
                                    <td className="py-3 pl-1 text-right font-semibold tabular-nums whitespace-nowrap">
                                      {row.net_position_change >
                                      0
                                        ? "+"
                                        : ""}
                                      {row.net_position_change.toLocaleString()}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {positionModelingLoading
                      ? "Loading position modeling…"
                      : "No position modeling data returned."}
                  </div>
                )}
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
        </section>
  );
}
