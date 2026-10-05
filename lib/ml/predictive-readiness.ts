/** Pure local contract checks. No I/O, fitting, source authentication or causal estimation. */
type Obj = Record<string, unknown>;
type Domain = 'turnover' | 'satisfaction' | 'hiring';
type History = { recordKey: string; revision: number; effectiveAt: string; outcome: number | null; details: Obj };
type Envelope = { recordKey: string; revision: number; supersedes: number | null; effectiveAt: string; observedAt: string | null; populationVersion: string; metricVersion: string; raw: Obj };
const MAX = 1_000_000;
function check(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason); }
function object(raw: unknown, required: string[], optional: string[] = []): Obj {
  check(raw !== null && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype, 'invalid-object');
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  check(Reflect.ownKeys(raw).every(key => typeof key === 'string' && [...required, ...optional].includes(key)), 'unexpected-field');
  check(required.every(key => Object.hasOwn(descriptors, key)), 'missing-field');
  check(Object.values(descriptors).every(d => 'value' in d && d.enumerable), 'accessor-field');
  return raw as Obj;
}
function array(raw: unknown): unknown[] {
  check(Array.isArray(raw) && Object.getPrototypeOf(raw) === Array.prototype && raw.length <= 500, 'invalid-array');
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  check(Reflect.ownKeys(raw).length === raw.length + 1, 'invalid-array-fields');
  for (let i = 0; i < raw.length; i++) check(descriptors[i] && 'value' in descriptors[i] && descriptors[i].enumerable, 'invalid-array-entry');
  return raw;
}
function text(raw: unknown): string { check(typeof raw === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(raw), 'invalid-identifier'); return raw; }
function number(raw: unknown, integer = false): number {
  check(typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= MAX && (!integer || Number.isSafeInteger(raw)), 'invalid-number'); return raw;
}
function nullableNumber(raw: unknown, integer = false) { return raw === null ? null : number(raw, integer); }
function flag(raw: unknown): boolean { check(typeof raw === 'boolean', 'invalid-boolean'); return raw; }
function choice<T extends string>(raw: unknown, options: readonly T[]): T { check(typeof raw === 'string' && options.includes(raw as T), 'invalid-enum'); return raw as T; }
function stamp(raw: unknown): string {
  check(typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw) && Number.isFinite(Date.parse(raw)) && new Date(raw).toISOString() === raw, 'invalid-timestamp'); return raw;
}
function nullableStamp(raw: unknown) { return raw === null || raw === undefined ? null : stamp(raw); }
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
const eligibility = (reasons: string[]) => ({ status: reasons.length ? 'blocked' as const : 'contract-pass' as const, reasons: [...new Set(reasons)].sort() });

function selectHistory(raw: unknown, cutoff: string, reasons: string[]) {
  const envelopes: Envelope[] = array(raw).map(value => {
    const row = object(value, ['recordKey', 'revision', 'supersedes', 'effectiveAt', 'populationVersion', 'metricVersion', 'value'], ['observedAt']);
    const revision = number(row.revision, true), supersedes = row.supersedes === null ? null : number(row.supersedes, true);
    check(revision > 0 && (supersedes === null || supersedes < revision), 'invalid-revision');
    return { recordKey: text(row.recordKey), revision, supersedes, effectiveAt: stamp(row.effectiveAt), observedAt: nullableStamp(row.observedAt), populationVersion: text(row.populationVersion), metricVersion: text(row.metricVersion), raw: row };
  });
  const identities = new Set<string>(), byKey = new Map<string, Envelope[]>();
  let late = 0;
  for (const row of envelopes) {
    const id = `${row.recordKey}/${row.revision}`;
    check(!identities.has(id), 'duplicate-revision'); identities.add(id);
    if (row.observedAt === null) { reasons.push('availability-unknown'); continue; }
    if (row.observedAt > cutoff || row.effectiveAt > cutoff) { late++; continue; }
    check(row.observedAt >= row.effectiveAt, 'observation-before-event');
    const group = byKey.get(row.recordKey) ?? []; group.push(row); byKey.set(row.recordKey, group);
  }
  const selected = [...byKey.values()].map(rows => {
    rows.sort((a, b) => a.revision - b.revision);
    check(rows[0].supersedes === null, 'missing-revision-ancestor');
    for (let i = 1; i < rows.length; i++) {
      check(rows[i].supersedes === rows[i - 1].revision && rows[i].observedAt! >= rows[i - 1].observedAt!, 'invalid-revision-chain');
      check(rows[i].effectiveAt === rows[0].effectiveAt, 'revision-period-drift');
    }
    return rows.at(-1)!;
  }).sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt) || a.recordKey.localeCompare(b.recordKey));
  return { selected, late };
}

