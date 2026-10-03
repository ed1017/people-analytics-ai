import type {Json} from "./local-decisions";
import type {WorkforceIncrement, WorkforcePlanInput} from "./workforce-increment";
// @ts-expect-error Native Node tests use the same TypeScript source.
import {currentSolutionVersion, solutionResultIsCurrent, type WorkforceSolution} from "./workforce-solution.ts";

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
export function selectedWorkforceBrief(solution: WorkforceSolution | undefined, selectedId: unknown, goalStatement: string) {
  if (!solution) return null;
  const results = solution.results.filter(result => result.kind === "brief" && result.calculator.name === "single-role-workforce-review");
  const result = results.find(item => item.id === selectedId) ?? results.at(-1);
  if (!result) return null;
  const review = result.payload as unknown as WorkforceReview;
  return {
    result, review, evidence: workforceReviewEvidence(review), count: results.length,
    current: currentSolutionVersion(solution).inputs.scope.goalStatement === goalStatement && solutionResultIsCurrent(solution, result),
    reviewNotes: solution.approvals.filter(note => note.resultIds.includes(result.id)),
  };
}
