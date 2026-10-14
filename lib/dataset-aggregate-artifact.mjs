/** Inactive Node/server reader for a pinned, constructed demo artifact.
 * No filesystem, SQL driver, network, credentials, registration or selection.
 * The caller supplies bytes and two separately reviewed pins from trusted code.
 * This preserves the predecessor's LOCAL-ONLY certificate/publication semantics;
 * it is not a hosted publication successor or an archive-recovery certificate.
 */
import { createHash } from 'node:crypto';
import { createSealedDemoProvider } from './dataset-sealed-demo.mjs';
import { ANALYTICS_QUERIES, createLocalAnalyticsSource } from './dataset-analytics-source.mjs';
import { DATASET_COMPONENTS } from './dataset-composition.mjs';
import { deepFreeze, exact } from './dataset-demo-contracts.mjs';

export const AGGREGATE_ARTIFACT_FORMAT = 'demo9847-aggregate-artifact-v1';
export const MAX_AGGREGATE_ARTIFACT_BYTES = 16 * 1024 * 1024;
const datasetId = 'workforce-demo-9847-2026-09-30-local-final-v1';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const queryNames = Object.keys(ANALYTICS_QUERIES).sort();
export const ANALYTICS_QUERY_CONTRACT_DIGEST = sha256(JSON.stringify(
  queryNames.map(name => [name, ANALYTICS_QUERIES[name]]),
));

export async function createAggregateArtifactProvider({ bytes, expectedArtifactDigest, expectedDatasetDigest }) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 ||
      bytes.byteLength > MAX_AGGREGATE_ARTIFACT_BYTES ||
      !isHash(expectedArtifactDigest) || !isHash(expectedDatasetDigest))
    throw Error('Bounded artifact bytes and reviewed pins required');
  // Own both the bytes and parsed values. Later caller/file mutation cannot
  // alter a serving instance after the pin has been checked.
  const owned = Buffer.from(bytes);
  if (sha256(owned) !== expectedArtifactDigest) throw Error('Aggregate artifact digest mismatch');
  const artifact = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(owned));
  if (!exact(artifact, ['format', 'datasetId', 'bundleDigest', 'cutoff', 'dataClass',
    'publicationApproved', 'independentForecastValidation', 'queryContractDigest',
    'dashboardScope', 'seal', 'components', 'aggregates']) ||
      artifact.format !== AGGREGATE_ARTIFACT_FORMAT || artifact.datasetId !== datasetId ||
      artifact.bundleDigest !== expectedDatasetDigest || artifact.cutoff !== '2026-09-30' ||
      artifact.dataClass !== 'constructed-synthetic' || artifact.publicationApproved !== false ||
      artifact.independentForecastValidation !== false || artifact.dashboardScope !== 'company-only' ||
      artifact.queryContractDigest !== ANALYTICS_QUERY_CONTRACT_DIGEST ||
      !exact(artifact.components, DATASET_COMPONENTS) || !exact(artifact.aggregates, queryNames) ||
      queryNames.some(name => !Array.isArray(artifact.aggregates[name])))
    throw Error('Incomplete or incompatible aggregate artifact');
  deepFreeze(artifact);
  // The original sealed reader verifies all eight canonical component hashes,
  // the separate original bundle pin, and cross-component denominators.
  const provider = await createSealedDemoProvider({
    source: {
      readSeal: async () => structuredClone(artifact.seal),
      readComponent: async name => structuredClone(artifact.components[name]),
    },
    expectedDatasetId: datasetId,
    expectedDigest: expectedDatasetDigest,
  });
  const namesByQuery = new Map(queryNames.map(name => [ANALYTICS_QUERIES[name], name]));
  const analytics = createLocalAnalyticsSource({ datasetId, bundleDigest: expectedDatasetDigest,
    query: async (sql, params) => {
      const name = namesByQuery.get(sql);
      if (!name || (name === 'dashboard' && params.some(value => value !== null)))
        throw Error('Aggregate artifact scope unavailable');
      // These are captured aggregate values, never an SQL execution fallback.
      return { rows: [{ dataset_id: datasetId, dataset_digest: expectedDatasetDigest,
        data: artifact.aggregates[name] }] };
    },
  });
  return Object.freeze({ provider, analytics, artifact: Object.freeze({
    format: AGGREGATE_ARTIFACT_FORMAT, digest: expectedArtifactDigest,
    bytes: owned.byteLength, queryContractDigest: ANALYTICS_QUERY_CONTRACT_DIGEST,
    aggregateCount: queryNames.length, dashboardScope: 'company-only',
    publicationApproved: false, independentForecastValidation: false,
    hostedPreservationVerified: false,
  }) });
}
