import {supabaseServer} from './supabase-server';
import {structuralPositionCatalog,structuralPositionScenario,type InventoryRow,type SkillRequirementRow,type ResponseStrategySignal} from './structural-position-engine';
import type {StructuralPositionAction} from './types';
type NumericValue=number|string|null|undefined;
function toNumber(value: NumericValue){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
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

export async function getStructuralPositionCatalog(){return structuralPositionCatalog(await loadInventory());}
export async function runStructuralPositionScenario(actions: StructuralPositionAction[]){return structuralPositionScenario(actions,await loadInventory());}
