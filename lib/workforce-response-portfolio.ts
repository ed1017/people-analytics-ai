import {
  runRoleWorkforceResponsePlan,
} from "./role-workforce-response-plan";
import {
  runStructuralPositionScenario,
} from "./structural-position-scenario";
import type {
  StructuralPositionAction,
  WorkforceResponsePlanAllocation,
  WorkforceResponsePortfolioResponse,
} from "./types";

export type WorkforceResponsePortfolioPlan = {
  job_profile: string;
  allocation: WorkforceResponsePlanAllocation;
};

export type WorkforceResponsePortfolioRequest = {
  actions: StructuralPositionAction[];
  plans: WorkforceResponsePortfolioPlan[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function emptyAllocation(): WorkforceResponsePlanAllocation {
  return {
    build: 0,
    move: 0,
    buy: 0,
    borrow: 0,
    automate: 0,
  };
}

export async function runWorkforceResponsePortfolio(
  request: WorkforceResponsePortfolioRequest
): Promise<WorkforceResponsePortfolioResponse> {
  if (
    !Array.isArray(request.plans) ||
    request.plans.length === 0
  ) {
    throw new Error(
      "At least one role response plan is required."
    );
  }

  if (request.plans.length > 20) {
    throw new Error(
      "A workforce response portfolio supports at most 20 role plans."
    );
  }

  const scenario =
    await runStructuralPositionScenario(
      request.actions
    );

  const positiveRoles =
    scenario.job_profile_impact.filter(
      (row) =>
        row.authorized_position_delta > 0
    );

  if (positiveRoles.length === 0) {
    throw new Error(
      "The structural scenario does not create positive job-profile demand."
    );
  }

  const resolvedPlans = request.plans.map(
    (plan) => {
      const key = normalize(
        plan.job_profile
      );
      const profile = positiveRoles.find(
        (row) =>
          normalize(
            row.job_profile_code
          ) === key ||
          normalize(
            row.job_profile_name
          ) === key
      );

      if (!profile) {
        throw new Error(
          "Portfolio role " +
            plan.job_profile +
            " does not have positive scenario-created demand."
        );
      }

      return {
        profile,
        allocation: plan.allocation,
      };
    }
  );

  const profileCodes =
    resolvedPlans.map(
      (plan) =>
        plan.profile.job_profile_code
    );
  const uniqueCodes =
    new Set(profileCodes);

  if (
    uniqueCodes.size !==
    profileCodes.length
  ) {
    throw new Error(
      "Each job profile may appear only once in a workforce response portfolio."
    );
  }

  const roles = await Promise.all(
    resolvedPlans.map((plan) =>
      runRoleWorkforceResponsePlan(
        {
          actions: request.actions,
          job_profile:
            plan.profile.job_profile_code,
          allocation: plan.allocation,
        },
        scenario
      )
    )
  );

  const allocation =
    roles.reduce(
      (total, role) => ({
        build:
          total.build +
          role.allocation.build,
        move:
          total.move +
          role.allocation.move,

        buy:
          total.buy +
          role.allocation.buy,
        borrow:
          total.borrow +
          role.allocation.borrow,
        automate:
          total.automate +
          role.allocation.automate,
      }),
      emptyAllocation()
    );

  const scenarioPositiveRoleDemand =
    round1(
      positiveRoles.reduce(
        (sum, role) =>
          sum +
          role.authorized_position_delta,
        0
      )
    );

  const plannedRoleDemand =
    round1(
      roles.reduce(
        (sum, role) =>
          sum +
          role.scenario_created_role_demand,
        0
      )
    );

  const plannedCoverage =
    round1(
      roles.reduce(
        (sum, role) =>
          sum +
          Math.min(
            role.scenario_created_role_demand,
            role.planned_role_coverage_if_executed
          ),
        0
      )
    );

  const remainingGap =
    round1(
      roles.reduce(
        (sum, role) =>
          sum +
          role.remaining_role_gap_if_executed,
        0
      )
    );

  const overplannedCapacity =
    round1(
      roles.reduce(
        (sum, role) =>
          sum +
          role.overplanned_capacity,
        0
      )
    );

  const plannedCodes =
    new Set(
      roles.map(
        (role) =>
          role.job_profile_code
      )
    );

  const unplannedRoles =
    positiveRoles
      .filter(
        (role) =>
          !plannedCodes.has(
            role.job_profile_code
          )
      )
      .map((role) => ({
        job_profile_code:
          role.job_profile_code,
        job_profile_name:
          role.job_profile_name,
        scenario_created_role_demand:
          round1(
            role.authorized_position_delta
          ),
      }));

  const unplannedRoleDemand =
    round1(
      unplannedRoles.reduce(
        (sum, role) =>
          sum +
          role.scenario_created_role_demand,
        0
      )
    );

  const warnings =
    roles.flatMap((role) =>
      role.warnings.map(
        (warning) =>
          role.job_profile_name +
          ": " +
          warning
      )
    );

  if (unplannedRoleDemand > 0) {
    warnings.push(
      "The portfolio does not include all positive scenario-created role demand; unplanned roles remain uncovered."
    );
  }

  return {
    as_of: scenario.as_of,
    scenario_positive_role_demand:
      scenarioPositiveRoleDemand,
    planned_role_demand:
      plannedRoleDemand,
    unplanned_role_demand:
      unplannedRoleDemand,
    allocation: {
      build: round1(allocation.build),
      move: round1(allocation.move),
      buy: round1(allocation.buy),
      borrow: round1(allocation.borrow),
      automate:
        round1(allocation.automate),
    },

    planned_coverage_if_executed:
      plannedCoverage,
    remaining_gap_if_executed:
      remainingGap,
    overplanned_capacity:
      overplannedCapacity,
    coverage_pct_of_planned_roles:
      plannedRoleDemand > 0
        ? round1(
            (plannedCoverage /
              plannedRoleDemand) *
              100
          )
        : 0,
    coverage_pct_of_all_positive_role_demand:
      scenarioPositiveRoleDemand > 0
        ? round1(
            (plannedCoverage /
              scenarioPositiveRoleDemand) *
              100
          )
        : 0,
    internal_supply: {
      role_ready:
        roles.reduce(
          (sum, role) =>
            sum +
            role.internal_talent_readiness
              .candidate_pool.role_ready,
          0
        ),
      near_ready:
        roles.reduce(
          (sum, role) =>
            sum +
            role.internal_talent_readiness
              .candidate_pool.near_ready,
          0
        ),
      fully_pathway_covered_near_ready:
        roles.reduce(
          (sum, role) =>
            sum +
            role.internal_talent_readiness
              .development_pathway_coverage
              .fully_pathway_covered_candidates,
          0
        ),
    },

    recruiting_evidence: {
      current_open_requisitions:
        roles.reduce(
          (sum, role) =>
            sum +
            role.external_recruiting_feasibility
              .current_pipeline
              .open_requisitions,
          0
        ),
      recent_12m_external_fills:
        roles.reduce(
          (sum, role) =>
            sum +
            role.external_recruiting_feasibility
              .historical_external
              .recent_12m_filled_requisitions,
          0
        ),
    },
    roles,
    unplanned_roles:
      unplannedRoles,
    warnings,
    methodology: [
      "The portfolio aggregates whole-role response plans generated from one shared deterministic structural position scenario.",
      "Build, Move, and Buy allocations are user-directed. The portfolio does not optimize or invent allocations.",
      "Current governed career-preference data enforces one preference row per employee, so interested internal Build and Move pools are mutually exclusive across target job profiles.",
      "Within each role, role-ready and near-ready cohorts are mutually exclusive, so Move and Build supply are not double-counted within that role.",
      "Portfolio planned coverage caps each role's contribution at that role's scenario-created demand; overplanned capacity is reported separately.",
      "Unplanned positive role demand remains visible and is treated as uncovered rather than silently excluded.",
      "Recruiting evidence is aggregated only across distinct target job profiles. Historical hiring evidence remains descriptive and is not a forecast.",
      "The portfolio is read-only and does not change positions, employee records, learning assignments, requisitions, or hiring records.",
    ],
  };
}