function turnover(row: Envelope, measure: string, population: string, reasons: string[]): History {
  const v = object(row.raw.value, ['period', 'voluntaryExits', 'countStatus', 'exposure']);
  check(typeof v.period === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v.period) && row.effectiveAt.startsWith(v.period), 'invalid-period');
  const outcome = nullableNumber(v.voluntaryExits, true);
  const state = choice(v.countStatus, ['recorded', 'unknown', 'suppressed']);
  if (state !== 'recorded' || outcome === null) reasons.push('count-unavailable');
  if (measure === 'voluntary-rate') {
    if (v.exposure === null) reasons.push('exposure-unavailable');
    else {
      const e = object(v.exposure, ['value', 'unit', 'populationVersion', 'period', 'definitionVersion', 'futureValue', 'futureBasis']);
      const value = nullableNumber(e.value), future = nullableNumber(e.futureValue);
      choice(e.unit, ['person-days', 'month-end-headcount']); text(e.populationVersion); text(e.definitionVersion); text(e.period);
      choice(e.futureBasis, ['scenario', 'unavailable']);
      if (e.populationVersion !== population || e.period !== v.period || e.unit !== 'person-days' || value === null || value <= 0) reasons.push('exposure-mismatch');
      if (future === null || future <= 0 || e.futureBasis !== 'scenario') reasons.push('future-exposure-unavailable');
    }
  } else if (v.exposure !== null) {
    // Validate nested input even when counts do not use exposure; no extra feature bag.
    const ignored: string[] = []; turnover(row, 'voluntary-rate', population, ignored);
  }
  return { recordKey: row.recordKey, revision: row.revision, effectiveAt: row.effectiveAt, outcome: state === 'recorded' ? outcome : null, details: { period: v.period, countStatus: state, rate: null } };
}

function satisfaction(row: Envelope, target: Obj, signatures: Set<string>, reasons: string[]): History {
  const v = object(row.raw.value, ['waveId', 'instrumentVersion', 'itemSetVersion', 'scoringVersion', 'eligibilityVersion', 'sourceKind', 'responseUnit', 'metric', 'shareSum', 'respondents', 'eligible', 'launchAt', 'closeAt', 'release']);
  text(v.waveId); text(v.instrumentVersion); text(v.itemSetVersion); text(v.eligibilityVersion);
  if (v.scoringVersion === null) reasons.push('scoring-unverified'); else text(v.scoringVersion);
  choice(v.sourceKind, ['employee-wave', 'independent-exit-enps']);
  choice(v.responseUnit, ['mean-respondent-favorable-answer-share', 'percent-satisfied-employees']);
  if (v.sourceKind !== 'employee-wave') reasons.push('source-substitution');
  if (v.responseUnit !== 'mean-respondent-favorable-answer-share' || target.measure !== v.responseUnit) reasons.push('metric-relabeling');
  if (target.cadence !== 'observed-waves') reasons.push('wave-interpolation-forbidden');
  signatures.add(JSON.stringify([v.instrumentVersion, v.itemSetVersion, v.scoringVersion, v.eligibilityVersion, row.populationVersion, row.metricVersion]));
  const launch = stamp(v.launchAt), close = stamp(v.closeAt);
  check(launch <= close && close <= row.effectiveAt, 'invalid-wave-chronology');
  const metric = nullableNumber(v.metric), shares = nullableNumber(v.shareSum), respondents = nullableNumber(v.respondents, true), eligible = nullableNumber(v.eligible, true);
  check(metric === null || metric <= 100, 'invalid-survey-score');
  check(respondents === null || eligible === null || respondents <= eligible, 'invalid-response-count');
  check(shares === null || respondents === null || shares <= respondents, 'invalid-share-sum');
  if (metric === null || shares === null || respondents === null || respondents === 0 || eligible === null || eligible === 0) reasons.push('survey-outcome-unavailable');
  if (metric !== null && shares !== null && respondents !== null && respondents > 0) check(Math.abs(metric - 100 * shares / respondents) < 1e-8, 'survey-denominator-mismatch');
  const release = object(v.release, ['status', 'minimumGroup', 'querySetReview', 'reconstructible']);
  choice(release.status, ['released', 'suppressed', 'unknown']); choice(release.querySetReview, ['reviewed', 'unknown']); flag(release.reconstructible);
  const minimum = number(release.minimumGroup, true); check(minimum >= 10, 'invalid-release-minimum');
  const withheld = release.status !== 'released' || release.querySetReview !== 'reviewed' || release.reconstructible || respondents === null || respondents < minimum;
  if (withheld) reasons.push('release-withheld');
  return { recordKey: row.recordKey, revision: row.revision, effectiveAt: row.effectiveAt,
    outcome: withheld || v.scoringVersion === null ? null : metric,
    details: { waveId: v.waveId, unit: v.responseUnit, release: withheld ? 'withheld' : 'declared-released', respondents: withheld ? null : respondents,
      eligible: withheld ? null : eligible, participationPct: !withheld && respondents !== null && eligible !== null && eligible > 0 ? 100 * respondents / eligible : null } };
}

