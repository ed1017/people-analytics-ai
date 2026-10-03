// Local protocol only. No SDK client, network request, database read or storage
// write lives here. A production model adapter requires envelope approval.
// @ts-expect-error Native Node tests share the TypeScript implementation.
import {calculateWorkforceIncrement, validateWorkforcePlanInput, workforcePlanFields, type WorkforcePlanInput, type WorkforceIncrement} from "./workforce-increment.ts";
// @ts-expect-error Native Node tests share the TypeScript implementation.
import {currentSolutionVersion, solutionDependencyKey, solutionSections, type WorkforceSolution} from "./workforce-solution.ts";
import type {RecruitingTimingEvidence} from "./recruiting-timing";

export type WorkforceOptionId = "reviewed-mix" | "hiring-only" | "revision-1" | "revision-2";
type Option = {id: WorkforceOptionId; input: WorkforcePlanInput};
type ConstraintStatus = "met" | "not-met" | "unknown";
export type WorkforceOptionEvaluation = {optionId: WorkforceOptionId; plan: WorkforceIncrement; status: ConstraintStatus};
export type WorkforceAgentConclusion = "constraints_met_outcomes_unknown" | "no_evaluated_option_meets_entered_constraints" | "constraints_incomplete";
type Binding = {goalId: string; solutionId: string; version: number; dependencyKey: string};
export type WorkforceAgentReview = {
  schemaVersion: 1; id: string; binding: Binding; startedAt: string; completedAt: string;
  evaluations: WorkforceOptionEvaluation[]; conclusion: WorkforceAgentConclusion;
  preferredOptionId: WorkforceOptionId | null; modelTurns: number; revisionEvaluations: number;
  requiresUserReview: true;
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

function binding(solution: WorkforceSolution): Binding {
  const version = currentSolutionVersion(solution);
  return {goalId: solution.goalId, solutionId: solution.id, version: version.version, dependencyKey: solutionDependencyKey(solution, version, "brief")};
}
export function workforceAgentReviewIsCurrent(solution: WorkforceSolution, review: Pick<WorkforceAgentReview, "binding">) {
  return JSON.stringify(binding(solution)) === JSON.stringify(review.binding);
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
    invariant(!options.some(option => JSON.stringify(option.input) === JSON.stringify(revision)), "Revision duplicates an existing reviewed option.");
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
  timing: RecruitingTimingEvidence | null; runId: string; model: Model; signal: AbortSignal;
  timeoutMs?: number;
}): Promise<WorkforceAgentReview> {
  const timeout = args.timeoutMs ?? 30000;
  invariant(Number.isInteger(timeout) && timeout > 0 && timeout <= 30000, "Invalid agent time limit.");
  invariant(/^[a-zA-Z0-9-]{1,80}$/.test(args.runId), "Invalid agent run identifier.");
  const initial = clone(args.solution), captured = binding(initial), options = optionsFor(initial, clone(args.reviewedRevisions), args.allowRevision);
  const goal = currentSolutionVersion(initial).inputs.scope.goalStatement;
  invariant(typeof goal === "string" && goal.trim().length > 0 && goal.length <= 240, "A reviewed goal is required.");
  const timing = clone(args.timing), signal = AbortSignal.any([args.signal, AbortSignal.timeout(timeout)]);
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
      modelTurns, revisionEvaluations: revisionCount, requiresUserReview: true});
  }
  throw new Error("Workforce agent turn limit reached; no final review was accepted.");
}

// Explicit local retention only: use a separate goal-owned field, never replace
// single-role result payloads, user notes or approvals. No caller is wired yet.
export function retainWorkforceAgentReview(previous: WorkforceAgentReview[], review: WorkforceAgentReview, solution: WorkforceSolution) {
  invariant(workforceAgentReviewIsCurrent(solution, review), "Cannot retain a stale agent review as current.");
  invariant(previous.length < 10 && !previous.some(item => item.id === review.id), "Agent review history limit or duplicate run.");
  invariant(previous.every(item => item.binding.goalId === solution.goalId && item.binding.solutionId === solution.id), "Agent history belongs to another goal or solution.");
  return clone([...previous, review]);
}
