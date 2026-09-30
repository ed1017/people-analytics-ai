import { supabaseServer } from "./supabase-server";
import type {
  StructuralPositionAction,
  StructuralPositionCatalogResponse,
  StructuralPositionScenarioResponse,
} from "./types";

type NumericValue =
  | number
  | string
  | null
  | undefined;

type InventoryRow = {
  org_code: string;
  org_name: string;
  level_code: string;
  level_name: string;
  level_rank: number;
  job_profile_code: string;
  job_profile_name: string;
  filled: number;
  vacant: number;
  frozen: number;
  planned_weight: number;
  cost_per_position: number;
};

function toNumber(value: NumericValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function uniqueBy<T>(
  rows: T[],
  key: (row: T) => string
) {
  const map = new Map<string, T>();
  for (const row of rows) map.set(key(row), row);
  return Array.from(map.values());
}
async function loadInventory() {
  const [inventoryResult, overviewResult] =
    await Promise.all([
      supabaseServer
        .from(
          "position_action_structural_inventory"
        )
        .select("*"),
      supabaseServer
        .from("dashboard_overview_current")
        .select("snapshot_date")
        .single(),
    ]);

  if (inventoryResult.error) {
    throw new Error(
      "Structural position inventory: " +
        inventoryResult.error.message
    );
  }

  if (overviewResult.error) {
    throw new Error(
      "Structural position snapshot: " +
        overviewResult.error.message
    );
  }
  const rows: InventoryRow[] =
    (inventoryResult.data ?? []).map(
      (row) => ({
        org_code: row.org_code,
        org_name: row.org_name,
        level_code: row.level_code,
        level_name: row.level_name,
        level_rank: toNumber(
          row.level_rank
        ),
        job_profile_code:
          row.job_profile_code,
        job_profile_name:
          row.job_profile_name,
        filled: toNumber(
          row.filled_positions
        ),
        vacant: toNumber(
          row.vacant_positions
        ),
        frozen: 0,
        planned_weight: toNumber(
          row.planned_headcount
        ),
        cost_per_position: toNumber(
          row.annual_cost_per_position
        ),
      })
    );

  return {
    asOf:
      overviewResult.data?.snapshot_date ??
      "2026-09-30",
    rows,
  };
}
function matchesAction(
  row: InventoryRow,
  action: StructuralPositionAction
) {
  const bu = normalize(
    action.business_unit
  );
  const level = normalize(
    action.level
  );
  const profile = normalize(
    action.job_profile
  );

  const buMatch =
    !bu ||
    row.org_code.toLowerCase() === bu ||
    row.org_name.toLowerCase() === bu;

  const levelMatch =
    !level ||
    row.level_code.toLowerCase() === level ||
    row.level_name.toLowerCase() === level;

  const profileMatch =
    !profile ||
    row.job_profile_code.toLowerCase() ===
      profile ||
    row.job_profile_name.toLowerCase() ===
      profile;

  return buMatch && levelMatch && profileMatch;
}
function scopeLabel(
  rows: InventoryRow[],
  action: StructuralPositionAction
) {
  const matched = rows.filter((row) =>
    matchesAction(row, action)
  );

  if (matched.length === 0) {
    return "No matching position segment";
  }

  const bus = uniqueBy(
    matched,
    (row) => row.org_code
  );
  const levels = uniqueBy(
    matched,
    (row) => row.level_code
  );
  const profiles = uniqueBy(
    matched,
    (row) => row.job_profile_code
  );

  return [
    bus.length === 1
      ? bus[0].org_name
      : "All business units",
    levels.length === 1
      ? levels[0].level_name
      : "All levels",
    profiles.length === 1
      ? profiles[0].job_profile_name
      : "All job profiles",
  ].join(" · ");
}
function weightedCostBasis(
  rows: InventoryRow[],
  weight: (row: InventoryRow) => number
) {
  let totalWeight = 0;
  let weightedCost = 0;

  for (const row of rows) {
    const rowWeight = Math.max(
      0,
      weight(row)
    );
    totalWeight += rowWeight;
    weightedCost +=
      row.cost_per_position *
      rowWeight;
  }

  if (totalWeight <= 0) {
    return 0;
  }

  return weightedCost / totalWeight;
}

function inventoryTotals(
  rows: InventoryRow[]
) {
  return rows.reduce(
    (acc, row) => {
      acc.filled += row.filled;
      acc.vacant += row.vacant;
      acc.frozen += row.frozen;
      return acc;
    },
    {
      filled: 0,
      vacant: 0,
      frozen: 0,
    }
  );
}
export async function getStructuralPositionCatalog():
  Promise<StructuralPositionCatalogResponse> {
  const inventory =
    await loadInventory();

  const businessUnits = uniqueBy(
    inventory.rows.map((row) => ({
      org_code: row.org_code,
      org_name: row.org_name,
    })),
    (row) => row.org_code
  ).sort((a, b) =>
    a.org_name.localeCompare(b.org_name)
  );

  const levels = uniqueBy(
    inventory.rows.map((row) => ({
      level_code: row.level_code,
      level_name: row.level_name,
      level_rank: row.level_rank,
    })),
    (row) => row.level_code
  ).sort(
    (a, b) =>
      a.level_rank - b.level_rank
  );
  const jobProfiles = uniqueBy(
    inventory.rows.map((row) => ({
      job_profile_code:
        row.job_profile_code,
      job_profile_name:
        row.job_profile_name,
    })),
    (row) => row.job_profile_code
  ).sort((a, b) =>
    a.job_profile_name.localeCompare(
      b.job_profile_name
    )
  );

  return {
    as_of: inventory.asOf,
    business_units: businessUnits,
    levels,
    job_profiles: jobProfiles,
    combinations: inventory.rows.map(
      (row) => ({
        org_code: row.org_code,
        level_code: row.level_code,
        job_profile_code:
          row.job_profile_code,
        current_positions:
          row.filled + row.vacant,
        vacant_positions: row.vacant,
        annual_cost_per_position_usd:
          round2(
            row.cost_per_position
          ),
      })
    ),
  };
}
function distributeAmount(
  rows: InventoryRow[],
  totalAmount: number,
  capacity: (row: InventoryRow) => number,
  apply: (
    row: InventoryRow,
    amount: number
  ) => void
) {
  const totalCapacity = rows.reduce(
    (sum, row) =>
      sum +
      Math.max(0, capacity(row)),
    0
  );

  if (totalCapacity <= 0) {
    return 0;
  }

  const applied = Math.min(
    Math.max(0, totalAmount),
    totalCapacity
  );

  for (const row of rows) {
    const rowCapacity = Math.max(
      0,
      capacity(row)
    );
    if (rowCapacity <= 0) continue;

    apply(
      row,
      applied *
        (rowCapacity /
          totalCapacity)
    );
  }

  return applied;
}
function addPositions(
  rows: InventoryRow[],
  amount: number
) {
  const totalWeight = rows.reduce(
    (sum, row) =>
      sum +
      Math.max(
        0,
        row.planned_weight
      ),
    0
  );

  if (
    totalWeight <= 0 ||
    amount <= 0
  ) {
    return {
      applied: 0,
      budgetDelta: 0,
    };
  }

  let budgetDelta = 0;

  for (const row of rows) {
    const weight = Math.max(
      0,
      row.planned_weight
    );
    const added =
      amount *
      (weight / totalWeight);

    row.vacant += added;
    budgetDelta +=
      added *
      row.cost_per_position;
  }

  return {
    applied: amount,
    budgetDelta,
  };
}
function closeVacancies(
  rows: InventoryRow[],
  amount: number
) {
  let budgetDelta = 0;

  const applied = distributeAmount(
    rows,
    amount,
    (row) => row.vacant,
    (row, closed) => {
      row.vacant -= closed;
      budgetDelta -=
        closed *
        row.cost_per_position;
    }
  );

  return {
    applied,
    budgetDelta,
  };
}

function freezeVacancies(
  rows: InventoryRow[],
  amount: number
) {
  const applied = distributeAmount(
    rows,
    amount,
    (row) => row.vacant,
    (row, frozen) => {
      row.vacant -= frozen;
      row.frozen += frozen;
    }
  );

  return applied;
}
function fillVacancies(
  rows: InventoryRow[],
  fillPct: number
) {
  const pct = clamp(
    fillPct,
    0,
    100
  );

  let filledTotal = 0;
  let staffedCostDelta = 0;

  for (const row of rows) {
    const filled =
      row.vacant *
      (pct / 100);

    row.vacant -= filled;
    row.filled += filled;

    filledTotal += filled;
    staffedCostDelta +=
      filled *
      row.cost_per_position;
  }

  return {
    applied: filledTotal,
    staffedCostDelta,
  };
}
export async function runStructuralPositionScenario(
  actions: StructuralPositionAction[]
): Promise<StructuralPositionScenarioResponse> {
  const inventory =
    await loadInventory();

  const rows = inventory.rows.map(
    (row) => ({ ...row })
  );

  const starting =
    inventoryTotals(rows);

  let authorizedBudgetDelta = 0;
  let staffedLaborCostDelta = 0;

  const actionResults:
    StructuralPositionScenarioResponse["action_results"] =
    [];

  for (
    let index = 0;
    index < actions.length;
    index += 1
  ) {
    const action = actions[index];
    const matched = rows.filter((row) =>
      matchesAction(row, action)
    );

    if (matched.length === 0) {
      throw new Error(
        "Position action " +
          (index + 1) +
          " has no matching position segment."
      );
    }
    const affectedVacancies =
      matched.reduce(
        (sum, row) =>
          sum + row.vacant,
        0
      );

    let requestedValue = 0;
    let appliedValue = 0;
    let actionBudgetDelta = 0;
    let actionStaffedCostDelta = 0;
    let costBasis = 0;

    if (
      action.action_type ===
      "add_positions"
    ) {
      requestedValue = Math.max(
        0,
        toNumber(action.amount)
      );
      costBasis = weightedCostBasis(
        matched,
        (row) =>
          row.planned_weight
      );

      const result = addPositions(
        matched,
        requestedValue
      );
      appliedValue = result.applied;
      actionBudgetDelta =
        result.budgetDelta;
    } else if (
      action.action_type ===
      "close_vacant_positions"
    ) {
      requestedValue = Math.max(
        0,
        toNumber(action.amount)
      );
      costBasis = weightedCostBasis(
        matched,
        (row) => row.vacant
      );

      const result =
        closeVacancies(
          matched,
          requestedValue
        );
      appliedValue = result.applied;
      actionBudgetDelta =
        result.budgetDelta;
    } else if (
      action.action_type ===
      "freeze_vacancies"
    ) {
      requestedValue = Math.max(
        0,
        toNumber(action.amount)
      );
      costBasis = weightedCostBasis(
        matched,
        (row) => row.vacant
      );
      appliedValue =
        freezeVacancies(
          matched,
          requestedValue
        );
    } else if (
      action.action_type ===
      "fill_vacancies"
    ) {
      requestedValue = clamp(
        toNumber(action.fill_pct),
        0,
        100
      );
      costBasis = weightedCostBasis(
        matched,
        (row) => row.vacant
      );

      const result =
        fillVacancies(
          matched,
          requestedValue
        );
      appliedValue = result.applied;
      actionStaffedCostDelta =
        result.staffedCostDelta;
    } else {
      throw new Error(
        "Unsupported structural position action."
      );
    }

    authorizedBudgetDelta +=
      actionBudgetDelta;
    staffedLaborCostDelta +=
      actionStaffedCostDelta;

    actionResults.push({
      action_index: index + 1,
      action_type:
        action.action_type,
      scope_label:
        scopeLabel(
          rows,
          action
        ),
      requested_value:
        round1(requestedValue),
      applied_value:
        round1(appliedValue),
      affected_vacancies_before:
        round1(affectedVacancies),
      annual_cost_basis_per_position_usd:
        round2(costBasis),
      authorized_budget_delta_usd:
        round2(actionBudgetDelta),
      staffed_labor_cost_delta_usd:
        round2(
          actionStaffedCostDelta
        ),
    });
  }

  const ending =
    inventoryTotals(rows);

  const currentAuthorized =
    starting.filled +
    starting.vacant +
    starting.frozen;
  const modeledAuthorized =
    ending.filled +
    ending.vacant +
    ending.frozen;

  return {
    as_of: inventory.asOf,
    actions,
    current: {
      authorized_positions:
        round1(currentAuthorized),
      filled_positions:
        round1(starting.filled),
      open_vacancies:
        round1(starting.vacant),
      frozen_positions:
        round1(starting.frozen),
    },
    modeled: {
      authorized_positions:
        round1(modeledAuthorized),
      filled_positions:
        round1(ending.filled),
      open_vacancies:
        round1(ending.vacant),
      frozen_positions:
        round1(ending.frozen),
      net_authorized_position_change:
        round1(
          modeledAuthorized -
            currentAuthorized
        ),
      net_filled_position_change:
        round1(
          ending.filled -
            starting.filled
        ),
      vacancy_rate_pct:
        modeledAuthorized > 0
          ? round1(
              (ending.vacant /
                modeledAuthorized) *
                100
            )
          : 0,
      authorized_budget_delta_usd:
        round2(
          authorizedBudgetDelta
        ),
      annualized_staffed_labor_cost_delta_usd:
        round2(
          staffedLaborCostDelta
        ),
    },
    action_results: actionResults,
    methodology: [
      "Actions are applied in the order provided, so earlier freezes, closures, additions, or fills change the inventory available to later actions.",
      "Structural scopes may target a business unit, career level, job profile, or any combination of those dimensions.",
      "Added positions are distributed across matching structural combinations using their stored Baseline December 2027 planned-headcount mix and enter as vacancies.",
      "Closing positions is restricted to vacancies; filled positions are never converted into employee exits by this model.",
      "Frozen vacancies remain authorized and budgeted but are removed from the fillable vacancy pool.",
      "Fill actions move remaining vacancies to filled positions and create an annualized staffed labor-cost delta.",
      "Position cost basis uses the stored Baseline December 2027 annual labor cost per planned position for each BU × level × job-profile combination.",
      "Authorized budget delta reflects added or closed authorized positions. It is not the same as cash savings or realized payroll.",
      "The model is read-only and does not change source position, requisition, budget, or employee records.",
    ],
  };
}
