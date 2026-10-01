const SUCCESSION_PUBLIC_FIELDS = Object.freeze([
  "as_of_date",
  "small_cell_threshold",
  "critical_job_profiles",
  "filled_critical_positions",
  "positions_with_recorded_plan",
  "positions_without_recorded_plan",
  "recorded_plan_coverage_pct",
  "plan_coverage_suppressed",
  "positions_with_ready_now",
  "positions_without_ready_now",
  "ready_now_plan_pct",
  "ready_now_suppressed",
  "suppression_reason",
]);

const SUCCESSION_SUPPRESSION_REASONS = Object.freeze([
  "population_small_cell",
  "plan_partition_small_cell",
  "readiness_partition_small_cell",
]);

const SUCCESSION_SMALL_CELL_THRESHOLD = 10;

function failure(error, status = 503) {
  return { ok: false, error, status };
}

function success(value) {
  return { ok: true, value };
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isFiniteNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isNonNegativeInteger(value) {
  return (
    Number.isInteger(value) &&
    value >= 0
  );
}

function isNullableNonNegativeInteger(value) {
  return (
    value === null ||
    isNonNegativeInteger(value)
  );
}

function isNullablePercent(value) {
  return (
    value === null ||
    (isFiniteNumber(value) &&
      value >= 0 &&
      value <= 100)
  );
}

function isIsoDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(value + "T00:00:00Z");
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function round1(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function isSmallPositiveCell(value) {
  return (
    typeof value === "number" &&
    value >= 1 &&
    value <
      SUCCESSION_SMALL_CELL_THRESHOLD
  );
}

function hasExactFields(payload) {
  const keys = Object.keys(payload).sort();
  const expected = [...SUCCESSION_PUBLIC_FIELDS].sort();

  return (
    keys.length === expected.length &&
    keys.every(
      (key, index) => key === expected[index]
    )
  );
}

function validateSuccessionPublicSummary(payload) {
  if (!isPlainObject(payload)) {
    return failure(
      "Succession summary payload must be an object."
    );
  }

  if (!hasExactFields(payload)) {
    return failure(
      "Succession summary payload does not match the fixed public field contract."
    );
  }

  if (
    payload.as_of_date !== null &&
    !isIsoDate(payload.as_of_date)
  ) {
    return failure(
      "Succession summary has an invalid assessment date."
    );
  }

  if (
    payload.small_cell_threshold !==
    SUCCESSION_SMALL_CELL_THRESHOLD
  ) {
    return failure(
      "Succession summary has an invalid small-cell threshold."
    );
  }

  if (
    !isNonNegativeInteger(
      payload.critical_job_profiles
    )
  ) {
    return failure(
      "Succession summary has an invalid critical-job-profile count."
    );
  }

  for (const field of [
    "filled_critical_positions",
    "positions_with_recorded_plan",
    "positions_without_recorded_plan",
    "positions_with_ready_now",
    "positions_without_ready_now",
  ]) {
    if (
      !isNullableNonNegativeInteger(
        payload[field]
      )
    ) {
      return failure(
        "Succession summary has an invalid count."
      );
    }
  }

  for (const field of [
    "recorded_plan_coverage_pct",
    "ready_now_plan_pct",
  ]) {
    if (!isNullablePercent(payload[field])) {
      return failure(
        "Succession summary has an invalid percentage."
      );
    }
  }

  if (
    typeof payload.plan_coverage_suppressed !==
      "boolean" ||
    typeof payload.ready_now_suppressed !==
      "boolean"
  ) {
    return failure(
      "Succession summary has an invalid suppression flag."
    );
  }

  if (
    payload.suppression_reason !== null &&
    !SUCCESSION_SUPPRESSION_REASONS.includes(
      payload.suppression_reason
    )
  ) {
    return failure(
      "Succession summary has an invalid suppression category."
    );
  }

  const filled =
    payload.filled_critical_positions;
  const planned =
    payload.positions_with_recorded_plan;
  const unplanned =
    payload.positions_without_recorded_plan;
  const ready =
    payload.positions_with_ready_now;
  const noReady =
    payload.positions_without_ready_now;

  if (
    payload.critical_job_profiles === 0 &&
    filled !== 0
  ) {
    return failure(
      "Succession summary has an inconsistent zero critical-profile population."
    );
  }

  if (filled === null) {
    if (
      !payload.plan_coverage_suppressed ||
      !payload.ready_now_suppressed ||
      planned !== null ||
      unplanned !== null ||
      payload.recorded_plan_coverage_pct !==
        null ||
      ready !== null ||
      noReady !== null ||
      payload.ready_now_plan_pct !== null ||
      payload.suppression_reason !==
        "population_small_cell"
    ) {
      return failure(
        "Succession summary violates upstream population suppression."
      );
    }

    return success(
      Object.fromEntries(
        SUCCESSION_PUBLIC_FIELDS.map(
          (field) => [field, payload[field]]
        )
      )
    );
  }

  if (
    isSmallPositiveCell(filled)
  ) {
    return failure(
      "Succession summary exposes a small filled-position cell."
    );
  }

  if (payload.plan_coverage_suppressed) {
    if (
      planned !== null ||
      unplanned !== null ||
      payload.recorded_plan_coverage_pct !==
        null ||
      !payload.ready_now_suppressed ||
      ready !== null ||
      noReady !== null ||
      payload.ready_now_plan_pct !== null ||
      payload.suppression_reason !==
        "plan_partition_small_cell"
    ) {
      return failure(
        "Succession summary violates paired plan-coverage suppression."
      );
    }

    return success(
      Object.fromEntries(
        SUCCESSION_PUBLIC_FIELDS.map(
          (field) => [field, payload[field]]
        )
      )
    );
  }

  if (
    planned === null ||
    unplanned === null
  ) {
    return failure(
      "Succession summary is missing unsuppressed plan counts."
    );
  }

  if (
    isSmallPositiveCell(planned) ||
    isSmallPositiveCell(unplanned)
  ) {
    return failure(
      "Succession summary exposes a small plan-partition cell."
    );
  }

  if (planned + unplanned !== filled) {
    return failure(
      "Succession plan counts do not reconcile to filled critical positions."
    );
  }

  const expectedPlanPct =
    filled === 0
      ? null
      : round1((planned * 100) / filled);

  if (
    payload.recorded_plan_coverage_pct !==
    expectedPlanPct
  ) {
    return failure(
      "Succession plan coverage percentage does not reconcile."
    );
  }

  if (planned === 0) {
    if (payload.as_of_date !== null) {
      return failure(
        "Succession summary has an assessment date without recorded plans."
      );
    }
  } else if (payload.as_of_date === null) {
    return failure(
      "Succession summary is missing the recorded-plan assessment date."
    );
  }

  if (payload.ready_now_suppressed) {
    if (
      ready !== null ||
      noReady !== null ||
      payload.ready_now_plan_pct !== null ||
      payload.suppression_reason !==
        "readiness_partition_small_cell"
    ) {
      return failure(
        "Succession summary violates paired readiness suppression."
      );
    }

    return success(
      Object.fromEntries(
        SUCCESSION_PUBLIC_FIELDS.map(
          (field) => [field, payload[field]]
        )
      )
    );
  }

  if (
    ready === null ||
    noReady === null
  ) {
    return failure(
      "Succession summary is missing unsuppressed readiness counts."
    );
  }

  if (
    isSmallPositiveCell(ready) ||
    isSmallPositiveCell(noReady)
  ) {
    return failure(
      "Succession summary exposes a small readiness-partition cell."
    );
  }

  if (ready + noReady !== planned) {
    return failure(
      "Succession readiness counts do not reconcile to recorded plans."
    );
  }

  const expectedReadyPct =
    planned === 0
      ? null
      : round1((ready * 100) / planned);

  if (
    payload.ready_now_plan_pct !==
    expectedReadyPct
  ) {
    return failure(
      "Succession ready-now percentage does not reconcile."
    );
  }

  if (payload.suppression_reason !== null) {
    return failure(
      "Succession summary has a suppression reason without active suppression."
    );
  }

  return success(
    Object.fromEntries(
      SUCCESSION_PUBLIC_FIELDS.map(
        (field) => [field, payload[field]]
      )
    )
  );
}

function validateSuccessionRows(rows) {
  if (!Array.isArray(rows)) {
    return failure(
      "Succession aggregate result is not an array."
    );
  }

  if (rows.length !== 1) {
    return failure(
      "Succession aggregate is unavailable."
    );
  }

  return validateSuccessionPublicSummary(
    rows[0]
  );
}

function validateSuccessionApiRequest({
  method,
  url,
  hasBody,
}) {
  if (method !== "GET") {
    return failure("Method not allowed.", 405);
  }

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return failure("Invalid request URL.", 400);
  }

  if (parsed.searchParams.size > 0) {
    return failure(
      "Succession summary does not accept query parameters.",
      400
    );
  }

  if (hasBody) {
    return failure(
      "Succession summary does not accept a request body.",
      400
    );
  }

  return success(true);
}

module.exports = {
  SUCCESSION_PUBLIC_FIELDS,
  SUCCESSION_SMALL_CELL_THRESHOLD,
  SUCCESSION_SUPPRESSION_REASONS,
  validateSuccessionApiRequest,
  validateSuccessionPublicSummary,
  validateSuccessionRows,
};
