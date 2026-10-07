import test from 'node:test';
import assert from 'node:assert/strict';
import {actionBinding, actionBindingKey} from '../lib/home-action-drafts.ts';
import {createBundleDraft, reviseBundleDraft, bundleInputKey, unknownAssumption} from '../lib/home-bundle-reconciliation.ts';
import {saveBundleDraftPatch, attachBundlePatch} from '../lib/home-bundle-records.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {blankDevelopmentQuote, developmentCatalog} from '../lib/development-costs.ts';
import {emptyWorkforcePlanInput} from '../lib/workforce-increment.ts';
import {workforceInputGroups} from '../lib/workforce-guided-intake.ts';
import {emptySolutionInputs, createWorkforceSolution, reviseWorkforceSolution, beginSolutionRun, completeSolutionRun} from '../lib/workforce-solution.ts';
import {previewActionPlanApplication, actionPlanApplicationPreviewIsCurrent, actionPlanApplicationSource, actionPlanDevelopmentScopeKey, actionPlanQuoteKey} from '../lib/action-plan-application-preview.ts';

const stamp = '2026-10-05T12:00:00Z';
const binding = await actionBinding('preview-goal', 'Review additional engineering capacity', {sources: [{id: 'W1', status: 'loaded', facts: {headcount: 100}}]}, {});
const entered = value => ({value, kind: 'user-entered', basis: 'Explicit reviewed fixture assumption; unverified.'});
const path = field => `development.options[0].inputs.${field}`;
const row = (preview, destination) => preview.rows.find(item => item.destination === destination);
function attach(draft, workspace, id = 'attachment-1', supersedes = null) {
  return attachBundlePatch(saveBundleDraftPatch(workspace, draft).value, draft,
    {confirmed: true, bindingKey: actionBindingKey(draft.binding), inputKey: bundleInputKey(draft), acknowledgeUnknowns: true}, id, stamp, supersedes).value;
}
function fixture(editDraft = () => {}) {
  const draft = createBundleDraft(bundleProposalFixture(binding.goal).bundles[0], binding);
  Object.assign(draft.inputs.scope, {population: entered('Engineering cohort'), businessUnit: entered('TECH'), jobProfile: entered('ENGINEER'),
    startMonth: entered('2027-01'), months: entered(6), demand: entered(2), capacityRequired: entered(true)});
  draft.inputs.groups = [{id: 'cohort', label: 'Reviewed learning group', count: entered(10)}, {id: 'other', label: 'Separate manager group', count: entered(5)}];
  draft.inputs.groupsDisjoint = entered(true);
  draft.inputs.memberships = draft.bundle.components.map(item => ({componentId: item.id, groupIds: [item.id === 'c1' ? 'other' : 'cohort'], complete: entered(true)}));
  const input = {...emptyWorkforcePlanInput(), businessUnit: 'TECH', jobProfile: 'ENGINEER', intent: 'additional', roles: '2',
    build: '1', move: '0', buy: '1', backfills: '0', planningMonth: '2027-01', months: '6', arrivalMode: 'explicit',
    arrivalDate: '2027-03-01', buildMonth: '2027-04', trainingCash: '10000', trainingHours: '200', loadedHourlyCost: '50',
    annualHireCost: '120000', hireFee: '2000', internalAnnualCostChange: '12000'};
  draft.inputs.capacity = {input, origins: Object.fromEntries(Object.entries(input).map(([key, value]) =>
    [key, {kind: value ? 'user-entered' : 'unknown', basis: value ? 'Explicit reviewed capacity assumption.' : null}])),
    flows: [{id: 'build', path: 'build', componentIds: ['c2', 'c3'], groupId: 'cohort'}, {id: 'buy', path: 'buy', componentIds: ['c5'], groupId: null}]};
  editDraft(draft);
  const workspace = attach(draft), source = actionPlanApplicationSource(workspace.attachments[0]);
  const inputs = emptySolutionInputs();
  for (const [section, , fields] of workforceInputGroups) for (const [field] of fields) inputs[section][field] = input[field];
  inputs.scope.goalStatement = binding.goal;
  inputs.training.trainingCash = '7000';
  const solution = createWorkforceSolution('solution-1', binding.goalId, inputs, stamp);
  const quote = structuredClone(developmentCatalog[0]);
  return {binding, workspace, attachmentId: 'attachment-1', currentDraft: draft,
    destination: {goalId: binding.goalId, revision: 12, workforceSolution: solution, selectedPlanningScenario: 'Baseline', headcount: 100,
      development: {custom: [], draft: blankDevelopmentQuote(), goal: binding.goal, selected: quote.id,
        options: [{quote, goal: binding.goal, inputs: {participants: '', sessions: '9', hours: '', fee: '999', additionalFees: '', hourlyCost: ''}}]}},
    developmentTarget: {componentId: 'c2', optionIndex: 0, quoteReview: {source, componentId: 'c2', optionIndex: 0, quoteKey: actionPlanQuoteKey(quote),
      scopeKey: actionPlanDevelopmentScopeKey(draft), confirmedCompatible: true, loadedHourlyCostCompatible: true}},
    capacityReview: {source, solutionId: solution.id, version: 1, confirmedAdditionalCapacity: true}};
}
function freeze(value) {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}

