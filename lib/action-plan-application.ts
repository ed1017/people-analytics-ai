// Explicit local application only. No source datasets or calculation results are written.
// @ts-expect-error Native Node tests share TypeScript source.
import {actionPlanApplicationPreviewIsCurrent, type ApplicationContext, type ApplicationChoices, type ApplicationPreview, type ApplicationRow} from './action-plan-application-preview.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson, type Json, type DecisionStore} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readWorkforceSolution, currentSolutionVersion, reviseWorkforceSolution} from './workforce-solution.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {workforceInputGroups} from './workforce-guided-intake.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {plain, exactKeys} from './home-action-proposal.ts';
import type {DevelopmentSession} from '../components/development-workspace';

export const applicationHistoryField = 'actionPlanApplicationsV1';
export type ApplicationReceipt = {
  version: 1; id: string; appliedAt: string; binding: ApplicationPreview['binding'];
  destinationRevisionBefore: number; destinationRevisionAfter: number;
  changes: ApplicationRow[]; skipped: {destination: string; status: ApplicationRow['status']; reason: string | null}[];
  development: {before: DevelopmentSession; after: DevelopmentSession} | null;
  workforce: {solutionId: string; beforeVersion: number; afterVersion: number} | null;
};
export type ApplicationHistory = {version: 1; receipts: ApplicationReceipt[]};
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function check(condition: unknown, message: string): asserts condition {if (!condition) throw Error(message)}
const rowStatuses = ['preserved', 'unchanged', 'fill', 'replace', 'missing', 'blocked', 'read-only'];
const validChange = (row: ApplicationRow) => plain(row) && exactKeys(row, ['destination', 'current', 'proposed', 'after', 'unit', 'choice', 'status', 'conflict', 'reason', 'provenance']) &&
  typeof row.destination === 'string' && /^(development\.(goal|options\[[0-2]\]\.inputs\.[a-zA-Z]+)|workforceSolution\.[a-zA-Z]+\.[a-zA-Z]+)$/.test(row.destination) &&
  (row.current === null || typeof row.current === 'string') && typeof row.after === 'string' && row.after === row.proposed && typeof row.unit === 'string' &&
  (row.status === 'fill' && row.choice === 'fill-empty' || row.status === 'replace' && row.choice === 'replace') && typeof row.conflict === 'boolean' &&
  (row.reason === null || typeof row.reason === 'string') && Array.isArray(row.provenance) && row.provenance.every(item => plain(item) &&
    exactKeys(item, ['sourcePath', 'kind', 'basis']) && typeof item.sourcePath === 'string' && ['user-entered', 'illustrative', 'adopted', 'simulated', 'user-provided', 'attachment'].includes(item.kind) &&
    (item.basis === null || typeof item.basis === 'string'));
