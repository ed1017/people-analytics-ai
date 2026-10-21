import { validatePredictiveReadiness } from './predictive-readiness.ts';

const fields = ['version', 'responseScale', 'favorableValues', 'respondentAggregation', 'missingItemPolicy', 'minimumAnsweredItems', 'itemWeighting', 'reverseItems', 'excludedItems', 'evidenceRef'];
function plainArray(values, allowEmpty = false) {
  if (!Array.isArray(values) || Object.getPrototypeOf(values) !== Array.prototype || values.length > 20 || (!allowEmpty && values.length === 0)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(values);
  return Reflect.ownKeys(values).length === values.length + 1
    && Array.from({ length: values.length }, (_, index) => descriptors[index]).every(descriptor => descriptor && 'value' in descriptor && descriptor.enumerable);
}
function validDefinition(definition) {
  // Reflection may throw for revoked proxies. Malformed declarations are blocked.
  try { return checkDefinition(definition); } catch { return false; }
}
function checkDefinition(definition) {
  if (!definition || Object.getPrototypeOf(definition) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(definition);
  if (Reflect.ownKeys(definition).length !== fields.length || !fields.every(key => descriptors[key] && 'value' in descriptors[key] && descriptors[key].enumerable)) return false;
  const { responseScale: scale, favorableValues: favorable } = definition;
  const numbers = values => plainArray(values)
    && Array.from(values).every(value => Number.isSafeInteger(value)) && new Set(values).size === values.length;
  return typeof definition.version === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(definition.version)
    && numbers(scale) && numbers(favorable) && favorable.every(value => scale.includes(value))
    && favorable.length < scale.length
    && definition.respondentAggregation === 'mean-of-respondent-answered-item-shares'
    && definition.missingItemPolicy === 'answered-items-only'
    && definition.itemWeighting === 'equal'
    && plainArray(definition.reverseItems, true) && definition.reverseItems.length === 0
    && plainArray(definition.excludedItems, true) && definition.excludedItems.length === 0
    && Number.isSafeInteger(definition.minimumAnsweredItems) && definition.minimumAnsweredItems > 0
    && typeof definition.evidenceRef === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(definition.evidenceRef);
}

/**
 * Offline aggregate qualification only. Definition/coverage/release declarations
 * are not authenticated. No forecasting, imputation, wave pooling or causal fit.
 * The scoring definition documents arithmetic; aggregate rows cannot prove that
 * raw answers were scored according to that definition or resolve nonresponse bias.
 */
export function satisfactionDomainEvidence(contract, scoreDefinition = null) {
  const readiness = validatePredictiveReadiness(contract);
  const reasons = [...readiness.forecastEligibility.reasons];
  if (readiness.inputStatus === 'valid' && contract.target.domain !== 'satisfaction') reasons.push('satisfaction-domain-required');
  const definitionValid = validDefinition(scoreDefinition);
  if (!definitionValid) reasons.push('score-definition-unavailable-or-unsupported');
  if (readiness.inputStatus === 'valid' && contract.target.domain === 'satisfaction') {
    // Only use versions selected by the existing point-in-time revision guard.
    const selected = readiness.history.map(row => contract.records.find(record => record.recordKey === row.recordKey && record.revision === row.revision));
    if (definitionValid && selected.some(row => row.value.scoringVersion !== scoreDefinition.version)) reasons.push('score-definition-version-mismatch');
    if (new Set(selected.map(row => row.value.waveId)).size !== selected.length) reasons.push('duplicate-wave-population');
    for (let index = 1; index < selected.length; index++) {
      if (selected[index].value.launchAt <= selected[index - 1].value.closeAt) reasons.push('overlapping-survey-waves');
    }
  }
  const missingInputs = [...new Set(reasons)].sort();
  const qualified = missingInputs.length === 0;
  return {
    domain: 'satisfaction', status: 'unqualified', contractStatus: qualified ? 'passed' : 'blocked',
    evidenceKind: readiness.dataClass === 'constructed-synthetic' ? 'synthetic-mechanics-only' : 'declared-source-contract-only',
    sourceTruthVerified: false, forecastingPerformanceValidated: false, causalEffectValidated: false,
    missingInputs, excludedLateRecords: readiness.excludedLateRecords,
    scoreUnit: 'mean-respondent-favorable-answer-share', coverageUnit: 'respondents / eligible employees',
    // No cross-wave mean: repeat respondents and shifting coverage preclude pooling.
    waves: qualified ? readiness.history.map(row => ({ waveId: row.details.waveId, revision: row.revision,
      effectiveAt: row.effectiveAt, scorePct: row.outcome, respondents: row.details.respondents,
      eligible: row.details.eligible, participationPct: row.details.participationPct })) : [],
    forecast: null, forecastMissingInputs: ['validated-observed-wave-forecast-protocol', 'independent-temporal-evaluation', 'nonresponse-and-population-shift-assessment'],
    causalEffect: null, uncertainty: null,
    limitations: [
      'Contract qualification checks declarations and aggregate arithmetic; it does not verify source truth or answer-level scoring.',
      'Participation describes response coverage, not representativeness or a percentage of satisfied employees.',
      'No monthly interpolation, unfavorable-share complement, eNPS substitution or cross-wave pooling is performed.',
      'Release declarations are checked; complementary suppression and query-set privacy are not independently audited.',
    ],
  };
}