test('default preview is deterministic, preserves every destination and binds exact source and destination', async () => {
  const context = fixture(), before = structuredClone(context);
  freeze(context);
  const preview = await previewActionPlanApplication(context);
  assert.deepEqual(preview, await previewActionPlanApplication(context));
  assert.deepEqual(context, before);
  assert.deepEqual(preview.selectedChanges, []);
  assert.ok(preview.rows.every(row => assert.deepEqual(row.after, row.current) === undefined));
  assert.equal(preview.binding.attachmentId, context.attachmentId);
  assert.equal(preview.binding.inputKey, bundleInputKey(context.currentDraft));
  assert.equal(preview.binding.revision, context.currentDraft.revision);
  assert.equal(preview.binding.destinationRevision, 12);
  assert.equal(preview.binding.solutionVersion, 1);
  assert.deepEqual(preview.binding.sourceIds, ['W1:summary']);
  assert.equal(preview.mode, 'local-preview-only');
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, context), true);
});

test('fill-empty keeps conflicts; replace acts only on individually selected supported fields', async () => {
  const context = fixture(), choices = {[path('participants')]: 'fill-empty', [path('sessions')]: 'fill-empty', [path('fee')]: 'replace', [path('hours')]: 'fill-empty'};
  const preview = await previewActionPlanApplication(context, choices);
  assert.deepEqual([...preview.selectedChanges].sort(), [path('participants'), path('fee'), path('hours')].sort());
  assert.equal(row(preview, path('participants')).after, '10');
  assert.equal(row(preview, path('sessions')).after, '9');
  assert.equal(row(preview, path('sessions')).proposed, '3');
  assert.equal(row(preview, path('fee')).after, '120');
  assert.ok(preview.conflicts.includes(path('fee')));
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, context, choices), true);
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, context), false);
  assert.equal(context.destination.development.options[0].inputs.fee, '999');
});

test('unknown additional fees stay unknown, and numeric zero remains an occupied destination', async () => {
  const context = fixture();
  context.destination.development.options[0].inputs.hourlyCost = '0';
  const preview = await previewActionPlanApplication(context, {[path('hourlyCost')]: 'fill-empty', [path('additionalFees')]: 'replace'});
  assert.equal(row(preview, path('hourlyCost')).after, '0');
  assert.equal(row(preview, path('hourlyCost')).conflict, false);
  assert.equal(row(preview, path('hourlyCost')).status, 'blocked');
  assert.equal(row(preview, path('additionalFees')).proposed, null);
  assert.equal(row(preview, path('additionalFees')).after, '');
  assert.equal(row(preview, path('additionalFees')).status, 'missing');
});

test('missing quote identity cannot be inferred from component names, owner roles, totals or hours', async () => {
  const context = fixture(); context.developmentTarget.quoteReview = null;
  const preview = await previewActionPlanApplication(context, {[path('fee')]: 'replace'});
  for (const field of ['sessions', 'hours', 'fee', 'hourlyCost']) assert.equal(row(preview, path(field)).proposed, null);
  assert.equal(row(preview, 'development.selected').proposed, null);
  assert.equal(row(preview, path('fee')).after, '999');
  assert.equal(row(preview, path('participants')).proposed, '10');
});

