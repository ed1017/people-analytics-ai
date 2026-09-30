import type { ComponentProps } from "react";

import { PositionModelingSummary } from "./position-modeling-summary";
import { ResponsePortfolioAllocationSection } from "./response-portfolio-allocation-section";
import { StructuralPositionActionResults } from "./structural-position-action-results";
import { StructuralPositionScenarioSummary } from "./structural-position-scenario-summary";
import { WorkforceExecutionPanel } from "./workforce-execution-panel";
import type { StructuralPositionScenarioResponse } from "@/lib/types";

type ExecutionFeasibilityDestinationProps = {
  visible: boolean;
  selectedPlanningScenario: string;
  positionModelingLoading: boolean;
  structuralPositionResult:
    | StructuralPositionScenarioResponse
    | null;
  responseReady: boolean;
  onNavigateResponse: () => void;
  portfolioSectionProps: ComponentProps<
    typeof ResponsePortfolioAllocationSection
  > | null;
  executionPanelProps: ComponentProps<
    typeof WorkforceExecutionPanel
  > | null;
  positionSummaryProps: ComponentProps<
    typeof PositionModelingSummary
  >;
};

export function ExecutionFeasibilityDestination({
  visible,
  selectedPlanningScenario,
  positionModelingLoading,
  structuralPositionResult,
  responseReady,
  onNavigateResponse,
  portfolioSectionProps,
  executionPanelProps,
  positionSummaryProps,
}: ExecutionFeasibilityDestinationProps) {
  return (
    <div
      data-planning-destination="execution-feasibility"
      className={
        visible
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

      {!responseReady && (
        <div className="mb-5 rounded-md border bg-muted/20 p-4">
          <p className="font-medium">
            Build the response plan first
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Execution starts after Build / Move / Buy has been allocated and reconciled to business-unit destinations.
          </p>
          <button
            type="button"
            onClick={onNavigateResponse}
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
            {portfolioSectionProps && (
              <div className="mt-4 rounded-md border p-4">
                <ResponsePortfolioAllocationSection
                  {...portfolioSectionProps}
                >
                  {executionPanelProps && (
                    <WorkforceExecutionPanel
                      {...executionPanelProps}
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
        {...positionSummaryProps}
      />
    </div>
  );
}
