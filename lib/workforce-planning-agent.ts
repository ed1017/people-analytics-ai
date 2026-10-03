// Local protocol only. No SDK client, network request, database read or storage
// write lives here. A production model adapter requires envelope approval.
// @ts-expect-error Native Node tests share the TypeScript implementation.
import {calculateWorkforceIncrement, validateWorkforcePlanInput, workforcePlanFields, type WorkforcePlanInput, type WorkforceIncrement} from "./workforce-increment.ts";
// @ts-expect-error Native Node tests share the TypeScript implementation.
import {currentSolutionVersion, solutionDependencyKey, solutionSections, solutionResultIsCurrent, readWorkforceSolution, type WorkforceSolution} from "./workforce-solution.ts";
import type {RecruitingTimingEvidence} from "./recruiting-timing";
// @ts-expect-error Native Node tests share the TypeScript implementation.
import {validateJson} from "./local-decisions.ts";

export type WorkforceOptionId = "reviewed-mix" | "hiring-only" | "revision-1" | "revision-2";
// @ts-expect-error Native Node tests share the TypeScript implementation.
import {readWorkforceReview} from "./workforce-solution-review.ts";
type Option = {id: WorkforceOptionId; input: WorkforcePlanInput};
type ConstraintStatus = "met" | "not-met" | "unknown";
export type WorkforceOptionEvaluation = {optionId: WorkforceOptionId; plan: WorkforceIncrement; status: ConstraintStatus};
export type WorkforceAgentConclusion = "constraints_met_outcomes_unknown" | "no_evaluated_option_meets_entered_constraints" | "constraints_incomplete";
type Binding = {goalId: string; solutionId: string; version: number; dependencyKey: string; evidenceResultId: string; timingKey: string};
export type WorkforceAgentReview = {
  schemaVersion: 1; id: string; binding: Binding; startedAt: string; completedAt: string;
  evaluations: WorkforceOptionEvaluation[]; conclusion: WorkforceAgentConclusion;
  preferredOptionId: WorkforceOptionId | null; modelTurns: number; revisionEvaluations: number;
  requiresUserReview: true; reviewedOptions: Option[]; allowRevision: boolean;
};
export type WorkforceAgentTurn = {
  goal: string;
  options: Option[];
  evaluations: Array<{optionId: WorkforceOptionId; status: ConstraintStatus; cash: number | null; employeeTimeValue: number | null; addedEmployees: number; arrivalDate: string | null; checks: WorkforceIncrement["checks"]}>;
  tools: Array<{type: "function"; name: "evaluate_workforce_option" | "finish_workforce_review"; description: string; strict: true; parameters: Record<string, unknown>}>;
};
type Model = (turn: WorkforceAgentTurn, signal: AbortSignal) => Promise<unknown>;
type Invocation = {name: string; arguments: unknown};
const clone = <T>(value: T): T => structuredClone(value);
const invariant = (condition: unknown, message: string): void => {if (!condition) throw Error(message)};
const coreIds: WorkforceOptionId[] = ["reviewed-mix", "hiring-only"];
const sharedFields = ["businessUnit", "jobProfile", "intent", "roles", "planningMonth", "months", "budget", "maxAddedEmployees", "deadlineMonth", "annualHireCost", "hireFee", "recruitingStart", "arrivalMode", "arrivalDate", "loadedHourlyCost"] as const;

