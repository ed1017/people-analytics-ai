import type { PlanningPoint } from "./types";
// @ts-expect-error Native Node tests share the TypeScript source.
import { knownDifference, knownSum } from "./numeric-contract.ts";

export const storedPlanningProvenance = {
  source: "workforce_scenario_summary",
  status: "stored_modeled_plan",
  population: "Company-wide scenario workforce",
  grain: "One scenario and planning month per point",
  source_refreshed_at: null,
  flow_definition: "planned_hires and planned_exits are source-reported monthly flows, not cumulative counts or observed actuals.",
  reconciliation: "Stored flows do not fully explain the Baseline headcount curve. They are separate from engine-implied what-if hires and exits; no reconciliation is asserted.",
} as const;

/** Summarize source fields without filling unknown months or reconstructing flows. */
export function summarizeStoredPlanning(points: readonly PlanningPoint[]) {
  return {
    headcount_change: knownDifference(points.at(-1)?.planned_headcount, points[0]?.planned_headcount),
    hires: knownSum(points.map(point => point.planned_hires)),
    exits: knownSum(points.map(point => point.planned_exits)),
    months: points.length,
  };
}
