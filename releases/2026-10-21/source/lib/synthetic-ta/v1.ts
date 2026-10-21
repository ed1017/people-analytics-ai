/** Independent constructed population. Never an adapter for loaded or identified records. */
export const VERSION = 'synthetic-ta-lifecycle-v1';
export const CUTOFF = '2026-09-30';
export const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Hired'] as const;
export type Stage = typeof STAGES[number];
export type State = 'open' | 'on_hold' | 'filled' | 'cancelled';
export type ReqEvent = { at: string; state: State; action: 'open' | 'hold' | 'resume' | 'fill' | 'cancel' | 'reopen' };
export type Requisition = { id: string; events: ReqEvent[] };
export type Application = { id: string; requisitionId: string; events: { at: string; stage: Stage | 'Rejected' | 'Withdrawn' }[] };
export type Coverage = { month: string; complete: boolean };
const day = (date: string, offset: number) => new Date(Date.parse(date + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
export const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
export function stateAt(req: Requisition, at: string): State | null {
  return req.events.filter(e => e.at <= at).at(-1)?.state ?? null;
}
export function activeAt(reqs: Requisition[], at: string) {
  // Active means approved and unclosed, including on-hold, matching the existing inventory convention.
  return reqs.filter(r => ['open', 'on_hold'].includes(stateAt(r, at) ?? '')).length;
}
export function generatePopulation() {
  const requisitions: Requisition[] = [], applications: Application[] = [], coverage: Coverage[] = [];
  for (let m = 0; m < 21; m++) {
    const month = new Date(Date.UTC(2025, m, 1)).toISOString().slice(0, 7);
    coverage.push({ month, complete: month !== '2025-03' });
    // January is an explicit complete zero; March's unavailable snapshot is not a zero.
    if (!m) continue;
    for (let n = 0; n < 18 + m % 7; n++) {
      const id = `synthetic-req-${month}-${n}`, opened = month + '-05', kind = n % 6;
      const events: ReqEvent[] = [{ at: opened, state: 'open', action: 'open' }];
      let hireOffset: number | null = null;
      if (kind === 0 || kind === 1) hireOffset = kind === 0 ? 60 : 80;
      if (kind === 2) {
        events.push({ at: day(opened, 45), state: 'cancelled', action: 'cancel' }, { at: day(opened, 75), state: 'open', action: 'reopen' });
        hireOffset = 135;
      }
      if (kind === 4) {
        events.push({ at: day(opened, 20), state: 'on_hold', action: 'hold' }, { at: day(opened, 50), state: 'open', action: 'resume' });
        hireOffset = 90;
      }
      if (kind === 5) events.push({ at: day(opened, 40), state: 'cancelled', action: 'cancel' });
      if (hireOffset !== null) events.push({ at: day(opened, hireOffset), state: 'filled', action: 'fill' });
      requisitions.push({ id, events });
      // Every record is wholly synthetic. Reopened requisitions receive a fresh applicant cohort.
      for (const batch of (kind === 2 ? [0, 75] : [0])) for (let a = 0; a < 12; a++) {
        const success = a === 0 && hireOffset !== null && (kind !== 2 || batch === 75);
        const lastStage = success ? 5 : a % 5;
        const offsets = kind === 4 ? [2, 5, 55, 60, 65, hireOffset ?? 90] : [2, 5, 12, 20, 25, (hireOffset ?? 60) - batch];
        // Non-successful cohorts on held reqs finish before hold; no activity while held.
        const dates = !success && kind === 4 ? [2, 5, 8, 11, 14, 17] : offsets;
        const appEvents: Application['events'] = STAGES.slice(0, lastStage + 1).map((stage, index) => ({ at: day(opened, batch + dates[index]), stage }));
        if (!success) appEvents.push({ at: day(appEvents.at(-1)!.at, 2), stage: a % 2 ? 'Rejected' : 'Withdrawn' });
        applications.push({ id: `synthetic-app-${month}-${n}-${batch}-${a}`, requisitionId: id, events: appEvents });
      }
    }
  }
  return { requisitions, applications, coverage };
}
export function summarize(population: ReturnType<typeof generatePopulation>, cutoff = CUTOFF) {
  const { requisitions, applications, coverage } = population;
  const eligible = applications.filter(a => a.events[0].at <= cutoff);
  const stages = STAGES.map(stage => ({ stage, count: eligible.filter(a => a.events.some(e => e.stage === stage && e.at <= cutoff)).length }));
  const outcomes = Object.fromEntries(['Rejected', 'Withdrawn', 'Hired', 'In progress'].map(outcome => [outcome, eligible.filter(a => {
    const latest = a.events.filter(e => e.at <= cutoff).at(-1)?.stage;
    return outcome === 'In progress' ? !['Rejected', 'Withdrawn', 'Hired'].includes(latest ?? '') : latest === outcome;
  }).length]));
  const history = coverage.filter(c => monthEnd(c.month) <= cutoff).map(c => ({ ...c, active: c.complete ? activeAt(requisitions, monthEnd(c.month)) : null }));
  const monthly = history.map(row => ({ month: row.month, applications: eligible.filter(a => a.events[0].at.startsWith(row.month)).length,
    hires: eligible.filter(a => a.events.some(e => e.stage === 'Hired' && e.at <= cutoff && e.at.startsWith(row.month))).length }));
  return { version: VERSION, cutoff, scope: 'Wholly synthetic company-wide population; February 2025–September 2026 application cohorts',
    stages, outcomes, history, monthly, active: history.at(-1)?.active ?? null,
    onHold: requisitions.filter(r => stateAt(r, cutoff) === 'on_hold').length,
    filled: requisitions.filter(r => stateAt(r, cutoff) === 'filled').length,
    cancelled: requisitions.filter(r => stateAt(r, cutoff) === 'cancelled').length,
    opened: requisitions.filter(r => r.events[0].at <= cutoff).length };
}
export function forecast(history: { month: string; active: number | null; complete?: boolean }[], cutoff = CUTOFF) {
  // Require consecutive complete end-of-history snapshots; never bridge missing values.
  const recent = history.slice(-3);
  if (recent.length !== 3 || recent.some(r => !/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) || r.complete === false || r.active === null || !Number.isInteger(r.active) || r.active < 0)) return [];
  if (monthEnd(recent[2].month) !== cutoff) return [];
  if (recent.some((r, i) => i > 0 && day(monthEnd(recent[i - 1].month), 1).slice(0, 7) !== r.month)) return [];
  const values = recent.map(r => r.active as number), last = values[2];
  const mean = Math.round(values.reduce((a, b) => a + b, 0) / 3), change = (last - values[0]) / 2;
  const [year, month] = recent[2].month.split('-').map(Number);
  return [1, 2, 3].map(h => ({ month: new Date(Date.UTC(year, month - 1 + h, 1)).toISOString().slice(0, 7),
    carryForward: last, recentMean: mean, dampedChange: Math.max(0, Math.round(last + change * Array.from({ length: h }, (_, k) => .5 ** (k + 1)).reduce((a, b) => a + b, 0))) }));
}
export function buildPreview() {
  const summary = summarize(generatePopulation());
  const forecasts = forecast(summary.history);
  return { ...summary, forecasts,
    aiContext: { source: VERSION, synthetic: true, scope: summary.scope, cutoff: CUTOFF,
      metric: 'Distinct active requisitions at month-end, including on-hold; not openings or positions',
      limitation: 'Constructed lifecycle and stage history. Not loaded records, operational forecasts, causal effects, or a filtered planning baseline.',
      active: summary.active, stages: summary.stages, outcomes: summary.outcomes,
      history: summary.history, forecasts, forecastLimitation: 'Nonnegative integer stock baselines; unvalidated, no intervals or selected winner, not future opening counts or reconciled future flows.' } };
}
export type Preview = ReturnType<typeof buildPreview>;
