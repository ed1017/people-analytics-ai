import {
  runBusinessUnitResponseAllocation,
  type BusinessUnitResponseAllocationRequest,
} from "./business-unit-response-allocation";
import {
  runWorkforceResponseConstraintCheck,
  type WorkforceResponseHardConstraints,
} from "./workforce-response-constraints";
import type {
  ConstraintAwareWorkforceScheduleResponse,
  WorkforceResponsePlanAllocation,
} from "./types";

type ResponseType = "build" | "move" | "buy";

export type ConstraintAwareWorkforceScheduleRequest =
  BusinessUnitResponseAllocationRequest & {
    constraints: WorkforceResponseHardConstraints;
  };

const responseTypes: ResponseType[] = [
  "build",
  "move",
  "buy",
];

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function toUnits(value: number) {
  return Math.max(
    0,
    Math.round(value * 10)
  );
}

function fromUnits(value: number) {
  return round1(value / 10);
}

function monthIndex(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(
    value
  );
  if (!match) {
    throw new Error(
      "Scheduler month values must use YYYY-MM format."
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
      "Scheduler month values must use a valid YYYY-MM value."
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
  return monthString(
    monthIndex(asOf.slice(0, 7)) + 1
  );
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

function allocationTotal(
  allocation: WorkforceResponsePlanAllocation
) {
  return round1(
    allocation.build +
      allocation.move +
      allocation.buy
  );
}

function capUnits(
  value: number | null
) {
  return value === null
    ? Number.POSITIVE_INFINITY
    : toUnits(value);
}

function allocateIntegerUnits(
  requested: Array<{
    key: string;
    available: number;
  }>,
  totalUnits: number
) {
  const totalAvailable = requested.reduce(
    (sum, row) => sum + row.available,
    0
  );

  if (
    totalAvailable <= 0 ||
    totalUnits <= 0
  ) {
    return new Map<string, number>();
  }

  if (totalUnits >= totalAvailable) {
    return new Map(
      requested.map((row) => [
        row.key,
        row.available,
      ])
    );
  }

  const raw = requested.map((row) => {
    const exact =
      (row.available * totalUnits) /
      totalAvailable;
    const floor = Math.floor(exact);
    return {
      ...row,
      exact,
      floor,
      remainder: exact - floor,
    };
  });

  let assigned = raw.reduce(
    (sum, row) => sum + row.floor,
    0
  );
  const result = new Map(
    raw.map((row) => [
      row.key,
      row.floor,
    ])
  );

  for (
    const row of [...raw].sort(
      (a, b) =>
        b.remainder - a.remainder ||
        a.key.localeCompare(b.key)
    )
  ) {
    if (assigned >= totalUnits) break;
    const current = result.get(row.key) ?? 0;
    if (current >= row.available) continue;

    result.set(row.key, current + 1);
    assigned += 1;
  }

  return result;
}

function pathMonthlyCap(
  constraints: WorkforceResponseHardConstraints,
  path: ResponseType
) {
  if (path === "build") {
    return capUnits(
      constraints.max_monthly_build
    );
  }
  if (path === "move") {
    return capUnits(
      constraints.max_monthly_move
    );
  }
  return capUnits(
    constraints.max_monthly_buy
  );
}

function pathTarget(
  allocation: WorkforceResponsePlanAllocation,
  path: ResponseType
) {
  return allocation[path];
}

export async function runConstraintAwareWorkforceScheduler(
  request: ConstraintAwareWorkforceScheduleRequest
): Promise<ConstraintAwareWorkforceScheduleResponse> {
  const base =
    await runBusinessUnitResponseAllocation(
      request
    );

  const startMonth =
    firstFutureMonth(base.as_of);
  const startIndex =
    monthIndex(startMonth);
  const horizonEndIndex =
    startIndex + 35;
  const constraints = request.constraints;

  const rows = base.business_units.flatMap(
    (row) =>
      responseTypes
        .filter(
          (path) =>
            pathTarget(
              row.allocation,
              path
            ) > 0
        )
        .map((path) => ({
          key:
            row.org_code +
            "::" +
            row.job_profile_code +
            "::" +
            path,

          org_code: row.org_code,
          org_name: row.org_name,
          job_profile_code:
            row.job_profile_code,
          job_profile_name:
            row.job_profile_name,
          response_type: path,
          target_units: toUnits(
            pathTarget(
              row.allocation,
              path
            )
          ),
        }))
  );

  const remaining = new Map(
    rows.map((row) => [
      row.key,
      row.target_units,
    ])
  );

  const generated:
    ConstraintAwareWorkforceScheduleResponse["generated_schedule"] =
    [];

  for (
    let month = startIndex;
    month <= horizonEndIndex;
    month += 1
  ) {
    const pathAvailability =
      responseTypes.map((path) => {
        const remainingUnits =
          rows
            .filter(
              (row) =>
                row.response_type === path
            )
            .reduce(
              (sum, row) =>
                sum +
                (remaining.get(row.key) ?? 0),
              0
            );

        return {
          key: path,
          available: Math.min(
            remainingUnits,
            pathMonthlyCap(
              constraints,
              path
            )
          ),
        };
      });

    const totalPathAvailability =
      pathAvailability.reduce(
        (sum, row) =>
          sum + row.available,
        0
      );
    if (totalPathAvailability <= 0) {
      continue;
    }

    const monthlyTotalCap =
      capUnits(
        constraints.max_monthly_total
      );
    const monthlyBudget =
      Math.min(
        totalPathAvailability,
        monthlyTotalCap
      );

    if (monthlyBudget <= 0) {
      continue;
    }

    const pathBudgets =
      allocateIntegerUnits(
        pathAvailability,
        monthlyBudget
      );

    for (const path of responseTypes) {
      const pathBudget =
        pathBudgets.get(path) ?? 0;
      if (pathBudget <= 0) continue;

      const pathRows = rows
        .filter(
          (row) =>
            row.response_type === path &&
            (remaining.get(row.key) ?? 0) > 0
        )
        .map((row) => ({
          key: row.key,
          available:
            remaining.get(row.key) ?? 0,
        }));

      const rowBudgets =
        allocateIntegerUnits(
          pathRows,
          pathBudget
        );

      for (const row of rows) {
        if (row.response_type !== path) {
          continue;
        }

        const assigned =
          rowBudgets.get(row.key) ?? 0;
        if (assigned <= 0) continue;

        remaining.set(
          row.key,
          Math.max(
            0,
            (remaining.get(row.key) ?? 0) -
              assigned
          )
        );

        generated.push({
          org_code: row.org_code,
          org_name: row.org_name,
          job_profile_code:
            row.job_profile_code,
          job_profile_name:
            row.job_profile_name,
          response_type: path,
          amount: fromUnits(assigned),
          effective_month:
            monthString(month),
        });
      }
    }

    const remainingTotal =
      Array.from(
        remaining.values()
      ).reduce(
        (sum, value) => sum + value,
        0
      );

    if (remainingTotal <= 0) {
      break;
    }
  }

  const unscheduled =
    emptyAllocation();
  for (const row of rows) {
    unscheduled[
      row.response_type
    ] = round1(
      unscheduled[row.response_type] +
        fromUnits(
          remaining.get(row.key) ?? 0
        )
    );
  }

  const targetAllocation = {
    build: round1(base.allocation.build),
    move: round1(base.allocation.move),
    buy: round1(base.allocation.buy),
    borrow: 0,
    automate: 0,
  };

  const scheduledAllocation = {
    build: round1(
      Math.max(
        0,
        targetAllocation.build -
          unscheduled.build
      )
    ),
    move: round1(
      Math.max(
        0,
        targetAllocation.move -
          unscheduled.move
      )
    ),

    buy: round1(
      Math.max(
        0,
        targetAllocation.buy -
          unscheduled.buy
      )
    ),
    borrow: 0,
    automate: 0,
  };

  const fullyScheduled =
    allocationTotal(unscheduled) <= 0.0001;
  const blockers: string[] = [];

  if (!fullyScheduled) {
    blockers.push(
      "The approved response cannot be fully placed within the 36-month scheduling horizon under the supplied monthly caps. " +
        "Unscheduled Build / Move / Buy = " +
        unscheduled.build +
        " / " +
        unscheduled.move +
        " / " +
        unscheduled.buy +
        "."
    );
  }

  let constraintResult:
    ConstraintAwareWorkforceScheduleResponse["constraint_result"] =
    null;

  if (generated.length > 0) {
    constraintResult =
      await runWorkforceResponseConstraintCheck({
        ...request,
        schedule: generated.map((row) => ({
          business_unit: row.org_code,
          job_profile:
            row.job_profile_code,
          response_type:
            row.response_type,
          amount: row.amount,
          effective_month:
            row.effective_month,
        })),
      });

    for (
      const row of
        constraintResult.hard_constraints
    ) {
      if (row.passed) continue;
      blockers.push(
        "Hard constraint breach: " +
          row.label +
          " (actual " +
          String(row.actual_value) +
          ", limit/minimum " +
          String(row.limit_value) +
          ")."
      );
    }
  } else if (
    allocationTotal(targetAllocation) > 0
  ) {
    blockers.push(
      "No approved Build, Move, or Buy capacity can be scheduled under the supplied monthly caps."
    );
  }

  const lastGeneratedMonth =
    generated.length > 0
      ? generated[
          generated.length - 1
        ].effective_month
      : startMonth;

  return {
    as_of: base.as_of,
    scheduling_start_month:
      startMonth,
    scheduling_end_month:
      fullyScheduled
        ? lastGeneratedMonth
        : monthString(horizonEndIndex),
    target_allocation:
      targetAllocation,
    generated_schedule:
      generated,
    scheduled_allocation:
      scheduledAllocation,
    unscheduled_allocation:
      unscheduled,
    fully_scheduled:
      fullyScheduled,
    hard_constraint_feasible:
      constraintResult
        ? constraintResult.overall_feasible
        : allocationTotal(
            targetAllocation
          ) > 0
          ? false
          : null,
    constraint_result:
      constraintResult,
    blockers,

    methodology: [
      "The scheduler keeps the approved BU/job-profile Build, Move, and Buy targets fixed. It does not change the workforce response mix.",
      "Scheduling starts in the month after the workforce snapshot and searches at most 36 months.",
      "User-supplied monthly Build, Move, Buy, and combined execution caps determine how much approved capacity can become effective each month.",
      "Within a month, available capacity is distributed proportionally across response paths and then proportionally across approved BU/job-profile destinations. This avoids inventing a hidden path or BU priority.",
      "Amounts are scheduled in 0.1-role units so fractional modeled BU demand reconciles exactly.",
      "Total Build, Move, and Buy caps do not change the approved mix. If an approved total exceeds a user-supplied total cap, the generated schedule is retained and the independent constraint checker marks the plan infeasible.",
      "Deadline coverage is verified by the existing deterministic constraint engine after schedule generation; the scheduler does not weaken or reinterpret deadline requirements.",
      "Build and Move readiness and historical Buy volume remain evidence signals. They are not automatic scheduling caps unless the user explicitly supplies matching numeric constraints.",
      "If monthly caps prevent all approved capacity from fitting within 36 months, the remaining approved capacity is reported as unscheduled rather than dropped.",
      "This is an earliest-feasible deterministic scheduler, not a strategy optimizer. It does not choose a preferred Build/Move/Buy mix, infer costs, or change workforce records.",
    ],
  };
}
