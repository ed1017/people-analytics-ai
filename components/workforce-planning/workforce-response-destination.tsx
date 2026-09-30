import type { ComponentProps } from "react";

import { PositionModelingSummary } from "./position-modeling-summary";
import { ResponsePortfolioAllocationSection } from "./response-portfolio-allocation-section";
import { ResponseStrategyEvidence } from "./response-strategy-evidence";
import { RoleWorkforceResponsePlan } from "./role-workforce-response-plan";
import { SkillWorkforceResponsePlan } from "./skill-workforce-response-plan";
import { StructuralPositionActionResults } from "./structural-position-action-results";
import { StructuralPositionScenarioSummary } from "./structural-position-scenario-summary";
import type { StructuralPositionScenarioResponse } from "@/lib/types";

type WorkforceResponseDestinationProps = {
  visible: boolean;
  selectedPlanningScenario: string;
  positionModelingLoading: boolean;
  structuralPositionResult:
    | StructuralPositionScenarioResponse
    | null;
  onNavigateDesign: () => void;
  portfolioSectionProps: ComponentProps<
    typeof ResponsePortfolioAllocationSection
  > | null;
  rolePlanProps: Omit<
    ComponentProps<typeof RoleWorkforceResponsePlan>,
    "scenario"
  >;
  skillPlanProps: Omit<
    ComponentProps<typeof SkillWorkforceResponsePlan>,
    "scenario"
  >;
  positionSummaryProps: ComponentProps<
    typeof PositionModelingSummary
  >;
};

export function WorkforceResponseDestination({
  visible,
  selectedPlanningScenario,
  positionModelingLoading,
  structuralPositionResult,
  onNavigateDesign,
  portfolioSectionProps,
  rolePlanProps,
  skillPlanProps,
  positionSummaryProps,
}: WorkforceResponseDestinationProps) {
  return (
    <div
      data-planning-destination="workforce-response"
      className={
        visible
          ? "mt-6 rounded-lg border p-4"
          : "hidden"
      }
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            Workforce Response
          </h3>
          <p className="text-sm text-muted-foreground">
            Translate modeled role gaps into Build, Move, and Buy response plans.
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {positionModelingLoading
            ? "Loading positions…"
            : selectedPlanningScenario}
        </span>
      </div>
      {!structuralPositionResult && (
        <div className="mb-5 rounded-md border bg-muted/20 p-4">
          <p className="font-medium">
            Design the workforce first
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a structural position scenario so the app knows which roles and skills actually have new demand.
          </p>
          <button
            type="button"
            onClick={onNavigateDesign}
            className="mt-3 rounded-md border px-3 py-2 text-sm"
          >
            Go to Design
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

            <ResponseStrategyEvidence
              responseStrategy={
                structuralPositionResult.response_strategy
              }
            />
            {structuralPositionResult.job_profile_impact.filter(
              (row) =>
                row.authorized_position_delta > 0
            ).length > 1 &&
              portfolioSectionProps && (
                <div className="mt-4 rounded-md border p-4">
                  <ResponsePortfolioAllocationSection
                    {...portfolioSectionProps}
                  />
                </div>
              )}

            <RoleWorkforceResponsePlan
              scenario={structuralPositionResult}
              {...rolePlanProps}
            />

            <SkillWorkforceResponsePlan
              scenario={structuralPositionResult}
              {...skillPlanProps}
            />

            <StructuralPositionActionResults
              result={structuralPositionResult}
            />
          </>
        )}
      </div>

      <PositionModelingSummary
        {...positionSummaryProps}
      />
    </div>
  );
}