test('quote compatibility rejects changed selection, currency, fee basis, scope, source revision or malformed quotes', async () => {
  const edits = [
    context => {context.destination.development.selected = developmentCatalog[1].id;},
    context => {context.developmentTarget.quoteReview.source.inputKey = 'old';},
    context => {context.developmentTarget.quoteReview.source.attachmentId = 'other';},
    context => {context.developmentTarget.quoteReview.scopeKey = 'other population';},
    context => {context.developmentTarget.componentId = 'c1';},
    context => {context.destination.development.options[0].quote.basis = 'cohort';},
  ];
  for (const edit of edits) {const context = fixture(); edit(context); assert.equal(row(await previewActionPlanApplication(context), path('fee')).status, 'blocked');}
  const differentOption = fixture();
  differentOption.destination.development.options.push(structuredClone(differentOption.destination.development.options[0]));
  differentOption.developmentTarget.optionIndex = 1;
  assert.equal(row(await previewActionPlanApplication(differentOption), 'development.options[1].inputs.fee').status, 'blocked');
  for (const change of [{currency: 'EUR'}, {sessions: '-1'}]) {
    const context = fixture(), quote = {...context.destination.development.options[0].quote, ...change, id: 'custom-1', provenance: 'user-provided'};
    context.destination.development.custom = [quote]; context.destination.development.selected = quote.id;
    context.destination.development.options[0].quote = quote; context.developmentTarget.quoteReview.quoteKey = actionPlanQuoteKey(quote);
    assert.equal(row(await previewActionPlanApplication(context), path('sessions')).status, 'blocked');
  }
});

test('original simulated and user-provided quote labels survive; no vendor replacement is offered', async () => {
  for (const provenance of ['simulated', 'user-provided']) {
    const context = fixture();
    if (provenance === 'user-provided') {
      const quote = {...context.destination.development.options[0].quote, id: 'custom-1', provenance};
      context.destination.development.custom = [quote]; context.destination.development.selected = quote.id;
      context.destination.development.options[0].quote = quote; context.developmentTarget.quoteReview.quoteKey = actionPlanQuoteKey(quote);
    }
    const preview = await previewActionPlanApplication(context);
    assert.equal(row(preview, path('fee')).provenance[0].kind, provenance);
    assert.equal(row(preview, 'development.options[0].quote').status, 'read-only');
    assert.deepEqual(row(preview, 'development.options[0].quote').proposed, context.destination.development.options[0].quote);
  }
});

test('component-specific unique groups count once; bundle totals and headcount never become participants', async () => {
  const context = fixture(draft => {draft.inputs.memberships.find(item => item.componentId === 'c3').groupIds = ['cohort'];});
  const preview = await previewActionPlanApplication(context);
  assert.equal(row(preview, path('participants')).proposed, '10');
  assert.equal(context.workspace.attachments[0].result.uniqueParticipants, 15);
  assert.equal(row(preview, 'headcount').current, 100);
  assert.match(row(preview, path('participants')).provenance[0].sourcePath, /cohort/);
});

test('unresolved overlap, partial membership, illustrative counts and out-of-range counts block participants', async () => {
  for (const edit of [
    draft => {draft.inputs.groupsDisjoint = unknownAssumption();},
    draft => {draft.inputs.groupsDisjoint = {...entered(true), kind: 'illustrative'};},
    draft => {draft.inputs.memberships.find(item => item.componentId === 'c2').complete = entered(false);},
    draft => {draft.inputs.groups[0].count = {...entered(10), kind: 'illustrative'};},
    draft => {draft.inputs.groups[0].count = entered(10001);},
  ]) {
    const preview = await previewActionPlanApplication(fixture(edit), {[path('participants')]: 'fill-empty'});
    assert.equal(row(preview, path('participants')).status, 'blocked');
    assert.equal(row(preview, path('participants')).after, '');
  }
});

test('legacy application snapshots retain their exact reviewed loaded USD/hour provenance', async () => {
  const context = fixture(draft => {delete draft.inputs.costPolicy;draft.inputs.capacity.origins.loadedHourlyCost = {kind: 'illustrative', basis: 'DEMO loaded hourly assumption.'};});
  const preview = await previewActionPlanApplication(context, {[path('hourlyCost')]: 'fill-empty'});
  assert.equal(row(preview, path('hourlyCost')).after, '50');
  assert.equal(row(preview, path('hourlyCost')).provenance[0].kind, 'illustrative');
  assert.notEqual(row(preview, path('fee')).proposed, context.currentDraft.inputs.capacity.input.trainingCash);
  context.developmentTarget.quoteReview.loadedHourlyCostCompatible = false;
  assert.equal(row(await previewActionPlanApplication(context), path('hourlyCost')).status, 'blocked');
});

