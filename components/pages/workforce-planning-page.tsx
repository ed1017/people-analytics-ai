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
  BusinessUnitResponseAllocationResponse,
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
  RoleWorkforceResponsePlanResponse,
  StructuralPositionAction,
  StructuralPositionCatalogResponse,
  StructuralPositionScenarioResponse,
  TimePhasedWorkforceExecutionResponse,
  ConstraintAwareWorkforceScheduleResponse,
  WorkforceResponseConstraintResponse,
  WorkforceResponsePlanAllocation,
  WorkforceResponsePlanResponse,
  WorkforceResponsePortfolioResponse,
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

function nextMonthValue(value: string) {
  const [year, month] = value
    .slice(0, 7)
    .split("-")
    .map(Number);
  const date = new Date(
    Date.UTC(year, month, 1)
  );
  return date.toISOString().slice(0, 7);
}

function formatModeledCount(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
}

function formatSignedModeledCount(value: number) {
  const formatted = formatModeledCount(
    Math.abs(value)
  );
  return value > 0
    ? "+" + formatted
    : value < 0
      ? "-" + formatted
      : formatted;
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

type ResponseExecutionDraft = {
  id: string;
  org_code: string;
  org_name: string;
  job_profile_code: string;
  job_profile_name: string;
  response_type: "build" | "move" | "buy";
  amount: number;
  effective_month: string;
};

type WorkforcePlanningWorkflowView =
  | "plan"
  | "design"
  | "respond"
  | "execute";

type ResponseConstraintDraft = {
  max_total_build: number | null;
  max_total_move: number | null;
  max_total_buy: number | null;
  max_monthly_build: number | null;
  max_monthly_move: number | null;
  max_monthly_buy: number | null;
  max_monthly_total: number | null;
  deadline_month: string;
  required_coverage_pct_by_deadline: number | null;
  require_all_approved_capacity_scheduled: boolean;
};

const SAVED_SCENARIOS_STORAGE_KEY =
  "people-analytics.saved-workforce-scenarios.v1";

function createStructuralPositionAction():
  StructuralPositionAction {
  return {
    action_type: "add_positions",
    business_unit: null,
    level: null,
    job_profile: null,
    amount: 0,
    fill_pct: null,
  };
}

function createResponsePlanAllocation():
  WorkforceResponsePlanAllocation {
  return {
    build: 0,
    move: 0,
    buy: 0,
    borrow: 0,
    automate: 0,
  };
}

function createResponseConstraintDraft(): ResponseConstraintDraft {
  return {
    max_total_build: null,
    max_total_move: null,
    max_total_buy: null,
    max_monthly_build: null,
    max_monthly_move: null,
    max_monthly_buy: null,
    max_monthly_total: null,
    deadline_month: "",
    required_coverage_pct_by_deadline: null,
    require_all_approved_capacity_scheduled: false,
  };
}

function createResponseExecutionDrafts(
  result: BusinessUnitResponseAllocationResponse
): ResponseExecutionDraft[] {
  const rows: ResponseExecutionDraft[] = [];

  for (const bu of result.business_units) {
    for (
      const responseType of [
        "build",
        "move",
        "buy",
      ] as const
    ) {
      const amount =
        bu.allocation[responseType];
      if (amount <= 0) continue;

      rows.push({
        id:
          bu.org_code +
          "::" +
          bu.job_profile_code +
          "::" +
          responseType +
          "::1",
        org_code: bu.org_code,
        org_name: bu.org_name,
        job_profile_code:
          bu.job_profile_code,
        job_profile_name:
          bu.job_profile_name,
        response_type: responseType,
        amount,
        effective_month: "",
      });
    }
  }

  return rows;
}

const structuralActionLabels = {
  add_positions: "Add positions",
  close_vacant_positions:
    "Close vacant positions",
  freeze_vacancies:
    "Freeze vacancies",
  fill_vacancies:
    "Fill vacancies",
} as const;

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
  const [
    workflowView,
    setWorkflowView,
  ] =
    useState<WorkforcePlanningWorkflowView>(
      "plan"
    );

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
  const [
    structuralPositionCatalog,
    setStructuralPositionCatalog,
  ] =
    useState<StructuralPositionCatalogResponse | null>(
      null
    );
  const [
    structuralPositionActions,
    setStructuralPositionActions,
  ] = useState<StructuralPositionAction[]>([
    createStructuralPositionAction(),
  ]);
  const [
    structuralPositionResult,
    setStructuralPositionResult,
  ] =
    useState<StructuralPositionScenarioResponse | null>(
      null
    );
  const [
    structuralPositionLoading,
    setStructuralPositionLoading,
  ] = useState(false);
  const [
    structuralPositionError,
    setStructuralPositionError,
  ] = useState<string | null>(null);
  const [
    responsePlanSkill,
    setResponsePlanSkill,
  ] = useState("");
  const [
    responsePlanAllocation,
    setResponsePlanAllocation,
  ] =
    useState<WorkforceResponsePlanAllocation>(
      createResponsePlanAllocation()
    );
  const [
    responsePlanResult,
    setResponsePlanResult,
  ] =
    useState<WorkforceResponsePlanResponse | null>(
      null
    );
  const [
    responsePlanLoading,
    setResponsePlanLoading,
  ] = useState(false);
  const [
    responsePlanError,
    setResponsePlanError,
  ] = useState<string | null>(null);
  const [
    roleResponsePlanProfile,
    setRoleResponsePlanProfile,
  ] = useState("");
  const [
    roleResponsePlanAllocation,
    setRoleResponsePlanAllocation,
  ] =
    useState<WorkforceResponsePlanAllocation>(
      createResponsePlanAllocation()
    );
  const [
    roleResponsePlanResult,
    setRoleResponsePlanResult,
  ] =
    useState<RoleWorkforceResponsePlanResponse | null>(
      null
    );
  const [
    roleResponsePlanLoading,
    setRoleResponsePlanLoading,
  ] = useState(false);
  const [
    roleResponsePlanError,
    setRoleResponsePlanError,
  ] = useState<string | null>(null);
  const [
    responsePortfolioAllocations,
    setResponsePortfolioAllocations,
  ] = useState<
    Record<string, WorkforceResponsePlanAllocation>
  >({});
  const [
    responsePortfolioResult,
    setResponsePortfolioResult,
  ] =
    useState<WorkforceResponsePortfolioResponse | null>(
      null
    );
  const [
    responsePortfolioLoading,
    setResponsePortfolioLoading,
  ] = useState(false);
  const [
    responsePortfolioError,
    setResponsePortfolioError,
  ] = useState<string | null>(null);
  const [
    businessUnitResponseAllocations,
    setBusinessUnitResponseAllocations,
  ] = useState<
    Record<string, WorkforceResponsePlanAllocation>
  >({});
  const [
    businessUnitResponseResult,
    setBusinessUnitResponseResult,
  ] =
    useState<BusinessUnitResponseAllocationResponse | null>(
      null
    );
  const [
    businessUnitResponseLoading,
    setBusinessUnitResponseLoading,
  ] = useState(false);
  const [
    businessUnitResponseError,
    setBusinessUnitResponseError,
  ] = useState<string | null>(null);
  const [
    responseExecutionDrafts,
    setResponseExecutionDrafts,
  ] = useState<ResponseExecutionDraft[]>([]);
  const [
    responseExecutionResult,
    setResponseExecutionResult,
  ] =
    useState<TimePhasedWorkforceExecutionResponse | null>(
      null
    );
  const [
    responseExecutionLoading,
    setResponseExecutionLoading,
  ] = useState(false);
  const [
    responseExecutionError,
    setResponseExecutionError,
  ] = useState<string | null>(null);
  const [
    responseConstraintDraft,
    setResponseConstraintDraft,
  ] = useState<ResponseConstraintDraft>(
    createResponseConstraintDraft()
  );
  const [
    responseConstraintResult,
    setResponseConstraintResult,
  ] =
    useState<WorkforceResponseConstraintResponse | null>(
      null
    );
  const [
    responseConstraintLoading,
    setResponseConstraintLoading,
  ] = useState(false);
  const [
    responseConstraintError,
    setResponseConstraintError,
  ] = useState<string | null>(null);
  const [
    constraintAwareScheduleResult,
    setConstraintAwareScheduleResult,
  ] =
    useState<ConstraintAwareWorkforceScheduleResponse | null>(
      null
    );
  const [
    constraintAwareScheduleLoading,
    setConstraintAwareScheduleLoading,
  ] = useState(false);
  const [
    constraintAwareScheduleError,
    setConstraintAwareScheduleError,
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

    async function loadStructuralPositionCatalog() {
      try {
        const response = await fetch(
          "/api/position-structure",
          { cache: "no-store" }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ??
              "Failed to load structural position catalog."
          );
        }

        if (!cancelled) {
          setStructuralPositionCatalog(
            payload as StructuralPositionCatalogResponse
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStructuralPositionError(
            error instanceof Error
              ? error.message
              : "Failed to load structural position catalog."
          );
        }
      }
    }

    loadStructuralPositionCatalog();

    return () => {
      cancelled = true;
    };
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

  function updateStructuralPositionAction(
    index: number,
    patch: Partial<StructuralPositionAction>
  ) {
    setStructuralPositionActions(
      (current) =>
        current.map(
          (action, actionIndex) =>
            actionIndex === index
              ? {
                  ...action,
                  ...patch,
                }
              : action
        )
    );
    setStructuralPositionResult(null);
    setStructuralPositionError(null);
    setResponsePlanResult(null);
    setResponsePlanError(null);
    setRoleResponsePlanResult(null);
    setRoleResponsePlanError(null);
    setResponsePortfolioAllocations({});
    setResponsePortfolioResult(null);
    setResponsePortfolioError(null);
  }

  function addStructuralPositionAction() {
    setStructuralPositionActions(
      (current) => [
        ...current,
        createStructuralPositionAction(),
      ]
    );
    setStructuralPositionResult(null);
    setResponsePlanResult(null);
    setResponsePlanError(null);
    setRoleResponsePlanResult(null);
    setRoleResponsePlanError(null);
    setResponsePortfolioAllocations({});
    setResponsePortfolioResult(null);
    setResponsePortfolioError(null);
  }

  function removeStructuralPositionAction(
    index: number
  ) {
    setStructuralPositionActions(
      (current) =>
        current.length === 1
          ? current
          : current.filter(
              (_, actionIndex) =>
                actionIndex !== index
            )
    );
    setStructuralPositionResult(null);
    setResponsePlanResult(null);
    setResponsePlanError(null);
    setRoleResponsePlanResult(null);
    setRoleResponsePlanError(null);
    setResponsePortfolioAllocations({});
    setResponsePortfolioResult(null);
    setResponsePortfolioError(null);
  }

  async function runStructuralPositionActions() {
    try {
      setStructuralPositionLoading(true);
      setStructuralPositionError(null);

      const response = await fetch(
        "/api/position-structure",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run structural position scenario."
        );
      }

      const result =
        payload as StructuralPositionScenarioResponse;

      setStructuralPositionResult(result);
      setResponsePlanSkill(
        result.response_strategy.skills[0]
          ?.skill_code ?? ""
      );
      setResponsePlanAllocation(
        createResponsePlanAllocation()
      );
      setResponsePlanResult(null);
      setResponsePlanError(null);
      setRoleResponsePlanProfile(
        result.job_profile_impact.find(
          (row) =>
            row.authorized_position_delta > 0
        )?.job_profile_code ?? ""
      );
      setRoleResponsePlanAllocation(
        createResponsePlanAllocation()
      );
      setRoleResponsePlanResult(null);
      setRoleResponsePlanError(null);
      setResponsePortfolioAllocations(
        Object.fromEntries(
          result.job_profile_impact
            .filter(
              (row) =>
                row.authorized_position_delta > 0
            )
            .map((row) => [
              row.job_profile_code,
              createResponsePlanAllocation(),
            ])
        )
      );
      setResponsePortfolioResult(null);
      setResponsePortfolioError(null);
    } catch (error) {
      setStructuralPositionError(
        error instanceof Error
          ? error.message
          : "Failed to run structural position scenario."
      );
    } finally {
      setStructuralPositionLoading(false);
    }
  }

  function resetStructuralPositionActions() {
    setStructuralPositionActions([
      createStructuralPositionAction(),
    ]);
    setStructuralPositionResult(null);
    setStructuralPositionError(null);
    setResponsePlanSkill("");
    setResponsePlanAllocation(
      createResponsePlanAllocation()
    );
    setResponsePlanResult(null);
    setResponsePlanError(null);
    setRoleResponsePlanProfile("");
    setRoleResponsePlanAllocation(
      createResponsePlanAllocation()
    );
    setRoleResponsePlanResult(null);
    setRoleResponsePlanError(null);
    setResponsePortfolioAllocations({});
    setResponsePortfolioResult(null);
    setResponsePortfolioError(null);
  }

  async function runResponsePlan() {
    if (
      !structuralPositionResult ||
      !responsePlanSkill
    ) {
      return;
    }

    try {
      setResponsePlanLoading(true);
      setResponsePlanError(null);

      const response = await fetch(
        "/api/workforce-response-plan",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
            skill_code:
              responsePlanSkill,
            allocation:
              responsePlanAllocation,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run workforce response plan."
        );
      }

      setResponsePlanResult(
        payload as WorkforceResponsePlanResponse
      );
    } catch (error) {
      setResponsePlanError(
        error instanceof Error
          ? error.message
          : "Failed to run workforce response plan."
      );
    } finally {
      setResponsePlanLoading(false);
    }
  }

  function resetResponsePlan() {
    setResponsePlanAllocation(
      createResponsePlanAllocation()
    );
    setResponsePlanResult(null);
    setResponsePlanError(null);
  }

  async function runRoleResponsePlan() {
    if (
      !structuralPositionResult ||
      !roleResponsePlanProfile
    ) {
      return;
    }

    try {
      setRoleResponsePlanLoading(true);
      setRoleResponsePlanError(null);

      const response = await fetch(
        "/api/role-workforce-response-plan",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
            job_profile:
              roleResponsePlanProfile,
            allocation:
              roleResponsePlanAllocation,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run role workforce response plan."
        );
      }

      setRoleResponsePlanResult(
        payload as RoleWorkforceResponsePlanResponse
      );
    } catch (error) {
      setRoleResponsePlanError(
        error instanceof Error
          ? error.message
          : "Failed to run role workforce response plan."
      );
    } finally {
      setRoleResponsePlanLoading(false);
    }
  }

  function resetRoleResponsePlan() {
    setRoleResponsePlanAllocation(
      createResponsePlanAllocation()
    );
    setRoleResponsePlanResult(null);
    setRoleResponsePlanError(null);
  }

  function updateResponsePortfolioAllocation(
    jobProfileCode: string,
    key: "build" | "move" | "buy",
    value: number
  ) {
    setResponsePortfolioAllocations(
      (current) => ({
        ...current,
        [jobProfileCode]: {
          ...(current[jobProfileCode] ??
            createResponsePlanAllocation()),
          [key]: value,
        },
      })
    );
    setResponsePortfolioResult(null);
    setResponsePortfolioError(null);
    setBusinessUnitResponseAllocations({});
    setBusinessUnitResponseResult(null);
    setBusinessUnitResponseError(null);
  }

  async function runResponsePortfolio() {
    if (!structuralPositionResult) return;

    const positiveRoles =
      structuralPositionResult.job_profile_impact.filter(
        (row) =>
          row.authorized_position_delta > 0
      );

    if (positiveRoles.length === 0) return;

    const plans = positiveRoles
      .map((role) => ({
        job_profile:
          role.job_profile_code,
        allocation:
          responsePortfolioAllocations[
            role.job_profile_code
          ] ??
          createResponsePlanAllocation(),
      }))
      .filter(
        (plan) =>
          plan.allocation.build +
            plan.allocation.move +
            plan.allocation.buy >
          0
      );

    if (plans.length === 0) {
      setResponsePortfolioError(
        "Enter at least one Build, Move, or Buy allocation before running the portfolio."
      );
      return;
    }

    try {
      setResponsePortfolioLoading(true);
      setResponsePortfolioError(null);

      const response = await fetch(
        "/api/workforce-response-portfolio",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
            plans,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run workforce response portfolio."
        );
      }

      setResponsePortfolioResult(
        payload as WorkforceResponsePortfolioResponse
      );
      setBusinessUnitResponseAllocations({});
      setBusinessUnitResponseResult(null);
      setBusinessUnitResponseError(null);
    } catch (error) {
      setResponsePortfolioError(
        error instanceof Error
          ? error.message
          : "Failed to run workforce response portfolio."
      );
    } finally {
      setResponsePortfolioLoading(false);
    }
  }

  function resetResponsePortfolio() {
    if (!structuralPositionResult) {
      setResponsePortfolioAllocations({});
      return;
    }

    setResponsePortfolioAllocations(
      Object.fromEntries(
        structuralPositionResult.job_profile_impact
          .filter(
            (row) =>
              row.authorized_position_delta > 0
          )
          .map((row) => [
            row.job_profile_code,
            createResponsePlanAllocation(),
          ])
      )
    );
    setResponsePortfolioResult(null);
    setResponsePortfolioError(null);
    setBusinessUnitResponseAllocations({});
    setBusinessUnitResponseResult(null);
    setBusinessUnitResponseError(null);
  }

  function updateBusinessUnitResponseAllocation(
    orgCode: string,
    jobProfileCode: string,
    key: "build" | "move" | "buy",
    value: number
  ) {
    const allocationKey =
      orgCode + "::" + jobProfileCode;

    setBusinessUnitResponseAllocations(
      (current) => ({
        ...current,
        [allocationKey]: {
          ...(current[allocationKey] ??
            createResponsePlanAllocation()),
          [key]: value,
        },
      })
    );
    setBusinessUnitResponseResult(null);
    setBusinessUnitResponseError(null);
    setResponseExecutionDrafts([]);
    setResponseExecutionResult(null);
    setResponseExecutionError(null);
  }

  async function runBusinessUnitResponseAllocation() {
    if (
      !structuralPositionResult ||
      !responsePortfolioResult
    ) {
      return;
    }

    const plannedRoleCodes = new Set(
      responsePortfolioResult.roles.map(
        (role) => role.job_profile_code
      )
    );
    const destinations =
      structuralPositionResult.business_unit_job_profile_impact.filter(
        (row) =>
          row.authorized_position_delta > 0 &&
          plannedRoleCodes.has(
            row.job_profile_code
          )
      );

    const allocations = destinations
      .map((row) => {
        const allocationKey =
          row.org_code +
          "::" +
          row.job_profile_code;
        return {
          business_unit: row.org_code,
          job_profile:
            row.job_profile_code,
          allocation:
            businessUnitResponseAllocations[
              allocationKey
            ] ??
            createResponsePlanAllocation(),
        };
      })
      .filter(
        (row) =>
          row.allocation.build +
            row.allocation.move +
            row.allocation.buy >
          0
      );

    if (allocations.length === 0) {
      setBusinessUnitResponseError(
        "Enter at least one BU Build, Move, or Buy allocation before running."
      );
      return;
    }

    try {
      setBusinessUnitResponseLoading(true);
      setBusinessUnitResponseError(null);

      const response = await fetch(
        "/api/business-unit-response-allocation",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
            allocations,
            role_plans:
              responsePortfolioResult.roles.map(
                (role) => ({
                  job_profile:
                    role.job_profile_code,
                  allocation:
                    role.allocation,
                })
              ),
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run BU response allocation."
        );
      }

      const result =
        payload as BusinessUnitResponseAllocationResponse;
      setBusinessUnitResponseResult(
        result
      );
      setResponseExecutionDrafts(
        createResponseExecutionDrafts(
          result
        )
      );
      setResponseExecutionResult(null);
      setResponseExecutionError(null);
      setResponseConstraintDraft(
        createResponseConstraintDraft()
      );
      setResponseConstraintResult(null);
      setResponseConstraintError(null);
      setConstraintAwareScheduleResult(null);
      setConstraintAwareScheduleError(null);
    } catch (error) {
      setBusinessUnitResponseError(
        error instanceof Error
          ? error.message
          : "Failed to run BU response allocation."
      );
    } finally {
      setBusinessUnitResponseLoading(false);
    }
  }

  function resetBusinessUnitResponseAllocation() {
    setBusinessUnitResponseAllocations({});
    setBusinessUnitResponseResult(null);
    setBusinessUnitResponseError(null);
    setResponseExecutionDrafts([]);
    setResponseExecutionResult(null);
    setResponseExecutionError(null);
    setResponseConstraintDraft(
      createResponseConstraintDraft()
    );
    setResponseConstraintResult(null);
    setResponseConstraintError(null);
    setConstraintAwareScheduleResult(null);
    setConstraintAwareScheduleError(null);
  }

  function updateResponseExecutionDraft(
    id: string,
    patch: Partial<Pick<
      ResponseExecutionDraft,
      "amount" | "effective_month"
    >>
  ) {
    setResponseExecutionDrafts(
      (current) =>
        current.map((row) =>
          row.id === id
            ? { ...row, ...patch }
            : row
        )
    );
    setResponseExecutionResult(null);
    setResponseExecutionError(null);
    setResponseConstraintResult(null);
    setResponseConstraintError(null);
    setConstraintAwareScheduleResult(null);
    setConstraintAwareScheduleError(null);
  }

  function addResponseExecutionPhase(
    source: ResponseExecutionDraft
  ) {
    setResponseExecutionDrafts(
      (current) => {
        const matchingCount =
          current.filter(
            (row) =>
              row.org_code ===
                source.org_code &&
              row.job_profile_code ===
                source.job_profile_code &&
              row.response_type ===
                source.response_type
          ).length;

        return [
          ...current,
          {
            ...source,
            id:
              source.org_code +
              "::" +
              source.job_profile_code +
              "::" +
              source.response_type +
              "::" +
              (matchingCount + 1) +
              "::" +
              Date.now(),
            amount: 0,
            effective_month: "",
          },
        ];
      }
    );
    setResponseExecutionResult(null);
    setResponseExecutionError(null);
    setResponseConstraintResult(null);
    setResponseConstraintError(null);
    setConstraintAwareScheduleResult(null);
    setConstraintAwareScheduleError(null);
  }

  function removeResponseExecutionPhase(
    id: string
  ) {
    setResponseExecutionDrafts(
      (current) =>
        current.filter(
          (row) => row.id !== id
        )
    );
    setResponseExecutionResult(null);
    setResponseExecutionError(null);
    setResponseConstraintResult(null);
    setResponseConstraintError(null);
  }

  async function runResponseExecution() {
    if (
      !businessUnitResponseResult ||
      !responsePortfolioResult
    ) {
      return;
    }

    const schedule =
      responseExecutionDrafts
        .filter(
          (row) =>
            row.amount > 0 &&
            Boolean(row.effective_month)
        )
        .map((row) => ({
          business_unit:
            row.org_code,
          job_profile:
            row.job_profile_code,
          response_type:
            row.response_type,
          amount: row.amount,
          effective_month:
            row.effective_month,
        }));

    if (schedule.length === 0) {
      setResponseExecutionError(
        "Enter an effective month for at least one positive Build, Move, or Buy phase."
      );
      return;
    }

    try {
      setResponseExecutionLoading(true);
      setResponseExecutionError(null);

      const response = await fetch(
        "/api/time-phased-workforce-execution",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
            allocations:
              businessUnitResponseResult.business_units.map(
                (row) => ({
                  business_unit:
                    row.org_code,
                  job_profile:
                    row.job_profile_code,
                  allocation:
                    row.allocation,
                })
              ),
            role_plans:
              responsePortfolioResult.roles.map(
                (role) => ({
                  job_profile:
                    role.job_profile_code,
                  allocation:
                    role.allocation,
                })
              ),
            schedule,
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to run time-phased execution."
        );
      }

      setResponseExecutionResult(
        payload as TimePhasedWorkforceExecutionResponse
      );
      setResponseConstraintResult(null);
      setResponseConstraintError(null);
    } catch (error) {
      setResponseExecutionError(
        error instanceof Error
          ? error.message
          : "Failed to run time-phased execution."
      );
    } finally {
      setResponseExecutionLoading(false);
    }
  }

  function resetResponseExecution() {
    setResponseExecutionDrafts(
      businessUnitResponseResult
        ? createResponseExecutionDrafts(
            businessUnitResponseResult
          )
        : []
    );
    setResponseExecutionResult(null);
    setResponseExecutionError(null);
    setResponseConstraintResult(null);
    setResponseConstraintError(null);
    setConstraintAwareScheduleResult(null);
    setConstraintAwareScheduleError(null);
  }

  async function runConstraintAwareScheduler() {
    if (
      !businessUnitResponseResult ||
      !responsePortfolioResult
    ) {
      return;
    }

    try {
      setConstraintAwareScheduleLoading(true);
      setConstraintAwareScheduleError(null);

      const response = await fetch(
        "/api/constraint-aware-workforce-scheduler",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
            allocations:
              businessUnitResponseResult.business_units.map(
                (row) => ({
                  business_unit:
                    row.org_code,
                  job_profile:
                    row.job_profile_code,
                  allocation:
                    row.allocation,
                })
              ),
            role_plans:
              responsePortfolioResult.roles.map(
                (role) => ({
                  job_profile:
                    role.job_profile_code,
                  allocation:
                    role.allocation,
                })
              ),
            constraints: {
              ...responseConstraintDraft,
              deadline_month:
                responseConstraintDraft.deadline_month ||
                null,
            },
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to generate constraint-aware schedule."
        );
      }

      const result =
        payload as ConstraintAwareWorkforceScheduleResponse;

      setConstraintAwareScheduleResult(
        result
      );
      setResponseExecutionDrafts(
        result.generated_schedule.map(
          (row, index) => ({
            id:
              row.org_code +
              "::" +
              row.job_profile_code +
              "::" +
              row.response_type +
              "::" +
              row.effective_month +
              "::" +
              index,
            org_code: row.org_code,
            org_name: row.org_name,
            job_profile_code:
              row.job_profile_code,
            job_profile_name:
              row.job_profile_name,
            response_type:
              row.response_type,
            amount: row.amount,
            effective_month:
              row.effective_month,
          })
        )
      );

      if (result.constraint_result) {
        setResponseExecutionResult(
          result.constraint_result.execution
        );
        setResponseConstraintResult(
          result.constraint_result
        );
      } else {
        setResponseExecutionResult(null);
        setResponseConstraintResult(null);
      }

      setResponseExecutionError(null);
      setResponseConstraintError(null);
    } catch (error) {
      setConstraintAwareScheduleError(
        error instanceof Error
          ? error.message
          : "Failed to generate constraint-aware schedule."
      );
    } finally {
      setConstraintAwareScheduleLoading(false);
    }
  }

  async function runResponseConstraints() {
    if (
      !businessUnitResponseResult ||
      !responsePortfolioResult ||
      !responseExecutionResult
    ) {
      return;
    }

    const schedule =
      responseExecutionResult.schedule_entries.map(
        (row) => ({
          business_unit:
            row.org_code,
          job_profile:
            row.job_profile_code,
          response_type:
            row.response_type,
          amount: row.amount,
          effective_month:
            row.effective_month,
        })
      );

    if (schedule.length === 0) {
      setResponseConstraintError(
        "Run at least one scheduled execution phase before checking constraints."
      );
      return;
    }

    const hasExplicitConstraint =
      [
        responseConstraintDraft.max_total_build,
        responseConstraintDraft.max_total_move,
        responseConstraintDraft.max_total_buy,
        responseConstraintDraft.max_monthly_build,
        responseConstraintDraft.max_monthly_move,
        responseConstraintDraft.max_monthly_buy,
        responseConstraintDraft.max_monthly_total,
        responseConstraintDraft
          .required_coverage_pct_by_deadline,
      ].some((value) => value !== null) ||
      Boolean(
        responseConstraintDraft.deadline_month
      ) ||
      responseConstraintDraft
        .require_all_approved_capacity_scheduled;

    if (!hasExplicitConstraint) {
      setResponseConstraintError(
        "Enter at least one explicit constraint before running the feasibility check."
      );
      return;
    }

    try {
      setResponseConstraintLoading(true);
      setResponseConstraintError(null);

      const response = await fetch(
        "/api/workforce-response-constraints",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            actions:
              structuralPositionActions,
            allocations:
              businessUnitResponseResult.business_units.map(
                (row) => ({
                  business_unit:
                    row.org_code,
                  job_profile:
                    row.job_profile_code,
                  allocation:
                    row.allocation,
                })
              ),
            role_plans:
              responsePortfolioResult.roles.map(
                (role) => ({
                  job_profile:
                    role.job_profile_code,
                  allocation:
                    role.allocation,
                })
              ),
            schedule,
            constraints: {
              ...responseConstraintDraft,
              deadline_month:
                responseConstraintDraft.deadline_month ||
                null,
            },
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Failed to evaluate workforce response constraints."
        );
      }

      setResponseConstraintResult(
        payload as WorkforceResponseConstraintResponse
      );
    } catch (error) {
      setResponseConstraintError(
        error instanceof Error
          ? error.message
          : "Failed to evaluate workforce response constraints."
      );
    } finally {
      setResponseConstraintLoading(false);
    }
  }

  function resetResponseConstraints() {
    setResponseConstraintDraft(
      createResponseConstraintDraft()
    );
    setResponseConstraintResult(null);
    setResponseConstraintError(null);
  }

  function updateResponseConstraintDraft<
    K extends keyof ResponseConstraintDraft
  >(
    key: K,
    value: ResponseConstraintDraft[K]
  ) {
    setResponseConstraintDraft(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
    setResponseConstraintResult(null);
    setResponseConstraintError(null);
    setConstraintAwareScheduleResult(null);
    setConstraintAwareScheduleError(null);
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
                {workflowView === "plan"
                  ? "Compare workforce scenarios and decide what future demand looks like."
                  : workflowView === "design"
                    ? "Translate the workforce plan into concrete position, recruiting, and skill demand."
                    : workflowView === "respond"
                      ? "Decide how to close role gaps using Build, Move, and Buy."
                      : "Schedule the approved response and test whether the plan is actually feasible."}
              </p>
            </div>

            <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {planningLoading
                ? "Loading plan…"
                : "2027 Enterprise Workforce Plan"}
            </span>
          </div>

          <div className="mb-6 rounded-lg border p-3">
            <div className="grid gap-2 md:grid-cols-4">
              {(
                [
                  {
                    key: "plan",
                    step: "1",
                    title: "Plan",
                    description:
                      "What workforce do we need?",
                    ready: Boolean(
                      activePlanningScenario
                    ),
                  },
                  {
                    key: "design",
                    step: "2",
                    title: "Design",
                    description:
                      "What positions should change?",
                    ready: Boolean(
                      structuralPositionResult
                    ),
                  },
                  {
                    key: "respond",
                    step: "3",
                    title: "Respond",
                    description:
                      "How do we close the gaps?",
                    ready: Boolean(
                      responsePortfolioResult ||
                        roleResponsePlanResult
                    ),
                  },
                  {
                    key: "execute",
                    step: "4",
                    title: "Execute",
                    description:
                      "Can we actually deliver it?",
                    ready: Boolean(
                      responseExecutionResult
                    ),
                  },
                ] as Array<{
                  key: WorkforcePlanningWorkflowView;
                  step: string;
                  title: string;
                  description: string;
                  ready: boolean;
                }>
              ).map((item) => {
                const active =
                  workflowView === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setWorkflowView(item.key)
                    }
                    className={
                      active
                        ? "rounded-md border bg-foreground p-3 text-left text-background transition-colors"
                        : "rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                        Step {item.step}
                      </span>
                      <span
                        className={
                          active
                            ? "text-[10px] opacity-80"
                            : "text-[10px] text-muted-foreground"
                        }
                      >
                        {item.ready
                          ? "Ready"
                          : "In progress"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold">
                      {item.title}
                    </p>
                    <p
                      className={
                        active
                          ? "mt-1 text-[11px] opacity-80"
                          : "mt-1 text-[11px] text-muted-foreground"
                      }
                    >
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6 rounded-md border bg-muted/20 p-3 text-sm">
            {workflowView === "plan"
              ? "Start with the business question: what workforce do we expect to need, and how does that compare with Baseline?"
              : workflowView === "design"
                ? "Now turn the workforce scenario into actual position changes — add, close, freeze, or fill roles."
                : workflowView === "respond"
                  ? "Once the role gaps are clear, decide how much to Build internally, Move from inside the company, or Buy through external hiring."
                  : "Last step: put the approved response on a timeline, auto-schedule around constraints, and check whether the plan is actually executable."}
          </div>

          {planningError && (
            <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {planningError}
            </div>
          )}

          <div
            className={
              workflowView === "plan"
                ? ""
                : "hidden"
            }
          >
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
          </div>

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
                  workflowView === "plan"
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    : "hidden"
                }
              >
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

              <div
                className={
                  workflowView === "plan"
                    ? "mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"
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
                <div
                  className={
                    workflowView === "plan"
                      ? "mb-4"
                      : "hidden"
                  }
                >
                  <h3 className="font-semibold">
                    Scenario Comparison
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    December 2027 outcomes across the enterprise plan
                  </p>
                </div>

                <div
                  className={
                    workflowView === "plan"
                      ? "overflow-x-auto"
                      : "hidden"
                  }
                >
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


              <div
                className={
                  workflowView === "plan"
                    ? "hidden"
                    : "mt-6 rounded-lg border p-4"
                }
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {workflowView === "design"
                        ? "Workforce Design"
                        : workflowView === "respond"
                          ? "Workforce Response"
                          : "Execution & Feasibility"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {workflowView === "design"
                        ? "Turn the workforce scenario into concrete position changes and see the recruiting and skill impact."
                        : workflowView === "respond"
                          ? "Translate modeled role gaps into Build, Move, and Buy response plans."
                          : "Put the approved response on a timeline and test whether it fits the operating constraints."}
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {positionModelingLoading
                      ? "Loading positions…"
                      : selectedPlanningScenario}
                  </span>
                </div>

                {workflowView === "respond" &&
                  !structuralPositionResult && (
                    <div className="mb-5 rounded-md border bg-muted/20 p-4">
                      <p className="font-medium">
                        Design the workforce first
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Run a structural position scenario so the app knows which roles and skills actually have new demand.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkflowView(
                            "design"
                          )
                        }
                        className="mt-3 rounded-md border px-3 py-2 text-sm"
                      >
                        Go to Design
                      </button>
                    </div>
                  )}

                {workflowView === "execute" &&
                  (!responsePortfolioResult ||
                    !businessUnitResponseResult) && (
                    <div className="mb-5 rounded-md border bg-muted/20 p-4">
                      <p className="font-medium">
                        Build the response plan first
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Execution starts after Build / Move / Buy has been allocated and reconciled to business-unit destinations.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkflowView(
                            "respond"
                          )
                        }
                        className="mt-3 rounded-md border px-3 py-2 text-sm"
                      >
                        Go to Respond
                      </button>
                    </div>
                  )}

                <div
                  className={
                    workflowView === "design"
                      ? "mb-5 rounded-md border p-4"
                      : "hidden"
                  }
                >
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

                <div className="mb-5 rounded-md border p-4">
                  <div
                    className={
                      workflowView === "design"
                        ? "mb-4 flex flex-wrap items-start justify-between gap-3"
                        : "hidden"
                    }
                  >
                    <div>
                      <h4 className="font-semibold">
                        Structural Position Actions
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Apply ordered actions by business unit, career level, and optional job profile.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={addStructuralPositionAction}
                        disabled={
                          structuralPositionActions.length >=
                          20
                        }
                        className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add Action
                      </button>
                      <button
                        type="button"
                        onClick={resetStructuralPositionActions}
                        disabled={structuralPositionLoading}
                        className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={runStructuralPositionActions}
                        disabled={
                          !structuralPositionCatalog ||
                          structuralPositionLoading
                        }
                        className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {structuralPositionLoading
                          ? "Running…"
                          : "Run Structural Scenario"}
                      </button>
                    </div>
                  </div>

                  <div
                    className={
                      workflowView === "design"
                        ? "space-y-3"
                        : "hidden"
                    }
                  >
                    {structuralPositionActions.map(
                      (action, index) => {
                        const profileOptions =
                          structuralPositionCatalog?.job_profiles.filter(
                            (profile) =>
                              structuralPositionCatalog.combinations.some(
                                (combo) =>
                                  (!action.business_unit ||
                                    combo.org_code ===
                                      action.business_unit) &&
                                  (!action.level ||
                                    combo.level_code ===
                                      action.level) &&
                                  combo.job_profile_code ===
                                    profile.job_profile_code
                              )
                          ) ?? [];

                        return (
                          <div
                            key={index}
                            className="grid gap-3 rounded-md border p-3 xl:grid-cols-[36px_1.1fr_1.2fr_1fr_1.4fr_0.8fr_36px]"
                          >
                            <div className="flex items-center justify-center text-sm font-semibold text-muted-foreground">
                              {index + 1}
                            </div>

                            <label>
                              <span className="text-[11px] text-muted-foreground">
                                Action
                              </span>
                              <select
                                value={action.action_type}
                                onChange={(event) => {
                                  const actionType =
                                    event.target
                                      .value as StructuralPositionAction["action_type"];
                                  updateStructuralPositionAction(
                                    index,
                                    {
                                      action_type:
                                        actionType,
                                      amount:
                                        actionType ===
                                        "fill_vacancies"
                                          ? null
                                          : 0,
                                      fill_pct:
                                        actionType ===
                                        "fill_vacancies"
                                          ? 0
                                          : null,
                                    }
                                  );
                                }}
                                className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                              >
                                {Object.entries(
                                  structuralActionLabels
                                ).map(
                                  ([value, label]) => (
                                    <option
                                      key={value}
                                      value={value}
                                    >
                                      {label}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <label>
                              <span className="text-[11px] text-muted-foreground">
                                Business Unit
                              </span>
                              <select
                                value={
                                  action.business_unit ??
                                  ""
                                }
                                onChange={(event) =>
                                  updateStructuralPositionAction(
                                    index,
                                    {
                                      business_unit:
                                        event.target
                                          .value ||
                                        null,
                                      job_profile:
                                        null,
                                    }
                                  )
                                }
                                className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                              >
                                <option value="">
                                  All business units
                                </option>
                                {structuralPositionCatalog?.business_units.map(
                                  (option) => (
                                    <option
                                      key={
                                        option.org_code
                                      }
                                      value={
                                        option.org_code
                                      }
                                    >
                                      {
                                        option.org_name
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <label>
                              <span className="text-[11px] text-muted-foreground">
                                Level
                              </span>
                              <select
                                value={
                                  action.level ?? ""
                                }
                                onChange={(event) =>
                                  updateStructuralPositionAction(
                                    index,
                                    {
                                      level:
                                        event.target
                                          .value ||
                                        null,
                                      job_profile:
                                        null,
                                    }
                                  )
                                }
                                className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                              >
                                <option value="">
                                  All levels
                                </option>
                                {structuralPositionCatalog?.levels.map(
                                  (option) => (
                                    <option
                                      key={
                                        option.level_code
                                      }
                                      value={
                                        option.level_code
                                      }
                                    >
                                      {
                                        option.level_name
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <label>
                              <span className="text-[11px] text-muted-foreground">
                                Job Profile
                              </span>
                              <select
                                value={
                                  action.job_profile ??
                                  ""
                                }
                                onChange={(event) =>
                                  updateStructuralPositionAction(
                                    index,
                                    {
                                      job_profile:
                                        event.target
                                          .value ||
                                        null,
                                    }
                                  )
                                }
                                className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                              >
                                <option value="">
                                  All job profiles
                                </option>
                                {profileOptions.map(
                                  (option) => (
                                    <option
                                      key={
                                        option.job_profile_code
                                      }
                                      value={
                                        option.job_profile_code
                                      }
                                    >
                                      {
                                        option.job_profile_name
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <label>
                              <span className="text-[11px] text-muted-foreground">
                                {action.action_type ===
                                "fill_vacancies"
                                  ? "Fill %"
                                  : "Positions"}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={
                                  action.action_type ===
                                  "fill_vacancies"
                                    ? 100
                                    : undefined
                                }
                                step={
                                  action.action_type ===
                                  "fill_vacancies"
                                    ? 5
                                    : 1
                                }
                                value={
                                  action.action_type ===
                                  "fill_vacancies"
                                    ? action.fill_pct ??
                                      0
                                    : action.amount ?? 0
                                }
                                onChange={(event) =>
                                  updateStructuralPositionAction(
                                    index,
                                    action.action_type ===
                                      "fill_vacancies"
                                      ? {
                                          fill_pct:
                                            Number(
                                              event
                                                .target
                                                .value
                                            ),
                                        }
                                      : {
                                          amount:
                                            Number(
                                              event
                                                .target
                                                .value
                                            ),
                                        }
                                  )
                                }
                                className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                removeStructuralPositionAction(
                                  index
                                )
                              }
                              disabled={
                                structuralPositionActions.length ===
                                1
                              }
                              className="self-end rounded-md border px-2 py-2 text-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              title="Remove action"
                            >
                              ×
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <div
                    className={
                      workflowView === "design"
                        ? "mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground"
                        : "hidden"
                    }
                  >
                    Actions run top-to-bottom. Cost basis comes from the stored Baseline Dec 2027 labor cost per planned position for the matching BU × level × job-profile mix.
                  </div>

                  {structuralPositionError && (
                    <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {structuralPositionError}
                    </div>
                  )}

                  {structuralPositionResult && (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Authorized Positions
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {structuralPositionResult.modeled.authorized_positions.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {structuralPositionResult.modeled.net_authorized_position_change >=
                            0
                              ? "+"
                              : ""}
                            {structuralPositionResult.modeled.net_authorized_position_change.toLocaleString()}{" "}
                            vs current
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Filled Positions
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {structuralPositionResult.modeled.filled_positions.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {structuralPositionResult.modeled.net_filled_position_change >=
                            0
                              ? "+"
                              : ""}
                            {structuralPositionResult.modeled.net_filled_position_change.toLocaleString()}{" "}
                            vs current
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Open Vacancies
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {structuralPositionResult.modeled.open_vacancies.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {structuralPositionResult.modeled.vacancy_rate_pct.toFixed(
                              1
                            )}
                            % vacancy rate
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Authorized Budget Δ
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {formatCurrencyCompact(
                              structuralPositionResult.modeled
                                .authorized_budget_delta_usd
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Position authorization, not cash savings
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Staffed Labor Cost Δ
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {formatCurrencyCompact(
                              structuralPositionResult.modeled
                                .annualized_staffed_labor_cost_delta_usd
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Annualized effect of modeled fills
                          </p>
                        </div>
                      </div>

                      <div
                        className={
                          workflowView === "design"
                            ? "mt-4 rounded-md border p-4"
                            : "hidden"
                        }
                      >
                        <div className="mb-4">
                          <h5 className="font-semibold">
                            Recruiting Demand
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            Position actions translated into linked requisition demand and ATS actions.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              Active Recruiting Demand
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {formatModeledCount(
                                structuralPositionResult.recruiting_demand
                                  .active_recruiting_demand
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Open reqs + uncovered active vacancies
                            </p>
                          </div>

                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              Open Requisitions
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {formatModeledCount(
                                structuralPositionResult.recruiting_demand
                                  .active_open_requisitions
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatModeledCount(
                                structuralPositionResult.current
                                  .open_requisitions
                              )}{" "}
                              current
                            </p>
                          </div>

                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              On-Hold Requisitions
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {formatModeledCount(
                                structuralPositionResult.recruiting_demand
                                  .on_hold_requisitions
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Includes modeled vacancy freezes
                            </p>
                          </div>

                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              New Requisitions Needed
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {formatModeledCount(
                                structuralPositionResult.recruiting_demand
                                  .incremental_requisitions_needed
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Active vacancies without a req
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border px-3 py-1">
                            Hold{" "}
                            {formatModeledCount(
                              structuralPositionResult.recruiting_demand
                                .requisitions_to_hold
                            )}
                          </span>
                          <span className="rounded-full border px-3 py-1">
                            Cancel{" "}
                            {formatModeledCount(
                              structuralPositionResult.recruiting_demand
                                .requisitions_to_cancel
                            )}
                          </span>
                          <span className="rounded-full border px-3 py-1">
                            Create for fills{" "}
                            {formatModeledCount(
                              structuralPositionResult.recruiting_demand
                                .requisitions_to_create_for_modeled_fills
                            )}
                          </span>
                          <span className="rounded-full border px-3 py-1">
                            Reactivate for fills{" "}
                            {formatModeledCount(
                              structuralPositionResult.recruiting_demand
                                .requisitions_to_reactivate_for_modeled_fills
                            )}
                          </span>
                          <span className="rounded-full border px-3 py-1">
                            Close as filled{" "}
                            {formatModeledCount(
                              structuralPositionResult.recruiting_demand
                                .requisitions_closed_as_filled
                            )}
                          </span>
                        </div>

                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full min-w-[700px] text-sm">
                            <thead>
                              <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="pb-3 pr-4">
                                  Business Unit
                                </th>
                                <th className="pb-3 px-3 text-right">
                                  Active Demand
                                </th>
                                <th className="pb-3 px-3 text-right">
                                  Open Reqs
                                </th>
                                <th className="pb-3 px-3 text-right">
                                  On Hold
                                </th>
                                <th className="pb-3 px-3 text-right">
                                  New Reqs
                                </th>
                                <th className="pb-3 pl-3 text-right">
                                  Modeled Fills
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {structuralPositionResult.recruiting_demand.by_business_unit
                                .slice(0, 8)
                                .map((row) => (
                                  <tr
                                    key={row.org_code}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-3 pr-4 font-medium">
                                      {row.org_name}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums">
                                      {formatModeledCount(
                                        row.active_recruiting_demand
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums">
                                      {formatModeledCount(
                                        row.active_open_requisitions
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums">
                                      {formatModeledCount(
                                        row.on_hold_requisitions
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums">
                                      {formatModeledCount(
                                        row.uncovered_open_vacancies
                                      )}
                                    </td>
                                    <td className="py-3 pl-3 text-right tabular-nums">
                                      {formatModeledCount(
                                        row.modeled_fills
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div
                        className={
                          workflowView === "design"
                            ? "mt-4 rounded-md border p-4"
                            : "hidden"
                        }
                      >
                        <div className="mb-4">
                          <h5 className="font-semibold">
                            Skill Demand
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            Authorized-position skill requirements and active recruiting skill demand implied by this scenario.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              Skills with Higher Demand
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {
                                structuralPositionResult.skill_demand
                                  .skills_with_increased_authorized_demand
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Authorized-position demand increased
                            </p>
                          </div>

                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              Skills with Lower Demand
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {
                                structuralPositionResult.skill_demand
                                  .skills_with_reduced_authorized_demand
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Authorized-position demand decreased
                            </p>
                          </div>

                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              Largest Modeled Gap
                            </p>
                            <p className="mt-1 truncate text-lg font-semibold">
                              {structuralPositionResult.skill_demand
                                .largest_modeled_gaps[0]
                                ?.skill_name ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {structuralPositionResult.skill_demand
                                .largest_modeled_gaps[0]
                                ? formatModeledCount(
                                    structuralPositionResult.skill_demand
                                      .largest_modeled_gaps[0]
                                      .modeled_position_gap
                                  ) +
                                  " positions above current skill supply"
                                : "No modeled gap"}
                            </p>
                          </div>

                          <div className="rounded-md border p-3">
                            <p className="text-xs text-muted-foreground">
                              Top Recruiting Skill
                            </p>
                            <p className="mt-1 truncate text-lg font-semibold">
                              {structuralPositionResult.skill_demand
                                .top_recruiting_skill_demand[0]
                                ?.skill_name ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {structuralPositionResult.skill_demand
                                .top_recruiting_skill_demand[0]
                                ? formatModeledCount(
                                    structuralPositionResult.skill_demand
                                      .top_recruiting_skill_demand[0]
                                      .modeled_active_recruiting_demand
                                  ) + " active recruiting positions"
                                : "No active recruiting demand"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                          Current employee skill supply is held constant. Position-based demand includes filled, vacant, and frozen authorized roles; active recruiting demand excludes frozen/on-hold vacancies.
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          <div className="overflow-x-auto rounded-md border p-3">
                            <div className="mb-3">
                              <p className="font-medium">
                                Scenario Skill Changes
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Largest changes in authorized-position skill demand
                              </p>
                            </div>

                            {structuralPositionResult.skill_demand
                              .top_changed_skills.length >
                            0 ? (
                              <table className="w-full min-w-[520px] text-sm">
                                <thead>
                                  <tr className="border-b text-left text-xs text-muted-foreground">
                                    <th className="pb-3 pr-4">
                                      Skill
                                    </th>
                                    <th className="pb-3 px-3 text-right">
                                      Demand Δ
                                    </th>
                                    <th className="pb-3 pl-3 text-right">
                                      Modeled Gap
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {structuralPositionResult.skill_demand.top_changed_skills
                                    .slice(0, 10)
                                    .map((row) => (
                                      <tr
                                        key={row.skill_code}
                                        className="border-b last:border-0"
                                      >
                                        <td className="py-3 pr-4">
                                          <p className="font-medium">
                                            {row.skill_name}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            {row.skill_category}
                                          </p>
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                          {row.authorized_demand_delta >
                                          0
                                            ? "+"
                                            : ""}
                                          {formatModeledCount(
                                            row.authorized_demand_delta
                                          )}
                                        </td>
                                        <td className="py-3 pl-3 text-right tabular-nums">
                                          {formatModeledCount(
                                            row.modeled_position_gap
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="py-4 text-sm text-muted-foreground">
                                This scenario does not change authorized skill demand; it only changes vacancy or staffing state.
                              </p>
                            )}
                          </div>

                          <div className="overflow-x-auto rounded-md border p-3">
                            <div className="mb-3">
                              <p className="font-medium">
                                Active Recruiting Skill Demand
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Skills needed across active open and uncovered vacancies
                              </p>
                            </div>

                            <table className="w-full min-w-[520px] text-sm">
                              <thead>
                                <tr className="border-b text-left text-xs text-muted-foreground">
                                  <th className="pb-3 pr-4">
                                    Skill
                                  </th>
                                  <th className="pb-3 px-3 text-right">
                                    Active Demand
                                  </th>
                                  <th className="pb-3 pl-3 text-right">
                                    Δ vs Current
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {structuralPositionResult.skill_demand.top_recruiting_skill_demand
                                  .slice(0, 10)
                                  .map((row) => (
                                    <tr
                                      key={row.skill_code}
                                      className="border-b last:border-0"
                                    >
                                      <td className="py-3 pr-4">
                                        <p className="font-medium">
                                          {row.skill_name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                          {row.skill_category}
                                        </p>
                                      </td>
                                      <td className="px-3 py-3 text-right tabular-nums">
                                        {formatModeledCount(
                                          row.modeled_active_recruiting_demand
                                        )}
                                      </td>
                                      <td className="py-3 pl-3 text-right tabular-nums">
                                        {row.active_recruiting_demand_delta >
                                        0
                                          ? "+"
                                          : ""}
                                        {formatModeledCount(
                                          row.active_recruiting_demand_delta
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      <div
                        className={
                          workflowView === "respond"
                            ? "mt-4 rounded-md border p-4"
                            : "hidden"
                        }
                      >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h5 className="font-semibold">
                              Workforce Response Options
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              Evidence for Build, Move, Buy, Borrow, and Automate against scenario-widened skill gaps.
                            </p>
                          </div>
                          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                            {structuralPositionResult.response_strategy.skills_evaluated} skills evaluated
                          </span>
                        </div>

                        {structuralPositionResult.response_strategy.skills.length >
                        0 ? (
                          <>
                            <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                              These are evidence signals, not an optimized recommendation. Learning and mobility counts can overlap across skills. Borrow is unavailable until contingent-worker data is loaded; Automate is not modeled without a role/task automation signal.
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1120px] text-sm">
                                <thead>
                                  <tr className="border-b text-left text-xs text-muted-foreground">
                                    <th className="pb-3 pr-4">
                                      Skill
                                    </th>
                                    <th className="pb-3 px-3 text-right">
                                      Gap
                                    </th>
                                    <th className="pb-3 px-3">
                                      Build
                                    </th>
                                    <th className="pb-3 px-3">
                                      Move
                                    </th>
                                    <th className="pb-3 px-3">
                                      Buy
                                    </th>
                                    <th className="pb-3 px-3">
                                      Borrow
                                    </th>
                                    <th className="pb-3 pl-3">
                                      Automate
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {structuralPositionResult.response_strategy.skills.map(
                                    (row) => (
                                      <tr
                                        key={row.skill_code}
                                        className="border-b align-top last:border-0"
                                      >
                                        <td className="py-3 pr-4">
                                          <p className="font-medium">
                                            {row.skill_name}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            {row.skill_category} · demand{" "}
                                            {row.authorized_demand_delta >
                                            0
                                              ? "+"
                                              : ""}
                                            {formatModeledCount(
                                              row.authorized_demand_delta
                                            )}
                                          </p>
                                        </td>

                                        <td className="px-3 py-3 text-right font-medium tabular-nums">
                                          {formatModeledCount(
                                            row.modeled_position_gap
                                          )}
                                        </td>

                                        <td className="px-3 py-3">
                                          {row.build.pathway_available ? (
                                            <>
                                              <p className="font-medium">
                                                {row.build.active_course_count} active{" "}
                                                {row.build.active_course_count ===
                                                1
                                                  ? "course"
                                                  : "courses"}
                                              </p>
                                              <p className="text-[11px] text-muted-foreground">
                                                {row.build.in_progress_learners.toLocaleString()} in progress ·{" "}
                                                {row.build.enrolled_learners.toLocaleString()} enrolled
                                                {row.build.avg_course_duration_hours !==
                                                null
                                                  ? " · " +
                                                    row.build.avg_course_duration_hours.toFixed(
                                                      1
                                                    ) +
                                                    "h avg"
                                                  : ""}
                                              </p>
                                            </>
                                          ) : (
                                            <p className="text-muted-foreground">
                                              No active course
                                            </p>
                                          )}
                                        </td>

                                        <td className="px-3 py-3">
                                          {row.move.evidence_available ? (
                                            <>
                                              <p className="font-medium">
                                                {row.move.mobility_candidates.toLocaleString()} candidates
                                              </p>
                                              <p className="text-[11px] text-muted-foreground">
                                                Hold skill + preference toward another profile requiring it
                                              </p>
                                            </>
                                          ) : (
                                            <p className="text-muted-foreground">
                                              No matched mobility signal
                                            </p>
                                          )}
                                        </td>

                                        <td className="px-3 py-3">
                                          {row.buy.evidence_available ? (
                                            <>
                                              <p className="font-medium">
                                                {formatModeledCount(
                                                  row.buy.active_recruiting_demand
                                                )} active demand
                                              </p>
                                              <p className="text-[11px] text-muted-foreground">
                                                {row.buy.median_time_to_fill_days !==
                                                null
                                                  ? row.buy.median_time_to_fill_days.toFixed(
                                                      0
                                                    ) +
                                                    "d median TTF"
                                                  : "TTF unavailable"}{" "}
                                                ·{" "}
                                                {row.buy.historical_filled_requisitions.toLocaleString()} historical fills
                                              </p>
                                            </>
                                          ) : (
                                            <p className="text-muted-foreground">
                                              No hiring history
                                            </p>
                                          )}
                                        </td>

                                        <td className="px-3 py-3">
                                          {row.borrow.data_available ? (
                                            <>
                                              <p className="font-medium">
                                                {row.borrow.active_contingent_workers.toLocaleString()} active
                                              </p>
                                              <p className="text-[11px] text-muted-foreground">
                                                {row.borrow.avg_active_bill_rate !==
                                                null
                                                  ? "$" +
                                                    row.borrow.avg_active_bill_rate.toFixed(
                                                      0
                                                    ) +
                                                    " avg bill rate"
                                                  : "Bill rate unavailable"}
                                              </p>
                                            </>
                                          ) : (
                                            <p className="text-muted-foreground">
                                              No contingent data
                                            </p>
                                          )}
                                        </td>

                                        <td className="py-3 pl-3 text-muted-foreground">
                                          Not modeled
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            This scenario does not create or widen a positive authorized-position skill gap, so no new response-strategy evidence is required.
                          </p>
                        )}
                      </div>

                      {structuralPositionResult.job_profile_impact.filter(
                        (row) =>
                          row.authorized_position_delta > 0
                      ).length > 1 && (
                        <div
                          className={
                            workflowView === "respond" ||
                            workflowView === "execute"
                              ? "mt-4 rounded-md border p-4"
                              : "hidden"
                          }
                        >
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h5 className="font-semibold">
                                Workforce Response Portfolio
                              </h5>
                              <p className="text-sm text-muted-foreground">
                                Allocate Build, Move, and Buy across multiple scenario-created roles and reconcile the portfolio without double-counting interested internal talent.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={resetResponsePortfolio}
                                disabled={responsePortfolioLoading}
                                className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={runResponsePortfolio}
                                disabled={responsePortfolioLoading}
                                className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {responsePortfolioLoading
                                  ? "Running..."
                                  : "Run Portfolio"}
                              </button>
                            </div>
                          </div>

                          <div className="max-h-[360px] overflow-auto rounded-md border">
                            <table className="w-full min-w-[720px] text-sm">
                              <thead className="sticky top-0 bg-background">
                                <tr className="border-b text-left text-xs text-muted-foreground">
                                  <th className="p-3">Role</th>
                                  <th className="p-3 text-right">Demand</th>
                                  <th className="p-3 text-right">Build</th>
                                  <th className="p-3 text-right">Move</th>
                                  <th className="p-3 text-right">Buy</th>
                                </tr>
                              </thead>
                              <tbody>
                                {structuralPositionResult.job_profile_impact
                                  .filter(
                                    (row) =>
                                      row.authorized_position_delta > 0
                                  )
                                  .map((row) => {
                                    const allocation =
                                      responsePortfolioAllocations[
                                        row.job_profile_code
                                      ] ??
                                      createResponsePlanAllocation();

                                    return (
                                      <tr
                                        key={row.job_profile_code}
                                        className="border-b last:border-0"
                                      >
                                        <td className="p-3">
                                          <p className="font-medium">
                                            {row.job_profile_name}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground">
                                            {row.job_profile_code}
                                          </p>
                                        </td>
                                        <td className="p-3 text-right font-medium tabular-nums">
                                          {formatModeledCount(
                                            row.authorized_position_delta
                                          )}
                                        </td>
                                        {(
                                          [
                                            ["build", "Build"],
                                            ["move", "Move"],
                                            ["buy", "Buy"],
                                          ] as const
                                        ).map(([key, label]) => (
                                          <td
                                            key={key}
                                            className="p-3"
                                          >
                                            <input
                                              aria-label={
                                                row.job_profile_name +
                                                " " +
                                                label
                                              }
                                              type="number"
                                              min={0}
                                              step={1}
                                              value={allocation[key]}
                                              onChange={(event) =>
                                                updateResponsePortfolioAllocation(
                                                  row.job_profile_code,
                                                  key,
                                                  Number(
                                                    event.target.value
                                                  )
                                                )
                                              }
                                              className="w-full min-w-[90px] rounded-md border bg-background px-2 py-1.5 text-right text-sm tabular-nums"
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>

                          <p className="mt-3 text-[11px] text-muted-foreground">
                            The governed career-preference model allows one target profile per employee, so interested internal Build/Move pools do not overlap across portfolio roles. Each role is still capped at its own modeled demand.
                          </p>

                          {responsePortfolioError && (
                            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                              {responsePortfolioError}
                            </div>
                          )}

                          {responsePortfolioResult && (
                            <>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Positive Role Demand
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      responsePortfolioResult.scenario_positive_role_demand
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Planned Coverage
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      responsePortfolioResult.planned_coverage_if_executed
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {responsePortfolioResult.coverage_pct_of_all_positive_role_demand.toFixed(
                                      1
                                    )}% of positive demand
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Remaining Gap
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      responsePortfolioResult.remaining_gap_if_executed +
                                        responsePortfolioResult.unplanned_role_demand
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Internal Supply
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {responsePortfolioResult.internal_supply.role_ready.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    role-ready ·{" "}
                                    {responsePortfolioResult.internal_supply.fully_pathway_covered_near_ready.toLocaleString()} path-covered near-ready
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                                Portfolio allocation: Build{" "}
                                {formatModeledCount(
                                  responsePortfolioResult.allocation.build
                                )}{" "}
                                · Move{" "}
                                {formatModeledCount(
                                  responsePortfolioResult.allocation.move
                                )}{" "}
                                · Buy{" "}
                                {formatModeledCount(
                                  responsePortfolioResult.allocation.buy
                                )}{" "}
                                · {responsePortfolioResult.recruiting_evidence.current_open_requisitions.toLocaleString()} current open reqs ·{" "}
                                {responsePortfolioResult.recruiting_evidence.recent_12m_external_fills.toLocaleString()} external fills in trailing 12M
                              </div>

                              {responsePortfolioResult.demand_by_business_unit.length > 0 && (
                                <div className="mt-4 rounded-md border p-3">
                                  <div className="mb-2">
                                    <p className="text-xs font-medium">
                                      Organizational Demand Ownership
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Signed modeled role-demand deltas by business unit. These reconcile to enterprise role demand; Build / Move / Buy remain role-level allocations.
                                    </p>
                                  </div>
                                  <div className="max-h-[260px] overflow-auto">
                                    <table className="w-full min-w-[720px] text-xs">
                                      <thead className="sticky top-0 bg-background">
                                        <tr className="border-b text-left text-muted-foreground">
                                          <th className="pb-2 pr-3">Business Unit</th>
                                          <th className="pb-2 px-3 text-right">Scenario Δ</th>
                                          <th className="pb-2 px-3 text-right">Portfolio Δ</th>
                                          <th className="pb-2 pl-3">Role Detail</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {responsePortfolioResult.demand_by_business_unit.map(
                                          (bu) => (
                                            <tr
                                              key={bu.org_code}
                                              className="border-b last:border-0"
                                            >
                                              <td className="py-2 pr-3 font-medium">
                                                {bu.org_name}
                                              </td>
                                              <td className="px-3 py-2 text-right font-medium tabular-nums">
                                                {formatSignedModeledCount(
                                                  bu.scenario_role_demand_delta
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-right tabular-nums">
                                                {formatSignedModeledCount(
                                                  bu.portfolio_role_demand_delta
                                                )}
                                              </td>
                                              <td className="py-2 pl-3 text-muted-foreground">
                                                {bu.roles
                                                  .map(
                                                    (role) =>
                                                      role.job_profile_name +
                                                      " " +
                                                      formatSignedModeledCount(
                                                        role.scenario_created_role_demand_delta
                                                      ) +
                                                      (role.included_in_portfolio
                                                        ? ""
                                                        : " (unplanned)")
                                                  )
                                                  .join(" · ")}
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              <details className="mt-4 rounded-md border">
                                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                                  Business Unit Response Allocation
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    destination ownership
                                  </span>
                                </summary>
                                <div className="border-t p-4">
                                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                    <p className="max-w-3xl text-xs text-muted-foreground">
                                      Allocate the existing role portfolio to destination business units. BU totals must reconcile back to each role's Build / Move / Buy target. A Move row identifies the destination only; source BU is not inferred.
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={resetBusinessUnitResponseAllocation}
                                        disabled={businessUnitResponseLoading}
                                        className="rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Reset
                                      </button>
                                      <button
                                        type="button"
                                        onClick={runBusinessUnitResponseAllocation}
                                        disabled={businessUnitResponseLoading}
                                        className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {businessUnitResponseLoading
                                          ? "Running..."
                                          : "Run BU Allocation"}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="max-h-[320px] overflow-auto rounded-md border">
                                    <table className="w-full min-w-[760px] text-xs">
                                      <thead className="sticky top-0 bg-background">
                                        <tr className="border-b text-left text-muted-foreground">
                                          <th className="p-3">Business Unit / Role</th>
                                          <th className="p-3 text-right">Gross Demand</th>
                                          <th className="p-3 text-right">Build</th>
                                          <th className="p-3 text-right">Move</th>
                                          <th className="p-3 text-right">Buy</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {structuralPositionResult.business_unit_job_profile_impact
                                          .filter(
                                            (row) =>
                                              row.authorized_position_delta > 0 &&
                                              responsePortfolioResult.roles.some(
                                                (role) =>
                                                  role.job_profile_code ===
                                                  row.job_profile_code
                                              )
                                          )
                                          .map((row) => {
                                            const allocationKey =
                                              row.org_code +
                                              "::" +
                                              row.job_profile_code;
                                            const allocation =
                                              businessUnitResponseAllocations[
                                                allocationKey
                                              ] ??
                                              createResponsePlanAllocation();

                                            return (
                                              <tr
                                                key={allocationKey}
                                                className="border-b last:border-0"
                                              >
                                                <td className="p-3">
                                                  <p className="font-medium">
                                                    {row.org_name}
                                                  </p>
                                                  <p className="text-[10px] text-muted-foreground">
                                                    {row.job_profile_name}
                                                  </p>
                                                </td>
                                                <td className="p-3 text-right font-medium tabular-nums">
                                                  {formatSignedModeledCount(
                                                    row.authorized_position_delta
                                                  )}
                                                </td>
                                                {(
                                                  [
                                                    ["build", "Build"],
                                                    ["move", "Move"],
                                                    ["buy", "Buy"],
                                                  ] as const
                                                ).map(([key, label]) => (
                                                  <td
                                                    key={key}
                                                    className="p-3"
                                                  >
                                                    <input
                                                      aria-label={
                                                        row.org_name +
                                                        " " +
                                                        row.job_profile_name +
                                                        " " +
                                                        label
                                                      }
                                                      type="number"
                                                      min={0}
                                                      step={1}
                                                      value={allocation[key]}
                                                      onChange={(event) =>
                                                        updateBusinessUnitResponseAllocation(
                                                          row.org_code,
                                                          row.job_profile_code,
                                                          key,
                                                          Number(
                                                            event.target.value
                                                          )
                                                        )
                                                      }
                                                      className="w-full min-w-[80px] rounded-md border bg-background px-2 py-1.5 text-right tabular-nums"
                                                    />
                                                  </td>
                                                ))}
                                              </tr>
                                            );
                                          })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {businessUnitResponseError && (
                                    <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                      {businessUnitResponseError}
                                    </div>
                                  )}

                                  {businessUnitResponseResult && (
                                    <>
                                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-md border p-3">
                                          <p className="text-[11px] text-muted-foreground">
                                            Enterprise Net Need
                                          </p>
                                          <p className="mt-1 text-xl font-semibold">
                                            {formatModeledCount(
                                              businessUnitResponseResult.scenario_net_role_demand
                                            )}
                                          </p>
                                        </div>
                                        <div className="rounded-md border p-3">
                                          <p className="text-[11px] text-muted-foreground">
                                            Gross BU Destination Demand
                                          </p>
                                          <p className="mt-1 text-xl font-semibold">
                                            {formatModeledCount(
                                              businessUnitResponseResult.gross_destination_demand
                                            )}
                                          </p>
                                        </div>
                                        <div className="rounded-md border p-3">
                                          <p className="text-[11px] text-muted-foreground">
                                            Contraction Offset
                                          </p>
                                          <p className="mt-1 text-xl font-semibold">
                                            {formatModeledCount(
                                              businessUnitResponseResult.contraction_offset
                                            )}
                                          </p>
                                        </div>
                                        <div className="rounded-md border p-3">
                                          <p className="text-[11px] text-muted-foreground">
                                            Remaining Net Gap
                                          </p>
                                          <p className="mt-1 text-xl font-semibold">
                                            {formatModeledCount(
                                              businessUnitResponseResult.remaining_net_gap_if_executed
                                            )}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground">
                                            {formatModeledCount(
                                              businessUnitResponseResult.effective_coverage_if_executed
                                            )} effective coverage
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mt-4 overflow-x-auto rounded-md border">
                                        <table className="w-full min-w-[820px] text-xs">
                                          <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                              <th className="p-3">Role Reconciliation</th>
                                              <th className="p-3 text-right">Portfolio B / M / B</th>
                                              <th className="p-3 text-right">BU Sum B / M / B</th>
                                              <th className="p-3 text-right">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {businessUnitResponseResult.roles.map(
                                              (role) => (
                                                <tr
                                                  key={role.job_profile_code}
                                                  className="border-b last:border-0"
                                                >
                                                  <td className="p-3 font-medium">
                                                    {role.job_profile_name}
                                                  </td>
                                                  <td className="p-3 text-right tabular-nums">
                                                    {role.portfolio_target_allocation
                                                      ? formatModeledCount(
                                                          role.portfolio_target_allocation.build
                                                        ) +
                                                        " / " +
                                                        formatModeledCount(
                                                          role.portfolio_target_allocation.move
                                                        ) +
                                                        " / " +
                                                        formatModeledCount(
                                                          role.portfolio_target_allocation.buy
                                                        )
                                                      : "—"}
                                                  </td>
                                                  <td className="p-3 text-right tabular-nums">
                                                    {formatModeledCount(
                                                      role.allocation.build
                                                    ) +
                                                      " / " +
                                                      formatModeledCount(
                                                        role.allocation.move
                                                      ) +
                                                      " / " +
                                                      formatModeledCount(
                                                        role.allocation.buy
                                                      )}
                                                  </td>
                                                  <td className="p-3 text-right font-medium">
                                                    {role.portfolio_allocation_reconciled === null
                                                      ? "No target"
                                                      : role.portfolio_allocation_reconciled
                                                        ? "Reconciled"
                                                        : "Mismatch"}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                      <div className="mt-3 text-[11px] text-muted-foreground">
                                        {businessUnitResponseResult.unallocated_destinations.length.toLocaleString()} positive destination row(s) remain unallocated ·{" "}
                                        {businessUnitResponseResult.contractions.length.toLocaleString()} contraction offset row(s). Destination gaps are not automatically treated as enterprise gaps.
                                      </div>

                                      {businessUnitResponseResult.warnings.length > 0 && (
                                        <div className="mt-3 rounded-md border p-3">
                                          <p className="text-xs font-medium">
                                            BU allocation warnings
                                          </p>
                                          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                                            {businessUnitResponseResult.warnings.map(
                                              (warning) => (
                                                <li key={warning}>
                                                  - {warning}
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}

                                      <details
                                        className={
                                          workflowView === "execute"
                                            ? "mt-4 rounded-md border"
                                            : "hidden"
                                        }
                                        open={
                                          workflowView ===
                                          "execute"
                                        }
                                      >
                                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                                          Time-Phased Execution
                                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            monthly effective capacity
                                          </span>
                                        </summary>
                                        <div className="border-t p-4">
                                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                            <p className="max-w-3xl text-xs text-muted-foreground">
                                              Assign explicit effective months to approved BU Build, Move, and Buy capacity. Timing is user-supplied; course duration and historical time-to-fill do not set these dates.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                onClick={resetResponseExecution}
                                                disabled={
                                                  responseExecutionLoading ||
                                                  constraintAwareScheduleLoading
                                                }
                                                className="rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                              >
                                                Reset
                                              </button>
                                              <button
                                                type="button"
                                                onClick={runConstraintAwareScheduler}
                                                disabled={constraintAwareScheduleLoading}
                                                className="rounded-md border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                                              >
                                                {constraintAwareScheduleLoading
                                                  ? "Scheduling..."
                                                  : "Auto Schedule"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={runResponseExecution}
                                                disabled={responseExecutionLoading}
                                                className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                                              >
                                                {responseExecutionLoading
                                                  ? "Running..."
                                                  : "Run Timeline"}
                                              </button>
                                            </div>
                                          </div>

                                          <div className="mb-3 rounded-md border bg-muted/20 p-3">
                                            <p className="text-[11px] font-medium">
                                              Auto-scheduler limits
                                            </p>
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                              Optional. Blank monthly caps are unconstrained. These values are shared with the detailed Constraint Feasibility panel below.
                                            </p>
                                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                              {(
                                                [
                                                  ["max_monthly_build", "Monthly Build"],
                                                  ["max_monthly_move", "Monthly Move"],
                                                  ["max_monthly_buy", "Monthly Buy"],
                                                  ["max_monthly_total", "Combined monthly"],
                                                ] as const
                                              ).map(([key, label]) => (
                                                <label
                                                  key={key}
                                                  className="rounded-md border bg-background p-2"
                                                >
                                                  <span className="text-[10px] text-muted-foreground">
                                                    {label}
                                                  </span>
                                                  <input
                                                    type="number"
                                                    min={0}
                                                    step={0.1}
                                                    placeholder="No cap"
                                                    value={
                                                      responseConstraintDraft[
                                                        key
                                                      ] ?? ""
                                                    }
                                                    onChange={(event) =>
                                                      updateResponseConstraintDraft(
                                                        key,
                                                        event.target.value === ""
                                                          ? null
                                                          : Number(
                                                              event.target.value
                                                            )
                                                      )
                                                    }
                                                    className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-right text-xs tabular-nums"
                                                  />
                                                </label>
                                              ))}
                                            </div>
                                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                                              <label className="rounded-md border bg-background p-2">
                                                <span className="text-[10px] text-muted-foreground">
                                                  Coverage deadline
                                                </span>
                                                <input
                                                  type="month"
                                                  min={nextMonthValue(
                                                    businessUnitResponseResult.as_of
                                                  )}
                                                  value={
                                                    responseConstraintDraft.deadline_month
                                                  }
                                                  onChange={(event) =>
                                                    updateResponseConstraintDraft(
                                                      "deadline_month",
                                                      event.target.value
                                                    )
                                                  }
                                                  className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                                                />
                                              </label>
                                              <label className="rounded-md border bg-background p-2">
                                                <span className="text-[10px] text-muted-foreground">
                                                  Required coverage by deadline %
                                                </span>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  max={100}
                                                  step={1}
                                                  placeholder="No target"
                                                  value={
                                                    responseConstraintDraft.required_coverage_pct_by_deadline ??
                                                    ""
                                                  }
                                                  onChange={(event) =>
                                                    updateResponseConstraintDraft(
                                                      "required_coverage_pct_by_deadline",
                                                      event.target.value === ""
                                                        ? null
                                                        : Number(
                                                            event.target.value
                                                          )
                                                    )
                                                  }
                                                  className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-right text-xs tabular-nums"
                                                />
                                              </label>
                                            </div>
                                          </div>

                                          {constraintAwareScheduleError && (
                                            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                              {constraintAwareScheduleError}
                                            </div>
                                          )}

                                          {constraintAwareScheduleResult && (
                                            <div className="mb-3 rounded-md border p-3">
                                              <div className="grid gap-3 sm:grid-cols-3">
                                                <div>
                                                  <p className="text-[10px] text-muted-foreground">
                                                    Fully Scheduled
                                                  </p>
                                                  <p className="mt-1 font-semibold">
                                                    {constraintAwareScheduleResult.fully_scheduled
                                                      ? "Yes"
                                                      : "No"}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-[10px] text-muted-foreground">
                                                    Hard Constraints
                                                  </p>
                                                  <p className="mt-1 font-semibold">
                                                    {constraintAwareScheduleResult.hard_constraint_feasible === null
                                                      ? "Not checked"
                                                      : constraintAwareScheduleResult.hard_constraint_feasible
                                                        ? "Feasible"
                                                        : "Breach"}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-[10px] text-muted-foreground">
                                                    Generated Window
                                                  </p>
                                                  <p className="mt-1 font-semibold">
                                                    {formatMonth(
                                                      constraintAwareScheduleResult.scheduling_start_month +
                                                        "-01"
                                                    )}{" "}
                                                    →{" "}
                                                    {formatMonth(
                                                      constraintAwareScheduleResult.scheduling_end_month +
                                                        "-01"
                                                    )}
                                                  </p>
                                                </div>
                                              </div>
                                              {constraintAwareScheduleResult.blockers.length >
                                                0 && (
                                                <ul className="mt-3 space-y-1 text-[10px] text-muted-foreground">
                                                  {constraintAwareScheduleResult.blockers.map(
                                                    (blocker) => (
                                                      <li key={blocker}>
                                                        - {blocker}
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              )}
                                            </div>
                                          )}

                                          <div className="max-h-[360px] overflow-auto rounded-md border">
                                            <table className="w-full min-w-[900px] text-xs">
                                              <thead className="sticky top-0 bg-background">
                                                <tr className="border-b text-left text-muted-foreground">
                                                  <th className="p-3">Destination / Role</th>
                                                  <th className="p-3">Path</th>
                                                  <th className="p-3 text-right">Approved</th>
                                                  <th className="p-3 text-right">Phase Amount</th>
                                                  <th className="p-3">Effective Month</th>
                                                  <th className="p-3 text-right">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {responseExecutionDrafts.map(
                                                  (draft) => {
                                                    const target =
                                                      businessUnitResponseResult.business_units.find(
                                                        (row) =>
                                                          row.org_code ===
                                                            draft.org_code &&
                                                          row.job_profile_code ===
                                                            draft.job_profile_code
                                                      );
                                                    const targetAmount =
                                                      target?.allocation[
                                                        draft.response_type
                                                      ] ?? 0;

                                                    return (
                                                      <tr
                                                        key={draft.id}
                                                        className="border-b last:border-0"
                                                      >
                                                        <td className="p-3">
                                                          <p className="font-medium">
                                                            {draft.org_name}
                                                          </p>
                                                          <p className="text-[10px] text-muted-foreground">
                                                            {draft.job_profile_name}
                                                          </p>
                                                        </td>
                                                        <td className="p-3 font-medium">
                                                          {formatAssumptionName(
                                                            draft.response_type
                                                          )}
                                                        </td>
                                                        <td className="p-3 text-right tabular-nums">
                                                          {formatModeledCount(
                                                            targetAmount
                                                          )}
                                                        </td>
                                                        <td className="p-3">
                                                          <input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            value={draft.amount}
                                                            onChange={(event) =>
                                                              updateResponseExecutionDraft(
                                                                draft.id,
                                                                {
                                                                  amount: Number(
                                                                    event.target.value
                                                                  ),
                                                                }
                                                              )
                                                            }
                                                            className="w-full min-w-[90px] rounded-md border bg-background px-2 py-1.5 text-right tabular-nums"
                                                          />
                                                        </td>
                                                        <td className="p-3">
                                                          <input
                                                            type="month"
                                                            min={nextMonthValue(
                                                              businessUnitResponseResult.as_of
                                                            )}
                                                            value={
                                                              draft.effective_month
                                                            }
                                                            onChange={(event) =>
                                                              updateResponseExecutionDraft(
                                                                draft.id,
                                                                {
                                                                  effective_month:
                                                                    event.target.value,
                                                                }
                                                              )
                                                            }
                                                            className="w-full min-w-[150px] rounded-md border bg-background px-2 py-1.5"
                                                          />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                          <div className="flex justify-end gap-2">
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                addResponseExecutionPhase(
                                                                  draft
                                                                )
                                                              }
                                                              className="rounded-md border px-2 py-1 text-[10px]"
                                                            >
                                                              Add phase
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={() =>
                                                                removeResponseExecutionPhase(
                                                                  draft.id
                                                                )
                                                              }
                                                              className="rounded-md border px-2 py-1 text-[10px]"
                                                            >
                                                              Remove
                                                            </button>
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    );
                                                  }
                                                )}
                                              </tbody>
                                            </table>
                                          </div>

                                          <p className="mt-2 text-[11px] text-muted-foreground">
                                            The first executable month is{" "}
                                            {formatMonth(
                                              nextMonthValue(
                                                businessUnitResponseResult.as_of
                                              ) + "-01"
                                            )}. Leave a phase without a month to keep that approved capacity unscheduled.
                                          </p>

                                          {responseExecutionError && (
                                            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                              {responseExecutionError}
                                            </div>
                                          )}

                                          {responseExecutionResult && (
                                            <>
                                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                <div className="rounded-md border p-3">
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Execution Window
                                                  </p>
                                                  <p className="mt-1 font-semibold">
                                                    {formatMonth(
                                                      responseExecutionResult.planning_start_month +
                                                        "-01"
                                                    )}{" "}
                                                    →{" "}
                                                    {formatMonth(
                                                      responseExecutionResult.planning_end_month +
                                                        "-01"
                                                    )}
                                                  </p>
                                                </div>
                                                <div className="rounded-md border p-3">
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Scheduled B / M / B
                                                  </p>
                                                  <p className="mt-1 text-xl font-semibold tabular-nums">
                                                    {formatModeledCount(
                                                      responseExecutionResult.scheduled_allocation.build
                                                    )}{" "}
                                                    /{" "}
                                                    {formatModeledCount(
                                                      responseExecutionResult.scheduled_allocation.move
                                                    )}{" "}
                                                    /{" "}
                                                    {formatModeledCount(
                                                      responseExecutionResult.scheduled_allocation.buy
                                                    )}
                                                  </p>
                                                </div>
                                                <div className="rounded-md border p-3">
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Unscheduled B / M / B
                                                  </p>
                                                  <p className="mt-1 text-xl font-semibold tabular-nums">
                                                    {formatModeledCount(
                                                      responseExecutionResult.unscheduled_allocation.build
                                                    )}{" "}
                                                    /{" "}
                                                    {formatModeledCount(
                                                      responseExecutionResult.unscheduled_allocation.move
                                                    )}{" "}
                                                    /{" "}
                                                    {formatModeledCount(
                                                      responseExecutionResult.unscheduled_allocation.buy
                                                    )}
                                                  </p>
                                                </div>
                                                <div className="rounded-md border p-3">
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Final Remaining Net Gap
                                                  </p>
                                                  <p className="mt-1 text-xl font-semibold">
                                                    {formatModeledCount(
                                                      responseExecutionResult.final_remaining_net_gap
                                                    )}
                                                  </p>
                                                  <p className="text-[10px] text-muted-foreground">
                                                    {responseExecutionResult.final_coverage_pct.toFixed(
                                                      1
                                                    )}% coverage
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="mt-4 max-h-[360px] overflow-auto rounded-md border">
                                                <table className="w-full min-w-[820px] text-xs">
                                                  <thead className="sticky top-0 bg-background">
                                                    <tr className="border-b text-left text-muted-foreground">
                                                      <th className="p-3">Month</th>
                                                      <th className="p-3 text-right">Effective Build</th>
                                                      <th className="p-3 text-right">Effective Move</th>
                                                      <th className="p-3 text-right">Effective Buy</th>
                                                      <th className="p-3 text-right">Cumulative Coverage</th>
                                                      <th className="p-3 text-right">Remaining Gap</th>
                                                      <th className="p-3 text-right">Coverage %</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {responseExecutionResult.timeline.map(
                                                      (point) => (
                                                        <tr
                                                          key={point.month}
                                                          className="border-b last:border-0"
                                                        >
                                                          <td className="p-3 font-medium">
                                                            {formatMonth(
                                                              point.month +
                                                                "-01"
                                                            )}
                                                          </td>
                                                          <td className="p-3 text-right tabular-nums">
                                                            {formatModeledCount(
                                                              point.effective_build
                                                            )}
                                                          </td>
                                                          <td className="p-3 text-right tabular-nums">
                                                            {formatModeledCount(
                                                              point.effective_move
                                                            )}
                                                          </td>
                                                          <td className="p-3 text-right tabular-nums">
                                                            {formatModeledCount(
                                                              point.effective_buy
                                                            )}
                                                          </td>
                                                          <td className="p-3 text-right font-medium tabular-nums">
                                                            {formatModeledCount(
                                                              point.cumulative_effective_coverage
                                                            )}
                                                          </td>
                                                          <td className="p-3 text-right font-medium tabular-nums">
                                                            {formatModeledCount(
                                                              point.remaining_net_gap
                                                            )}
                                                          </td>
                                                          <td className="p-3 text-right tabular-nums">
                                                            {point.coverage_pct.toFixed(
                                                              1
                                                            )}%
                                                          </td>
                                                        </tr>
                                                      )
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>

                                              {responseExecutionResult.warnings.length > 0 && (
                                                <div className="mt-3 rounded-md border p-3">
                                                  <p className="text-xs font-medium">
                                                    Execution warnings
                                                  </p>
                                                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                                                    {responseExecutionResult.warnings.map(
                                                      (warning) => (
                                                        <li key={warning}>
                                                          - {warning}
                                                        </li>
                                                      )
                                                    )}
                                                  </ul>
                                                </div>
                                              )}

                                              <details className="mt-4 rounded-md border">
                                                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                                                  Constraint Feasibility
                                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                    hard caps + evidence checks
                                                  </span>
                                                </summary>
                                                <div className="border-t p-4">
                                                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                                    <p className="max-w-3xl text-xs text-muted-foreground">
                                                      Blank caps are unconstrained. Hard feasibility uses only the limits you enter plus schedule-integrity checks. Readiness and recruiting history remain separate evidence signals.
                                                    </p>
                                                    <div className="flex gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={resetResponseConstraints}
                                                        disabled={responseConstraintLoading}
                                                        className="rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                                      >
                                                        Reset
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={runResponseConstraints}
                                                        disabled={responseConstraintLoading}
                                                        className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                                                      >
                                                        {responseConstraintLoading
                                                          ? "Checking..."
                                                          : "Check Constraints"}
                                                      </button>
                                                    </div>
                                                  </div>

                                                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                    {(
                                                      [
                                                        ["max_total_build", "Total Build cap"],
                                                        ["max_total_move", "Total Move cap"],
                                                        ["max_total_buy", "Total Buy cap"],
                                                        ["max_monthly_build", "Monthly Build cap"],
                                                        ["max_monthly_move", "Monthly Move cap"],
                                                        ["max_monthly_buy", "Monthly Buy cap"],
                                                        ["max_monthly_total", "Combined monthly cap"],
                                                      ] as const
                                                    ).map(([key, label]) => (
                                                      <label
                                                        key={key}
                                                        className="rounded-md border p-3"
                                                      >
                                                        <span className="text-[11px] text-muted-foreground">
                                                          {label}
                                                        </span>
                                                        <input
                                                          type="number"
                                                          min={0}
                                                          step={1}
                                                          placeholder="No cap"
                                                          value={
                                                            responseConstraintDraft[
                                                              key
                                                            ] ?? ""
                                                          }
                                                          onChange={(event) =>
                                                            updateResponseConstraintDraft(
                                                              key,
                                                              event.target.value === ""
                                                                ? null
                                                                : Number(
                                                                    event.target.value
                                                                  )
                                                            )
                                                          }
                                                          className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                                                        />
                                                      </label>
                                                    ))}
                                                  </div>

                                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                    <label className="rounded-md border p-3">
                                                      <span className="text-[11px] text-muted-foreground">
                                                        Coverage deadline
                                                      </span>
                                                      <input
                                                        type="month"
                                                        min={
                                                          responseExecutionResult.planning_start_month
                                                        }
                                                        value={
                                                          responseConstraintDraft.deadline_month
                                                        }
                                                        onChange={(event) =>
                                                          updateResponseConstraintDraft(
                                                            "deadline_month",
                                                            event.target.value
                                                          )
                                                        }
                                                        className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                                                      />
                                                    </label>

                                                    <label className="rounded-md border p-3">
                                                      <span className="text-[11px] text-muted-foreground">
                                                        Required coverage by deadline %
                                                      </span>
                                                      <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        placeholder="No deadline target"
                                                        value={
                                                          responseConstraintDraft.required_coverage_pct_by_deadline ??
                                                          ""
                                                        }
                                                        onChange={(event) =>
                                                          updateResponseConstraintDraft(
                                                            "required_coverage_pct_by_deadline",
                                                            event.target.value === ""
                                                              ? null
                                                              : Number(
                                                                  event.target.value
                                                                )
                                                          )
                                                        }
                                                        className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                                                      />
                                                    </label>
                                                  </div>

                                                  <label className="mt-3 flex items-center gap-2 rounded-md border p-3 text-xs">
                                                    <input
                                                      type="checkbox"
                                                      checked={
                                                        responseConstraintDraft.require_all_approved_capacity_scheduled
                                                      }
                                                      onChange={(event) =>
                                                        updateResponseConstraintDraft(
                                                          "require_all_approved_capacity_scheduled",
                                                          event.target.checked
                                                        )
                                                      }
                                                    />
                                                    Require every approved Build / Move / Buy unit to have an effective month
                                                  </label>

                                                  <p className="mt-3 text-[11px] text-muted-foreground">
                                                    FY2027 budget data is not automatically used here because the execution horizon begins in 2026 and path-specific Build / Move / Buy costs are not modeled as defensible hard constraints.
                                                  </p>

                                                  {responseConstraintError && (
                                                    <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                                      {responseConstraintError}
                                                    </div>
                                                  )}

                                                  {responseConstraintResult && (
                                                    <>
                                                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                        <div className="rounded-md border p-3">
                                                          <p className="text-[11px] text-muted-foreground">
                                                            Hard-Constraint Result
                                                          </p>
                                                          <p className="mt-1 text-xl font-semibold">
                                                            {responseConstraintResult.overall_feasible
                                                              ? "Feasible"
                                                              : "Breach"}
                                                          </p>
                                                        </div>
                                                        <div className="rounded-md border p-3">
                                                          <p className="text-[11px] text-muted-foreground">
                                                            Constraints Checked
                                                          </p>
                                                          <p className="mt-1 text-xl font-semibold">
                                                            {responseConstraintResult.hard_constraint_count.toLocaleString()}
                                                          </p>
                                                        </div>
                                                        <div className="rounded-md border p-3">
                                                          <p className="text-[11px] text-muted-foreground">
                                                            Hard Breaches
                                                          </p>
                                                          <p className="mt-1 text-xl font-semibold">
                                                            {responseConstraintResult.hard_constraint_breaches.toLocaleString()}
                                                          </p>
                                                        </div>
                                                      </div>

                                                      <div className="mt-4 overflow-x-auto rounded-md border">
                                                        <table className="w-full min-w-[760px] text-xs">
                                                          <thead>
                                                            <tr className="border-b text-left text-muted-foreground">
                                                              <th className="p-3">Hard Constraint</th>
                                                              <th className="p-3 text-right">Actual</th>
                                                              <th className="p-3 text-right">Limit / Minimum</th>
                                                              <th className="p-3 text-right">Result</th>
                                                            </tr>
                                                          </thead>
                                                          <tbody>
                                                            {responseConstraintResult.hard_constraints.map(
                                                              (row) => (
                                                                <tr
                                                                  key={row.constraint_code}
                                                                  className="border-b last:border-0"
                                                                >
                                                                  <td className="p-3">
                                                                    <p className="font-medium">
                                                                      {row.label}
                                                                    </p>
                                                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                                                      {row.detail}
                                                                    </p>
                                                                  </td>
                                                                  <td className="p-3 text-right tabular-nums">
                                                                    {String(
                                                                      row.actual_value
                                                                    )}
                                                                  </td>
                                                                  <td className="p-3 text-right tabular-nums">
                                                                    {String(
                                                                      row.limit_value
                                                                    )}
                                                                  </td>
                                                                  <td className="p-3 text-right font-medium">
                                                                    {row.passed
                                                                      ? "Pass"
                                                                      : "Breach"}
                                                                  </td>
                                                                </tr>
                                                              )
                                                            )}
                                                          </tbody>
                                                        </table>
                                                      </div>

                                                      {responseConstraintResult.evidence_checks.length >
                                                        0 && (
                                                        <div className="mt-4 overflow-x-auto rounded-md border">
                                                          <table className="w-full min-w-[900px] text-xs">
                                                            <thead>
                                                              <tr className="border-b text-left text-muted-foreground">
                                                                <th className="p-3">Role Evidence</th>
                                                                <th className="p-3 text-right">Build Target</th>
                                                                <th className="p-3 text-right">Path-Covered Near-Ready</th>
                                                                <th className="p-3 text-right">Move Target</th>
                                                                <th className="p-3 text-right">Role-Ready</th>
                                                                <th className="p-3 text-right">Buy Target</th>
                                                                <th className="p-3 text-right">12M External Fills</th>
                                                              </tr>
                                                            </thead>
                                                            <tbody>
                                                              {responseConstraintResult.evidence_checks.map(
                                                                (row) => (
                                                                  <tr
                                                                    key={
                                                                      row.job_profile_code
                                                                    }
                                                                    className="border-b last:border-0"
                                                                  >
                                                                    <td className="p-3 font-medium">
                                                                      {row.job_profile_name}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {formatModeledCount(
                                                                        row.build_target
                                                                      )}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {row.fully_pathway_covered_near_ready.toLocaleString()}
                                                                      {row.build_exceeds_current_path_covered
                                                                        ? " *"
                                                                        : ""}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {formatModeledCount(
                                                                        row.move_target
                                                                      )}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {row.role_ready_internal_candidates.toLocaleString()}
                                                                      {row.move_exceeds_role_ready
                                                                        ? " *"
                                                                        : ""}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {formatModeledCount(
                                                                        row.buy_target
                                                                      )}
                                                                    </td>
                                                                    <td className="p-3 text-right tabular-nums">
                                                                      {row.recent_12m_external_fills.toLocaleString()}
                                                                    </td>
                                                                  </tr>
                                                                )
                                                              )}
                                                            </tbody>
                                                          </table>
                                                        </div>
                                                      )}

                                                      <p className="mt-3 text-[11px] text-muted-foreground">
                                                        * Evidence target exceeds currently observed support. Evidence warnings do not make the hard-constraint plan infeasible unless you also set a numeric cap.
                                                      </p>
                                                    </>
                                                  )}
                                                </div>
                                              </details>
                                            </>
                                          )}
                                        </div>
                                      </details>
                                    </>
                                  )}
                                </div>
                              </details>

                              <div className="mt-4 overflow-x-auto rounded-md border">
                                <table className="w-full min-w-[760px] text-sm">
                                  <thead>
                                    <tr className="border-b text-left text-xs text-muted-foreground">
                                      <th className="p-3">Role</th>
                                      <th className="p-3 text-right">Demand</th>
                                      <th className="p-3 text-right">Build</th>
                                      <th className="p-3 text-right">Move</th>
                                      <th className="p-3 text-right">Buy</th>
                                      <th className="p-3 text-right">Remaining</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {responsePortfolioResult.roles.map(
                                      (role) => (
                                        <tr
                                          key={role.job_profile_code}
                                          className="border-b last:border-0"
                                        >
                                          <td className="p-3 font-medium">
                                            {role.job_profile_name}
                                          </td>
                                          <td className="p-3 text-right tabular-nums">
                                            {formatModeledCount(
                                              role.scenario_created_role_demand
                                            )}
                                          </td>
                                          <td className="p-3 text-right tabular-nums">
                                            {formatModeledCount(
                                              role.allocation.build
                                            )}
                                          </td>
                                          <td className="p-3 text-right tabular-nums">
                                            {formatModeledCount(
                                              role.allocation.move
                                            )}
                                          </td>
                                          <td className="p-3 text-right tabular-nums">
                                            {formatModeledCount(
                                              role.allocation.buy
                                            )}
                                          </td>
                                          <td className="p-3 text-right font-medium tabular-nums">
                                            {formatModeledCount(
                                              role.remaining_role_gap_if_executed
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {responsePortfolioResult.warnings.length > 0 && (
                                <div className="mt-4 rounded-md border p-3">
                                  <p className="text-xs font-medium">
                                    Portfolio warnings
                                  </p>
                                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    {responsePortfolioResult.warnings.map(
                                      (warning) => (
                                        <li key={warning}>
                                          - {warning}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {structuralPositionResult.job_profile_impact.some(
                        (row) =>
                          row.authorized_position_delta > 0
                      ) && (
                        <div
                          className={
                            workflowView === "respond"
                              ? "mt-4 rounded-md border p-4"
                              : "hidden"
                          }
                        >
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h5 className="font-semibold">
                                Role Workforce Response Plan
                              </h5>
                              <p className="text-sm text-muted-foreground">
                                Plan Build, Move, and Buy in role units across the full governed skill bundle without double-counting the same role across skills.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={resetRoleResponsePlan}
                                disabled={roleResponsePlanLoading}
                                className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={runRoleResponsePlan}
                                disabled={
                                  !roleResponsePlanProfile ||
                                  roleResponsePlanLoading
                                }
                                className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {roleResponsePlanLoading
                                  ? "Running..."
                                  : "Run Role Plan"}
                              </button>
                            </div>
                          </div>

                          <div className="mb-4 grid gap-3 lg:grid-cols-[1.6fr_repeat(3,minmax(130px,1fr))]">
                            <label className="rounded-md border p-3">
                              <span
                                className="cursor-help border-b border-dotted text-[11px] text-muted-foreground"
                                title="Only job profiles with positive scenario-created authorized-position demand are available."
                              >
                                Job Profile
                              </span>
                              <select
                                value={roleResponsePlanProfile}
                                onChange={(event) => {
                                  setRoleResponsePlanProfile(
                                    event.target.value
                                  );
                                  setRoleResponsePlanAllocation(
                                    createResponsePlanAllocation()
                                  );
                                  setRoleResponsePlanResult(null);
                                  setRoleResponsePlanError(null);
                                }}
                                className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                              >
                                {structuralPositionResult.job_profile_impact
                                  .filter(
                                    (row) =>
                                      row.authorized_position_delta > 0
                                  )
                                  .map((row) => (
                                    <option
                                      key={row.job_profile_code}
                                      value={row.job_profile_code}
                                    >
                                      {row.job_profile_name +
                                        " - demand +" +
                                        formatModeledCount(
                                          row.authorized_position_delta
                                        )}
                                    </option>
                                  ))}
                              </select>
                            </label>

                            {(
                              [
                                ["build", "Build"],
                                ["move", "Move"],
                                ["buy", "Buy"],
                              ] as const
                            ).map(([key, label]) => (
                              <label
                                key={key}
                                className="rounded-md border p-3"
                              >
                                <span className="text-[11px] text-muted-foreground">
                                  {label} roles
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={
                                    roleResponsePlanAllocation[
                                      key
                                    ]
                                  }
                                  onChange={(event) => {
                                    setRoleResponsePlanAllocation(
                                      (current) => ({
                                        ...current,
                                        [key]: Number(
                                          event.target.value
                                        ),
                                      })
                                    );
                                    setRoleResponsePlanResult(null);
                                    setRoleResponsePlanError(null);
                                  }}
                                  className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums"
                                />
                              </label>
                            ))}
                          </div>

                          <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                            One planned role unit is counted once across the entire required-skill bundle. Skill-level learning, mobility, and hiring signals are evidence only and are never summed as unique people.
                          </div>

                          {roleResponsePlanError && (
                            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                              {roleResponsePlanError}
                            </div>
                          )}

                          {roleResponsePlanResult && (
                            <>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Scenario Role Demand
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      roleResponsePlanResult.scenario_created_role_demand
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Planned Coverage
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      roleResponsePlanResult.planned_role_coverage_if_executed
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {roleResponsePlanResult.coverage_pct_if_executed.toFixed(
                                      1
                                    )}% if executed
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Remaining Role Gap
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      roleResponsePlanResult.remaining_role_gap_if_executed
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Required Skills
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {roleResponsePlanResult.evidence_summary.required_skill_count.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {roleResponsePlanResult.evidence_summary.skills_with_build_pathway} build pathways
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 rounded-md border p-4">
                                <div className="mb-3">
                                  <p className="font-medium">
                                    Internal Talent Readiness
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Active employees who prefer this role, excluding employees already in it. Readiness is evaluated across every required skill and proficiency threshold.
                                  </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-md border p-3">
                                    <p
                                      className="cursor-help border-b border-dotted text-xs text-muted-foreground"
                                      title="Active employees who prefer the target profile and are not already incumbent in it."
                                    >
                                      Eligible Internal Pool
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.internal_talent_readiness.candidate_pool.eligible_internal_candidates.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="rounded-md border p-3">
                                    <p
                                      className="cursor-help border-b border-dotted text-xs text-muted-foreground"
                                      title="Meets or exceeds the required proficiency for every required skill in the target job profile."
                                    >
                                      Role-ready
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.internal_talent_readiness.candidate_pool.role_ready.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {roleResponsePlanResult.internal_talent_readiness.candidate_pool.role_ready_pct.toFixed(1)}% of eligible pool
                                    </p>
                                  </div>
                                  <div className="rounded-md border p-3">
                                    <p
                                      className="cursor-help border-b border-dotted text-xs text-muted-foreground"
                                      title="Misses no more than two required skills and has no more than two total proficiency points of shortfall."
                                    >
                                      Near-ready
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.internal_talent_readiness.candidate_pool.near_ready.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Build-development pool
                                    </p>
                                  </div>
                                  <div className="rounded-md border p-3">
                                    <p
                                      className="cursor-help border-b border-dotted text-xs text-muted-foreground"
                                      title="Interested internal candidates who need more development than the near-ready threshold."
                                    >
                                      Longer-term
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.internal_talent_readiness.candidate_pool.longer_term.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Development beyond near-ready
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-md border bg-muted/20 p-3">
                                  <div className="mb-2">
                                    <p className="text-xs font-medium">
                                      Development pathway coverage
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Checks whether each near-ready candidate's current required-skill gaps have active mapped learning courses. Course availability does not guarantee proficiency gain.
                                    </p>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-3">
                                    <div className="rounded-md border bg-background p-2">
                                      <p className="text-[10px] text-muted-foreground">
                                        Fully path-covered
                                      </p>
                                      <p className="mt-1 font-semibold tabular-nums">
                                        {roleResponsePlanResult.internal_talent_readiness.development_pathway_coverage.fully_pathway_covered_candidates.toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="rounded-md border bg-background p-2">
                                      <p className="text-[10px] text-muted-foreground">
                                        Partial pathway
                                      </p>
                                      <p className="mt-1 font-semibold tabular-nums">
                                        {roleResponsePlanResult.internal_talent_readiness.development_pathway_coverage.partially_pathway_covered_candidates.toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="rounded-md border bg-background p-2">
                                      <p className="text-[10px] text-muted-foreground">
                                        No active pathway
                                      </p>
                                      <p className="mt-1 font-semibold tabular-nums">
                                        {roleResponsePlanResult.internal_talent_readiness.development_pathway_coverage.no_active_pathway_candidates.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {roleResponsePlanResult.internal_talent_readiness.top_near_ready_skill_gaps.length > 0 && (
                                  <div className="mt-4 border-t pt-4">
                                    <p className="text-xs font-medium">
                                      Most common near-ready gaps
                                    </p>
                                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                                      {roleResponsePlanResult.internal_talent_readiness.top_near_ready_skill_gaps.map(
                                        (gap) => (
                                          <div
                                            key={gap.skill_code}
                                            className="rounded-md border px-3 py-2 text-xs"
                                          >
                                            <span className="font-medium">
                                              {gap.skill_name}
                                            </span>
                                            <span className="text-muted-foreground">
                                              {" · "}
                                              {gap.candidates_below_requirement} candidate(s) · avg shortfall {gap.avg_proficiency_shortfall.toFixed(1)}
                                            </span>
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                              {gap.active_course_count > 0
                                                ? `${gap.active_course_count} active course(s)${
                                                    gap.shortest_active_course_hours !== null
                                                      ? ` · shortest ${gap.shortest_active_course_hours.toFixed(1)}h`
                                                      : ""
                                                  }`
                                                : "No active mapped learning course"}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                                <p className="mt-3 text-[11px] text-muted-foreground">
                                  Aggregate planning signal only. Missing skill records mean no demonstrated proficiency in the loaded data; they do not prove an employee lacks the skill. No individual employees are exposed or ranked.
                                </p>
                              </div>

                              <div className="mt-4 rounded-md border p-4">
                                <div className="mb-3">
                                  <p className="font-medium">
                                    External Recruiting Feasibility
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Whole-role ATS evidence for Buy. Current pipeline is context only; historical recruiting performance is not a forecast.
                                  </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-md border p-3">
                                    <p className="text-xs text-muted-foreground">
                                      Open Requisitions
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.external_recruiting_feasibility.current_pipeline.open_requisitions.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {roleResponsePlanResult.external_recruiting_feasibility.current_pipeline.applicants.toLocaleString()} applicants · {roleResponsePlanResult.external_recruiting_feasibility.current_pipeline.advanced_candidates.toLocaleString()} advanced
                                    </p>
                                  </div>
                                  <div className="rounded-md border p-3">
                                    <p className="text-xs text-muted-foreground">
                                      External Fills · 12M
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.external_recruiting_feasibility.historical_external.recent_12m_filled_requisitions.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Peak {roleResponsePlanResult.external_recruiting_feasibility.historical_external.recent_12m_peak_monthly_fills.toLocaleString()} in one month
                                    </p>
                                  </div>
                                  <div className="rounded-md border p-3">
                                    <p
                                      className="cursor-help border-b border-dotted text-xs text-muted-foreground"
                                      title="Historical median across completed external requisitions. This is not a forecast."
                                    >
                                      Historical Median TTF
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.external_recruiting_feasibility.historical_external.median_time_to_fill_days === null
                                        ? "—"
                                        : roleResponsePlanResult.external_recruiting_feasibility.historical_external.median_time_to_fill_days.toFixed(0) + "d"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {roleResponsePlanResult.external_recruiting_feasibility.historical_external.offer_acceptance_rate_pct === null
                                        ? "Offer acceptance unavailable"
                                        : roleResponsePlanResult.external_recruiting_feasibility.historical_external.offer_acceptance_rate_pct.toFixed(1) + "% offer acceptance"}
                                    </p>
                                  </div>
                                  <div className="rounded-md border p-3">
                                    <p className="text-xs text-muted-foreground">
                                      Buy Scale vs 12M
                                    </p>
                                    <p className="mt-1 text-xl font-semibold">
                                      {roleResponsePlanResult.external_recruiting_feasibility.requested_buy <= 0
                                        ? "—"
                                        : roleResponsePlanResult.external_recruiting_feasibility.buy_scale.pct_of_recent_12m_external_fills === null
                                          ? "No history"
                                          : roleResponsePlanResult.external_recruiting_feasibility.buy_scale.pct_of_recent_12m_external_fills.toFixed(1) + "%"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {roleResponsePlanResult.external_recruiting_feasibility.requested_buy <= 0
                                        ? "No Buy target entered"
                                        : roleResponsePlanResult.external_recruiting_feasibility.requested_buy.toLocaleString() + " planned external hire(s)"}
                                    </p>
                                  </div>
                                </div>

                                <p className="mt-3 text-[11px] text-muted-foreground">
                                  Existing open requisitions are not automatically netted against scenario-created Buy demand. Recruiting history describes prior execution at this role; it does not establish future labor-market supply.
                                </p>
                              </div>

                              <div className="mt-4 overflow-x-auto rounded-md border p-3">
                                <table className="w-full min-w-[820px] text-sm">
                                  <thead>
                                    <tr className="border-b text-left text-xs text-muted-foreground">
                                      <th className="pb-3 pr-4">Required Skill</th>
                                      <th className="pb-3 px-3">Importance</th>
                                      <th className="pb-3 px-3 text-right">Proficiency</th>
                                      <th className="pb-3 px-3 text-right">Build</th>
                                      <th
                                        className="pb-3 px-3 text-right"
                                        title="Skill-level mobility signal. Use the Internal Talent Readiness section above for whole-role Move capacity."
                                      >
                                        Skill Move Signal
                                      </th>
                                      <th className="pb-3 pl-3 text-right">Buy History</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {roleResponsePlanResult.skill_bundle.map(
                                      (row) => (
                                        <tr
                                          key={row.skill_code}
                                          className="border-b last:border-0"
                                        >
                                          <td className="py-3 pr-4 font-medium">
                                            {row.skill_name}
                                            <p className="text-[10px] font-normal text-muted-foreground">
                                              {row.skill_category}
                                            </p>
                                          </td>
                                          <td className="px-3 py-3">
                                            {row.importance}
                                          </td>
                                          <td className="px-3 py-3 text-right tabular-nums">
                                            {row.required_proficiency}
                                          </td>
                                          <td className="px-3 py-3 text-right tabular-nums">
                                            {row.build_pathway_available
                                              ? row.active_course_count + " course(s)"
                                              : "No pathway"}
                                          </td>
                                          <td className="px-3 py-3 text-right tabular-nums">
                                            {row.mobility_candidates.toLocaleString()}
                                          </td>
                                          <td className="py-3 pl-3 text-right tabular-nums">
                                            {row.historical_filled_requisitions.toLocaleString()}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {roleResponsePlanResult.warnings.length > 0 && (
                                <div className="mt-4 rounded-md border p-3">
                                  <p className="text-xs font-medium">
                                    Plan warnings
                                  </p>
                                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    {roleResponsePlanResult.warnings.map(
                                      (warning) => (
                                        <li key={warning}>
                                          - {warning}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {structuralPositionResult.response_strategy.skills.length >
                        0 && (
                        <div
                          className={
                            workflowView === "respond"
                              ? "mt-4 rounded-md border p-4"
                              : "hidden"
                          }
                        >
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h5 className="font-semibold">
                                Workforce Response Plan
                              </h5>
                              <p className="text-sm text-muted-foreground">
                                Allocate one modeled skill gap across explicit Build, Move, and Buy targets.
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={resetResponsePlan}
                                disabled={responsePlanLoading}
                                className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={runResponsePlan}
                                disabled={
                                  !responsePlanSkill ||
                                  responsePlanLoading
                                }
                                className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {responsePlanLoading
                                  ? "Running…"
                                  : "Run Response Plan"}
                              </button>
                            </div>
                          </div>

                          <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(120px,1fr))]">
                            <label className="rounded-md border p-3">
                              <span className="text-[11px] text-muted-foreground">
                                Skill Gap
                              </span>
                              <select
                                value={responsePlanSkill}
                                onChange={(event) => {
                                  setResponsePlanSkill(
                                    event.target.value
                                  );
                                  setResponsePlanAllocation(
                                    createResponsePlanAllocation()
                                  );
                                  setResponsePlanResult(null);
                                  setResponsePlanError(null);
                                }}
                                className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                              >
                                {structuralPositionResult.response_strategy.skills.map(
                                  (row) => (
                                    <option
                                      key={row.skill_code}
                                      value={row.skill_code}
                                    >
                                      {row.skill_name +
                                        " · gap " +
                                        formatModeledCount(
                                          row.modeled_position_gap
                                        )}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            {(
                              [
                                ["build", "Build"],
                                ["move", "Move"],
                                ["buy", "Buy"],
                                ["borrow", "Borrow"],
                                ["automate", "Automate"],
                              ] as const
                            ).map(([key, label]) => {
                              const selectedSkill =
                                structuralPositionResult.response_strategy.skills.find(
                                  (row) =>
                                    row.skill_code ===
                                    responsePlanSkill
                                );
                              const disabled =
                                (key === "borrow" &&
                                  !selectedSkill?.borrow
                                    .data_available) ||
                                (key === "automate" &&
                                  !selectedSkill?.automate
                                    .data_available);

                              return (
                                <label
                                  key={key}
                                  className="rounded-md border p-3"
                                >
                                  <span className="text-[11px] text-muted-foreground">
                                    {label}
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    disabled={disabled}
                                    value={
                                      responsePlanAllocation[
                                        key
                                      ]
                                    }
                                    onChange={(event) => {
                                      setResponsePlanAllocation(
                                        (current) => ({
                                          ...current,
                                          [key]: Number(
                                            event.target
                                              .value
                                          ),
                                        })
                                      );
                                      setResponsePlanResult(
                                        null
                                      );
                                      setResponsePlanError(
                                        null
                                      );
                                    }}
                                    className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-right text-sm tabular-nums disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  {disabled && (
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                      No supporting data
                                    </p>
                                  )}
                                </label>
                              );
                            })}
                          </div>

                          <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                            This is a user-directed plan, not an optimizer. Planned coverage assumes each executed action closes one unit of this selected skill gap. Do not sum separate skill plans as unique people because one person or role can satisfy multiple skills.
                          </div>

                          {responsePlanError && (
                            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                              {responsePlanError}
                            </div>
                          )}

                          {responsePlanResult && (
                            <>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Modeled Gap
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      responsePlanResult.modeled_position_gap
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Planned Coverage
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      responsePlanResult.planned_coverage_if_executed
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {responsePlanResult.coverage_pct_if_executed.toFixed(
                                      1
                                    )}
                                    % if executed
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Remaining Gap
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      responsePlanResult.remaining_gap_if_executed
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border p-3">
                                  <p className="text-xs text-muted-foreground">
                                    Overplanned
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold">
                                    {formatModeledCount(
                                      responsePlanResult.overplanned_capacity
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-md border p-3 text-sm">
                                  <p className="font-medium">
                                    Build evidence
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {responsePlanResult.evidence.build
                                      .pathway_available
                                      ? responsePlanResult.evidence.build.active_course_count.toLocaleString() +
                                        " active course(s) · " +
                                        responsePlanResult.evidence.build.in_progress_learners.toLocaleString() +
                                        " in progress · " +
                                        responsePlanResult.evidence.build.enrolled_learners.toLocaleString() +
                                        " enrolled"
                                      : "No active learning pathway in loaded data"}
                                  </p>
                                </div>
                                <div className="rounded-md border p-3 text-sm">
                                  <p className="font-medium">
                                    Move evidence
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {responsePlanResult.evidence.move.mobility_candidates.toLocaleString()}{" "}
                                    mobility candidates; not confirmed availability
                                  </p>
                                </div>
                                <div className="rounded-md border p-3 text-sm">
                                  <p className="font-medium">
                                    Buy evidence
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatModeledCount(
                                      responsePlanResult.evidence.buy.active_recruiting_demand
                                    )}{" "}
                                    active demand
                                    {responsePlanResult.evidence.buy
                                      .median_time_to_fill_days !==
                                    null
                                      ? " · " +
                                        responsePlanResult.evidence.buy.median_time_to_fill_days.toFixed(
                                          0
                                        ) +
                                        "d historical median TTF"
                                      : ""}
                                  </p>
                                </div>
                              </div>

                              {responsePlanResult.warnings.length >
                                0 && (
                                <div className="mt-4 rounded-md border p-3">
                                  <p className="text-xs font-medium">
                                    Plan warnings
                                  </p>
                                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    {responsePlanResult.warnings.map(
                                      (warning) => (
                                        <li key={warning}>
                                          • {warning}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div className="mt-4 overflow-x-auto rounded-md border p-3">
                        <table className="w-full min-w-[860px] text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                              <th className="pb-3 pr-4">
                                #
                              </th>
                              <th className="pb-3 pr-4">
                                Action
                              </th>
                              <th className="pb-3 pr-4">
                                Scope
                              </th>
                              <th className="pb-3 px-3 text-right">
                                Applied
                              </th>
                              <th className="pb-3 px-3 text-right">
                                Cost / Position
                              </th>
                              <th className="pb-3 px-3 text-right">
                                Budget Δ
                              </th>
                              <th className="pb-3 pl-3 text-right">
                                Staffed Cost Δ
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {structuralPositionResult.action_results.map(
                              (row) => (
                                <tr
                                  key={
                                    row.action_index
                                  }
                                  className="border-b last:border-0"
                                >
                                  <td className="py-3 pr-4">
                                    {
                                      row.action_index
                                    }
                                  </td>
                                  <td className="py-3 pr-4 font-medium">
                                    {
                                      structuralActionLabels[
                                        row.action_type
                                      ]
                                    }
                                  </td>
                                  <td className="py-3 pr-4">
                                    {
                                      row.scope_label
                                    }
                                  </td>
                                  <td className="px-3 py-3 text-right tabular-nums">
                                    {row.applied_value.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-3 text-right tabular-nums">
                                    {formatCurrencyCompact(
                                      row.annual_cost_basis_per_position_usd
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-right tabular-nums">
                                    {formatCurrencyCompact(
                                      row.authorized_budget_delta_usd
                                    )}
                                  </td>
                                  <td className="py-3 pl-3 text-right tabular-nums">
                                    {formatCurrencyCompact(
                                      row.staffed_labor_cost_delta_usd
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
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
