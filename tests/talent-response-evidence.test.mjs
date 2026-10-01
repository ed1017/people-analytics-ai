import test from "node:test";
import assert from "node:assert/strict";
import { selectTalentResponseEvidence } from "../lib/talent-response-evidence.ts";

const pathway = { job_profile_code: "ROLE-A", required_skill_count: 4, required_skills_with_active_pathway: 0, shortest_catalog_duration_hours: null };
const learning = { as_of: "2026-09-30", job_profile_pathways: [pathway] };
const readiness = { job_profile_code: "ROLE-A", candidate_pool: { eligible_internal_candidates: 5, role_ready: 0 } };
const recruiting = { job_profile_code: "ROLE-A", as_of: "2026-09-30" };
const plan = { job_profile_code: "ROLE-A", internal_talent_readiness: readiness, external_recruiting_feasibility: recruiting };

test("matches the selected role by exact code, never by name or substring", () => {
  assert.equal(selectTalentResponseEvidence("ROLE-A", learning, null, plan).pathway, pathway);
  const mismatch = selectTalentResponseEvidence("ROLE", learning, null, plan);
  assert.equal(mismatch.pathway, null);
  assert.equal(mismatch.readiness, null);
  assert.equal(mismatch.recruiting, null);
});
test("zero catalog coverage and zero readiness remain observations, not unavailable", () => {
  const result = selectTalentResponseEvidence("ROLE-A", learning, null, plan);
  assert.equal(result.pathway.required_skills_with_active_pathway, 0);
  assert.equal(result.readiness.candidate_pool.role_ready, 0);
  assert.equal(result.pathway.shortest_catalog_duration_hours, null);
  assert.equal(result.learningAsOf, "2026-09-30");
});
test("missing sources stay unavailable without fabricated counts or dates", () => {
  assert.deepEqual(selectTalentResponseEvidence("ROLE-A", null, null, null), {
    pathway: null, learningAsOf: null, readiness: null, recruiting: null, enterpriseHistory: null,
  });
});
test("rejects nested readiness or recruiting results for a different role", () => {
  const result = selectTalentResponseEvidence("ROLE-A", learning, null, {
    ...plan, internal_talent_readiness: { ...readiness, job_profile_code: "ROLE-B" },
    external_recruiting_feasibility: { ...recruiting, job_profile_code: "ROLE-B" },
  });
  assert.equal(result.readiness, null);
  assert.equal(result.recruiting, null);
});
test("enterprise history remains separate and cannot supply missing role evidence", () => {
  const history = { source: { total_recorded_events: 600 }, composition: [] };
  const result = selectTalentResponseEvidence("ROLE-B", learning, history, plan);
  assert.equal(result.enterpriseHistory, history);
  assert.equal(result.readiness, null);
  assert.equal(result.pathway, null);
  assert.equal("availableMovers" in result, false);
});
test("no selected role cannot inherit another role's evidence", () => {
  const result = selectTalentResponseEvidence("", learning, null, plan);
  assert.equal(result.pathway, null);
  assert.equal(result.readiness, null);
});
