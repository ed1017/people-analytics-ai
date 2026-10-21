export type MovementType =
  | "promotion"
  | "lateral_move"
  | "transfer";

export type MovementSourceRow = {
  movement_id: string;
  employee_id: string;
  movement_date: string;
  movement_type: string;
  from_position_id: string | null;
  to_position_id: string | null;
  from_job_level_id: string | null;
  to_job_level_id: string | null;
};

export type MovementEmployeeRow = {
  employee_id: string;
  employment_status: string;
  source_system: string | null;
};

export type MovementLevelRow = {
  job_level_id: string;
  level_code: string;
  level_rank: number;
};

export type CareerGrowthMobilityResponse = {
  source: {
    first_recorded_date: string | null;
    last_recorded_date: string | null;
    total_recorded_events: number;
    distinct_recorded_employees: number;
    currently_active_linked_employees: number;
    currently_nonactive_linked_employees: number;
    synthetic_linked_events: number;
    origin_position_recorded_events: number;
    origin_position_missing_events: number;
    destination_position_recorded_events: number;
    recorded_months: number;
    latest_month_partial: boolean;
  };
  composition: Array<{
    movement_type: MovementType;
    label: string;
    events: number;
    share_pct: number;
  }>;
  monthly: Array<{
    month: string;
    events: number;
    promotions: number;
    lateral_moves: number;
    transfers: number;
    is_partial: boolean;
  }>;
  level_transitions: Array<{
    movement_type: MovementType;
    from_level: string;
    to_level: string;
    from_rank: number;
    to_rank: number;
    events: number;
  }>;
  limitations: string[];
  methodology: string[];
};

const ALLOWED_TYPES: MovementType[] = [
  "promotion",
  "lateral_move",
  "transfer",
];

