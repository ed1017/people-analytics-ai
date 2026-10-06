import assert from 'node:assert/strict';
import {validateReleases} from '../synthetic-workforce/pipeline.mjs';
export const instant = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const exact = (value, keys) => assert(value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join(',') === keys.slice().sort().join(','), 'Unexpected synthetic snapshot fields');
const fields = {
  turnover: 'month,startHeadcount,starts,voluntaryExits,otherExits,endHeadcount,countStatus,exposure',
  hiring: 'month,openingCount,dispositions,actualStartEvents,plannedStartEvents,followupDays,horizonDays,horizonMature,horizonLabelsComplete,knownOutcomeThrough,maximumReportingLagDays,rightCensoredCount,correction',
  satisfaction: 'waveId,instrumentVersion,itemSetVersion,scoringVersion,eligibilityVersion,sourceKind,responseUnit,launchAt,closeAt,populationVersion,comparability,eligible,submitted,nonrespondents,invalidRespondents,respondents,validAnswerCount,invalidAnswerCount,missingAnswerCount,scoredAnswerCount,favorableAnswerCount,shareSum,scorePct,participationPct',
};
/** Local-only replay contract. No family, seed, future coverage or truth accepted. */
export function assertSnapshot(snapshot, domain) {
  exact(snapshot, ['domain','cutoff','dataClass','observationBasis','operationallyQualified','records']);
  assert.equal(snapshot.domain, domain); assert(domain in fields); assert(instant(snapshot.cutoff));
  assert.equal(snapshot.dataClass, 'constructed-synthetic'); assert.equal(snapshot.observationBasis, 'simulated'); assert.equal(snapshot.operationallyQualified, false);
  assert(Array.isArray(snapshot.records) && snapshot.records.length <= 120);
  const keys = new Set(); let previous = '';
  for (const row of snapshot.records) {
    exact(row, ['recordKey','revision','supersedes','effectiveAt','simulatedAvailableAt','sourceObservedAt','status','value']);
    exact(row.value, fields[domain].split(','));
    assert(!keys.has(row.recordKey)); keys.add(row.recordKey);
    assert(instant(row.effectiveAt) && instant(row.simulatedAvailableAt));
    assert(row.effectiveAt >= previous && row.effectiveAt <= snapshot.cutoff && row.simulatedAvailableAt <= snapshot.cutoff);
    previous = row.effectiveAt;
    assert.equal(row.sourceObservedAt, null); assert(Number.isSafeInteger(row.revision) && row.revision > 0);
    assert.equal(row.supersedes, row.revision === 1 ? null : row.revision - 1);
    assert.equal(row.recordKey, `${domain}:${row.effectiveAt.slice(0,7)}`);
    if (domain !== 'satisfaction') assert.equal(row.value.month, row.effectiveAt.slice(0,7));
    // Full-chain validation occurs at replay. Here validate arithmetic on the selected vintage.
    validateReleases(domain, [{...row, revision:1, supersedes:null}]);
  }
  return true;
}
export function assertMonths(months, cutoff) {
  assert(Array.isArray(months) && months.length > 0 && months.length <= 12);
  assert(new Set(months).size === months.length);
  assert(months.every((month, i) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month > cutoff.slice(0,7) && (!i || month > months[i-1])));
}
export const monthIndex = month => Number(month.slice(0,4))*12 + Number(month.slice(5,7))-1;
export function linearPrediction(rows, target) {
  const center = rows.reduce((sum,row)=>sum+row.x,0)/rows.length;
  const mean = rows.reduce((sum,row)=>sum+row.y,0)/rows.length;
  const numerator = rows.reduce((sum,row)=>sum+(row.x-center)*(row.y-mean),0);
  const denominator = rows.reduce((sum,row)=>sum+(row.x-center)**2,0);
  return mean + (denominator ? numerator/denominator : 0)*(target-center);
}
