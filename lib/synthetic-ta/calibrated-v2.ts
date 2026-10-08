import targets from './calibration-targets-v2.json' with { type: 'json' };

/** Aggregate synthetic cohorts only. No original application/requisition identifiers. */
export const VERSION = 'synthetic-ta-calibrated-v2-proposal';
export const stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Accepted', 'Hired'] as const;
type Stage = typeof stages[number];
type Outcome = 'hired' | 'offer_declined' | 'active' | 'rejected' | 'withdrawn' | 'closed';
type Event = { at: string; stage: Stage };
type Cohort = { id: string; count: number; events: Event[]; outcome: Outcome; outcomeAt: string; requisitionCohort: string; hireMix?: 'internal' | 'external' };
type ReqEvent = { at: string; action: 'open' | 'fill' | 'cancel' | 'hold' | 'resume' | 'reopen' };
type ReqCohort = { id: string; count: number; events: ReqEvent[]; applicationCohort?: string };
const date = (month: string, day: number) => month.slice(0, 7) + '-' + String(day).padStart(2, '0');
const addDays = (at: string, n: number) => new Date(Date.parse(at + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const end = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);

export function buildCalibratedProposal() {
  const cutoff = targets.cutoff;
  const applications: Cohort[] = [], requisitions: ReqCohort[] = [];
  const months = [...targets.pre2024Applications, ...targets.monthly].map(r => ({ month: r.month.slice(0, 7), remaining: r.applications }));
  const offers: { month: string; remaining: number }[] = [];
  const add = (month: string, count: number, last: Stage, outcome: Outcome, hireMonth?: string, hireMix?: 'internal' | 'external') => {
    if (!count) return;
    const pool = months.find(r => r.month === month)!;
    if (!Number.isSafeInteger(count) || count < 0 || count > pool.remaining) throw Error('Incoherent application calibration');
    pool.remaining -= count;
    const events = stages.slice(0, stages.indexOf(last) + 1).map((stage, i) => ({ stage, at: date(i >= 4 ? hireMonth! : month, [2, 4, 6, 10, 15, 20][i]) }));
    const id = `synthetic-v2-cohort-${applications.length}`;
    applications.push({ id, count, events, outcome, outcomeAt: outcome === 'active' ? cutoff : addDays(events.at(-1)!.at, outcome === 'hired' ? 0 : 1), requisitionCohort: outcome === 'hired' ? `synthetic-v2-fill-${id}` : 'synthetic-v2-residual-open', ...(hireMix ? { hireMix } : {}) });
    if (outcome === 'hired') requisitions.push({ id: `synthetic-v2-fill-${id}`, count, applicationCohort: id,
      events: [{ at: addDays(events[0].at, -30), action: 'open' }, { at: events.at(-1)!.at, action: 'fill' }] });
  };
  // Preserve every monthly offer and hire count. September hires can use earlier offers.
  for (const row of targets.monthly) {
    offers.push({ month: row.month.slice(0, 7), remaining: row.offers });
    for (const mix of ['internal', 'external'] as const) {
      let needed = row[mix === 'internal' ? 'internal_hires' : 'external_hires'];
      for (const offer of [...offers].reverse()) {
        const n = Math.min(needed, offer.remaining);
        add(offer.month, n, 'Hired', 'hired', row.month.slice(0, 7), mix);
        needed -= n; offer.remaining -= n;
        if (!needed) break;
      }
      if (needed) throw Error('Hires exceed offers available by hire month');
    }
  }
  for (const offer of offers) add(offer.month, offer.remaining, 'Offer', 'offer_declined');
  const fillRemaining = (count: number, last: Stage, outcome: Outcome, newest = false) => {
    let needed = count;
    for (const pool of newest ? [...months].reverse() : months) {
      const n = Math.min(pool.remaining, needed);
      add(pool.month, n, last, outcome); needed -= n;
      if (!needed) break;
    }
    if (needed) throw Error('Insufficient application population');
  };
  const outcomeTarget = (s: Outcome) => targets.outcomes.find(r => r.application_status === s)!.applications;
  // Preserve active outcome count at Interview; screening is an explicit new 50% assumption.
  fillRemaining(outcomeTarget('active'), 'Interview', 'active', true);
  const interviewOther = targets.summary.interviewed_applications - targets.summary.offered_applications - outcomeTarget('active');
  fillRemaining(interviewOther, 'Interview', 'rejected');
  const screeningTarget = targets.summary.applications / 2;
  fillRemaining(screeningTarget - targets.summary.interviewed_applications, 'Screening', 'rejected');
  fillRemaining(outcomeTarget('rejected') - interviewOther - (screeningTarget - targets.summary.interviewed_applications), 'Applied', 'rejected');
  fillRemaining(outcomeTarget('withdrawn'), 'Applied', 'withdrawn');
  fillRemaining(outcomeTarget('closed'), 'Applied', 'closed');
  if (months.some(r => r.remaining !== 0)) throw Error('Unallocated applications');

  // Date-bounded stock anchor; the untouched current-status headline is separately 475.
  // Residual non-hire applications use this always-open synthetic inventory, not existing req IDs.
  requisitions.push({ id: 'synthetic-v2-residual-open', count: targets.sourceChecks.requisitionsAtCutoff.active - targets.sourceChecks.requisitionsAtCutoff.held_current, events: [{ at: '2023-10-01', action: 'open' }] });
  requisitions.push({ id: 'synthetic-v2-held', count: 67, events: [{ at: '2023-10-01', action: 'open' }, { at: '2024-06-01', action: 'hold' }, { at: '2024-07-01', action: 'resume' }, { at: '2026-09-01', action: 'hold' }] });
  requisitions.push({ id: 'synthetic-v2-cancelled', count: targets.sourceChecks.requisitionsAtCutoff.cancelled, events: [{ at: '2023-10-01', action: 'open' }, { at: '2024-02-01', action: 'cancel' }, { at: '2024-03-01', action: 'reopen' }, { at: '2024-04-01', action: 'cancel' }] });
  const summary = {
    applications: applications.reduce((n, c) => n + c.count, 0),
    stages: stages.map(stage => ({ stage, count: applications.filter(c => c.events.some(e => e.stage === stage && e.at <= cutoff)).reduce((n, c) => n + c.count, 0) })),
    outcomes: Object.fromEntries(targets.outcomes.map(r => [r.application_status, applications.filter(c => c.outcome === r.application_status).reduce((n, c) => n + c.count, 0)])),
    internalHires: applications.filter(c => c.hireMix === 'internal').reduce((n, c) => n + c.count, 0),
    externalHires: applications.filter(c => c.hireMix === 'external').reduce((n, c) => n + c.count, 0),
  };
  const history = months.map(({ month }) => {
    const counts = { active: 0, held: 0, filled: 0, cancelled: 0, opened: 0 };
    for (const c of requisitions) {
      const last = c.events.filter(e => e.at <= end(month)).at(-1)?.action;
      if (!last) continue;
      counts.opened += c.count;
      if (last === 'fill') counts.filled += c.count;
      else if (last === 'cancel') counts.cancelled += c.count;
      else { counts.active += c.count; if (last === 'hold') counts.held += c.count; }
    }
    return { month, coverage: 'complete-generated' as const, ...counts };
  });
  const monthly = months.map(({ month }) => ({ month,
    applications: applications.filter(c => c.events[0].at.startsWith(month)).reduce((n, c) => n + c.count, 0),
    offers: applications.filter(c => c.events.some(e => e.stage === 'Offer' && e.at.startsWith(month))).reduce((n, c) => n + c.count, 0),
    hires: applications.filter(c => c.events.some(e => e.stage === 'Hired' && e.at.startsWith(month))).reduce((n, c) => n + c.count, 0),
  }));
  return { version: VERSION, cutoff, scope: 'Company-wide aggregate calibration; applications November 2023–September 2026; hires January 2024–September 2026',
    source: 'Generated aggregate chronology calibrated to public TA snapshot targets; not reconstructed database records',
    coverage: 'Complete generated ledger; source historical coverage remains unverified',
    summary, history, monthly, applications, requisitions,
    exclusions: ['Not calibrated to timing or aging distributions, role/BU/recruiter/source dimensions, or monthly interview-event counts', 'Generated screening count and all paired dates are assumptions, not source observations', '474 active and 149 cancelled match date-bounded interval targets; the unchanged current-status source has 475 active and 150 cancelled'] };
}
