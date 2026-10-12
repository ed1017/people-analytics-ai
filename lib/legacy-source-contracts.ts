// Verified legacy view definitions. These contracts do not describe constructed datasets.
export const legacyPositionSource = {
  version: 1,
  source: "position_modeling_scenario_summary",
  measure: "planned_headcount",
  aggregation: "sum_of_rounded_org_level_groups",
  planScope: "all_plans",
  inventorySource: "position_modeling_current_summary",
  inventoryEffectiveDate: null,
} as const;

export const legacyAttritionDefaultSource = {
  version: 1,
  source: "scenario_modeler_defaults",
  measure: "all_separations",
  windowStart: "2026-01-01",
  windowEnd: "2026-09-30",
  denominator: "average_snapshot_headcount",
  annualization: "12/9",
} as const;

export const legacyMovementWindow = {
  source: "workforce_movement_summary",
  start: "2026-01-01",
  end: "2026-09-30",
} as const;

function matches(value: unknown, contract: Record<string, unknown>) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.entries(contract).every(([key, expected]) =>
      (value as Record<string, unknown>)[key] === expected);
}

export function hasLegacyPositionSource(value: unknown) {
  return matches(value, legacyPositionSource);
}

export type ScenarioDefaultSource = { provenance?: unknown; dataClass?: string };

export function attritionDefaultLabel(source?: ScenarioDefaultSource | null) {
  if (source?.dataClass === "constructed-synthetic") {
    return "Constructed dataset planning default · Not observed voluntary turnover YTD";
  }
  if (matches(source?.provenance, legacyAttritionDefaultSource)) {
    return "Default: all separations Jan–Sep 2026, annualized ×12/9 over average snapshot headcount · Not voluntary-only turnover";
  }
  return "Default provenance unavailable · Not observed voluntary turnover YTD";
}

export function movementWindowLabel(value: unknown) {
  return matches(value, legacyMovementWindow) ? "Source window: Jan–Sep 2026 · " : "";
}
