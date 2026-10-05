import type artifact from './data/analysis-demo-display-v1.json';

type Display = typeof artifact;
type View = {status: 'ready'; data: Display} | {status: 'unavailable' | 'stale'; message: string};

/** Compares fixed reviewed artifacts. It does not establish current source freshness. */
export function resolveAnalysisDisplay(candidate: unknown, expected: Display, turnover: {identities: unknown; selectedMethod: string; methodVersion: string}): View {
  if (candidate == null) return {status: 'unavailable', message: 'Experimental comparison evidence unavailable. Reproduce and review the fixed analysis result before showing comparisons.'};
  try {
    if (expected.status === 'fixed-synthetic-demo' && expected.operationallyQualified === false &&
        /^[a-f0-9]{64}$/.test(expected.analysisIdentity) &&
        Object.values(expected.evidenceIdentities).every(id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)) &&
        JSON.stringify(candidate) === JSON.stringify(expected) &&
        JSON.stringify(expected.turnover.identities) === JSON.stringify(turnover.identities) &&
        expected.turnover.method === turnover.selectedMethod && expected.turnover.methodVersion === turnover.methodVersion) {
      return {status: 'ready', data: expected};
    }
  } catch { /* Malformed or unserializable evidence is withheld. */ }
  return {status: 'stale', message: 'Experimental comparison evidence is stale or inconsistent. Reproduce and review the fixed analysis result before showing comparisons.'};
}
