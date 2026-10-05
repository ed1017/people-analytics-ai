// Local review only. No storage patch, calculation result, apply receipt or model request.
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleWorkspace, type BundleAttachment} from './home-bundle-records.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft, bundleInputKey, type BundleDraft, type Assumption} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey, validActionBinding, type ActionBinding} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {plain, exactKeys} from './home-action-proposal.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson, type Json} from './local-decisions.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {developmentCatalog, validateQuote, type DevelopmentQuote, type DevelopmentInputs} from './development-costs.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readWorkforceSolution, currentSolutionVersion} from './workforce-solution.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {workforceInputGroups} from './workforce-guided-intake.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {emptyWorkforcePlanInput, workforcePlanInputIssues, workforceArrivalIssues} from './workforce-increment.ts';
import type {WorkforcePlanField} from './workforce-increment';
import type {DevelopmentSession} from '../components/development-workspace';

export type ApplicationSource = {attachmentId: string; bindingKey: string; inputKey: string};
export type DevelopmentApplicationTarget = {
  componentId: string; optionIndex: number;
  // A quote has no component/population metadata: compatibility must be reviewed explicitly.
  quoteReview: null | {source: ApplicationSource; componentId: string; optionIndex: number; quoteKey: string; scopeKey: string;
    confirmedCompatible: true; loadedHourlyCostCompatible: boolean};
};
export type CapacityApplicationReview = {
  source: ApplicationSource; solutionId: string; version: number; confirmedAdditionalCapacity: true;
};
export type ApplicationDestination = {
  goalId: string;
  // Use DecisionData.revision. Development has no independent version counter.
  revision: number;
  development: DevelopmentSession | null;
  workforceSolution: unknown;
  selectedPlanningScenario: string | null;
  headcount: number | null;
};
export type ApplicationContext = {
  binding: ActionBinding; workspace: unknown; attachmentId: string;
  currentDraft: BundleDraft; destination: ApplicationDestination;
  developmentTarget: DevelopmentApplicationTarget | null;
  capacityReview: CapacityApplicationReview | null;
};
export type ApplicationChoice = 'preserve' | 'fill-empty' | 'replace';
export type ApplicationChoices = Record<string, ApplicationChoice>;
export type ApplicationProvenance = {
  sourcePath: string; kind: 'user-entered' | 'illustrative' | 'adopted' | 'simulated' | 'user-provided' | 'attachment';
  basis: string | null;
};
export type ApplicationRow = {
  destination: string; current: Json; proposed: Json; after: Json;
  unit: string; choice: ApplicationChoice;
  status: 'preserved' | 'unchanged' | 'fill' | 'replace' | 'missing' | 'blocked' | 'read-only';
  conflict: boolean; reason: string | null; provenance: ApplicationProvenance[];
};
export type ApplicationPreview = {
  version: 1; mode: 'local-preview-only';
  binding: ApplicationSource & {goalId: string; goal: string; revision: number; sourceIds: string[];
    destinationRevision: number; solutionId: string | null; solutionVersion: number | null; contextKey: string};
  rows: ApplicationRow[]; missing: string[]; conflicts: string[]; blockers: string[];
  selectedChanges: string[]; limitations: string[];
};