test('existing destination goal and option scopes cannot be overwritten, even with replace', async () => {
  for (const edit of [context => {context.destination.development.goal = 'Different goal';}, context => {context.destination.development.options[0].goal = 'Different goal';}]) {
    const context = fixture(); edit(context);
    const preview = await previewActionPlanApplication(context, {[path('participants')]: 'replace', 'development.goal': 'replace'});
    assert.equal(row(preview, path('participants')).status, 'blocked');
    assert.equal(row(preview, path('participants')).after, '');
  }
  const context = fixture(); context.destination.development.goal = '';
  assert.equal(row(await previewActionPlanApplication(context, {'development.goal': 'fill-empty'}), 'development.goal').after, binding.goal);
});

test('capacity maps existing field units without addition and preserves prior versions, results and unrelated fields', async () => {
  const context = fixture(), solution = context.destination.workforceSolution;
  solution.versions[0].inputs.training.unrelated = 'keep';
  const run = beginSolutionRun(solution, 1, 'run-1', ['brief'], stamp);
  context.destination.workforceSolution = completeSolutionRun(run.state, run.ticket, [{id: 'result-1', kind: 'brief', calculator: {name: 'fixture', version: '1'}, payload: {historical: true}}], stamp);
  const before = structuredClone(context);
  const preview = await previewActionPlanApplication(freeze(context), {'workforceSolution.training.trainingCash': 'replace'});
  assert.deepEqual(context, before);
  const cash = row(preview, 'workforceSolution.training.trainingCash');
  assert.equal(cash.current, '7000'); assert.equal(cash.after, '10000');
  assert.equal(row(preview, 'workforceSolution.response.buy').proposed, '1');
  assert.equal(row(preview, 'workforceSolution.response.backfills').proposed, '0');
  assert.equal(row(preview, 'workforceSolution.timing.arrivalDate').proposed, '2027-03-01');
  assert.equal(row(preview, 'workforceSolution.training.trainingHours').proposed, '200');
  assert.equal(row(preview, 'headcount').after, 100);
});

test('partial selected capacity replacement is blocked if preserved fields create an invalid combined mix', async () => {
  const context = fixture();
  Object.assign(context.destination.workforceSolution.versions[0].inputs.response, {buy: '2', build: '0'});
  const incomplete = await previewActionPlanApplication(context, {'workforceSolution.response.build': 'replace'});
  assert.equal(row(incomplete, 'workforceSolution.response.build').status, 'blocked');
  assert.ok(incomplete.blockers.some(message => /sum/.test(message)));
  const complete = await previewActionPlanApplication(context, {'workforceSolution.response.build': 'replace', 'workforceSolution.response.buy': 'replace'});
  assert.equal(row(complete, 'workforceSolution.response.build').after, '1');
  assert.equal(row(complete, 'workforceSolution.response.buy').after, '1');
});

test('capacity mapping needs exact confirmation, matching scope/horizon and available history space', async () => {
  for (const edit of [
    context => {context.capacityReview = null;},
    context => {context.capacityReview.version = 2;},
    context => {context.capacityReview.source.attachmentId = 'other';},
    context => {context.destination.workforceSolution.versions[0].inputs.scope.businessUnit = 'OTHER';},
    context => {context.destination.workforceSolution.versions[0].inputs.scope.months = '12';},
    context => {context.destination.workforceSolution.versions[0].inputs.scope.goalStatement = 'Other goal';},
    context => {context.destination.workforceSolution.versions[0].inputs.training.loadedHourlyCost = 50;},
    context => {context.destination.workforceSolution.versions[0].inputs.response.trainingCash = '9000';},
    context => {context.destination.workforceSolution = beginSolutionRun(context.destination.workforceSolution, 1, 'pending', ['brief'], stamp).state;},
    context => {const solution = context.destination.workforceSolution; solution.versions = Array.from({length: 50}, (_, index) => ({...structuredClone(solution.versions[0]), version: index + 1})); context.capacityReview.version = 50;},
  ]) {
    const context = fixture(); edit(context);
    const preview = await previewActionPlanApplication(context, {'workforceSolution.training.trainingCash': 'replace'});
    assert.equal(row(preview, 'workforceSolution.training.trainingCash').status, 'blocked');
    assert.equal(row(preview, 'workforceSolution.training.trainingCash').after, '7000');
  }
});

