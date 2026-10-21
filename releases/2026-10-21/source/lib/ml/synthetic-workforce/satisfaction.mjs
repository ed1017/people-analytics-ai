import { binomial, dayAdd, firstDay, integer, monthEnd, monthsFor, release, rng } from './common.mjs';

const ITEM_COUNT = 5;
const MINIMUM_ANSWERS = 2;
const MASKED_FIELDS = ['eligible', 'submitted', 'nonrespondents', 'invalidRespondents', 'respondents', 'validAnswerCount', 'invalidAnswerCount', 'missingAnswerCount', 'scoredAnswerCount', 'favorableAnswerCount', 'shareSum', 'scorePct', 'participationPct'];
const IDENTITY = Object.freeze({
  instrumentVersion: 'synthetic-quarterly-instrument-v1', itemSetVersion: 'synthetic-five-items-v1',
  scoringVersion: 'synthetic-respondent-shares-v1', eligibilityVersion: 'synthetic-quarter-end-stock-v1',
});
function definitions() {
  return {
    assumptionBasis: 'New explicit synthetic assumptions; not recovered original instrument or historical timing.',
    identity: { ...IDENTITY },
    alternativeInstrumentVersion: 'synthetic-quarterly-instrument-v2',
    scale: [1, 2, 3, 4, 5], favorableValues: [4, 5], itemCount: ITEM_COUNT,
    itemWeighting: 'equal', reverseItems: [], excludedItems: [], minimumAnsweredItems: MINIMUM_ANSWERS,
    missingItemPolicy: 'answered-items-only', invalidAnswerPolicy: 'exclude-invalid-answer-from-answered-items',
    invalidRespondentPolicy: 'exclude-submissions-with-fewer-than-two-valid-answers',
    responseUnit: 'mean-respondent-favorable-answer-share',
    denominator: 'valid respondents; first calculate favorable / valid answered items per respondent',
    participationDenominator: 'eligible quarter-end workforce stock',
    design: 'repeated-cross-section-no-person-identifiers',
    population: 'one-company-quarter-end-stock',
    eligibilityTiming: 'Quarter-end eligibility is a new simulation convention, not eligibility known at wave launch.',
    releaseClaim: 'Synthetic release states only; not a privacy or complementary-suppression certification.',
    temporalBasis: 'All availability is simulated; sourceObservedAt is always null.',
    generationAssumptions: {
      cadenceMonths: 3, itemsPerSubmission: ITEM_COUNT,
      submissionProbability: { ordinary: 0.73, reportingStress: 0.48 },
      unusableSubmissionProbability: 0.025,
      missingItemProbabilityConditionalOnUsableSubmission: 0.12,
      invalidAnswerProbabilityConditionalOnNonmissingItem: 0.025,
      favorableProbability: {
        stationary: 0.65, gradualImprovement: '0.48 + zeroBasedWaveIndex * 0.012',
        regimeReversalBeforeChange: '0.62 + zeroBasedWaveIndex * 0.004', regimeReversalAfterChange: 0.38,
        surveyBreakAfterChange: 0.77, forcedFirstWave: 0,
      },
      responseSampling: 'New independent seeded binomial sampling; 0.73 is not recovery of an original 74% deterministic rule.',
      nonresponseAssumption: 'Within-wave response is independent of outcome; this does not prove representativeness or validate missing-not-at-random behavior.',
      initialReportLagDays: { ordinary: 10, reportingStress: 45 },
      partialRecoveryAdditionalLagDays: 30, correctionLagDaysFromClose: 130,
      persistentMissingZeroBasedWaveIndex: 4, persistentSuppressedZeroBasedWaveIndex: 5,
      partialSchedule: 'waveIndex=3 in every family; reporting-stress also waveIndex modulo 4 = 2',
      eligibilityCorrectionSchedule: 'waveIndex=20 in every family; reporting-stress also waveIndex=21',
      initialEligibilityOvercountBeforeCorrection: 20,
    },
    futureFieldBoundary: 'Truth is a separate sidecar; releases contain only fields simulated as available.',
  };
}
function simulateWave(random, eligible, favorableProbability, responseProbability) {
  const submitted = binomial(random, eligible, responseProbability);
  let respondents = 0, validAnswerCount = 0, invalidAnswerCount = 0, missingAnswerCount = 0;
  let scoredAnswerCount = 0, favorableAnswerCount = 0, shareSum = 0;
  for (let person = 0; person < submitted; person++) {
    let answered = 0, favorable = 0;
    // Some submissions are unusable; no latent person row or identity is emitted.
    const unusable = random() < 0.025;
    for (let item = 0; item < ITEM_COUNT; item++) {
      const missing = unusable || random() < 0.12;
      if (missing) { missingAnswerCount++; continue; }
      if (random() < 0.025) { invalidAnswerCount++; continue; }
      const score = random() < favorableProbability ? integer(random, 4, 5) : integer(random, 1, 3);
      answered++; validAnswerCount++;
      if (score >= 4) favorable++;
    }
    if (answered >= MINIMUM_ANSWERS) {
      respondents++; scoredAnswerCount += answered; favorableAnswerCount += favorable;
      shareSum += favorable / answered;
    }
  }
  return { eligible, submitted, nonrespondents: eligible - submitted, invalidRespondents: submitted - respondents,
    respondents, validAnswerCount, invalidAnswerCount, missingAnswerCount, scoredAnswerCount, favorableAnswerCount,
    shareSum: respondents > 0 ? shareSum : null, scorePct: respondents > 0 ? 100 * shareSum / respondents : null,
    participationPct: eligible > 0 ? 100 * respondents / eligible : null };
}
function masked(value) {
  return { ...value, ...Object.fromEntries(MASKED_FIELDS.map(key => [key, null])) };
}

