import {KeyFindings} from "@/components/key-findings";
import {scenarioFindings} from "@/lib/context-findings";
import { TrainingTimingPanel } from "@/components/training-timing-panel";
import {HeadcountDemoWorkspace} from './headcount-demo-workspace';
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
    onScenarioChange,
  } = panelProps;

  return (
    <div
      data-planning-destination="scenario-modeling"
      className={visible ? "evidence-pane space-y-6" : "hidden"}
    >
      <HeadcountDemoWorkspace>
      {!planningLoading && <KeyFindings findings={scenarioFindings(activePlanningScenario)} />}
      <ScenarioModelingPanel
        {...panelProps}
        visible
      />

      <details className="rounded-lg border p-4">
        <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Assumptions &amp; source details — stored company plan</summary>
        <div className="mt-3 space-y-4">
            <label className="mt-2 block text-sm">Reference scenario
              <select className="mt-1 block min-h-11 w-full rounded-md border bg-background p-2" value={activePlanningScenario?.scenario_name ?? ""} onChange={event=>onScenarioChange(event.target.value)}>
                {planningScenarios.map(scenario=><option key={scenario.scenario_name} value={scenario.scenario_name}>{scenario.scenario_name}</option>)}
              </select>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Select the stored plan used by source summaries and downstream design. Custom company assumptions remain a separate Baseline-based calculation.</p>

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
      </details>
      <details className="rounded-lg border p-4">
        <summary className="min-h-11 cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-ring">Training timing — optional</summary>
      <TrainingTimingPanel suggestedMonth={activePlanningStart?.planning_month.slice(0,7)??""} />
      </details>
      </HeadcountDemoWorkspace>
    </div>
  );
}
