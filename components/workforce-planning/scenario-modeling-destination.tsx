import { TrainingTimingPanel } from "@/components/training-timing-panel";
import type { ComponentProps } from "react";

import { ScenarioComparisonTable } from "./scenario-comparison-table";
import { ScenarioModelingPanel } from "./scenario-modeling-panel";
import { ScenarioPlanSummary } from "./scenario-plan-summary";
import type { PlanningPoint } from "@/lib/types";

type ScenarioModelingDestinationProps =
  ComponentProps<typeof ScenarioModelingPanel> & {
    planningLoading: boolean;
    activePlanningStart: PlanningPoint | null;
    activePlanningEnd: PlanningPoint | null;
    planningNetChange: number | null;
    planningHeadcountDeltaVsBaseline: number | null;
    planningTotalHires: number | null;
    planningTotalExits: number | null;
  };

export function ScenarioModelingDestination({
  visible,
  planningLoading,
  activePlanningStart,
  activePlanningEnd,
  planningNetChange,
  planningHeadcountDeltaVsBaseline,
  planningTotalHires,
  planningTotalExits,
  ...panelProps
}: ScenarioModelingDestinationProps) {
  const {
    planningScenarios,
    baselinePlanningEnd,
    activePlanningScenario,
  } = panelProps;

  return (
    <div
      data-planning-destination="scenario-modeling"
      className={visible ? "space-y-6" : "hidden"}
    >
      <ScenarioModelingPanel
        {...panelProps}
        visible
      />

      <TrainingTimingPanel suggestedMonth={activePlanningStart?.planning_month.slice(0,7)??""} />

      <ScenarioPlanSummary
        visible
        planningLoading={planningLoading}
        planningScenarios={planningScenarios}
        activePlanningScenario={activePlanningScenario}
        activePlanningStart={activePlanningStart}
        activePlanningEnd={activePlanningEnd}
        planningNetChange={planningNetChange}
        planningHeadcountDeltaVsBaseline={
          planningHeadcountDeltaVsBaseline
        }
        planningTotalHires={planningTotalHires}
        planningTotalExits={planningTotalExits}
      />
      {activePlanningScenario &&
        activePlanningEnd && (
          <div className="rounded-lg border p-4">
            <ScenarioComparisonTable
              visible
              planningScenarios={planningScenarios}
              baselinePlanningEnd={baselinePlanningEnd}
            />
          </div>
        )}
    </div>
  );
}