const canonical = (value: unknown): string => JSON.stringify(value, (_, item) =>
  plain(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (left: unknown, right: unknown) => canonical(left) === canonical(right);
const empty = (value: Json) => value === null || typeof value === 'string' && !value.trim();
function requireValue(condition: unknown, message: string): asserts condition {if (!condition) throw Error(message)}
function bounded(value: unknown, limit: number) {
  requireValue(validateJson(value) && new TextEncoder().encode(JSON.stringify(value)).length <= limit, 'Invalid or oversized application preview input.');
}
const reviewed = (assumption: Assumption<unknown>) => assumption.value !== null && ['user-entered', 'adopted'].includes(assumption.kind);
const origin = (sourcePath: string, assumption: Assumption<unknown>): ApplicationProvenance[] =>
  assumption.kind === 'unknown' ? [] : [{sourcePath, kind: assumption.kind, basis: assumption.basis}];
export const actionPlanQuoteKey = (quote: DevelopmentQuote) => canonical(quote);
export const actionPlanDevelopmentScopeKey = (draft: BundleDraft) => canonical([draft.inputs.scope.population.value, draft.inputs.scope.businessUnit.value,
  draft.inputs.scope.jobProfile.value, draft.inputs.scope.startMonth.value, draft.inputs.scope.months.value, draft.inputs.scope.currency]);
export const actionPlanApplicationSource = (attachment: BundleAttachment): ApplicationSource => ({
  attachmentId: attachment.id, bindingKey: actionBindingKey(attachment.draft.binding), inputKey: bundleInputKey(attachment.draft),
});

const inputFields: (keyof DevelopmentInputs)[] = ['participants', 'sessions', 'hours', 'fee', 'additionalFees', 'hourlyCost'];
const developmentBounds: Record<keyof DevelopmentInputs, {max: number; positive?: boolean; whole?: boolean}> = {
  participants: {max: 10000, positive: true, whole: true}, sessions: {max: 1000, positive: true, whole: true},
  hours: {max: 100, positive: true}, fee: {max: 1000000}, additionalFees: {max: 1000000}, hourlyCost: {max: 1000000},
};
const workforceUnits: Record<WorkforcePlanField, string> = {
  businessUnit: 'governed business-unit ID', jobProfile: 'governed job-profile ID', intent: 'additional capacity',
  roles: 'additional roles', build: 'existing employees after development', move: 'existing employees moved', buy: 'external hires', backfills: 'external backfills',
  planningMonth: 'YYYY-MM', months: 'months', recruitingStart: 'YYYY-MM-DD', arrivalMode: 'arrival assumption', arrivalDate: 'YYYY-MM-DD',
  buildMonth: 'YYYY-MM', moveMonth: 'YYYY-MM', backfillDate: 'YYYY-MM-DD', annualHireCost: 'USD/external hire/year (loaded)',
  hireFee: 'USD/external hire (one-time)', annualBackfillCost: 'USD/backfill/year (loaded)', backfillFee: 'USD/backfill (one-time)',
  internalAnnualCostChange: 'USD/internal cohort/year (total uplift)', trainingCash: 'USD total training cash',
  trainingHours: 'total employee training hours', loadedHourlyCost: 'USD/loaded employee hour', budget: 'USD incremental cash over horizon',
  maxAddedEmployees: 'maximum additional employees including backfills', deadlineMonth: 'YYYY-MM',
};
function validSourceReference(value: unknown): value is ApplicationSource {
  const reference = plain(value);
  return !!reference && exactKeys(reference, ['attachmentId', 'bindingKey', 'inputKey']) && Object.values(reference).every(item => typeof item === 'string');
}
function validateSelections(context: ApplicationContext) {
  const target = context.developmentTarget, review = target?.quoteReview, capacity = context.capacityReview;
  requireValue(target === null || plain(target) && exactKeys(target, ['componentId', 'optionIndex', 'quoteReview']) && typeof target.componentId === 'string' &&
    Number.isSafeInteger(target.optionIndex) && target.optionIndex >= 0 && target.optionIndex < 3, 'Select one existing Development option and an exact Action Plan component.');
  requireValue(!target || review === null || review && plain(review) && exactKeys(review, ['source', 'componentId', 'optionIndex', 'quoteKey', 'scopeKey', 'confirmedCompatible', 'loadedHourlyCostCompatible']) &&
    validSourceReference(review.source) && typeof review.quoteKey === 'string' && typeof review.scopeKey === 'string' &&
    typeof review.componentId === 'string' && Number.isSafeInteger(review.optionIndex) && review.optionIndex >= 0 && review.optionIndex < 3 &&
    review.confirmedCompatible === true && typeof review.loadedHourlyCostCompatible === 'boolean', 'Invalid explicit quote compatibility review.');
  requireValue(capacity === null || plain(capacity) && exactKeys(capacity, ['source', 'solutionId', 'version', 'confirmedAdditionalCapacity']) &&
    validSourceReference(capacity.source) && typeof capacity.solutionId === 'string' && Number.isSafeInteger(capacity.version) && capacity.version > 0 &&
    capacity.confirmedAdditionalCapacity === true, 'Invalid explicit capacity review.');
}
function quoteShape(value: unknown): value is DevelopmentQuote {
  const quote = plain(value);
  return !!quote && exactKeys(quote, ['id', 'provider', 'kind', 'focus', 'format', 'hours', 'sessions', 'capacity', 'currency', 'basis', 'fee', 'provenance']) &&
    Object.values(quote).every(value => typeof value === 'string' && value.length <= 300) &&
    ['Training', 'Leadership coaching'].includes(String(quote.kind)) && ['USD', 'EUR', 'GBP'].includes(String(quote.currency)) &&
    ['person', 'cohort'].includes(String(quote.basis)) && ['simulated', 'user-provided'].includes(String(quote.provenance));
}
function validDevelopment(value: DevelopmentSession | null) {
  if (value === null) return;
  const session = plain(value);
  requireValue(session && exactKeys(session, ['custom', 'draft', 'goal', 'selected', 'options']) &&
    typeof value.goal === 'string' && value.goal.length <= 300 && typeof value.selected === 'string' && value.selected.length <= 300 &&
    quoteShape(value.draft) && Array.isArray(value.custom) && value.custom.length <= 5 && value.custom.every(quoteShape) &&
    new Set(value.custom.map(quote => quote.id)).size === value.custom.length &&
    value.custom.every(quote => quote.id && !developmentCatalog.some(item => item.id === quote.id)) &&
    Array.isArray(value.options) && value.options.length <= 3 && value.options.every(option => plain(option) &&
      exactKeys(option, ['quote', 'goal', 'inputs']) && quoteShape(option.quote) && typeof option.goal === 'string' &&
      option.goal.length <= 300 && plain(option.inputs) && exactKeys(option.inputs, inputFields) &&
      Object.values(option.inputs).every(input => typeof input === 'string' && input.length <= 16)),
  'Invalid Development destination; existing values must be retained.');
}

function sourceFor(context: ApplicationContext) {
  requireValue(validActionBinding(context.binding), 'Invalid goal binding.');
  const workspace = readBundleWorkspace(context.workspace, context.binding.goalId);
  const attachment = workspace?.attachments.find(item => item.id === context.attachmentId);
  requireValue(workspace && attachment, 'Select a verifiable saved Action Plan attachment.');
  requireValue(!workspace.attachments.some(item => item.supersedes === attachment.id), 'This attachment was superseded; review the current attachment.');
  requireValue(actionBindingKey(context.binding) === actionBindingKey(attachment.draft.binding), 'Goal, evidence or planning context changed; prepare a fresh preview.');
  const current = readBundleDraft(context.currentDraft);
  requireValue(current && same(current, attachment.draft), 'The current Action Plan draft differs from the attachment; attach the reviewed revision first.');
  requireValue(!workspace.drafts.some(draft => draft.bundle.id === current.bundle.id &&
    (draft.revision > current.revision || draft.revision === current.revision && !same(draft, current))),
  'A newer or different Action Plan draft is saved; review it first.');
  const destination = context.destination;
  requireValue(destination.goalId === context.binding.goalId && Number.isSafeInteger(destination.revision) && destination.revision >= 0,
    'The destination goal or local revision is invalid.');
  requireValue(destination.selectedPlanningScenario === null || typeof destination.selectedPlanningScenario === 'string', 'Invalid scenario reference.');
  requireValue(destination.headcount === null || Number.isSafeInteger(destination.headcount) && destination.headcount >= 0, 'Invalid read-only headcount.');
  validDevelopment(destination.development);
  const solution = destination.workforceSolution === null ? null : readWorkforceSolution(destination.workforceSolution);
  requireValue(destination.workforceSolution === null || solution, 'Invalid workforce destination; existing history must be retained.');
  requireValue(!solution || solution.goalId === destination.goalId, 'The workforce destination belongs to another goal.');
  return {attachment, draft: attachment.draft, source: actionPlanApplicationSource(attachment), solution};
}

/** Describe a reviewed local edit. The caller gets rows, never a writable destination or patch. */
export async function previewActionPlanApplication(context: ApplicationContext, choices: ApplicationChoices = {}): Promise<ApplicationPreview> {
  bounded(context, 800 * 1024);
  bounded(choices, 16 * 1024);
  context = structuredClone(context);
  choices = structuredClone(choices);
  const {attachment, draft, source, solution} = sourceFor(context);
  validateSelections(context);
  requireValue(plain(choices) && Object.values(choices).every(choice => ['preserve', 'fill-empty', 'replace'].includes(choice)), 'Unsupported application policy; use preserve, fill-empty or an individually selected replace.');
  const rows: ApplicationRow[] = [], blockers: string[] = [];
  const add = (destination: string, current: Json, proposed: Json, unit: string, provenance: ApplicationProvenance[] = [],
    reason: string | null = null, restriction: 'blocked' | 'read-only' | null = null) => {
    const choice = choices[destination] ?? 'preserve', conflict = !empty(current) && !empty(proposed) && !same(current, proposed);
    let status: ApplicationRow['status'] = restriction ?? (empty(proposed) ? 'missing' : same(current, proposed) ? 'unchanged' :
      choice === 'replace' ? 'replace' : choice === 'fill-empty' && empty(current) ? 'fill' : 'preserved');
    if (restriction && choice !== 'preserve') {status = 'blocked'; blockers.push(`${destination}: ${reason}`);}
    rows.push({destination, current, proposed, after: status === 'fill' || status === 'replace' ? proposed : current,
      unit, choice, status, conflict, reason, provenance});
  };
  const development = context.destination.development, target = context.developmentTarget;
  const goalOrigin: ApplicationProvenance[] = [{sourcePath: 'draft.binding.goal', kind: 'attachment', basis: 'Exact saved goal; no goal switch.'}];
  const goalMismatch = development && development.goal.trim() && development.goal !== draft.binding.goal;
  add('development.goal', development?.goal ?? null, draft.binding.goal, 'goal text', goalOrigin,
    !development ? 'No existing Development session is selected.' : goalMismatch ? 'Development has a different goal; it cannot be replaced by this preview.' : null,
    !development || goalMismatch ? 'blocked' : null);
  const option = target && development ? development.options[target.optionIndex] : null;
  const component = draft.bundle.components.find(item => item.id === target?.componentId);
  const prefix = target ? `development.options[${target.optionIndex}]` : 'development.options[unselected]';
  const targetIssue = !target || !option ? 'Select an existing Development option; this preview never adds or replaces quote options.' :
    !component || !['learning', 'manager_workload'].includes(component.domain) ? 'Select a learning or manager/workload component.' :
    goalMismatch || option.goal !== draft.binding.goal ? 'Development option and session must belong to this exact goal.' : null;
  const quote = option?.quote, review = target?.quoteReview;
  const selectedQuote = development ? [...developmentCatalog, ...development.custom].find(item => item.id === development.selected) : null;
  const quoteIssue = targetIssue ?? (!review || review.confirmedCompatible !== true || !same(review.source, source) ? 'No exact reviewed quote-to-component binding; the Action Plan has no quote identity.' :
    review.componentId !== target!.componentId || review.optionIndex !== target!.optionIndex ? 'Quote review belongs to a different component or destination option.' :
    !quote || !selectedQuote || !same(selectedQuote, quote) || actionPlanQuoteKey(quote) !== review.quoteKey ? 'The explicitly selected quote differs from this option or the reviewed quote snapshot.' :
    review.scopeKey !== actionPlanDevelopmentScopeKey(draft) ? 'Reviewed quote scope differs from this Action Plan.' :
    validateQuote(quote).length ? 'Selected quote values are invalid.' :
    quote.currency !== draft.inputs.scope.currency ? 'Quote currency differs; no currency conversion is supported.' : null);
  const quoteOrigin = (field: string): ApplicationProvenance[] => quote ? [{sourcePath: `${prefix}.quote.${field}`, kind: quote.provenance,
    basis: quote.provenance === 'simulated' ? 'Fictional provider; simulated quote retained without verification.' : 'User-provided quote; unverified.'}] : [];
  add('development.selected', development?.selected ?? null, quoteIssue ? null : quote!.id, 'quote identity', quoteOrigin('id'),
    quoteIssue ?? 'Existing selected quote retained; no new quote identity is created.', quoteIssue ? 'blocked' : 'read-only');
  add(`${prefix}.quote`, quote as Json ?? null, quoteIssue ? null : quote as Json, 'original quote snapshot (currency and fee basis retained)', quoteOrigin('id'),
    quoteIssue ?? 'Provider, quote terms and provenance are read-only in this checkpoint.', quoteIssue ? 'blocked' : 'read-only');
  for (const field of ['sessions', 'hours', 'fee'] as const) {
    add(`${prefix}.inputs.${field}`, option?.inputs[field] ?? null, quoteIssue ? null : quote![field],
      field === 'sessions' ? 'sessions per participant' : field === 'hours' ? 'hours per participant per session' : `${quote?.currency ?? 'unknown currency'}/${quote?.basis ?? 'unknown unit'}/session`,
      quoteOrigin(field), quoteIssue, quoteIssue ? 'blocked' : null);
  }
  const membership = draft.inputs.memberships.find(item => item.componentId === component?.id);
  const groups = membership?.groupIds.map(id => draft.inputs.groups.find(item => item.id === id)!) ?? [];
  const populationIssue = targetIssue ?? (!membership || membership.complete.value !== true || !reviewed(membership.complete) || !groups.length ?
    'Review the complete membership of this component.' : groups.some(group => !reviewed(group.count)) ? 'Unique group counts are missing or illustrative; review them first.' :
    draft.inputs.groupsDisjoint.value !== true || !reviewed(draft.inputs.groupsDisjoint) ? 'Unresolved group overlap blocks participant mapping.' :
    !reviewed(draft.inputs.scope.population) ? 'Review this component population scope first.' : null);
  const participants = groups.reduce((sum, group) => sum + (group.count.value ?? 0), 0);
  const countIssue = populationIssue ?? (participants < 1 || participants > 10000 ? 'Participant count is outside the existing Development range (1–10,000).' : null);
  add(`${prefix}.inputs.participants`, option?.inputs.participants ?? null, countIssue ? null : String(participants), 'unique participants in selected component',
    [...groups.flatMap(group => origin(`draft.inputs.groups[${group.id}].count`, group.count)),
      ...origin('draft.inputs.groupsDisjoint', draft.inputs.groupsDisjoint), ...origin('draft.inputs.scope.population', draft.inputs.scope.population),
      ...(membership ? origin(`draft.inputs.memberships[${membership.componentId}].complete`, membership.complete) : [])], countIssue, countIssue ? 'blocked' : null);
  const capacity = draft.inputs.capacity, hourly = capacity?.input.loadedHourlyCost;
  const hourlyOrigin = capacity?.origins.loadedHourlyCost;
  const hourlyIssue = quoteIssue ?? (!review?.loadedHourlyCostCompatible ? 'Review the same population and loaded USD/hour basis before copying the rate.' :
    !capacity || !capacity.flows.some(flow => flow.path === 'build' && flow.componentIds.includes(component!.id) && membership?.groupIds.includes(flow.groupId ?? '')) ? 'No compatible Build component and population carry this loaded hourly rate.' :
    !hourly ? 'No explicit loaded hourly rate; totals and annual wages cannot supply it.' :
    !/^\d+(\.\d{1,2})?$/.test(hourly) || Number(hourly) > 1000000 ? 'Loaded hourly rate exceeds Development units or bounds.' : null);
  add(`${prefix}.inputs.hourlyCost`, option?.inputs.hourlyCost ?? null, hourlyIssue ? null : hourly!, 'USD/loaded employee hour',
    hourlyOrigin && hourlyOrigin.kind !== 'unknown' ? [{sourcePath: 'draft.inputs.capacity.input.loadedHourlyCost', kind: hourlyOrigin.kind, basis: hourlyOrigin.basis}] : [], hourlyIssue, hourlyIssue ? 'blocked' : null);
  add(`${prefix}.inputs.additionalFees`, option?.inputs.additionalFees ?? null, null, `${quote?.currency ?? 'unknown currency'} total additional fees`, [],
    'The shared cash ledger does not identify quote-specific additional fees; do not copy totals or default to zero.');
  const developmentRows = rows.filter(row => row.destination.startsWith(`${prefix}.inputs.`));
  if (developmentRows.some(row => row.status === 'fill' || row.status === 'replace')) {
    const invalid = inputFields.filter(field => {
      const value = developmentRows.find(row => row.destination === `${prefix}.inputs.${field}`)!.after;
      if (empty(value)) return false;
      const bound = developmentBounds[field], amount = Number(value);
      return typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value) || amount > bound.max ||
        bound.positive && amount === 0 || bound.whole && !Number.isInteger(amount);
    });
    if (invalid.length) {
      blockers.push(`Selected Development inputs are invalid: ${invalid.join(', ')}.`);
      for (const row of developmentRows) if (row.status === 'fill' || row.status === 'replace') {
        row.status = 'blocked'; row.after = row.current; row.reason = 'Review the invalid existing Development inputs before selecting changes.';
      }
    }
  }

  const version = solution ? currentSolutionVersion(solution) : null, capacityReview = context.capacityReview;
  let capacityIssue = !solution || !version ? 'Select an existing versioned local workforce solution.' :
    !capacity ? 'This attachment has no single-role capacity input.' :
    !capacityReview || capacityReview.confirmedAdditionalCapacity !== true || !same(capacityReview.source, source) ||
      capacityReview.solutionId !== solution.id || capacityReview.version !== version.version ? 'Confirm additional capacity for this exact attachment and destination version.' :
    solution.pending ? 'A workforce calculation is pending; preview again after it finishes or is cancelled.' :
    solution.versions.length >= 50 ? 'Workforce version limit reached; retain the existing history.' :
    version.inputs.scope.goalStatement !== draft.binding.goal ? 'Workforce solution has a different or missing goal statement.' :
    !reviewed(draft.inputs.scope.capacityRequired) || draft.inputs.scope.capacityRequired.value !== true ? 'Additional capacity must be explicitly reviewed.' : null;
  if (!capacityIssue && capacity && version) {
    const incompatibleAdapter = workforceInputGroups.some(([section, , fields]) => fields.some(([field]) =>
      Object.entries(version.inputs).some(([savedSection, values]) => Object.hasOwn(values, field) &&
        (savedSection !== section || typeof values[field] !== 'string'))));
    if (incompatibleAdapter) capacityIssue = 'Workforce fields do not match the existing string-input adapter; retain this destination unchanged.';
    const mismatch = ['businessUnit', 'jobProfile', 'intent', 'planningMonth', 'months'].some(field => {
      const current = version.inputs.scope[field]; return current !== undefined && current !== '' && current !== capacity.input[field as keyof typeof capacity.input];
    });
    if (mismatch) capacityIssue = 'Workforce scope or horizon differs; this preview cannot replace another scope.';
    const internalFlows = capacity.flows.filter(flow => flow.path === 'build' || flow.path === 'move');
    if (internalFlows.length > 1 && (!reviewed(draft.inputs.groupsDisjoint) || draft.inputs.groupsDisjoint.value !== true))
      capacityIssue = 'Unresolved internal group overlap blocks capacity mapping.';
  }
  add('workforceSolution.scope.goalStatement', version?.inputs.scope.goalStatement ?? null, draft.binding.goal, 'goal text', goalOrigin,
    capacityIssue ?? 'Exact goal statement retained.', capacityIssue ? 'blocked' : 'read-only');
  for (const [section, , fields] of workforceInputGroups) for (const [field] of fields) {
    const provenance = capacity?.origins[field];
    add(`workforceSolution.${section}.${field}`, version?.inputs[section][field] ?? null, capacity?.input[field] || null,
      workforceUnits[field],
      provenance && provenance.kind !== 'unknown' ? [{sourcePath: `draft.inputs.capacity.input.${field}`, kind: provenance.kind, basis: provenance.basis}] : [],
      capacityIssue, capacityIssue ? 'blocked' : null);
  }
  // Individual fill/replace choices can form an invalid mix even if the source is valid.
  const capacityRows = rows.filter(row => row.destination.startsWith('workforceSolution.'));
  if (capacityRows.some(row => row.status === 'fill' || row.status === 'replace') && version) {
    const candidate = emptyWorkforcePlanInput();
    for (const [section, , fields] of workforceInputGroups) for (const [field] of fields) {
      const value = capacityRows.find(row => row.destination === `workforceSolution.${section}.${field}`)!.after;
      candidate[field] = typeof value === 'string' ? value : '';
    }
    const issues = workforcePlanInputIssues(candidate);
    if (!issues.length) issues.push(...workforceArrivalIssues(candidate, candidate.arrivalDate || null, candidate.backfillDate || null));
    if (candidate.arrivalMode === 'historical-median') blockers.push('Selected workforce inputs require historical evidence; this preview cannot resolve that timing.');
    blockers.push(...issues.map(issue => `Selected workforce inputs: ${issue.message}`));
    if (issues.length || candidate.arrivalMode === 'historical-median') for (const row of capacityRows) if (row.status === 'fill' || row.status === 'replace') {
      row.status = 'blocked'; row.after = row.current; row.reason = 'The selected fields do not form a valid local capacity plan; review the complete mix.';
    }
  }
  add('selectedPlanningScenario', context.destination.selectedPlanningScenario, null, 'catalogue scenario identity', [],
    'Action Plan option IDs A/B/C are not catalogue scenario IDs.', 'read-only');
  add('headcount', context.destination.headcount, null, 'API-backed workforce headcount', [],
    'Source headcount is read-only. Planned buys/backfills remain local capacity assumptions; internal moves add no company employees.', 'read-only');
  for (const key of Object.keys(choices)) requireValue(rows.some(row => row.destination === key), `Unsupported destination field: ${key}`);
  const contextKey = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical({context, choices}))))).map(byte => byte.toString(16).padStart(2, '0')).join('');
  return structuredClone({version: 1, mode: 'local-preview-only', binding: {...source, goalId: draft.binding.goalId, goal: draft.binding.goal,
    revision: draft.revision, sourceIds: [...new Set(draft.bundle.components.flatMap(item => item.evidence))].sort(),
    destinationRevision: context.destination.revision, solutionId: solution?.id ?? null, solutionVersion: version?.version ?? null, contextKey},
    rows, missing: rows.filter(row => empty(row.proposed) && row.status !== 'read-only').map(row => row.destination),
    conflicts: rows.filter(row => row.conflict).map(row => row.destination), blockers,
    selectedChanges: rows.filter(row => row.status === 'fill' || row.status === 'replace').map(row => row.destination),
    limitations: [...attachment.result.issues, ...attachment.result.limitations,
      'Preview only: no destination writes, option additions, source edits, recalculation, vendor contact or operational approval.',
      'A future apply must re-read live saved and unsaved state, recheck this preview, preserve history/provenance and use a reviewed atomic commit contract.'],
  });
}

/** Rebuild against fresh caller-supplied state; changed rows, reviews or policies also invalidate a preview. */
export async function actionPlanApplicationPreviewIsCurrent(preview: unknown, context: ApplicationContext, choices: ApplicationChoices = {}): Promise<boolean> {
  try {bounded(preview, 800 * 1024); return same(preview, await previewActionPlanApplication(context, choices));} catch {return false}
}
