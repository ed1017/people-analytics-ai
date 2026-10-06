import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {baselineBatch, forecastBaseline} from '../experiments/synthetic_tree_v1/baselines.mjs';
import {generateWorkforceCase, replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {currentReference} from '../lib/ml/synthetic-history-length/models.mjs';
import {dayAdd, monthAdd} from '../lib/ml/synthetic-workforce/common.mjs';

const config = JSON.parse(readFileSync(new URL('../lib/ml/synthetic-workforce/protocol.json', import.meta.url)));
const fixture = generateWorkforceCase(config, {seed: 17, family: 'stationary'});
const cutoff = '2026-06-30T23:59:59.999Z';
const targets = ['2026-07', '2026-08', '2026-09'];
function qualified(domain) {
  const snapshot = replaySynthetic(domain, fixture.domains[domain].releases, cutoff);
  const months = domain === 'satisfaction' ? ['2026-09'] : targets;
  const native = currentReference(snapshot, months);
  assert.equal(native.status, 'predicted');
  let history;
  if (domain === 'hiring') history = snapshot.records.filter(row => row.value.month >= native.audit.trainingStart
      && row.value.month <= native.audit.trainingEnd).map(row => ({month: row.value.month, openings: row.value.openingCount,
      started: row.value.actualStartEvents.filter(event => event.at <= dayAdd(row.effectiveAt, 90)).reduce((sum, event) => sum + event.count, 0)}));
  else if (domain === 'turnover') history = snapshot.records.slice(-24).map(row => ({month: row.value.month, value: row.value.voluntaryExits}));
  else history = snapshot.records.slice(-8).map(row => ({month: row.effectiveAt.slice(0, 7), value: row.value.scorePct}));
  return {input: {id: domain, domain, months, history}, native};
}

for (const domain of ['turnover', 'hiring', 'satisfaction']) test(`${domain}: arithmetic bridge exactly matches native seed17 predictions`, () => {
  const {input, native} = qualified(domain);
  const actual = forecastBaseline(input);
  const expected = native.predictions.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'identity')));
  assert.deepEqual(actual.predictions, expected);
  assert.equal(actual.interval, null);
  assert.equal(actual.operationallyQualified, false);
});

test('calendar holes and small samples abstain without moving anchors', () => {
  for (const domain of ['turnover', 'hiring', 'satisfaction']) {
    const {input} = qualified(domain);
    input.history.splice(-2, 1);
    assert.equal(forecastBaseline(input).status, 'blocked');
    input.history = input.history.slice(-3);
    assert.equal(forecastBaseline(input).status, 'blocked');
  }
});

test('hiring zero-opening months remain in calendar support and minimum positive support applies', () => {
  const {input} = qualified('hiring');
  assert(forecastBaseline(input).audit.zeroOpeningMonths.length > 0);
  for (let index = 0; index < 13; index++) Object.assign(input.history[index], {openings: 0, started: 0});
  assert.deepEqual(forecastBaseline(input).reasons, ['insufficient-positive-cohorts']);
});

test('invalid counts and missing values fail rather than becoming zeros', () => {
  for (const domain of ['turnover', 'satisfaction']) {
    const {input} = qualified(domain);
    input.history.at(-1).value = null;
    assert.throws(() => forecastBaseline(input), /Complete finite history/);
  }
  const {input} = qualified('hiring');
  input.history.at(-1).started = input.history.at(-1).openings + 1;
  assert.throws(() => forecastBaseline(input), /Invalid complete aggregate cohort/);
});

test('forecast target must follow history and seasonal comparator must exist', () => {
  const {input} = qualified('turnover');
  assert.throws(() => forecastBaseline({...input, months: [input.history.at(-1).month]}), /Targets must follow/);
  assert.deepEqual(forecastBaseline({...input, months: [monthAdd(input.history.at(-1).month, 13)]}).reasons, ['seasonal-comparator-unavailable']);
});

test('stdin JSON batch preserves case IDs and matches imported execution', () => {
  const batch = {cases: ['turnover', 'hiring', 'satisfaction'].map(domain => qualified(domain).input)};
  const child = spawnSync(process.execPath, [new URL('../experiments/synthetic_tree_v1/baselines.mjs', import.meta.url).pathname], {input: JSON.stringify(batch), encoding: 'utf8'});
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), baselineBatch(batch));
  assert.throws(() => baselineBatch({cases: [batch.cases[0], batch.cases[0]]}), /Unique nonempty case IDs/);
});
