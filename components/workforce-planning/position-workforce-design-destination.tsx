import type { ComponentProps } from "react";

import { PositionActionSimulator } from "./position-action-simulator";
import { PositionModelingSummary } from "./position-modeling-summary";
import { StructuralPositionActionResults } from "./structural-position-action-results";
import { StructuralPositionActionsEditor } from "./structural-position-actions-editor";
import { StructuralPositionScenarioSummary } from "./structural-position-scenario-summary";
import type { StructuralPositionScenarioResponse } from "@/lib/types";

type PositionWorkforceDesignDestinationProps = {
  visible: boolean;
  selectedPlanningScenario: string;
  positionModelingLoading: boolean;
  positionActionProps: ComponentProps<
    typeof PositionActionSimulator
  >;
  structuralActionProps: ComponentProps<
    typeof StructuralPositionActionsEditor
  >;
  structuralPositionResult:
    | StructuralPositionScenarioResponse
    | null;
  positionSummaryProps: ComponentProps<
    typeof PositionModelingSummary
  >;
};

export function PositionWorkforceDesignDestination({
  visible,
  selectedPlanningScenario,
  positionModelingLoading,
  positionActionProps,
  structuralActionProps,
  structuralPositionResult,
  positionSummaryProps,
}: PositionWorkforceDesignDestinationProps) {
  return (
    <div
      data-planning-destination="position-workforce-design"
      className={
        visible
          ? "mt-6 rounded-lg border p-4"
          : "hidden"
      }
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            Position & Workforce Design
          </h3>
          <p className="text-sm text-muted-foreground">
            Turn the workforce scenario into concrete position changes and see the recruiting and skill impact.
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {positionModelingLoading
            ? "Loading positions…"
            : selectedPlanningScenario}
        </span>
      </div>

      <PositionActionSimulator
        {...positionActionProps}
      />

      <div className="mb-5 rounded-md border p-4">
        <StructuralPositionActionsEditor
          {...structuralActionProps}
        />

        {structuralPositionResult && (
          <>
            <StructuralPositionScenarioSummary
              result={structuralPositionResult}
              showDemandDetails
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
