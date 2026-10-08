import type { PlanningPoint } from "./types";
// @ts-expect-error Native Node tests share the TypeScript source.
import { knownDifference, knownSum } from "./numeric-contract.ts";

export type PlanningProvenance = {
  source:string;status:'stored_modeled_plan'|'constructed_draft_assumption';
  population:string;grain:string;source_refreshed_at:string|null;
  flow_definition:string;reconciliation:string;
  history_cutoff?:string;opening_headcount?:number;planning_start?:string;planning_end?:string;
  unmodeled_gap?:string[];independent_forecast_validation?:false;
};

export const storedPlanningProvenance = {
  source: "workforce_scenario_summary",
  status: "stored_modeled_plan",
  population: "Company-wide scenario workforce",
  grain: "One scenario and planning month per point",
  source_refreshed_at: null,
  flow_definition: "planned_hires and planned_exits are source-reported monthly flows, not cumulative counts or observed actuals.",
  reconciliation: "Stored flows do not fully explain the Baseline headcount curve. They are separate from engine-implied what-if hires and exits; no reconciliation is asserted.",
} as const;

/** The source declares no horizon bounds; validate every month between its returned endpoints. */
export function hasCompleteReturnedMonthWindow(months: readonly string[]) {
  if (!months.length) return false;
  const indices = months.map(month => {
    if (typeof month !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(month)) return null;
    const date = new Date(`${month}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== month) return null;
    return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
  });
  if (indices.some(month => month === null)) return false;
  const ordered = (indices as number[]).sort((a, b) => a - b);
  return ordered.every((month, index) => index === 0 || month === ordered[index - 1] + 1);
}

/** Sum only a valid, unique, contiguous returned window; never infer omitted boundary months. */
export function summarizeStoredPlanning(points: readonly PlanningPoint[]) {
  const complete = hasCompleteReturnedMonthWindow(points.map(point => point.planning_month));
  const ordered = complete ? [...points].sort((a, b) => a.planning_month.localeCompare(b.planning_month)) : [];
  return {
    headcount_change: knownDifference(ordered.at(-1)?.planned_headcount, ordered[0]?.planned_headcount),
    hires: knownSum(ordered.map(point => point.planned_hires)),
    exits: knownSum(ordered.map(point => point.planned_exits)),
    months: points.length,
  };
}
