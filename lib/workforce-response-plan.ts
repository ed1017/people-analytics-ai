import {
  runStructuralPositionScenario,
} from "./structural-position-scenario";
import type {
  StructuralPositionAction,
  WorkforceResponsePlanAllocation,
  WorkforceResponsePlanResponse,
} from "./types";

export type WorkforceResponsePlanRequest = {
  actions: StructuralPositionAction[];
  skill_code: string;
  allocation: WorkforceResponsePlanAllocation;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function nonNegative(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}
export async function runWorkforceResponsePlan(
  request: WorkforceResponsePlanRequest
): Promise<WorkforceResponsePlanResponse> {
  const scenario =
    await runStructuralPositionScenario(
      request.actions
    );

  const skillKey =
    request.skill_code
      .trim()
      .toLowerCase();

  const skill =
    scenario.response_strategy.skills.find(
      (row) =>
        row.skill_code.toLowerCase() ===
          skillKey ||
        row.skill_name.toLowerCase() ===
          skillKey
    );

  if (!skill) {
    throw new Error(
      "The selected skill is not a scenario-widened positive gap. Available skills: " +
        scenario.response_strategy.skills
          .map((row) => row.skill_name)
          .join(", ")
    );
  }
  const allocation:
    WorkforceResponsePlanAllocation = {
    build: round1(
      nonNegative(
        request.allocation?.build ?? 0
      )
    ),
    move: round1(
      nonNegative(
        request.allocation?.move ?? 0
      )
    ),
    buy: round1(
      nonNegative(
        request.allocation?.buy ?? 0
      )
    ),
    borrow: round1(
      nonNegative(
        request.allocation?.borrow ?? 0
      )
    ),
    automate: round1(
      nonNegative(
        request.allocation?.automate ?? 0
      )
    ),
  };

  if (
    allocation.borrow > 0 &&
    !skill.borrow.data_available
  ) {
    throw new Error(
      "Borrow cannot be allocated because no contingent-worker evidence is loaded."
    );
  }

  if (
    allocation.automate > 0 &&
    !skill.automate.data_available
  ) {
    throw new Error(
      "Automate cannot be allocated because no role- or task-level automation signal is loaded."
    );
  }
  const plannedCoverage = round1(
    allocation.build +
      allocation.move +
      allocation.buy +
      allocation.borrow +
      allocation.automate
  );

  const remainingGap = round1(
    Math.max(
      0,
      skill.modeled_position_gap -
        plannedCoverage
    )
  );

  const overplannedCapacity = round1(
    Math.max(
      0,
      plannedCoverage -
        skill.modeled_position_gap
    )
  );

  const coveragePct =
    skill.modeled_position_gap > 0
      ? round1(
          Math.min(
            100,
            (plannedCoverage /
              skill.modeled_position_gap) *
              100
          )
        )
      : 0;

  const warnings: string[] = [];
  if (
    allocation.build > 0 &&
    !skill.build.pathway_available
  ) {
    warnings.push(
      "Build target has no active learning-course pathway in the loaded data."
    );
  }

  if (
    allocation.build > 0 &&
    skill.build.pathway_available &&
    skill.build.enrolled_learners === 0 &&
    skill.build.in_progress_learners === 0
  ) {
    warnings.push(
      "A Build pathway exists, but there is no current enrolled or in-progress learner pipeline for this skill."
    );
  }

  if (
    allocation.move >
    skill.move.mobility_candidates
  ) {
    warnings.push(
      "Move target exceeds the current mobility-candidate signal for this skill."
    );
  }

  if (
    allocation.buy > 0 &&
    !skill.buy.evidence_available
  ) {
    warnings.push(
      "Buy target has no historical filled-requisition evidence for this skill."
    );
  }
  if (
    allocation.buy > 0 &&
    skill.buy.median_time_to_fill_days ===
      null
  ) {
    warnings.push(
      "Buy target has no historical median time-to-fill estimate."
    );
  }

  if (overplannedCapacity > 0) {
    warnings.push(
      "Planned response exceeds the modeled skill gap; reduce allocations or treat the excess as contingency rather than gap closure."
    );
  }

  return {
    skill_code: skill.skill_code,
    skill_name: skill.skill_name,
    skill_category:
      skill.skill_category,
    modeled_position_gap:
      skill.modeled_position_gap,
    allocation,
    planned_coverage_if_executed:
      plannedCoverage,
    remaining_gap_if_executed:
      remainingGap,
    overplanned_capacity:
      overplannedCapacity,
    coverage_pct_if_executed:
      coveragePct,
    evidence: {
      build: {
        pathway_available:
          skill.build.pathway_available,
        active_course_count:
          skill.build.active_course_count,
        avg_course_duration_hours:
          skill.build.avg_course_duration_hours,
        enrolled_learners:
          skill.build.enrolled_learners,
        in_progress_learners:
          skill.build.in_progress_learners,
      },
      move: {
        mobility_candidates:
          skill.move.mobility_candidates,
      },
      buy: {
        active_recruiting_demand:
          skill.buy.active_recruiting_demand,
        historical_filled_requisitions:
          skill.buy.historical_filled_requisitions,
        median_time_to_fill_days:
          skill.buy.median_time_to_fill_days,
      },
      borrow: {
        data_available:
          skill.borrow.data_available,
        active_contingent_workers:
          skill.borrow.active_contingent_workers,
        avg_active_bill_rate:
          skill.borrow.avg_active_bill_rate,
      },
      automate: {
        data_available:
          skill.automate.data_available,
        reason:
          skill.automate.reason,
      },
    },
    warnings,
    methodology: [
      "This is a user-directed workforce response allocation, not an optimizer or recommendation ranking.",
      "Planned coverage if executed assumes one Build, Move, Buy, Borrow, or Automate unit closes one unit of the selected skill gap.",
      "Do not add separate skill response plans together as unique people or positions: one person or role may satisfy multiple skill gaps.",
      "Build targets are planned upskilling outcomes, not guaranteed completions or demonstrated proficiency gains.",
      "Move targets are planned internal placements. Mobility candidates are evidence of possible supply, not confirmed availability or readiness.",
      "Buy targets are planned external hires for roles requiring the selected skill. Historical time-to-fill is descriptive, not a forecast.",
      "Borrow and Automate can only be allocated when their supporting data exists.",
      "This response plan does not calculate dollar cost because path-specific costs and multi-skill overlap are not modeled reliably enough for defensible aggregation.",
      "The plan is read-only and does not enroll learners, move employees, open requisitions, hire candidates, or change workforce records.",
    ],
  };
}
