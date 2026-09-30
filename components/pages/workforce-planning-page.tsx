"use client";

import {
  useEffect,
  useState,
} from "react";
import { WorkforcePlanningWorkflowNavigation } from "@/components/workforce-planning/workflow-navigation";
import { ScenarioModelingDestination } from "@/components/workforce-planning/scenario-modeling-destination";
import { PositionWorkforceDesignDestination } from "@/components/workforce-planning/position-workforce-design-destination";
import { ResponsePortfolioAllocationSection } from "@/components/workforce-planning/response-portfolio-allocation-section";
import { WorkforceResponseDestination } from "@/components/workforce-planning/workforce-response-destination";
import { PositionModelingSummary } from "@/components/workforce-planning/position-modeling-summary";
import { StructuralPositionActionResults } from "@/components/workforce-planning/structural-position-action-results";
import { StructuralPositionScenarioSummary } from "@/components/workforce-planning/structural-position-scenario-summary";
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

          <ScenarioModelingDestination
            visible={workflowView === "plan"}
            planningLoading={planningLoading}
            activePlanningStart={activePlanningStart}
            activePlanningEnd={activePlanningEnd}
            planningNetChange={planningNetChange}
            planningHeadcountDeltaVsBaseline={planningHeadcountDeltaVsBaseline}
            planningTotalHires={planningTotalHires}
            planningTotalExits={planningTotalExits}
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

          {activePlanningScenario &&
            activePlanningEnd && (
            <>
              <PositionWorkforceDesignDestination
                visible={workflowView === "design"}
                selectedPlanningScenario={selectedPlanningScenario}
                positionModelingLoading={positionModelingLoading}
                positionActionProps={{
                  assumptions: positionActionAssumptions,
                  defaultsAvailable: Boolean(positionActionDefaults),
                  loading: positionActionLoading,
                  error: positionActionError,
                  result: positionActionResult,
                  positionModelingData,
                  onChange: (key, value) =>
                    setPositionActionAssumptions(
                      (current) =>
                        current
                          ? {
                              ...current,
                              [key]: value,
                            }
                          : current
                    ),
                  onReset: resetPositionActions,
                  onRun: runPositionActions,
                }}
                structuralActionProps={{
                  actions: structuralPositionActions,
                  catalog: structuralPositionCatalog,
                  loading: structuralPositionLoading,
                  error: structuralPositionError,
                  onAdd: addStructuralPositionAction,
                  onReset: resetStructuralPositionActions,
                  onRun: runStructuralPositionActions,
                  onUpdate: updateStructuralPositionAction,
                  onRemove: removeStructuralPositionAction,
                }}
                structuralPositionResult={structuralPositionResult}
                positionSummaryProps={{
                  positionModelingError,
                  positionModelingLoading,
                  positionModelingData,
                  activePositionScenario,
                  topPositionBusinessUnits,
                  positionLevels,
                }}
              />

              <WorkforceResponseDestination
                visible={workflowView === "respond"}
                selectedPlanningScenario={selectedPlanningScenario}
                positionModelingLoading={positionModelingLoading}
                structuralPositionResult={structuralPositionResult}
                onNavigateDesign={() => setWorkflowView("design")}
                portfolioSectionProps={
                  structuralPositionResult
                    ? {
                        portfolioProps: {
                          scenario: structuralPositionResult,
                          allocations: responsePortfolioAllocations,
                          result: responsePortfolioResult,
                          loading: responsePortfolioLoading,
                          error: responsePortfolioError,
                          onUpdate: updateResponsePortfolioAllocation,
                          onReset: resetResponsePortfolio,
                          onRun: runResponsePortfolio,
                        },
                        businessUnitProps:
                          responsePortfolioResult
                            ? {
                                scenario: structuralPositionResult,
                                portfolioResult: responsePortfolioResult,
                                allocations: businessUnitResponseAllocations,
                                result: businessUnitResponseResult,
                                loading: businessUnitResponseLoading,
                                error: businessUnitResponseError,
                                onUpdate: updateBusinessUnitResponseAllocation,
                                onReset: resetBusinessUnitResponseAllocation,
                                onRun: runBusinessUnitResponseAllocation,
                              }
                            : null,
                      }
                    : null
                }
                rolePlanProps={{
                  roleResponsePlanProfile,
                  setRoleResponsePlanProfile,
                  roleResponsePlanAllocation,
                  setRoleResponsePlanAllocation,
                  roleResponsePlanResult,
                  setRoleResponsePlanResult,
                  roleResponsePlanLoading,
                  roleResponsePlanError,
                  setRoleResponsePlanError,
                  resetRoleResponsePlan,
                  runRoleResponsePlan,
                }}
                skillPlanProps={{
                  responsePlanSkill,
                  setResponsePlanSkill,
                  responsePlanAllocation,
                  setResponsePlanAllocation,
                  responsePlanResult,
                  setResponsePlanResult,
                  responsePlanLoading,
                  responsePlanError,
                  setResponsePlanError,
                  resetResponsePlan,
                  runResponsePlan,
                }}
                positionSummaryProps={{
                  positionModelingError,
                  positionModelingLoading,
                  positionModelingData,
                  activePositionScenario,
                  topPositionBusinessUnits,
                  positionLevels,
                }}
              />

              <div
                className={
                  workflowView === "execute"
                    ? "mt-6 rounded-lg border p-4"
                    : "hidden"
                }
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      Execution & Feasibility
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Put the approved response on a timeline and test whether it fits the operating constraints.
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {positionModelingLoading
                      ? "Loading positions…"
                      : selectedPlanningScenario}
                  </span>
                </div>

                {(!responsePortfolioResult ||
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
                        setWorkflowView("respond")
                      }
                      className="mt-3 rounded-md border px-3 py-2 text-sm"
                    >
                      Go to Respond
                    </button>
                  </div>
                )}

                <div className="mb-5 rounded-md border p-4">
                  {structuralPositionResult && (
                    <>
                      <StructuralPositionScenarioSummary
                        result={structuralPositionResult}
                        showDemandDetails={false}
                      />

                      {structuralPositionResult.job_profile_impact.filter(
                        (row) =>
                          row.authorized_position_delta > 0
                      ).length > 1 && (
                        <div className="mt-4 rounded-md border p-4">
                          <ResponsePortfolioAllocationSection
                            portfolioProps={{
                              scenario: structuralPositionResult,
                              allocations: responsePortfolioAllocations,
                              result: responsePortfolioResult,
                              loading: responsePortfolioLoading,
                              error: responsePortfolioError,
                              onUpdate: updateResponsePortfolioAllocation,
                              onReset: resetResponsePortfolio,
                              onRun: runResponsePortfolio,
                            }}
                            businessUnitProps={
                              responsePortfolioResult
                                ? {
                                    scenario: structuralPositionResult,
                                    portfolioResult: responsePortfolioResult,
                                    allocations: businessUnitResponseAllocations,
                                    result: businessUnitResponseResult,
                                    loading: businessUnitResponseLoading,
                                    error: businessUnitResponseError,
                                    onUpdate: updateBusinessUnitResponseAllocation,
                                    onReset: resetBusinessUnitResponseAllocation,
                                    onRun: runBusinessUnitResponseAllocation,
                                  }
                                : null
                            }
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
                          </ResponsePortfolioAllocationSection>
                        </div>
                      )}

                      <StructuralPositionActionResults
                        result={structuralPositionResult}
                      />
                    </>
                  )}
                </div>

                <PositionModelingSummary
                  positionModelingError={positionModelingError}
                  positionModelingLoading={positionModelingLoading}
                  positionModelingData={positionModelingData}
                  activePositionScenario={activePositionScenario}
                  topPositionBusinessUnits={topPositionBusinessUnits}
                  positionLevels={positionLevels}
                />
              </div>
            </>
          )}
        </section>
  );
}
