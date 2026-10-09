/** Inactive server/control-plane composition. No credentials, schema creation,
 * environment switch or HTTP activation endpoint. Concrete provider readers and
 * release validators must be reviewed before wiring this into dataset-runtime.
 */
import {DatasetRouter} from './dataset-router.mjs';
import {PostgresDatasetSelector} from './dataset-selector-postgres.mjs';

export const DATASET_COMPONENTS = Object.freeze([
  'workforce', 'ratings', 'compensation', 'career', 'skills', 'survey', 'planning', 'succession',
]);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,95}$/.test(value);
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 1024;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const completeKeys = value => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === DATASET_COMPONENTS.length && DATASET_COMPONENTS.every(key => Object.hasOwn(value, key));
const definedProviders = new WeakSet();

/** These ports do not certify a dataset. They bind a separately reviewed manifest
 * to explicit per-component readers, request guards and payload validators.
 * Scope denominators live in those contracts: surveys/annual careers/plans must
 * not inherit a universal company-headcount denominator.
 */
export function defineDatasetProvider({manifest, client, adapters}) {
  if (!manifest || !identifier(manifest.datasetId) || manifest.datasetId === 'legacy-v1' ||
      !hash(manifest.bundleDigest) || !day(manifest.cutoff) ||
      manifest.approved !== true || manifest.complete !== true || !text(manifest.preservationCertificate) ||
      !client || !completeKeys(manifest.components) || !completeKeys(adapters))
    throw Error('Complete reviewed dataset provider required');
  const components = Object.create(null);
  const ports = Object.create(null);
  for (const name of DATASET_COMPONENTS) {
    const component = manifest.components[name], adapter = adapters[name];
    if (!component || !identifier(component.releaseId) || !hash(component.contentDigest) ||
        component.sourceDatasetId !== manifest.datasetId || component.sourceBundleDigest !== manifest.bundleDigest ||
        component.cutoff !== manifest.cutoff || !text(component.provenance) || !text(component.scopeContract) ||
        !adapter || !['validateRequest', 'read', 'validatePayload'].every(key => typeof adapter[key] === 'function'))
      throw Error('Incomplete or mixed dataset component: ' + name);
    // Snapshot manifest metadata, so later caller mutation cannot change a bound release.
    components[name] = Object.freeze({
      releaseId: component.releaseId, contentDigest: component.contentDigest,
      sourceDatasetId: component.sourceDatasetId, sourceBundleDigest: component.sourceBundleDigest,
      cutoff: component.cutoff, provenance: component.provenance, scopeContract: component.scopeContract,
    });
    ports[name] = Object.freeze({
      validateRequest: adapter.validateRequest, read: adapter.read, validatePayload: adapter.validatePayload,
    });
  }
  const provider = Object.freeze({
    datasetId: manifest.datasetId, digest: manifest.bundleDigest, cutoff: manifest.cutoff,
    certificate: manifest.preservationCertificate, approved: true, complete: true, client,
    components: Object.freeze(components), componentAdapters: Object.freeze(ports),
  });
  definedProviders.add(provider);
  return provider;
}

/** Compose the existing durable selector and request router with trusted ports.
 * Ordinary app construction is read-only; selection is a separate control-plane
 * choice. A query adapter must preserve bound PostgreSQL parameters.
 */
export function createDurableDatasetRouter({query, providers, allowSelection = false}) {
  if (!Array.isArray(providers) || !providers.length) throw Error('Reviewed provider registry required');
  const entries = new Map();
  for (const provider of providers) {
    if (!definedProviders.has(provider) || !provider?.approved || !provider.complete || !identifier(provider.datasetId) ||
        !hash(provider.digest) || !text(provider.certificate) || !completeKeys(provider.components) ||
        !completeKeys(provider.componentAdapters) || entries.has(provider.datasetId))
      throw Error('Invalid or duplicate provider registration');
    entries.set(provider.datasetId, provider);
  }
  return new DatasetRouter(Object.fromEntries(entries), new PostgresDatasetSelector(query, {allowSelection}));
}

/** Dispatch only within the already-bound request. A release reader returns an
 * internal identity envelope plus payload. Exact release content/canonicalization
 * and scope validation are delegated to the mandatory reviewed validator; matching
 * envelope metadata alone is never treated as a content integrity check.
 */
export class DatasetReleaseDispatcher {
  #router;
  constructor(router) { this.#router = router; }
  async read(name, requestArguments) {
    const bound = this.#router.current();
    if (!DATASET_COMPONENTS.includes(name)) throw Error('Unknown dataset component');
    const contract = bound.provider.components?.[name];
    const adapter = bound.provider.componentAdapters?.[name];
    if (!contract || !adapter || contract.sourceDatasetId !== bound.datasetId ||
        contract.sourceBundleDigest !== bound.digest)
      throw Error('Dataset component unavailable');
    const argumentsForReader = await adapter.validateRequest(requestArguments, contract);
    if (argumentsForReader === null || argumentsForReader === undefined || argumentsForReader === false)
      throw Error('Unsupported component request');
    const result = await adapter.read(bound.provider.client, argumentsForReader, contract);
    if (!result || result.datasetId !== bound.datasetId || result.bundleDigest !== bound.digest ||
        result.releaseId !== contract.releaseId || result.contentDigest !== contract.contentDigest ||
        result.cutoff !== contract.cutoff || result.provenance !== contract.provenance ||
        result.scopeContract !== contract.scopeContract)
      throw Error('Mixed or unverified component response');
    const validated = await adapter.validatePayload(result.payload, contract, argumentsForReader);
    if (validated === null || validated === undefined || validated === false)
      throw Error('Component payload validation failed');
    return validated;
  }
}
