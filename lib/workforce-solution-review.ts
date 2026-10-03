import type {Json} from "./local-decisions";
import type {WorkforceIncrement, WorkforcePlanInput} from "./workforce-increment";
// @ts-expect-error Native Node tests use the same TypeScript source.
import {currentSolutionVersion, solutionResultIsCurrent, readWorkforceSolution, solutionSections, type WorkforceSolution, type ResultSnapshot} from "./workforce-solution.ts";
// @ts-expect-error Native Node tests use the same TypeScript source.
import {validateWorkforcePlanInput, workforcePlanFields, planDate} from "./workforce-increment.ts";
// @ts-expect-error Native Node tests use the same TypeScript source.
import {validateJson} from "./local-decisions.ts";

export type WorkforceReview = {
  version: number;
  calculatedAt: string;
  input: WorkforcePlanInput;
  source: Record<string, Json>;
  structural: Record<string, Json>;
  response: Record<string, Json>;
  timing: Record<string, Json> | null;
  proposed: WorkforceIncrement;
  hireOnly: WorkforceIncrement;
  limitations: string[];
};

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
const rows = (value: unknown) => Array.isArray(value) ? value.map(record) : [];
const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const text = (value: unknown) => typeof value === "string" && value.trim() ? value : null;

export function readWorkforceReview(raw: unknown): WorkforceReview | null {
  try {
    if (!validateJson(raw)) return null;
    const value = record(raw), input = validateWorkforcePlanInput(value.input);
    const object = (item: unknown) => item !== null && typeof item === "object" && !Array.isArray(item);
    const amount = (item: unknown) => item === null || typeof item === "number" && Number.isFinite(item) && item >= 0;
    const strings = (item: unknown) => Array.isArray(item) && item.length <= 100 && item.every(part => typeof part === "string");
    const date = (item: unknown) => item === null || typeof item === "string" && planDate(item) !== null;
    if (value.version !== 1 || typeof value.calculatedAt !== "string" || !Number.isFinite(Date.parse(value.calculatedAt)) || !object(value.source) || !object(value.response) || !object(value.structural) || value.timing !== null && !object(value.timing) || !strings(value.limitations)) return null;
    const structural = record(value.structural), response = record(value.response);
    if (!amount(structural.authorizedAnnualBudgetDelta) || typeof structural.costBasisPeriod !== "string" || response.warnings !== undefined && !strings(response.warnings)) return null;
    const checkNames = ["Incremental cash budget", "Maximum added employees", "Conditional role coverage by deadline"];
    const rowFields = ["externalHires", "externalBackfills", "addedEmployees", "conditionalRoleCoverage", "remainingRoles", "hireStaffingCost", "backfillStaffingCost", "internalSalaryUplift", "recruitingFees", "trainingCash", "employeeTimeValue", "incrementalCash"];
    for (const [key, expectedInput] of [["proposed", input], ["hireOnly", {...input, build: "0", move: "0", buy: input.roles, backfills: "0", internalAnnualCostChange: "0", trainingCash: "0", trainingHours: "0"}]] as const) {
      const plan = record(value[key]), planInput = validateWorkforcePlanInput(plan.input);
      if (plan.version !== 1 || workforcePlanFields.some(field => planInput[field] !== expectedInput[field]) || !["totalCash", "totalTime", "totalWithTime"].every(field => amount(plan[field])) || typeof plan.maxAddedEmployees !== "number" || !Number.isSafeInteger(plan.maxAddedEmployees) || plan.maxAddedEmployees < 0 || !date(plan.arrivalDate) || !date(plan.backfillArrival) || !["unknown", "explicit", "historical-median"].includes(String(plan.arrivalBasis)) || !strings(plan.warnings)) return null;
      if (!Array.isArray(plan.checks) || plan.checks.length !== 3 || !plan.checks.every((check, i) => object(check) && check.name === checkNames[i] && ["met", "not met", "unknown"].includes(check.status))) return null;
      if (!Array.isArray(plan.rows) || plan.rows.length !== Number(input.months) || !plan.rows.every(row => object(row) && typeof row.month === "string" && planDate(row.month + "-01") !== null && rowFields.every(field => amount(row[field])))) return null;
    }
    // Historical cash snapshots keep their original rounding conventions. This
    // reader validates shape; it never silently recomputes or rewrites them.
    return raw as WorkforceReview;
  } catch {return null}
}

