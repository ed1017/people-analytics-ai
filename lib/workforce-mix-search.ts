/** Offline deterministic search. No product route, model, storage write, or capacity inference. */
import {createHash} from "node:crypto";
// @ts-expect-error Native Node tests share the calculator implementation.
import {calculateWorkforceIncrement, type WorkforceIncrement, type WorkforcePlanInput} from "./workforce-increment.ts";
// @ts-expect-error Native Node tests share the saved-solution implementation.
import {readWorkforceSolution, currentSolutionVersion, solutionResultIsCurrent, type WorkforceSolution} from "./workforce-solution.ts";
// @ts-expect-error Native Node tests share the saved-review implementation.
import {readSavedWorkforceReview} from "./workforce-solution-review.ts";
import type {RecruitingTimingEvidence} from "./recruiting-timing";

export const workforceMixSearchLimits = Object.freeze({maxEvaluations: 1000, maxResults: 64});
type Range = {min: number; max: number};
export type WorkforceMixSearchSpec = {
  build: Range; move: Range; buy: Range;
  maxEvaluations: number; maxResults: number;
  resultFilter: "all" | "entered-constraints-met";
  assumptionPolicy: "preserve-reviewed-path-totals-and-timing";
};
type ConstraintStatus = "met" | "not-met" | "unknown";
type TradeOffs = {incrementalCash: number | null; employeeTimeValue: number | null; addedEmployees: number; fullCoverageMonth: string | null};
type TradeOffStatus = "nondominated-in-bounds" | "dominated-in-bounds" | "incomparable-missing-metrics" | "not-compared-constraints";
export type WorkforceMixCandidate = {
  id: string; mix: {build: number; move: number; buy: number}; isSavedMix: boolean;
  status: ConstraintStatus | "invalid"; reason: string | null;
  plan: WorkforceIncrement | null; tradeOffs: TradeOffs | null; tradeOffStatus: TradeOffStatus;
};
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw Error(message); }
function exact(value: unknown, keys: string[]): Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), "Expected a bounded search object.");
  const record = value as Record<string, unknown>;
  assert(Object.keys(record).length === keys.length && keys.every(key => Object.hasOwn(record, key)), "Unexpected or missing search fields.");
  return record;
}
function canonical(value: unknown): string {
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort) : item !== null && typeof item === "object"
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, sort((item as Record<string, unknown>)[key])])) : item;
  return JSON.stringify(sort(value));
}
function fingerprint(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function specFor(raw: unknown, roles: number): WorkforceMixSearchSpec {
  const input = exact(raw, ["build", "move", "buy", "maxEvaluations", "maxResults", "resultFilter", "assumptionPolicy"]);
  for (const name of ["build", "move", "buy"] as const) {
    const range = exact(input[name], ["min", "max"]);
    assert(Number.isSafeInteger(range.min) && Number.isSafeInteger(range.max) && (range.min as number) >= 0 && (range.max as number) <= roles && (range.min as number) <= (range.max as number), "Mix bounds must be nonnegative integers within the saved demand.");
  }
  assert(Number.isSafeInteger(input.maxEvaluations) && (input.maxEvaluations as number) >= 1 && (input.maxEvaluations as number) <= workforceMixSearchLimits.maxEvaluations, "Search evaluation budget must be 1–1000.");
  assert(Number.isSafeInteger(input.maxResults) && (input.maxResults as number) >= 1 && (input.maxResults as number) <= workforceMixSearchLimits.maxResults, "Search result limit must be 1–64.");
  assert(input.resultFilter === "all" || input.resultFilter === "entered-constraints-met", "Choose an explicit result filter.");
  assert(input.assumptionPolicy === "preserve-reviewed-path-totals-and-timing", "Explicitly retain reviewed path totals and timing; no new cost or capacity basis is inferred.");
  return structuredClone(input) as WorkforceMixSearchSpec;
}
function sourceFor(raw: WorkforceSolution, evidenceResultId: string) {
  const solution = readWorkforceSolution(raw);
  assert(solution && !solution.pending, "Use a readable saved solution without a pending calculation.");
  const version = currentSolutionVersion(solution), result = solution.results.find(item => item.id === evidenceResultId);
  assert(result && solutionResultIsCurrent(solution, result), "Choose a current saved workforce calculation.");
  const review = readSavedWorkforceReview(solution, result);
  assert(review, "Saved inputs and calculation evidence do not match.");
  const role = review.source.jobProfile, bu = review.source.businessUnit;
  assert(role && typeof role === "object" && !Array.isArray(role) && role.job_profile_code === review.input.jobProfile &&
    bu && typeof bu === "object" && !Array.isArray(bu) && bu.org_code === review.input.businessUnit, "Saved evidence scope differs from the reviewed role or business unit.");
  const timing = review.timing as RecruitingTimingEvidence | null;
  if (timing) {
    assert(timing.scope?.job_profile_code === review.input.jobProfile && timing.scope.business_unit === null && timing.scope.country === null, "Saved recruiting evidence has a different scope.");
    const sample = timing.opening_to_start?.valid_sample_count, median = timing.opening_to_start?.median_days;
    assert(Number.isSafeInteger(sample) && sample >= 0 && (median === null || typeof median === "number" && Number.isFinite(median) && median >= 0), "Saved recruiting timing is unreadable.");
  }
  // Only hashes of dependency text/payload are returned; owner notes and approvals
  // are never copied into search results. This is identity, not authentication.
  const binding = {goalId: solution.goalId, solutionId: solution.id, version: version.version, evidenceResultId,
    inputFingerprint: fingerprint(review.input), timingFingerprint: fingerprint(timing),
    sourceResultFingerprint: fingerprint(result), evidenceFingerprint: fingerprint(result.evidenceIds.map(id => solution.evidence.find(item => item.id === id))), dependencyFingerprint: fingerprint(result.dependencyKey)};
  return {binding, input: structuredClone(review.input), timing: structuredClone(timing)};
}
function constraintStatus(plan: WorkforceIncrement): ConstraintStatus {
  if (plan.checks.some(check => check.status === "not met")) return "not-met";
  return plan.checks.length === 3 && plan.checks.every(check => check.status === "met") ? "met" : "unknown";
}
function tradeOffs(plan: WorkforceIncrement): TradeOffs {
  return {incrementalCash: plan.totalCash, employeeTimeValue: plan.totalTime, addedEmployees: plan.maxAddedEmployees,
    fullCoverageMonth: plan.rows.find(row => row.remainingRoles === 0)?.month ?? null};
}
function comparable(candidate: WorkforceMixCandidate) {
  return candidate.status === "met" && candidate.tradeOffs !== null && Object.values(candidate.tradeOffs).every(value => value !== null);
}
function dominates(a: WorkforceMixCandidate, b: WorkforceMixCandidate): boolean {
  if (!comparable(a) || !comparable(b)) return false;
  const left = a.tradeOffs!, right = b.tradeOffs!;
  return left.incrementalCash! <= right.incrementalCash! && left.employeeTimeValue! <= right.employeeTimeValue! && left.addedEmployees <= right.addedEmployees && left.fullCoverageMonth! <= right.fullCoverageMonth! &&
    (left.incrementalCash! < right.incrementalCash! || left.employeeTimeValue! < right.employeeTimeValue! || left.addedEmployees < right.addedEmployees || left.fullCoverageMonth! < right.fullCoverageMonth!);
}

/** Exhaustive only within explicit bounds and budget. Never returns a partial search as complete. */
export function searchWorkforceMixes(solution: WorkforceSolution, evidenceResultId: string, rawSpec: unknown) {
  const source = sourceFor(solution, evidenceResultId), roles = Number(source.input.roles), spec = specFor(rawSpec, roles);
  const moveRange = (build: number) => ({min: Math.max(spec.move.min, roles - build - spec.buy.max), max: Math.min(spec.move.max, roles - build - spec.buy.min)});
  let enumerated = 0;
  for (let build = spec.build.min; build <= spec.build.max; build++) {
    const move = moveRange(build); enumerated += Math.max(0, move.max - move.min + 1);
  }
  assert(enumerated + 1 <= spec.maxEvaluations, "The complete bounded search plus its reference calculation exceeds the evaluation budget; narrow the explicit bounds. No partial search was evaluated.");
  const referencePlan = calculateWorkforceIncrement(source.input, source.timing);
  const candidates: WorkforceMixCandidate[] = [];
  for (let build = spec.build.min; build <= spec.build.max; build++) {
    const range = moveRange(build);
    for (let move = range.min; move <= range.max; move++) {
      const buy = roles - build - move, mix = {build, move, buy};
      const input: WorkforcePlanInput = {...source.input, build: String(build), move: String(move), buy: String(buy)};
      const candidate: WorkforceMixCandidate = {id: `build-${build}-move-${move}-buy-${buy}`, mix,
        isSavedMix: build === Number(source.input.build) && move === Number(source.input.move) && buy === Number(source.input.buy),
        status: "invalid", reason: null, plan: null, tradeOffs: null, tradeOffStatus: "not-compared-constraints"};
      try {
        candidate.plan = calculateWorkforceIncrement(input, source.timing);
        candidate.status = constraintStatus(candidate.plan); candidate.tradeOffs = tradeOffs(candidate.plan);
      } catch (error) {
        candidate.reason = error instanceof Error ? error.message : "The saved assumptions cannot calculate this mix.";
      }
      candidates.push(candidate);
    }
  }
  // Pareto comparison uses all enumerated matches, before any output truncation.
  // It expresses only cash/time/headcount/readiness trade-offs, never a weighted best.
  for (const candidate of candidates) {
    if (candidate.status !== "met") continue;
    candidate.tradeOffStatus = !comparable(candidate) ? "incomparable-missing-metrics" : candidates.some(other => dominates(other, candidate)) ? "dominated-in-bounds" : "nondominated-in-bounds";
  }
  const counts = {met: 0, "not-met": 0, unknown: 0, invalid: 0, nondominated: 0, incomparableMatches: 0};
  const invalidReasons: Record<string, number> = {};
  for (const candidate of candidates) {
    counts[candidate.status]++;
    if (candidate.tradeOffStatus === "nondominated-in-bounds") counts.nondominated++;
    if (candidate.tradeOffStatus === "incomparable-missing-metrics") counts.incomparableMatches++;
    if (candidate.reason) invalidReasons[candidate.reason] = (invalidReasons[candidate.reason] ?? 0) + 1;
  }
  const filtered = candidates.filter(candidate => spec.resultFilter === "all" || candidate.status === "met");
  const results = filtered.slice(0, spec.maxResults);
  const conclusion = enumerated === 0 ? "no-mix-within-bounds" : counts.met ? "entered-constraint-matches-found" : counts.unknown ? "entered-constraints-incomplete" : counts.invalid === enumerated ? "no-calculable-mix" : "no-entered-constraint-match";
  return freeze({schemaVersion: 1 as const, kind: "bounded-workforce-mix-search" as const, methodVersion: "workforce-mix-search-v2",
    searchFingerprint: fingerprint({binding: source.binding, spec}), binding: source.binding, spec,
    reference: {plan: referencePlan, status: constraintStatus(referencePlan), tradeOffs: tradeOffs(referencePlan)},
    summary: {conclusion, enumerated, calculatorInvocations: enumerated + 1, enumerationComplete: true, counts, invalidReasons, matchingFilter: filtered.length,
      emitted: results.length, omittedByCap: filtered.length - results.length, excludedByFilter: candidates.length - filtered.length, truncated: filtered.length > results.length},
    results, preferredOptionId: null, operationalFeasibilityVerified: false, requiresUserReview: true,
    ordering: "ascending Build then Move then Buy; not a quality ranking",
    dominanceScope: "entered-constraint matches with all four metrics known, within the complete explicit bounds",
    limitations: [
      "Bounds are reviewed scenario assumptions, not evidence of internal availability, training effectiveness, or batch hiring capacity.",
      "Only Build/Move/Buy counts vary. Saved demand, scope, constraints, dates, backfills, rates, total internal salary uplift, training cash and training hours stay fixed.",
      "Path totals are not per-person quotes and are not scaled when a count changes. The existing calculator zeroes costs only when that path is inactive.",
      "An invalid mix is not repaired by inventing backfills, dates, costs or capacity. Unknown inputs and constraints remain unknown.",
      "Nondominated does not mean approved, operationally feasible, globally optimal, or preferred. No cost/time/headcount weighting is imposed.",
      "A cap limits returned comparisons, not the evaluated domain. Truncation and filtering are explicit; omitted alternatives may be nondominated.",
    ]});
}
export type WorkforceMixSearch = ReturnType<typeof searchWorkforceMixes>;
/** Checks source currency only. Re-run the deterministic search to validate serialized calculations. */
export function workforceMixSearchIsCurrent(solution: WorkforceSolution, search: Pick<WorkforceMixSearch, "binding">): boolean {
  try { return canonical(sourceFor(solution, search.binding.evidenceResultId).binding) === canonical(search.binding); }
  catch { return false; }
}
