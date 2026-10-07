import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveHomeMixContext} from '../lib/home-mix-context.ts';
import {searchHomeMixes, homeMixReportsComparable} from '../lib/home-mix-search.ts';
import {readHomeMixReport, homeMixReportIsCurrent, stageHomeMixCandidate, createHomeMixRecord, readHomeMixRecord} from '../lib/home-mix-records.ts';
import {reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
import {calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
import {readPlanRevisions} from '../lib/home-plan-revisions.ts';
import {readBundleWorkspace} from '../lib/home-bundle-records.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {homeMixFixture, entered, unknown, bounds, refreshOrigins} from './fixtures/home-mix.mjs';
const ready = async request => {const context = await resolveHomeMixContext(request); assert.equal(context.status, 'ready', JSON.stringify(context.missing)); return context;};
const report = async request => searchHomeMixes(await ready(request));

test('exact five-role payroll plus vendor cash is 487500, exceeding 10000 by 477500', async () => {
  const request = await homeMixFixture(); request.bounds = bounds([0, 0], [0, 0], [5, 5]);
  request.draft.inputs.budget.amount = entered(10000);
  const result = await report(request), candidate = result.results[0];
  assert.equal(candidate.cash.complete, 487500); assert.equal(candidate.cash.headroom, -477500);
  assert.equal(candidate.status, 'not-met'); assert.equal(result.preferredOptionId, null);
  assert.equal(result.summary.calculatorInvocations, 2); assert.equal(result.sourceKind, 'home-assumptions');
  assert.equal(result.summary.conclusion, 'no-match-within-bounds');
  assert.equal(candidate.effort.totalHours, 0); assert.equal(candidate.metrics.incrementalCash, 487500);
  assert.ok(!JSON.stringify(result).includes('evidenceResultId')); assert.ok(!JSON.stringify(result).includes('employeeTimeValue'));
});

test('mixed alternatives preserve day-prorated hire/backfill payroll, fees, fixed totals and shared vendor once', async () => {
  const request = await homeMixFixture({build: '2', move: '1', buy: '2', backfills: '1', arrivalDate: '2027-01-16', backfillDate: '2027-01-20', hireFee: '2000', backfillFee: '1500', internalAnnualCostChange: '12000', trainingCash: '9000', trainingHours: '240'});
  const result = await report(request);
  for (const candidate of result.results.filter(candidate => candidate.status !== 'invalid')) {
    const expected = calculateWorkforceIncrement(candidate.input, null);
    assert.equal(candidate.cash.complete, expected.totalCash + 7500);
    assert.equal(candidate.cash.ledger.find(line => line.id === 'vendor').total, 7500);
    assert.deepEqual(candidate.cash.ledger.find(line => line.id === 'capacity:hireStaffingCost').monthly, expected.rows.map(row => row.hireStaffingCost));
    assert.equal(candidate.input.trainingCash, '9000'); assert.equal(candidate.input.trainingHours, '240');
    assert.equal(candidate.input.internalAnnualCostChange, '12000'); assert.equal(candidate.input.backfills, '1');
    const draft = structuredClone(request.draft); draft.inputs.capacity.input = candidate.input;
    draft.inputs.capacity.flows = draft.inputs.capacity.flows.filter(flow => flow.path === 'backfills' ? candidate.mix.build + candidate.mix.move > 0 : candidate.mix[flow.path] > 0);
    assert.equal(reconcileBundle(draft).cashEstimate.cash, candidate.cash.complete);
  }
  assert.ok(result.summary.counts.invalid > 0, 'backfills exceeding internal roles remain invalid');
});

test('missing staffing sources produce useful needs-inputs without saved evidence fabrication', async () => {
  const request = await homeMixFixture(); request.draft.inputs.capacity = null;
  const result = await resolveHomeMixContext(request);
  assert.equal(result.status, 'needs-inputs'); assert.ok(result.missing.some(item => item.dimension === 'capacity'));
  assert.equal(result.cashEstimate.coverage, 'partial'); assert.ok(result.assumptions.expenses.length);
  request.draft.inputs.scope.capacityRequired = entered(false);
  assert.equal((await resolveHomeMixContext(request)).status, 'not-applicable');
});

test('initial illustrative five-role Home draft retains the exact 487500 subtotal while staffing feasibility needs inputs', async () => {
  const request = await homeMixFixture();
  // Start with the same scoped bundle and the real frozen Home pilot preparation.
  const {emptyBundleInputs} = await import('../lib/home-bundle-reconciliation.ts');
  request.draft.inputs = emptyBundleInputs(request.draft.bundle);
  request.draft = prepareIllustrativePilot(request.draft, '2026-10-07T01:00:00Z', {includeDeliveryEstimate: true});
  request.draft.inputs.budget = {amount: entered(10000), basis: entered('cash')};
  const result = await resolveHomeMixContext(request);
  assert.equal(result.status, 'needs-inputs'); assert.equal(result.cashEstimate.cash, 487500); assert.equal(result.cashEstimate.coverage, 'partial');
  assert.equal(result.assumptions.whatIf.target.value, 5); assert.ok(result.missing.some(item => item.dimension === 'schedule'));
});

test('currency, units, paid fraction, schedule, availability and overlapping groups cannot silently become ready', async () => {
  const cases = [
    ['currency', request => request.draft.inputs.scope.currency = 'CAD'],
    ['roleUnit', request => request.staffingBasis = {unit: entered('fte'), paidFraction: entered(1), currency: entered('USD')}],
    ['paidFraction', request => request.staffingBasis = {unit: entered('whole-positions'), paidFraction: unknown(), currency: entered('USD')}],
    ['paidFraction', request => request.staffingBasis = {unit: entered('whole-positions'), paidFraction: entered(0.5), currency: entered('USD')}],
    ['currency', request => request.staffingBasis = {unit: entered('whole-positions'), paidFraction: entered(1), currency: entered('EUR')}],
    ['schedule', request => request.draft.inputs.capacity.input.arrivalMode = 'historical-median'],
    ['schedule.buy', request => request.draft.inputs.capacity.input.arrivalDate = ''],
    ['schedule', request => request.draft.inputs.capacity.input.arrivalDate = '2028-01-01'],
    ['group.build', request => request.draft.inputs.groups[0].count = unknown()],
    ['groupOverlap', request => request.draft.inputs.groupsDisjoint = unknown()],
    ['groupOverlap', request => {request.draft.inputs.capacity.flows.find(flow => flow.path === 'move').groupId = 'builders'; request.draft.inputs.memberships.find(row => row.componentId === 'c3').groupIds = ['builders'];}],
    ['mapping.move', request => {request.bounds = bounds([0, 5], [0, 5], [0, 5]); request.draft.inputs.capacity.flows = request.draft.inputs.capacity.flows.filter(flow => flow.path !== 'move');}],
    ['membership.build', request => request.draft.inputs.memberships.find(row => row.componentId === 'c2').complete = unknown()],
    ['bounds.build', request => request.bounds = bounds([0, 6], [0, 5], [0, 5])],
  ];
  for (const [dimension, mutate] of cases) {
    const request = await homeMixFixture(); mutate(request); refreshOrigins(request.draft);
    const result = await resolveHomeMixContext(request); assert.equal(result.status, 'needs-inputs', dimension);
    assert.ok(result.missing.some(item => item.dimension.startsWith(dimension) || item.dimension === 'bounds'), `${dimension}: ${JSON.stringify(result.missing)}`);
  }
  const fractional = await homeMixFixture(); fractional.draft.inputs.capacity.input.roles = '2.5'; refreshOrigins(fractional.draft);
  assert.equal((await resolveHomeMixContext(fractional)).status, 'needs-inputs');
});

test('unknown required costs, funding, coverage, budgets or ownership never imply affordability', async () => {
  const changes = [
    request => request.draft.inputs.capacity.input.annualHireCost = '',
    request => request.draft.inputs.capacity.input.hireFee = '',
    request => request.draft.inputs.expenses[0].amount = unknown(),
    request => request.draft.inputs.expenses[0].startMonth = unknown(),
    request => request.draft.inputs.expenses[0].startMonth = entered('2028-01'),
    request => request.draft.inputs.costsDistinct = unknown(),
    request => request.draft.inputs.costsDistinct = entered(false),
    request => request.draft.inputs.costReviews[0].complete = unknown(),
    request => request.draft.inputs.expenseLinks = request.draft.inputs.expenseLinks.filter(link => link.expenseId !== 'vendor'),
    request => request.draft.inputs.dependenciesConfirmed = unknown(),
    request => request.draft.inputs.budget.amount = unknown(),
    request => request.draft.inputs.capacity.input.maxAddedEmployees = '',
    request => request.draft.inputs.capacity.input.deadlineMonth = '',
  ];
  for (const mutate of changes) {
    const request = await homeMixFixture(); request.bounds = bounds([0, 0], [0, 0], [5, 5]); mutate(request); refreshOrigins(request.draft);
    const result = await report(request); assert.equal(result.results[0].status, 'unknown', mutate.toString());
    assert.equal(result.preferredOptionId, null); assert.ok(result.missing.length);
    if (result.results[0].cash.complete === null) assert.equal(result.results[0].cash.headroom, null);
  }
});

test('duplicate expenses/links are rejected and shared sources are never added per owner', async () => {
  for (const key of ['expenses', 'expenseLinks']) {
    const request = await homeMixFixture(); request.draft.inputs[key].push(structuredClone(request.draft.inputs[key][0]));
    assert.equal((await resolveHomeMixContext(request)).status, 'needs-inputs');
  }
  const result = await report(await homeMixFixture());
  assert.ok(result.results.every(candidate => candidate.cash.ledger.find(line => line.id === 'vendor').total === 7500));
});

test('training/delivery overlap stays unknown, cannot dominate, and blocks a required hours ceiling', async () => {
  const request = await homeMixFixture({trainingHours: '24'});
  request.draft.inputs.deliveryEstimate = {hoursPerParticipant: entered(2), coordinationHours: entered(8), hourlyRate: unknown(), acceptance: entered('Synthetic deliverables')};
  let result = await report(request), built = result.results.find(candidate => candidate.mix.build === 5);
  assert.equal(built.effort.trainingHours, 24); assert.equal(built.effort.deliveryHours, 28); assert.equal(built.effort.totalHours, null);
  assert.equal(built.tradeOffStatus, 'incomparable-missing-metrics');
  assert.equal(result.selection.unresolvedTieMetric, 'staffHours');
  request.maxStaffHours = entered(1000); result = await report(request); built = result.results.find(candidate => candidate.mix.build === 5);
  assert.equal(built.status, 'unknown'); assert.equal(built.metrics.staffHours, null);
  request.objective = 'lowest-staff-hours'; delete request.maxStaffHours;
  result = await report(request); assert.equal(result.preferredOptionId, null); assert.equal(result.summary.conclusion, 'needs-inputs');
});

test('explicit objectives are honored; default cash selection and known tie breaks are visible', async () => {
  const request = await homeMixFixture({buildMonth: '2027-12', moveMonth: '2027-12'});
  let result = await report(request); assert.equal(result.objective.basis, 'default');
  assert.equal(result.results.find(candidate => candidate.id === result.preferredOptionId).mix.buy, 0);
  assert.match(result.selection.label, /default objective/);
  request.objective = 'earliest-coverage'; result = await report(request);
  assert.equal(result.results.find(candidate => candidate.id === result.preferredOptionId).mix.buy, 5);
  request.objective = 'fewest-added-employees'; result = await report(request);
  assert.equal(result.results.find(candidate => candidate.id === result.preferredOptionId).metrics.addedEmployees, 0);
  request.objective = 'lowest-staff-hours'; result = await report(request); assert.ok(result.preferredOptionId);
  request.objective = 'global-roi'; assert.equal((await resolveHomeMixContext(request)).status, 'needs-inputs');
});

test('unused employee hourly valuations cannot overflow or change Home cash/hour feasibility', async () => {
  const request = await homeMixFixture({trainingHours: '100000000', loadedHourlyCost: '100000000'});
  const result = await report(request), built = result.results.find(candidate => candidate.mix.build === 5);
  assert.equal(built.status, 'met'); assert.equal(built.cash.complete, 7500); assert.equal(built.effort.trainingHours, 100000000);
  assert.equal(built.input.loadedHourlyCost, '100000000'); assert.equal(result.assumptionOrigins.loadedHourlyCost.kind, 'user-entered');
});

test('ties use earlier coverage then known hours, retain equals and report omitted nondominated tradeoffs', async () => {
  const request = await homeMixFixture({roles: '43', trainingHours: '24', budget: '100000000'}); request.maxResults = 1;
  let result = await report(request);
  assert.equal(result.preferredOptionId, 'build-0-move-43-buy-0'); assert.equal(result.selection.tiedCandidateIds.length, 1);
  request.draft.inputs.capacity.input.trainingHours = '0'; result = await report(request);
  assert.equal(result.selection.tiedCandidateIds.length, 44); assert.equal(result.summary.omittedNondominated, 43);
  request.draft.inputs.capacity.input.moveMonth = '2027-02'; result = await report(request);
  assert.equal(result.preferredOptionId, 'build-43-move-0-buy-0');
});

test('all 990 candidates are ranked before 64-display cap and last-enumerated winner is retained', async () => {
  const request = await homeMixFixture({roles: '43', buildMonth: '2027-12', internalAnnualCostChange: '120000', annualHireCost: '120000', budget: '100000000'});
  const result = await report(request);
  assert.equal(result.summary.enumerated, 990); assert.equal(result.summary.calculatorInvocations, 991);
  assert.equal(result.preferredOptionId, 'build-43-move-0-buy-0'); assert.equal(result.results[0].id, result.preferredOptionId);
  assert.equal(result.results.length, 64); assert.equal(result.summary.omittedByCap, 926); assert.equal(result.summary.enumerationComplete, true);
  request.maxResults = 1; const small = await report(request);
  assert.equal(small.preferredOptionId, result.preferredOptionId); assert.equal(small.results.length, 1);
  assert.deepEqual(small.summary.counts, result.summary.counts);
});

test('hard evaluation/display limits include reference, reject broad domains, and never broaden explicit bounds', async () => {
  const tooLarge = await resolveHomeMixContext(await homeMixFixture({roles: '44'}));
  assert.equal(tooLarge.status, 'needs-inputs'); assert.match(tooLarge.missing.find(item => item.dimension === 'evaluationBudget').reason, /1036/);
  const request = await homeMixFixture(); request.maxEvaluations = 21;
  assert.equal((await resolveHomeMixContext(request)).status, 'needs-inputs');
  request.maxEvaluations = 22; assert.equal((await report(request)).summary.calculatorInvocations, 22);
  request.maxResults = 65; assert.equal((await resolveHomeMixContext(request)).status, 'needs-inputs');
  request.maxResults = 64; request.bounds = bounds([1, 1], [1, 1], [3, 3]);
  const exact = await report(request); assert.equal(exact.summary.enumerated, 1); assert.deepEqual(exact.results[0].mix, {build: 1, move: 1, buy: 3});
  request.bounds = bounds([0, 0], [0, 0], [0, 0]); const empty = await report(request);
  assert.equal(empty.summary.enumerated, 0); assert.equal(empty.summary.calculatorInvocations, 1); assert.equal(empty.summary.conclusion, 'no-mix-within-bounds');
});

test('dimensions reject role/FTE, target, population, evidence and rate-period cross-ranking', async () => {
  const result = await report(await homeMixFixture()); assert.equal(homeMixReportsComparable(result, structuredClone(result)), true);
  for (const change of [r => r.dimensions.unit = 'fte', r => r.dimensions.roles++, r => r.dimensions.population = 'Other', r => r.dimensions.months++,
    r => r.dimensions.scenario = {kind: 'turnover', population: 500, ratePeriod: 'ytd'}, r => r.binding.evidenceDigest = 'a'.repeat(64), r => r.binding.goal = 'Another target']) {
    const different = structuredClone(result); change(different); assert.equal(homeMixReportsComparable(result, different), false);
  }
});

test('source fingerprint covers exact binding, version, revision, assumptions, mapping, bounds, constraints and objective', async () => {
  const request = await homeMixFixture(), original = await report(request);
  const changes = [r => r.draft.revision++, r => r.draft.binding.evidenceDigest = 'a'.repeat(64), r => r.draft.binding.planningDigest = 'b'.repeat(64),
    r => r.draft.inputs.capacity.origins.annualHireCost.basis = 'Changed rate provenance', r => r.draft.inputs.capacity.input.hireFee = '5',
    r => r.draft.inputs.budget.amount = entered(42), r => r.maxStaffHours = entered(100), r => r.objective = 'earliest-coverage',
    r => r.bounds = bounds([0, 4], [0, 5], [0, 5]), r => r.maxResults = 1,
    r => r.draft.inputs.capacity.flows.find(flow => flow.path === 'buy').componentIds = ['c1']];
  assert.equal(await homeMixReportIsCurrent(request, original), true);
  for (const change of changes) {const next = structuredClone(request); change(next); assert.equal(await homeMixReportIsCurrent(next, original), false);}
  const context = await ready(request), forged = structuredClone(context); forged.source.input.annualHireCost = '0';
  await assert.rejects(searchHomeMixes(forged), /fingerprint/);
  const changed = structuredClone(original); changed.calculator.methodVersion = 'future'; assert.equal(await readHomeMixReport(changed, context), null);
  assert.equal(Object.isFrozen(context.source.draft.inputs.capacity.input), true); assert.equal(Object.isFrozen(original.results[0].cash), true);
});

test('exact-source verification rejects altered/stale reports and obeys abort before publication', async () => {
  const request = await homeMixFixture(), context = await ready(request), result = await searchHomeMixes(context);
  assert.deepEqual(await readHomeMixReport(result, context), result);
  const tampered = structuredClone(result); tampered.results[0].cash.complete = 0;
  assert.equal(await readHomeMixReport(tampered, context), null);
  const changed = structuredClone(request); changed.draft.revision++;
  assert.equal(await readHomeMixReport(result, await ready(changed)), null);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(searchHomeMixes(context, controller.signal), {name: 'AbortError'});
  await assert.rejects(readHomeMixReport(result, context, controller.signal), {name: 'AbortError'});
  const later = new AbortController(), pending = searchHomeMixes(context, later.signal); later.abort();
  await assert.rejects(pending, {name: 'AbortError'});
});

test('candidate staging preserves unrelated vendor obligations, reopens changed cost reviews and never writes', async () => {
  const request = await homeMixFixture(), context = await ready(request), result = await searchHomeMixes(context), before = JSON.stringify(request);
  const proposal = await stageHomeMixCandidate(context, result, result.preferredOptionId);
  assert.equal(proposal.status, 'proposed'); assert.equal(proposal.draft.revision, request.draft.revision + 1);
  assert.deepEqual(proposal.draft.inputs.expenses, request.draft.inputs.expenses); assert.deepEqual(proposal.draft.bundle, request.draft.bundle);
  assert.ok(proposal.removedFlows.includes('buy')); assert.ok(proposal.costReviewComponents.length);
  assert.equal(proposal.draft.inputs.costsDistinct.value, null); assert.equal(JSON.stringify(request), before);
  assert.equal(proposal.draft.inputs.capacity.origins.move.kind, 'illustrative');
  await assert.rejects(stageHomeMixCandidate(context, result, 'missing'), /emitted/);
});

test('new Home records replay exact historical source and reject tampering; signed cash-v1 history remains byte-identical', async () => {
  const request = await homeMixFixture(), context = await ready(request), result = await searchHomeMixes(context);
  const record = await createHomeMixRecord(context, result, result.preferredOptionId, '2026-10-07T01:00:00Z'), bytes = JSON.stringify(record);
  request.draft.revision++; assert.equal(await homeMixReportIsCurrent(request, result), false);
  assert.equal(JSON.stringify(await readHomeMixRecord(JSON.parse(bytes))), bytes);
  const altered = JSON.parse(bytes); altered.proposal.draft.inputs.expenses = []; assert.equal(await readHomeMixRecord(altered), null);
  const old = JSON.parse(readFileSync(new URL('./fixtures/home-capacity-cash-v1.json', import.meta.url))), oldBytes = JSON.stringify(old);
  assert.deepEqual(readPlanRevisions(old.history, 'capacity-v1'), old.history); assert.deepEqual(readBundleWorkspace(old.workspace, 'capacity-v1'), old.workspace);
  assert.equal(JSON.stringify(old), oldBytes);
});
