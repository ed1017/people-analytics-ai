/** Home assumptions are a distinct source, never synthetic saved workforce evidence. */
// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft, bundleInputKey, type BundleDraft, type CapacityMix, type Assumption} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planCashEstimate, type PlanCashEstimate} from './home-plan-cash.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {workforcePlanInputIssues, workforceArrivalIssues, type WorkforcePlanInput} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {canonical, freeze, preflightWorkforceMixes, workforceSearchCalculator, type WorkforceMixSearchSpec} from './workforce-mix-search-core.ts';

export const homeMixMethodVersion = 'home-assumption-mix-v1' as const;
export const homeMixProjectionVersion = 'complete-cash-staff-hours-v1' as const;
export type HomeMixPath = 'build' | 'move' | 'buy';
export type HomeMixBounds = Record<HomeMixPath, Assumption<{min: number; max: number}>>;
export type HomeMixObjective = 'lowest-complete-cash' | 'earliest-coverage' | 'lowest-staff-hours' | 'fewest-added-employees';
export type HomeMixStaffingBasis = {
  unit: Assumption<'whole-positions' | 'fte'>;
  paidFraction: Assumption<number>;
  currency: Assumption<string>;
};
export type HomeMixRequest = {
  draft: BundleDraft;
  /** Explicit Home assumptions and path mappings, if the draft has no capacity input yet. */
  capacity?: CapacityMix;
  bounds?: HomeMixBounds;
  objective?: HomeMixObjective;
  maxStaffHours?: Assumption<number>;
  staffingBasis?: HomeMixStaffingBasis;
  maxEvaluations?: number;
  maxResults?: number;
};
export type HomeMixMissingInput = {dimension: string; reason: string};
export type HomeMixSource = {
  kind: 'home-assumptions'; schemaVersion: 1; costPolicy: 'cash-hours-v2';
  request: HomeMixRequest; draft: BundleDraft; input: WorkforcePlanInput;
  bounds: HomeMixBounds; staffingBasis: HomeMixStaffingBasis;
  objective: {kind: HomeMixObjective; basis: 'explicit' | 'default'; label: string};
  binding: BundleDraft['binding'] & {bundleId: string; bundleSignature: string; revision: number; inputKey: string};
  dimensions: {unit: 'whole-positions'; currency: 'USD'; population: string; businessUnit: string; jobProfile: string; roles: number; startMonth: string; months: number; scenario: unknown; successMeasure: unknown};
};
export type ReadyHomeMixContext = {
  status: 'ready'; source: HomeMixSource; sourceFingerprint: string; spec: WorkforceMixSearchSpec;
};
export type HomeMixContext = ReadyHomeMixContext
  | {status: 'not-applicable'; reason: string}
  | {status: 'needs-inputs'; missing: HomeMixMissingInput[]; assumptions: BundleDraft['inputs']; cashEstimate: PlanCashEstimate | null; bounds: HomeMixBounds | null};

