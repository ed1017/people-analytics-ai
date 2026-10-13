import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyScenarioInputKey as key, monthlyScenarioInputsAreCurrent as current, compareMonthlyScenarioBasis as compare, monthlyScenarioAssumptionDifferences as diff} from '../lib/monthly-scenario-compatibility.mjs';
const basis = () => ({schemaVersion: 1, calculatorVersion: 'review-contract-v1', semantics: 'start-departures-before-hires;gap=required-minus-allocated', unitBasis: 'people;contracted-FTE;workload-FTE;monthly', scope: {teamId: 'team-1'}, asOf: '2026-10-01', months: ['2026-10', '2026-11']});
test('keys survive JSON round trips and object order, preserving numeric units and array order', () => {
  const input = {people: 10, contractedFte: 8, allocatedFte: 6, months: [1, 2]};
  assert.equal(key(input), key(JSON.parse(JSON.stringify(input))));
  assert.equal(key({a: 1, b: 2}), key({b: 2, a: 1}));
  assert.notEqual(key(input), key({...input, contractedFte: 10}));
  assert.notEqual(key(input), key({...input, months: [2, 1]}));
});
test('any edited calculation input invalidates its previously captured key', () => {
  const input = {hires: [1, 0], exits: [0, 1], workload: 500, productivity: 20};
  const captured = key(input);
  assert.equal(current(captured, input), true);
  for (const field of Object.keys(input)) assert.equal(current(captured, {...input, [field]: 2}), false);
  assert.equal(current(captured, {workload: NaN}), false);
  assert.equal(current(null, input), false);
});
test('rejects lossy JSON, hostile keys, sparse arrays, excessive values and getters', () => {
  for (const value of [undefined, NaN, Infinity, 1n, new Date(), [undefined], new Array(2), JSON.parse('{"__proto__":1}'), 'x'.repeat(200001), {get a() {throw Error('must not run');}}]) assert.throws(() => key(value));
});
test('rejects array subclasses and custom prototypes without invoking inherited toJSON', () => {
  let calls = 0;
  class AlteredArray extends Array {
    toJSON() { calls++; return ['changed']; }
  }
  const subclass = new AlteredArray(1, 2);
  const custom = Object.setPrototypeOf([1, 2], {toJSON() { calls++; return ['changed']; }});
  for (const value of [subclass, custom, Object.setPrototypeOf([1, 2], null)]) {
    assert.throws(() => key(value), /standard prototype/);
    assert.throws(() => key({hires: value}), /standard prototype/);
    assert.equal(current(key({hires: [1, 2]}), {hires: value}), false);
  }
  assert.equal(calls, 0);
  assert.equal(key([1, 2]), '[1,2]');
});
test('compatible comparisons allow changed hires, exits, workload and productivity and expose each difference', () => {
  const left = {hires: 1, exits: 0, workload: 100, productivity: 10};
  const right = {hires: 2, exits: 1, workload: 120, productivity: 12};
  assert.deepEqual(compare(basis(), basis()), {compatible: true, differences: []});
  assert.deepEqual(diff(left, right).map(change => change.field), ['exits', 'hires', 'productivity', 'workload']);
});
test('rejects incompatible versions, semantics, units, scope and dates', () => {
  const changes = {schemaVersion: 2, calculatorVersion: 'v2', semantics: 'end-month', unitBasis: 'headcount-only', scope: {teamId: 'team-2'}, asOf: '2026-11-01', months: ['2026-11']};
  for (const [field, value] of Object.entries(changes)) assert.equal(compare(basis(), {...basis(), [field]: value}).compatible, false, field);
  for (const patch of [{asOf: '2026-02-30'}, {months: ['2026-11', '2026-10']}, {months: ['2026-10', '2026-10']}, {scope: {}}, {calculatorVersion: ''}, {extra: true}]) assert.equal(compare(basis(), {...basis(), ...patch}).compatible, false);
});
test('differences distinguish absent/null and do not alias mutable source assumptions', () => {
  const left = {hires: [1]}, right = {hires: [2], exits: null};
  const changes = diff(left, right);
  assert.deepEqual(changes[0], {field: 'exits', before: {present: false}, after: {present: true, value: null}});
  changes[1].after.value[0] = 99;
  assert.deepEqual(right.hires, [2]);
});
