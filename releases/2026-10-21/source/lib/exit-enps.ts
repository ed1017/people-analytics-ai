export const EXIT_ENPS_DATASET = "exit-enps-sim-v1";
export const EXIT_ENPS_QUESTION = "How likely are you to recommend the organization as a place to work?";
export const EXIT_ENPS_CONTRACT = "survey-exit-enps-sim-v1";
export const EXIT_ENPS_SEED_COUNT = 1957;

// Independent demonstration observations. No employee/separation IDs or old scores are inputs.
// The same integer expression is used in the proposed SQL seed.
export function generateExitEnpsScores(count = EXIT_ENPS_SEED_COUNT): number[] {
  if (!Number.isInteger(count) || count < 0 || count > 100000) throw new Error("Invalid simulated response count");
  return Array.from({ length: count }, (_, index) => (((index + 1) * 73 + 19) % 997) % 11);
}

export function summarizeExitEnps(scores: readonly number[]) {
  if (scores.some(score => !Number.isInteger(score) || score < 0 || score > 10)) throw new Error("eNPS requires integer scores from 0 to 10");
  const respondents = scores.length;
  const promoters = scores.filter(score => score >= 9).length;
  const passives = scores.filter(score => score >= 7 && score <= 8).length;
  const detractors = scores.filter(score => score <= 6).length;
  const pct = (count: number) => respondents ? Math.round(1000 * count / respondents) / 10 : null;
  return {
    dataset_id: EXIT_ENPS_DATASET,
    contract_version: EXIT_ENPS_CONTRACT,
    question_code: "EXIT_ENPS_SIMULATED",
    question_text: EXIT_ENPS_QUESTION,
    provenance: "simulated" as const,
    population: "Independent simulated exit-survey responses; not current employees or linked historical respondents",
    scope: "Company-wide demonstration; no country, business-unit or monthly breakdown",
    source_refresh_date: null,
    generator_version: "ordinal-73-19-997-mod11-v1",
    scale_min: 0,
    scale_max: 10,
    respondents, promoters, passives, detractors,
    promoter_pct: pct(promoters), passive_pct: pct(passives), detractor_pct: pct(detractors),
    score: respondents ? Math.round(1000 * (promoters - detractors) / respondents) / 10 : null,
    limitation: "Arbitrary reproducible demonstration distribution, not measured sentiment, a converted 1–5 score, an estimate or a trend. Matching sample size does not establish respondent identity.",
  };
}

export type ExitEnpsSummary = ReturnType<typeof summarizeExitEnps>;
export function localExitEnpsEnabled() {
  // Activation is blocked until targeted server-verified history, payload and in-flight
  // survey-contract isolation is complete. Environment flags cannot bypass this gate.
  return false;
}

const retainedExitQuestions = new Set(["CAREER", "COMPENSATION", "MANAGER", "WORK_LIFE"]);
export function surveyDimensionsForRetrieval<T extends { survey_code?: unknown; question_code?: unknown }>(rows: readonly T[], replacementEnabled: boolean): T[] {
  return rows.filter(row => !replacementEnabled || (typeof row.survey_code === "string" && typeof row.question_code === "string" && (row.survey_code !== "EXIT" || retainedExitQuestions.has(row.question_code))));
}
