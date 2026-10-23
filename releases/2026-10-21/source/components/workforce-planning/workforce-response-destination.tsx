import {KeyFindings} from "@/components/key-findings";
import {allocationFindings} from "@/lib/context-findings";
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
          ? "space-y-4"
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
      {!positionModelingLoading && !portfolioSectionProps?.portfolioProps.loading && !portfolioSectionProps?.portfolioProps.error && <KeyFindings findings={allocationFindings(portfolioSectionProps?.portfolioProps.result?.allocation ?? null, selectedPlanningScenario)} />}
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
            <details className="mb-4 rounded-md border p-3">
              <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Inherited design assumptions</summary>
            <StructuralPositionScenarioSummary
              result={structuralPositionResult}
              showDemandDetails={false}
            />
            </details>

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

            <details className="mt-4 rounded-md border p-3">
              <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Response strategy evidence</summary>
            <ResponseStrategyEvidence
              responseStrategy={
                structuralPositionResult.response_strategy
              }
            />
            </details>
            <details className="mt-4 rounded-md border p-3">
              <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Design impact details</summary>
              <StructuralPositionActionResults result={structuralPositionResult} />
            </details>
          </>
        )}
      </div>

      <details className="rounded-lg border p-4">
        <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Position inventory &amp; source details</summary>
        <PositionModelingSummary {...positionSummaryProps} />
      </details>
    </div>
  );
}