function savedTiming(solution: WorkforceSolution, evidenceResultId: string): RecruitingTimingEvidence | null {
  const result = solution.results.find(item => item.id === evidenceResultId);
  invariant(result && result.kind === "brief" && result.calculator.name === "single-role-workforce-review" && solutionResultIsCurrent(solution, result), "Choose a current saved workforce calculation as the evidence reference.");
  const input = savedInput(solution), payload = readWorkforceReview(result!.payload);
  invariant(payload, "Saved workforce evidence is unreadable.");
  const sourceInput = payload!.input as WorkforcePlanInput | undefined;
  invariant(sourceInput && workforcePlanFields.every(field => sourceInput[field] === input[field]), "Saved evidence does not match the reviewed inputs.");
  const timing = payload!.timing;
  invariant(timing === null || timing !== undefined && typeof timing === "object" && !Array.isArray(timing), "Saved timing evidence is unreadable.");
  if (timing !== null) {
    const evidence = timing as unknown as RecruitingTimingEvidence;
    invariant(evidence.scope?.job_profile_code === input.jobProfile && evidence.scope.business_unit === null && evidence.scope.country === null, "Saved timing evidence has a different scope.");
    const sample = evidence.opening_to_start?.valid_sample_count, median = evidence.opening_to_start?.median_days;
    invariant(Number.isSafeInteger(sample) && sample >= 0 && (median === null || typeof median === "number" && Number.isFinite(median) && median >= 0), "Saved timing evidence is unreadable.");
  }
  return timing as RecruitingTimingEvidence | null;
}
function binding(solution: WorkforceSolution, evidenceResultId: string): Binding {
  const version = currentSolutionVersion(solution);
  return {goalId: solution.goalId, solutionId: solution.id, version: version.version, dependencyKey: solutionDependencyKey(solution, version, "brief"), evidenceResultId, timingKey: JSON.stringify(savedTiming(solution, evidenceResultId))};
}
export function workforceAgentReviewIsCurrent(solution: WorkforceSolution, review: Pick<WorkforceAgentReview, "binding">) {
  try {return JSON.stringify(binding(solution, review.binding.evidenceResultId)) === JSON.stringify(review.binding)} catch {return false}
}
function savedInput(solution: WorkforceSolution): WorkforcePlanInput {
  const inputs = currentSolutionVersion(solution).inputs;
  const raw = Object.fromEntries(workforcePlanFields.map(field => {
    const matches = solutionSections.filter(section => Object.hasOwn(inputs[section], field));
    invariant(matches.length === 1, "Reviewed workforce inputs are missing or ambiguous.");
    return [field, inputs[matches[0]][field]];
  }));
  return validateWorkforcePlanInput(raw);
}
function optionsFor(solution: WorkforceSolution, revisions: WorkforcePlanInput[], allowRevision: boolean): Option[] {
  invariant(revisions.length <= 2 && (allowRevision || revisions.length === 0), "Revision options exceed the explicitly permitted scope.");
  const input = savedInput(solution);
  const options: Option[] = [
    {id: "reviewed-mix", input},
    {id: "hiring-only", input: validateWorkforcePlanInput({...input, build: "0", move: "0", buy: input.roles, backfills: "0", internalAnnualCostChange: "0", trainingCash: "0", trainingHours: "0"})},
  ];
  revisions.forEach((raw, i) => {
    const revision = validateWorkforcePlanInput(raw);
    invariant(sharedFields.every(field => revision[field] === input[field]), "A revision cannot change the reviewed demand, horizon, constraints or common hiring cost/timing basis.");
    invariant(!options.some(option => workforcePlanFields.every(field => option.input[field] === revision[field])), "Revision duplicates an existing reviewed option.");
    options.push({id: i === 0 ? "revision-1" : "revision-2", input: revision});
  });
  return options;
}
function status(plan: WorkforceIncrement): ConstraintStatus {
  if (plan.checks.some(check => check.status === "not met")) return "not-met";
  return plan.checks.length === 3 && plan.checks.every(check => check.status === "met") ? "met" : "unknown";
}
function conclusion(evaluations: WorkforceOptionEvaluation[]): WorkforceAgentConclusion {
  if (evaluations.some(result => result.status === "met")) return "constraints_met_outcomes_unknown";
  return evaluations.some(result => result.status === "unknown") ? "constraints_incomplete" : "no_evaluated_option_meets_entered_constraints";
}
function turnFor(goal: string, options: Option[], evaluations: WorkforceOptionEvaluation[], revisionCount: number): WorkforceAgentTurn {
  const evaluated = new Set(evaluations.map(result => result.optionId));
  const coreComplete = coreIds.every(id => evaluated.has(id));
  const available = options.filter(option => !evaluated.has(option.id) && (coreIds.includes(option.id) || coreComplete && revisionCount === 0));
  const passingIds = evaluations.filter(result => result.status === "met").map(result => result.optionId);
  const tools: WorkforceAgentTurn["tools"] = [];
  if (available.length) tools.push({type: "function", name: "evaluate_workforce_option", strict: true,
    description: "Evaluate one explicitly reviewed option. Compare both original options before selecting at most one reviewed revision. Never invent or change numeric inputs.",
    parameters: {type: "object", additionalProperties: false, required: ["option_id"], properties: {option_id: {type: "string", enum: available.map(option => option.id)}}}});
  if (coreComplete) tools.push({type: "function", name: "finish_workforce_review", strict: true,
    description: "Finish using only completed calculations. A preferred option must meet all entered constraints. Passing constraints does not establish operational availability, benefits or approval.",
    parameters: {type: "object", additionalProperties: false, required: ["conclusion", "preferred_option_id", "reviewed_option_ids"], properties: {
      conclusion: {type: "string", enum: [conclusion(evaluations)]},
      preferred_option_id: passingIds.length ? {anyOf: [{type: "null"}, {type: "string", enum: passingIds}]} : {type: "null"},
      reviewed_option_ids: {type: "array", items: {type: "string", enum: evaluations.map(result => result.optionId)}, minItems: evaluations.length, maxItems: evaluations.length},
    }}});
  return clone({goal, options, evaluations: evaluations.map(result => ({optionId: result.optionId, status: result.status, cash: result.plan.totalCash, employeeTimeValue: result.plan.totalTime, addedEmployees: result.plan.maxAddedEmployees, arrivalDate: result.plan.arrivalDate, checks: result.plan.checks})), tools});
}
function exactObject(value: unknown, keys: string[]): Record<string, unknown> {
  invariant(value !== null && typeof value === "object" && !Array.isArray(value), "Invalid model tool invocation.");
  const object = value as Record<string, unknown>;
  invariant(Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key)), "Unexpected model tool fields.");
  return object;
}
async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let stop = () => {};
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      stop = () => reject(new Error("Workforce agent review cancelled or timed out."));
      signal.addEventListener("abort", stop, {once: true});
    })]);
  } finally {signal.removeEventListener("abort", stop)}
}

