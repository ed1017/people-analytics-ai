/** Browser/worker-safe Home projection. Only counts vary; totals are never scaled per person. */
// @ts-expect-error Native Node tests share TypeScript source.
import {evaluateBoundedWorkforceInputs, canonical, freeze, workforceSearchCalculator} from './workforce-mix-search-core.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeMixFingerprint, homeMixIdentity, homeMixMethodVersion, homeMixProjectionVersion, type ReadyHomeMixContext, type HomeMixSource, type HomeMixMissingInput} from './home-mix-context.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planStaffEffort} from './home-plan-delivery-estimate.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {componentOrder} from './home-solution-bundles.ts';
import type {WorkforceIncrement, WorkforcePlanInput} from './workforce-increment';

export type HomeMixMetrics = {incrementalCash: number | null; staffHours: number | null; addedEmployees: number; fullCoverageDate: string | null};
type Check = {dimension: string; status: 'met' | 'not-met' | 'unknown'};
export type HomeMixCandidate = {
  id: string; mix: {build: number; move: number; buy: number}; isReferenceMix: boolean;
  input: WorkforcePlanInput; status: 'met' | 'not-met' | 'unknown' | 'invalid'; reason: string | null;
  metrics: HomeMixMetrics | null; checks: Check[]; missing: HomeMixMissingInput[];
  cash: {complete: number | null; knownSubtotal: number | null; coverage: 'complete-assumptions' | 'partial' | 'unknown'; headroom: number | null; ledger: Array<{id: string; monthly: (number | null)[]; total: number | null; componentIds: string[]}>};
  effort: {trainingHours: number | null; deliveryHours: number | null; totalHours: number | null} | null;
  tradeOffStatus: 'nondominated-in-bounds' | 'dominated-in-bounds' | 'incomparable-missing-metrics' | 'not-compared-constraints';
};
const monthIndex = (value: string) => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
const cents = (value: number) => {
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100))) throw Error('Cash/hours exceed supported numeric precision.');
  return Math.round((value + Number.EPSILON) * 100) / 100;
};
const sum = (values: (number | null)[]) => values.some(value => value === null) ? null : cents(values.reduce<number>((total, value) => total + value!, 0));
const amount = (value: string) => value === '' ? null : Number(value);
const cashFields = ['hireStaffingCost', 'backfillStaffingCost', 'internalSalaryUplift', 'recruitingFees', 'trainingCash'] as const;

