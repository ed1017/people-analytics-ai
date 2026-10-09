/** Concrete LOCAL-only provider. Neither imported nor registered by production.
 * Caller pins the separately reviewed seal digest. No self-certification by a
 * digest fetched from the same untrusted response; no public approval implied.
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {DATASET_COMPONENTS, defineDatasetProvider} from './dataset-composition.mjs';
import {DEMO_CONTRACTS, DEMO_CUTOFF, DEMO_SUCCESSION_LABEL, exact, deepFreeze, validateDemoRequest, validateDemoPayload, validateDemoBundle} from './dataset-demo-contracts.mjs';

const hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
function verifiedJSON(canonical, parsed, digest) {
  if (typeof canonical !== 'string' || canonical.length > 2_000_000 || hash(canonical) !== digest || !isDeepStrictEqual(JSON.parse(canonical), parsed)) throw Error('Sealed content integrity failure');
}
export async function createSealedDemoProvider({source, expectedDatasetId, expectedDigest}) {
  if (expectedDatasetId !== 'workforce-demo-9847-2026-09-30-local-final-v1' || !/^[a-f0-9]{64}$/.test(expectedDigest) || typeof source?.readSeal !== 'function' || typeof source?.readComponent !== 'function') throw Error('Explicit local reviewed binding required');
  // Capture methods, not a caller-mutable source object.
  const port = Object.freeze({readSeal: source.readSeal.bind(source), readComponent: source.readComponent.bind(source)});
  const seal = await port.readSeal();
  verifiedJSON(seal.canonical_manifest, seal.manifest, expectedDigest);
  if (seal.dataset_id !== expectedDatasetId || seal.dataset_sha256 !== expectedDigest || seal.state !== 'finalized_local_only' || seal.publication_approved !== false || seal.manifest.dataset_id !== expectedDatasetId || seal.manifest.state !== seal.state || !exact(seal.manifest.components, DATASET_COMPONENTS)) throw Error('Wrong dataset seal');
  const semantics = seal.manifest.semantics;
  if (semantics?.cutoff !== DEMO_CUTOFF || semantics.active_population !== 9847 || semantics.data_class !== 'constructed-synthetic' || semantics.publication_approved !== false || semantics.source_observed_at !== null || semantics.independent_forecast_validation !== false || semantics.succession_source_label !== DEMO_SUCCESSION_LABEL) throw Error('Unsupported demo semantics');
  const manifest = {datasetId: expectedDatasetId, bundleDigest: expectedDigest, cutoff: DEMO_CUTOFF,
    approved: true, complete: true, preservationCertificate: `LOCAL-ONLY-SEALED:${expectedDigest}`, components: {}};
  const adapters = {};
  for (const name of DATASET_COMPONENTS) {
    const row = seal.manifest.components[name], contract = DEMO_CONTRACTS[name];
    if (!exact(row, ['release_id', 'content_sha256', 'cutoff', 'provenance', 'scope_contract', 'publication_approved']) || row.release_id !== contract.releaseId || row.cutoff !== contract.cutoff || row.scope_contract !== contract.scopeContract || row.provenance !== contract.provenance || row.publication_approved !== false || !/^[a-f0-9]{64}$/.test(row.content_sha256)) throw Error('Unsupported sealed component: ' + name);
    manifest.components[name] = {...contract, contentDigest: row.content_sha256, sourceDatasetId: expectedDatasetId, sourceBundleDigest: expectedDigest};
    adapters[name] = {
      validateRequest: (args, bound) => validateDemoRequest(name, args, bound),
      read: async (client, args, bound) => {
        const result = await client.readComponent(name);
        if (!exact(result, ['component', 'release_id', 'content_sha256', 'canonical_payload', 'payload', 'cutoff', 'provenance', 'scope_contract', 'publication_approved']) || result.component !== name || result.release_id !== bound.releaseId || result.content_sha256 !== bound.contentDigest || result.cutoff !== bound.cutoff || result.provenance !== bound.provenance || result.scope_contract !== bound.scopeContract || result.publication_approved !== false) throw Error('Mixed sealed component');
        verifiedJSON(result.canonical_payload, result.payload, bound.contentDigest);
        return {datasetId: expectedDatasetId, bundleDigest: expectedDigest, releaseId: bound.releaseId, contentDigest: bound.contentDigest, cutoff: bound.cutoff, provenance: bound.provenance, scopeContract: bound.scopeContract, payload: deepFreeze(result.payload)};
      },
      validatePayload: (payload, bound, args) => validateDemoPayload(name, payload, bound, args),
    };
  }
  // A provider is complete only after every sealed payload and the company
  // cross-component identity pass. Recheck hashes on each later source read.
  const parts = Object.fromEntries(await Promise.all(DATASET_COMPONENTS.map(async name => {
    const bound = manifest.components[name], args = {country: 'all', org: 'all', level: 'all'};
    const response = await adapters[name].read(port, args, bound);
    return [name, adapters[name].validatePayload(response.payload, bound, args)];
  })));
  validateDemoBundle(parts);
  return defineDatasetProvider({manifest, client: port, adapters});
}