test('missing destinations produce blocked rows without inventing options or solution versions', async () => {
  const context = fixture(); context.destination.development = null; context.destination.workforceSolution = null; context.developmentTarget = null; context.capacityReview = null;
  const preview = await previewActionPlanApplication(context);
  assert.deepEqual(preview.selectedChanges, []);
  assert.equal(preview.binding.solutionVersion, null);
  assert.ok(preview.rows.some(row => row.destination.includes('unselected')));
  assert.equal(context.destination.development, null);
});

test('catalogue scenario and source headcount are read-only, and unsupported/additive policies are rejected', async () => {
  const context = fixture(), preview = await previewActionPlanApplication(context, {selectedPlanningScenario: 'replace', headcount: 'replace'});
  assert.equal(row(preview, 'selectedPlanningScenario').after, 'Baseline');
  assert.equal(row(preview, 'selectedPlanningScenario').proposed, null);
  assert.equal(row(preview, 'headcount').after, 100);
  assert.equal(preview.blockers.length, 2);
  await assert.rejects(previewActionPlanApplication(context, {[path('participants')]: 'add'}), /Unsupported application policy/);
  await assert.rejects(previewActionPlanApplication(context, {'development.options[3].inputs.fee': 'replace'}), /Unsupported destination/);
  await assert.rejects(previewActionPlanApplication(context, {'api.headcount': 'replace'}), /Unsupported destination/);
});

test('freshness rejects changes to goal, evidence, planning, draft, source IDs, attachment and destination snapshots', async () => {
  const context = fixture(), preview = await previewActionPlanApplication(context);
  for (const edit of [
    next => {next.binding.goalId = 'other-goal';}, next => {next.binding.goal = 'Changed goal';},
    next => {next.binding.evidenceDigest = 'b'.repeat(64);}, next => {next.binding.planningDigest = 'c'.repeat(64);},
    next => {next.currentDraft = reviseBundleDraft(next.currentDraft, next.currentDraft.inputs);},
    next => {next.currentDraft.bundle.components[0].evidence = ['W2:summary'];},
    next => {next.attachmentId = 'missing';}, next => {next.destination.revision++;},
    next => {next.destination.development.options[0].inputs.participants = '12';},
    next => {next.destination.development.draft.provider = 'Unsaved provider';},
    next => {next.destination.selectedPlanningScenario = 'Another scenario';},
    next => {next.destination.workforceSolution = reviseWorkforceSolution(next.destination.workforceSolution, 1, {training: {trainingCash: '5'}}, 'sidebar', 'Changed inputs', stamp);},
  ]) {const next = structuredClone(context); edit(next); assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, next), false);}
});

test('newer saved drafts, superseded attachments and tampered calculations cannot preview stale application', async () => {
  const context = fixture(), preview = await previewActionPlanApplication(context), revised = reviseBundleDraft(context.currentDraft, context.currentDraft.inputs);
  const newer = structuredClone(context); newer.workspace = saveBundleDraftPatch(newer.workspace, revised).value;
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, newer), false);
  const superseded = structuredClone(context); superseded.workspace = attach(revised, context.workspace, 'attachment-2', 'attachment-1');
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, superseded), false);
  const tampered = structuredClone(context); tampered.workspace.attachments[0].result.plannedAddedEmployees = 999;
  await assert.rejects(previewActionPlanApplication(tampered), /verifiable saved/);
  preview.rows[0].after = 'Tampered goal';
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, context), false);
});

test('malformed, cross-goal, oversized and unsupported destination structures fail closed', async () => {
  for (const edit of [
    context => {context.destination.goalId = 'other-goal';},
    context => {context.destination.workforceSolution.goalId = 'other-goal';},
    context => {context.destination.workforceSolution.versions[0].version = 2;},
    context => {context.destination.development.options.push(...Array(3).fill(context.destination.development.options[0]));},
    context => {context.destination.development.options[0].quote.currency = 'BTC';},
    context => {context.destination.development.options[0].inputs.fee = Number.NaN;},
    context => {context.capacityReview.confirmedAdditionalCapacity = false;},
    context => {context.developmentTarget.quoteReview.loadedHourlyCostCompatible = 'yes';},
    context => {context.destination.development.draft.provider = 'x'.repeat(200001);},
  ]) {const context = fixture(); edit(context); await assert.rejects(previewActionPlanApplication(context));}
});

