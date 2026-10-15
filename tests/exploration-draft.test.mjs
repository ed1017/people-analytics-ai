import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
import {DecisionStore} from '../lib/local-decisions.ts';
import {ExplorationDraftStore, explorationDraftKey, MAX_EXPLORATION_DRAFT_LENGTH} from '../lib/exploration-draft.ts';
import * as reset from '../lib/conversation-reset.ts';
import * as guided from '../lib/home-guided-return.ts';

const token = 'legacy-v1:0';
const draft = 'Preview check: compare hypothetical workforce options.';
const emptyGoals = () => ({version: 1, activeId: '', goals: []});
const port = () => {
  const data = new Map();
  return {data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key)};
};
const filename = path.resolve('components/problem-conversation.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;

// Run the actual hook's state/effect lifecycle offline. Remounting creates a new
// DecisionStore and new hook slots while retaining only the supplied storage ports.
function mount({enabled = false, local = port(), session = port(), dataset = token, goals = emptyGoals()} = {}) {
  let cursor = 0, slots = [], effects = [], dirty = true, current;
  const store = new DecisionStore(dataset, goals);
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => {
        const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) {slots[index] = next; dirty = true;}
      }];
    },
    useRef(initial) {const index = cursor++; return slots[index] ?? (slots[index] = {current: initial});},
    useEffect(fn, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || deps.some((value, key) => !Object.is(value, previous[key]))) {slots[index] = deps; effects.push(fn);}
    },
  };
  const mocks = {
    react,
    './use-pending-request': {usePendingRequest: () => ({pending: false, setPending() {}, startedAt: null})},
    '@/components/decision-store': {decisionStore: store, useDecisionStorage: () => store.getSnapshot()},
    '@/lib/home-solution-conversation': {solutionConversationEnabled: enabled},
    '@/lib/exploration-draft': {ExplorationDraftStore},
    '@/lib/local-goals': {emptyLocalGoals: emptyGoals},
    '@/lib/goal-context': {emptyGoalRequirements: () => ({constraints: '', decisions: '', notes: []})},
    '@/lib/problem-session': {ProblemRequestGate: class {invalidate() {} begin() {assert.fail('Restoring a draft must not begin a request');}}},
    '@/lib/conversation-reset': reset,
    '@/lib/home-onboarding': {isFirstHomeVisit: () => false},
    '@/lib/home-demo-goals': {createHomeDemoGoals: () => ({goals, workspaces: {}})},
    '@/lib/home-guided-return': guided,
  };
  const mod = new Module(filename);
  mod.filename = filename;
  mod.require = id => mocks[id] ?? {};
  mod._compile(compiled, filename);
  function flush() {
    globalThis.localStorage = local;
    globalThis.sessionStorage = session;
    globalThis.window = {addEventListener() {}, removeEventListener() {}};
    let renders = 0;
    while (dirty) {
      assert.ok(++renders < 30, 'hook settles without an effect loop');
      dirty = false; cursor = 0;
      current = mod.exports.useProblemConversation();
      const pending = effects; effects = [];
      for (const effect of pending) effect();
    }
    return current;
  }
  flush();
  return {local, session, store, current: () => current, flush};
}

for (const enabled of [false, true]) test(`unsent text survives reload with solution conversation ${enabled}`, () => {
  const first = mount({enabled}), before = [...first.local.data];
  first.current().setInput(draft); first.flush();
  const second = mount({enabled, local: first.local, session: first.session});
  assert.equal(second.current().input, draft);
  assert.deepEqual(second.current().messages, []);
  assert.equal(second.current().loading, false);
  assert.equal(second.current().storageNotice, null);
  if (!enabled) {
    assert.deepEqual([...first.local.data], before, 'general draft never enters persistent local storage');
    assert.deepEqual(JSON.parse(first.session.getItem(explorationDraftKey(token))), {version: 1, input: draft});
  } else assert.equal(first.session.getItem(explorationDraftKey(token)), null, 'enabled mode keeps its existing persistence path');
});

test('drafts are isolated by tab and dataset and retain whitespace exactly', () => {
  const first = mount(); first.current().setInput('  draft\n'); first.flush();
  assert.equal(mount({local: first.local, session: port()}).current().input, '');
  assert.equal(mount({local: first.local, session: first.session, dataset: 'candidate:1'}).current().input, '');
  assert.equal(mount({local: first.local, session: first.session}).current().input, '  draft\n');
});

