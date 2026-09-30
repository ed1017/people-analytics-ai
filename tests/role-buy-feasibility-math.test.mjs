import test from "node:test";
import assert from "node:assert/strict";

import { calculateRoleBuyScale } from "../lib/role-buy-feasibility-math.ts";

test("uses full monthly precision before rounding the final scale multiple", () => {
  const result = calculateRoleBuyScale(10, 1);

  assert.equal(result.recent_12m_avg_monthly_fills, 0.1);
  assert.equal(result.pct_of_recent_12m_external_fills, 1000);
  assert.equal(result.multiple_of_recent_avg_monthly_fills, 120);
});

test("returns null scale comparisons when there is no recent fill history", () => {
  const result = calculateRoleBuyScale(10, 0);

  assert.equal(result.recent_12m_avg_monthly_fills, 0);
  assert.equal(result.pct_of_recent_12m_external_fills, null);
  assert.equal(result.multiple_of_recent_avg_monthly_fills, null);
});

test("zero requested Buy remains zero when low-volume history exists", () => {
  const result = calculateRoleBuyScale(0, 1);

  assert.equal(result.recent_12m_avg_monthly_fills, 0.1);
  assert.equal(result.pct_of_recent_12m_external_fills, 0);
  assert.equal(result.multiple_of_recent_avg_monthly_fills, 0);
});

test("another low-volume case uses the unrounded monthly denominator", () => {
  const result = calculateRoleBuyScale(1, 2);

  assert.equal(result.recent_12m_avg_monthly_fills, 0.2);
  assert.equal(result.pct_of_recent_12m_external_fills, 50);
  assert.equal(result.multiple_of_recent_avg_monthly_fills, 6);
});