/** Reconcile full cash and dependency-gated coverage using the one already calculated staffing plan. */
function project(source: HomeMixSource, plan: WorkforceIncrement, id: string, isReferenceMix: boolean): HomeMixCandidate {
  // Retain the original field/provenance for adoption; Home never evaluates its monetary time valuation.
  const draft = structuredClone(source.draft), input = draft.inputs, staffing = {...plan.input, loadedHourlyCost: source.input.loadedHourlyCost};
  input.capacity!.input = structuredClone(staffing);
  const missing: HomeMixMissingInput[] = [], add = (dimension: string, reason: string) => missing.push({dimension, reason});
  const first = monthIndex(staffing.planningMonth), months = Number(staffing.months);
  const ledger: HomeMixCandidate['cash']['ledger'] = cashFields.map(field => {
    const monthly = plan.rows.map(row => row[field]);
    return {id: `capacity:${field}`, monthly, total: sum(monthly), componentIds: []};
  });
  // One line per source, even when it funds multiple components. Expense IDs/links are unique in the validated draft.
  for (const expense of input.expenses.filter(item => item.kind === 'cash')) {
    const start = expense.startMonth.value === null ? null : monthIndex(expense.startMonth.value), duration = expense.months.value;
    const inPeriod = start !== null && duration !== null && start >= first && start + duration <= first + months;
    const monthly = Array.from({length: months}, (_, index) => !inPeriod ? null : first + index >= start! && first + index < start! + duration! ? expense.amount.value : 0);
    if (!inPeriod) add(`expense.${expense.id}.schedule`, 'Review the funding date and duration within this horizon.');
    ledger.push({id: expense.id, monthly, total: sum(monthly), componentIds: []});
  }
  for (const line of ledger) {
    line.componentIds = [...(input.expenseLinks.find(link => link.expenseId === line.id)?.componentIds ?? [])];
    if (line.total !== 0 && !line.componentIds.length) add(`ownership.${line.id}`, 'Link the complete cash source to its owning components.');
    if (line.total === null) add(`cash.${line.id}`, 'Required cash amount or funding schedule is unknown.');
  }
  for (const review of input.costReviews) if (review.complete.value !== true) add(`costReview.${review.componentId}`, 'Complete component cost coverage is unresolved.');
  if (input.costsDistinct.value !== true) add('cashOverlap', 'Reconcile distinct cash sources; duplicate/overlapping obligations cannot establish affordability.');
  const allCash = sum(ledger.map(line => line.total));
  const complete = missing.length ? null : allCash;
  const knownSubtotal = input.costsDistinct.value === false ? null : sum(ledger.map(line => line.total ?? 0));
  const effort = planStaffEffort(draft);
  if (effort.totalHours === null) add('staffHours', 'Training and delivery effort remain separate until amounts and overlap are resolved.');
  const ready: Record<string, string | null> = {};
  for (const componentId of componentOrder(draft.bundle.components)) {
    const component = draft.bundle.components.find(item => item.id === componentId)!, timing = input.timing.find(item => item.componentId === componentId)!;
    const start = timing.start.value, finish = timing.finish.value;
    const valid = start !== null && finish !== null && start <= finish && monthIndex(start) >= first && monthIndex(finish) < first + months;
    ready[componentId] = input.dependenciesConfirmed.value === true && valid && component.dependsOn.every(id => ready[id] !== null && ready[id] <= start!) ? finish : null;
  }
  const activeFlows = input.capacity!.flows.filter(flow => flow.path !== 'backfills' && Number(staffing[flow.path]) > 0);
  const readiness = activeFlows.map(flow => {
    const paidDate = flow.path === 'buy' ? plan.arrivalDate : staffing[flow.path === 'build' ? 'buildMonth' : 'moveMonth'] + '-01';
    const prerequisites = flow.componentIds.map(id => ready[id]);
    return !paidDate || prerequisites.some(date => date === null) ? null : [paidDate, ...prerequisites as string[]].sort().at(-1)!;
  });
  const coverage = readiness.length && readiness.every(date => date !== null) ? (readiness as string[]).sort().at(-1)! : null;
  if (!coverage) add('coverageDate', 'Role coverage needs all active path dates and component prerequisites.');
  // The Home ceiling takes precedence over an older staffing-form ceiling.
  const budget = input.budget ? input.budget.amount.value : amount(staffing.budget);
  const cap = amount(staffing.maxAddedEmployees), maxHours = source.request.maxStaffHours?.value;
  const cashStatus: Check['status'] = budget === null ? 'unknown' : complete !== null ? complete <= budget ? 'met' : 'not-met'
    : knownSubtotal !== null && input.costsDistinct.value === true && knownSubtotal > budget ? 'not-met' : 'unknown';
  const checks: Check[] = [
    {dimension: 'completeIncrementalCash', status: cashStatus},
    {dimension: 'addedEmployees', status: cap === null ? 'unknown' : plan.maxAddedEmployees <= cap ? 'met' : 'not-met'},
    {dimension: 'coverageDeadline', status: !staffing.deadlineMonth || !coverage ? 'unknown' : coverage.slice(0, 7) <= staffing.deadlineMonth ? 'met' : 'not-met'},
    ...(maxHours === undefined ? [] : [{dimension: 'staffHours', status: maxHours === null || effort.totalHours === null ? 'unknown' as const : effort.totalHours <= maxHours ? 'met' as const : 'not-met' as const}]),
  ];
  if (budget === null) add('budget', 'Enter the complete incremental cash ceiling.');
  if (cap === null) add('maxAddedEmployees', 'Enter the added-employee ceiling.');
  if (!staffing.deadlineMonth) add('deadline', 'Enter the role-coverage deadline.');
  return {id, mix: {build: Number(staffing.build), move: Number(staffing.move), buy: Number(staffing.buy)}, isReferenceMix,
    input: structuredClone(staffing), status: checks.some(check => check.status === 'not-met') ? 'not-met' : checks.some(check => check.status === 'unknown') ? 'unknown' : 'met',
    reason: null, checks, missing, metrics: {incrementalCash: complete, staffHours: effort.totalHours, addedEmployees: plan.maxAddedEmployees, fullCoverageDate: coverage},
    cash: {complete, knownSubtotal, coverage: complete !== null ? 'complete-assumptions' : knownSubtotal !== null ? 'partial' : 'unknown',
      headroom: complete !== null && budget !== null ? cents(budget - complete) : null, ledger},
    effort: {trainingHours: effort.trainingHours, deliveryHours: effort.deliveryHours, totalHours: effort.totalHours}, tradeOffStatus: 'not-compared-constraints'};
}
const metrics = ['incrementalCash', 'fullCoverageDate', 'staffHours', 'addedEmployees'] as const;
type Metric = typeof metrics[number];
const comparable = (candidate: HomeMixCandidate) => candidate.status === 'met' && candidate.metrics && metrics.every(key => candidate.metrics![key] !== null);
function dominates(a: HomeMixCandidate, b: HomeMixCandidate) {
  return comparable(a) && comparable(b) && metrics.every(key => a.metrics![key]! <= b.metrics![key]!) && metrics.some(key => a.metrics![key]! < b.metrics![key]!);
}
const primaryMetric = { 'lowest-complete-cash': 'incrementalCash', 'earliest-coverage': 'fullCoverageDate', 'lowest-staff-hours': 'staffHours', 'fewest-added-employees': 'addedEmployees'} as const;

