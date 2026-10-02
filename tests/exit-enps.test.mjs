import test from "node:test";
import assert from "node:assert/strict";
import { generateExitEnpsScores, summarizeExitEnps, surveyDimensionsForRetrieval, localExitEnpsEnabled } from "../lib/exit-enps.ts";
import { completeScopedChatTurn, getScopedChatHistory } from "../lib/chat-context-history.ts";

test("eNPS boundaries use all valid responses including passives", () => {
  const result = summarizeExitEnps([0, 6, 7, 8, 9, 10]);
  assert.deepEqual([result.promoters, result.passives, result.detractors, result.respondents, result.score], [2, 2, 2, 6, 0]);
  assert.equal(summarizeExitEnps([9, 10]).score, 100);
  assert.equal(summarizeExitEnps([0, 6]).score, -100);
  assert.equal(summarizeExitEnps([9, 8, 8, 6]).score, 0);
  assert.equal(summarizeExitEnps([9, 8, 8]).score, 33.3);
});
test("empty data remains unavailable and invalid numeric values fail closed", () => {
  assert.equal(summarizeExitEnps([]).score, null);
  assert.equal(summarizeExitEnps([]).promoter_pct, null);
  for (const invalid of [-1, 11, 4.5, NaN, Infinity, null, "9"]) assert.throws(() => summarizeExitEnps([invalid]));
});
test("simulation is reproducible and explicitly separate from historical respondents", () => {
  const scores = generateExitEnpsScores();
  assert.equal(scores.length, 1957);
  assert.deepEqual(scores, generateExitEnpsScores());
  assert.equal(new Set(scores).size, 11);
  const result = summarizeExitEnps(scores);
  assert.equal(result.provenance, "simulated");
  assert.match(result.population, /not current employees or linked historical respondents/);
  assert.equal(result.source_refresh_date, null);
  assert.equal(result.promoters + result.passives + result.detractors, result.respondents);
});
test("replacement allowlist removes only EXIT recommendation and unrecognized EXIT items", () => {
  const rows = ["RECOMMEND", "CAREER", "MANAGER", "COMPENSATION", "WORK_LIFE", "UNKNOWN"].map(question_code => ({ survey_code: "EXIT", question_code }));
  rows.push({ survey_code: "ENG-2026", question_code: "RECOMMEND" });
  rows.push({ dimension: "Advocacy" });
  const filtered = surveyDimensionsForRetrieval(rows, true);
  assert.equal(filtered.length, 5);
  assert.equal(filtered.filter(row => row.survey_code === "EXIT").length, 4);
  assert.ok(filtered.some(row => row.survey_code === "ENG-2026" && row.question_code === "RECOMMEND"));
  assert.deepEqual(surveyDimensionsForRetrieval(rows, false), rows);
  assert.equal(rows.length, 8);
});
test("unaffected Workforce, Planning and Skills follow-ups keep scoped memory", () => {
  for (const page of ["workforce", "workforce-planning", "skills"]) {
    const key = JSON.stringify({ page, evidence: "unchanged" });
    const turn = completeScopedChatTurn(key, [], "My goal is capacity", "We can compare the evidence.");
    assert.equal(getScopedChatHistory(turn, key).length, 2);
    assert.deepEqual(getScopedChatHistory(turn, JSON.stringify({ page, evidence: "changed" })), []);
  }
});
test("incomplete replacement stays gated off in every runtime despite old flags", () => {
  const mode = process.env.SURVEY_ENPS_MODE, env = process.env.NODE_ENV;
  try { process.env.SURVEY_ENPS_MODE = "local-simulated-v1"; for (const runtime of ["production", "development", "test"]) { process.env.NODE_ENV = runtime; assert.equal(localExitEnpsEnabled(), false); } }
  finally { if (mode === undefined) delete process.env.SURVEY_ENPS_MODE; else process.env.SURVEY_ENPS_MODE = mode; if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env; }
});