function hiring(row: Envelope, cutoff: string, measure: string, reasons: string[]): History {
  const v = object(row.raw.value, ['count', 'openedAt', 'acceptedAt', 'acceptedObservedAt', 'hireAt', 'plannedStartAt', 'actualStartAt', 'startObservedAt', 'capacityAt', 'capacityObservedAt', 'status', 'features']);
  const count = number(v.count, true); check(count > 0, 'empty-hiring-group');
  const opened = stamp(v.openedAt); check(opened === row.effectiveAt, 'opening-period-mismatch');
  const accepted = nullableStamp(v.acceptedAt), started = nullableStamp(v.actualStartAt), capacity = nullableStamp(v.capacityAt);
  nullableStamp(v.hireAt); nullableStamp(v.plannedStartAt);
  const status = choice(v.status, ['open', 'cancelled', 'filled', 'unknown']);
  check(accepted === null || accepted >= opened, 'acceptance-before-opening');
  check(started === null || started >= (accepted ?? opened), 'start-before-acceptance');
  check(capacity === null || (started !== null && capacity >= started), 'capacity-before-start');
  const visible = (date: string | null, rawObserved: unknown) => {
    const observed = nullableStamp(rawObserved);
    check(date !== null || observed === null, 'observation-without-event');
    check(date === null || observed === null || observed >= date, 'label-observed-before-event');
    return date !== null && observed !== null && date <= cutoff && observed <= cutoff;
  };
  const acceptanceKnown = visible(accepted, v.acceptedObservedAt), startKnown = visible(started, v.startObservedAt), capacityKnown = visible(capacity, v.capacityObservedAt);
  for (const feature of array(v.features)) {
    const f = object(feature, ['name', 'availableAt']);
    choice(f.name, ['opening-month', 'pipeline-count', 'revised-planned-start']);
    const available = nullableStamp(f.availableAt);
    if (f.name !== 'opening-month') reasons.push('unsupported-opening-feature');
    if (available === null || available > opened) reasons.push('feature-not-opening-known');
  }
  const days = (date: string | null, known: boolean) => known ? (Date.parse(date!) - Date.parse(opened)) / 86400000 : null;
  const acceptanceDays = days(accepted, acceptanceKnown), startDays = status === 'filled' ? days(started, startKnown) : null;
  const capacityDays = status === 'filled' ? days(capacity, capacityKnown) : null;
  const outcome = measure === 'opening-to-accepted-offer' ? acceptanceDays : measure === 'capacity-ready' ? capacityDays : startDays;
  if (outcome === null) reasons.push(measure === 'capacity-ready' ? 'capacity-unavailable' : 'unresolved-hiring-cohort');
  return { recordKey: row.recordKey, revision: row.revision, effectiveAt: row.effectiveAt, outcome,
    details: { count, disposition: status === 'cancelled' ? 'cancelled' : startDays === null ? 'unresolved' : 'observed-start', acceptanceDays, startDays, capacityDays,
      openingMonth: Number(opened.slice(5, 7)) } };
}

