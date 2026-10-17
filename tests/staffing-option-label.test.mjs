import test from 'node:test';
import assert from 'node:assert/strict';
import {staffingOptionLabel} from '../lib/staffing-option-label.ts';

test('option titles name exactly the actions with positive staffing counts', () => {
  for (const [build, move, buy, expected] of [
    [0, 0, 0, 'No staffing additions'],
    [2, 0, 0, 'Develop'], [0, 2, 0, 'Move'], [0, 0, 3, 'Hire'],
    [2, 2, 0, 'Develop and move'], [2, 0, 3, 'Develop and hire'],
    [0, 2, 3, 'Move and hire'], [2, 2, 3, 'Develop, move and hire'],
  ]) assert.equal(staffingOptionLabel({build, move, buy}), expected);
});