/** Select from ALL evaluated feasible candidates, then form a capped display with the selection first. */
function select(source: HomeMixSource, candidates: HomeMixCandidate[]) {
  const feasible = candidates.filter(candidate => candidate.status === 'met');
  const primary = primaryMetric[source.objective.kind], ordering: Metric[] = [primary, ...metrics.filter(metric => metric !== primary)];
  let tied = feasible, unresolvedTieMetric: Metric | null = null;
  for (const key of ordering) {
    if (!tied.length) break;
    if (tied.some(candidate => candidate.metrics![key] === null)) { unresolvedTieMetric = key; break; }
    const best = tied.reduce((value, candidate) => candidate.metrics![key]! < value ? candidate.metrics![key]! : value, tied[0].metrics![key]!);
    tied = tied.filter(candidate => candidate.metrics![key] === best);
  }
  const objectiveUnknown = unresolvedTieMetric === primary;
  const selected = objectiveUnknown ? null : tied[0] ?? null;
  return {candidateId: selected?.id ?? null, tiedCandidateIds: tied.map(candidate => candidate.id), unresolvedTieMetric,
    label: selected ? `Best among explored feasible candidates for ${source.objective.label}${source.objective.basis === 'default' ? ' (default objective)' : ''}.`
      : objectiveUnknown ? 'The objective cannot rank all feasible candidates because its required metric is unknown.' : 'No feasible candidate is established within these bounds.',
    tiePolicy: 'Cash ties use earlier coverage, then lower known staff hours, then fewer added employees. Unknown tie metrics retain tied tradeoffs; enumeration order only chooses their displayed representative.'};
}