function effects(studyRaw: unknown, groupsRaw: unknown, cutoff: string, population: string, metric: string, completeThrough: string | null, commonReasons: string[]) {
  const reasons = [...commonReasons];
  const rawGroups = array(groupsRaw);
  if (studyRaw === null) {
    check(rawGroups.length === 0, 'groups-without-study');
    return { eligibility: eligibility([...reasons, 'missing-comparison-design']), audit: null };
  }
  const s = object(studyRaw, ['id', 'design', 'assignmentAt', 'designObservedAt', 'contrast', 'populationVersion', 'metricVersion', 'usesPostOutcomeAssignment', 'adjustmentAvailableAt', 'diagnostics', 'minimumUnitsPerArm', 'benefitCombination']);
  text(s.id); choice(s.design, ['randomized', 'observational']); choice(s.contrast, ['intention-to-treat', 'as-treated']);
  text(s.populationVersion); text(s.metricVersion); flag(s.usesPostOutcomeAssignment);
  const assignment = stamp(s.assignmentAt), designed = nullableStamp(s.designObservedAt), adjustment = nullableStamp(s.adjustmentAvailableAt);
  if (designed === null || designed > assignment || assignment > cutoff || s.usesPostOutcomeAssignment || (adjustment !== null && adjustment > assignment)) reasons.push('post-outcome-design');
  if (s.populationVersion !== population || s.metricVersion !== metric) reasons.push('study-scope-mismatch');
  if (s.contrast !== 'intention-to-treat') reasons.push('exposure-contrast-needs-design');
  choice(s.benefitCombination, ['single', 'sum-overlapping']);
  if (s.benefitCombination === 'sum-overlapping') reasons.push('overlapping-benefits');
  const diagnostics = object(s.diagnostics, ['overlap', 'preTrends', 'concurrentChanges', 'spillovers']);
  choice(diagnostics.overlap, ['adequate', 'unknown', 'inadequate']); choice(diagnostics.preTrends, ['supported', 'unknown', 'violated']);
  choice(diagnostics.concurrentChanges, ['accounted', 'unknown']); choice(diagnostics.spillovers, ['accounted', 'unknown']);
  if (s.design === 'observational') reasons.push('observational-identification-unverified');
  if (diagnostics.concurrentChanges !== 'accounted' || diagnostics.spillovers !== 'accounted') reasons.push('comparison-contamination-unresolved');
  const minimum = number(s.minimumUnitsPerArm, true); check(minimum >= 2, 'invalid-independent-unit-minimum');
  const units = new Map<string, { arm: string; rows: Obj[] }>();
  const identities = new Set<string>(), windows = new Map<string, Set<string>>();
  let assigned = 0, exposed = 0, observed = 0;
  for (const raw of rawGroups) {
    const g = object(raw, ['unitId', 'arm', 'period', 'periodStart', 'periodEnd', 'observedAt', 'assigned', 'exposed', 'observed', 'outcomeSum']);
    const unitId = text(g.unitId), arm = choice(g.arm, ['intervention', 'comparison']), period = choice(g.period, ['pre', 'post']);
    const start = stamp(g.periodStart), end = stamp(g.periodEnd), available = nullableStamp(g.observedAt);
    check(start <= end, 'invalid-study-period');
    if (available === null || available > cutoff) { reasons.push('effect-outcome-unavailable'); continue; }
    check(available >= end, 'effect-observed-before-period-end');
    if (completeThrough === null || end > completeThrough) reasons.push('effect-period-not-complete');
    if ((period === 'pre' && end >= assignment) || (period === 'post' && start < assignment)) reasons.push('assignment-outcome-order');
    const id = `${unitId}/${period}`; check(!identities.has(id), 'duplicate-study-period'); identities.add(id);
    const n = number(g.assigned, true), e = number(g.exposed, true), o = number(g.observed, true), y = nullableNumber(g.outcomeSum);
    check(n > 0 && e <= n && o <= n, 'invalid-study-count');
    if (o !== n || y === null) reasons.push('effect-followup-incomplete');
    const unit = units.get(unitId) ?? { arm, rows: [] }; check(unit.arm === arm, 'assignment-arm-changed'); unit.rows.push({ period, assigned: n }); units.set(unitId, unit);
    const periodWindows = windows.get(period) ?? new Set<string>(); periodWindows.add(`${start}/${end}`); windows.set(period, periodWindows);
    if (period === 'post') { assigned += n; exposed += e; observed += o; }
  }
  for (const unit of units.values()) if (unit.rows.length !== 2 || unit.rows[0].assigned !== unit.rows[1].assigned) reasons.push('incomplete-assignment-cohort');
  if ([...windows.values()].some(values => values.size !== 1)) reasons.push('comparison-period-mismatch');
  const interventionUnits = [...units.values()].filter(u => u.arm === 'intervention').length, comparisonUnits = units.size - interventionUnits;
  if (interventionUnits < minimum || comparisonUnits < minimum) reasons.push('insufficient-independent-units');
  return { eligibility: eligibility(reasons), audit: { interventionUnits, comparisonUnits, assigned, exposed, observed, missing: assigned - observed, contrast: s.contrast } };
}