test('reset and clear-all remove the tab draft rather than resurrecting it on reload', () => {
  for (const action of ['resetConversation', 'clearAllGoals']) {
    const first = mount(); first.current().setInput(draft); first.flush();
    first.current()[action](); first.flush();
    assert.equal(first.session.getItem(explorationDraftKey(token)), null);
    assert.equal(mount({local: first.local, session: first.session}).current().input, '');
  }
});

test('write failure keeps the current draft and previous bytes, with a visible notice and retry', () => {
  const session = port(); let fail = false;
  const tab = {...session, setItem(key, value) {if (fail) throw Error('Quota'); session.setItem(key, value);}};
  const first = mount({session: tab}); first.current().setInput('Earlier draft'); first.flush();
  const before = session.getItem(explorationDraftKey(token)); fail = true;
  first.current().setInput(draft); first.flush();
  assert.equal(first.current().input, draft);
  assert.match(first.current().storageNotice, /could not be saved.*Keep this tab open/);
  assert.equal(session.getItem(explorationDraftKey(token)), before);
  fail = false; first.current().retrySave(); first.flush();
  assert.equal(first.current().storageNotice, null);
  assert.equal(mount({local: first.local, session: tab}).current().input, draft);
});

test('unreadable draft is never silently replaced by hydration, typing, or retry', () => {
  const session = port(); session.setItem(explorationDraftKey(token), '{broken');
  const first = mount({session});
  assert.match(first.current().storageNotice, /could not be read.*stored copy was kept/);
  first.current().setInput(draft); first.flush(); first.current().retrySave(); first.flush();
  assert.equal(first.current().input, draft);
  assert.equal(session.getItem(explorationDraftKey(token)), '{broken');
});

test('guided isolation cannot overwrite the original General exploration draft', () => {
  const first = mount(); first.current().setInput(draft); first.flush();
  first.current().beginGuidedExploration('guided-test'); first.flush();
  first.current().setInput('Temporary guided example'); first.flush();
  assert.equal(JSON.parse(first.session.getItem(explorationDraftKey(token))).input, draft);
  assert.equal(mount({local: first.local, session: first.session}).current().input, draft);
});

test('oversized input reports failure and keeps the prior bounded draft', () => {
  const session = port(), store = new ExplorationDraftStore(session, token);
  store.read(); store.save(draft); const before = session.getItem(explorationDraftKey(token));
  store.save('x'.repeat(MAX_EXPLORATION_DRAFT_LENGTH + 1));
  assert.match(store.notice, /draft too long/); assert.equal(session.getItem(explorationDraftKey(token)), before);
});

test('saved-goal drafts keep their existing local persistence without entering the tab draft slot', () => {
  const goals = {version: 1, activeId: 'goal-a', goals: [{id: 'goal-a', statement: 'A saved goal'}]};
  const first = mount({goals}); first.current().setInput(draft); first.flush();
  assert.equal(first.session.getItem(explorationDraftKey(token)), null);
  assert.equal(mount({local: first.local, session: first.session}).current().input, draft);
});

test('denied reads show a notice and do not attempt to overwrite the inaccessible copy', () => {
  const session = port(), key = explorationDraftKey(token); let writes = 0;
  const tab = {...session, getItem(name) {if (name === key) throw Error('Denied'); return session.getItem(name);}, setItem(name, value) {if (name === key) writes++; session.setItem(name, value);}};
  const first = mount({session: tab}); first.current().setInput(draft); first.flush();
  assert.match(first.current().storageNotice, /could not be read/);
  assert.equal(first.current().input, draft); assert.equal(writes, 0);
});

test('explicit reset can clear a corrupt tab draft while ordinary editing cannot', () => {
  const session = port(); session.setItem(explorationDraftKey(token), '{broken');
  const first = mount({session}); first.current().resetConversation(); first.flush();
  assert.equal(first.current().storageNotice, null);
  assert.equal(session.getItem(explorationDraftKey(token)), null);
});

test('failed explicit clear preserves bytes, reports failure, and retries without restoring the discarded text', () => {
  const session = port(), key = explorationDraftKey(token); session.setItem(key, '{broken');
  let fail = true;
  const tab = {...session, removeItem(name) {if (name === key && fail) throw Error('Denied'); session.removeItem(name);}};
  const first = mount({session: tab}); first.current().resetConversation(); first.flush();
  assert.match(first.current().storageNotice, /could not be cleared/);
  assert.equal(session.getItem(key), '{broken'); assert.equal(first.current().input, '');
  fail = false; first.current().retrySave(); first.flush();
  assert.equal(session.getItem(key), null); assert.equal(first.current().storageNotice, null);
});