export function readApplicationHistory(raw: unknown): ApplicationHistory | null {
  if (raw === undefined) return {version: 1, receipts: []};
  try {
    check(validateJson(raw) && new TextEncoder().encode(JSON.stringify(raw)).length <= 192 * 1024, 'Invalid application history.');
    const history = plain(raw);
    check(history && exactKeys(history, ['version', 'receipts']) && history.version === 1 && Array.isArray(history.receipts) && history.receipts.length <= 20, 'Invalid application history.');
    const receipts = history.receipts as ApplicationReceipt[];
    receipts.forEach((receipt, index) => {
      check(plain(receipt) && exactKeys(receipt, ['version', 'id', 'appliedAt', 'binding', 'destinationRevisionBefore', 'destinationRevisionAfter', 'changes', 'skipped', 'development', 'workforce']) &&
        receipt.version === 1 && typeof receipt.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(receipt.id) &&
        typeof receipt.appliedAt === 'string' && /^\d{4}-\d\d-\d\dT/.test(receipt.appliedAt) && Number.isFinite(Date.parse(receipt.appliedAt)) &&
        Number.isSafeInteger(receipt.destinationRevisionBefore) && receipt.destinationRevisionBefore >= 0 && receipt.destinationRevisionAfter === receipt.destinationRevisionBefore + 1 &&
        (!index || receipt.destinationRevisionBefore >= receipts[index - 1].destinationRevisionAfter), 'Invalid application receipt identity.');
      const binding = plain(receipt.binding);
      check(binding && exactKeys(binding, ['attachmentId', 'bindingKey', 'inputKey', 'goalId', 'goal', 'revision', 'sourceIds', 'destinationRevision', 'solutionId', 'solutionVersion', 'contextKey']) &&
        binding.destinationRevision === receipt.destinationRevisionBefore && typeof binding.goalId === 'string' && typeof binding.goal === 'string' && Number.isSafeInteger(binding.revision) && Number(binding.revision) > 0 &&
        typeof binding.contextKey === 'string' && /^[a-f0-9]{64}$/.test(binding.contextKey) && typeof binding.attachmentId === 'string' &&
        typeof binding.inputKey === 'string' && typeof binding.bindingKey === 'string' && Array.isArray(binding.sourceIds) && binding.sourceIds.every(id => typeof id === 'string') &&
        (binding.solutionId === null || typeof binding.solutionId === 'string') && (binding.solutionVersion === null || Number.isSafeInteger(binding.solutionVersion) && Number(binding.solutionVersion) > 0) &&
        Array.isArray(receipt.changes) && receipt.changes.length > 0 && receipt.changes.length <= 40 && Array.isArray(receipt.skipped) && receipt.skipped.length <= 40 &&
        receipt.changes.every(validChange) && receipt.skipped.every(row => plain(row) && exactKeys(row, ['destination', 'status', 'reason']) &&
          typeof row.destination === 'string' && rowStatuses.includes(row.status) && (row.reason === null || typeof row.reason === 'string')), 'Invalid application receipt binding.');
      check(receipt.development === null || plain(receipt.development) && exactKeys(receipt.development, ['before', 'after']) && plain(receipt.development.before) && plain(receipt.development.after), 'Invalid Development history.');
      check(receipt.workforce === null || plain(receipt.workforce) && exactKeys(receipt.workforce, ['solutionId', 'beforeVersion', 'afterVersion']) &&
        typeof receipt.workforce.solutionId === 'string' && Number.isSafeInteger(receipt.workforce.beforeVersion) && receipt.workforce.beforeVersion >= 1 &&
        receipt.workforce.afterVersion === receipt.workforce.beforeVersion + 1, 'Invalid workforce history.');
    });
    check(new Set(receipts.map(receipt => receipt.id)).size === receipts.length, 'Duplicate application receipt.');
    return structuredClone(raw) as ApplicationHistory;
  } catch {return null}
}

// Build saved destination context from the store, not from render-time values.
export function currentApplicationContext(store: DecisionStore, context: ApplicationContext): ApplicationContext {
  const snapshot = store.getSnapshot(), fields = snapshot.data.workspaces[context.binding.goalId]?.fields ?? {};
  check(snapshot.ready && snapshot.saved && snapshot.data.goals.activeId === context.binding.goalId &&
    snapshot.data.goals.goals.find(goal => goal.id === context.binding.goalId)?.statement === context.binding.goal, 'Goal or saved storage changed; preview again.');
  return {...structuredClone(context), workspace: fields.homeSolutionBundlesV1 ?? null, destination: {
    ...structuredClone(context.destination), revision: snapshot.data.revision,
    development: (fields.development ?? null) as DevelopmentSession | null, workforceSolution: fields.workforceSolution ?? null,
    selectedPlanningScenario: typeof fields.selectedPlanningScenario === 'string' ? fields.selectedPlanningScenario : null,
  }};
}

