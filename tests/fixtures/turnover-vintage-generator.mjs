// Separate constructed data. Never adds timestamps to an existing company extract.
import { nextMonth, vintageProtocol } from '../../lib/ml/turnover-vintage-evaluation.mjs';
export function generateTurnoverVintages(seed = 20261005) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const records = Array.from({ length: 36 }, (_, i) => {
    const period = nextMonth('2023-01', i), following = nextMonth(period, 1);
    const count = Math.max(0, Math.round(30 + 6 * Math.sin(2 * Math.PI * i / 12) + i * .12 + (random() - .5) * 10));
    return { recordKey: `aggregate-${period}`, revision: 1, supersedes: null,
      effectiveAt: new Date(Date.parse(following + '-01T00:00:00.000Z') - 1).toISOString(),
      observedAt: following + '-01T00:00:00.000Z', populationVersion: 'constructed-company1', metricVersion: 'voluntary-exits1',
      value: { period, voluntaryExits: count, countStatus: 'recorded', exposure: null } };
  });
  // A genuine generated zero, followed by a late correction to a different historical month.
  records[7].value.voluntaryExits = 0;
  const corrected = structuredClone(records[22]);
  corrected.revision = 2; corrected.supersedes = 1; corrected.observedAt = '2025-04-01T00:00:00.001Z';
  corrected.value.voluntaryExits += 5; records.push(corrected);
  const cutoffs = [...vintageProtocol.cutoffs, vintageProtocol.assessmentCutoff];
  const ends = [...vintageProtocol.origins, vintageProtocol.assessmentEnd];
  return cutoffs.map((cutoff, i) => ({ schemaVersion: 1, cutoff,
    manifest: { dataClass: 'constructed-synthetic', observationBasis: 'simulated', generatorVersion: `turnover-vintages-v1-seed-${seed}`,
      generatedAt: '2026-10-05T00:00:00.000Z', sourceEvidence: null, sourceDefinitionVersion: 'generated-counts-v1', populationVersion: 'constructed-company1', metricVersion: 'voluntary-exits1',
      completion: { status: 'complete', through: new Date(Date.parse(nextMonth(ends[i], 1) + '-01T00:00:00.000Z') - 1).toISOString(), observedAt: cutoff, populationVersion: 'constructed-company1', evidenceRef: 'simulated-completion' } },
    target: { domain: 'turnover', measure: 'voluntary-count', cadence: 'monthly' }, records: structuredClone(records), study: null, groups: [] }));
}
