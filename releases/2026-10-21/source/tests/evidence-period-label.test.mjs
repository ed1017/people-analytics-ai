import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceAsOfLabel, evidenceMonthWindow } from '../lib/evidence-period-label.ts';

test('source snapshot labels follow the actual date, including UTC month boundaries', () => {
  assert.equal(evidenceAsOfLabel('2027-01-01'), 'As of January 1, 2027');
  assert.equal(evidenceAsOfLabel('2026-09-30'), 'As of September 30, 2026');
  assert.equal(evidenceAsOfLabel('2024-02-29'), 'As of February 29, 2024');
});

test('unknown or impossible snapshot dates remain unavailable', () => {
  for (const date of [null, undefined, '', '2027-02-29', '2026-13-01', '2026-09', '2026-09-30T00:00:00Z']) {
    assert.equal(evidenceAsOfLabel(date), 'Source date unavailable');
  }
});

test('chart period uses actual unordered observations, not a fixed release window', () => {
  assert.equal(evidenceMonthWindow(['2027-03-31', '2026-12-31', '2027-01-31']), 'Dec 2026 – Mar 2027');
  assert.equal(evidenceMonthWindow(['2027-03-01', '2027-03-31']), 'Mar 2027');
  assert.equal(evidenceMonthWindow(['2025-06-30']), 'Jun 2025');
});

test('an absent or invalid observation does not fabricate a complete period', () => {
  assert.equal(evidenceMonthWindow([]), 'Period unavailable');
  assert.equal(evidenceMonthWindow(['2027-01-31', null]), 'Period unavailable');
  assert.equal(evidenceMonthWindow(['2027-02-30']), 'Period unavailable');
});
