import { supabaseServer } from "./supabase-server";
import {
  runStructuralPositionScenario,
} from "./structural-position-scenario";
import type {
  RoleWorkforceResponsePlanResponse,
  StructuralPositionAction,
  WorkforceResponsePlanAllocation,
} from "./types";

export type RoleWorkforceResponsePlanRequest = {
  actions: StructuralPositionAction[];
  job_profile: string;
  allocation: WorkforceResponsePlanAllocation;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function toNumber(
  value: number | string | null | undefined
) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function cleanAllocation(
  allocation: WorkforceResponsePlanAllocation
): WorkforceResponsePlanAllocation {
  const clean = (value: number) =>
    round1(
      Number.isFinite(value)
        ? Math.max(0, value)
        : 0
    );

  return {
    build: clean(allocation?.build ?? 0),
    move: clean(allocation?.move ?? 0),
    buy: clean(allocation?.buy ?? 0),
    borrow: clean(allocation?.borrow ?? 0),
    automate: clean(allocation?.automate ?? 0),
  };
}

export async function runRoleWorkforceResponsePlan(
  request: RoleWorkforceResponsePlanRequest
): Promise<RoleWorkforceResponsePlanResponse> {
  const scenario =
    await runStructuralPositionScenario(
      request.actions
    );

  const profileKey = normalize(
    request.job_profile
  );

  const profile =
    scenario.job_profile_impact.find(
      (row) =>
        normalize(row.job_profile_code) ===
          profileKey ||
        normalize(row.job_profile_name) ===
          profileKey
    );

  if (!profile) {
    throw new Error(
      "The selected job profile is not in the structural position inventory."
    );
  }

  if (profile.authorized_position_delta <= 0) {
    throw new Error(
      "The selected job profile does not have positive scenario-created authorized-position demand."
    );
  }

  const allocation = cleanAllocation(
    request.allocation
  );

  if (allocation.borrow > 0) {
    throw new Error(
      "Borrow cannot be allocated at role level because no governed role-level contingent-capacity signal is loaded."
    );
  }

  if (allocation.automate > 0) {
    throw new Error(
      "Automate cannot be allocated at role level because no governed role- or task-level automation signal is loaded."
    );
  }

  const bundleResult = await supabaseServer
    .from("position_skill_requirement_map")
    .select(
      "job_profile_code, job_profile_name, skill_code, skill_name, skill_category, required_proficiency, importance, weight"
    )
    .eq(
      "job_profile_code",
      profile.job_profile_code
    )
    .order("importance", {
      ascending: true,
    });

  if (bundleResult.error) {
    throw new Error(
      "Role skill bundle: " +
        bundleResult.error.message
    );
  }

  const bundleRows =
    bundleResult.data ?? [];

  if (bundleRows.length === 0) {
    throw new Error(
      "The selected job profile has no governed skill requirements."
    );
  }

  const skillCodes = bundleRows.map(
    (row) => row.skill_code
  );

  const signalResult =
    await supabaseServer
      .from(
        "workforce_response_strategy_signals"
      )
      .select(
        "skill_code, active_course_count, mobility_candidates, historical_filled_requisitions, median_time_to_fill_days"
      )
      .in("skill_code", skillCodes);

  if (signalResult.error) {
    throw new Error(
      "Role response evidence: " +
        signalResult.error.message
    );
  }

  const signals = new Map(
    (signalResult.data ?? []).map(
      (row) => [row.skill_code, row]
    )
  );

  const skillBundle =
    bundleRows.map((row) => {
      const signal = signals.get(
        row.skill_code
      );

      const activeCourseCount =
        toNumber(
          signal?.active_course_count
        );
      const mobilityCandidates =
        toNumber(
          signal?.mobility_candidates
        );
      const historicalFilled =
        toNumber(
          signal
            ?.historical_filled_requisitions
        );

      return {
        skill_code: row.skill_code,
        skill_name: row.skill_name,
        skill_category:
          row.skill_category,
        required_proficiency:
          toNumber(
            row.required_proficiency
          ),
        importance:
          row.importance ?? "Unknown",
        weight: toNumber(row.weight),
        build_pathway_available:
          activeCourseCount > 0,
        active_course_count:
          activeCourseCount,
        mobility_candidates:
          mobilityCandidates,

        historical_filled_requisitions:
          historicalFilled,
        median_time_to_fill_days:
          signal
            ?.median_time_to_fill_days ===
            null ||
          signal
            ?.median_time_to_fill_days ===
            undefined
            ? null
            : toNumber(
                signal
                  .median_time_to_fill_days
              ),
      };
    });

  const plannedCoverage = round1(
    allocation.build +
      allocation.move +
      allocation.buy
  );
  const roleDemand = round1(
    profile.authorized_position_delta
  );
  const remainingGap = round1(
    Math.max(
      0,
      roleDemand - plannedCoverage
    )
  );
  const overplannedCapacity = round1(
    Math.max(
      0,
      plannedCoverage - roleDemand
    )
  );
  const coveragePct =
    roleDemand > 0
      ? round1(
          Math.min(
            100,
            (plannedCoverage /
              roleDemand) *
              100
          )
        )
      : 0;

  const skillsWithBuild =
    skillBundle.filter(
      (row) =>
        row.build_pathway_available
    ).length;
  const skillsWithMove =
    skillBundle.filter(
      (row) =>
        row.mobility_candidates > 0
    ).length;
  const skillsWithBuy =
    skillBundle.filter(
      (row) =>
        row.historical_filled_requisitions > 0
    ).length;
  const warnings: string[] = [];

  if (
    allocation.build > 0 &&
    skillsWithBuild < skillBundle.length
  ) {
    warnings.push(
      "Build is planned for the role, but not every required skill has an active learning pathway in the loaded data."
    );
  }

  if (allocation.move > 0) {
    warnings.push(
      "Move evidence is skill-level and overlapping; it does not prove that the same internal candidates satisfy the full role skill bundle."
    );
  }

  if (
    allocation.buy > 0 &&
    skillsWithBuy < skillBundle.length
  ) {
    warnings.push(
      "Buy is planned for the role, but not every required skill has historical filled-requisition evidence."
    );
  }

  if (overplannedCapacity > 0) {
    warnings.push(
      "Planned role coverage exceeds the scenario-created role demand; treat the excess as contingency rather than additional gap closure."
    );
  }

  return {
    job_profile_code:
      profile.job_profile_code,
    job_profile_name:
      profile.job_profile_name,
    scenario_created_role_demand:
      roleDemand,
    allocation,
    planned_role_coverage_if_executed:
      plannedCoverage,
    remaining_role_gap_if_executed:
      remainingGap,
    overplanned_capacity:
      overplannedCapacity,
    coverage_pct_if_executed:
      coveragePct,
    skill_bundle: skillBundle,
    evidence_summary: {
      required_skill_count:
        skillBundle.length,
      skills_with_build_pathway:
        skillsWithBuild,
      skills_with_move_signal:
        skillsWithMove,
      skills_with_buy_history:
        skillsWithBuy,
    },
    warnings,
    methodology: [
      "The planning unit is one role-capacity unit, not one skill. A single Build, Move, or Buy unit is counted once even though the role requires multiple skills.",
      "Scenario-created role demand is the positive authorized-position delta for the selected job profile after all structural position actions are applied in order.",
      "The required skill bundle comes from governed job-profile skill requirements, including required proficiency and importance.",
      "Build, Move, and Buy evidence is shown by required skill to test whether the response path is supported across the role bundle; skill-level counts are not added together as unique people.",
      "Role coverage is conditional on executed Build/Move/Buy capacity meeting the full job-profile requirements. The model does not claim that current candidates or learners already meet every required skill.",
      "Borrow is unavailable until governed role-level contingent-capacity evidence exists. Automate is unavailable until governed role- or task-level automation evidence exists.",
      "This plan is read-only and does not enroll learners, move employees, open requisitions, hire candidates, or change workforce records.",
    ],
  };
}