test('Development replacements validate the resulting values while retaining invalid intermediate edits', async () => {
  const context = fixture(); context.destination.development.options[0].inputs.sessions = 'invalid';
  const defaultPreview = await previewActionPlanApplication(context);
  assert.equal(row(defaultPreview, path('sessions')).after, 'invalid');
  const partial = await previewActionPlanApplication(context, {[path('participants')]: 'fill-empty'});
  assert.equal(row(partial, path('participants')).status, 'blocked');
  assert.equal(row(partial, path('participants')).after, '');
  const repaired = await previewActionPlanApplication(context, {[path('participants')]: 'fill-empty', [path('sessions')]: 'replace'});
  assert.equal(row(repaired, path('participants')).after, '10');
  assert.equal(row(repaired, path('sessions')).after, '3');
});

test('capacity fields use the existing adapter exactly and blanks never erase known destination costs', async () => {
  const context = fixture(); context.destination.workforceSolution.versions[0].inputs.costs.annualBackfillCost = '90000';
  const preview = await previewActionPlanApplication(context, {'workforceSolution.costs.annualBackfillCost': 'replace'});
  for (const [section, , fields] of workforceInputGroups) for (const [field] of fields) {
    assert.equal(row(preview, `workforceSolution.${section}.${field}`).proposed, context.currentDraft.inputs.capacity.input[field] || null);
  }
  assert.equal(row(preview, 'workforceSolution.costs.annualBackfillCost').after, '90000');
  assert.equal(row(preview, 'workforceSolution.costs.annualHireCost').unit, 'USD/external hire/year (loaded)');
  assert.equal(row(preview, 'workforceSolution.costs.hireFee').unit, 'USD/external hire (one-time)');
});

test('capacity fill-empty targets existing scaffold fields without adding versions or copying calculation results', async () => {
  const context = fixture(), inputs = emptySolutionInputs(); inputs.scope.goalStatement = binding.goal;
  context.destination.workforceSolution = createWorkforceSolution('solution-1', binding.goalId, inputs, stamp);
  const choices = Object.fromEntries(workforceInputGroups.flatMap(([section, , fields]) => fields.map(([field]) => [`workforceSolution.${section}.${field}`, 'fill-empty'])));
  const preview = await previewActionPlanApplication(context, choices);
  assert.equal(row(preview, 'workforceSolution.response.build').after, '1');
  assert.equal(row(preview, 'workforceSolution.response.buy').after, '1');
  assert.equal(row(preview, 'workforceSolution.costs.annualHireCost').after, '120000');
  assert.equal(context.destination.workforceSolution.versions.length, 1);
  assert.deepEqual(context.destination.workforceSolution.results, []);
  assert.equal(preview.blockers.length, 0);
});

test('unresolved overlap between Build and Move blocks capacity despite attachment acknowledgement', async () => {
  const context = fixture(draft => {
    draft.inputs.scope.demand = entered(3); draft.inputs.groupsDisjoint = unknownAssumption();
    Object.assign(draft.inputs.capacity.input, {roles: '3', move: '1', moveMonth: '2027-04'});
    draft.inputs.capacity.origins.moveMonth = {kind: 'user-entered', basis: 'Reviewed timing.'};
    draft.inputs.capacity.flows.push({id: 'move', path: 'move', componentIds: ['c3'], groupId: 'other'});
  });
  const preview = await previewActionPlanApplication(context, {'workforceSolution.training.trainingCash': 'replace'});
  assert.equal(row(preview, 'workforceSolution.training.trainingCash').status, 'blocked');
  assert.match(row(preview, 'workforceSolution.response.move').reason, /overlap/);
});

test('working edits during asynchronous fingerprinting cannot change the returned snapshot', async () => {
  const context = fixture(), original = structuredClone(context);
  const pending = previewActionPlanApplication(context);
  context.destination.development.options[0].quote.provider = 'Changed while awaiting preview';
  const preview = await pending;
  assert.equal(row(preview, 'development.options[0].quote').current.provider, original.destination.development.options[0].quote.provider);
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, original), true);
  assert.equal(await actionPlanApplicationPreviewIsCurrent(preview, context), false);
});

test('new Action Plans cannot copy a staff hourly rate even when marked compatible',async()=>{
 const context=fixture(),preview=await previewActionPlanApplication(context,{[path('hourlyCost')]:'replace'});
 assert.equal(row(preview,path('hourlyCost')).proposed,null);assert.equal(row(preview,path('hourlyCost')).after,'');
 assert.equal(row(preview,path('hourlyCost')).status,'blocked');
});
