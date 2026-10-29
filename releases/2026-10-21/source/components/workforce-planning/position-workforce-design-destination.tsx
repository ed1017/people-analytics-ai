import {TalentInventoryScenarios} from "./talent-inventory-scenarios";
import {PositionDashboard} from "./position-dashboard";
import {ExternalWorkforceEvidencePanel} from "@/components/external-workforce-evidence-panel";
import {PositionScenarioEditor} from "./position-scenario-editor";
import {KeyFindings} from "@/components/key-findings";
import {designFindings} from "@/lib/context-findings";
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
  positionCatalogLoading: boolean;
  positionCatalogError: string | null;
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
  positionCatalogLoading,
  positionCatalogError,
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
          ? "space-y-4"
          : "hidden"
      }
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            Talent Inventory &amp; position scenarios
          </h3>
          <p className="text-sm text-muted-foreground">
            Select positions and compare hiring, redesign and training allocations.
          </p>
        </div>


      </div>

      <TalentInventoryScenarios />
      <details className="rounded-lg border p-4"><summary className="min-h-11 cursor-pointer font-semibold">Grouped company position reference</summary><div className="pt-3"><PositionDashboard catalog={structuralActionProps.catalog} loading={positionCatalogLoading} error={positionCatalogError} /></div></details>
      <details className="rounded-lg border p-4"><summary className="min-h-11 cursor-pointer font-semibold focus-visible:ring-2 focus-visible:ring-ring">Edit individual positions &amp; saved revisions</summary><div className="pt-3"><PositionScenarioEditor /></div></details>
      <details className="rounded-lg border p-4"><summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">External role &amp; location evidence</summary><div className="pt-3"><ExternalWorkforceEvidencePanel /></div></details>

      <details className="rounded-lg border p-4">
        <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Grouped inventory tools</summary>
        <p className="mb-3 text-sm text-muted-foreground">Grouped calculations use the business-unit selector or structural actions, independently of dashboard filters.</p>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {positionModelingLoading
            ? "Loading positions…"
            : selectedPlanningScenario}
        </span>
      {!positionModelingLoading && !structuralActionProps.loading && !structuralActionProps.error && <KeyFindings findings={designFindings(structuralPositionResult, selectedPlanningScenario)} />}
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

      <details className="rounded-lg border p-4">
        <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Position inventory &amp; source details</summary>
        <PositionModelingSummary {...positionSummaryProps} />
      </details>
      </details>
    </div>
  );
}
