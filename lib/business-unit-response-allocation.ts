import {
  runRoleWorkforceResponsePlan,
} from "./role-workforce-response-plan";
import {
  runStructuralPositionScenario,
} from "./structural-position-scenario";
import type {
  BusinessUnitResponseAllocationResponse,
  StructuralPositionAction,
  WorkforceResponsePlanAllocation,
} from "./types";

export type BusinessUnitResponseAllocationRequest = {
  actions: StructuralPositionAction[];
  allocations: Array<{
    business_unit: string;
    job_profile: string;
    allocation: WorkforceResponsePlanAllocation;
  }>;
  role_plans?: Array<{
    job_profile: string;
    allocation: WorkforceResponsePlanAllocation;
  }> | null;
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

function allocationTotal(
  allocation: WorkforceResponsePlanAllocation
) {
  return round1(
    allocation.build +
      allocation.move +
      allocation.buy +
      allocation.borrow +
      allocation.automate
  );
}

function allocationDelta(
  actual: WorkforceResponsePlanAllocation,
  target: WorkforceResponsePlanAllocation
): WorkforceResponsePlanAllocation {
  return {
    build: round1(actual.build - target.build),
    move: round1(actual.move - target.move),
    buy: round1(actual.buy - target.buy),
    borrow: round1(actual.borrow - target.borrow),
    automate: round1(actual.automate - target.automate),
  };
}

function allocationReconciles(
  delta: WorkforceResponsePlanAllocation
) {
  return (
    Math.abs(delta.build) < 0.05 &&
    Math.abs(delta.move) < 0.05 &&
    Math.abs(delta.buy) < 0.05 &&
    Math.abs(delta.borrow) < 0.05 &&
    Math.abs(delta.automate) < 0.05
  );
}

export async function runBusinessUnitResponseAllocation(
  request: BusinessUnitResponseAllocationRequest
): Promise<BusinessUnitResponseAllocationResponse> {
  if (
    !Array.isArray(request.allocations) ||
    request.allocations.length === 0
  ) {
    throw new Error(
      "At least one business-unit response allocation is required."
    );
  }

  if (request.allocations.length > 40) {
    throw new Error(
      "A business-unit response allocation supports at most 40 BU-role rows."
    );
  }

  const scenario =
    await runStructuralPositionScenario(
      request.actions
    );

  const positiveEnterpriseRoles =
    new Map(
      scenario.job_profile_impact
        .filter(
          (row) =>
            row.authorized_position_delta > 0
        )
        .map((row) => [
          row.job_profile_code,
          row,
        ])
    );

  if (positiveEnterpriseRoles.size === 0) {
    throw new Error(
      "The structural scenario does not create positive company job-profile demand."
    );
  }

  const portfolioTargets =
    new Map<
      string,
      WorkforceResponsePlanAllocation
    >();

  for (const plan of request.role_plans ?? []) {
    const profileKey = normalize(
      plan.job_profile
    );
    const profile =
      scenario.job_profile_impact.find(
        (row) =>
          row.authorized_position_delta > 0 &&
          (normalize(row.job_profile_code) ===
            profileKey ||
            normalize(row.job_profile_name) ===
              profileKey)
      );

    if (!profile) {
      throw new Error(
        "Role-plan reconciliation target " +
          plan.job_profile +
          " does not have positive company demand."
      );
    }

    if (
      portfolioTargets.has(
        profile.job_profile_code
      )
    ) {
      throw new Error(
        "Each role-plan reconciliation target may appear only once."
      );
    }

    portfolioTargets.set(
      profile.job_profile_code,
      cleanAllocation(plan.allocation)
    );
  }

  const resolved = request.allocations.map(
    (item) => {
      const buKey = normalize(
        item.business_unit
      );
      const profileKey = normalize(
        item.job_profile
      );
      const segment =
        scenario.business_unit_job_profile_impact.find(
          (row) =>
            (normalize(row.org_code) === buKey ||
              normalize(row.org_name) === buKey) &&
            (normalize(row.job_profile_code) ===
              profileKey ||
              normalize(row.job_profile_name) ===
                profileKey)
        );

      if (!segment) {
        throw new Error(
          "BU response allocation " +
            item.business_unit +
            " / " +
            item.job_profile +
            " is not in the modeled structural inventory."
        );
      }

      const enterpriseRole =
        positiveEnterpriseRoles.get(
          segment.job_profile_code
        );

      if (!enterpriseRole) {
        throw new Error(
          "BU response allocation " +
            segment.org_name +
            " / " +
            segment.job_profile_name +
            " does not belong to a net-positive company role."
        );
      }

      if (
        segment.authorized_position_delta <= 0
      ) {
        throw new Error(
          "BU response allocation " +
            segment.org_name +
            " / " +
            segment.job_profile_name +
            " does not have positive destination demand."
        );
      }

      return {
        segment,
        enterpriseRole,
        allocation: cleanAllocation(
          item.allocation
        ),
      };
    }
  );

  const keys = resolved.map(
    (row) =>
      row.segment.org_code +
      "::" +
      row.segment.job_profile_code
  );
  if (new Set(keys).size !== keys.length) {
    throw new Error(
      "Each BU and job-profile combination may appear only once."
    );
  }

  const byRole = new Map<
    string,
    WorkforceResponsePlanAllocation
  >();

  for (const row of resolved) {
    const current =
      byRole.get(
        row.segment.job_profile_code
      ) ?? emptyAllocation();

    byRole.set(
      row.segment.job_profile_code,
      {
        build:
          current.build +
          row.allocation.build,
        move:
          current.move +
          row.allocation.move,
        buy:
          current.buy +
          row.allocation.buy,
        borrow:
          current.borrow +
          row.allocation.borrow,
        automate:
          current.automate +
          row.allocation.automate,
      }
    );
  }

  const rolePlans = await Promise.all(
    Array.from(byRole.entries()).map(
      ([jobProfileCode, allocation]) =>
        runRoleWorkforceResponsePlan(
          {
            actions: request.actions,
            job_profile: jobProfileCode,
            allocation,
          },
          scenario
        )
    )
  );

  const roleEvidence = new Map(
    rolePlans.map((role) => [
      role.job_profile_code,
      role,
    ])
  );

  const warnings: string[] = [];
  const roleRows:
    BusinessUnitResponseAllocationResponse["roles"] =
    [];

  for (
    const [jobProfileCode, allocation]
    of byRole.entries()
  ) {
    const enterpriseRole =
      positiveEnterpriseRoles.get(
        jobProfileCode
      );
    const evidence =
      roleEvidence.get(jobProfileCode);

    if (!enterpriseRole || !evidence) {
      continue;
    }

    const segments =
      scenario.business_unit_job_profile_impact.filter(
        (row) =>
          row.job_profile_code ===
          jobProfileCode
      );
    const grossPositive =
      segments.reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            row.authorized_position_delta
          ),
        0
      );
    const contraction =
      Math.abs(
        segments.reduce(
          (sum, row) =>
            sum +
            Math.min(
              0,
              row.authorized_position_delta
            ),
          0
        )
      );

    const raw = allocationTotal(allocation);
    const netDemand =
      enterpriseRole.authorized_position_delta;
    const effective = round1(
      Math.min(netDemand, raw)
    );
    const remaining = round1(
      Math.max(0, netDemand - raw)
    );
    const overplanned = round1(
      Math.max(0, raw - netDemand)
    );
    const portfolioTarget =
      portfolioTargets.get(jobProfileCode) ??
      null;
    const portfolioDelta =
      portfolioTarget === null
        ? null
        : allocationDelta(
            allocation,
            portfolioTarget
          );
    const portfolioReconciled =
      portfolioDelta === null
        ? null
        : allocationReconciles(
            portfolioDelta
          );

    if (
      portfolioTarget !== null &&
      portfolioReconciled === false
    ) {
      warnings.push(
        evidence.job_profile_name +
          ": BU allocations do not reconcile to the role portfolio target by response type."
      );
    }

    if (
      portfolioTargets.size > 0 &&
      portfolioTarget === null
    ) {
      warnings.push(
        evidence.job_profile_name +
          ": BU allocation exists for a role that is not in the supplied role portfolio targets."
      );
    }

    roleRows.push({
      job_profile_code:
        evidence.job_profile_code,
      job_profile_name:
        evidence.job_profile_name,
      enterprise_net_role_demand:
        round1(netDemand),
      gross_positive_bu_demand:
        round1(grossPositive),
      contraction_offset:
        round1(contraction),
      allocation: {
        build: round1(allocation.build),
        move: round1(allocation.move),
        buy: round1(allocation.buy),
        borrow: round1(allocation.borrow),
        automate:
          round1(allocation.automate),
      },
      portfolio_target_allocation:
        portfolioTarget,
      allocation_delta_vs_portfolio:
        portfolioDelta,
      portfolio_allocation_reconciled:
        portfolioReconciled,
      effective_coverage_if_executed:
        effective,
      remaining_net_gap_if_executed:
        remaining,
      overplanned_capacity:
        overplanned,
      role_evidence: evidence,
    });

    for (const warning of evidence.warnings) {
      warnings.push(
        evidence.job_profile_name +
          ": " +
          warning
      );
    }

    if (
      grossPositive > netDemand &&
      raw < grossPositive
    ) {
      warnings.push(
        evidence.job_profile_name +
          ": gross positive BU destination demand exceeds company net role demand because other BU contraction offsets exist; unallocated destination demand is not automatically an uncovered company gap."
      );
    }
  }

  for (
    const [jobProfileCode]
    of portfolioTargets.entries()
  ) {
    if (!byRole.has(jobProfileCode)) {
      const profile =
        positiveEnterpriseRoles.get(
          jobProfileCode
        );
      warnings.push(
        (profile?.job_profile_name ??
          jobProfileCode) +
          ": role portfolio target has no BU destination allocation."
      );
    }
  }

  const businessUnits =
    resolved.map((row) => {
      const raw =
        allocationTotal(row.allocation);
      const demand =
        row.segment.authorized_position_delta;
      const destinationOver =
        round1(
          Math.max(0, raw - demand)
        );

      if (destinationOver > 0) {
        warnings.push(
          row.segment.org_name +
            " / " +
            row.segment.job_profile_name +
            ": allocated response exceeds this BU's gross positive destination demand; the excess is destination contingency, not additional gap closure."
        );
      }

      return {
        org_code:
          row.segment.org_code,
        org_name:
          row.segment.org_name,
        job_profile_code:
          row.segment.job_profile_code,
        job_profile_name:
          row.segment.job_profile_name,
        gross_destination_demand:
          round1(demand),
        allocation: row.allocation,
        raw_allocated_response: raw,
        effective_destination_coverage:
          round1(
            Math.min(demand, raw)
          ),
        destination_gap_before_enterprise_offsets:
          round1(
            Math.max(0, demand - raw)
          ),
        destination_overallocation:
          destinationOver,
      };
    })
    .sort(
      (a, b) =>
        b.gross_destination_demand -
          a.gross_destination_demand ||
        a.org_name.localeCompare(
          b.org_name
        ) ||
        a.job_profile_name.localeCompare(
          b.job_profile_name
        )
    );

  const allocatedKeys = new Set(
    businessUnits.map(
      (row) =>
        row.org_code +
        "::" +
        row.job_profile_code
    )
  );

  const relevantSegments =
    scenario.business_unit_job_profile_impact.filter(
      (segment) =>
        positiveEnterpriseRoles.has(
          segment.job_profile_code
        )
    );

  const unallocatedDestinations =
    relevantSegments
      .filter(
        (segment) =>
          segment.authorized_position_delta > 0 &&
          !allocatedKeys.has(
            segment.org_code +
              "::" +
              segment.job_profile_code
          )
      )
      .map((segment) => ({
        org_code: segment.org_code,
        org_name: segment.org_name,
        job_profile_code:
          segment.job_profile_code,
        job_profile_name:
          segment.job_profile_name,
        gross_destination_demand:
          round1(
            segment.authorized_position_delta
          ),
      }))
      .sort(
        (a, b) =>
          b.gross_destination_demand -
            a.gross_destination_demand ||
          a.org_name.localeCompare(
            b.org_name
          )
      );

  const contractions =
    relevantSegments
      .filter(
        (segment) =>
          segment.authorized_position_delta < 0
      )
      .map((segment) => ({
        org_code: segment.org_code,
        org_name: segment.org_name,
        job_profile_code:
          segment.job_profile_code,
        job_profile_name:
          segment.job_profile_name,
        contraction_delta:
          round1(
            segment.authorized_position_delta
          ),
      }))
      .sort(
        (a, b) =>
          a.contraction_delta -
            b.contraction_delta ||
          a.org_name.localeCompare(
            b.org_name
          )
      );

  const scenarioNetRoleDemand =
    round1(
      Array.from(
        positiveEnterpriseRoles.values()
      ).reduce(
        (sum, role) =>
          sum +
          role.authorized_position_delta,
        0
      )
    );

  const grossDestinationDemand =
    round1(
      relevantSegments.reduce(
        (sum, segment) =>
          sum +
          Math.max(
            0,
            segment.authorized_position_delta
          ),
        0
      )
    );

  const contractionOffset =
    round1(
      Math.abs(
        relevantSegments.reduce(
          (sum, segment) =>
            sum +
            Math.min(
              0,
              segment.authorized_position_delta
            ),
          0
        )
      )
    );

  const totalAllocation =
    resolved.reduce(
      (total, row) => ({
        build:
          total.build +
          row.allocation.build,
        move:
          total.move +
          row.allocation.move,
        buy:
          total.buy +
          row.allocation.buy,
        borrow:
          total.borrow +
          row.allocation.borrow,
        automate:
          total.automate +
          row.allocation.automate,
      }),
      emptyAllocation()
    );

  const effectiveCoverage =
    round1(
      roleRows.reduce(
        (sum, role) =>
          sum +
          role.effective_coverage_if_executed,
        0
      )
    );
  const remainingNetGap =
    round1(
      Math.max(
        0,
        scenarioNetRoleDemand -
          effectiveCoverage
      )
    );
  const overplannedCapacity =
    round1(
      roleRows.reduce(
        (sum, role) =>
          sum +
          role.overplanned_capacity,
        0
      )
    );

  if (unallocatedDestinations.length > 0) {
    warnings.push(
      "Some positive BU destination demand has no explicit response allocation. Company contraction offsets and response capacity are not automatically assigned to those destinations."
    );
  }

  if (contractionOffset > 0) {
    warnings.push(
      "The scenario includes BU contraction offsets for net-positive roles. These offsets reduce company net response need, but the model does not assume they create transferable employees or automatically route capacity to growing BUs."
    );
  }

  return {
    as_of: scenario.as_of,
    scenario_net_role_demand:
      scenarioNetRoleDemand,
    gross_destination_demand:
      grossDestinationDemand,
    contraction_offset:
      contractionOffset,
    allocation: {
      build:
        round1(totalAllocation.build),
      move:
        round1(totalAllocation.move),
      buy:
        round1(totalAllocation.buy),
      borrow:
        round1(totalAllocation.borrow),
      automate:
        round1(
          totalAllocation.automate
        ),
    },
    effective_coverage_if_executed:
      effectiveCoverage,
    remaining_net_gap_if_executed:
      remainingNetGap,
    overplanned_capacity:
      overplannedCapacity,
    roles: roleRows.sort(
      (a, b) =>
        b.enterprise_net_role_demand -
          a.enterprise_net_role_demand ||
        a.job_profile_name.localeCompare(
          b.job_profile_name
        )
    ),
    business_units: businessUnits,
    unallocated_destinations:
      unallocatedDestinations,
    contractions,
    warnings,
    methodology: [
      "Business-unit response allocations are user-directed destination/ownership assignments for Build, Move, and Buy; the model does not optimize or invent BU allocations.",
      "Only BU-job-profile segments with positive modeled authorized-position demand can receive response allocations.",
      "BU allocations roll up to the company job profile, and the existing whole-role response engine evaluates aggregate Build, Move, and Buy evidence for that role.",
      "When role portfolio targets are supplied, BU allocations are reconciled back to those targets separately for Build, Move, Buy, Borrow, and Automate rather than by grand total alone.",
      "Gross destination demand is the sum of positive BU role deltas. Company net role demand equals gross positive BU demand less signed contraction offsets elsewhere for the same net-positive role.",
      "Company effective coverage is capped at each role's net company demand. BU destination coverage is tracked separately and does not automatically consume contraction offsets.",
      "A negative BU role delta is a contraction offset only. It does not prove that employees, skills, or positions are transferable to another BU.",
      "Move allocation identifies the destination BU for internal capacity; the source BU of internal movers is not modeled in this layer.",
      "Build allocation identifies the destination BU that owns the development need; learning pathway evidence remains role-level and does not guarantee proficiency gain.",
      "Buy allocation identifies the destination BU that owns external hiring demand; recruiting history remains descriptive and not a forecast.",
      "Borrow and Automate remain unavailable until governed role-level evidence exists.",
      "This model is read-only and does not move employees, enroll learners, create requisitions, or alter position records.",
    ],
  };
}