export async function homeMixFingerprint(value: unknown): Promise<string> {
  if (!globalThis.crypto?.subtle) throw Error('Local Home mix verification requires Web Crypto; no network fallback is available.');
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
const assumed = <T>(value: T, basis: string): Assumption<T> => ({value, kind: 'illustrative', basis});
const known = (value: Assumption<unknown> | undefined) => !!value && value.value !== null && ['user-entered', 'illustrative', 'adopted'].includes(value.kind) && typeof value.basis === 'string' && !!value.basis.trim();
const objectiveLabels: Record<HomeMixObjective, string> = {
  'lowest-complete-cash': 'lowest complete incremental cash among feasible candidates',
  'earliest-coverage': 'earliest conditional role coverage among feasible candidates',
  'lowest-staff-hours': 'lowest known combined staff hours among feasible candidates',
  'fewest-added-employees': 'fewest added employees among feasible candidates',
};
export const homeMixIdentity = (source: HomeMixSource, spec: WorkforceMixSearchSpec) => ({
  source, spec, methodVersion: homeMixMethodVersion, projectionVersion: homeMixProjectionVersion, calculator: workforceSearchCalculator,
});

/** Collect existing scoped assumptions. No model, storage, evidence IDs or inferred salary quotes. */
export async function resolveHomeMixContext(request: HomeMixRequest): Promise<HomeMixContext> {
  const draft = structuredClone(request.draft), missing: HomeMixMissingInput[] = [];
  const add = (dimension: string, reason: string) => missing.push({dimension, reason});
  let bounds = request.bounds ? structuredClone(request.bounds) : null;
  const needs = (): HomeMixContext => {
    let cashEstimate: PlanCashEstimate | null = null;
    try { cashEstimate = planCashEstimate(draft); } catch { /* Invalid/unsupported scope is never a cash estimate. */ }
    return freeze({status: 'needs-inputs' as const, missing, assumptions: structuredClone(draft.inputs), cashEstimate, bounds});
  };
  if (!draft?.inputs?.scope) throw Error('Supply a Home draft with its exact goal/evidence binding.');
  const scope = draft.inputs.scope;
  if (scope.capacityRequired.value === false && !draft.inputs.capacity && draft.inputs.whatIf?.kind !== 'capacity' && !request.capacity)
    return freeze({status: 'not-applicable', reason: 'This goal has no additional whole-position capacity requirement.'});
  if (scope.currency !== 'USD') add('currency', 'The calculator requires USD costs; no currency conversion is inferred.');
  if (!readBundleDraft(draft)) add('draft', 'Review the exact Home binding, scope, revision, dimensions and assumption provenance.');
  if (draft.inputs.costPolicy !== 'cash-hours-v2') add('costPolicy', 'Create a current cash-hours-v2 proposal; historical records remain unchanged.');
  if (draft.inputs.whatIf?.kind === 'turnover') add('dimensions', 'Turnover rates, denominators and periods cannot be ranked as staffing coverage.');
  if (request.capacity && draft.inputs.capacity && canonical(request.capacity) !== canonical(draft.inputs.capacity))
    add('capacity', 'Revise the existing staffing assumptions explicitly before searching a different input.');
  const capacity = request.capacity ?? draft.inputs.capacity;
  if (!capacity) {
    add('capacity', 'Supply explicit Build/Move/Buy assumptions, annual paid-position rates, recruiting fees and whole-flow component mappings.');
    add('schedule', 'Supply arrival/effective dates and the paid work schedule; a monthly role allowance is not a staffing schedule.');
    return needs();
  }
  const input = structuredClone(capacity.input);
  const basis = request.staffingBasis ?? {
    unit: assumed('whole-positions' as const, 'Existing staffing calculator contract: whole positions, not fractional FTE.'),
    paidFraction: assumed(1, 'Existing staffing calculator rates cover one fully paid position; no part-time scaling.'),
    currency: assumed('USD', 'Existing staffing calculator annual rate and recruiting fee contract is USD.'),
  };
  if (!known(basis.unit) || basis.unit.value !== 'whole-positions') add('roleUnit', 'Use whole positions; FTE dimensions require a separate supported mapping.');
  if (!known(basis.paidFraction) || basis.paidFraction.value !== 1) add('paidFraction', 'A missing or fractional paid schedule cannot be replaced by full-position payroll.');
  if (!known(basis.currency) || basis.currency.value !== 'USD') add('currency', 'Supply supported USD rates; no currency conversion is inferred.');
  if (!request.staffingBasis && /\b(?:FTEs?|part[- ]time|stagger\w*|phased)\b|\b\d+(?:\.\d+)?\s*(?:%|hours?\s+per\s+week)/i.test(draft.binding.goal))
    add('schedule', 'This goal requires an explicit whole-position and paid schedule review.');
  if (scope.capacityRequired.value !== true) add('capacityRequired', 'Confirm additional role capacity is required for this scoped plan.');
  for (const [field, value] of Object.entries({businessUnit: scope.businessUnit.value, jobProfile: scope.jobProfile.value, planningMonth: scope.startMonth.value}))
    if (!value || value !== input[field as keyof WorkforcePlanInput]) add(field, 'Staffing input must match the current shared Home scope.');
  if (!scope.population.value) add('population', 'Supply the shared population.');
  if (scope.demand.value !== Number(input.roles) || scope.months.value !== Number(input.months)) add('dimensions', 'Whole-role demand and horizon must match the shared Home scope.');
  const scenario = draft.inputs.whatIf;
  if (scenario && (scenario.target.value !== Number(input.roles) || scenario.scopeKey !== JSON.stringify([scope.population.value, scope.startMonth.value, scope.months.value])))
    add('dimensions', 'The scenario target or horizon differs from the staffing requirement.');
  if (input.arrivalMode === 'historical-median') add('schedule', 'Home assumptions require explicit arrival dates; saved historical evidence uses the saved-source facade.');
  for (const issue of workforcePlanInputIssues(input)) add(issue.fields.join('.') || 'input', issue.message);
  if (missing.length) return needs();
  // Validate provenance/mappings without calculating, including mappings for currently inactive paths.
  const working = structuredClone(draft); working.inputs.capacity = structuredClone(capacity);
  if (!readBundleDraft(working)) { add('mapping', 'Staffing fields need provenance and unique, valid component/group mappings.'); return needs(); }
  const expenseIds = new Set([...draft.inputs.expenses.map(expense => expense.id), ...['hireStaffingCost', 'backfillStaffingCost', 'internalSalaryUplift', 'recruitingFees', 'trainingCash', 'employeeTimeValue'].map(field => `capacity:${field}`)]);
  if (draft.inputs.expenseLinks.some(link => !expenseIds.has(link.expenseId))) add('costMapping', 'A component cost link refers to an unavailable source. Review its whole-source ownership.');
  const roles = Number(input.roles);
  if (!bounds) bounds = Object.fromEntries((['build', 'move', 'buy'] as const).map(path => {
    const flow = capacity.flows.find(item => item.path === path), group = draft.inputs.groups.find(item => item.id === flow?.groupId);
    const max = !flow ? 0 : path === 'buy' ? roles : Math.min(roles, group?.count.value ?? roles);
    return [path, assumed({min: 0, max}, flow ? 'Finite search assumption limited to mapped paths and stated group counts; not observed availability.' : 'Unmapped path excluded from these explicit search bounds; no availability is inferred.')];
  })) as HomeMixBounds;
  for (const path of ['build', 'move', 'buy'] as const) if (!known(bounds[path])) add(`bounds.${path}`, 'Supply finite bounds with their assumption provenance.');
  if (missing.length) return needs();
  let spec: WorkforceMixSearchSpec;
  try {
    const flight = preflightWorkforceMixes(roles, {build: bounds.build.value, move: bounds.move.value, buy: bounds.buy.value,
      maxEvaluations: request.maxEvaluations ?? 1000, maxResults: request.maxResults ?? 64,
      resultFilter: 'all', assumptionPolicy: 'preserve-reviewed-path-totals-and-timing'});
    spec = flight.spec;
    if (!flight.withinBudget) add('evaluationBudget', `Complete bounds require ${flight.calculatorInvocations} calculator invocations including reference; limit ${spec.maxEvaluations}. Narrow the bounds; no prefix is evaluated.`);
  } catch (error) { add('bounds', (error as Error).message); return needs(); }
  const active = (path: HomeMixPath) => spec[path].max > 0 || Number(input[path]) > 0;
  for (const path of ['build', 'move', 'buy', 'backfills'] as const) {
    const required = path === 'backfills' ? (active('build') || active('move')) && Number(input.backfills) > 0 : active(path);
    if (!required) continue;
    const flow = capacity.flows.find(item => item.path === path);
    if (!flow) { add(`mapping.${path}`, 'Every potentially active staffing path requires a whole-flow component mapping.'); continue; }
    if (path === 'build' || path === 'move') {
      const group = draft.inputs.groups.find(item => item.id === flow.groupId);
      if (!group || !known(group.count) || !['user-entered', 'adopted'].includes(group.count.kind)) add(`group.${path}`, 'Internal paths require a known, explicitly reviewed aggregate group count.');
      else if (Math.max(spec[path].max, Number(input[path])) > group.count.value!) add(`bounds.${path}`, 'Entered bounds exceed the mapped group count; explicit bounds are never silently narrowed.');
      if (!group || flow.componentIds.some(id => !draft.inputs.memberships.some(item => item.componentId === id && item.complete.value === true && item.groupIds.includes(group.id))))
        add(`membership.${path}`, 'Whole-flow components must include the mapped internal group in their reviewed participant coverage.');
    }
    const date = path === 'build' ? input.buildMonth : path === 'move' ? input.moveMonth : path === 'buy' ? input.arrivalDate : input.backfillDate;
    if (!date || path === 'buy' && input.arrivalMode !== 'explicit') add(`schedule.${path}`, 'Supply an explicit arrival/effective date for every potentially active path.');
  }
  if (active('build') || active('move')) if (!input.backfills) add('backfills', 'State the fixed external backfill count, including an explicit zero.');
  if (active('build') && active('move')) {
    const groups = capacity.flows.filter(flow => flow.path === 'build' || flow.path === 'move').map(flow => flow.groupId);
    if (groups.length !== 2 || new Set(groups).size !== 2 || draft.inputs.groupsDisjoint.value !== true) add('groupOverlap', 'Build and Move must use explicitly disjoint internal groups.');
  }
  for (const issue of workforceArrivalIssues(input, active('buy') ? input.arrivalDate || null : null,
    (active('build') || active('move')) && Number(input.backfills) > 0 ? input.backfillDate || null : null)) add('schedule', issue.message);
  if (draft.inputs.budget && draft.inputs.budget.basis.value !== 'cash') add('budgetBasis', 'Home searches compare complete incremental cash; supply a cash budget.');
  if (request.maxStaffHours && (!known(request.maxStaffHours) || typeof request.maxStaffHours.value !== 'number' || !Number.isFinite(request.maxStaffHours.value) || request.maxStaffHours.value < 0))
    add('maxStaffHours', 'Supply the entered staff-hour ceiling; missing is not unconstrained.');
  const objective = request.objective ?? 'lowest-complete-cash';
  if (!Object.hasOwn(objectiveLabels, objective)) add('objective', 'This objective is unsupported; choose a named cash, coverage, hours or added-employee objective.');
  if (missing.length) return needs();
  const source: HomeMixSource = {kind: 'home-assumptions', schemaVersion: 1, costPolicy: 'cash-hours-v2', request: structuredClone(request),
    draft: working, input, bounds, staffingBasis: structuredClone(basis),
    objective: {kind: objective, basis: request.objective ? 'explicit' : 'default', label: objectiveLabels[objective]},
    binding: {...draft.binding, bundleId: draft.bundle.id, bundleSignature: draft.signature, revision: draft.revision, inputKey: bundleInputKey(draft)},
    dimensions: {unit: 'whole-positions', currency: 'USD', population: scope.population.value!, businessUnit: input.businessUnit, jobProfile: input.jobProfile,
      roles, startMonth: input.planningMonth, months: Number(input.months), scenario: scenario ?? null, successMeasure: draft.inputs.successMeasure ?? null}};
  return freeze({status: 'ready', source, spec, sourceFingerprint: await homeMixFingerprint(homeMixIdentity(source, spec))});
}
