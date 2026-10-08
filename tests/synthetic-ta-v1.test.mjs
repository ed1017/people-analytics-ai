import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePopulation, summarize, buildPreview, stateAt, activeAt, forecast, CUTOFF, STAGES } from '../lib/synthetic-ta/v1.ts';

test('synthetic population has unique identities and valid lifecycle transitions', () => {
  const { requisitions, applications } = generatePopulation();
  assert.equal(new Set(requisitions.map(r => r.id)).size, requisitions.length);
  assert.equal(new Set(applications.map(a => a.id)).size, applications.length);
  const allowed = { open: ['on_hold', 'filled', 'cancelled'], on_hold: ['open'], cancelled: ['open'], filled: [] };
  for (const r of requisitions) {
    assert.match(r.id, /^synthetic-req-/);
    for (let i = 1; i < r.events.length; i++) {
      assert(r.events[i].at > r.events[i - 1].at);
      assert(allowed[r.events[i - 1].state].includes(r.events[i].state));
    }
  }
});

test('every month reconciles stock, fills, application outcomes and cumulative stages', () => {
  const pop = generatePopulation();
  for (const c of pop.coverage) {
    const cutoff = new Date(Date.UTC(Number(c.month.slice(0, 4)), Number(c.month.slice(5)), 0)).toISOString().slice(0, 10);
    const s = summarize(pop, cutoff);
    const active = activeAt(pop.requisitions, cutoff);
    assert.equal(s.opened, active + s.filled + s.cancelled);
    assert.equal(s.stages.at(-1).count, s.filled);
    assert.equal(Object.values(s.outcomes).reduce((a, b) => a + b), s.stages[0].count);
    assert.equal(s.monthly.reduce((n, row) => n + row.applications, 0), s.stages[0].count);
    assert.equal(s.monthly.reduce((n, row) => n + row.hires, 0), s.filled);
    for (let i = 1; i < s.stages.length; i++) assert(s.stages[i].count <= s.stages[i - 1].count);
  }
});

test('applications progress in order while associated requisition is open, fill exactly once', () => {
  const pop = generatePopulation(), reqs = new Map(pop.requisitions.map(r => [r.id, r]));
  for (const a of pop.applications) {
    assert.match(a.id, /^synthetic-app-/);
    const req = reqs.get(a.requisitionId);
    const stages = a.events.filter(e => STAGES.includes(e.stage));
    assert.deepEqual(stages.map(e => e.stage), STAGES.slice(0, stages.length));
    a.events.forEach((e, i) => {
      if (i) assert(e.at > a.events[i - 1].at);
      assert.equal(stateAt(req, e.at), e.stage === 'Hired' ? 'filled' : 'open');
    });
  }
  for (const r of pop.requisitions) {
    const hires = pop.applications.flatMap(a => a.requisitionId === r.id ? a.events.filter(e => e.stage === 'Hired') : []);
    assert.equal(hires.length, r.events.filter(e => e.action === 'fill').length);
    if (hires.length) assert.equal(hires[0].at, r.events.find(e => e.action === 'fill').at);
  }
});

test('reopening restores one active req; holds preserve stock; end date is inclusive', () => {
  const pop = generatePopulation();
  for (const r of pop.requisitions) for (const e of r.events) {
    assert.equal(activeAt([r], e.at), ['filled', 'cancelled'].includes(e.state) ? 0 : 1);
    assert.equal(stateAt(r, '2024-01-01'), null);
  }
});

test('missing differs from complete zero; cutoff excludes future events', () => {
  const p = buildPreview();
  assert.equal(p.history[0].active, 0);
  assert.equal(p.history.find(r => r.month === '2025-03').active, null);
  assert.equal(p.history.at(-1).month, '2026-09');
  const pop = generatePopulation(), truncated = { ...pop, requisitions: pop.requisitions.map(r => ({ ...r, events: r.events.filter(e => e.at <= CUTOFF) })), applications: pop.applications.map(a => ({ ...a, events: a.events.filter(e => e.at <= CUTOFF) })).filter(a => a.events.length) };
  assert.deepEqual(summarize(truncated), summarize(pop));
  assert.equal(p.aiContext.active, p.active);
  assert.deepEqual(p.aiContext.stages, p.stages);
});

test('count forecasts require consecutive complete months and remain nonnegative integers', () => {
  const rows = values => values.map((active, i) => ({ month: `2026-0${i + 7}`, active }));
  assert.deepEqual(forecast(rows([3, null, 0])), []);
  assert.deepEqual(forecast(rows([3, 2, null])), []);
  for (const invalid of [NaN, Infinity, -1, 1.2]) assert.deepEqual(forecast(rows([3, 2, invalid])), []);
  assert.deepEqual(forecast(rows([3, 2, 1]).map(r => ({ ...r, complete: false }))), []);
  for (const months of [['2026-06', '2026-07', '2026-08'], ['2026-08', '2026-08', '2026-09'], ['2026-08', '2026-07', '2026-09'], ['2026-00', '2026-08', '2026-09']]) assert.deepEqual(forecast(months.map(month => ({ month, active: 1 }))), []);
  assert.deepEqual(forecast([{ month: '2026-05', active: 3 }, { month: '2026-08', active: 2 }, { month: '2026-09', active: 1 }]), []);
  assert.deepEqual(forecast(rows([0, 0, 0])).map(r => r.dampedChange), [0, 0, 0]);
  const falling = forecast(rows([100, 50, 1]));
  assert.deepEqual(falling.map(r => r.dampedChange), [0, 0, 0]);
  for (const r of buildPreview().forecasts) for (const key of ['carryForward', 'recentMean', 'dampedChange']) assert(Number.isInteger(r[key]) && r[key] >= 0);
  assert.deepEqual(buildPreview().forecasts.map(r => r.month), ['2026-10', '2026-11', '2026-12']);
});

test('deterministic version retains exact reconciliation checkpoint', () => {
  assert.deepEqual(buildPreview(), buildPreview());
  const s = buildPreview();
  assert.equal(s.version, 'synthetic-ta-lifecycle-v1');
  assert.deepEqual([s.opened, s.active, s.onHold, s.filled, s.cancelled], [423, 112, 4, 248, 63]);
  assert.deepEqual(s.stages.map(r => r.count), [5844, 4666, 3201, 2203, 1237, 248]);
  assert.deepEqual(s.outcomes, { Rejected: 2890, Withdrawn: 2607, Hired: 248, 'In progress': 99 });
  console.log(JSON.stringify({ version: s.version, active: s.active, onHold: s.onHold, opened: s.opened, filled: s.filled, cancelled: s.cancelled, stages: s.stages, outcomes: s.outcomes, forecasts: s.forecasts }));
});
