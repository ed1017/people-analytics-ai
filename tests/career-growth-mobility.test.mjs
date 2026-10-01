import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildCareerGrowthMobilityAggregate,
  validateCareerGrowthRequest,
} from "../lib/career-growth-mobility.ts";

const levels = [
  {
    job_level_id: "l1",
    level_code: "IC1",
    level_rank: 1,
  },
  {
    job_level_id: "l2",
    level_code: "IC2",
    level_rank: 2,
  },
  {
    job_level_id: "l3",
    level_code: "IC3",
    level_rank: 3,
  },
];

const employees = [
  {
    employee_id: "e1",
    employment_status: "active",
    source_system: "synthetic",
  },
  {
    employee_id: "e2",
    employment_status: "active",
    source_system: "synthetic",
  },
  {
    employee_id: "e3",
    employment_status: "active",
    source_system: "synthetic",
  },
  {
    employee_id: "e4",
    employment_status: "terminated",
    source_system: "synthetic",
  },
];

const movements = [
  {
    movement_id: "m1",
    employee_id: "e1",
    movement_date: "2026-07-05",
    movement_type: "promotion",
    from_position_id: null,
    to_position_id: "p1",
    from_job_level_id: "l1",
    to_job_level_id: "l2",
  },
  {
    movement_id: "m2",
    employee_id: "e2",
    movement_date: "2026-07-10",
    movement_type: "promotion",
    from_position_id: null,
    to_position_id: "p2",
    from_job_level_id: "l2",
    to_job_level_id: "l3",
  },
  {
    movement_id: "m3",
    employee_id: "e3",
    movement_date: "2026-08-03",
    movement_type: "lateral_move",
    from_position_id: null,
    to_position_id: "p3",
    from_job_level_id: "l2",
    to_job_level_id: "l2",
  },
  {
    movement_id: "m4",
    employee_id: "e4",
    movement_date: "2026-08-17",
    movement_type: "transfer",
    from_position_id: null,
    to_position_id: "p4",
    from_job_level_id: "l3",
    to_job_level_id: "l3",
  },
];

test("aggregate uses recorded events as the percentage denominator", () => {
  const result =
    buildCareerGrowthMobilityAggregate(
      movements,
      employees,
      levels
    );

  assert.equal(
    result.source.total_recorded_events,
    4
  );
  assert.equal(
    result.source.distinct_recorded_employees,
    4
  );
  assert.deepEqual(
    result.composition.map((row) => [
      row.movement_type,
      row.events,
      row.share_pct,
    ]),
    [
      ["promotion", 2, 50],
      ["lateral_move", 1, 25],
      ["transfer", 1, 25],
    ]
  );
  assert.equal(
    result.composition.reduce(
      (sum, row) =>
        sum + row.share_pct,
      0
    ),
    100
  );
});

test("survivor and position limitations are explicit aggregate facts", () => {
  const result =
    buildCareerGrowthMobilityAggregate(
      movements,
      employees,
      levels
    );

  assert.equal(
    result.source
      .currently_active_linked_employees,
    3
  );
  assert.equal(
    result.source
      .currently_nonactive_linked_employees,
    1
  );
  assert.equal(
    result.source
      .origin_position_recorded_events,
    0
  );
  assert.equal(
    result.source
      .origin_position_missing_events,
    4
  );
  assert.equal(
    result.source
      .destination_position_recorded_events,
    4
  );
});

test("monthly points keep movement types separate and mark a partial latest month", () => {
  const result =
    buildCareerGrowthMobilityAggregate(
      movements,
      employees,
      levels
    );

  assert.deepEqual(
    result.monthly,
    [
      {
        month: "2026-07-01",
        events: 2,
        promotions: 2,
        lateral_moves: 0,
        transfers: 0,
        is_partial: false,
      },
      {
        month: "2026-08-01",
        events: 2,
        promotions: 0,
        lateral_moves: 1,
        transfers: 1,
        is_partial: true,
      },
    ]
  );
});

test("level transitions preserve promotion, lateral move, and transfer classifications", () => {
  const result =
    buildCareerGrowthMobilityAggregate(
      movements,
      employees,
      levels
    );

  assert.deepEqual(
    result.level_transitions.map(
      (row) => [
        row.movement_type,
        row.from_level,
        row.to_level,
        row.events,
      ]
    ),
    [
      ["promotion", "IC1", "IC2", 1],
      ["promotion", "IC2", "IC3", 1],
      [
        "lateral_move",
        "IC2",
        "IC2",
        1,
      ],
      ["transfer", "IC3", "IC3", 1],
    ]
  );
});

test("empty movement source returns a valid zero aggregate", () => {
  const result =
    buildCareerGrowthMobilityAggregate(
      [],
      employees,
      levels
    );

  assert.equal(
    result.source.total_recorded_events,
    0
  );
  assert.equal(
    result.source.first_recorded_date,
    null
  );
  assert.equal(
    result.source.last_recorded_date,
    null
  );
  assert.equal(
    result.monthly.length,
    0
  );
  assert.equal(
    result.level_transitions.length,
    0
  );
});

test("enterprise-only request contract rejects filters and non-GET methods", () => {
  assert.deepEqual(
    validateCareerGrowthRequest(
      "GET",
      new URLSearchParams()
    ),
    { ok: true }
  );

  const filtered =
    validateCareerGrowthRequest(
      "GET",
      new URLSearchParams(
        "org=BU-DATAAI"
      )
    );
  assert.equal(filtered.ok, false);
  assert.equal(filtered.status, 400);

  const post =
    validateCareerGrowthRequest(
      "POST",
      new URLSearchParams()
    );
  assert.equal(post.ok, false);
  assert.equal(post.status, 405);
});

test("aggregate output exposes no raw movement or employee identifiers", () => {
  const result =
    buildCareerGrowthMobilityAggregate(
      movements,
      employees,
      levels
    );
  const serialized =
    JSON.stringify(result);

  assert.equal(
    serialized.includes("movement_id"),
    false
  );
  assert.equal(
    serialized.includes("employee_id"),
    false
  );
});

test("Career Growth AI is page-grounded and cannot fall back to generic tools", () => {
  const source = fs.readFileSync(
    new URL(
      "../app/api/chat/route.ts",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    source,
    /body\?\.page === "career-growth-mobility"/
  );
  assert.match(
    source,
    /page === "career-growth-mobility"[\s\S]*?\? \("none" as const\)/
  );
  assert.match(
    source,
    /NEVER describe them as promotion rates, mobility rates, transfer rates/
  );
  assert.match(
    source,
    /The governed recorded movement-event source is unavailable/
  );
  assert.match(
    source,
    /Do not substitute Career Interests preferences for actual recorded movement/
  );
});
