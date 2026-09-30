import {
  getInternalTalentReadiness,
} from "./internal-talent-readiness";
import {
  getRoleBuyFeasibility,
} from "./role-buy-feasibility";
import {
  runTimePhasedWorkforceExecution,
  type TimePhasedWorkforceExecutionRequest,
} from "./time-phased-workforce-execution";
import type {
  WorkforceResponseConstraintResponse,
} from "./types";

export type WorkforceResponseHardConstraints = {
  max_total_build: number | null;
  max_total_move: number | null;
  max_total_buy: number | null;
  max_monthly_build: number | null;
  max_monthly_move: number | null;
  max_monthly_buy: number | null;
  max_monthly_total: number | null;
  deadline_month: string | null;
  required_coverage_pct_by_deadline:
    number | null;
  require_all_approved_capacity_scheduled:
    boolean;
};

export type WorkforceResponseConstraintRequest =
  TimePhasedWorkforceExecutionRequest & {
    constraints: WorkforceResponseHardConstraints;
  };

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function monthIndex(value: string) {
  const match =
    /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(
      "Constraint deadline_month must use YYYY-MM format."
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      "Constraint deadline_month must use a valid YYYY-MM value."
    );
  }

  return year * 12 + month - 1;
}

function cleanCap(
  value: number | null
) {
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    throw new Error(
      "Constraint caps must be finite numbers or null."
    );
  }
  if (value < 0) {
    throw new Error(
      "Constraint caps cannot be negative."
    );
  }
  return round1(value);
}

function pushNumericCap(
  rows: WorkforceResponseConstraintResponse["hard_constraints"],
  code: string,
  label: string,
  actual: number,
  limit: number | null,
  detail: string
) {
  if (limit === null) return;
  rows.push({
    constraint_code: code,
    label,
    passed: actual <= limit + 0.0001,
    actual_value: round1(actual),
    limit_value: limit,
    detail,
  });
}

function coverageAtMonth(
  execution: Awaited<
    ReturnType<
      typeof runTimePhasedWorkforceExecution
    >
  >,
  month: string
) {
  const deadlineIndex =
    monthIndex(month);
  const startIndex =
    monthIndex(
      execution.planning_start_month
    );

  if (deadlineIndex < startIndex) {
    return 0;
  }

  const eligible =
    execution.timeline.filter(
      (row) =>
        monthIndex(row.month) <=
        deadlineIndex
    );

  if (eligible.length === 0) {
    return 0;
  }

  return eligible[
    eligible.length - 1
  ].coverage_pct;
}

