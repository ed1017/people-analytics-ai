import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationFixture} from './fixtures/action-plan-application.mjs';
import {DecisionStore, DECISIONS_STORAGE_KEY, encodeDecisions, parseDecisions} from '../lib/local-decisions.ts';
import {previewActionPlanApplication} from '../lib/action-plan-application-preview.ts';
import {applyActionPlanPreview, currentApplicationContext, applicationHistoryField, readApplicationHistory} from '../lib/action-plan-application.ts';
import {reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {saveBundleDraftPatch} from '../lib/home-bundle-records.ts';
import {beginSolutionRun, completeSolutionRun} from '../lib/workforce-solution.ts';

const at = '2026-10-05T14:00:00Z', choices = {'development.options[0].inputs.participants': 'fill-empty', 'workforceSolution.training.trainingCash': 'replace'};
function setup() {
  const context = applicationFixture(), id = context.binding.goalId, fields = {homeSolutionBundlesV1: context.workspace,
    development: context.destination.development, workforceSolution: context.destination.workforceSolution, selectedPlanningScenario: 'Baseline', unrelated: {keep: true}};
  const seed = {version: 1, revision: 12, goals: {version: 1, activeId: id, goals: [{id, statement: context.binding.goal}, {id: 'other', statement: 'Other goal'}]},
    workspaces: {[id]: {savedAt: at, fields}, other: {savedAt: at, fields: {sentinel: 'Keep other goal'}}}};
  const map = new Map([[DECISIONS_STORAGE_KEY, encodeDecisions(seed)]]), writes = [];
  const port = {getItem: key => map.get(key) ?? null, setItem: (key, value) => {writes.push({key, value}); map.set(key, value);}, removeItem: key => map.delete(key)};
  const store = new DecisionStore(); store.initialize(port);
  const read = () => currentApplicationContext(store, context);
  return {context, id, map, writes, port, store, read, seed};
}
async function preview(fixture, selected = choices) {return previewActionPlanApplication(fixture.read(), selected);}
const apply = (fixture, value, selected = choices, id = 'apply-1', guard = () => true) => applyActionPlanPreview(fixture.store, value, selected, fixture.read, guard, id, at);

test('one write publishes both destinations and receipt; original source, results and other goals survive reload', async () => {
  const fixture = setup(), solution = fixture.context.destination.workforceSolution;
  const run = beginSolutionRun(solution, 1, 'run-1', ['brief'], at), withResult = completeSolutionRun(run.state, run.ticket,
    [{id: 'result-1', kind: 'brief', calculator: {name: 'fixture', version: '1'}, payload: {old: true}}], at);
  fixture.store.setField(fixture.id, 'workforceSolution', withResult); fixture.writes.length = 0;
  const before = structuredClone(fixture.store.getSnapshot().data), value = await preview(fixture), notifications = [];
  const setItem = fixture.port.setItem;
  fixture.port.setItem = (key, raw) => {assert.deepEqual(fixture.store.getSnapshot().data, before); setItem(key, raw);};
  fixture.store.subscribe(() => notifications.push(structuredClone(fixture.store.getSnapshot())));
  const receipt = await apply(fixture, value), after = fixture.store.getSnapshot().data.workspaces[fixture.id].fields;
  assert.equal(fixture.writes.length, 1); assert.equal(notifications.length, 1); assert.equal(notifications[0].saved, true);
  assert.equal(after.development.options[0].inputs.participants, '10');
  assert.equal(after.workforceSolution.versions.length, 2); assert.equal(after.workforceSolution.versions[1].inputs.training.trainingCash, '10000');
  assert.deepEqual(after.workforceSolution.versions[0], withResult.versions[0]); assert.deepEqual(after.workforceSolution.results, withResult.results);
  assert.deepEqual(after.homeSolutionBundlesV1, before.workspaces[fixture.id].fields.homeSolutionBundlesV1);
  assert.deepEqual(fixture.store.getSnapshot().data.workspaces.other, before.workspaces.other);
  assert.deepEqual(after.unrelated, {keep: true}); assert.equal(after.selectedPlanningScenario, 'Baseline');
  assert.deepEqual(receipt.development.before, before.workspaces[fixture.id].fields.development);
  assert.deepEqual(receipt.development.after, after.development);
  assert.equal(receipt.binding.attachmentId, fixture.context.attachmentId);
  assert.equal(receipt.destinationRevisionAfter, before.revision + 1);
  assert.ok(receipt.skipped.some(row => row.destination === 'headcount'));
  const reopened = new DecisionStore(); reopened.initialize(fixture.port);
  assert.deepEqual(reopened.getSnapshot().data, fixture.store.getSnapshot().data);
  assert.deepEqual(readApplicationHistory(after[applicationHistoryField]).receipts[0], receipt);
});

test('quota failure writes and publishes neither destination nor history', async () => {
  const fixture = setup(), value = await preview(fixture), before = structuredClone(fixture.store.getSnapshot().data), raw = fixture.map.get(DECISIONS_STORAGE_KEY);
  fixture.port.setItem = () => {throw Error('Quota exceeded');};
  const observed = []; fixture.store.subscribe(() => observed.push(structuredClone(fixture.store.getSnapshot().data)));
  await assert.rejects(apply(fixture, value), /Quota/);
  assert.deepEqual(fixture.store.getSnapshot().data, before); assert.equal(fixture.map.get(DECISIONS_STORAGE_KEY), raw);
  assert.equal(fixture.store.getSnapshot().saved, false); assert.ok(observed.every(data => JSON.stringify(data) === JSON.stringify(before)));
});

test('stale source, destination, active goal and working draft fail before writes', async () => {
  for (const change of [
    fixture => fixture.store.setField(fixture.id, 'development', {...fixture.context.destination.development, goal: 'Changed goal'}),
    fixture => fixture.store.setField(fixture.id, 'homeSolutionBundlesV1', saveBundleDraftPatch(fixture.context.workspace, reviseBundleDraft(fixture.context.currentDraft, fixture.context.currentDraft.inputs)).value),
    fixture => fixture.store.saveGoals({...fixture.store.getSnapshot().data.goals, activeId: 'other'}),
    fixture => {fixture.context.currentDraft = reviseBundleDraft(fixture.context.currentDraft, fixture.context.currentDraft.inputs);},
    fixture => {fixture.context.binding = {...fixture.context.binding, evidenceDigest: 'f'.repeat(64)};},
  ]) {
    const fixture = setup(), value = await preview(fixture); change(fixture); const before = fixture.map.get(DECISIONS_STORAGE_KEY); fixture.writes.length = 0;
    await assert.rejects(apply(fixture, value)); assert.equal(fixture.writes.length, 0); assert.equal(fixture.map.get(DECISIONS_STORAGE_KEY), before);
  }
});

test('an invalid selected destination blocks every selected destination', async () => {
  const fixture = setup(), selected = {...choices, headcount: 'replace'}, value = await preview(fixture, selected), before = fixture.map.get(DECISIONS_STORAGE_KEY);
  await assert.rejects(apply(fixture, value, selected), /blocked/);
  assert.equal(fixture.writes.length, 0); assert.equal(fixture.map.get(DECISIONS_STORAGE_KEY), before);
});

test('history validation/limits block the whole transaction without pruning', async () => {
  const fixture = setup(), value = await preview(fixture);
  fixture.store.setField(fixture.id, applicationHistoryField, {version: 99, receipts: []}); fixture.writes.length = 0;
  const current = await preview(fixture), before = structuredClone(fixture.store.getSnapshot().data);
  await assert.rejects(apply(fixture, current), /history/);
  assert.equal(fixture.writes.length, 0); assert.deepEqual(fixture.store.getSnapshot().data, before);
  assert.notEqual(value.binding.destinationRevision, current.binding.destinationRevision);
});

test('double click and replay create exactly one history entry and one workforce version', async () => {
  const fixture = setup(), value = await preview(fixture);
  const outcomes = await Promise.allSettled([apply(fixture, value), apply(fixture, value, choices, 'apply-2')]);
  assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1); assert.equal(fixture.writes.length, 1);
  await assert.rejects(apply(fixture, value, choices, 'apply-3'), /changed/);
  assert.equal(fixture.store.getField(fixture.id, applicationHistoryField, null).receipts.length, 1);
  assert.equal(fixture.store.getField(fixture.id, 'workforceSolution', null).versions.length, 2);
});