const inFlight = new WeakSet<DecisionStore>();
/** Caller owns the fresh binding/working-draft guard. This function re-reads saved fields twice. */
export async function applyActionPlanPreview(store: DecisionStore, preview: ApplicationPreview, choices: ApplicationChoices,
  readContext: () => ApplicationContext, isCurrent: () => boolean, id: string, at: string): Promise<ApplicationReceipt> {
  check(!inFlight.has(store), 'An application is already pending.');
  inFlight.add(store);
  try {
    check(isCurrent(), 'Action Plan context changed; preview again.');
    const context = currentApplicationContext(store, readContext()), selected = structuredClone(choices);
    check(await actionPlanApplicationPreviewIsCurrent(preview, context, selected), 'Source, destination or selected fields changed; preview again.');
    check(isCurrent() && same(context, currentApplicationContext(store, readContext())) && same(selected, choices), 'Context changed while validating; preview again.');
    check(!preview.blockers.length && preview.selectedChanges.length > 0, 'Select valid fields and resolve blocked changes before applying.');
    let receipt: ApplicationReceipt | null = null;
    store.commitGoalFields(context.binding.goalId, context.binding.goal, context.destination.revision, at, fields => {
      check(isCurrent() && same(context, currentApplicationContext(store, readContext())), 'Context changed before commit; preview again.');
      const history = readApplicationHistory(fields[applicationHistoryField]);
      check(history && history.receipts.length < 20 && history.receipts.every(item => item.binding.goalId === context.binding.goalId), 'Application history is invalid or full; prior history is retained.');
      check(!history.receipts.some(item => item.id === id || item.binding.contextKey === preview.binding.contextKey), 'This preview has already been applied.');
      const changes = preview.rows.filter(row => row.status === 'fill' || row.status === 'replace'), patch: Record<string, Json> = {};
      let development: ApplicationReceipt['development'] = null, workforce: ApplicationReceipt['workforce'] = null;
      if (changes.some(row => row.destination.startsWith('development.'))) {
        check(context.destination.development, 'Missing Development destination.');
        const before = context.destination.development, after = structuredClone(before);
        for (const row of changes.filter(row => row.destination.startsWith('development.'))) {
          check(typeof row.after === 'string', 'Invalid Development value.');
          if (row.destination === 'development.goal') after.goal = row.after;
          else {
            const match = /^development\.options\[([0-2])\]\.inputs\.(participants|sessions|hours|fee|additionalFees|hourlyCost)$/.exec(row.destination);
            check(match && after.options[Number(match[1])], 'Unsupported Development destination.');
            after.options[Number(match[1])].inputs[match[2] as keyof typeof after.options[0]['inputs']] = row.after;
          }
        }
        development = {before, after}; patch.development = after as Json;
      }
      if (changes.some(row => row.destination.startsWith('workforceSolution.'))) {
        const solution = readWorkforceSolution(context.destination.workforceSolution); check(solution, 'Missing workforce destination.');
        const prior = currentSolutionVersion(solution), inputs = structuredClone(prior.inputs);
        for (const row of changes.filter(row => row.destination.startsWith('workforceSolution.'))) {
          const mapping = workforceInputGroups.flatMap(([section, , fields]) => fields.map(([field]) => ({section, field}))).find(item => row.destination === `workforceSolution.${item.section}.${item.field}`);
          check(mapping && typeof row.after === 'string', 'Unsupported workforce destination.');
          inputs[mapping.section][mapping.field] = row.after;
        }
        const next = reviseWorkforceSolution(solution, prior.version, inputs, 'conversation', `Applied reviewed Action Plan attachment ${context.attachmentId}`, at);
        check(readWorkforceSolution(next) && currentSolutionVersion(next).version === prior.version + 1, 'Workforce version could not be appended.');
        workforce = {solutionId: solution.id, beforeVersion: prior.version, afterVersion: prior.version + 1}; patch.workforceSolution = next as unknown as Json;
      }
      check(Object.keys(patch).length > 0, 'No supported destination changes selected.');
      receipt = {version: 1, id, appliedAt: at, binding: structuredClone(preview.binding), destinationRevisionBefore: context.destination.revision,
        destinationRevisionAfter: context.destination.revision + 1, changes: structuredClone(changes),
        skipped: preview.rows.filter(row => row.status !== 'fill' && row.status !== 'replace').map(row => ({destination: row.destination, status: row.status, reason: row.reason})),
        development, workforce};
      history.receipts.push(receipt);
      check(readApplicationHistory(history), 'Application history exceeds its limit or cannot be validated.');
      patch[applicationHistoryField] = history as unknown as Json;
      return patch;
    });
    check(receipt, 'Application receipt is missing.'); return structuredClone(receipt);
  } finally {inFlight.delete(store)}
}