export async function searchHomeMixes(context: ReadyHomeMixContext, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (context.status !== 'ready' || context.source.kind !== 'home-assumptions' || context.sourceFingerprint !== await homeMixFingerprint(homeMixIdentity(context.source, context.spec)))
    throw Error('Home source/spec fingerprint changed; resolve the current context again.');
  signal?.throwIfAborted();
  const {source, spec} = context;
  // The saved-source facade still calculates its historical time valuation. Home has no money-valued effort metric.
  const evaluated = evaluateBoundedWorkforceInputs({input: {...source.input, loadedHourlyCost: ''}, timing: null}, spec);
  const candidates: HomeMixCandidate[] = evaluated.candidates.map(candidate => candidate.plan
    ? project(source, candidate.plan, candidate.id, candidate.isSavedMix)
    : {id: candidate.id, mix: candidate.mix, isReferenceMix: candidate.isSavedMix, input: {...source.input, build: String(candidate.mix.build), move: String(candidate.mix.move), buy: String(candidate.mix.buy)},
      status: 'invalid', reason: candidate.reason, checks: [], missing: [], metrics: null, effort: null,
      cash: {complete: null, knownSubtotal: null, coverage: 'unknown', headroom: null, ledger: []}, tradeOffStatus: 'not-compared-constraints'});
  for (const candidate of candidates) if (candidate.status === 'met') candidate.tradeOffStatus = !comparable(candidate) ? 'incomparable-missing-metrics'
    : candidates.some(other => dominates(other, candidate)) ? 'dominated-in-bounds' : 'nondominated-in-bounds';
  const selection = select(source, candidates), counts = {met: 0, 'not-met': 0, unknown: 0, invalid: 0, nondominated: 0, incomparable: 0};
  for (const candidate of candidates) {
    counts[candidate.status]++;
    if (candidate.tradeOffStatus === 'nondominated-in-bounds') counts.nondominated++;
    if (candidate.tradeOffStatus === 'incomparable-missing-metrics') counts.incomparable++;
  }
  const priority = (candidate: HomeMixCandidate) => candidate.id === selection.candidateId ? 0 : selection.tiedCandidateIds.includes(candidate.id) ? 1
    : candidate.tradeOffStatus === 'nondominated-in-bounds' ? 2 : candidate.status === 'met' ? 3 : 4;
  const results = [...candidates].sort((a, b) => priority(a) - priority(b)).slice(0, spec.maxResults);
  const reference = project(source, evaluated.referencePlan, 'reference', true);
  const body = {kind: 'home-assumption-mix-report' as const, schemaVersion: 1 as const, methodVersion: homeMixMethodVersion,
    projectionVersion: homeMixProjectionVersion, calculator: workforceSearchCalculator, sourceKind: source.kind,
    sourceFingerprint: context.sourceFingerprint, binding: source.binding, dimensions: source.dimensions, costPolicy: source.costPolicy,
    spec, bounds: source.bounds, objective: source.objective, staffingBasis: source.staffingBasis,
    assumptions: source.draft.inputs, assumptionOrigins: source.draft.inputs.capacity!.origins,
    constraints: {cashBudget: source.draft.inputs.budget?.amount.value ?? (source.draft.inputs.budget ? null : amount(source.input.budget)),
      maxAddedEmployees: amount(source.input.maxAddedEmployees), deadlineMonth: source.input.deadlineMonth || null, maxStaffHours: source.request.maxStaffHours?.value ?? null},
    reference, selection, preferredOptionId: selection.candidateId,
    summary: {conclusion: !candidates.length ? 'no-mix-within-bounds' as const : selection.candidateId ? 'best-explored-feasible' as const
      : counts.unknown || counts.met ? 'needs-inputs' as const : 'no-match-within-bounds' as const,
      enumerated: evaluated.enumerated, calculatorInvocations: evaluated.enumerated + 1, enumerationComplete: true as const,
      counts, emitted: results.length, omittedByCap: candidates.length - results.length, truncated: results.length < candidates.length,
      omittedNondominated: candidates.filter(candidate => candidate.tradeOffStatus === 'nondominated-in-bounds' && !results.includes(candidate)).length},
    missing: [...new Map(candidates.flatMap(candidate => candidate.missing).map(item => [canonical(item), item])).values()], results,
    operationalFeasibilityVerified: false as const, requiresUserReview: true as const,
    limitations: [
      'Best only among explored feasible candidates in the stated bounds and assumptions; no global optimum or predicted intervention effect.',
      'Home assumptions are not saved or verified workforce evidence, observed availability, hiring promises or operational approval.',
      'Only Build/Move/Buy counts vary. Dates, rates, backfills, total salary uplift, training cash and hours remain fixed. No per-person scaling is inferred.',
      'Complete cash includes day-prorated new-hire and backfill payroll, recruiting fees, salary uplift and distinct vendor/activity cash. Unknown costs never establish affordability.',
      'Existing employee effort remains hours. Unknown training/delivery overlap prevents a combined hours metric and Pareto dominance.',
      'The original hourly employee-time valuation is retained in input provenance but ignored by Home calculations and ranking.',
      'Selection and dominance use all evaluated feasible candidates before display truncation. Omitted tradeoffs are counted.',
    ]};
  const reportFingerprint = await homeMixFingerprint(body);
  signal?.throwIfAborted();
  return freeze({...body, reportFingerprint});
}
export type HomeMixReport = Awaited<ReturnType<typeof searchHomeMixes>>;

/** Cross-report ranking requires exact goal/evidence, targets, scope, units, periods and objective. */
export function homeMixReportsComparable(left: HomeMixReport, right: HomeMixReport): boolean {
  const binding = (report: HomeMixReport) => ({goalId: report.binding.goalId, goal: report.binding.goal, evidenceDigest: report.binding.evidenceDigest, planningDigest: report.binding.planningDigest});
  return canonical([binding(left), left.dimensions, left.constraints, left.objective, left.calculator, left.projectionVersion, left.costPolicy])
    === canonical([binding(right), right.dimensions, right.constraints, right.objective, right.calculator, right.projectionVersion, right.costPolicy]);
}
