import assert from 'node:assert/strict';

// Display-only projection of the tested public consumer; never bundled in the app.
export function projectAnalysisDisplay(result) {
  assert.equal(result.status, 'current');
  assert.equal(result.operationallyQualified, false);
  for (const value of [result.forecastBaseline, result.causalEffect, result.interval]) assert.equal(value, null);
  for (const domain of Object.values(result.domains)) {
    assert.equal(domain.status, 'available');
    assert.equal(domain.operationallyQualified, false);
    assert.equal(domain.planContext.source.status, 'unqualified');
  }
  const {turnover: {payload: turnover}, hiring: {payload: hiring}, satisfaction: {payload: satisfaction}} = result.domains;
  return {
    version: 'analysis-demo-display-v1', status: 'fixed-synthetic-demo', operationallyQualified: false,
    analysisIdentity: result.identity, evidenceIdentities: result.evidenceIdentities,
    turnover: {method: turnover.method, methodVersion: turnover.methodVersion, identities: turnover.identities},
    hiring: {
      protocolVersion: hiring.protocolVersion, generatorVersion: hiring.generatorVersion,
      cases: hiring.cases.map(c => ({id: c.id, scenario: c.scenario, seed: c.seed, selectedMethod: c.model.selectedMethod,
        dates: c.dates, sample: c.sample, recentBrier: c.baselineComparison.recent.brier,
        logisticBrier: c.baselineComparison.logistic.brier, selectedBrier: c.baselineComparison.selected.brier})),
      abstentions: hiring.abstentions.map(c => ({id: c.id, reason: c.reason})),
    },
    satisfaction: {
      methodVersion: satisfaction.methodVersion,
      baselineComparison: satisfaction.baselineComparison,
      nonrespondentMeanRange: satisfaction.analysis.assumptions.nonrespondentMeanRange,
      waves: satisfaction.analysis.waves.map(w => ({date: w.effectiveAt, scorePct: w.scorePct,
        respondents: w.respondents, eligible: w.eligible, participationPct: w.participationPct})),
      changes: satisfaction.analysis.changes.map(c => ({fromDate: c.fromDate, toDate: c.toDate,
        respondentScoreChangePp: c.respondentScoreChangePp, responseRateChangePp: c.responseRateChangePp,
        nonresponseChangeBounds: c.nonresponseChangeBounds})),
    },
  };
}