test('malformed receipt provenance cannot reach the history renderer or a new transaction', async () => {
  const fixture = setup(); await apply(fixture, await preview(fixture));
  const history = structuredClone(fixture.store.getField(fixture.id, applicationHistoryField, null));
  history.receipts[0].changes[0].provenance = [null];
  assert.equal(readApplicationHistory(history), null);
});

test('storage event invalidation and unannounced external edits both block application', async () => {
  for (const emit of [false, true]) {
    const fixture = setup(), value = await preview(fixture), before = structuredClone(fixture.store.getSnapshot().data);
    const other = new DecisionStore(); other.initialize(fixture.port); other.setField(fixture.id, 'other-tab', 'newer'); fixture.writes.length = 0;
    const raw = fixture.map.get(DECISIONS_STORAGE_KEY);
    if (emit) fixture.store.invalidateExternalChange();
    await assert.rejects(apply(fixture, value));
    assert.equal(fixture.map.get(DECISIONS_STORAGE_KEY), raw); assert.deepEqual(fixture.store.getSnapshot().data, before); assert.equal(fixture.writes.length, 0);
    assert.equal(parseDecisions(raw).workspaces[fixture.id].fields['other-tab'], 'newer');
  }
});

test('source/destination changes during async validation are caught on the final read', async () => {
  const fixture = setup(), value = await preview(fixture), pending = apply(fixture, value);
  fixture.store.setField(fixture.id, 'sentinel', 'changed during validation'); fixture.writes.length = 0;
  await assert.rejects(pending, /changed/); assert.equal(fixture.writes.length, 0);
});

