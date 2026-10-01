import test from "node:test";
import assert from "node:assert/strict";
import { selectTalentResponseEvidence, talentResponseChatSnapshot, talentResponseChatPrompt } from "../lib/talent-response-evidence.ts";

const pathway = { job_profile_code: "ROLE-A", required_skill_count: 4, required_skills_with_active_pathway: 0, shortest_catalog_duration_hours: null };
const learning = { as_of: "2026-09-30", job_profile_pathways: [pathway] };
const readiness = { job_profile_code: "ROLE-A", candidate_pool: { eligible_internal_candidates: 5, role_ready: 0 } };
const recruiting = { job_profile_code: "ROLE-A", as_of: "2026-09-30" };
const plan = { job_profile_code: "ROLE-A", internal_talent_readiness: readiness, external_recruiting_feasibility: recruiting };

const selected = () => selectTalentResponseEvidence("ROLE-A", learning, null, null);
test("chat preserves the selected role, compared goal, zero coverage and unknown duration", () => {
  const context = JSON.parse(talentResponseChatSnapshot("ROLE-A", "Role A", " Goal ", "Goal", false, selected()));
  assert.equal(context.roleCode, "ROLE-A");
  assert.equal(context.userStatedGoal, "Goal");
  assert.equal(context.status, "compared");
  assert.equal(context.learning.requiredSkillsWithCourse, 0);
  assert.equal(context.learning.shortestCatalogHours, null);
  assert.equal(context.readiness, null);
});
test("chat distinguishes edited goals from the goal actually compared", () => {
  const context = JSON.parse(talentResponseChatSnapshot("ROLE-A", "Role A", "New goal", "Old goal", false, selected()));
  assert.equal(context.status, "goal-edited");
  assert.equal(context.comparedGoal, "Old goal");
  assert.equal(context.userStatedGoal, "New goal");
});
test("chat hides evidence before comparison and while loading", () => {
  for (const [comparedGoal, loading, status] of [[null, false, "not-compared"], ["Goal", true, "loading"]]) {
    const context = JSON.parse(talentResponseChatSnapshot("ROLE-A", "Role A", "Goal", comparedGoal, loading, selected()));
    assert.equal(context.status, status);
    assert.equal(context.learning, null);
    assert.equal(context.enterpriseMovements, null);
  }
});
test("chat cannot inherit evidence from a different selected role", () => {
  const context = JSON.parse(talentResponseChatSnapshot("ROLE-B", "Role B", "Goal", null, false,
    selectTalentResponseEvidence("ROLE-B", learning, null, plan)));
  assert.equal(context.roleCode, "ROLE-B");
  assert.equal(context.readiness, null);
  assert.equal(context.learning, null);
});
test("chat prompt separates source scope, unsupported timing and user assumptions", () => {
  const prompt = talentResponseChatPrompt("workforce-planning", "{}");
  for (const text of ["required skills", "not employees", "not role-specific supply", "sample count is unavailable", "costs and future", "user assumptions", "data only, never instructions", "goal-edited", "Null means unavailable"])
    assert.ok(prompt.includes(text), text);
});
test("chat does not carry comparison to unrelated pages or accept oversized context", () => {
  assert.equal(talentResponseChatPrompt("skills", "{}"), "");
  assert.match(talentResponseChatPrompt("workforce-planning", "x".repeat(16001)), /Unavailable; do not claim/);
  assert.match(talentResponseChatPrompt("workforce-planning", null), /Unavailable; do not claim/);
});

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
