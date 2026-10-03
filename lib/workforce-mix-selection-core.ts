/** Offline selection boundary. No network, storage, approval or saved-plan mutation. */
import type {WorkforceMixSearch} from "./workforce-mix-search-core.ts";
// @ts-expect-error Native Node tests share this implementation.
import {currentSolutionVersion, readWorkforceSolution, type WorkforceSolution} from "./workforce-solution.ts";
// @ts-expect-error Native Node tests share this implementation.
import {validateJson} from "./local-decisions.ts";
// @ts-expect-error Native Node tests share this implementation.
import {canonical} from "./workforce-mix-search-core.ts";

export type WorkforceSelectionContext = {
  solution: WorkforceSolution;
  activeGoalId: string;
  activeGoalStatement: string;
  evidenceResultId: string;
  expectedSearchFingerprint: string;
  hasUnsavedPlanEdits: boolean;
};
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
function boundedJson(value: unknown) {
  requireValue(validateJson(value) && JSON.stringify(value).length <= 2 * 1024 * 1024, "Unreadable or oversized selection data.");
}
/** Replays the complete bounded search for verification only; does not run/save a new plan. */
export function validateSelectionContext(context: WorkforceSelectionContext) {
  const solution = readWorkforceSolution(context.solution);
  requireValue(solution && !solution.pending && context.hasUnsavedPlanEdits === false, "Use saved inputs without pending work or unsaved edits.");
  requireValue(context.activeGoalId === solution.goalId && typeof context.activeGoalStatement === "string" && context.activeGoalStatement.trim() &&
    context.activeGoalStatement === currentSolutionVersion(solution).inputs.scope.goalStatement, "The active goal changed.");
  return solution;
}
export function validateSelectionRequest(context: WorkforceSelectionContext, snapshot: unknown, selectedIds: string[]) {
  const solution = validateSelectionContext(context);
  boundedJson(snapshot);
  const supplied = snapshot as WorkforceMixSearch;
  requireValue(supplied?.binding?.evidenceResultId === context.evidenceResultId && supplied.searchFingerprint === context.expectedSearchFingerprint, "The selected evidence or search changed.");
  requireValue(Array.isArray(selectedIds) && selectedIds.length >= 1 && selectedIds.length <= 2 && selectedIds.every(id => typeof id === "string") && new Set(selectedIds).size === selectedIds.length, "Select one or two distinct alternatives.");
  return {solution, supplied};
}
export function selectionFromReplay(context: WorkforceSelectionContext, snapshot: unknown, selectedIds: string[], replay: WorkforceMixSearch) {
  validateSelectionRequest(context, snapshot, selectedIds);
  requireValue(canonical(replay) === canonical(snapshot), "Search results are stale or modified; regenerate the comparison.");
  const revisions = selectedIds.map(id => {
    const candidate = replay.results.find(item => item.id === id);
    requireValue(candidate && !candidate.isSavedMix && candidate.mix.build + candidate.mix.move > 0, "Select an emitted alternative distinct from the original and hiring-only plans.");
    requireValue(candidate.status === "met" && candidate.plan && candidate.tradeOffs && Object.values(candidate.tradeOffs).every(value => value !== null), "This mix is invalid, fails entered constraints, or has unknown feasibility metrics.");
    return structuredClone(candidate.plan.input);
  });
  return {
    schemaVersion: 1 as const, kind: "staged-workforce-mix-selection" as const,
    binding: structuredClone(replay.binding), searchFingerprint: replay.searchFingerprint,
    selectedIds: [...selectedIds], revisions,
    feasibility: "conditional-on-entered-assumptions" as const,
    operationalFeasibilityVerified: false as const, requiresUserReview: true as const,
    capacityNotice: "Candidate pools are not assignable employees. Build, Move and Buy capacity remains unverified.",
  };
}
export type StagedWorkforceMixSelection = ReturnType<typeof selectionFromReplay>;
