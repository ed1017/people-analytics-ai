import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerspectivePreference, PERSPECTIVE_KEY} from '../lib/perspective-preference.ts';

test('perspective restores only valid preferences with a stable HR server snapshot', () => {
  for (const [value, expected] of [[null,'HR'], ['Leader','Leader'], ['Finance','Finance'], ['admin','HR']]) {
    const preference = createPerspectivePreference(() => ({getItem: () => value, setItem() {}}));
    assert.equal(preference.getServerSnapshot(), 'HR');
    assert.equal(preference.getSnapshot(), expected);
  }
});

test('selection survives reload without touching goal data or another open tab', () => {
  const values = new Map([['saved-goals', 'unchanged']]);
  const storage = () => ({getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)});
  const first = createPerspectivePreference(storage), second = createPerspectivePreference(storage);
  assert.equal(second.getSnapshot(), 'HR');
  let updates = 0;
  const unsubscribe = first.subscribe(() => updates++);
  first.set('Leader');
  assert.equal(updates, 1);
  assert.equal(first.getSnapshot(), 'Leader');
  assert.equal(second.getSnapshot(), 'HR');
  assert.equal(createPerspectivePreference(storage).getSnapshot(), 'Leader');
  assert.deepEqual([...values], [['saved-goals','unchanged'], [PERSPECTIVE_KEY,'Leader']]);
  unsubscribe(); first.set('Finance'); assert.equal(updates, 1);
});

test('blocked storage preserves a usable tab-local selection', () => {
  const preference = createPerspectivePreference(() => {throw Error('blocked');});
  assert.equal(preference.getSnapshot(), 'HR');
  preference.set('Finance');
  assert.equal(preference.getSnapshot(), 'Finance');
});
