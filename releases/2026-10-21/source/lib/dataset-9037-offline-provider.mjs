/** Inactive, exact-artifact binding for the independently reviewed 9037 package.
 * No filesystem, SQL, environment selector, model or production registration.
 * LOCAL-ONLY certification does not confer publication/activation approval.
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {DATASET_COMPONENTS, defineDatasetProvider} from './dataset-composition.mjs';
import {deepFreeze, exact, validateDemoRequest, validateDemoBundle} from './dataset-demo-contracts.mjs';

export const OFFLINE_9037_DATASET_ID = 'workforce-demo-realism-20261023-local-v2';
export const OFFLINE_9037_INTEGRITY_DIGEST = '9303cfd60190978e502d4b7304321512aaab295a71e94a21ab31a9caf1c3447f';
const sourceBundle = 'f0233363ad006ffb3db670f830be58422d6491b88b2d1e11a92a6aa981488175';
const reviewed = new WeakSet();
const presenterContracts = new WeakMap();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requireValue = (value, message) => {if (!value) throw Error(message);};
function readPinned(bytes, digest) {
  requireValue(bytes instanceof Uint8Array && bytes.byteLength > 0 && bytes.byteLength <= 2_000_000,
    'Bounded offline artifact bytes required');
  const owned = Buffer.from(bytes);
  requireValue(hash(owned) === digest, 'Offline artifact digest mismatch');
  return deepFreeze(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(owned)));
}
export const isReviewed9037Provider = provider => reviewed.has(provider);
export function reviewed9037PresenterContract(provider) {
  requireValue(reviewed.has(provider), 'Reviewed 9037 provider required');
  return presenterContracts.get(provider);
}

/** The pin is code-reviewed, not taken from caller-controlled artifact metadata.
 * Exact component bytes already passed independent accounting and policy review.
 * Do not generalize this constructor to new pins without a fresh review.
 */
export function create9037OfflineProvider({integrityBytes, contractBytes, componentBytes, expectedIntegrityDigest}) {
  requireValue(expectedIntegrityDigest === OFFLINE_9037_INTEGRITY_DIGEST, 'Reviewed 9037 integrity pin required');
  const seal = readPinned(integrityBytes, OFFLINE_9037_INTEGRITY_DIGEST);
  requireValue(seal.datasetId === OFFLINE_9037_DATASET_ID && seal.sourceBundleDigest === sourceBundle &&
    seal.state === 'prepared-unapproved-offline' && seal.publicationApproved === false &&
    seal.activationEnabled === false && seal.fullApplicationReady === false, 'Offline-only source binding required');
  const contracts = readPinned(contractBytes, seal.files['component-contracts.json']);
  const payloads = readPinned(componentBytes, seal.files['components.json']);
  requireValue(contracts.datasetId === seal.datasetId && contracts.sourceBundleDigest === sourceBundle &&
    contracts.activePopulation === 9037 && contracts.cutoff === '2026-09-30' &&
    contracts.publicationApproved === false && contracts.activationEnabled === false &&
    exact(contracts.components, DATASET_COMPONENTS) && exact(payloads, DATASET_COMPONENTS), 'Complete 9037 components required');
  const manifest = {datasetId: seal.datasetId, bundleDigest: OFFLINE_9037_INTEGRITY_DIGEST,
    cutoff: contracts.cutoff, approved: true, complete: true,
    preservationCertificate: `LOCAL-ONLY-9037:${OFFLINE_9037_INTEGRITY_DIGEST}`, components: {}};
  const adapters = {}, company = {};
  for (const name of DATASET_COMPONENTS) {
    const c = contracts.components[name];
    const bound = {releaseId: c.releaseId, contentDigest: c.contentDigest, cutoff: contracts.cutoff,
      sourceDatasetId: seal.datasetId, sourceBundleDigest: OFFLINE_9037_INTEGRITY_DIGEST,
      provenance: c.policy, scopeContract: `9037-offline-${name}-v1`};
    manifest.components[name] = bound;
    function validate(payload, contract, args) {
      requireValue(isDeepStrictEqual(payload, payloads[name]) &&
        Object.entries(bound).every(([key, value]) => contract[key] === value), 'Mixed 9037 component');
      const data = name === 'ratings' ? payload.find(row => row.filters.org === args.org) : payload;
      requireValue(data !== undefined, 'Unsupported 9037 scope');
      return deepFreeze({data: structuredClone(data), sourceLabel: c.policy, dataClass: 'constructed-synthetic',
        publicationApproved: false, releaseId: c.releaseId, cutoff: contracts.cutoff, scopeContract: bound.scopeContract});
    }
    adapters[name] = {
      validateRequest: (request, contract) => validateDemoRequest(name, request, contract),
      read: async () => ({datasetId: seal.datasetId, bundleDigest: OFFLINE_9037_INTEGRITY_DIGEST,
        releaseId: c.releaseId, contentDigest: c.contentDigest, cutoff: contracts.cutoff,
        provenance: c.policy, scopeContract: bound.scopeContract, payload: structuredClone(payloads[name])}),
      validatePayload: validate,
    };
    company[name] = validate(payloads[name], bound, {org: 'all'});
  }
  validateDemoBundle(company);
  const provider = defineDatasetProvider({manifest, client: Object.freeze({}), adapters});
  reviewed.add(provider);
  presenterContracts.set(provider, deepFreeze({population: payloads.workforce[0].headcount,
    externalStarts: 4163, exits: 3526,
    // Reconciled to the pinned capture and source fixture by the local planning review.
    preferences: 4519, skillProfiles: 45185, requisitions: 4979, internalFills: 619, openRequisitions: 197,
    // Top-15 preferences_roles reproduced from the reviewed mapped CSV artifacts:
    // career_preferences.csv sha256 04dddf0fc6a24b9cdf1dfdd15cc1a094e8575098247c15aa97b1689e4a635e59
    // job_profiles.csv sha256 c35cbeab7e4aa4ea666417cbe8d3f7814d158ece36f4c9e97982541a67f4dcf2
    preferenceRoles: Object.fromEntries(['MKT-BRAND','CONS-TRANS','INFRA-ENG','SALES-OPS','ML-ENG',
      'CONS-MGMT','LEGAL-COUNSEL','OPS-BUS','HR-HRIS','CLOUD-ARCH','HR-PA','IT-ENG',
      'CYBER-ANA','CYBER-ENG','HR-HRBP'].map(code => [code, 'Demo '+code])),
    rangePolicy: payloads.compensation[0].range_policy_version,
    compensation: {releaseId: contracts.components.compensation.releaseId},
    provenance: Object.fromEntries(DATASET_COMPONENTS.map(name => [name, contracts.components[name].policy]))}));
  return provider;
}