export async function runWorkforcePlanningAgent(args: {
  solution: WorkforceSolution; currentSolution: () => WorkforceSolution;
  reviewedRevisions: WorkforcePlanInput[]; allowRevision: boolean;
  evidenceResultId: string; runId: string; model: Model; signal: AbortSignal;
  timeoutMs?: number;
}): Promise<WorkforceAgentReview> {
  const timeout = args.timeoutMs ?? 30000;
  invariant(Number.isInteger(timeout) && timeout > 0 && timeout <= 30000, "Invalid agent time limit.");
  invariant(/^[a-zA-Z0-9-]{1,80}$/.test(args.runId), "Invalid agent run identifier.");
  invariant(readWorkforceSolution(args.solution), "Saved workforce solution is unreadable.");
  savedInput(args.solution);
  const initial = clone(args.solution), captured = binding(initial, args.evidenceResultId), options = optionsFor(initial, clone(args.reviewedRevisions), args.allowRevision);
  const goal = currentSolutionVersion(initial).inputs.scope.goalStatement;
  invariant(typeof goal === "string" && goal.trim().length > 0 && goal.length <= 240, "A reviewed goal is required.");
  const timing = clone(savedTiming(initial, args.evidenceResultId)), signal = AbortSignal.any([args.signal, AbortSignal.timeout(timeout)]);
  const requireCurrent = () => {signal.throwIfAborted();invariant(workforceAgentReviewIsCurrent(args.currentSolution(), {binding: captured}), "The saved solution changed; this agent run cannot become current.")};
  requireCurrent();
  const startedAt = new Date().toISOString(), evaluations: WorkforceOptionEvaluation[] = [];
  let revisionCount = 0;
  for (let modelTurns = 1; modelTurns <= 4; modelTurns++) {
    requireCurrent();
    const turn = turnFor(goal as string, options, evaluations, revisionCount);
    const availableTools = turn.tools.map(tool => tool.name);
    const raw = await abortable(args.model(turn, signal), signal);
    requireCurrent();
    const invocation = exactObject(raw, ["name", "arguments"]) as Invocation;
    invariant(availableTools.some(name => name === invocation.name), "Model requested an unavailable tool.");
    if (invocation.name === "evaluate_workforce_option") {
      const input = exactObject(invocation.arguments, ["option_id"]);
      const option = options.find(item => item.id === input.option_id);
      invariant(option && !evaluations.some(result => result.optionId === option.id), "Model requested an unknown or already evaluated option.");
      const revision = !coreIds.includes(option!.id);
      invariant(!revision || revisionCount === 0 && coreIds.every(id => evaluations.some(result => result.optionId === id)), "Model exceeded the reviewed revision boundary.");
      const plan = calculateWorkforceIncrement(option!.input, timing);
      evaluations.push({optionId: option!.id, plan, status: status(plan)});
      if (revision) revisionCount++;
      continue;
    }
    invariant(coreIds.every(id => evaluations.some(result => result.optionId === id)), "Both original comparisons must be evaluated before finishing.");
    const finish = exactObject(invocation.arguments, ["conclusion", "preferred_option_id", "reviewed_option_ids"]);
    const ids = finish.reviewed_option_ids;
    invariant(Array.isArray(ids) && ids.length === evaluations.length && new Set(ids).size === ids.length && evaluations.every(result => ids.includes(result.optionId)), "Final review does not cover exactly the calculated options.");
    invariant(finish.conclusion === conclusion(evaluations), "Model conclusion contradicts calculated constraints.");
    invariant(finish.preferred_option_id === null || evaluations.some(result => result.optionId === finish.preferred_option_id && result.status === "met"), "Preferred option must have a completed passing calculation.");
    requireCurrent();
    return clone({schemaVersion: 1, id: args.runId, binding: captured, startedAt, completedAt: new Date().toISOString(), evaluations,
      conclusion: finish.conclusion as WorkforceAgentConclusion, preferredOptionId: finish.preferred_option_id as WorkforceOptionId | null,
      modelTurns, revisionEvaluations: revisionCount, requiresUserReview: true, reviewedOptions: options, allowRevision: args.allowRevision});
  }
  throw new Error("Workforce agent turn limit reached; no final review was accepted.");
}