export async function runWorkforceResponseConstraintCheck(
  request: WorkforceResponseConstraintRequest
): Promise<WorkforceResponseConstraintResponse> {
  const execution =
    await runTimePhasedWorkforceExecution(
      request
    );

  const constraints =
    request.constraints;
  const maxTotalBuild = cleanCap(
    constraints.max_total_build
  );
  const maxTotalMove = cleanCap(
    constraints.max_total_move
  );
  const maxTotalBuy = cleanCap(
    constraints.max_total_buy
  );
  const maxMonthlyBuild = cleanCap(
    constraints.max_monthly_build
  );
  const maxMonthlyMove = cleanCap(
    constraints.max_monthly_move
  );
  const maxMonthlyBuy = cleanCap(
    constraints.max_monthly_buy
  );
  const maxMonthlyTotal = cleanCap(
    constraints.max_monthly_total
  );

  const hardConstraints:
    WorkforceResponseConstraintResponse["hard_constraints"] =
    [];

  pushNumericCap(
    hardConstraints,
    "max_total_build",
    "Maximum total Build",
    execution.target_allocation.build,
    maxTotalBuild,
    "Compares the approved Build target with the user-supplied total Build cap."
  );
  pushNumericCap(
    hardConstraints,
    "max_total_move",
    "Maximum total Move",
    execution.target_allocation.move,
    maxTotalMove,
    "Compares the approved Move target with the user-supplied total Move cap."
  );

  pushNumericCap(
    hardConstraints,
    "max_total_buy",
    "Maximum total Buy",
    execution.target_allocation.buy,
    maxTotalBuy,
    "Compares the approved Buy target with the user-supplied total Buy cap."
  );

  const peakMonthlyBuild =
    Math.max(
      0,
      ...execution.timeline.map(
        (row) => row.effective_build
      )
    );
  const peakMonthlyMove =
    Math.max(
      0,
      ...execution.timeline.map(
        (row) => row.effective_move
      )
    );
  const peakMonthlyBuy =
    Math.max(
      0,
      ...execution.timeline.map(
        (row) => row.effective_buy
      )
    );
  const peakMonthlyTotal =
    Math.max(
      0,
      ...execution.timeline.map(
        (row) =>
          row.effective_build +
          row.effective_move +
          row.effective_buy
      )
    );

  pushNumericCap(
    hardConstraints,
    "max_monthly_build",
    "Maximum monthly Build",
    peakMonthlyBuild,
    maxMonthlyBuild,
    "Compares the highest single-month effective Build capacity with the user-supplied monthly cap."
  );
  pushNumericCap(
    hardConstraints,
    "max_monthly_move",
    "Maximum monthly Move",
    peakMonthlyMove,
    maxMonthlyMove,
    "Compares the highest single-month effective Move capacity with the user-supplied monthly cap."
  );
  pushNumericCap(
    hardConstraints,
    "max_monthly_buy",
    "Maximum monthly Buy",
    peakMonthlyBuy,
    maxMonthlyBuy,
    "Compares the highest single-month effective Buy capacity with the user-supplied monthly cap."
  );
  pushNumericCap(
    hardConstraints,
    "max_monthly_total",
    "Maximum total monthly execution",
    peakMonthlyTotal,
    maxMonthlyTotal,
    "Compares the highest single-month combined Build + Move + Buy effective capacity with the user-supplied monthly cap."
  );

  const overscheduledTotal =
    execution.overscheduled_allocation.build +
    execution.overscheduled_allocation.move +
    execution.overscheduled_allocation.buy;

  hardConstraints.push({
    constraint_code:
      "no_overscheduled_capacity",
    label:
      "No capacity above approved BU/path targets",
    passed:
      overscheduledTotal <= 0.0001,
    actual_value:
      round1(overscheduledTotal),
    limit_value: 0,
    detail:
      "Any schedule amount above an approved BU/path allocation is excess and is excluded from effective coverage.",
  });

  if (
    constraints
      .require_all_approved_capacity_scheduled
  ) {
    const unscheduledTotal =
      execution.unscheduled_allocation
        .build +
      execution.unscheduled_allocation
        .move +
      execution.unscheduled_allocation
        .buy;

    hardConstraints.push({
      constraint_code:
        "all_capacity_scheduled",
      label:
        "All approved capacity scheduled",
      passed:
        unscheduledTotal <= 0.0001,
      actual_value:
        round1(unscheduledTotal),
      limit_value: 0,
      detail:
        "User requires every approved Build, Move, and Buy unit to have an effective month.",
    });
  }

  const deadlineMonth =
    constraints.deadline_month;
  const requiredCoverage =
    constraints
      .required_coverage_pct_by_deadline;

  if (
    (deadlineMonth === null) !==
    (requiredCoverage === null)
  ) {
    throw new Error(
      "Constraint deadline_month and required_coverage_pct_by_deadline must either both be set or both be null."
    );
  }

  let deadline:
    WorkforceResponseConstraintResponse["deadline"] =
    {
      deadline_month: null,
      required_coverage_pct: null,
      actual_coverage_pct: null,
      passed: null,
    };

  if (
    deadlineMonth !== null &&
    requiredCoverage !== null
  ) {
    const deadlineIndex =
      monthIndex(deadlineMonth);
    const startIndex =
      monthIndex(
        execution.planning_start_month
      );

    if (deadlineIndex < startIndex) {
      throw new Error(
        "Constraint deadline_month must be on or after the first executable month."
      );
    }

    if (
      !Number.isFinite(
        requiredCoverage
      ) ||
      requiredCoverage < 0 ||
      requiredCoverage > 100
    ) {
      throw new Error(
        "required_coverage_pct_by_deadline must be between 0 and 100."
      );
    }

    const actualCoverage =
      round1(
        coverageAtMonth(
          execution,
          deadlineMonth
        )
      );
    const required =
      round1(requiredCoverage);
    const passed =
      actualCoverage + 0.0001 >=
      required;

    deadline = {
      deadline_month:
        deadlineMonth,
      required_coverage_pct:
        required,
      actual_coverage_pct:
        actualCoverage,
      passed,
    };

    hardConstraints.push({
      constraint_code:
        "deadline_coverage",
      label:
        "Coverage by deadline",
      passed,
      actual_value:
        actualCoverage,
      limit_value:
        required,
      detail:
        "Actual deterministic timeline coverage is compared with the user-required minimum by the specified deadline month.",
    });
  }

  const rolePlans =
    request.role_plans ?? [];

  const evidenceChecks =
    await Promise.all(
      rolePlans.map(async (plan) => {
        const [
          readiness,
          buyEvidence,
        ] = await Promise.all([
          getInternalTalentReadiness(
            plan.job_profile
          ),
          getRoleBuyFeasibility(
            plan.job_profile,
            plan.allocation.buy
          ),
        ]);

        return {
          job_profile_code:
            readiness.job_profile_code,
          job_profile_name:
            readiness.job_profile_name,
          build_target:
            round1(
              plan.allocation.build
            ),
          fully_pathway_covered_near_ready:
            readiness
              .development_pathway_coverage
              .fully_pathway_covered_candidates,
          build_exceeds_current_path_covered:
            plan.allocation.build >
            readiness
              .development_pathway_coverage
              .fully_pathway_covered_candidates,
          move_target:
            round1(
              plan.allocation.move
            ),
          role_ready_internal_candidates:
            readiness.candidate_pool
              .role_ready,
          move_exceeds_role_ready:
            plan.allocation.move >
            readiness.candidate_pool
              .role_ready,
          buy_target:
            round1(
              plan.allocation.buy
            ),
          recent_12m_external_fills:
            buyEvidence
              .historical_external
              .recent_12m_filled_requisitions,
          buy_pct_of_recent_12m_external_fills:
            buyEvidence.buy_scale
              .pct_of_recent_12m_external_fills,
        };
      })
    );

  const warnings = [
    ...execution.warnings,
  ];

  for (const evidence of evidenceChecks) {
    if (
      evidence
        .build_exceeds_current_path_covered
    ) {
      warnings.push(
        evidence.job_profile_name +
          ": Build target exceeds the current fully path-covered near-ready pool. This is an evidence warning, not an automatic hard cap."
      );
    }

    if (
      evidence.move_exceeds_role_ready
    ) {
      warnings.push(
        evidence.job_profile_name +
          ": Move target exceeds the current whole-role-ready interested internal pool. This is an evidence warning, not an automatic hard cap."
      );
    }
  }

  const breaches =
    hardConstraints.filter(
      (row) => !row.passed
    ).length;

  return {
    as_of: execution.as_of,
    overall_feasible:
      breaches === 0,
    hard_constraint_count:
      hardConstraints.length,
    hard_constraint_breaches:
      breaches,
    hard_constraints:
      hardConstraints,
    deadline,
    evidence_checks:
      evidenceChecks,
    execution,
    warnings,
    methodology: [
      "Overall feasibility is determined only by explicit hard constraints plus the automatic integrity check that scheduled capacity cannot exceed approved BU/path targets.",
      "Build and Move readiness are evidence checks, not hard caps, unless the user separately encodes numeric caps.",
      "Buy historical volume is descriptive context only and never becomes a hard hiring-cap constraint automatically.",
      "Total caps are evaluated against the approved response target. Monthly path caps and the combined monthly execution cap are evaluated against the highest single-month effective capacity in the deterministic execution timeline.",
      "Deadline feasibility uses actual cumulative role-capped coverage in or before the specified month.",
      "When require_all_approved_capacity_scheduled is true, any approved Build, Move, or Buy capacity without an effective month is a hard-constraint breach.",
      "FY2027 workforce budget data exists, but it is not used as a hard constraint here because this execution horizon can begin in 2026 and path-specific response costs are not modeled defensibly enough for a single budget test.",
      "This constraint layer evaluates a user-directed plan. It does not optimize allocations or choose a preferred workforce strategy.",
    ],
  };
}
