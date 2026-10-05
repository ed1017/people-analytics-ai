// Constructed fixtures only. No company extract or person-level model inputs.
export const provenance = Object.freeze({ generatorVersion: 'readiness-fixtures-v1', seed: 42, generatedAt: '2026-10-05T00:00:00.000Z' });
export const at = day => `${day}T00:00:00.000Z`;
export function fixture(domain = 'turnover') {
  const values = {
    turnover: { period: '2026-01', voluntaryExits: 3, countStatus: 'recorded', exposure: null },
    satisfaction: { waveId: 'wave-1', instrumentVersion: 'i1', itemSetVersion: 'items1', scoringVersion: 'score1', eligibilityVersion: 'elig1', sourceKind: 'employee-wave', responseUnit: 'mean-respondent-favorable-answer-share', metric: 75, shareSum: 45, respondents: 60, eligible: 100, launchAt: at('2026-01-01'), closeAt: at('2026-01-30'), release: { status: 'released', minimumGroup: 10, querySetReview: 'reviewed', reconstructible: false } },
    hiring: { count: 12, openedAt: at('2026-01-31'), acceptedAt: at('2026-02-10'), acceptedObservedAt: at('2026-02-11'), hireAt: at('2026-02-10'), plannedStartAt: at('2026-02-20'), actualStartAt: at('2026-03-01'), startObservedAt: at('2026-03-02'), capacityAt: null, capacityObservedAt: null, status: 'filled', features: [{ name: 'opening-month', availableAt: at('2026-01-31') }] },
  };
  return { schemaVersion: 1, cutoff: at('2026-04-01'), manifest: { dataClass: 'constructed-synthetic', observationBasis: 'simulated', generatorVersion: provenance.generatorVersion, generatedAt: provenance.generatedAt, sourceEvidence: null, sourceDefinitionVersion: 'definition1', populationVersion: 'pop1', metricVersion: 'metric1', completion: { status: 'complete', through: at('2026-03-31'), observedAt: at('2026-04-01'), populationVersion: 'pop1', evidenceRef: 'simulated-completion' } },
    target: { domain, measure: { turnover: 'voluntary-count', satisfaction: 'mean-respondent-favorable-answer-share', hiring: 'opening-to-actual-start' }[domain], cadence: { turnover: 'monthly', satisfaction: 'observed-waves', hiring: 'opening-cohorts' }[domain] },
    records: [{ recordKey: 'aggregate-1', revision: 1, supersedes: null, effectiveAt: at('2026-01-31'), observedAt: at(domain === 'hiring' ? '2026-03-03' : '2026-02-01'), populationVersion: 'pop1', metricVersion: 'metric1', value: values[domain] }], study: null, groups: [] };
}
export function revision(input, outcome = 9) {
  const row = structuredClone(input.records[0]);
  Object.assign(row, { revision: 2, supersedes: 1, observedAt: at('2026-04-02') });
  row.value.voluntaryExits = outcome; input.records.push(row); return input;
}
export function effectFixture() {
  const input = fixture();
  input.study = { id: 'generated-study', design: 'randomized', assignmentAt: at('2026-02-01'), designObservedAt: at('2026-01-01'), contrast: 'intention-to-treat', populationVersion: 'pop1', metricVersion: 'metric1', usesPostOutcomeAssignment: false, adjustmentAvailableAt: at('2026-01-01'), diagnostics: { overlap: 'adequate', preTrends: 'supported', concurrentChanges: 'accounted', spillovers: 'accounted' }, minimumUnitsPerArm: 2, benefitCombination: 'single' };
  input.groups = ['intervention', 'comparison'].flatMap(arm => [1, 2].flatMap(i => ['pre', 'post'].map(period => ({ unitId: `${arm}-${i}`, arm, period, periodStart: at(period === 'pre' ? '2026-01-01' : '2026-02-01'), periodEnd: at(period === 'pre' ? '2026-01-31' : '2026-03-31'), observedAt: at('2026-04-01'), assigned: 20, exposed: arm === 'intervention' && period === 'post' ? 15 : 0, observed: 20, outcomeSum: 4 }))));
  return input;
}
export function generateScenarios(seed = provenance.seed) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  const cases = ['zero', 'adverse', 'delayed'].map(kind => {
    const input = effectFixture();
    // Lower exits are favorable. Delayed effects lie outside the observed window.
    const effect = kind === 'adverse' ? 2 : 0;
    for (const group of input.groups) group.outcomeSum = 2 + Math.floor(random() * 3) + (group.arm === 'intervention' && group.period === 'post' ? effect : 0);
    const missing = input.groups.find(g => g.arm === 'intervention' && g.period === 'post');
    missing.observed = 17; missing.outcomeSum = null;
    revision(input, 4);
    const hiring = fixture('hiring');
    Object.assign(hiring.records[0].value, { status: 'open', actualStartAt: null, startObservedAt: null });
    const survey = fixture('satisfaction');
    return { kind, input, hiring, survey, groundTruth: { immediateExitEffect: effect, laterExitEffect: kind === 'delayed' ? -2 : effect } };
  });
  return { provenance: { ...provenance, seed }, cases };
}