function canonical(value: unknown): string {
  const sorted = (item: unknown): unknown => Array.isArray(item) ? item.map(sorted) : item !== null && typeof item === "object"
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sorted(child)])) : item;
  return JSON.stringify(sorted(value));
}

export type WorkforceAlternativeReview = {
  schemaVersion: 1; kind: "local-alternative-review"; id: string; createdAt: string;
  binding: Binding; reviewedRevisions: WorkforcePlanInput[]; comparisons: WorkforceOptionEvaluation[];
};

// Local preflight for explicitly entered alternatives. No model invocation or
// permission to transmit these inputs is implied by previewing or saving them.
export function previewWorkforceAlternatives(solution: WorkforceSolution, evidenceResultId: string, revisions: WorkforcePlanInput[], id: string, createdAt: string): WorkforceAlternativeReview {
  invariant(readWorkforceSolution(solution), "Saved workforce solution is unreadable.");
  invariant(/^[a-zA-Z0-9-]{1,80}$/.test(id) && typeof createdAt === "string" && Number.isFinite(Date.parse(createdAt)), "Invalid local review identity.");
  invariant(Array.isArray(revisions) && revisions.length >= 1 && revisions.length <= 2, "Review one or two alternatives.");
  const options = optionsFor(solution, revisions, true), captured = binding(solution, evidenceResultId), timing = savedTiming(solution, evidenceResultId);
  return clone({schemaVersion: 1, kind: "local-alternative-review", id, createdAt, binding: captured,
    reviewedRevisions: options.slice(2).map(option => option.input),
    comparisons: options.map(option => {const plan = calculateWorkforceIncrement(option.input, timing); return {optionId: option.id, plan, status: status(plan)}})});
}

export function readWorkforceAlternativeReview(raw: unknown, solution: WorkforceSolution): WorkforceAlternativeReview | null {
  try {
    invariant(validateJson(raw) && readWorkforceSolution(solution), "Invalid local review.");
    const review = exactObject(raw, ["schemaVersion", "kind", "id", "createdAt", "binding", "reviewedRevisions", "comparisons"]) as unknown as WorkforceAlternativeReview;
    invariant(solution.versions.some(version => version.version === review.binding.version), "Missing reviewed version.");
    const historical = {...solution, versions: solution.versions.filter(version => version.version <= review.binding.version), pending: null};
    const expected = previewWorkforceAlternatives(historical, review.binding.evidenceResultId, review.reviewedRevisions, review.id, review.createdAt);
    invariant(canonical(expected) === canonical(review), "Local review does not match saved evidence or calculations.");
    return clone(review);
  } catch {return null}
}

export function retainWorkforceAlternativeReview(previous: unknown, review: WorkforceAlternativeReview, solution: WorkforceSolution): WorkforceAlternativeReview[] {
  invariant(workforceAgentReviewIsCurrent(solution, review) && readWorkforceAlternativeReview(review, solution), "Preview the current saved inputs and evidence before saving alternatives.");
  invariant(Array.isArray(previous) && previous.length < 10, "Alternative review history is unreadable or at its ten-review limit; existing records retained.");
  const history = previous as WorkforceAlternativeReview[];
  invariant(history.every(item => readWorkforceAlternativeReview(item, solution)), "Existing alternative history is unreadable; original records retained.");
  invariant(!history.some(item => item.id === review.id), "This alternative review is already saved.");
  const next = [...history, review];
  invariant(new TextEncoder().encode(JSON.stringify(next)).length <= 256 * 1024, "Alternative review history reached its storage limit; existing records retained.");
  return clone(next);
}

