import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {searchWorkforceMixes} from '../lib/workforce-mix-search.ts';
import {selectionFixture, selectionSpec} from './fixtures/workforce-selection.mjs';
// Captured from published PR169 33e98bb before the input-kernel extraction.
// These hashes cover full serialized report bytes, including the old money-valued time projection.
const cases = [
  [{}, {}, 'ad299692a622cd56a5aaa27d06a9c0780f53e9ef67a6c939b6c5c9c47617219b'],
  [{arrivalMode: 'historical-median', arrivalDate: ''}, {}, '669621a1ba31f236249881a1246c138995c847d232bb549673add4d195394be3'],
  [{budget: '', loadedHourlyCost: ''}, {}, '6af05a5535197088fb1aa9988d53e1d2649ba21209c8a752158d3aa44466e866'],
  [{roles: '43', build: '0', move: '0', buy: '43'}, {build: {min: 0, max: 43}, move: {min: 0, max: 43}, buy: {min: 0, max: 43}, maxEvaluations: 1000}, '808a58921e5b0f3b8f1195f1acdbb29ef9ab6adf781a86ff05386c808d9220ff'],
];
test('saved-source full report bytes replay the published facade unchanged after kernel extraction', () => {
  for (const [input, spec, expected] of cases) {
    const report = searchWorkforceMixes(selectionFixture(input).solution, 'source-result', selectionSpec(spec));
    assert.equal(createHash('sha256').update(JSON.stringify(report)).digest('hex'), expected);
  }
});