test('retained snapshot history blocks oversized candidate before storage receives a write', async () => {
  const fixture = setup(), value = await preview(fixture), before = fixture.map.get(DECISIONS_STORAGE_KEY);
  assert.throws(() => fixture.store.commitGoalFields(fixture.id, fixture.context.binding.goal, value.binding.destinationRevision, at,
    () => ({oversized: Array(4).fill('x'.repeat(150000))})), /512 KiB/);
  assert.equal(fixture.map.get(DECISIONS_STORAGE_KEY), before); assert.equal(fixture.writes.length, 0);
});

test('history count/byte limits stop repeated application without pruning any prior receipt', async () => {
  const fixture = setup(), selected = {'development.options[0].inputs.fee': 'replace'};
  let stopped = false;
  for (let index = 0; index <= 20; index++) {
    fixture.store.setField(fixture.id, 'development', fixture.context.destination.development);
    const value = await preview(fixture, selected), before = fixture.map.get(DECISIONS_STORAGE_KEY), history = structuredClone(fixture.store.getField(fixture.id, applicationHistoryField, null));
    fixture.writes.length = 0;
    try {await apply(fixture, value, selected, `apply-${index}`);}
    catch (error) {
      assert.match(error.message, /history/); assert.ok(index > 1);
      assert.equal(fixture.map.get(DECISIONS_STORAGE_KEY), before); assert.equal(fixture.writes.length, 0);
      assert.deepEqual(fixture.store.getField(fixture.id, applicationHistoryField, null), history);
      assert.equal(readApplicationHistory({version: 1, receipts: Array(21).fill(history.receipts[0])}), null);
      stopped = true; break;
    }
  }
  assert.ok(stopped);
});