const labels: Record<MovementType, string> = {
  promotion: "Promotion",
  lateral_move: "Lateral move",
  transfer: "Transfer",
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function monthKey(date: string) {
  return date.slice(0, 7) + "-01";
}

function isPartialLatestMonth(date: string | null) {
  if (!date) return false;
  const [year, month, day] = date
    .split("-")
    .map(Number);
  const lastDay = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();
  return day < lastDay;
}

export function buildCareerGrowthMobilityAggregate(
  movementRows: MovementSourceRow[],
  employeeRows: MovementEmployeeRow[],
  levelRows: MovementLevelRow[]
): CareerGrowthMobilityResponse {
  const employeeMap = new Map(
    employeeRows.map((row) => [
      row.employee_id,
      row,
    ])
  );
  const levelMap = new Map(
    levelRows.map((row) => [
      row.job_level_id,
      row,
    ])
  );

  const valid = movementRows.filter(
    (row): row is MovementSourceRow & {
      movement_type: MovementType;
    } =>
      ALLOWED_TYPES.includes(
        row.movement_type as MovementType
      )
  );

  const dates = valid
    .map((row) => row.movement_date)
    .sort();
  const firstDate = dates[0] ?? null;
  const lastDate =
    dates[dates.length - 1] ?? null;
  const partialLatest =
    isPartialLatestMonth(lastDate);

  const distinctEmployees = new Set(
    valid.map((row) => row.employee_id)
  );
  const activeEmployees = new Set<string>();
  const nonactiveEmployees =
    new Set<string>();
  let syntheticLinkedEvents = 0;

  for (const row of valid) {
    const employee = employeeMap.get(
      row.employee_id
    );
    if (
      employee?.employment_status ===
      "active"
    ) {
      activeEmployees.add(row.employee_id);
    } else if (employee) {
      nonactiveEmployees.add(
        row.employee_id
      );
    }
    if (
      employee?.source_system ===
      "synthetic"
    ) {
      syntheticLinkedEvents += 1;
    }
  }

  const counts = new Map<
    MovementType,
    number
  >(
    ALLOWED_TYPES.map((type) => [
      type,
      0,
    ])
  );
  for (const row of valid) {
    counts.set(
      row.movement_type,
      (counts.get(row.movement_type) ??
        0) + 1
    );
  }

  const total = valid.length;
  const composition =
    ALLOWED_TYPES.map((type) => ({
      movement_type: type,
      label: labels[type],
      events: counts.get(type) ?? 0,
      share_pct:
        total === 0
          ? 0
          : round1(
              ((counts.get(type) ?? 0) *
                100) /
                total
            ),
    }));

  const monthlyMap = new Map<
    string,
    {
      month: string;
      events: number;
      promotions: number;
      lateral_moves: number;
      transfers: number;
      is_partial: boolean;
    }
  >();

  for (const row of valid) {
    const month = monthKey(
      row.movement_date
    );
    const current =
      monthlyMap.get(month) ?? {
        month,
        events: 0,
        promotions: 0,
        lateral_moves: 0,
        transfers: 0,
        is_partial:
          partialLatest &&
          lastDate?.startsWith(
            month.slice(0, 7)
          ) === true,
      };
    current.events += 1;
    if (
      row.movement_type === "promotion"
    ) {
      current.promotions += 1;
    } else if (
      row.movement_type ===
      "lateral_move"
    ) {
      current.lateral_moves += 1;
    } else {
      current.transfers += 1;
    }
    monthlyMap.set(month, current);
  }

  const transitionMap = new Map<
    string,
    {
      movement_type: MovementType;
      from_level: string;
      to_level: string;
      from_rank: number;
      to_rank: number;
      events: number;
    }
  >();

  for (const row of valid) {
    const from = row.from_job_level_id
      ? levelMap.get(row.from_job_level_id)
      : null;
    const to = row.to_job_level_id
      ? levelMap.get(row.to_job_level_id)
      : null;
    if (!from || !to) continue;

    const key = [
      row.movement_type,
      from.level_code,
      to.level_code,
    ].join("|");

    const current =
      transitionMap.get(key) ?? {
        movement_type:
          row.movement_type,
        from_level: from.level_code,
        to_level: to.level_code,
        from_rank: from.level_rank,
        to_rank: to.level_rank,
        events: 0,
      };
    current.events += 1;
    transitionMap.set(key, current);
  }

  const levelTransitions = Array.from(
    transitionMap.values()
  ).sort((a, b) => {
    const typeOrder =
      ALLOWED_TYPES.indexOf(
        a.movement_type
      ) -
      ALLOWED_TYPES.indexOf(
        b.movement_type
      );
    if (typeOrder !== 0)
      return typeOrder;
    if (b.events !== a.events)
      return b.events - a.events;
    if (a.from_rank !== b.from_rank)
      return a.from_rank - b.from_rank;
    return a.to_rank - b.to_rank;
  });

  return {
    source: {
      first_recorded_date: firstDate,
      last_recorded_date: lastDate,
      total_recorded_events: total,
      distinct_recorded_employees:
        distinctEmployees.size,
      currently_active_linked_employees:
        activeEmployees.size,
      currently_nonactive_linked_employees:
        nonactiveEmployees.size,
      synthetic_linked_events:
        syntheticLinkedEvents,
      origin_position_recorded_events:
        valid.filter(
          (row) =>
            row.from_position_id !== null
        ).length,
      origin_position_missing_events:
        valid.filter(
          (row) =>
            row.from_position_id === null
        ).length,
      destination_position_recorded_events:
        valid.filter(
          (row) =>
            row.to_position_id !== null
        ).length,
      recorded_months: monthlyMap.size,
      latest_month_partial:
        partialLatest,
    },
    composition,
    monthly: Array.from(
      monthlyMap.values()
    ).sort((a, b) =>
      a.month.localeCompare(b.month)
    ),
    level_transitions:
      levelTransitions,
    limitations: [
      "The source contains recorded movement events, not a complete workforce mobility denominator. Event shares describe the recorded events only and are not promotion, transfer, or mobility rates for the workforce.",
      "All linked employees in the current source are currently active. Historical movement for employees who later left may be absent, so the source is subject to active-survivor bias.",
      "Origin position IDs are missing for the current movement rows. Do not infer role-to-role career paths from monthly snapshots or destination positions.",
      "The latest source month is partial through the latest recorded event date, and there are no later movement rows in this source.",
      "The current data has one recorded movement per employee. It does not support longitudinal multi-step career-path or time-to-next-move analysis.",
    ],
    methodology: [
      "Promotion, lateral move, and transfer are kept as distinct source classifications.",
      "Movement composition percentages use total recorded movement events as the denominator.",
      "Monthly points count recorded events by movement_date month.",
      "Level transitions use the movement row's recorded from_job_level_id and to_job_level_id joined to job_levels; they do not infer origin roles or positions.",
      "This aggregate contains no employee identifiers, rankings, suitability scores, readiness predictions, or employment recommendations.",
    ],
  };
}

export function validateCareerGrowthRequest(
  method: string,
  searchParams: URLSearchParams
) {
  if (method !== "GET") {
    return {
      ok: false as const,
      status: 405,
      error: "Method not allowed.",
    };
  }
  if (
    Array.from(searchParams.keys())
      .length > 0
  ) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Career Growth & Internal Mobility is company-only and does not accept dashboard filters.",
    };
  }
  return { ok: true as const };
}
