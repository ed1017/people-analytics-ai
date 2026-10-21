import {
  runBusinessUnitResponseAllocation,
  type BusinessUnitResponseAllocationRequest,
} from "./business-unit-response-allocation";
import type {
  TimePhasedWorkforceExecutionResponse,
  WorkforceResponsePlanAllocation,
} from "./types";

type ResponseType =
  | "build"
  | "move"
  | "buy";

export type TimePhasedWorkforceExecutionRequest =
  BusinessUnitResponseAllocationRequest & {
    schedule: Array<{
      business_unit: string;
      job_profile: string;
      response_type: ResponseType;
      amount: number;
      effective_month: string;
    }>;
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

function addAllocation(
  target: WorkforceResponsePlanAllocation,
  source: WorkforceResponsePlanAllocation
) {
  target.build += source.build;
  target.move += source.move;
  target.buy += source.buy;
  target.borrow += source.borrow;
  target.automate += source.automate;
}

function monthIndex(value: string) {
  const match =
    /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(
      "effective_month must use YYYY-MM format."
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
      "effective_month must use a valid YYYY-MM value."
    );
  }

  return year * 12 + month - 1;
}

function monthString(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return (
    String(year).padStart(4, "0") +
    "-" +
    String(month).padStart(2, "0")
  );
}

function firstFutureMonth(asOf: string) {
  const current = asOf.slice(0, 7);
  return monthString(
    monthIndex(current) + 1
  );
}

function cleanAmount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return round1(Math.max(0, value));
}

function allocationFromPath(
  path: ResponseType,
  amount: number
): WorkforceResponsePlanAllocation {
  const allocation = emptyAllocation();
  allocation[path] = amount;
  return allocation;
}

function targetPathAmount(
  allocation: WorkforceResponsePlanAllocation,
  path: ResponseType
) {
  return cleanAmount(allocation[path]);
}

function allocationDifference(
  target: WorkforceResponsePlanAllocation,
  scheduled: WorkforceResponsePlanAllocation
) {
  return {
    build: round1(
      Math.max(0, target.build - scheduled.build)
    ),
    move: round1(
      Math.max(0, target.move - scheduled.move)
    ),
    buy: round1(
      Math.max(0, target.buy - scheduled.buy)
    ),
    borrow: round1(
      Math.max(0, target.borrow - scheduled.borrow)
    ),
    automate: round1(
      Math.max(0, target.automate - scheduled.automate)
    ),
  };
}

function targetKey(
  orgCode: string,
  jobProfileCode: string,
  path: ResponseType
) {
  return (
    orgCode +
    "::" +
    jobProfileCode +
    "::" +
    path
  );
}

function roleKey(jobProfileCode: string) {
  return jobProfileCode;
}

