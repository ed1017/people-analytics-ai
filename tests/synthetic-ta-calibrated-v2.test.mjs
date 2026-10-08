import { test } from 'node:test';
import assert from 'node:assert/strict';
import targets from '../lib/synthetic-ta/calibration-targets-v2.json' with { type: 'json' };
import { buildCalibratedProposal } from '../lib/synthetic-ta/calibrated-v2.ts';

test('calibrated proposal retains all coherent headline and outcome targets', () => {
  const p = buildCalibratedProposal();
  assert.equal(p.summary.applications, 62104);
  assert.deepEqual(p.summary.stages.map(s => s.count), [62104, 31052, 15269, 5800, 5080, 5080]);
  for (const r of targets.outcomes) assert.equal(p.summary.outcomes[r.application_status], r.applications);
  assert.equal(Object.values(p.summary.outcomes).reduce((a, b) => a + b), 62104);
  assert.equal(p.summary.internalHires, 600); assert.equal(p.summary.externalHires, 4480);
  assert.deepEqual(p.history.at(-1), { month: '2026-09', coverage: 'complete-generated', active: 474, held: 67, filled: 5080, cancelled: 149, opened: 5703 });
});
test('every monthly application, offer and hire target is preserved, including pre-chart carry-in', () => {
  const p = buildCalibratedProposal();
  for (const t of targets.monthly) {
    const m = p.monthly.find(m => m.month === t.month.slice(0, 7));
    for (const k of ['applications', 'offers', 'hires']) assert.equal(m[k], t[k], `${m.month} ${k}`);
    for (const mix of ['internal', 'external']) assert.equal(p.applications.filter(c => c.hireMix === mix && c.events.at(-1).at.startsWith(m.month)).reduce((n, c) => n + c.count, 0), t[mix + '_hires']);
  }
  assert.deepEqual(p.monthly.slice(0, 2).map(m => m.applications), [57, 620]);
  assert.equal(p.monthly.slice(2).reduce((n, r) => n + r.applications, 0) + 677, 62104);
});
test('cohorts preserve ordered dated stages and each hired cohort has a paired requisition fill', () => {
  const p = buildCalibratedProposal();
  for (const c of p.applications) {
    assert(Number.isSafeInteger(c.count) && c.count > 0);
    for (let i = 1; i < c.events.length; i++) assert(c.events[i].at > c.events[i - 1].at);
    assert(c.outcomeAt <= p.cutoff);
    const linked = p.requisitions.find(r => r.id === c.requisitionCohort);
    assert(linked, 'Every aggregate application cohort has a synthetic requisition pool');
    for (const e of c.events) assert.equal(linked.events.filter(r => r.at <= e.at).at(-1)?.action, e.stage === 'Hired' ? 'fill' : 'open');
    if (c.outcome === 'hired') {
      const req = p.requisitions.find(r => r.applicationCohort === c.id);
      assert.equal(req.count, c.count);
      assert(req.events[0].at < c.events[0].at);
      assert.equal(req.events.at(-1).at, c.events.at(-1).at);
    }
  }
  // September's 75 hires against 59 offers require 16 earlier offer attainments.
  assert.equal(p.applications.filter(c => c.outcome === 'hired' && c.events.at(-1).at.startsWith('2026-09') && !c.events.find(e => e.stage === 'Offer').at.startsWith('2026-09')).reduce((n, c) => n + c.count, 0), 16);
});
test('stock balances at every month-end; generated coverage is not mistaken for loaded coverage', () => {
  const p = buildCalibratedProposal();
  for (const r of p.history) {
    assert.equal(r.opened, r.active + r.filled + r.cancelled);
    const hiresThroughMonth = p.monthly.filter(m => m.month <= r.month).reduce((n, m) => n + m.hires, 0);
    assert.equal(r.filled, hiresThroughMonth);
    assert(r.held <= r.active);
  }
  assert.match(p.coverage, /source historical coverage remains unverified/);
  assert.equal(targets.sourceChecks.requisitionsAtCutoff.active, 474);
  assert.equal(targets.sourceChecks.requisitionsAtCutoff.active, p.history.at(-1).active);
  assert.equal(targets.summary.open_requisitions - p.history.at(-1).active, 1);
  assert.equal(targets.sourceChecks.interviews.monthly_sum, 17922);
  assert.equal(targets.sourceChecks.interviews.unique, 15269);
});