/** A pass means internally consistent declared inputs for further evaluation, never verified readiness or efficacy. */
export function validatePredictiveReadiness(raw: unknown) {
  const caveats = { sourceTruthVerified: false, modelAdequacyAssessed: false, forecastingPerformanceValidated: false, causalEffectValidated: false,
    uncertainty: { predictionInterval: null, effectInterval: null, goalAttainmentProbability: null, reason: 'No fitted/calibrated distribution or validated causal analysis is supplied by this contract checker.' } };
  try {
    const input = object(raw, ['schemaVersion', 'cutoff', 'manifest', 'target', 'records', 'study', 'groups']);
    check(input.schemaVersion === 1, 'unsupported-version'); const cutoff = stamp(input.cutoff);
    const m = object(input.manifest, ['dataClass', 'observationBasis', 'generatorVersion', 'generatedAt', 'sourceEvidence', 'sourceDefinitionVersion', 'populationVersion', 'metricVersion'], ['completion']);
    const dataClass = choice(m.dataClass, ['constructed-synthetic', 'company-extract']);
    choice(m.observationBasis, ['simulated', 'source-evidenced', 'unknown']); text(m.sourceDefinitionVersion);
    const population = text(m.populationVersion), metric = text(m.metricVersion), common: string[] = [];
    if (m.generatorVersion !== null) text(m.generatorVersion); nullableStamp(m.generatedAt); if (m.sourceEvidence !== null) text(m.sourceEvidence);
    if (dataClass === 'constructed-synthetic' && (m.observationBasis !== 'simulated' || m.generatorVersion === null || m.generatedAt === null)) common.push('synthetic-provenance-incomplete');
    if (dataClass === 'company-extract' && m.observationBasis === 'simulated') common.push('fabricated-historical-availability');
    if (m.observationBasis === 'unknown' || (dataClass === 'company-extract' && m.sourceEvidence === null)) common.push('availability-unverified');
    let completeThrough: string | null = null;
    if (m.completion === null || m.completion === undefined) common.push('completeness-unknown');
    else {
      const c = object(m.completion, ['status', 'through', 'observedAt', 'populationVersion', 'evidenceRef']);
      choice(c.status, ['complete', 'partial', 'unknown']); text(c.populationVersion); if (c.evidenceRef !== null) text(c.evidenceRef);
      completeThrough = nullableStamp(c.through); const observed = nullableStamp(c.observedAt);
      if (c.status !== 'complete' || completeThrough === null || observed === null || c.evidenceRef === null || observed > cutoff || c.populationVersion !== population) common.push('completeness-unknown');
      if (completeThrough !== null && observed !== null) check(observed >= completeThrough, 'completion-before-period-end');
    }
    const target = object(input.target, ['domain', 'measure', 'cadence']);
    const domain: Domain = choice(target.domain, ['turnover', 'satisfaction', 'hiring']);
    const measures = { turnover: ['voluntary-count', 'voluntary-rate'], satisfaction: ['mean-respondent-favorable-answer-share', 'percent-satisfied-employees', 'unfavorable-share'], hiring: ['opening-to-accepted-offer', 'opening-to-actual-start', 'capacity-ready'] };
    const measure = choice(target.measure, measures[domain]); choice(target.cadence, ['monthly', 'observed-waves', 'opening-cohorts']);
    const forecastReasons = [...common], selection = selectHistory(input.records, cutoff, forecastReasons), signatures = new Set<string>();
    if ((domain === 'turnover' && target.cadence !== 'monthly') || (domain === 'hiring' && target.cadence !== 'opening-cohorts')) forecastReasons.push('cadence-mismatch');
    if (!selection.selected.length) forecastReasons.push('no-available-history');
    const history = selection.selected.map(row => {
      if (row.populationVersion !== population || row.metricVersion !== metric) forecastReasons.push('history-scope-mismatch');
      if (completeThrough === null || row.effectiveAt > completeThrough) forecastReasons.push('period-not-complete');
      return domain === 'turnover' ? turnover(row, measure, population, forecastReasons) : domain === 'satisfaction' ? satisfaction(row, target, signatures, forecastReasons) : hiring(row, cutoff, measure, forecastReasons);
    });
    if (signatures.size > 1) forecastReasons.push('incomparable-survey-waves');
    const causal = effects(input.study, input.groups, cutoff, population, metric, completeThrough, common);
    return freeze({ schemaVersion: 1, inputStatus: 'valid' as const, dataClass, ...caveats,
      forecastEligibility: eligibility(forecastReasons), causalEffectEligibility: causal.eligibility, history, excludedLateRecords: selection.late, causalAudit: causal.audit });
  } catch (error) {
    const reasons = [error instanceof Error ? error.message : 'invalid-input'];
    return freeze({ schemaVersion: 1, inputStatus: 'invalid' as const, dataClass: null, ...caveats,
      forecastEligibility: eligibility(reasons), causalEffectEligibility: eligibility(reasons), history: [] as History[], excludedLateRecords: 0, causalAudit: null });
  }
}