export async function runTimePhasedWorkforceExecution(
  request: TimePhasedWorkforceExecutionRequest
): Promise<TimePhasedWorkforceExecutionResponse> {
  if (
    !Array.isArray(request.schedule) ||
    request.schedule.length === 0
  ) {
    throw new Error(
      "At least one time-phased response schedule entry is required."
    );
  }

  if (request.schedule.length > 120) {
    throw new Error(
      "A time-phased response plan supports at most 120 schedule entries."
    );
  }

  const base =
    await runBusinessUnitResponseAllocation(
      request
    );

  const startMonth =
    firstFutureMonth(base.as_of);
  const startIndex =
    monthIndex(startMonth);

  const targetRows =
    base.business_units;
  const consumedByTarget =
    new Map<string, number>();
  const normalizedEntries:
    TimePhasedWorkforceExecutionResponse["schedule_entries"] =
    [];

  const sortedSchedule = [
    ...request.schedule,
  ].sort(
    (a, b) =>
      monthIndex(a.effective_month) -
        monthIndex(b.effective_month) ||
      a.business_unit.localeCompare(
        b.business_unit
      ) ||
      a.job_profile.localeCompare(
        b.job_profile
      ) ||
      a.response_type.localeCompare(
        b.response_type
      )
  );

  for (const entry of sortedSchedule) {
    const entryMonthIndex =
      monthIndex(entry.effective_month);

    if (entryMonthIndex < startIndex) {
      throw new Error(
        "Scheduled response months must be after the workforce snapshot month."
      );
    }

    if (
      entryMonthIndex >
      startIndex + 35
    ) {
      throw new Error(
        "Scheduled response months may be at most 36 months after the workforce snapshot."
      );
    }

    const buKey =
      normalize(entry.business_unit);
    const profileKey =
      normalize(entry.job_profile);
    const target = targetRows.find(
      (row) =>
        (normalize(row.org_code) === buKey ||
          normalize(row.org_name) === buKey) &&
        (normalize(
          row.job_profile_code
        ) === profileKey ||
          normalize(
            row.job_profile_name
          ) === profileKey)
    );

    if (!target) {
      throw new Error(
        "Scheduled response " +
          entry.business_unit +
          " / " +
          entry.job_profile +
          " is not in the approved BU response allocation."
      );
    }

    const amount =
      cleanAmount(entry.amount);

    if (amount <= 0) {
      throw new Error(
        "Scheduled response amounts must be greater than zero."
      );
    }

    const key = targetKey(
      target.org_code,
      target.job_profile_code,
      entry.response_type
    );
    const targetAmount =
      targetPathAmount(
        target.allocation,
        entry.response_type
      );
    const consumed =
      consumedByTarget.get(key) ?? 0;
    const remainingTarget =
      Math.max(
        0,
        targetAmount - consumed
      );
    const effectiveAmount =
      round1(
        Math.min(
          amount,
          remainingTarget
        )
      );
    const excessAmount =
      round1(
        Math.max(
          0,
          amount - effectiveAmount
        )
      );

    consumedByTarget.set(
      key,
      round1(
        consumed + effectiveAmount
      )
    );

    normalizedEntries.push({
      org_code: target.org_code,
      org_name: target.org_name,
      job_profile_code:
        target.job_profile_code,
      job_profile_name:
        target.job_profile_name,
      response_type:
        entry.response_type,
      amount,
      effective_month:
        entry.effective_month,
      effective_amount_within_target:
        effectiveAmount,
      excess_amount:
        excessAmount,
    });
  }

  const scheduledAllocation =
    emptyAllocation();
  const overscheduledAllocation =
    emptyAllocation();

  for (const entry of normalizedEntries) {
    addAllocation(
      scheduledAllocation,
      allocationFromPath(
        entry.response_type,
        entry.effective_amount_within_target
      )
    );
    addAllocation(
      overscheduledAllocation,
      allocationFromPath(
        entry.response_type,
        entry.excess_amount
      )
    );
  }

  const targetAllocation = {
    build: round1(
      base.allocation.build
    ),
    move: round1(
      base.allocation.move
    ),
    buy: round1(
      base.allocation.buy
    ),
    borrow: round1(
      base.allocation.borrow
    ),
    automate: round1(
      base.allocation.automate
    ),
  };
  const unscheduledAllocation =
    allocationDifference(
      targetAllocation,
      scheduledAllocation
    );

  const businessUnits =
    targetRows.map((target) => {
      const scheduled =
        emptyAllocation();
      const overscheduled =
        emptyAllocation();

      for (const entry of normalizedEntries) {
        if (
          entry.org_code !==
            target.org_code ||
          entry.job_profile_code !==
            target.job_profile_code
        ) {
          continue;
        }

        addAllocation(
          scheduled,
          allocationFromPath(
            entry.response_type,
            entry.effective_amount_within_target
          )
        );
        addAllocation(
          overscheduled,
          allocationFromPath(
            entry.response_type,
            entry.excess_amount
          )
        );
      }

      return {
        org_code: target.org_code,
        org_name: target.org_name,
        job_profile_code:
          target.job_profile_code,
        job_profile_name:
          target.job_profile_name,
        target_allocation:
          target.allocation,
        scheduled_allocation:
          scheduled,
        unscheduled_allocation:
          allocationDifference(
            target.allocation,
            scheduled
          ),
        overscheduled_allocation:
          overscheduled,
      };
    });

  const lastMonthIndex =
    Math.max(
      ...normalizedEntries.map((entry) =>
        monthIndex(
          entry.effective_month
        )
      )
    );
  const planningEndMonth =
    monthString(lastMonthIndex);

  const roleNetDemand = new Map(
    base.roles.map((role) => [
      role.job_profile_code,
      role.enterprise_net_role_demand,
    ])
  );
  const roleCumulative =
    new Map<string, number>();
  const cumulative =
    emptyAllocation();
  const timeline:
    TimePhasedWorkforceExecutionResponse["timeline"] =
    [];

  for (
    let index = startIndex;
    index <= lastMonthIndex;
    index += 1
  ) {
    const month =
      monthString(index);
    const monthly =
      emptyAllocation();

    for (const entry of normalizedEntries) {
      if (
        entry.effective_month !== month ||
        entry.effective_amount_within_target <=
          0
      ) {
        continue;
      }

      addAllocation(
        monthly,
        allocationFromPath(
          entry.response_type,
          entry.effective_amount_within_target
        )
      );

      roleCumulative.set(
        roleKey(
          entry.job_profile_code
        ),
        round1(
          (roleCumulative.get(
            roleKey(
              entry.job_profile_code
            )
          ) ?? 0) +
            entry.effective_amount_within_target
        )
      );
    }

    addAllocation(
      cumulative,
      monthly
    );

    const effectiveCoverage =
      round1(
        Array.from(
          roleNetDemand.entries()
        ).reduce(
          (sum, [jobProfileCode, demand]) =>
            sum +
            Math.min(
              demand,
              roleCumulative.get(
                jobProfileCode
              ) ?? 0
            ),
          0
        )
      );

    const remainingGap =
      round1(
        Math.max(
          0,
          base.scenario_net_role_demand -
            effectiveCoverage
        )
      );

    timeline.push({
      month,
      effective_build:
        round1(monthly.build),
      effective_move:
        round1(monthly.move),
      effective_buy:
        round1(monthly.buy),
      cumulative_build:
        round1(cumulative.build),
      cumulative_move:
        round1(cumulative.move),
      cumulative_buy:
        round1(cumulative.buy),
      cumulative_effective_coverage:
        effectiveCoverage,
      remaining_net_gap:
        remainingGap,
      coverage_pct:
        base.scenario_net_role_demand > 0
          ? round1(
              (effectiveCoverage /
                base.scenario_net_role_demand) *
                100
            )
          : 0,
    });
  }

  const warnings = [...base.warnings];

  const unscheduledTotal =
    unscheduledAllocation.build +
    unscheduledAllocation.move +
    unscheduledAllocation.buy;

  if (unscheduledTotal > 0) {
    warnings.push(
      "Part of the approved BU response allocation has no effective month and remains unscheduled."
    );
  }

  const overscheduledTotal =
    overscheduledAllocation.build +
    overscheduledAllocation.move +
    overscheduledAllocation.buy;

  if (overscheduledTotal > 0) {
    warnings.push(
      "Some scheduled capacity exceeds the approved BU/path target. Excess schedule amounts are reported but excluded from effective coverage."
    );
  }

  const finalPoint =
    timeline[timeline.length - 1];

  return {
    as_of: base.as_of,
    planning_start_month:
      startMonth,
    planning_end_month:
      planningEndMonth,
    target_allocation:
      targetAllocation,
    scheduled_allocation: {
      build: round1(
        scheduledAllocation.build
      ),
      move: round1(
        scheduledAllocation.move
      ),
      buy: round1(
        scheduledAllocation.buy
      ),
      borrow: 0,
      automate: 0,
    },
    unscheduled_allocation:
      unscheduledAllocation,
    overscheduled_allocation: {
      build: round1(
        overscheduledAllocation.build
      ),
      move: round1(
        overscheduledAllocation.move
      ),
      buy: round1(
        overscheduledAllocation.buy
      ),
      borrow: 0,
      automate: 0,
    },
    scenario_net_role_demand:
      base.scenario_net_role_demand,
    final_effective_coverage:
      finalPoint.cumulative_effective_coverage,
    final_remaining_net_gap:
      finalPoint.remaining_net_gap,
    final_coverage_pct:
      finalPoint.coverage_pct,
    timeline,
    business_units: businessUnits,
    schedule_entries:
      normalizedEntries,
    warnings,
    methodology: [
      "The execution timeline schedules only user-approved BU Build, Move, and Buy allocations. It does not infer timing from course duration, recruiting history, or other evidence.",
      "The first executable month is the month after the workforce snapshot. Schedule entries before that month are rejected.",
      "Each schedule row has an explicit effective month. Capacity counts toward coverage beginning in that month and remains effective in later months.",
      "Scheduled capacity is capped to the approved BU and response-type target. Any excess schedule amount is reported separately and does not create additional effective coverage.",
      "Unscheduled approved capacity remains visible and does not contribute to monthly coverage.",
      "Monthly company coverage is capped at each role's company net demand before roles are summed, preventing over-scheduled roles from closing gaps in other roles.",
      "Gross BU destination demand and contraction offsets remain separate from the company net gap. Timing does not imply that contraction automatically supplies transferable talent.",
      "Build timing is a user-supplied effective-capacity date, not a forecast of when learning will produce proficiency.",
      "Move timing is a user-supplied destination-effective date. The source BU of movers remains unmodeled.",
      "Buy timing is a user-supplied hire-effective date, not a forecast derived from historical time-to-fill.",
      "The model is read-only and does not enroll learners, move employees, open requisitions, hire candidates, or mutate workforce records.",
    ],
  };
}
