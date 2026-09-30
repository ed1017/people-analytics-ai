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

import {
  WorkforcePlanningWorkflowNavigation,
  type WorkforcePlanningWorkflowView,
} from "@/components/workforce-planning/workflow-navigation";
import { PositionActionSimulator } from "@/components/workforce-planning/position-action-simulator";
import { StructuralPositionActionsEditor } from "@/components/workforce-planning/structural-position-actions-editor";
import { ResponseStrategyEvidence } from "@/components/workforce-planning/response-strategy-evidence";
import { RoleResponseEvidenceSummary } from "@/components/workforce-planning/role-response-evidence-summary";
import { ResponsePortfolioControls } from "@/components/workforce-planning/response-portfolio-controls";
import { BusinessUnitResponseAllocationPanel } from "@/components/workforce-planning/business-unit-response-allocation-panel";
import { ScenarioModelingPanel } from "@/components/workforce-planning/scenario-modeling-panel";
import { ScenarioPlanSummary } from "@/components/workforce-planning/scenario-plan-summary";
import { ScenarioComparisonTable } from "@/components/workforce-planning/scenario-comparison-table";
import { WorkforceExecutionPanel } from "@/components/workforce-planning/workforce-execution-panel";
import { PlanningOverview } from "@/components/workforce-planning/planning-overview";
import { usePlanningSession } from "@/components/workforce-planning/planning-session-context";

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
  const {
    activeView: workflowView,
    setActiveView: setWorkflowView,
  } = usePlanningSession();

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



  return (
<section className="min-w-0 p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Workforce Planning
              </h2>
              <p className="text-muted-foreground">
                {workflowView === "overview"
                  ? "See the current workforce plan, biggest demand shifts, approved response, execution risk, and feasibility in one place."
                  : workflowView === "plan"
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

          <WorkforcePlanningWorkflowNavigation
            activeView={workflowView}
            onViewChange={setWorkflowView}
            planReady={Boolean(
              activePlanningScenario
            )}
            designReady={Boolean(
              structuralPositionResult
            )}
            respondReady={Boolean(
              responsePortfolioResult ||
                roleResponsePlanResult
            )}
            executeReady={Boolean(
              responseExecutionResult
            )}
          />

          {workflowView === "overview" && (
            <PlanningOverview
              activePlanningScenario={activePlanningScenario}
              activePlanningEnd={activePlanningEnd}
              baselinePlanningEnd={baselinePlanningEnd}
              planningHeadcountDeltaVsBaseline={planningHeadcountDeltaVsBaseline}
              structuralPositionResult={structuralPositionResult}
              responsePortfolioResult={responsePortfolioResult}
              businessUnitResponseResult={businessUnitResponseResult}
              responseExecutionResult={responseExecutionResult}
              responseConstraintResult={responseConstraintResult}
              onNavigate={setWorkflowView}
            />
          )}

          {planningError && (
            <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {planningError}
            </div>
          )}

          <ScenarioModelingPanel
            visible={workflowView === "plan"}
            planningScenarios={planningScenarios}
            baselinePlanningEnd={baselinePlanningEnd}
            activePlanningScenario={activePlanningScenario}
            onScenarioChange={onScenarioChange}
            scenarioDefaults={scenarioDefaults}
            customAssumptions={customAssumptions}
            setCustomAssumptions={setCustomAssumptions}
            customScenario={customScenario}
            customScenarioLoading={customScenarioLoading}
            customScenarioError={customScenarioError}
            resetCustomScenario={resetCustomScenario}
            runCustomScenario={runCustomScenario}
            onExplainCustomScenario={onExplainCustomScenario}
            scenarioName={scenarioName}
            setScenarioName={setScenarioName}
            saveCustomScenario={saveCustomScenario}
            segmentView={segmentView}
            setSegmentView={setSegmentView}
            buScenarioOptions={buScenarioOptions}
            selectedBuScenario={selectedBuScenario}
            setSelectedBuScenario={setSelectedBuScenario}
            buScenarioAssumptions={buScenarioAssumptions}
            setBuScenarioAssumptions={setBuScenarioAssumptions}
            buScenarioResult={buScenarioResult}
            setBuScenarioResult={setBuScenarioResult}
            buScenarioLoading={buScenarioLoading}
            buScenarioError={buScenarioError}
            setBuScenarioError={setBuScenarioError}
            resetBuScenario={resetBuScenario}
            runBuScenario={runBuScenario}
            savedScenarios={savedScenarios}
            comparisonScenarioIds={comparisonScenarioIds}
            toggleScenarioComparison={toggleScenarioComparison}
            deleteSavedScenario={deleteSavedScenario}
          />

          <ScenarioPlanSummary
            visible={workflowView === "plan"}
            planningLoading={planningLoading}
            planningScenarios={planningScenarios}
            activePlanningScenario={activePlanningScenario}
            activePlanningStart={activePlanningStart}
            activePlanningEnd={activePlanningEnd}
            planningNetChange={planningNetChange}
            planningHeadcountDeltaVsBaseline={planningHeadcountDeltaVsBaseline}
            planningTotalHires={planningTotalHires}
            planningTotalExits={planningTotalExits}
          />

          {activePlanningScenario &&
            activePlanningEnd && (
            <>
              <div className="mt-6 rounded-lg border p-4">
                <ScenarioComparisonTable
                  visible={workflowView === "plan"}
                  planningScenarios={planningScenarios}
                  baselinePlanningEnd={baselinePlanningEnd}
                />


              <div
                className={
                  workflowView === "overview" || workflowView === "plan"
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
                      ? ""
                      : "hidden"
                  }
                >
                  <PositionActionSimulator
                    assumptions={positionActionAssumptions}
                    defaultsAvailable={Boolean(positionActionDefaults)}
                    loading={positionActionLoading}
                    error={positionActionError}
                    result={positionActionResult}
                    positionModelingData={positionModelingData}
                    onChange={(key, value) =>
                      setPositionActionAssumptions(
                        (current) =>
                          current
                            ? {
                                ...current,
                                [key]: value,
                              }
                            : current
                      )
                    }
                    onReset={resetPositionActions}
                    onRun={runPositionActions}
                  />
                </div>

                <div className="mb-5 rounded-md border p-4">
                  {workflowView === "design" && (
                    <StructuralPositionActionsEditor
                      actions={structuralPositionActions}
                      catalog={structuralPositionCatalog}
                      loading={structuralPositionLoading}
                      error={structuralPositionError}
                      onAdd={addStructuralPositionAction}
                      onReset={resetStructuralPositionActions}
                      onRun={runStructuralPositionActions}
                      onUpdate={updateStructuralPositionAction}
                      onRemove={removeStructuralPositionAction}
                    />
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

                      {workflowView === "respond" && (
                        <ResponseStrategyEvidence
                          responseStrategy={
                            structuralPositionResult.response_strategy
                          }
                        />
                      )}

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
                          <ResponsePortfolioControls
                            scenario={structuralPositionResult}
                            allocations={responsePortfolioAllocations}
                            result={responsePortfolioResult}
                            loading={responsePortfolioLoading}
                            error={responsePortfolioError}
                            onUpdate={updateResponsePortfolioAllocation}
                            onReset={resetResponsePortfolio}
                            onRun={runResponsePortfolio}
                          >
                            {responsePortfolioResult && (
                              <BusinessUnitResponseAllocationPanel
                                scenario={structuralPositionResult}
                                portfolioResult={responsePortfolioResult}
                                allocations={businessUnitResponseAllocations}
                                result={businessUnitResponseResult}
                                loading={businessUnitResponseLoading}
                                error={businessUnitResponseError}
                                onUpdate={updateBusinessUnitResponseAllocation}
                                onReset={resetBusinessUnitResponseAllocation}
                                onRun={runBusinessUnitResponseAllocation}
                              >
                                {businessUnitResponseResult && (
<WorkforceExecutionPanel
                                  workflowView={workflowView}
                                  businessUnitResponseResult={businessUnitResponseResult}
                                  responseExecutionDrafts={responseExecutionDrafts}
                                  responseExecutionLoading={responseExecutionLoading}
                                  responseExecutionError={responseExecutionError}
                                  responseExecutionResult={responseExecutionResult}
                                  constraintAwareScheduleLoading={constraintAwareScheduleLoading}
                                  constraintAwareScheduleError={constraintAwareScheduleError}
                                  constraintAwareScheduleResult={constraintAwareScheduleResult}
                                  responseConstraintDraft={responseConstraintDraft}
                                  responseConstraintLoading={responseConstraintLoading}
                                  responseConstraintError={responseConstraintError}
                                  responseConstraintResult={responseConstraintResult}
                                  resetResponseExecution={resetResponseExecution}
                                  runConstraintAwareScheduler={runConstraintAwareScheduler}
                                  runResponseExecution={runResponseExecution}
                                  updateResponseExecutionDraft={updateResponseExecutionDraft}
                                  addResponseExecutionPhase={addResponseExecutionPhase}
                                  removeResponseExecutionPhase={removeResponseExecutionPhase}
                                  updateResponseConstraintDraft={updateResponseConstraintDraft}
                                  resetResponseConstraints={resetResponseConstraints}
                                  runResponseConstraints={runResponseConstraints}
                                />
                                )}
                              </BusinessUnitResponseAllocationPanel>
                            )}
                          </ResponsePortfolioControls>
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
                            <RoleResponseEvidenceSummary
                              result={roleResponsePlanResult}
                            />
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
          )}
        </section>
  );
}
