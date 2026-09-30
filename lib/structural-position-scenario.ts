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

type SkillRequirementRow = {
  job_profile_code: string;
  skill_code: string;
  skill_name: string;
  skill_category: string;
};

type ResponseStrategySignal = {
  skill_code: string;
  active_course_count: number;
  avg_course_duration_hours: number | null;
  enrolled_learners: number;
  in_progress_learners: number;
  completed_learners_ytd: number;
  mobility_candidates: number;
  historical_filled_requisitions: number;
  median_time_to_fill_days: number | null;
  total_contingent_records: number;
  active_contingent_workers: number;
  avg_active_bill_rate: number | null;
};

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
  open_req: number;
  on_hold_req: number;
  uncovered: number;
  frozen_open_req: number;
  frozen_on_hold_req: number;
  frozen_uncovered: number;
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
  const [
    inventoryResult,
    overviewResult,
    skillRequirementResult,
    skillSupplyResult,
    responseStrategyResult,
  ] = await Promise.all([
    supabaseServer
      .from(
        "position_action_structural_inventory"
      )
      .select("*"),
    supabaseServer
      .from("dashboard_overview_current")
      .select("snapshot_date")
      .single(),
    supabaseServer
      .from(
        "position_skill_requirement_map"
      )
      .select(
        "job_profile_code, skill_code, skill_name, skill_category"
      ),
    supabaseServer
      .from("skills_current_supply")
      .select(
        "skill_code, employees_with_skill"
      ),
    supabaseServer
      .from(
        "workforce_response_strategy_signals"
      )
      .select(
        "skill_code, active_course_count, avg_course_duration_hours, enrolled_learners, in_progress_learners, completed_learners_ytd, mobility_candidates, historical_filled_requisitions, median_time_to_fill_days, total_contingent_records, active_contingent_workers, avg_active_bill_rate"
      ),
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

  if (skillRequirementResult.error) {
    throw new Error(
      "Position skill requirements: " +
        skillRequirementResult.error.message
    );
  }

  if (skillSupplyResult.error) {
    throw new Error(
      "Current skill supply: " +
        skillSupplyResult.error.message
    );
  }

  if (responseStrategyResult.error) {
    throw new Error(
      "Workforce response strategy signals: " +
        responseStrategyResult.error.message
    );
  }

  const responseStrategySignals =
    new Map<string, ResponseStrategySignal>(
      (responseStrategyResult.data ?? []).map(
        (row) => [
          row.skill_code,
          {
            skill_code: row.skill_code,
            active_course_count: toNumber(
              row.active_course_count
            ),
            avg_course_duration_hours:
              row.avg_course_duration_hours === null
                ? null
                : toNumber(
                    row.avg_course_duration_hours
                  ),
            enrolled_learners: toNumber(
              row.enrolled_learners
            ),
            in_progress_learners: toNumber(
              row.in_progress_learners
            ),
            completed_learners_ytd: toNumber(
              row.completed_learners_ytd
            ),
            mobility_candidates: toNumber(
              row.mobility_candidates
            ),
            historical_filled_requisitions:
              toNumber(
                row.historical_filled_requisitions
              ),
            median_time_to_fill_days:
              row.median_time_to_fill_days === null
                ? null
                : toNumber(
                    row.median_time_to_fill_days
                  ),
            total_contingent_records: toNumber(
              row.total_contingent_records
            ),
            active_contingent_workers: toNumber(
              row.active_contingent_workers
            ),
            avg_active_bill_rate:
              row.avg_active_bill_rate === null
                ? null
                : toNumber(
                    row.avg_active_bill_rate
                  ),
          },
        ]
      )
    );

  const skillRequirements:
    SkillRequirementRow[] =
    (skillRequirementResult.data ?? []).map(
      (row) => ({
        job_profile_code:
          row.job_profile_code,
        skill_code: row.skill_code,
        skill_name: row.skill_name,
        skill_category:
          row.skill_category,
      })
    );

  const skillSupply = new Map<
    string,
    number
  >(
    (skillSupplyResult.data ?? []).map(
      (row) => [
        row.skill_code,
        toNumber(
          row.employees_with_skill
        ),
      ]
    )
  );

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
        open_req: toNumber(
          row.open_requisition_vacancies
        ),
        on_hold_req: toNumber(
          row.on_hold_requisition_vacancies
        ),
        uncovered: toNumber(
          row.uncovered_vacancies
        ),
        frozen_open_req: 0,
        frozen_on_hold_req: 0,
        frozen_uncovered: 0,
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
    skillRequirements,
    skillSupply,
    responseStrategySignals,
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

function recruitingTotals(
  rows: InventoryRow[]
) {
  return rows.reduce(
    (acc, row) => {
      acc.open += row.open_req;
      acc.onHold +=
        row.on_hold_req +
        row.frozen_open_req +
        row.frozen_on_hold_req;
      acc.uncovered += row.uncovered;
      return acc;
    },
    {
      open: 0,
      onHold: 0,
      uncovered: 0,
    }
  );
}

function buildSkillDemand(
  initialRows: InventoryRow[],
  modeledRows: InventoryRow[],
  requirements: SkillRequirementRow[],
  supply: Map<string, number>
) {
  type SkillImpact =
    StructuralPositionScenarioResponse[
      "skill_demand"
    ]["top_changed_skills"][number];

  const byProfile = new Map<
    string,
    SkillRequirementRow[]
  >();

  for (const requirement of requirements) {
    const rows =
      byProfile.get(
        requirement.job_profile_code
      ) ?? [];
    rows.push(requirement);
    byProfile.set(
      requirement.job_profile_code,
      rows
    );
  }

  const impactMap = new Map<
    string,
    {
      skill_code: string;
      skill_name: string;
      skill_category: string;
      currentAuthorized: number;
      modeledAuthorized: number;
      currentRecruiting: number;
      modeledRecruiting: number;
    }
  >();

  for (
    let index = 0;
    index < modeledRows.length;
    index += 1
  ) {
    const initial = initialRows[index];
    const modeled = modeledRows[index];
    const profileRequirements =
      byProfile.get(
        modeled.job_profile_code
      ) ?? [];

    const currentAuthorized =
      initial.filled +
      initial.vacant +
      initial.frozen;
    const modeledAuthorized =
      modeled.filled +
      modeled.vacant +
      modeled.frozen;

    const currentRecruiting =
      initial.open_req +
      initial.uncovered;
    const modeledRecruiting =
      modeled.open_req +
      modeled.uncovered;

    for (
      const requirement
      of profileRequirements
    ) {
      const existing =
        impactMap.get(
          requirement.skill_code
        ) ?? {
          skill_code:
            requirement.skill_code,
          skill_name:
            requirement.skill_name,
          skill_category:
            requirement.skill_category,
          currentAuthorized: 0,
          modeledAuthorized: 0,
          currentRecruiting: 0,
          modeledRecruiting: 0,
        };

      existing.currentAuthorized +=
        currentAuthorized;
      existing.modeledAuthorized +=
        modeledAuthorized;
      existing.currentRecruiting +=
        currentRecruiting;
      existing.modeledRecruiting +=
        modeledRecruiting;

      impactMap.set(
        requirement.skill_code,
        existing
      );
    }
  }

  const impacts: SkillImpact[] =
    Array.from(impactMap.values()).map(
      (row) => {
        const currentSupply =
          supply.get(row.skill_code) ?? 0;

        return {
          skill_code: row.skill_code,
          skill_name: row.skill_name,
          skill_category:
            row.skill_category,
          current_authorized_position_demand:
            round1(
              row.currentAuthorized
            ),
          modeled_authorized_position_demand:
            round1(
              row.modeledAuthorized
            ),
          authorized_demand_delta:
            round1(
              row.modeledAuthorized -
                row.currentAuthorized
            ),
          current_employee_supply:
            round1(currentSupply),
          current_position_gap:
            round1(
              row.currentAuthorized -
                currentSupply
            ),
          modeled_position_gap:
            round1(
              row.modeledAuthorized -
                currentSupply
            ),
          current_active_recruiting_demand:
            round1(
              row.currentRecruiting
            ),
          modeled_active_recruiting_demand:
            round1(
              row.modeledRecruiting
            ),
          active_recruiting_demand_delta:
            round1(
              row.modeledRecruiting -
                row.currentRecruiting
            ),
        };
      }
    );

  const topChanged = impacts
    .filter(
      (row) =>
        Math.abs(
          row.authorized_demand_delta
        ) >= 0.1
    )
    .sort(
      (a, b) =>
        Math.abs(
          b.authorized_demand_delta
        ) -
          Math.abs(
            a.authorized_demand_delta
          ) ||
        b.modeled_position_gap -
          a.modeled_position_gap
    )
    .slice(0, 15);

  const largestGaps = impacts
    .filter(
      (row) =>
        row.modeled_position_gap > 0
    )
    .sort(
      (a, b) =>
        b.modeled_position_gap -
          a.modeled_position_gap ||
        b.authorized_demand_delta -
          a.authorized_demand_delta
    )
    .slice(0, 15);

  const topRecruiting = impacts
    .filter(
      (row) =>
        row.modeled_active_recruiting_demand >
        0
    )
    .sort(
      (a, b) =>
        b.modeled_active_recruiting_demand -
          a.modeled_active_recruiting_demand ||
        b.active_recruiting_demand_delta -
          a.active_recruiting_demand_delta
    )
    .slice(0, 15);

  return {
    skills_with_increased_authorized_demand:
      impacts.filter(
        (row) =>
          row.authorized_demand_delta > 0.05
      ).length,
    skills_with_reduced_authorized_demand:
      impacts.filter(
        (row) =>
          row.authorized_demand_delta < -0.05
      ).length,
    top_changed_skills: topChanged,
    largest_modeled_gaps: largestGaps,
    top_recruiting_skill_demand:
      topRecruiting,
  };
}

function buildResponseStrategy(
  skillDemand:
    StructuralPositionScenarioResponse["skill_demand"],
  signals: Map<
    string,
    ResponseStrategySignal
  >
): StructuralPositionScenarioResponse["response_strategy"] {
  const focusSkills =
    skillDemand.top_changed_skills
      .filter(
        (row) =>
          row.authorized_demand_delta >
            0.05 &&
          row.modeled_position_gap > 0
      )
      .slice(0, 10);

  const borrowDataAvailable =
    Array.from(signals.values()).some(
      (signal) =>
        signal.total_contingent_records >
        0
    );

  return {
    scope:
      "scenario_widened_skill_gaps",
    skills_evaluated:
      focusSkills.length,
    borrow_data_available:
      borrowDataAvailable,
    automate_data_available: false,
    skills: focusSkills.map((skill) => {
      const signal =
        signals.get(skill.skill_code);

      const activeCourseCount =
        signal?.active_course_count ?? 0;
      const mobilityCandidates =
        signal?.mobility_candidates ?? 0;
      const historicalFilledReqs =
        signal
          ?.historical_filled_requisitions ??
        0;
      const totalContingentRecords =
        signal?.total_contingent_records ??
        0;

      return {
        skill_code: skill.skill_code,
        skill_name: skill.skill_name,
        skill_category:
          skill.skill_category,
        modeled_position_gap:
          skill.modeled_position_gap,
        authorized_demand_delta:
          skill.authorized_demand_delta,
        modeled_active_recruiting_demand:
          skill.modeled_active_recruiting_demand,
        build: {
          pathway_available:
            activeCourseCount > 0,
          active_course_count:
            activeCourseCount,
          avg_course_duration_hours:
            signal
              ?.avg_course_duration_hours ??
            null,
          enrolled_learners:
            signal?.enrolled_learners ??
            0,
          in_progress_learners:
            signal
              ?.in_progress_learners ??
            0,
          completed_learners_ytd:
            signal
              ?.completed_learners_ytd ??
            0,
        },
        move: {
          mobility_candidates:
            mobilityCandidates,
          evidence_available:
            mobilityCandidates > 0,
        },
        buy: {
          active_recruiting_demand:
            skill.modeled_active_recruiting_demand,
          historical_filled_requisitions:
            historicalFilledReqs,
          median_time_to_fill_days:
            signal
              ?.median_time_to_fill_days ??
            null,
          evidence_available:
            historicalFilledReqs > 0,
        },
        borrow: {
          data_available:
            totalContingentRecords > 0,
          active_contingent_workers:
            signal
              ?.active_contingent_workers ??
            0,
          avg_active_bill_rate:
            signal
              ?.avg_active_bill_rate ??
            null,
        },
        automate: {
          data_available: false,
          reason:
            "No role- or task-level automation potential signal is loaded for this skill.",
        },
      };
    }),
  };
}

function consumeVacancyCategories(
  row: InventoryRow,
  amount: number
) {
  const available = Math.max(
    0,
    row.vacant
  );
  const applied = Math.min(
    Math.max(0, amount),
    available
  );

  if (available <= 0 || applied <= 0) {
    return {
      applied: 0,
      open: 0,
      onHold: 0,
      uncovered: 0,
    };
  }

  const open =
    applied *
    (row.open_req / available);
  const onHold =
    applied *
    (row.on_hold_req / available);
  const uncovered = Math.max(
    0,
    applied - open - onHold
  );

  row.vacant -= applied;
  row.open_req = Math.max(
    0,
    row.open_req - open
  );
  row.on_hold_req = Math.max(
    0,
    row.on_hold_req - onHold
  );
  row.uncovered = Math.max(
    0,
    row.uncovered - uncovered
  );

  return {
    applied,
    open,
    onHold,
    uncovered,
  };
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
    row.uncovered += added;
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
  let requisitionsToCancel = 0;

  const applied = distributeAmount(
    rows,
    amount,
    (row) => row.vacant,
    (row, closed) => {
      const consumed =
        consumeVacancyCategories(
          row,
          closed
        );

      requisitionsToCancel +=
        consumed.open +
        consumed.onHold;

      budgetDelta -=
        consumed.applied *
        row.cost_per_position;
    }
  );

  return {
    applied,
    budgetDelta,
    requisitionsToCancel,
  };
}

function freezeVacancies(
  rows: InventoryRow[],
  amount: number
) {
  let requisitionsToHold = 0;

  const applied = distributeAmount(
    rows,
    amount,
    (row) => row.vacant,
    (row, frozen) => {
      const consumed =
        consumeVacancyCategories(
          row,
          frozen
        );

      row.frozen +=
        consumed.applied;
      row.frozen_open_req +=
        consumed.open;
      row.frozen_on_hold_req +=
        consumed.onHold;
      row.frozen_uncovered +=
        consumed.uncovered;

      requisitionsToHold +=
        consumed.open;
    }
  );

  return {
    applied,
    requisitionsToHold,
  };
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
  let requisitionsToCreate = 0;
  let requisitionsToReactivate = 0;
  let requisitionsClosedAsFilled = 0;

  for (const row of rows) {
    const requestedFill =
      row.vacant *
      (pct / 100);
    const consumed =
      consumeVacancyCategories(
        row,
        requestedFill
      );

    row.filled +=
      consumed.applied;

    filledTotal +=
      consumed.applied;
    staffedCostDelta +=
      consumed.applied *
      row.cost_per_position;

    requisitionsToCreate +=
      consumed.uncovered;
    requisitionsToReactivate +=
      consumed.onHold;
    requisitionsClosedAsFilled +=
      consumed.applied;
  }

  return {
    applied: filledTotal,
    staffedCostDelta,
    requisitionsToCreate,
    requisitionsToReactivate,
    requisitionsClosedAsFilled,
  };
}
function buildBusinessUnitJobProfileImpact(
  initialRows: InventoryRow[],
  modeledRows: InventoryRow[]
): StructuralPositionScenarioResponse["business_unit_job_profile_impact"] {
  const segments = new Map<
    string,
    StructuralPositionScenarioResponse["business_unit_job_profile_impact"][number]
  >();

  for (let index = 0; index < modeledRows.length; index += 1) {
    const modeled = modeledRows[index];
    const initial = initialRows[index];
    const key =
      modeled.org_code + "::" + modeled.job_profile_code;
    const existing = segments.get(key) ?? {
      org_code: modeled.org_code,
      org_name: modeled.org_name,
      job_profile_code: modeled.job_profile_code,
      job_profile_name: modeled.job_profile_name,
      current_authorized_positions: 0,
      modeled_authorized_positions: 0,
      authorized_position_delta: 0,
      current_filled_positions: 0,
      modeled_filled_positions: 0,
      filled_position_delta: 0,
      modeled_open_vacancies: 0,
      modeled_frozen_positions: 0,
      modeled_active_recruiting_demand: 0,
    };

    existing.current_authorized_positions +=
      initial.filled + initial.vacant + initial.frozen;
    existing.modeled_authorized_positions +=
      modeled.filled + modeled.vacant + modeled.frozen;
    existing.current_filled_positions += initial.filled;
    existing.modeled_filled_positions += modeled.filled;
    existing.modeled_open_vacancies += modeled.vacant;
    existing.modeled_frozen_positions += modeled.frozen;
    existing.modeled_active_recruiting_demand +=
      modeled.open_req + modeled.uncovered;

    segments.set(key, existing);
  }

  return Array.from(segments.values())
    .map((segment) => ({
      ...segment,
      current_authorized_positions:
        round1(segment.current_authorized_positions),
      modeled_authorized_positions:
        round1(segment.modeled_authorized_positions),
      authorized_position_delta: round1(
        segment.modeled_authorized_positions -
          segment.current_authorized_positions
      ),
      current_filled_positions:
        round1(segment.current_filled_positions),
      modeled_filled_positions:
        round1(segment.modeled_filled_positions),
      filled_position_delta: round1(
        segment.modeled_filled_positions -
          segment.current_filled_positions
      ),
      modeled_open_vacancies:
        round1(segment.modeled_open_vacancies),
      modeled_frozen_positions:
        round1(segment.modeled_frozen_positions),
      modeled_active_recruiting_demand:
        round1(segment.modeled_active_recruiting_demand),
    }))
    .sort(
      (a, b) =>
        Math.abs(b.authorized_position_delta) -
          Math.abs(a.authorized_position_delta) ||
        a.org_name.localeCompare(b.org_name) ||
        a.job_profile_name.localeCompare(b.job_profile_name)
    );
}

function buildJobProfileImpact(
  initialRows: InventoryRow[],
  modeledRows: InventoryRow[]
): StructuralPositionScenarioResponse["job_profile_impact"] {
  const profiles = new Map<
    string,
    StructuralPositionScenarioResponse["job_profile_impact"][number]
  >();

  for (let index = 0; index < modeledRows.length; index += 1) {
    const modeled = modeledRows[index];
    const initial = initialRows[index];
    const existing = profiles.get(modeled.job_profile_code) ?? {
      job_profile_code: modeled.job_profile_code,
      job_profile_name: modeled.job_profile_name,
      current_authorized_positions: 0,
      modeled_authorized_positions: 0,
      authorized_position_delta: 0,
      current_filled_positions: 0,
      modeled_filled_positions: 0,
      filled_position_delta: 0,
      modeled_open_vacancies: 0,
      modeled_frozen_positions: 0,
      modeled_active_recruiting_demand: 0,
    };

    existing.current_authorized_positions +=
      initial.filled + initial.vacant + initial.frozen;
    existing.modeled_authorized_positions +=
      modeled.filled + modeled.vacant + modeled.frozen;
    existing.current_filled_positions += initial.filled;
    existing.modeled_filled_positions += modeled.filled;
    existing.modeled_open_vacancies += modeled.vacant;
    existing.modeled_frozen_positions += modeled.frozen;
    existing.modeled_active_recruiting_demand +=
      modeled.open_req + modeled.uncovered;

    profiles.set(modeled.job_profile_code, existing);
  }

  return Array.from(profiles.values())
    .map((profile) => ({
      ...profile,
      current_authorized_positions: round1(profile.current_authorized_positions),
      modeled_authorized_positions: round1(profile.modeled_authorized_positions),
      authorized_position_delta: round1(
        profile.modeled_authorized_positions - profile.current_authorized_positions
      ),
      current_filled_positions: round1(profile.current_filled_positions),
      modeled_filled_positions: round1(profile.modeled_filled_positions),
      filled_position_delta: round1(
        profile.modeled_filled_positions - profile.current_filled_positions
      ),
      modeled_open_vacancies: round1(profile.modeled_open_vacancies),
      modeled_frozen_positions: round1(profile.modeled_frozen_positions),
      modeled_active_recruiting_demand: round1(
        profile.modeled_active_recruiting_demand
      ),
    }))
    .sort(
      (a, b) =>
        Math.abs(b.authorized_position_delta) -
          Math.abs(a.authorized_position_delta) ||
        a.job_profile_name.localeCompare(b.job_profile_name)
    );
}

export async function runStructuralPositionScenario(
  actions: StructuralPositionAction[]
): Promise<StructuralPositionScenarioResponse> {
  const inventory =
    await loadInventory();

  const initialRows =
    inventory.rows.map(
      (row) => ({ ...row })
    );
  const rows = inventory.rows.map(
    (row) => ({ ...row })
  );

  const starting =
    inventoryTotals(rows);
  const startingRecruiting =
    recruitingTotals(rows);

  let authorizedBudgetDelta = 0;
  let staffedLaborCostDelta = 0;
  let requisitionsToHold = 0;
  let requisitionsToCancel = 0;
  let requisitionsToCreateForFills = 0;
  let requisitionsToReactivateForFills = 0;
  let requisitionsClosedAsFilled = 0;

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
    let actionRequisitionsToHold = 0;
    let actionRequisitionsToCancel = 0;
    let actionRequisitionsToCreateForFill = 0;
    let actionRequisitionsToReactivateForFill = 0;
    let actionRequisitionsClosedAsFilled = 0;
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
      actionRequisitionsToCancel =
        result.requisitionsToCancel;
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
      const result =
        freezeVacancies(
          matched,
          requestedValue
        );
      appliedValue = result.applied;
      actionRequisitionsToHold =
        result.requisitionsToHold;
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
      actionRequisitionsToCreateForFill =
        result.requisitionsToCreate;
      actionRequisitionsToReactivateForFill =
        result.requisitionsToReactivate;
      actionRequisitionsClosedAsFilled =
        result.requisitionsClosedAsFilled;
    } else {
      throw new Error(
        "Unsupported structural position action."
      );
    }

    authorizedBudgetDelta +=
      actionBudgetDelta;
    staffedLaborCostDelta +=
      actionStaffedCostDelta;
    requisitionsToHold +=
      actionRequisitionsToHold;
    requisitionsToCancel +=
      actionRequisitionsToCancel;
    requisitionsToCreateForFills +=
      actionRequisitionsToCreateForFill;
    requisitionsToReactivateForFills +=
      actionRequisitionsToReactivateForFill;
    requisitionsClosedAsFilled +=
      actionRequisitionsClosedAsFilled;

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
      requisitions_to_hold:
        round1(
          actionRequisitionsToHold
        ),
      requisitions_to_cancel:
        round1(
          actionRequisitionsToCancel
        ),
      requisitions_to_create_for_fill:
        round1(
          actionRequisitionsToCreateForFill
        ),
      requisitions_to_reactivate_for_fill:
        round1(
          actionRequisitionsToReactivateForFill
        ),
      requisitions_closed_as_filled:
        round1(
          actionRequisitionsClosedAsFilled
        ),
    });
  }

  const ending =
    inventoryTotals(rows);
  const endingRecruiting =
    recruitingTotals(rows);
  const jobProfileImpact =
    buildJobProfileImpact(
      initialRows,
      rows
    );
  const businessUnitJobProfileImpact =
    buildBusinessUnitJobProfileImpact(
      initialRows,
      rows
    );
  const skillDemand =
    buildSkillDemand(
      initialRows,
      rows,
      inventory.skillRequirements,
      inventory.skillSupply
    );
  const responseStrategy =
    buildResponseStrategy(
      skillDemand,
      inventory.responseStrategySignals
    );

  const recruitingByBusinessUnitMap =
    new Map<
      string,
      {
        org_code: string;
        org_name: string;
        active_open_requisitions: number;
        on_hold_requisitions: number;
        uncovered_open_vacancies: number;
        active_recruiting_demand: number;
        modeled_fills: number;
      }
    >();

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    const row = rows[index];
    const initial = initialRows[index];

    const existing =
      recruitingByBusinessUnitMap.get(
        row.org_code
      ) ?? {
        org_code: row.org_code,
        org_name: row.org_name,
        active_open_requisitions: 0,
        on_hold_requisitions: 0,
        uncovered_open_vacancies: 0,
        active_recruiting_demand: 0,
        modeled_fills: 0,
      };

    existing.active_open_requisitions +=
      row.open_req;
    existing.on_hold_requisitions +=
      row.on_hold_req +
      row.frozen_open_req +
      row.frozen_on_hold_req;
    existing.uncovered_open_vacancies +=
      row.uncovered;
    existing.active_recruiting_demand +=
      row.open_req +
      row.uncovered;
    existing.modeled_fills +=
      Math.max(
        0,
        row.filled -
          initial.filled
      );

    recruitingByBusinessUnitMap.set(
      row.org_code,
      existing
    );
  }

  const recruitingByBusinessUnit =
    Array.from(
      recruitingByBusinessUnitMap.values()
    )
      .map((row) => ({
        ...row,
        active_open_requisitions:
          round1(
            row.active_open_requisitions
          ),
        on_hold_requisitions:
          round1(
            row.on_hold_requisitions
          ),
        uncovered_open_vacancies:
          round1(
            row.uncovered_open_vacancies
          ),
        active_recruiting_demand:
          round1(
            row.active_recruiting_demand
          ),
        modeled_fills:
          round1(row.modeled_fills),
      }))
      .sort(
        (a, b) =>
          b.active_recruiting_demand -
          a.active_recruiting_demand
      );

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
      open_requisitions:
        round1(startingRecruiting.open),
      on_hold_requisitions:
        round1(startingRecruiting.onHold),
      uncovered_vacancies:
        round1(
          startingRecruiting.uncovered
        ),
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
    job_profile_impact:
      jobProfileImpact,
    business_unit_job_profile_impact:
      businessUnitJobProfileImpact,
    skill_demand: skillDemand,
    response_strategy:
      responseStrategy,
    recruiting_demand: {
      active_open_requisitions:
        round1(endingRecruiting.open),
      on_hold_requisitions:
        round1(endingRecruiting.onHold),
      uncovered_open_vacancies:
        round1(
          endingRecruiting.uncovered
        ),
      active_recruiting_demand:
        round1(
          endingRecruiting.open +
            endingRecruiting.uncovered
        ),
      incremental_requisitions_needed:
        round1(
          endingRecruiting.uncovered
        ),
      requisitions_to_hold:
        round1(requisitionsToHold),
      requisitions_to_cancel:
        round1(requisitionsToCancel),
      requisitions_to_create_for_modeled_fills:
        round1(
          requisitionsToCreateForFills
        ),
      requisitions_to_reactivate_for_modeled_fills:
        round1(
          requisitionsToReactivateForFills
        ),
      requisitions_closed_as_filled:
        round1(
          requisitionsClosedAsFilled
        ),
      by_business_unit:
        recruitingByBusinessUnit,
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
      "Current vacancy coverage is grounded in the linked requisition record for each vacant position: open requisitions are active recruiting demand and on-hold requisitions are tracked separately.",
      "New positions enter without a requisition. If they remain open, they create incremental requisition demand; if they are modeled as filled, the model counts the requisition that would need to be created first.",
      "Freezing a vacancy with an open requisition creates a modeled requisition-to-hold action. Closing a vacancy cancels its linked open/on-hold requisition. Filling a vacancy closes its requisition as filled; on-hold or uncovered vacancies require reactivation or creation first.",
      "Position-based skill demand counts how many authorized positions have a job profile that requires each skill. It includes vacant and frozen authorized positions, unlike the incumbent-only current Skills demand view.",
      "Active recruiting skill demand counts only active open requisition vacancies plus uncovered active vacancies; on-hold and frozen vacancies are excluded from active recruiting demand.",
      "Current employee skill supply is held constant during the scenario. Modeled skill gaps therefore show the gap implied by the new position structure before any reskilling, hiring, or internal mobility response.",
      "Job-skill requirement weights are not treated as percentages because profile-level weight totals are not normalized consistently; skill-demand counts use the existence of a requirement, not its weight.",
      "Workforce response strategy evidence is shown only for scenario-widened positive skill gaps. Build evidence comes from active learning courses and current learning pipeline; Move evidence counts current employees who already hold the skill and have a career preference for another job profile that also requires it; Buy evidence uses modeled active recruiting demand plus historical filled-requisition time-to-fill; these signals are evidence, not guaranteed capacity.",
      "Mobility candidate counts and learning counts are skill-level indicators and may overlap across skills, so they must not be added together as unique people.",
      "Borrow remains unavailable until contingent-worker data is loaded. Automate remains unmodeled until a role- or task-level automation potential signal is available.",
      "The model is read-only and does not change source position, requisition, skill, learning, mobility, budget, or employee records.",
    ],
  };
}
