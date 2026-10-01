import test from "node:test";
import assert from "node:assert/strict";

import {
  SUCCESSION_PUBLIC_FIELDS,
  validateSuccessionApiRequest,
  validateSuccessionPublicSummary,
  validateSuccessionRows,
} from "../lib/succession-public-contract.mjs";

const normal = {
  as_of_date: "2026-09-30",
  small_cell_threshold: 10,
  critical_job_profiles: 12,
  filled_critical_positions: 1885,
  positions_with_recorded_plan: 240,
  positions_without_recorded_plan: 1645,
  recorded_plan_coverage_pct: 12.7,
  plan_coverage_suppressed: false,
  positions_with_ready_now: 31,
  positions_without_ready_now: 209,
  ready_now_plan_pct: 12.9,
  ready_now_suppressed: false,
  suppression_reason: null,
};

test("fixture: exact normal enterprise summary is accepted", () => {
  const result =
    validateSuccessionPublicSummary(normal);

  assert.equal(result.ok, true);
  assert.deepEqual(
    Object.keys(result.value),
    SUCCESSION_PUBLIC_FIELDS
  );
});

test("fixture: valid zero state is distinct from unavailable rows", () => {
  const zero = {
    ...normal,
    as_of_date: null,
    critical_job_profiles: 0,
    filled_critical_positions: 0,
    positions_with_recorded_plan: 0,
    positions_without_recorded_plan: 0,
    recorded_plan_coverage_pct: null,
    positions_with_ready_now: 0,
    positions_without_ready_now: 0,
    ready_now_plan_pct: null,
  };

  assert.equal(
    validateSuccessionRows([zero]).ok,
    true
  );
  assert.equal(
    validateSuccessionRows([]).ok,
    false
  );
  assert.equal(
    validateSuccessionRows([zero, zero]).ok,
    false
  );
});

test("fixture: population suppression hides all downstream counts", () => {
  const suppressed = {
    ...normal,
    filled_critical_positions: null,
    positions_with_recorded_plan: null,
    positions_without_recorded_plan: null,
    recorded_plan_coverage_pct: null,
    plan_coverage_suppressed: true,
    positions_with_ready_now: null,
    positions_without_ready_now: null,
    ready_now_plan_pct: null,
    ready_now_suppressed: true,
    suppression_reason:
      "population_small_cell",
  };

  assert.equal(
    validateSuccessionPublicSummary(
      suppressed
    ).ok,
    true
  );
});

test("fixture: plan partition suppression is paired and suppresses readiness upstream", () => {
  const suppressed = {
    ...normal,
    filled_critical_positions: 100,
    positions_with_recorded_plan: null,
    positions_without_recorded_plan: null,
    recorded_plan_coverage_pct: null,
    plan_coverage_suppressed: true,
    positions_with_ready_now: null,
    positions_without_ready_now: null,
    ready_now_plan_pct: null,
    ready_now_suppressed: true,
    suppression_reason:
      "plan_partition_small_cell",
  };

  assert.equal(
    validateSuccessionPublicSummary(
      suppressed
    ).ok,
    true
  );
});

test("fixture: readiness partition suppression is paired", () => {
  const suppressed = {
    ...normal,
    filled_critical_positions: 100,
    positions_with_recorded_plan: 50,
    positions_without_recorded_plan: 50,
    recorded_plan_coverage_pct: 50,
    plan_coverage_suppressed: false,
    positions_with_ready_now: null,
    positions_without_ready_now: null,
    ready_now_plan_pct: null,
    ready_now_suppressed: true,
    suppression_reason:
      "readiness_partition_small_cell",
  };

  assert.equal(
    validateSuccessionPublicSummary(
      suppressed
    ).ok,
    true
  );
});

test("fixture: directly exposed small cells are rejected", () => {
  const smallPlan = {
    ...normal,
    filled_critical_positions: 100,
    positions_with_recorded_plan: 5,
    positions_without_recorded_plan: 95,
    recorded_plan_coverage_pct: 5,
    positions_with_ready_now: 0,
    positions_without_ready_now: 5,
    ready_now_plan_pct: 0,
  };

  assert.equal(
    validateSuccessionPublicSummary(
      smallPlan
    ).ok,
    false
  );
});

test("fixture: invalid types, categories, nonfinite and negative values are rejected", () => {
  const cases = [
    {
      ...normal,
      critical_job_profiles: "12",
    },
    {
      ...normal,
      suppression_reason: "other",
    },
    {
      ...normal,
      ready_now_plan_pct: Infinity,
    },
    {
      ...normal,
      filled_critical_positions: -1,
    },
    {
      ...normal,
      recorded_plan_coverage_pct: NaN,
    },
  ];

  for (const payload of cases) {
    assert.equal(
      validateSuccessionPublicSummary(
        payload
      ).ok,
      false
    );
  }
});

test("fixture: inconsistent counts and percentages are rejected", () => {
  assert.equal(
    validateSuccessionPublicSummary({
      ...normal,
      positions_without_recorded_plan:
        1644,
    }).ok,
    false
  );

  assert.equal(
    validateSuccessionPublicSummary({
      ...normal,
      ready_now_plan_pct: 13,
    }).ok,
    false
  );
});

test("fixture: extra public fields are rejected and fingerprint is never allowed", () => {
  assert.equal(
    SUCCESSION_PUBLIC_FIELDS.includes(
      "fingerprint"
    ),
    false
  );

  assert.equal(
    validateSuccessionPublicSummary({
      ...normal,
      fingerprint: "private",
    }).ok,
    false
  );
});

test("fixture: query, body, filter and non-GET requests are rejected", () => {
  assert.equal(
    validateSuccessionApiRequest({
      method: "GET",
      url: "https://example.test/api/succession-coverage",
      hasBody: false,
    }).ok,
    true
  );

  for (const request of [
    {
      method: "GET",
      url: "https://example.test/api/succession-coverage?org=finance",
      hasBody: false,
    },
    {
      method: "GET",
      url: "https://example.test/api/succession-coverage?filter=all",
      hasBody: false,
    },
    {
      method: "GET",
      url: "https://example.test/api/succession-coverage",
      hasBody: true,
    },
    {
      method: "POST",
      url: "https://example.test/api/succession-coverage",
      hasBody: true,
    },
  ]) {
    assert.equal(
      validateSuccessionApiRequest(
        request
      ).ok,
      false
    );
  }
});
