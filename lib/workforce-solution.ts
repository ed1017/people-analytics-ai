// Shared lifecycle for one goal's workforce solution. Calculator adapters still
// validate domain inputs/results; this module never invents or executes a plan.
// @ts-expect-error Native Node tests use the same TypeScript source.
import {validateJson,type Json} from "./local-decisions.ts";

export const solutionSections = ["scope", "demand", "response", "costs", "timing", "constraints", "training"] as const;
export type SolutionSection = typeof solutionSections[number];
export type SolutionInputs = Record<SolutionSection, Record<string, Json>>;
export type ResultKind = "demand" | "response" | "costs" | "timing" | "constraints" | "brief";
export type EditOrigin = "conversation" | "sidebar";
export type EvidenceKind = "positions" | "skills" | "learning" | "recruiting" | "cost-basis" | "quote";
export type EvidenceSnapshot = {
  id: string; kind: EvidenceKind; source: string; sourceVersion: string;
  capturedAt: string; asOf: string | null; periodStart: string | null; periodEnd: string | null;
  scope: Record<string, Json>; provenance: "synthetic" | "user-provided" | "fictional";
  payload: Record<string, Json>; limitations: string[];
};
export type SolutionVersion = {
  version: number; createdAt: string; origin: EditOrigin; change: string;
  inputs: SolutionInputs; evidenceIds: string[];
};
export type ResultSnapshot = {
  id: string; runId: string; version: number; kind: ResultKind; completedAt: string;
  calculator: {name: string; version: string};
  dependencyKey: string; evidenceIds: string[]; payload: Record<string, Json>;
};
export type RunTicket = {
  id: string; goalId: string; solutionId: string; version: number;
  startedAt: string; kinds: ResultKind[]; keys: Partial<Record<ResultKind, string>>;
};
export type SolutionApproval = {
  id: string; version: number; resultIds: string[]; text: string; recordedAt: string;
};
export type WorkforceSolution = {
  schemaVersion: 1; id: string; goalId: string;
  versions: SolutionVersion[]; evidence: EvidenceSnapshot[]; results: ResultSnapshot[];
  approvals: SolutionApproval[]; runs: RunTicket[]; pending: RunTicket | null;
};
// Explicit dependencies prevent a timing-only edit from invalidating a quote's
// cost total. The combined monthly plan and brief still become stale.
const dependencies: Record<ResultKind, readonly SolutionSection[]> = {
  demand: ["scope", "demand"],
  response: ["scope", "demand", "response"],
  costs: ["scope", "demand", "response", "costs", "training"],
  timing: ["scope", "demand", "response", "costs", "timing", "training"],
  constraints: solutionSections,
  brief: solutionSections,
};
const evidenceDependencies: Record<ResultKind, readonly EvidenceKind[]> = {
  demand: ["positions"],
  response: ["positions", "skills", "learning", "recruiting"],
  costs: ["positions", "cost-basis", "quote"],
  timing: ["positions", "cost-basis", "quote", "recruiting"],
  constraints: ["positions", "skills", "learning", "recruiting", "cost-basis", "quote"],
  brief: ["positions", "skills", "learning", "recruiting", "cost-basis", "quote"],
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
function identifier(value: string) {
  assert(typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value), "Invalid solution identifier.");
}
function timestamp(value: string) {
  assert(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), "Invalid event timestamp.");
}
function limitedText(value: string, max: number) {
  assert(typeof value === "string" && value.trim().length > 0 && value.length <= max, "Missing or excessive record text.");
}
function object(value: unknown) {
  assert(value !== null && typeof value === "object" && !Array.isArray(value) && validateJson(value), "Invalid structured solution data.");
}
function bounded<T>(value: T): T {
  assert(validateJson(value), "Solution contains unsupported data.");
  assert(new TextEncoder().encode(JSON.stringify(value)).length <= 384 * 1024,
    "Solution history reached its storage limit. Previous history is retained; nothing was discarded.");
  return value;
}
function validateInputs(inputs: SolutionInputs) {
  object(inputs);
  assert(Object.keys(inputs).length === solutionSections.length && solutionSections.every(key => Object.hasOwn(inputs, key)), "Unknown or missing input section.");
  for (const section of solutionSections) object(inputs[section]);
}
export function emptySolutionInputs(): SolutionInputs {
  return {scope: {}, demand: {}, response: {}, costs: {}, timing: {}, constraints: {}, training: {}};
}
export function currentSolutionVersion(state: WorkforceSolution): SolutionVersion {
  assert(state.versions.length > 0, "Solution version is missing.");
  return state.versions[state.versions.length - 1];
}
export function createWorkforceSolution(id: string, goalId: string, inputs: SolutionInputs, at: string): WorkforceSolution {
  identifier(id); identifier(goalId); timestamp(at); validateInputs(inputs);
  return bounded({schemaVersion: 1, id, goalId,
    versions: [{version: 1, createdAt: at, origin: "conversation", change: "Started workforce solution", inputs: clone(inputs), evidenceIds: []}],
    evidence: [], results: [], approvals: [], runs: [], pending: null});
}
function expectVersion(state: WorkforceSolution, expected: number) {
  assert(currentSolutionVersion(state).version === expected, "The solution changed. Review the latest version before applying this edit.");
}
export function reviseWorkforceSolution(state: WorkforceSolution, expected: number, patch: Partial<SolutionInputs>, origin: EditOrigin, change: string, at: string): WorkforceSolution {
  expectVersion(state, expected); timestamp(at); limitedText(change, 500); object(patch);
  assert(origin === "conversation" || origin === "sidebar", "Invalid edit origin.");
  assert(Object.keys(patch).every(key => solutionSections.includes(key as SolutionSection)), "Unknown input section.");
  const previous = currentSolutionVersion(state), inputs = {...previous.inputs, ...clone(patch)};
  validateInputs(inputs);
  if (JSON.stringify(inputs) === JSON.stringify(previous.inputs)) return state;
  assert(state.versions.length < 50, "Solution version limit reached; existing history is retained.");
  return bounded({...state, pending: null, versions: [...state.versions, {
    version: previous.version + 1, createdAt: at, origin, change, inputs, evidenceIds: [...previous.evidenceIds],
  }]});
}
export function attachSolutionEvidence(state: WorkforceSolution, expected: number, snapshot: EvidenceSnapshot, replaceId: string | null, at: string): WorkforceSolution {
  expectVersion(state, expected); timestamp(at); identifier(snapshot.id); timestamp(snapshot.capturedAt);
  limitedText(snapshot.source, 160); limitedText(snapshot.sourceVersion, 80);
  object(snapshot.scope); object(snapshot.payload);
  assert(["positions", "skills", "learning", "recruiting", "cost-basis", "quote"].includes(snapshot.kind), "Unknown evidence kind.");
  assert(["synthetic", "user-provided", "fictional"].includes(snapshot.provenance), "Unknown evidence provenance.");
  assert(Array.isArray(snapshot.limitations) && snapshot.limitations.length <= 20, "Invalid evidence limitations.");
  snapshot.limitations.forEach(value => limitedText(value, 500));
  for (const date of [snapshot.asOf, snapshot.periodStart, snapshot.periodEnd]) {
    assert(date === null || /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date, "Invalid evidence date.");
  }
  assert(snapshot.periodStart === null || snapshot.periodEnd === null || snapshot.periodStart <= snapshot.periodEnd, "Evidence period is reversed.");
  assert(!state.evidence.some(item => item.id === snapshot.id), "Evidence IDs are immutable; capture a new snapshot.");
  const previous = currentSolutionVersion(state);
  assert(replaceId === null || previous.evidenceIds.includes(replaceId), "Replaced evidence is not in the current solution.");
  assert(replaceId === null || state.evidence.find(item => item.id === replaceId)?.kind === snapshot.kind, "Replacement evidence must have the same kind.");
  assert(state.versions.length < 50 && state.evidence.length < 100, "Solution history limit reached; no evidence was discarded.");
  return bounded({...state, pending: null, evidence: [...state.evidence, clone(snapshot)], versions: [...state.versions, {
    ...clone(previous), version: previous.version + 1, createdAt: at, origin: "conversation",
    change: replaceId ? `Refreshed ${snapshot.kind} evidence` : `Attached ${snapshot.kind} evidence`,
    evidenceIds: [...previous.evidenceIds.filter(id => id !== replaceId), snapshot.id],
  }]});
}
export function solutionDependencyKey(state: WorkforceSolution, version: SolutionVersion, kind: ResultKind) {
  assert(Object.hasOwn(dependencies, kind), "Unknown result kind.");
  return JSON.stringify({goalId: state.goalId, solutionId: state.id,
    inputs: dependencies[kind].map(section => [section, version.inputs[section]]),
    evidence: version.evidenceIds.filter(id => {
      const evidence = state.evidence.find(item => item.id === id);
      assert(evidence, "Referenced evidence is missing.");
      return evidenceDependencies[kind].includes(evidence.kind);
    }).sort(),
  });
}
// Called only by the explicit run action after domain validation and input review.
export function beginSolutionRun(state: WorkforceSolution, expected: number, runId: string, kinds: ResultKind[], at: string): {state: WorkforceSolution; ticket: RunTicket} {
  expectVersion(state, expected); identifier(runId); timestamp(at);
  assert(!state.pending, "A solution calculation is already running.");
  assert(!state.runs.some(run => run.id === runId), "Run ID already used.");
  assert(state.runs.length < 100, "Run history limit reached; previous records are retained.");
  assert(kinds.length > 0 && new Set(kinds).size === kinds.length, "Choose distinct calculation kinds.");
  const version = currentSolutionVersion(state);
  const ticket: RunTicket = {id: runId, goalId: state.goalId, solutionId: state.id, version: version.version, startedAt: at,
    kinds: [...kinds], keys: Object.fromEntries(kinds.map(kind => [kind, solutionDependencyKey(state, version, kind)]))};
  return {state: bounded({...state, runs: [...state.runs, clone(ticket)], pending: clone(ticket)}), ticket: clone(ticket)};
}
export function cancelSolutionRun(state: WorkforceSolution, runId: string): WorkforceSolution {
  return state.pending?.id === runId ? {...state, pending: null} : state;
}
export type CompletedCalculation = Pick<ResultSnapshot, "id" | "kind" | "calculator" | "payload">;
// Only server-validated/adaptor-validated results may enter here. A changed,
// cancelled or superseded run is rejected rather than silently becoming current.
export function completeSolutionRun(state: WorkforceSolution, ticket: RunTicket, calculations: CompletedCalculation[], at: string): WorkforceSolution {
  timestamp(at);
  assert(state.pending && JSON.stringify(state.pending) === JSON.stringify(ticket) && ticket.goalId === state.goalId && ticket.solutionId === state.id,
    "This run is cancelled, superseded or belongs to another solution. Previous results are retained.");
  expectVersion(state, ticket.version);
  assert(calculations.length === ticket.kinds.length && new Set(calculations.map(item => item.kind)).size === calculations.length && calculations.every(item => ticket.kinds.includes(item.kind)), "Calculation results do not match the requested run.");
  assert(state.results.length + calculations.length <= 100, "Result history limit reached; no previous results were discarded.");
  const version = currentSolutionVersion(state), ids = new Set(state.results.map(item => item.id));
  const results = calculations.map(item => {
    identifier(item.id); assert(!ids.has(item.id), "Result ID already used."); ids.add(item.id);
    limitedText(item.calculator.name, 100); limitedText(item.calculator.version, 80); object(item.payload);
    assert(ticket.keys[item.kind] === solutionDependencyKey(state, version, item.kind), "Calculation inputs changed.");
    return {...clone(item), runId: ticket.id, version: ticket.version, completedAt: at,
      dependencyKey: ticket.keys[item.kind]!, evidenceIds: [...version.evidenceIds]};
  });
  return bounded({...state, pending: null, results: [...state.results, ...results]});
}
export function solutionResultIsCurrent(state: WorkforceSolution, result: ResultSnapshot): boolean {
  return state.results.some(item => item.id === result.id && item.dependencyKey === result.dependencyKey) &&
    result.dependencyKey === solutionDependencyKey(state, currentSolutionVersion(state), result.kind);
}
export function recordSolutionApproval(state: WorkforceSolution, expected: number, id: string, resultIds: string[], text: string, at: string): WorkforceSolution {
  expectVersion(state, expected); identifier(id); timestamp(at); limitedText(text, 1000);
  assert(!state.pending, "Wait for or cancel the current calculation before recording approval.");
  assert(state.approvals.length < 30 && !state.approvals.some(item => item.id === id), "Approval history limit or duplicate ID.");
  assert(resultIds.length > 0 && new Set(resultIds).size === resultIds.length && resultIds.every(id => {
    const result = state.results.find(item => item.id === id);
    return result && solutionResultIsCurrent(state, result);
  }), "Approval must reference current calculated results.");
  return bounded({...state, approvals: [...state.approvals, {id, version: expected, resultIds: [...resultIds], text: text.trim(), recordedAt: at}]});
}
export function solutionInspection(state: WorkforceSolution, versionNumber: number) {
  const version = state.versions.find(item => item.version === versionNumber);
  assert(version, "The requested solution version is unavailable.");
  return clone({goalId: state.goalId, solutionId: state.id, version,
    evidence: version.evidenceIds.map(id => state.evidence.find(item => item.id === id)!),
    results: state.results.filter(item => item.version <= versionNumber && item.dependencyKey === solutionDependencyKey(state, version, item.kind)),
    approvals: state.approvals.filter(item => item.version === versionNumber)});
}

export function inspectSolutionResult(state: WorkforceSolution, resultId: string) {
  const result = state.results.find(item => item.id === resultId);
  assert(result, "The requested calculation is unavailable.");
  return clone({result, inspection: solutionInspection(state, result.version)});
}