export function readSavedWorkforceReview(solution: WorkforceSolution, result: ResultSnapshot): WorkforceReview | null {
  const review = readWorkforceReview(result.payload), version = solution.versions.find(item => item.version === result.version);
  if (!review || !version || result.kind !== "brief" || result.calculator.name !== "single-role-workforce-review") return null;
  for (const field of workforcePlanFields) {
    const matches = solutionSections.filter(section => Object.hasOwn(version.inputs[section], field));
    if (matches.length !== 1 || version.inputs[matches[0]][field] !== review.input[field]) return null;
  }
  return review;
}

// Present only the selected, immutable calculation payload. No current page
// data or global filters may silently replace evidence in a saved decision.
export function workforceReviewEvidence(review: WorkforceReview) {
  const role = record(review.source.jobProfile), bu = record(review.source.businessUnit);
  const scopeMatches = role.job_profile_code === review.input.jobProfile && bu.org_code === review.input.businessUnit;
  const response = scopeMatches && review.response.job_profile_code === review.input.jobProfile ? review.response : {};
  const rawReadiness = record(response.internal_talent_readiness);
  const readiness = rawReadiness.job_profile_code === review.input.jobProfile ? rawReadiness : {};
  const pool = record(readiness.candidate_pool), pathways = record(readiness.development_pathway_coverage);
  const rawTiming = record(review.timing), timingScope = record(rawTiming.scope);
  const timing = scopeMatches && timingScope.job_profile_code === review.input.jobProfile &&
    timingScope.business_unit === null && timingScope.country === null ? rawTiming : {};
  const distribution = record(timing.opening_to_start);
  const sample = count(distribution.valid_sample_count), median = count(distribution.median_days);
  return {
    role: scopeMatches ? text(role.job_profile_name) ?? review.input.jobProfile : review.input.jobProfile,
    businessUnit: scopeMatches ? text(bu.org_name) ?? review.input.businessUnit : review.input.businessUnit,
    scopeMatches,
    asOf: text(review.source.asOf),
    ready: count(pool.role_ready), nearReady: count(pool.near_ready),
    eligible: count(pool.eligible_internal_candidates),
    fullyCovered: count(pathways.fully_pathway_covered_candidates),
    partiallyCovered: count(pathways.partially_pathway_covered_candidates),
    noPathway: count(pathways.no_active_pathway_candidates),
    skills: rows(response.skill_bundle).filter(row => text(row.skill_name)).map(row => ({
      name: text(row.skill_name)!, importance: text(row.importance),
      proficiency: count(row.required_proficiency), courses: count(row.active_course_count),
    })),
    gaps: rows(readiness.top_near_ready_skill_gaps).filter(row => text(row.skill_name)).map(row => ({
      name: text(row.skill_name)!, candidates: count(row.candidates_below_requirement),
      courses: count(row.active_course_count), shortestHours: count(row.shortest_active_course_hours),
    })),
    recruiting: {
      sample,
      // A sub-threshold historical sample must not become a planning benchmark.
      medianDays: sample !== null && sample >= 5 ? median : null,
      periodStart: text(timing.period_start), periodEnd: text(timing.period_end),
    },
  };
}

export function workforceLimitSummary(plan: WorkforceIncrement) {
  if (plan.checks.some(check => check.status === "not met")) return "One or more entered limits are not met.";
  if (plan.checks.length !== 3 || plan.checks.some(check => check.status !== "met")) return "Some entered limits cannot be checked.";
  return "Entered limits met; operational feasibility remains unverified.";
}

// The decision-notes page inspects the same selected calculation as Home.
// It does not copy outputs into editable notes or create a second approval.
export function selectedWorkforceBrief(raw: unknown, selectedId: unknown, goalStatement: string, expectedGoalId?: string) {
  const solution = readWorkforceSolution(raw);
  if (!solution || expectedGoalId !== undefined && solution.goalId !== expectedGoalId) return null;
  const results = solution.results.filter(result => result.kind === "brief" && result.calculator.name === "single-role-workforce-review");
  const result = results.find(item => item.id === selectedId) ?? results.at(-1);
  if (!result) return null;
  const review = readSavedWorkforceReview(solution, result);
  if (!review) return null;
  return {
    result, review, evidence: workforceReviewEvidence(review), count: results.length,
    current: currentSolutionVersion(solution).inputs.scope.goalStatement === goalStatement && solutionResultIsCurrent(solution, result),
    reviewNotes: solution.approvals.filter(note => note.resultIds.includes(result.id)),
  };
}