// Browser JSON is untrusted after reload. Replay deterministic calculations,
// never infer authenticity from a matching solution ID or TypeScript cast.
export function readWorkforceAgentReview(raw: unknown, solution: WorkforceSolution): WorkforceAgentReview | null {
  try {
    invariant(readWorkforceSolution(solution), "Invalid saved solution.");
    invariant(validateJson(raw), "Invalid stored agent review.");
    const review = exactObject(raw, ["schemaVersion", "id", "binding", "startedAt", "completedAt", "evaluations", "conclusion", "preferredOptionId", "modelTurns", "revisionEvaluations", "requiresUserReview", "reviewedOptions", "allowRevision"]) as unknown as WorkforceAgentReview;
    invariant(review.schemaVersion === 1 && /^[a-zA-Z0-9-]{1,80}$/.test(review.id) && review.requiresUserReview === true && typeof review.allowRevision === "boolean", "Invalid stored agent review.");
    invariant(typeof review.startedAt === "string" && typeof review.completedAt === "string" && Number.isFinite(Date.parse(review.startedAt)) && Number.isFinite(Date.parse(review.completedAt)) && Date.parse(review.startedAt) <= Date.parse(review.completedAt), "Invalid review timestamps.");
    invariant(Number.isInteger(review.binding.version) && solution.versions.some(version => version.version === review.binding.version), "Missing reviewed version.");
    const historical = {...solution, versions: solution.versions.filter(version => version.version <= review.binding.version), pending: null};
    invariant(workforceAgentReviewIsCurrent(historical, review), "Stored review evidence or inputs changed.");
    invariant(Array.isArray(review.reviewedOptions) && review.reviewedOptions.length >= 2 && review.reviewedOptions.length <= 4, "Invalid reviewed alternatives.");
    const options = optionsFor(historical, review.reviewedOptions.slice(2).map(option => option.input), review.allowRevision);
    invariant(canonical(options) === canonical(review.reviewedOptions), "Reviewed alternatives do not match the saved scope.");
    invariant(Array.isArray(review.evaluations) && review.evaluations.length >= 2 && review.evaluations.length <= 3, "Invalid calculation count.");
    const ids = review.evaluations.map(result => result.optionId);
    invariant(new Set(ids).size === ids.length && coreIds.every(id => ids.slice(0, 2).includes(id)), "Missing or repeated original comparisons.");
    invariant(review.modelTurns === review.evaluations.length + 1 && review.revisionEvaluations === review.evaluations.length - 2, "Invalid execution limits.");
    const timing = savedTiming(historical, review.binding.evidenceResultId);
    for (const result of review.evaluations) {
      exactObject(result, ["optionId", "plan", "status"]);
      const option = options.find(item => item.id === result.optionId);
      invariant(option, "Unreviewed option.");
      const expected = calculateWorkforceIncrement(option!.input, timing);
      invariant(canonical(expected) === canonical(result.plan) && result.status === status(expected), "Stored calculation does not match the reviewed inputs.");
    }
    invariant(review.conclusion === conclusion(review.evaluations), "Stored conclusion contradicts results.");
    invariant(review.preferredOptionId === null || review.evaluations.some(result => result.optionId === review.preferredOptionId && result.status === "met"), "Stored preference is unsupported.");
    return clone(review);
  } catch {return null}
}

// Explicit local retention only: use a separate goal-owned field, never replace
// single-role result payloads, user notes or approvals. No caller is wired yet.
export function retainWorkforceAgentReview(previous: WorkforceAgentReview[], review: WorkforceAgentReview, solution: WorkforceSolution) {
  invariant(workforceAgentReviewIsCurrent(solution, review), "Cannot retain a stale agent review as current.");
  invariant(readWorkforceAgentReview(review, solution), "Cannot retain an invalid or corrupted agent review.");
  invariant(previous.length < 10 && !previous.some(item => item.id === review.id), "Agent review history limit or duplicate run.");
  invariant(previous.every(item => item.binding.goalId === solution.goalId && item.binding.solutionId === solution.id), "Agent history belongs to another goal or solution.");
  invariant(previous.every(item => readWorkforceAgentReview(item, solution)), "Existing agent history is unreadable; retain the original stored record.");
  invariant(new TextEncoder().encode(JSON.stringify([...previous, review])).length <= 256 * 1024, "Agent review history reached its storage limit.");
  return clone([...previous, review]);
}
