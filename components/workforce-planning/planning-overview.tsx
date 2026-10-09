import {PlanningAssumptionIllustration} from "../planning-assumption-illustration";
import {
  formatCapacity,
  formatPercent,
  formatSignedCapacityDelta,
  formatSignedWholeDelta,
  formatWholeCount,
} from "@/lib/display-format";
import type {
  BusinessUnitResponseAllocationResponse,
  PlanningPoint,
  PlanningScenario,
  StructuralPositionScenarioResponse,
  TimePhasedWorkforceExecutionResponse,
  WorkforceResponseConstraintResponse,
  WorkforceResponsePortfolioResponse,
} from "@/lib/types";
import type { PlanningWorkspaceView } from "./planning-session-context";

type PlanningOverviewProps = {
  activePlanningScenario: PlanningScenario | undefined;
  activePlanningEnd: PlanningPoint | null;
  baselinePlanningEnd: PlanningPoint | null;
  planningHeadcountDeltaVsBaseline: number | null;
  structuralPositionResult: StructuralPositionScenarioResponse | null;
  responsePortfolioResult: WorkforceResponsePortfolioResponse | null;
  businessUnitResponseResult: BusinessUnitResponseAllocationResponse | null;
  responseExecutionResult: TimePhasedWorkforceExecutionResponse | null;
  responseConstraintResult: WorkforceResponseConstraintResponse | null;
  onNavigate: (view: PlanningWorkspaceView) => void;
};

export function PlanningOverview({
  activePlanningScenario,
  activePlanningEnd,
  baselinePlanningEnd,
  planningHeadcountDeltaVsBaseline,
  structuralPositionResult,
  responsePortfolioResult,
  businessUnitResponseResult,
  responseExecutionResult,
  responseConstraintResult,
  onNavigate,
}: PlanningOverviewProps) {
  const biggestShifts = structuralPositionResult
    ? [...structuralPositionResult.business_unit_job_profile_impact]
        .filter((row) => row.authorized_position_delta !== 0)
        .sort((a, b) =>
          Math.abs(b.authorized_position_delta) -
          Math.abs(a.authorized_position_delta)
        )
        .slice(0, 3)
    : [];

  const failedConstraint =
    responseConstraintResult?.hard_constraints.find(
      (constraint) => !constraint.passed
    );
  const approvedAllocation =
    businessUnitResponseResult?.allocation ??
    responsePortfolioResult?.allocation ??
    null;
  const responseStatus = businessUnitResponseResult
    ? "Approved response allocated to destination business units"
    : responsePortfolioResult
      ? "Response portfolio modeled; BU allocation still pending"
      : "No approved Build / Move / Buy response yet";
  const feasibility = responseConstraintResult
    ? responseConstraintResult.capacity_feasibility
      ? responseConstraintResult.user_constraints_satisfied ? "Assumptions meet limits; staffing not assessed" : "Assumption limits breached; staffing not assessed"
      : responseConstraintResult.overall_feasible
      ? "Feasible under current hard constraints"
      : "Not feasible under current hard constraints"
    : "Not tested yet";
  const executionRisk = failedConstraint
    ? failedConstraint.detail
    : responseConstraintResult?.capacity_feasibility
      ? "Staffing readiness, availability and execution costs remain unknown"
    : responseExecutionResult &&
        responseExecutionResult.final_remaining_net_gap > 0
      ? `${formatCapacity(responseExecutionResult.final_remaining_net_gap)} roles remain uncovered in the current schedule`
      : responseConstraintResult?.overall_feasible
        ? "No hard-constraint breach in the current test"
        : "Execution has not been tested yet";

  const cards = [
    {
      title: "Current workforce plan",
      value: activePlanningScenario?.scenario_name ?? "No scenario selected",
      detail: activePlanningEnd
        ? `Ending headcount: ${formatWholeCount(activePlanningEnd.planned_headcount)}`
        : "Run or select a workforce scenario.",
      action: "Scenario Modeling",
      view: "plan" as const,
    },
    {
      title: "Change vs Baseline",
      value:
        planningHeadcountDeltaVsBaseline === null
          ? "Not available"
          : `${formatSignedWholeDelta(planningHeadcountDeltaVsBaseline)} headcount`,
      detail:
        baselinePlanningEnd && activePlanningEnd
          ? `Baseline ends at ${formatWholeCount(baselinePlanningEnd.planned_headcount)}; current plan ends at ${formatWholeCount(activePlanningEnd.planned_headcount)}.`
          : "Baseline comparison will appear when the plan is loaded.",
      action: "Scenario Modeling",
      view: "plan" as const,
    },
    {
      title: "Approved response",
      value: responseStatus,
      detail: approvedAllocation
        ? `Build ${formatCapacity(approvedAllocation.build)} / Move ${formatCapacity(approvedAllocation.move)} / Buy ${formatCapacity(approvedAllocation.buy)}`
        : "Complete Workforce Response before execution.",
      action: "Workforce Response",
      view: "respond" as const,
    },
    {
      title: "Biggest execution risk",
      value: executionRisk,
      detail: responseExecutionResult
        ? `Current scheduled coverage: ${formatPercent(responseExecutionResult.final_coverage_pct)}`
        : "No execution schedule has been run yet.",
      action: "Execution & Feasibility",
      view: "execute" as const,
    },
    {
      title: "Plan feasibility",
      value: feasibility,
      detail: responseConstraintResult
        ? `${responseConstraintResult.hard_constraint_breaches} hard-constraint breach(es) across ${responseConstraintResult.hard_constraint_count} active hard constraints.`
        : "Feasibility is only determined after the approved response is scheduled and tested.",
      action: "Execution & Feasibility",
      view: "execute" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <p className="font-semibold">Try Planning Calculator</p>
        <p className="mt-1 text-sm text-muted-foreground">Explore a fictional managed-services workload and review how planning inputs affect its estimated capacity gap. Fictional defaults and unverified entries remain labeled.</p>
        <PlanningAssumptionIllustration launcherOnly/>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => onNavigate(card.view)}
            className="rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.title}
            </p>
            <p className="mt-2 font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
            <p className="mt-3 text-xs font-medium">{card.action} -&gt;</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3">
          <h3 className="font-semibold">Biggest demand shifts</h3>
          <p className="text-sm text-muted-foreground">
            Largest governed BU x job-profile authorized-position changes from the current structural scenario.
          </p>
        </div>
        {biggestShifts.length > 0 ? (
          <div className="space-y-2">
            {biggestShifts.map((row) => (
              <button
                key={`${row.org_code}-${row.job_profile_code}`}
                type="button"
                onClick={() => onNavigate("design")}
                className="flex w-full items-center justify-between gap-4 rounded-md border p-3 text-left hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{row.job_profile_name}</p>
                  <p className="text-xs text-muted-foreground">{row.org_name}</p>
                </div>
                <span className="tabular-nums font-semibold">
                  {formatSignedCapacityDelta(
                    row.authorized_position_delta
                  )}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("design")}
            className="w-full rounded-md border border-dashed p-4 text-left text-sm text-muted-foreground hover:bg-muted/40"
          >
            Run Position & Workforce Design to surface the largest demand shifts.
          </button>
        )}
      </div>
    </div>
  );
}