/** Generate a new aggregate survey experiment, not a reconstruction of source history. */
export function generateSatisfaction(config, { seed, family, workforce }) {
  if (!config.families.includes(family) || !Number.isSafeInteger(seed) || !config.seeds.includes(seed)) throw Error('Unsupported satisfaction scenario');
  const months = monthsFor(config), stocks = new Map();
  for (const row of workforce) {
    if (stocks.has(row.month) || !Number.isSafeInteger(row.endHeadcount) || row.endHeadcount < 0) throw Error('Invalid satisfaction workforce stock');
    stocks.set(row.month, row.endHeadcount);
  }
  if (months.some(month => !stocks.has(month))) throw Error('Missing satisfaction workforce month');
  const random = rng(seed, `satisfaction:${family}`), truth = [], releases = [], coverage = [];
  for (const [index, month] of months.entries()) {
    if ((index + 1) % 3 !== 0) continue;
    const waveIndex = truth.length, closeAt = monthEnd(month), launchAt = firstDay(month);
    const instrumentBreak = family === 'survey-break' && month >= config.regimeChangeMonth;
    const instrumentVersion = instrumentBreak ? 'synthetic-quarterly-instrument-v2' : IDENTITY.instrumentVersion;
    const key = `satisfaction:${month}`;
    let favorableProbability = 0.65;
    if (family === 'gradual-improvement') favorableProbability = 0.48 + waveIndex * 0.012;
    if (family === 'regime-reversal') favorableProbability = month >= config.regimeChangeMonth ? 0.38 : 0.62 + waveIndex * 0.004;
    if (instrumentBreak) favorableProbability = 0.77;
    // Fixed mechanics checkpoint independent of seed/model selection: real zero, not null.
    if (waveIndex === 0) favorableProbability = 0;
    const responseProbability = family === 'reporting-stress' ? 0.48 : 0.73;
    const outcome = simulateWave(random, stocks.get(month), favorableProbability, responseProbability);
    const value = { waveId: `synthetic-wave-${month}`, ...IDENTITY, instrumentVersion,
      sourceKind: 'employee-wave', responseUnit: 'mean-respondent-favorable-answer-share',
      launchAt, closeAt, populationVersion: 'synthetic-company-v1',
      comparability: instrumentBreak ? 'blocked-instrument-break' : 'within-instrument-only',
      ...outcome };
    truth.push({ month, recordKey: key, effectiveAt: closeAt, value });
    const initialDelay = family === 'reporting-stress' ? 45 : 10;
    const firstAvailable = dayAdd(closeAt, initialDelay);
    // Persistent missing/suppressed examples exist in every family, independently of performance.
    const state = waveIndex === 4 ? 'missing' : waveIndex === 5 ? 'suppressed'
      : waveIndex === 3 || (family === 'reporting-stress' && waveIndex % 4 === 2) ? 'partial' : 'complete';
    let releasedValue = value;
    if (state !== 'complete') releasedValue = masked(value);
    // Revised reporting is simulated as an initial eligibility overcount. The corrected
    // denominator arrives later; it must never rewrite the earlier release vintage.
    const corrected = waveIndex === 20 || (family === 'reporting-stress' && waveIndex === 21);
    if (corrected && state === 'complete') releasedValue = { ...value, eligible: value.eligible + 20,
      nonrespondents: value.nonrespondents + 20, participationPct: 100 * value.respondents / (value.eligible + 20) };
    const append = (revision, available, payload, status) => {
      releases.push(release(key, revision, closeAt, available, structuredClone(payload), status));
      coverage.push({ recordKey: key, revision, effectiveAt: closeAt, simulatedAvailableAt: available,
        sourceObservedAt: null, populationVersion: value.populationVersion,
        eligibilityVersion: value.eligibilityVersion, status,
        complete: status === 'complete', evidenceBasis: 'generated-universe-declaration',
        eligible: status === 'complete' ? payload.eligible : null });
    };
    append(1, firstAvailable, releasedValue, state);
    if (state === 'partial' || corrected) append(2, dayAdd(closeAt, corrected ? 130 : initialDelay + 30), value, 'complete');
  }
  return { domain: 'satisfaction', definitions: definitions(), truth, releases, coverage };
}
