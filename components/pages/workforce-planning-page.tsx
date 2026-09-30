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
  BusinessUnitScenarioOption,
  BusinessUnitScenarioResponse,
  PlanningPoint,
  PlanningScenario,
  PositionActionAssumptions,
  PositionActionScenarioResponse,
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
  onExplainCustomScenario: (
    scenario: ScenarioModelResponse
  ) => void | Promise<void>;
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
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return sign + "$" + (absoluteValue / 1_000_000_000).toFixed(2) + "B";
  }

  if (absoluteValue >= 1_000_000) {
    return sign + "$" + (absoluteValue / 1_000_000).toFixed(1) + "M";
  }

  return sign + "$" + Math.round(absoluteValue).toLocaleString();
}

function formatAssumptionName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type SavedScenarioEntry = {
  id: string;
  name: string;
  saved_at: string;
  scenario: ScenarioModelResponse;
};

const SAVED_SCENARIOS_STORAGE_KEY =
  "people-analytics.saved-workforce-scenarios.v1";

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
  onExplainCustomScenario,
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
  const [scenarioName, setScenarioName] =
    useState("");
  const [savedScenarios, setSavedScenarios] =
    useState<SavedScenarioEntry[]>([]);
  const [comparisonScenarioIds, setComparisonScenarioIds] =
    useState<string[]>([]);
  const [segmentView, setSegmentView] =
    useState<"business-units" | "job-families">(
      "business-units"
    );
  const [buScenarioOptions, setBuScenarioOptions] =
    useState<BusinessUnitScenarioOption[]>([]);
  const [selectedBuScenario, setSelectedBuScenario] =
    useState("");
  const [buScenarioAssumptions, setBuScenarioAssumptions] =
    useState<ScenarioModelAssumptions | null>(null);
  const [buScenarioResult, setBuScenarioResult] =
    useState<BusinessUnitScenarioResponse | null>(null);
  const [buScenarioLoading, setBuScenarioLoading] =
    useState(false);
  const [buScenarioError, setBuScenarioError] =
    useState<string | null>(null);
  const [
    positionActionDefaults,
    setPositionActionDefaults,
  ] =
    useState<PositionActionAssumptions | null>(
      null
    );
  const [
    positionActionAssumptions,
    setPositionActionAssumptions,
  ] =
    useState<PositionActionAssumptions | null>(
      null
    );
  const [
    positionActionResult,
    setPositionActionResult,
  ] =
    useState<PositionActionScenarioResponse | null>(
      null
    );
  const [
    positionActionLoading,
    setPositionActionLoading,
  ] = useState(false);
  const [
    positionActionError,
    setPositionActionError,
  ] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        SAVED_SCENARIOS_STORAGE_KEY
      );

      if (!stored) return;

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const validEntries = parsed.filter(
          (item): item is SavedScenarioEntry =>
            Boolean(
              item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                item.scenario?.summary &&
                item.scenario?.assumptions
            )
        );

        setSavedScenarios(validEntries);
        setComparisonScenarioIds(
          validEntries
            .slice(0, 3)
            .map((entry) => entry.id)
        );
      }
    } catch {
      // Ignore invalid or unavailable browser storage.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPositionActionDefaults() {
      try {
        const response = await fetch(
          "/api/position-actions",
          { cache: "no-store" }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load position action model."
          );
        }

        if (!cancelled) {
          setPositionActionDefaults(
            payload.defaults as
              PositionActionAssumptions
          );
          setPositionActionAssumptions(
            payload.defaults as
              PositionActionAssumptions
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPositionActionError(
            error instanceof Error
              ? error.message
              : "Failed to load position action model."
          );
        }
      }
    }

    loadPositionActionDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBusinessUnitScenarioCatalog() {
      try {
        const response = await fetch(
          "/api/business-unit-scenario",
          { cache: "no-store" }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load business-unit scenario options."
          );
        }

        if (!cancelled) {
          const options =
            payload.business_units as
              BusinessUnitScenarioOption[];
          setBuScenarioOptions(options);
          setSelectedBuScenario(
            options[0]?.org_code ?? ""
          );
          setBuScenarioAssumptions(
            payload.defaults as
              ScenarioModelAssumptions
          );
        }
      } catch (error) {
        if (!cancelled) {
          setBuScenarioError(
            error instanceof Error
              ? error.message
              : "Failed to load business-unit scenario options."
          );
        }
      }
    }

    loadBusinessUnitScenarioCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

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

  async function runBuScenario() {
    if (
      !selectedBuScenario ||
      !buScenarioAssumptions
    ) {
      return;
    }

    try {
      setBuScenarioLoading(true);
      setBuScenarioError(null);

      const response = await fetch(
        "/api/business-unit-scenario",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            business_unit:
              selectedBuScenario,
            ...buScenarioAssumptions,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run business-unit scenario."
        );
      }

      setBuScenarioResult(
        payload as BusinessUnitScenarioResponse
      );
    } catch (error) {
      setBuScenarioError(
        error instanceof Error
          ? error.message
          : "Failed to run business-unit scenario."
      );
    } finally {
      setBuScenarioLoading(false);
    }
  }

  function resetBuScenario() {
    if (!scenarioDefaults) return;
    setBuScenarioAssumptions(
      scenarioDefaults
    );
    setBuScenarioResult(null);
    setBuScenarioError(null);
  }

  async function runPositionActions() {
    if (!positionActionAssumptions) {
      return;
    }

    try {
      setPositionActionLoading(true);
      setPositionActionError(null);

      const response = await fetch(
        "/api/position-actions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            positionActionAssumptions
          ),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run position action scenario."
        );
      }

      setPositionActionResult(
        payload as PositionActionScenarioResponse
      );
    } catch (error) {
      setPositionActionError(
        error instanceof Error
          ? error.message
          : "Failed to run position action scenario."
      );
    } finally {
      setPositionActionLoading(false);
    }
  }

  function resetPositionActions() {
    if (!positionActionDefaults) return;
    setPositionActionAssumptions(
      positionActionDefaults
    );
    setPositionActionResult(null);
    setPositionActionError(null);
  }

  function persistSavedScenarios(
    next: SavedScenarioEntry[]
  ) {
    setSavedScenarios(next);

    try {
      window.localStorage.setItem(
        SAVED_SCENARIOS_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      // Keep the in-session copy if browser storage is unavailable.
    }
  }

  function saveCustomScenario() {
    if (!customScenario) return;

    const name =
      scenarioName.trim() ||
      `Scenario ${savedScenarios.length + 1}`;

    const entry: SavedScenarioEntry = {
      id:
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${savedScenarios.length + 1}`,
      name,
      saved_at: new Date().toISOString(),
      scenario: customScenario,
    };

    const next = [entry, ...savedScenarios];
    persistSavedScenarios(next);
    setScenarioName("");

    setComparisonScenarioIds((current) =>
      current.length < 3
        ? [entry.id, ...current]
        : current
    );
  }

  function deleteSavedScenario(id: string) {
    persistSavedScenarios(
      savedScenarios.filter(
        (entry) => entry.id !== id
      )
    );
    setComparisonScenarioIds((current) =>
      current.filter(
        (scenarioId) => scenarioId !== id
      )
    );
  }

  function toggleScenarioComparison(id: string) {
    setComparisonScenarioIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (scenarioId) => scenarioId !== id
        );
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, id];
    });
  }

  const comparedSavedScenarios =
    comparisonScenarioIds
      .map((id) =>
        savedScenarios.find(
          (entry) => entry.id === id
        )
      )
      .filter(
        (entry): entry is SavedScenarioEntry =>
          Boolean(entry)
      );

  const segmentRows =
    customScenario?.segment_breakdown
      ? segmentView === "business-units"
        ? customScenario.segment_breakdown
            .business_units
        : customScenario.segment_breakdown
            .job_families
      : [];

  const selectedBuOption =
    buScenarioOptions.find(
      (row) =>
        row.org_code ===
        selectedBuScenario
    ) ?? null;

  const visibleSegmentRows =
    [...segmentRows]
      .sort(
        (a, b) =>
          Math.abs(
            b.headcount_delta_vs_baseline
          ) -
          Math.abs(
            a.headcount_delta_vs_baseline
          )
      )
      .slice(
        0,
        segmentView === "business-units"
          ? 8
          : 12
      );

  const comparisonRows: Array<{
    label: string;
    baseline: string;
    value: (entry: SavedScenarioEntry) => string;
  }> = [
    {
      label: "Ending Headcount",
      baseline:
        baselinePlanningEnd?.planned_headcount.toLocaleString() ??
        "—",
      value: (entry) =>
        entry.scenario.summary.modeled_end_headcount.toLocaleString(),
    },
    {
      label: "HC Δ vs Baseline",
      baseline: "0",
      value: (entry) => {
        const value =
          entry.scenario.summary.headcount_delta_vs_baseline;
        return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
      },
    },
    {
      label: "Ending FTE",
      baseline:
        baselinePlanningEnd?.planned_fte.toLocaleString() ??
        "—",
      value: (entry) =>
        entry.scenario.summary.modeled_end_fte.toLocaleString(),
    },
    {
      label: "Ending Labor Cost",
      baseline:
        baselinePlanningEnd
          ? formatCurrencyCompact(
              baselinePlanningEnd.planned_labor_cost_usd
            )
          : "—",
      value: (entry) =>
        formatCurrencyCompact(
          entry.scenario.summary.modeled_end_labor_cost_usd
        ),
    },
    {
      label: "Labor Cost Δ",
      baseline: "$0",
      value: (entry) =>
        formatCurrencyCompact(
          entry.scenario.summary
            .labor_cost_delta_vs_baseline_usd
        ),
    },
    {
      label: "Enterprise Growth",
      baseline: scenarioDefaults
        ? `${scenarioDefaults.annual_growth_pct.toFixed(1)}%`
        : "—",
      value: (entry) =>
        `${entry.scenario.assumptions.annual_growth_pct.toFixed(1)}%`,
    },
    {
      label: "Salary Inflation",
      baseline: scenarioDefaults
        ? `${scenarioDefaults.salary_inflation_pct.toFixed(1)}%`
        : "—",
      value: (entry) =>
        `${entry.scenario.assumptions.salary_inflation_pct.toFixed(1)}%`,
    },
    {
      label: "Annual Attrition",
      baseline: scenarioDefaults
        ? `${scenarioDefaults.annual_attrition_pct.toFixed(1)}%`
        : "—",
      value: (entry) =>
        `${entry.scenario.assumptions.annual_attrition_pct.toFixed(1)}%`,
    },
    {
      label: "Fill Rate",
      baseline: scenarioDefaults
        ? `${scenarioDefaults.fill_rate_pct.toFixed(1)}%`
        : "—",
      value: (entry) =>
        `${entry.scenario.assumptions.fill_rate_pct.toFixed(1)}%`,
    },
    {
      label: "AI / Productivity Reduction",
      baseline: scenarioDefaults
        ? `${scenarioDefaults.productivity_hiring_reduction_pct.toFixed(1)}%`
        : "—",
      value: (entry) =>
        `${entry.scenario.assumptions.productivity_hiring_reduction_pct.toFixed(1)}%`,
    },
  ];

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
                {scenarioFields.map((field) => {
                  const baseline =
                    scenarioDefaults?.[field.key] ?? null;
                  const currentValue =
                    customAssumptions[field.key];
                  const delta =
                    baseline === null
                      ? null
                      : currentValue - baseline;

                  return (
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
                          value={currentValue}
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
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Baseline{" "}
                        {baseline === null
                          ? "—"
                          : baseline.toFixed(1) + field.suffix}
                        {delta !== null && (
                          <>
                            {" · "}
                            <span className="font-medium">
                              {delta === 0
                                ? "No change"
                                : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pp`}
                            </span>
                          </>
                        )}
                      </p>
                    </label>
                  );
                })}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void onExplainCustomScenario(
                          customScenario
                        )
                      }
                      className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      Explain with AI
                    </button>
                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      Dec 2027
                    </span>
                  </div>
                </div>

                <div className="mb-4 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <span className="font-medium">
                    Impact vs Baseline:
                  </span>{" "}
                  <span className="tabular-nums">
                    {customScenario.summary.headcount_delta_vs_baseline >= 0
                      ? "+"
                      : ""}
                    {customScenario.summary.headcount_delta_vs_baseline.toLocaleString()} HC
                    {" · "}
                    {customScenario.summary.labor_cost_delta_vs_baseline_usd >= 0
                      ? "+"
                      : ""}
                    {formatCurrencyCompact(
                      customScenario.summary.labor_cost_delta_vs_baseline_usd
                    )} labor cost
                    {" · "}
                    {customScenario.summary.headcount_gap_vs_target >= 0
                      ? "+"
                      : ""}
                    {customScenario.summary.headcount_gap_vs_target.toLocaleString()} vs target
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <input
                    value={scenarioName}
                    onChange={(event) =>
                      setScenarioName(
                        event.target.value
                      )
                    }
                    placeholder="Scenario name"
                    className="min-w-[220px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveCustomScenario}
                    className="rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Save Scenario
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    Saved in this browser
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

                <div className="mt-5 rounded-md border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        Baseline vs Custom Trajectory
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Monthly headcount across the planning horizon
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <span className="h-0.5 w-5 bg-foreground" />
                        Custom
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-5 border-t border-dashed border-muted-foreground" />
                        Baseline
                      </span>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={customScenario.points}
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
                          tickFormatter={formatMonth}
                          minTickGap={24}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          domain={[
                            (dataMin: number) =>
                              Math.max(
                                0,
                                Math.floor(dataMin * 0.97)
                              ),
                            (dataMax: number) =>
                              Math.ceil(dataMax * 1.03),
                          ]}
                          tickFormatter={(value: number) =>
                            value.toLocaleString()
                          }
                          width={62}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          labelFormatter={(value) =>
                            formatLongDate(String(value))
                          }
                          formatter={(value, name) => [
                            Number(value).toLocaleString(),
                            name === "modeled_headcount"
                              ? "Custom scenario"
                              : "Baseline",
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
                          dataKey="baseline_headcount"
                          stroke="var(--muted-foreground)"
                          strokeWidth={2}
                          strokeDasharray="6 5"
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="modeled_headcount"
                          stroke="currentColor"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {customScenario.segment_breakdown && (
                  <div className="mt-5 rounded-md border p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          Segment Impact
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dec 2027 enterprise scenario decomposed using stored Baseline segment mix
                        </p>
                      </div>

                      <div className="flex rounded-md border p-1">
                        <button
                          type="button"
                          onClick={() =>
                            setSegmentView(
                              "business-units"
                            )
                          }
                          className={`rounded px-3 py-1.5 text-xs transition-colors ${
                            segmentView ===
                            "business-units"
                              ? "bg-muted font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Business Units
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSegmentView(
                              "job-families"
                            )
                          }
                          className={`rounded px-3 py-1.5 text-xs transition-colors ${
                            segmentView ===
                            "job-families"
                              ? "bg-muted font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Job Families
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                      {
                        customScenario
                          .segment_breakdown
                          .allocation_method
                      }
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-3 pr-4">
                              {segmentView ===
                              "business-units"
                                ? "Business Unit"
                                : "Job Family"}
                            </th>
                            <th className="pb-3 px-3 text-right">
                              Baseline HC
                            </th>
                            <th className="pb-3 px-3 text-right">
                              Modeled HC
                            </th>
                            <th className="pb-3 px-3 text-right">
                              HC Δ
                            </th>
                            <th className="pb-3 pl-3 text-right">
                              Labor Cost Δ
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleSegmentRows.map(
                            (row) => (
                              <tr
                                key={
                                  row.segment_code
                                }
                                className="border-b last:border-0"
                              >
                                <td className="py-3 pr-4 font-medium">
                                  {
                                    row.segment_name
                                  }
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                  {row.baseline_headcount.toLocaleString()}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                  {row.modeled_headcount.toLocaleString()}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                  {row.headcount_delta_vs_baseline >
                                  0
                                    ? "+"
                                    : ""}
                                  {row.headcount_delta_vs_baseline.toLocaleString()}
                                </td>
                                <td className="py-3 pl-3 text-right tabular-nums">
                                  {row.labor_cost_delta_vs_baseline_usd >=
                                  0
                                    ? "+"
                                    : ""}
                                  {formatCurrencyCompact(
                                    row.labor_cost_delta_vs_baseline_usd
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Showing{" "}
                      {visibleSegmentRows.length}{" "}
                      {segmentView ===
                      "business-units"
                        ? "business units"
                        : "job families"}{" "}
                      ranked by absolute headcount impact.
                      Minor HC reconciliation differences
                      reflect rounded source segment
                      headcount; labor-cost allocations
                      reconcile to the enterprise result.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-6 rounded-lg border p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  Business Unit What-if
                </h3>
                <p className="text-sm text-muted-foreground">
                  True deterministic rerun of one business unit using its own current workforce and monthly Baseline plan.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetBuScenario}
                  disabled={
                    !buScenarioAssumptions ||
                    buScenarioLoading
                  }
                  className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={runBuScenario}
                  disabled={
                    !selectedBuScenario ||
                    !buScenarioAssumptions ||
                    buScenarioLoading
                  }
                  className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {buScenarioLoading
                    ? "Running…"
                    : "Run BU Scenario"}
                </button>
              </div>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_2fr]">
              <label className="rounded-md border p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Business Unit
                </span>
                <select
                  value={selectedBuScenario}
                  onChange={(event) => {
                    setSelectedBuScenario(
                      event.target.value
                    );
                    setBuScenarioResult(null);
                    setBuScenarioError(null);
                  }}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {buScenarioOptions.map(
                    (option) => (
                      <option
                        key={option.org_code}
                        value={option.org_code}
                      >
                        {option.org_name}
                      </option>
                    )
                  )}
                </select>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {selectedBuOption
                    ? selectedBuOption.headcount.toLocaleString() +
                      " current HC · " +
                      selectedBuOption.fte.toLocaleString() +
                      " FTE"
                    : "Loading business units…"}
                </p>
              </label>

              {buScenarioAssumptions ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {scenarioFields.map(
                    (field) => (
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
                            value={
                              buScenarioAssumptions[
                                field.key
                              ]
                            }
                            onChange={(event) =>
                              setBuScenarioAssumptions(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        [field.key]:
                                          Number(
                                            event
                                              .target
                                              .value
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
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  Loading BU scenario assumptions…
                </div>
              )}
            </div>

            <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              This is independent from the enterprise scenario above. The selected BU is rerun on its own Baseline curve. Enterprise implied impact holds every other BU at Baseline.
            </div>

            {buScenarioError && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {buScenarioError}
              </div>
            )}

            {buScenarioResult && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    BU Ending Headcount
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {buScenarioResult.summary.modeled_end_headcount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {buScenarioResult.summary.headcount_delta_vs_baseline >= 0
                      ? "+"
                      : ""}
                    {buScenarioResult.summary.headcount_delta_vs_baseline.toLocaleString()} vs BU Baseline
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    BU Labor Cost
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrencyCompact(
                      buScenarioResult.summary
                        .modeled_end_labor_cost_usd
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {buScenarioResult.summary.labor_cost_delta_vs_baseline_usd >= 0
                      ? "+"
                      : ""}
                    {formatCurrencyCompact(
                      buScenarioResult.summary
                        .labor_cost_delta_vs_baseline_usd
                    )} vs BU Baseline
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Enterprise Implied HC
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {buScenarioResult.enterprise_impact.implied_end_headcount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only {buScenarioResult.scope.org_name} changed
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Enterprise Implied Cost
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrencyCompact(
                      buScenarioResult.enterprise_impact
                        .implied_end_labor_cost_usd
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {buScenarioResult.enterprise_impact.labor_cost_delta_vs_baseline_usd >= 0
                      ? "+"
                      : ""}
                    {formatCurrencyCompact(
                      buScenarioResult.enterprise_impact
                        .labor_cost_delta_vs_baseline_usd
                    )} vs enterprise Baseline
                  </p>
                </div>
              </div>
            )}
          </div>

          {savedScenarios.length > 0 && (
            <div className="mb-6 rounded-lg border p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    Saved Scenario Comparison
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Browser-local scenarios. Select up to three to compare with Baseline.
                  </p>
                </div>
                <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  {comparisonScenarioIds.length}/3 selected
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {savedScenarios.map((entry) => {
                  const selected =
                    comparisonScenarioIds.includes(
                      entry.id
                    );
                  const selectionLimitReached =
                    comparisonScenarioIds.length >= 3 &&
                    !selected;

                  return (
                    <div
                      key={entry.id}
                      className="rounded-md border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex min-w-0 items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={selectionLimitReached}
                            onChange={() =>
                              toggleScenarioComparison(
                                entry.id
                              )
                            }
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {entry.name}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              Saved{" "}
                              {new Date(
                                entry.saved_at
                              ).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            deleteSavedScenario(
                              entry.id
                            )
                          }
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground">
                            Ending HC
                          </p>
                          <p className="mt-1 font-semibold tabular-nums">
                            {entry.scenario.summary.modeled_end_headcount.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded border p-2">
                          <p className="text-muted-foreground">
                            HC vs Base
                          </p>
                          <p className="mt-1 font-semibold tabular-nums">
                            {entry.scenario.summary.headcount_delta_vs_baseline >
                            0
                              ? "+"
                              : ""}
                            {entry.scenario.summary.headcount_delta_vs_baseline.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {comparedSavedScenarios.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4">
                          Metric
                        </th>
                        <th className="pb-3 px-3 text-right">
                          Baseline
                        </th>
                        {comparedSavedScenarios.map(
                          (entry) => (
                            <th
                              key={entry.id}
                              className="pb-3 px-3 text-right"
                            >
                              {entry.name}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium">
                            {row.label}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {row.baseline}
                          </td>
                          {comparedSavedScenarios.map(
                            (entry) => (
                              <td
                                key={entry.id}
                                className="px-3 py-3 text-right tabular-nums"
                              >
                                {row.value(entry)}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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

                <div className="mb-5 rounded-md border p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">
                        Position Action Simulator
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Model changes to the current authorized position inventory without changing source records.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetPositionActions}
                        disabled={
                          !positionActionDefaults ||
                          positionActionLoading
                        }
                        className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={runPositionActions}
                        disabled={
                          !positionActionAssumptions ||
                          positionActionLoading
                        }
                        className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {positionActionLoading
                          ? "Running…"
                          : "Run Position Scenario"}
                      </button>
                    </div>
                  </div>

                  {positionActionAssumptions ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <label className="rounded-md border p-3">
                        <span
                          className="cursor-help border-b border-dotted text-xs font-medium text-muted-foreground"
                          title="New authorized roles added to the inventory. They enter the model as open vacancies."
                        >
                          Add Positions
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={
                            positionActionAssumptions.add_positions
                          }
                          onChange={(event) =>
                            setPositionActionAssumptions(
                              (current) =>
                                current
                                  ? {
                                      ...current,
                                      add_positions:
                                        Number(
                                          event.target
                                            .value
                                        ),
                                    }
                                  : current
                            )
                          }
                          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-right text-sm tabular-nums"
                        />
                      </label>

                      <label className="rounded-md border p-3">
                        <span
                          className="cursor-help border-b border-dotted text-xs font-medium text-muted-foreground"
                          title="Close currently vacant positions only. Filled positions are not eliminated in this model."
                        >
                          Close Vacant Positions
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={
                            positionActionAssumptions.close_vacant_positions
                          }
                          onChange={(event) =>
                            setPositionActionAssumptions(
                              (current) =>
                                current
                                  ? {
                                      ...current,
                                      close_vacant_positions:
                                        Number(
                                          event.target
                                            .value
                                        ),
                                    }
                                  : current
                            )
                          }
                          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-right text-sm tabular-nums"
                        />
                      </label>

                      <label className="rounded-md border p-3">
                        <span
                          className="cursor-help border-b border-dotted text-xs font-medium text-muted-foreground"
                          title="Freeze open vacancies. Frozen roles remain authorized but are removed from the fillable vacancy pool."
                        >
                          Freeze Vacancies
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={
                            positionActionAssumptions.freeze_vacancies
                          }
                          onChange={(event) =>
                            setPositionActionAssumptions(
                              (current) =>
                                current
                                  ? {
                                      ...current,
                                      freeze_vacancies:
                                        Number(
                                          event.target
                                            .value
                                        ),
                                    }
                                  : current
                            )
                          }
                          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-right text-sm tabular-nums"
                        />
                      </label>

                      <label className="rounded-md border p-3">
                        <span
                          className="cursor-help border-b border-dotted text-xs font-medium text-muted-foreground"
                          title="Share of remaining fillable vacancies expected to be staffed in this position scenario."
                        >
                          Fill Open Vacancies
                        </span>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={5}
                            value={
                              positionActionAssumptions.vacancy_fill_pct
                            }
                            onChange={(event) =>
                              setPositionActionAssumptions(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        vacancy_fill_pct:
                                          Number(
                                            event.target
                                              .value
                                          ),
                                      }
                                    : current
                              )
                            }
                            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-right text-sm tabular-nums"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Loading position action model…
                    </p>
                  )}

                  <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Current inventory:{" "}
                    {positionModelingData
                      ? positionModelingData.current.current_positions.toLocaleString()
                      : "—"}{" "}
                    active authorized positions, including{" "}
                    {positionModelingData
                      ? positionModelingData.current.vacant_positions.toLocaleString()
                      : "—"}{" "}
                    open vacancies. Closing positions in this first model is restricted to vacant roles only.
                  </div>

                  {positionActionError && (
                    <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {positionActionError}
                    </div>
                  )}

                  {positionActionResult && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">
                          Authorized Positions
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {positionActionResult.modeled.authorized_positions.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {positionActionResult.modeled.net_authorized_position_change >=
                          0
                            ? "+"
                            : ""}
                          {positionActionResult.modeled.net_authorized_position_change.toLocaleString()}{" "}
                          vs current
                        </p>
                      </div>

                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">
                          Filled Positions
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {positionActionResult.modeled.filled_positions.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {positionActionResult.modeled.projected_fills.toLocaleString()}{" "}
                          projected fills
                        </p>
                      </div>

                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">
                          Open Vacancies
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {positionActionResult.modeled.open_vacancies.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {positionActionResult.modeled.vacancy_rate_pct.toFixed(
                            1
                          )}
                          % vacancy rate
                        </p>
                      </div>

                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">
                          Frozen Positions
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {positionActionResult.modeled.frozen_positions.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {positionActionResult.modeled.occupancy_rate_pct.toFixed(
                            1
                          )}
                          % staffed occupancy
                        </p>
                      </div>
                    </div>
                  )}
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
